import { expect, test } from '../../fixtures/test.fixture';

test('top search and device-local glass control work and persist', async ({
  page,
  workViewPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/project/INBOX_PROJECT/tasks');
  await workViewPage.waitForTaskList();
  for (const title of [
    'Review the project proposal',
    'Plan a focused afternoon',
    'Share feedback with the team',
  ])
    await workViewPage.addTask(title);
  const items = page.locator('.nav-list .nav-item');
  await expect(items.first().locator('nav-item')).toContainText('Search');
  await page.locator('.st-search-entry a').focus();
  await page.locator('.st-search-entry a').press('Enter');
  await expect(page).toHaveURL(/search/);
  await page.goto('/#/config');
  const toggle = page.getByRole('checkbox', { name: 'Glass appearance' });
  await expect(toggle).toBeChecked();
  // The web app draws its own blurred backdrop behind the glass surfaces.
  await expect(page.locator('body')).toHaveClass(/st-glass-bitmap/);
  await expect(page.locator('glass-backdrop canvas')).toBeAttached();
  await expect(page.locator('glass-settings .st-glass-background')).toBeVisible();
  await toggle.uncheck();
  await expect(page.locator('body')).toHaveClass(/st-solid/);
  await expect(page.locator('glass-backdrop')).toHaveCount(0);
  await expect(page.locator('glass-settings .st-glass-background')).toHaveCount(0);
  await page.reload();
  // Settings opens as a dialog; reopen it after the route restores the workspace.
  await page.goto('/#/config');
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await page.goto('/#/project/INBOX_PROJECT/tasks');
  await workViewPage.waitForTaskList();
  for (const dark of [false, true]) {
    await page.goto('/#/config');
    await page
      .locator(
        `.dark-mode-select mat-button-toggle[value="${dark ? 'dark' : 'light'}"] button`,
      )
      .click();
    await page.goto('/#/project/INBOX_PROJECT/tasks');
    await workViewPage.waitForTaskList();
    await page.screenshot({
      path: `.tmp/e2e-test-results/glass-${dark ? 'dark' : 'light'}.png`,
      animations: 'disabled',
    });
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(page.locator('.nav-sidenav')).toHaveCSS('backdrop-filter', 'none');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.goto('/#/config');
  await toggle.uncheck();
  await page.goto('/#/project/INBOX_PROJECT/tasks');
  await workViewPage.waitForTaskList();
  await expect(page.locator('.nav-sidenav')).toHaveCSS('backdrop-filter', 'none');
  await page.screenshot({
    path: '.tmp/e2e-test-results/glass-disabled.png',
    animations: 'disabled',
  });
});
