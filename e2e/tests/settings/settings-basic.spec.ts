import { expect, test } from '../../fixtures/test.fixture';

/**
 * Settings/Configuration E2E Tests
 *
 * Tests the settings page:
 * - Navigate to settings
 * - View different settings sections
 * - Modify basic settings
 */

test.describe('Settings', () => {
  test('should expand settings section', async ({ page, workViewPage }) => {
    await workViewPage.waitForTaskList();

    // Navigate to settings
    await page.goto('/#/config');
    await page.waitForLoadState('networkidle');

    // The settings window lays its sections out open; a section's secondary
    // fields sit behind its own "More options" toggle. Fold and unfold it.
    const firstSection = page.locator('config-section').first();
    await expect(firstSection).toBeVisible({ timeout: 5000 });
    const header = firstSection.locator('formly-collapsible > .collapsible-header');
    const expandedContent = firstSection.locator(
      'formly-collapsible > .collapsible-panel',
    );
    await expect(header).toBeVisible({ timeout: 5000 });

    if (await expandedContent.isVisible().catch(() => false)) {
      await header.click();
      await expect(expandedContent).toBeHidden();
      await expect(header).toHaveAttribute('aria-expanded', 'false');
    }

    await header.click();
    await expect(expandedContent).toBeVisible();
    await expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  test('should have multiple config sections', async ({ page, workViewPage }) => {
    await workViewPage.waitForTaskList();

    // Navigate to settings
    await page.goto('/#/config');
    await page.waitForLoadState('networkidle');

    // Verify settings page data is rendered
    await expect(page.locator('.settings-container')).toBeVisible();

    // Should have multiple config sections for different config areas
    const sections = page.locator('.tab-content .config-section');
    await expect.poll(() => sections.count()).toBeGreaterThan(1);
  });

  test('should have form elements in settings', async ({ page, workViewPage }) => {
    await workViewPage.waitForTaskList();

    // Navigate to settings
    await page.goto('/#/config');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.page-settings')).toBeVisible();

    // The first section shows its primary controls up front; no click needed.
    const firstSection = page.locator('config-section').first();
    await expect(firstSection).toBeVisible({ timeout: 5000 });

    // Look for visible form elements in the section.
    const formElements = firstSection.locator(
      'input:visible, mat-checkbox:visible, mat-slide-toggle:visible, mat-select:visible',
    );
    await expect(formElements.first()).toBeVisible({ timeout: 5000 });
    const primaryCount = await formElements.count();
    expect(primaryCount).toBeGreaterThan(0);

    // Opening "More options" reveals the section's secondary controls too.
    await firstSection.locator('formly-collapsible > .collapsible-header').click();
    await expect.poll(() => formElements.count()).toBeGreaterThan(primaryCount);
  });
});
