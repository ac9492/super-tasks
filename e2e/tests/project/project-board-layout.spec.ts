import { expect, test } from '../../fixtures/test.fixture';
import type { Locator, Page } from '@playwright/test';

/** CDK drag-drop ignores HTML5 drag events, so drive it with real mouse moves. */
const cdkDragTo = async (page: Page, source: Locator, target: Locator): Promise<void> => {
  const sBox = await source.boundingBox();
  const tBox = await target.boundingBox();
  if (!sBox || !tBox) throw new Error('drag source/target has no bounding box');
  /* eslint-disable no-mixed-operators */
  const sx = sBox.x + sBox.width / 2;
  const sy = sBox.y + sBox.height / 2;
  const tx = tBox.x + tBox.width / 2;
  const ty = tBox.y + tBox.height / 2;
  /* eslint-enable no-mixed-operators */
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 10, sy + 10, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.mouse.up();
};

test.describe('Project board layout', () => {
  test('shows sections as columns and moves a task between them', async ({
    page,
    projectPage,
    workViewPage,
    testPrefix,
  }) => {
    const projectName = `${testPrefix} Board`;
    await workViewPage.waitForTaskList();
    await projectPage.createProject(projectName);
    await projectPage.navigateToProjectByName(projectName);
    await workViewPage.waitForTaskList();
    await workViewPage.addTask('Board card');

    await page
      .getByRole('radiogroup', { name: 'Project layout' })
      .getByRole('radio', { name: 'Board' })
      .click();
    const board = page.locator('work-view-page section-board');
    await expect(board).toBeVisible();

    // the no-section column holds the card; the add-section column is last
    const noSection = board.locator('section.column[data-section-id="none"]');
    await expect(noSection.locator('planner-task')).toHaveCount(1);
    await expect(noSection.getByText('Board card')).toBeVisible();
    // a section column offers rename, the no-section column does not
    await expect(noSection.locator('.rename-section-btn')).toHaveCount(0);

    await board.getByRole('button', { name: 'Add section' }).click();
    const dialog = page.locator('mat-dialog-container');
    await dialog.locator('input[type="text"]').first().fill('Doing');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await dialog.waitFor({ state: 'hidden' });

    const doing = board.locator('section.column').filter({ hasText: 'Doing' });
    await expect(doing).toBeVisible();
    await expect(doing.locator('.rename-section-btn')).toBeVisible();

    await cdkDragTo(
      page,
      noSection.locator('planner-task').first(),
      doing.locator('.task-items'),
    );
    await expect(doing.locator('planner-task')).toHaveCount(1);
    await expect(doing.getByText('Board card')).toBeVisible();
    await expect(noSection.locator('planner-task')).toHaveCount(0);

    // the same section holds the task in the List layout
    await page
      .getByRole('radiogroup', { name: 'Project layout' })
      .getByRole('radio', { name: 'List' })
      .click();
    await expect(page.locator('.section-container .collapsible-title')).toHaveText([
      'Doing (1)',
    ]);
  });
});
