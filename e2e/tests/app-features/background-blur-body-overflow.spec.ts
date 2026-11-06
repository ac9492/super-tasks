import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test.fixture';

/**
 * Bug (#9874): a blurred backdrop must not leave `<body>` with real scrollable
 * overflow.
 *
 * `body` is `position: absolute` (page.scss), so an absolutely positioned
 * backdrop inside it has `body` as its containing block and nothing clips it.
 * Scaling that backdrop for a blur does not change its layout size, but it does
 * grow its *painted* bounds, and a transformed descendant's painted bounds
 * count toward the containing block's scrollable-overflow region. `body` then
 * had permanent overflow, so any `scrollIntoView()` call whose ancestor walk
 * reaches `body` (e.g. the Schedule's current-time anchor) could nudge
 * `body.scrollLeft`/`scrollTop` and leave the whole app shell visibly shifted
 * until restart.
 *
 * The wallpaper layer that used to be scaled (`.bg-image`, and the `velvet`
 * theme's own scale of it) is gone. Its replacement is the Glass backdrop: on
 * the web a `<glass-backdrop>` canvas (shown with `body.st-glass-bitmap`) holds
 * either the chosen image, blurred, or the palette gradient. The invariant is
 * unchanged: neither may leave `<body>` scrollable, in light or dark mode. The
 * backdrop avoids it by being `position: fixed` and untransformed, which is
 * also asserted.
 */
type StoreLike = {
  dispatch: (action: unknown) => void;
};

/** A small, non-uniform picture, so the blurred canvas has something to draw. */
const makeTestImageDataUrl = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    const gradient = ctx.createLinearGradient(0, 0, 96, 60);
    gradient.addColorStop(0, '#e15d63');
    gradient.addColorStop(1, '#2d6cdf');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 96, 60);
    return canvas.toDataURL('image/png');
  });

const setBackgroundImage = async (page: Page, imageUrl: string): Promise<void> =>
  expect
    .poll(() =>
      page.evaluate((url) => {
        const store = (window as unknown as { __e2eTestHelpers?: { store?: StoreLike } })
          .__e2eTestHelpers?.store;
        if (!store) return false;
        store.dispatch({
          type: '[Global Config] Update Global Config Section',
          sectionKey: 'misc',
          sectionCfg: {
            backgroundImageLight: url,
            backgroundImageDark: url,
          },
          isSkipSnack: true,
        });
        return true;
      }, imageUrl),
    )
    .toBe(true);

const useDarkMode = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    localStorage.setItem('DARK_MODE', 'dark');
  });
  await page.reload();
};

const expectGlassBackdrop = async (page: Page): Promise<void> => {
  // Glass is on by default and the web app draws its own backdrop.
  await expect(page.locator('body')).toHaveClass(/st-glass-bitmap/);
  await expect(page.locator('glass-backdrop canvas')).toBeAttached();
  // Fixed to the viewport: never a positioned child of the absolute <body>.
  await expect(page.locator('glass-backdrop')).toHaveCSS('position', 'fixed');
  await expect(page.locator('glass-backdrop canvas')).not.toHaveCSS(
    'transform',
    /matrix|scale/,
  );
};

const expectNoRealBodyOverflow = async (page: Page): Promise<void> => {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
    scrollHeight: document.body.scrollHeight,
    clientHeight: document.body.clientHeight,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
};

test.describe('Glass backdrop and <body> overflow', () => {
  test('blurred background image does not leave <body> with real scrollable overflow', async ({
    page,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();
    await expectGlassBackdrop(page);
    // No image yet: the palette gradient is drawn.
    await expect(page.locator('glass-backdrop canvas.is-image')).toHaveCount(0);

    await setBackgroundImage(page, await makeTestImageDataUrl(page));
    // Wait for the image to be loaded and drawn blurred into the canvas.
    await expect(page.locator('glass-backdrop canvas.is-image')).toBeAttached();
    await expectGlassBackdrop(page);
    await expectNoRealBodyOverflow(page);
  });

  test('dark mode with a background image still leaves no real <body> overflow', async ({
    page,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();
    await useDarkMode(page);
    await workViewPage.waitForTaskList();
    await expect(page.locator('body')).toHaveClass(/isDarkTheme/);

    await setBackgroundImage(page, await makeTestImageDataUrl(page));
    await expect(page.locator('glass-backdrop canvas.is-image')).toBeAttached();
    await expectGlassBackdrop(page);
    await expectNoRealBodyOverflow(page);
  });

  test('palette gradient backdrop leaves no real <body> overflow in light and dark mode', async ({
    page,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();
    await expect(page.locator('body')).toHaveClass(/isLightTheme/);
    await expectGlassBackdrop(page);
    await expect(page.locator('glass-backdrop canvas.is-image')).toHaveCount(0);
    await expectNoRealBodyOverflow(page);

    await useDarkMode(page);
    await workViewPage.waitForTaskList();
    await expect(page.locator('body')).toHaveClass(/isDarkTheme/);
    await expectGlassBackdrop(page);
    await expect(page.locator('glass-backdrop canvas.is-image')).toHaveCount(0);
    await expectNoRealBodyOverflow(page);
  });
});
