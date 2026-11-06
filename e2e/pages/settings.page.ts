import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { cssSelectors } from '../constants/selectors';
import { waitForAngularStability } from '../utils/waits';

const { SETTINGS_BTN, PAGE_SETTINGS } = cssSelectors;

export class SettingsPage extends BasePage {
  readonly settingsBtn: Locator;
  readonly pageSettings: Locator;

  constructor(page: Page, testPrefix: string = '') {
    super(page, testPrefix);

    this.settingsBtn = page.locator(SETTINGS_BTN);
    this.pageSettings = page.locator(PAGE_SETTINGS);
  }

  /**
   * Navigate to settings page
   */
  async navigateToSettings(): Promise<void> {
    await this.settingsBtn.waitFor({ state: 'visible', timeout: 10000 });
    await this.settingsBtn.click();
    await this.pageSettings.waitFor({ state: 'visible', timeout: 10000 });
    await waitForAngularStability(this.page);
  }

  /**
   * Make every field of a settings section reachable. The settings window lays
   * its sections out open: a section's primary fields are always shown and the
   * rest sit behind that section's own "More options" toggle (a
   * `formly-collapsible`, absent for sections without secondary fields).
   * Scrolls to the section and opens that toggle when there is one.
   */
  async expandSection(sectionSelector: string): Promise<void> {
    const section = this.page.locator(sectionSelector);
    await section.waitFor({ state: 'visible', timeout: 10000 });
    await section.scrollIntoViewIfNeeded();
    // The fields render a tick after the section heading. Not every field type
    // goes through the setting wrapper (the App features switches do not), so
    // any formly field counts.
    await section
      .locator('[data-setting-key], formly-field')
      .first()
      .waitFor({ state: 'attached', timeout: 10000 });

    const header = section.locator('formly-collapsible > .collapsible-header').first();
    if (
      (await header.isVisible()) &&
      (await header.getAttribute('aria-expanded')) !== 'true'
    ) {
      await header.click();
      // Wait for expansion - panel only exists when expanded (@if in template)
      await section
        .locator('formly-collapsible > .collapsible-panel')
        .first()
        .waitFor({ state: 'visible', timeout: 5000 });
    }

    await waitForAngularStability(this.page);
  }

  /**
   * Open the settings window on the tab that holds a section and make all of
   * its fields reachable. `sectionKey` is the form-config key, which is also
   * the `.section-<key>` class. The `section` query parameter picks the tab and,
   * on a phone (where the window starts on the category list), reveals the
   * content pane. Settings open as a dialog over the workspace, so the URL
   * stays on the current route.
   */
  async openSettingsSection(sectionKey: string): Promise<void> {
    await this.page.goto(`/#/config?section=${sectionKey}`);
    await this.pageSettings.waitFor({ state: 'visible', timeout: 10000 });
    await this.expandSection(`.section-${sectionKey}`);
  }

  /**
   * Close the settings window with its header close button and wait until it
   * is gone, so the workspace underneath takes clicks and shortcuts again.
   */
  async closeSettings(): Promise<void> {
    await this.page
      .locator('.settings-window-header')
      .getByRole('button', { name: 'Close' })
      .click();
    await this.pageSettings.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Scroll to a specific section
   */
  async scrollToSection(sectionSelector: string): Promise<void> {
    await this.page.evaluate((selector) => {
      const section = document.querySelector(selector);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, sectionSelector);
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if on settings page
   */
  async isOnSettingsPage(): Promise<boolean> {
    return await this.pageSettings.isVisible();
  }

  /**
   * Navigate back to work view
   */
  async navigateBackToWorkView(): Promise<void> {
    await this.page.goto('/#/tag/TODAY/tasks');
    await this.page.waitForLoadState('networkidle');
    await waitForAngularStability(this.page);
  }
}
