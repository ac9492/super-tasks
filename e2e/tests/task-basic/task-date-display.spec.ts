import { expect, test } from '../../fixtures/test.fixture';

test('task date styles and weekday preference work through settings and persist after reload', async ({
  page,
  workViewPage,
  taskPage,
  settingsPage,
  testPrefix,
}) => {
  await page.goto('/#/project/INBOX_PROJECT/tasks');
  await workViewPage.waitForTaskList();
  await page.waitForFunction(
    () => !!(window as unknown as { __e2eTestHelpers?: unknown }).__e2eTestHelpers,
  );
  const expected: { weekday: string; compact: string; ordinal: string }[] = [];
  for (const [index, days] of [1, 7, 8].entries()) {
    const title = `${testPrefix} date ${index}`;
    await workViewPage.addTask(title);
    const row = taskPage.getTaskByText(title);
    const id = (await row.getAttribute('data-task-id'))!;
    expected.push(
      await page.evaluate(
        ({ id: taskId, days: offsetDays, timed }) => {
          const date = new Date();
          date.setDate(date.getDate() + offsetDays);
          date.setHours(14, 0, 0, 0);
          const dueDay = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
          ].join('-');
          const store = (
            window as unknown as {
              __e2eTestHelpers: { store: { dispatch: (a: unknown) => void } };
            }
          ).__e2eTestHelpers.store;
          store.dispatch({
            type: '[Task Shared] updateTask',
            task: {
              id: taskId,
              changes: timed
                ? { dueWithTime: date.getTime(), deadlineDay: dueDay }
                : { dueDay, deadlineDay: dueDay },
            },
            meta: {
              isPersistent: true,
              entityType: 'TASK',
              entityId: taskId,
              opType: 'UPD',
            },
          });
          const day = date.getDate();
          const n = day % 100;
          const suffix =
            n >= 11 && n <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
          return {
            weekday: date.toLocaleDateString('en-GB', { weekday: 'long' }),
            compact: `${day}-${date.toLocaleDateString('en-GB', { month: 'short' })}`,
            ordinal: `${date.toLocaleDateString('en-US', { month: 'long' })} ${day}${suffix}`,
          };
        },
        { id, days, timed: index === 0 },
      ),
    );
    await expect(row.locator('.schedule-btn .time-badge')).toHaveText(
      days <= 7 ? expected[index].weekday : expected[index].compact,
    );
    await expect(row.locator('.deadline-btn .time-badge')).toHaveText(
      days <= 7 ? expected[index].weekday : expected[index].compact,
    );
  }
  const settings = async (): Promise<void> => {
    await page.goto('/#/config');
    await settingsPage.expandSection('.section-localization');
  };
  // Settings is a dialog over the workspace: closing it returns to the list.
  const closeSettings = async (): Promise<void> => {
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toBeHidden();
  };
  const style = (): ReturnType<typeof page.getByRole> =>
    page.getByRole('combobox', { name: 'Task date labels' });
  await settings();
  await expect(
    page.getByRole('switch', { name: 'Show weekdays for the next seven days' }),
  ).toBeChecked();
  await page
    .getByRole('switch', { name: 'Show weekdays for the next seven days' })
    .click();
  await style().click();
  await page.getByRole('option', { name: 'December 3rd (English)', exact: true }).click();
  await closeSettings();
  for (let i = 0; i < 3; i++) {
    const row = taskPage.getTaskByText(`${testPrefix} date ${i}`);
    await expect(row.locator('.schedule-btn .time-badge')).toHaveText(
      expected[i].ordinal,
    );
    await expect(row.locator('.deadline-btn .time-badge')).toHaveText(
      expected[i].ordinal,
    );
    await expect(row.locator('.schedule-btn')).toHaveAttribute(
      'data-scheduled-date-color',
      i === 0 ? 'tomorrow' : 'upcoming',
    );
  }
  const boxes = await taskPage.getTaskByText(`${testPrefix} date 0`).evaluate((row) => {
    const due = row.querySelector('.schedule-btn .time-badge')!.getBoundingClientRect();
    const deadline = row
      .querySelector('.deadline-btn .time-badge')!
      .getBoundingClientRect();
    return { dueRight: due.right, deadlineLeft: deadline.left };
  });
  expect(boxes.dueRight).toBeLessThanOrEqual(boxes.deadlineLeft);
  await page.reload();
  await workViewPage.waitForTaskList();
  await expect(
    taskPage.getTaskByText(`${testPrefix} date 0`).locator('.schedule-btn .time-badge'),
  ).toHaveText(expected[0].ordinal);
  await settings();
  await style().click();
  await page
    .getByRole('option', { name: '3-Dec (abbreviated month)', exact: true })
    .click();
  await closeSettings();
  await expect(
    taskPage.getTaskByText(`${testPrefix} date 1`).locator('.schedule-btn .time-badge'),
  ).toHaveText(expected[1].compact);
  await settings();
  await style().click();
  await page
    .getByRole('option', { name: 'Numeric (follow regional format)', exact: true })
    .click();
  await expect(style()).toContainText('Numeric');
});

test('a large task list refreshes date labels when display preferences change', async ({
  page,
  workViewPage,
  taskPage,
  testPrefix,
}) => {
  await page.goto('/#/project/INBOX_PROJECT/tasks');
  await workViewPage.waitForTaskList();
  await workViewPage.addTask(`${testPrefix} seed`);
  const id = (await taskPage
    .getTaskByText(`${testPrefix} seed`)
    .getAttribute('data-task-id'))!;
  const expected = await page.evaluate(
    ({ id: seedId }) => {
      type Store = {
        dispatch: (a: unknown) => void;
        select: (
          fn: (s: {
            tasks: { entities: Record<string, Record<string, unknown>> };
          }) => Record<string, unknown>,
        ) => {
          subscribe: (cb: (t: Record<string, unknown>) => void) => {
            unsubscribe: () => void;
          };
        };
      };
      const store = (window as unknown as { __e2eTestHelpers: { store: Store } })
        .__e2eTestHelpers.store;
      let seed: Record<string, unknown> = {};
      store
        .select((s) => s.tasks.entities[seedId])
        .subscribe((t) => (seed = t))
        .unsubscribe();
      const d = new Date();
      d.setDate(d.getDate() + 8);
      const day = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-');
      for (let i = 0; i < 500; i++) {
        const task = {
          ...seed,
          id: `date-list-${i}`,
          title: `Date list ${i}`,
          dueDay: day,
          subTaskIds: [],
        };
        store.dispatch({
          type: '[Task Shared] addTask',
          task,
          workContextId: 'INBOX_PROJECT',
          workContextType: 'PROJECT',
          isAddToBacklog: false,
          isAddToBottom: true,
          isIgnoreShortSyntax: true,
          meta: {
            isPersistent: true,
            entityType: 'TASK',
            entityId: task.id,
            opType: 'CRT',
          },
        });
      }
      return `${d.getDate()}-${d.toLocaleDateString('en-GB', { month: 'short' })}`;
    },
    { id },
  );
  const badges = page.locator('.schedule-btn .time-badge');
  await expect(badges).toHaveCount(500);
  await expect(badges.first()).toHaveText(expected);
  await page.evaluate(() => {
    (
      window as unknown as {
        __e2eTestHelpers: { store: { dispatch: (a: unknown) => void } };
      }
    ).__e2eTestHelpers.store.dispatch({
      type: '[Global Config] Update Global Config Section',
      sectionKey: 'localization',
      sectionCfg: { taskDateStyle: 'month-day-ordinal' },
      meta: {
        isPersistent: true,
        entityType: 'GLOBAL_CONFIG',
        entityId: 'localization',
        opType: 'UPD',
      },
    });
  });
  await expect(badges.first()).not.toHaveText(expected);
  await expect(badges.last()).toHaveText((await badges.first().textContent()) || '');
});
