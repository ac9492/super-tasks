import { expect, test } from '../../fixtures/test.fixture';
import type { Locator } from '@playwright/test';

const expectCentered = async (task: Locator): Promise<void> => {
  await expect(task).toBeVisible();
  await expect
    .poll(() =>
      task.evaluate((row) => {
        const pane = row.closest<HTMLElement>('.today')!;
        const paneRect = pane.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const left = rowRect.left - paneRect.left - pane.clientLeft;
        const right = pane.clientWidth - left - rowRect.width;
        return Math.abs(left - right);
      }),
    )
    .toBeLessThanOrEqual(1);
};

test('task lists stay centered across work views, wide windows and the task side pane', async ({
  page,
  workViewPage,
  taskPage,
  projectPage,
  tagPage,
  testPrefix,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 2560, height: 1440 });
  await workViewPage.waitForTaskList();
  await workViewPage.addTask('Centered Today task');
  const todayTask = taskPage.getTaskByText('Centered Today task');
  await expectCentered(todayTask);
  await expect
    .poll(() =>
      todayTask.evaluate((row) => {
        const pane = row.closest<HTMLElement>('.today')!;
        return row.getBoundingClientRect().left - pane.getBoundingClientRect().left;
      }),
    )
    .toBeGreaterThan(100);

  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await expectCentered(todayTask);
    await page.screenshot({ path: `.tmp/e2e-test-results/centered-list-${theme}.png` });
  }
  await taskPage.openTaskDetail(todayTask);
  await expect(page.locator('task-detail-panel')).toBeVisible();
  await expectCentered(todayTask);
  await page.screenshot({ path: '.tmp/e2e-test-results/centered-list-with-details.png' });
  await page
    .getByRole('button', { name: 'Close right panel or drag to resize' })
    .press('Enter');
  await expect(page.locator('task-detail-panel')).toHaveCount(0);
  await expectCentered(todayTask);

  await page.goto('/#/project/INBOX_PROJECT/tasks');
  await workViewPage.waitForTaskList();
  await workViewPage.addTask('Centered Inbox task');
  await expectCentered(taskPage.getTaskByText('Centered Inbox task'));

  await projectPage.createProject('Centered project');
  await projectPage.navigateToProjectByName('Centered project');
  await workViewPage.waitForTaskList();
  await workViewPage.addTask('Centered project task');
  await expectCentered(taskPage.getTaskByText('Centered project task'));

  const tagName = `${testPrefix}-CenteredTag`;
  await tagPage.createTag(tagName);
  await tagPage.tagsList.locator('button.nav-link').filter({ hasText: tagName }).click();
  await workViewPage.waitForTaskList();
  await workViewPage.addTask('Centered tag task');
  const tagTask = taskPage.getTaskByText('Centered tag task');
  await expectCentered(tagTask);

  for (const width of [1920, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expectCentered(tagTask);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
  await page.screenshot({ path: '.tmp/e2e-test-results/centered-list-mobile.png' });
});
