import { test, expect } from '../../fixtures/test.fixture';

/**
 * Issue #9423: the tag color picker rendered half off-screen on macOS.
 *
 * `backdrop-filter` makes an element the containing block for fixed-position
 * descendants, and the built-in CSS themes of the time applied it to
 * `.mat-mdc-dialog-surface`. The picker positioned its panel with
 * `position: fixed` plus viewport coordinates read from the trigger, so under
 * those themes the offsets resolved against the dialog surface instead of the
 * viewport and the panel was displaced by the dialog's own origin.
 *
 * The unit spec pins the same behavior against a synthetic wrapper. This test
 * runs the real dialog and the real picker under the Glass appearance (the
 * default look, which is what a Mac gets) with that exact condition present.
 * The CSS themes are gone and Glass frosts the frame (side nav, header, side
 * panel) but not dialogs, so the test adds the dialog-surface `backdrop-filter`
 * itself and asserts it is in effect before it asserts anything about the
 * panel. Without it the assertions below would pass on the broken code too.
 *
 * Run: npm run e2e:file e2e/tests/tags/tag-color-picker-9423.spec.ts -- --retries=0
 */
test.describe('Tag color picker positioning', () => {
  test('should keep the panel on screen and anchored under a glass-surface dialog', async ({
    page,
    workViewPage,
    tagPage,
  }) => {
    await workViewPage.waitForTaskList();
    // Glass is the default appearance.
    await expect(page.locator('body')).toHaveClass(/st-glass/);

    await tagPage.openCreateTagDialog();

    await page.addStyleTag({
      content: '.mat-mdc-dialog-surface { backdrop-filter: blur(12px) !important; }',
    });
    // Precondition: without the backdrop-filter there is no containing block
    // and the assertions below would pass on the broken code too.
    await expect
      .poll(() =>
        page
          .locator('.mat-mdc-dialog-surface')
          .evaluate((el) => getComputedStyle(el).backdropFilter),
      )
      .not.toBe('none');

    const trigger = page.locator('input-color-picker .color-trigger');
    await trigger.click();

    const panel = page.locator('.color-panel');
    await expect(panel).toBeVisible();

    const triggerBox = (await trigger.boundingBox())!;
    const panelBox = (await panel.boundingBox())!;
    const viewport = page.viewportSize()!;

    // Anchored to the trigger, directly above or below it.
    expect(Math.abs(panelBox.x - triggerBox.x)).toBeLessThanOrEqual(8);
    const isBelow = Math.abs(panelBox.y - (triggerBox.y + triggerBox.height)) <= 8;
    const isAbove = Math.abs(panelBox.y + panelBox.height - triggerBox.y) <= 8;
    expect(isBelow || isAbove).toBe(true);

    // Fully on screen.
    expect(panelBox.y).toBeGreaterThanOrEqual(0);
    expect(panelBox.x).toBeGreaterThanOrEqual(0);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
  });
});
