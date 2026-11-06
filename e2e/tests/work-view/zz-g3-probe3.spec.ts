import { expect, test } from '../../fixtures/test.fixture';

/**
 * Basic e2e coverage for the Sections feature.
 *
 * Sections live inside a project (and tag/today, but project is the
 * simpler isolated surface). Each test creates its own project so they
 * stay independent and the testPrefix keeps names unique across workers.
 */
test.describe('Sections', () => {
  /**
   * Create a fresh project and navigate to it. Takes a per-test project name,
   * which `createAndGoToTestProject()` does not offer. (Its strict-mode
   * `.nav-children` violation is fixed, so it is no longer a reason to avoid it.)
   */
  const setupTestProject = async (
    workViewPage: import('../../pages/work-view.page').WorkViewPage,
    projectPage: import('../../pages/project.page').ProjectPage,
    projectName: string = 'Test Project',
  ): Promise<void> => {
    await workViewPage.waitForTaskList();
    await projectPage.createProject(projectName);
    await projectPage.navigateToProjectByName(projectName);
  };

  /**
   * Open the work-context menu via the page-title's `.project-settings-btn`
   * (the more_vert icon next to the project title in the main header).
   * This is the same menu the side-nav `additional-btn` opens, but the
   * header trigger is always visible without hover and isn't sensitive to
   * the tree's expand/collapse state.
   */
  const openProjectContextMenu = async (
    page: import('@playwright/test').Page,
  ): Promise<void> => {
    const trigger = page.locator('.project-settings-btn');
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    await trigger.click();
    await page
      .locator('work-context-menu')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });
  };

  /** Click the "Add Section" item in the open work-context menu. */
  const clickAddSection = async (
    page: import('@playwright/test').Page,
  ): Promise<void> => {
    const menu = page.getByRole('menu');
    await expect(menu).not.toHaveClass(/mat-menu-panel-animating/);
    await menu.getByRole('menuitem', { name: 'Add Section' }).click();
  };

  /** Fill the dialog-prompt input and submit. */
  const submitPromptDialog = async (
    page: import('@playwright/test').Page,
    title: string,
  ): Promise<void> => {
    const dialog = page.locator('mat-dialog-container');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    const input = dialog.locator('input[type="text"]').first();
    await input.fill(title);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
  };

  /** Locator for a rendered section block in the work view by title. */
  const sectionByTitle = (
    page: import('@playwright/test').Page,
    title: string,
  ): ReturnType<import('@playwright/test').Page['locator']> =>
    page.locator('.section-container').filter({
      has: page.locator('.collapsible-title').filter({ hasText: title }),
    });

  test('appends an existing task chosen from suggestions inside a section', async ({
    page,
    workViewPage,
    projectPage,
  }) => {
    const log = (m: string): void => console.log('G3P', new Date().toISOString().slice(17, 23), m);
    page.on('pageerror', (e) => log('PAGEERROR ' + e.message));
    await setupTestProject(workViewPage, projectPage);
    await workViewPage.addTask('Existing suggested task');
    await openProjectContextMenu(page);
    await page
      .locator('work-context-menu button[mat-menu-item]')
      .filter({ hasText: 'Settings' })
      .click();
    const settingsDialog = page.locator('dialog-work-context-settings');
    await settingsDialog.waitFor({ state: 'visible' });
    await settingsDialog.getByRole('switch', { name: 'Enable Project Backlog' }).click();
    await settingsDialog.getByRole('button', { name: 'Save' }).click();
    await settingsDialog.waitFor({ state: 'hidden' });
    await page
      .locator('task')
      .filter({ hasText: 'Existing suggested task' })
      .first()
      .focus();
    await page.keyboard.press('Shift+B');
    await expect(
      page.locator('work-view-page task-list').first().locator('task'),
    ).toHaveCount(0);
    await openProjectContextMenu(page);
    await clickAddSection(page);
    await submitPromptDialog(page, 'Suggestion Section');
    const section = sectionByTitle(page, 'Suggestion Section');
    await section.locator('add-task-inline button').click();
    const input = section.locator('add-task-bar textarea.main-input');
    await input.fill('Section anchor task');
    await input.press('Enter');
    await expect(section.locator('task task-title')).toContainText([
      'Section anchor task',
    ]);
    log('before ctrl1');
    await input.press('Control+1');
    log('after ctrl1');
    await input.fill('Existing suggested task');
    log('options: ' + (await page.getByRole('option').allTextContents()).join('|'));
    await page.getByRole('option').filter({ hasText: 'Existing suggested task' }).click();
    log('clicked; input=' + (await input.inputValue()));
    await page.keyboard.press('Escape');
    const expectedOrder = ['Section anchor task', 'Existing suggested task'];
    await expect(section.locator('task task-title')).toContainText(expectedOrder);
    await page.reload();
    await workViewPage.waitForTaskList();
    await expect(section.locator('task task-title')).toContainText(expectedOrder);
  });

});
