import { test, expect } from '../../fixtures/test.fixture';
import catalog from '../../../src/assets/community-plugins.json';

test.describe('Plugin Management Feature Check', () => {
  test('renders plugin management install controls', async ({ page, workViewPage }) => {
    // Wait for Angular app to be fully loaded
    await workViewPage.waitForTaskList();

    await page.goto('/#/plugins');

    const pluginMgmt = page.locator('plugin-management');
    await expect(pluginMgmt).toBeVisible({ timeout: 10000 });
    await pluginMgmt.locator('.install-card summary').click();
    await expect(
      pluginMgmt.getByRole('button', { name: /Choose Plugin File/i }),
    ).toBeVisible();
    await expect(
      pluginMgmt.getByRole('button', { name: /Remove all uploaded plugins/i }),
    ).toBeVisible();
  });

  test('renders community plugin catalog', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    await page.goto('/#/plugins');

    const pluginManagement = page.locator('plugin-management');
    await expect(pluginManagement).toBeVisible({ timeout: 10000 });
    await pluginManagement
      .getByRole('radiogroup', { name: 'Plugin views' })
      .getByRole('radio', { name: 'Discover', exact: true })
      .click();
    await expect(pluginManagement.locator('.community-plugins-card h2')).toContainText(
      'Community Plugins',
    );
    await expect(
      pluginManagement.locator('.community-plugin-item').first(),
    ).toBeVisible();
    await expect(
      pluginManagement.getByRole('link', { name: /Get your plugin to show up here/i }),
    ).toHaveAttribute('href', /plugin-development\.md#get-listed-in-the-app/);
  });

  test('searches and filters the catalog, changes pages, and recovers from empty results', async ({
    page,
  }) => {
    await page.goto('/#/plugins');
    const browser = page.locator('plugin-management');
    await expect(browser.locator('.installed-plugin').first()).toBeVisible();
    await expect(browser.locator('.community-plugins-card')).toHaveCount(0);
    await browser
      .getByRole('radiogroup', { name: 'Plugin views' })
      .getByRole('radio', { name: 'Discover', exact: true })
      .click();
    await expect(browser.locator('.community-plugin-item')).toHaveCount(24);
    await browser.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(browser.locator('.community-plugin-item')).toHaveCount(
      Math.min(24, catalog.length - 24),
    );
    const search = browser.getByRole('searchbox');
    await search.fill('obsidian');
    await expect(browser.locator('.community-plugin-item')).toHaveCount(1);
    await expect(browser.locator('.community-plugin-item')).toContainText(
      'Obsidian Integration',
    );
    await expect(browser.locator('.catalog-pagination')).toHaveCount(0);
    await browser.getByRole('combobox', { name: 'Type', exact: true }).click();
    await page.getByRole('option', { name: 'Plugins', exact: true }).click();
    await expect(browser.locator('.empty-state')).toBeVisible();
    await browser.getByRole('button', { name: 'Reset filters', exact: true }).click();
    await expect(browser.locator('.community-plugin-item')).toHaveCount(24);
    await page.screenshot({ path: '.tmp/plugins-discover-desktop.png' });
    await browser.getByRole('radio', { name: /Installed \(/ }).click();
    await search.fill('github');
    await expect(browser.locator('.installed-plugin')).toHaveCount(1);
    await expect(browser.locator('.installed-plugin')).toContainText('GitHub');
    await page.screenshot({ path: '.tmp/plugins-installed-desktop.png' });
  });

  test('keeps search visible and avoids horizontal overflow on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/plugins');
    const browser = page.locator('plugin-management');
    await browser
      .getByRole('radiogroup', { name: 'Plugin views' })
      .getByRole('radio', { name: 'Discover', exact: true })
      .click();
    const search = browser.getByRole('searchbox');
    await expect(search).toBeVisible();
    const before = await search.boundingBox();
    await browser
      .locator('.plugin-browser-results')
      .evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(search).toBeVisible();
    expect((await search.boundingBox())?.y).toBe(before?.y);
    expect(await browser.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await browser.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(browser.locator('.community-plugin-item').first()).toBeVisible();
    await page.screenshot({ path: '.tmp/plugins-discover-mobile.png' });
  });
});
