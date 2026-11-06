import { expect, test } from '../../fixtures/test.fixture';

// The sub task toggle shows a done/total badge in every visibility mode (#7057;
// the fork keeps it visible while expanded too, not only when collapsed).

test.describe('Sub task progress badge', () => {
  test('shows done/total in every sub task visibility mode', async ({
    workViewPage,
    taskPage,
    testPrefix,
  }) => {
    await workViewPage.waitForTaskList();
    const parentTitle = `${testPrefix}-Parent`;
    await workViewPage.addTask(parentTitle);
    const parent = taskPage.getTaskByText(parentTitle).first();

    await workViewPage.addSubTask(parent, 'Sub A');
    await workViewPage.addSubTask(parent, 'Sub B');
    await workViewPage.addSubTask(parent, 'Sub C');
    const subTasks = taskPage.getSubTasks(parent);
    await expect(subTasks).toHaveCount(3);
    await taskPage.markTaskAsDone(subTasks.filter({ hasText: 'Sub A' }));

    const toggleBtn = parent.locator('.toggle-sub-tasks-btn').first();
    const badge = toggleBtn.locator('.sub-task-progress-badge');
    // all sub tasks shown
    await expect(badge).toHaveText('1/3');
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Subtasks: 1 of 3 done');

    // with some sub tasks done the toggle cycles: shown -> hide done -> hide all
    await toggleBtn.click();
    await expect(toggleBtn.locator('mat-icon')).toHaveText('remove');
    await expect(badge).toHaveText('1/3');
    await toggleBtn.click();
    await expect(toggleBtn.locator('mat-icon')).toHaveText('add');
    await expect(badge).toHaveText('1/3');
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Subtasks: 1 of 3 done');

    // cycling back to "shown" keeps the count and all three sub tasks
    await toggleBtn.click();
    await expect(badge).toHaveText('1/3');
    await expect(subTasks).toHaveCount(3);
  });
});
