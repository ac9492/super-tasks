import { test, expect } from '../../fixtures/test.fixture';

test.describe('Clipboard Images Settings', () => {
  test('should show IndexedDB manager button in web but not in config', async ({
    page,
    settingsPage,
  }) => {
    test.setTimeout(30000);

    // Navigate to settings
    await settingsPage.navigateToSettings();

    // Wait for settings page to load
    await page.waitForLoadState('networkidle');

    // The settings window lays its sections out open; Clipboard images is a
    // section with a heading on the General tab, not a collapsible.
    const section = page.locator('.section-clipboardImages');
    const sectionHeading = section
      .locator('.settings-section-heading h3')
      .filter({ hasText: /clipboard.*image/i });
    await sectionHeading.waitFor({ state: 'visible', timeout: 10000 });
    await sectionHeading.scrollIntoViewIfNeeded();

    // In web version, verify IndexedDB manager button IS visible
    const managerBtn = section.locator('button', {
      hasText: /manage.*image|open.*manager/i,
    });
    await expect(managerBtn.first()).toBeVisible({ timeout: 5000 });

    // Verify the button text contains expected text
    const btnText = await managerBtn.first().textContent();
    expect(btnText?.toLowerCase()).toMatch(/manage|manager/);

    // The storage-location (folder path) field is desktop-only
    await expect(section.locator('.image-path-section')).toHaveCount(0);
  });

  test('should open clipboard images manager dialog', async ({ page, settingsPage }) => {
    test.setTimeout(30000);

    // Navigate to settings
    await settingsPage.navigateToSettings();
    await page.waitForLoadState('networkidle');

    // Find the clipboard images section (a heading, not a collapsible)
    const section = page.locator('.section-clipboardImages');
    const sectionHeading = section
      .locator('.settings-section-heading h3')
      .filter({ hasText: /clipboard.*image/i });
    await sectionHeading.waitFor({ state: 'visible', timeout: 10000 });
    await sectionHeading.scrollIntoViewIfNeeded();

    // Click the manager button
    const managerBtn = section.locator('button', {
      hasText: /manage.*image|open.*manager/i,
    });
    await managerBtn.first().click();

    // The manager opens as a second dialog on top of the settings window, so
    // pick it by its title instead of taking every mat-dialog-container.
    const dialog = page.locator('mat-dialog-container').filter({
      has: page.locator('h2').filter({ hasText: /clipboard.*image/i }),
    });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify dialog title
    const dialogTitle = dialog.locator('h2').filter({ hasText: /clipboard.*image/i });
    await expect(dialogTitle).toBeVisible();

    // Verify close button exists (looking for button with "Close" text)
    const closeBtn = dialog.locator('button').filter({ hasText: /close/i });
    await expect(closeBtn.first()).toBeVisible();

    // Close the dialog
    await closeBtn.first().click();

    // Verify dialog is closed; the settings window stays open underneath
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('.page-settings')).toBeVisible();
  });
});
