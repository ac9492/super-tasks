import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { SettingsPage } from '../pages/settings.page';

/**
 * Open the "misc" section of the settings window (General category) with all of
 * its fields reachable, including the ones behind the section's "More options".
 *
 * When `forceReload` is true, navigates away first then back to ensure the
 * OnPush config component is fully re-created with fresh store data.
 */
export const navigateToMiscSettings = async (
  page: Page,
  forceReload = false,
): Promise<void> => {
  if (forceReload) {
    // Navigate away first to destroy the config component, then back
    await page.goto('/#/tag/TODAY/tasks');
    await page.waitForURL(/tag\/TODAY/);
  }
  await new SettingsPage(page).openSettingsSection('misc');
};

/**
 * Close the settings window so the app header (sync button, ...) receives
 * clicks again; the dialog's backdrop covers the whole page while it is open.
 */
export const closeSettings = async (page: Page): Promise<void> => {
  await new SettingsPage(page).closeSettings();
};

/**
 * Toggle a slide-toggle setting by its label text.
 */
export const toggleSetting = async (page: Page, labelText: string): Promise<void> => {
  const toggle = page
    .locator('mat-slide-toggle, mat-checkbox')
    .filter({ hasText: labelText })
    .first();
  await toggle.scrollIntoViewIfNeeded();
  // Capture current checked state before clicking
  const wasChecked = await toggle.evaluate((el: Element) =>
    el.className.includes('checked'),
  );
  await toggle.click();
  // Wait for toggle state to change
  if (wasChecked) {
    await expect(toggle).not.toHaveClass(/checked/, { timeout: 5000 });
  } else {
    await expect(toggle).toHaveClass(/checked/, { timeout: 5000 });
  }
};

/**
 * Check whether a slide-toggle is currently checked (ON).
 */
export const isSettingChecked = async (
  page: Page,
  labelText: string,
): Promise<boolean> => {
  const toggle = page
    .locator('mat-slide-toggle, mat-checkbox')
    .filter({ hasText: labelText })
    .first();
  await toggle.scrollIntoViewIfNeeded();
  // mat-slide-toggle adds 'mat-mdc-slide-toggle-checked' when checked
  // mat-checkbox adds 'mat-mdc-checkbox-checked' when checked
  const classes = (await toggle.getAttribute('class')) ?? '';
  return classes.includes('checked');
};

/**
 * Set a setting to a specific state (ON/OFF).
 */
export const ensureSettingState = async (
  page: Page,
  labelText: string,
  wantChecked: boolean,
): Promise<void> => {
  const current = await isSettingChecked(page, labelText);
  if (current !== wantChecked) {
    await toggleSetting(page, labelText);
  }
};
