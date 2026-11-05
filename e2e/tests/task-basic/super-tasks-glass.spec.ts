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
  await toggle.uncheck();
  await expect(page.locator('.app-container')).toHaveClass(/st-solid/);
  await page.reload();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await page.goto('/#/project/INBOX_PROJECT/tasks');
  await workViewPage.waitForTaskList();
  await page.route('**/st-glass-demo.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#7b9ab2"/><stop offset=".5" stop-color="#e5cbb5"/><stop offset="1" stop-color="#5c9581"/></linearGradient></defs><rect width="1440" height="900" fill="url(#g)"/></svg>',
    }),
  );
  await page.waitForFunction(
    () => !!(window as unknown as { __e2eTestHelpers?: unknown }).__e2eTestHelpers,
  );
  await page.evaluate(() => {
    const store = (
      window as unknown as {
        __e2eTestHelpers: { store: { dispatch: (a: unknown) => void } };
      }
    ).__e2eTestHelpers.store;
    store.dispatch({
      type: '[Global Config] Update Global Config Section',
      sectionKey: 'misc',
      sectionCfg: {
        backgroundImageLight: 'st-glass-demo.svg',
        backgroundImageDark: 'st-glass-demo.svg',
        backgroundOverlayOpacity: 50,
        backgroundImageBlur: 0,
      },
      isSkipSnack: true,
    });
  });
  await expect(page.locator('.bg-image')).toBeVisible();
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
