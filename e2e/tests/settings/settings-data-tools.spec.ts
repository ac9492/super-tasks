import { test, expect } from '../../fixtures/test.fixture';

test('switch thumbs have symmetric end insets in both directions', async ({ page }) => {
  await page.goto('/#/config');
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  const toggle = dialog
    .locator('[data-setting-key="isBoardsEnabled"]')
    .getByRole('switch');
  for (const direction of ['ltr', 'rtl']) {
    // Keep the CDK overlay's explicit direction in sync with the document.
    await page.locator('[dir]').evaluateAll((elements, dir) => {
      elements.forEach((el) => el.setAttribute('dir', dir));
    }, direction);
    await page.locator('html').evaluate((el, dir) => {
      el.dir = dir;
    }, direction);
    for (const checked of [false, true]) {
      if ((await toggle.getAttribute('aria-checked')) !== String(checked))
        await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', String(checked));
      await expect
        .poll(async () =>
          toggle.evaluate((el) => {
            const track = el.querySelector('.mdc-switch__track')!.getBoundingClientRect();
            const handle = el
              .querySelector('.mdc-switch__handle')!
              .getBoundingClientRect();
            const on = el.getAttribute('aria-checked') === 'true';
            const rtl = getComputedStyle(el).direction === 'rtl';
            return on !== rtl ? track.right - handle.right : handle.left - track.left;
          }),
        )
        .toBeCloseTo(2, 0);
    }
  }
  await page.screenshot({ path: '.tmp/settings-toggle-alignment.png' });
});

test('Todoist and TickTick files preview and import directly inside Settings', async ({
  page,
  workViewPage,
}) => {
  await workViewPage.waitForTaskList();
  await workViewPage.addTask('Existing task kept by CSV imports');
  await page.locator('a[href="#/config"]').click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await dialog.getByRole('button', { name: 'Import & export', exact: true }).click();
  const category = dialog.locator('.settings-categories button[aria-current]');
  const label = await category.evaluate((el) => {
    const range = document.createRange();
    const text = Array.from(el.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (!text) return 0;
    range.selectNodeContents(text);
    return range.getClientRects().length;
  });
  // The icon and the label share one navigation row at desktop width.
  expect(label).toBe(1);
  for (const source of ['Todoist', 'TickTick']) {
    await dialog.getByRole('combobox', { name: 'Import from', exact: true }).click();
    await page.getByRole('option', { name: source, exact: true }).click();
    await expect(dialog.locator('.import-guide h4')).toHaveText(source);
    await expect(dialog.locator('.import-guide')).toContainText(
      source === 'Todoist' ? 'Export to CSV' : 'Generate Backup',
    );
    const csv =
      source === 'Todoist'
        ? 'TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,DATE\ntask,Todoist parent,Kept notes,1,1,2026-12-15\ntask,Todoist child,,4,2,\n'
        : 'List Name,Title,Status,taskId,parentId,Order\nTickTick native,TickTick parent,0,1,,0\nTickTick native,TickTick child,0,2,1,1\n';
    await dialog.locator('input[type=file]').setInputFiles({
      name: `${source} native.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await expect(dialog.locator('.import-preview')).toContainText(
      'Tasks and subtasks: 2',
    );
    await page.screenshot({ path: `.tmp/settings-${source.toLowerCase()}-import.png` });
    await dialog.getByRole('button', { name: 'Import tasks', exact: true }).click();
    await expect(dialog.locator('.import-preview h4')).toHaveText('Imported projects');
    await expect(dialog.locator('.import-preview .callout--danger')).toHaveCount(0);
    await expect(dialog.locator('.import-preview li')).toContainText('2');
    await expect(page).not.toHaveURL(/plugins/);
  }
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.locator('task').filter({ hasText: 'Existing task kept by CSV imports' }),
  ).toBeVisible();
  for (const source of ['Todoist', 'TickTick']) {
    const link = page
      .locator('magic-side-nav [data-project-id]')
      .filter({ hasText: `${source} native` })
      .first();
    await link.click();
    await expect(
      page
        .locator('task')
        .filter({ hasText: `${source} parent` })
        .first(),
    ).toBeVisible();
    await page.reload();
    await expect(
      page
        .locator('task')
        .filter({ hasText: `${source} parent` })
        .first(),
    ).toBeVisible();
  }
});
