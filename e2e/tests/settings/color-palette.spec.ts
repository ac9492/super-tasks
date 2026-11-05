import { expect, test } from '../../fixtures/test.fixture';
import { ensureGlobalAddTaskBarOpen } from '../../utils/element-helpers';

// Contrasting page/card colors exercise scoped ink, rather than merely mode classes.
test('three colors reach the page, cards, add controls, and persisted selection', async ({
  page,
}) => {
  await page.goto('/#/config');
  const picker = page.locator('theme-selector');
  await picker.locator('mat-button-toggle[value="light"]').click();
  await picker.locator('[data-color="background"]').fill('#000000');
  await picker.locator('[data-color="surface"]').fill('#ffffff');
  await picker.locator('[data-color="accent"]').fill('#0000ff');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(picker.locator('h3')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(picker.locator('.preview-action')).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  );
  await expect(page.locator('.tour-addBtn mat-icon')).toHaveCSS(
    'color',
    'rgb(0, 0, 255)',
  );

  const input = await ensureGlobalAddTaskBarOpen(page);
  await input.fill('A palette task');
  await expect(input).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(page.locator('.e2e-add-task-submit mat-icon')).toHaveCSS(
    'color',
    'rgb(0, 0, 255)',
  );
  await input.press('Escape');
  await page.reload();
  await expect(picker.locator('[data-color="background"]')).toHaveValue('#000000');
  await expect(picker.locator('[data-color="surface"]')).toHaveValue('#ffffff');
  await expect(page.locator('#custom-theme-stylesheet')).toHaveCount(0);
  await expect(picker.locator('input[type="file"]')).toHaveCount(0);

  await page.goto('/#/tag/TODAY/tasks');
  const taskInput = await ensureGlobalAddTaskBarOpen(page);
  await taskInput.fill('Check panel contrast');
  await taskInput.press('Enter');
  await taskInput.press('Escape');
  const task = page.locator('task').first();
  await task.hover();
  await page.getByRole('button', { name: 'Show/hide task panel' }).first().click();
  await expect(task.locator('.display-value').first()).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(page.locator('task-detail-panel .input-item__value').first()).toHaveCSS(
    'color',
    'rgb(0, 0, 0)',
  );
  await expect(page.locator('task-detail-panel mat-panel-title').first()).toHaveCSS(
    'color',
    'rgb(0, 0, 0)',
  );
});

test('dialogs pair the surface color with neutral text and accent button contrast', async ({
  page,
}) => {
  await page.goto('/#/config');
  const picker = page.locator('theme-selector');
  await picker.locator('mat-button-toggle[value="light"]').click();
  await picker.locator('[data-color="surface"]').fill('#000000');
  await picker.locator('[data-color="accent"]').fill('#ffff00');
  const projects = page.locator('nav-list-tree').filter({ hasText: 'Projects' });
  await projects.locator('nav-item').first().hover();
  await projects.locator('.additional-btns button:has(mat-icon:text("add"))').click();
  const dialog = page.locator('dialog-create-project');
  await expect(page.locator('.mat-mdc-dialog-surface')).toHaveCSS(
    'background-color',
    'rgb(0, 0, 0)',
  );
  await expect(dialog.locator('[mat-dialog-title]')).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  );
  const title = dialog.locator('input[type="text"]').first();
  await title.fill('Contrast check');
  await expect(title).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(dialog.locator('button[type="submit"]')).toHaveCSS(
    'color',
    'rgb(0, 0, 0)',
  );
  await page.keyboard.press('Escape');
});

test('presets, independent modes, system preference, and reset work on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/config');
  const picker = page.locator('theme-selector');
  await picker.locator('mat-button-toggle[value="light"]').click();
  await picker.getByRole('button', { name: 'Forest', exact: true }).click();
  await expect(picker.locator('[data-color="background"]')).toHaveValue('#e8eee7');
  await picker.locator('[data-color="surface"]').fill('#000000');
  await expect(picker.locator('h3')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await picker.locator('mat-button-toggle[value="dark"]').click();
  await expect(picker.locator('[data-color="background"]')).toHaveValue('#17221b');
  await picker.locator('[data-color="accent"]').fill('#ffffff');
  await picker.locator('mat-button-toggle[value="light"]').click();
  await expect(picker.locator('[data-color="surface"]')).toHaveValue('#000000');
  await page.emulateMedia({ colorScheme: 'dark' });
  await picker.locator('mat-button-toggle[value="system"]').click();
  await expect(picker.locator('[data-color="accent"]')).toHaveValue('#ffffff');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(picker.locator('[data-color="surface"]')).toHaveValue('#000000');
  await picker.getByRole('button', { name: 'Reset colors' }).click();
  await expect(picker.locator('[data-color="background"]')).toHaveValue('#f8f8f7');
  const overflow = await picker.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflow).toBe(false);
});
