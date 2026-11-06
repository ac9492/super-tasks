import {
  drawBlurredImage,
  drawGlassGradient,
  GLASS_GRADIENT_SIZE,
  GLASS_IMAGE_EDGE,
  glassGradientDataUrl,
  glassGradientRecipe,
  pickGlassBackgroundImage,
} from './glass-backdrop.util';
import { DEFAULT_PALETTE, PaletteColors } from '../palette.util';

const pixel = (canvas: HTMLCanvasElement, x: number, y: number): number[] =>
  Array.from(canvas.getContext('2d')!.getImageData(x, y, 1, 1).data);

const channels = (hex: string): number[] =>
  [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

describe('glass backdrop drawing', () => {
  it('derives every glow from the palette roles', () => {
    const colors: PaletteColors = {
      background: '#000000',
      surface: '#ffffff',
      accent: '#ff0000',
    };
    const recipe = glassGradientRecipe(colors);
    expect(recipe.base).toBe('#000000');
    expect(recipe.glows.length).toBe(3);
    // Each glow is a mix between the background and another role.
    for (const glow of recipe.glows) {
      expect(glow.color).toMatch(/^#[\da-f]{6}$/);
      expect(glow.color).not.toBe(colors.background);
    }
  });

  it('draws a tiny opaque gradient that stays within the palette', () => {
    const canvas = document.createElement('canvas');
    const colors = DEFAULT_PALETTE.light;
    drawGlassGradient(canvas, colors);
    expect([canvas.width, canvas.height]).toEqual([
      GLASS_GRADIENT_SIZE.width,
      GLASS_GRADIENT_SIZE.height,
    ]);
    const background = channels(colors.background);
    const accent = channels(colors.accent);
    for (const [x, y] of [
      [0, 0],
      [32, 20],
      [63, 39],
    ]) {
      const [r, g, b, a] = pixel(canvas, x, y);
      expect(a).toBe(255);
      // Never darker than the darker role or lighter than white: no grey fringe.
      [r, g, b].forEach((value, i) => {
        expect(value).toBeGreaterThanOrEqual(Math.min(background[i], accent[i]) - 2);
      });
    }
    // The accent glow is visible in the top-left corner.
    expect(pixel(canvas, 0, 0)).not.toEqual([...background, 255]);
  });

  it('renders a preview data URL', () => {
    expect(glassGradientDataUrl(DEFAULT_PALETTE.dark)).toMatch(/^data:image\/png/);
  });

  it('draws an image small, keeping its aspect ratio', () => {
    const source = document.createElement('canvas');
    source.width = 1600;
    source.height = 800;
    const ctx = source.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 800, 800);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(800, 0, 800, 800);
    const canvas = document.createElement('canvas');
    drawBlurredImage(canvas, source);
    expect([canvas.width, canvas.height]).toEqual([
      GLASS_IMAGE_EDGE,
      GLASS_IMAGE_EDGE / 2,
    ]);
    // Edges keep the image's own colors (no transparent bleed from the blur).
    expect(pixel(canvas, 0, 48)[3]).toBe(255);
    expect(pixel(canvas, 0, 48)[0]).toBeGreaterThan(200);
    expect(pixel(canvas, GLASS_IMAGE_EDGE - 1, 48)[2]).toBeGreaterThan(200);
    // The middle is blended (blurred) between the halves.
    const [r, , b] = pixel(canvas, GLASS_IMAGE_EDGE / 2, 48);
    expect(r).toBeGreaterThan(40);
    expect(b).toBeGreaterThan(40);
  });
});

describe('pickGlassBackgroundImage()', () => {
  it('uses the current mode first, then the other mode', () => {
    const both = { backgroundImageLight: 'light.jpg', backgroundImageDark: 'dark.jpg' };
    expect(pickGlassBackgroundImage(both, false)).toBe('light.jpg');
    expect(pickGlassBackgroundImage(both, true)).toBe('dark.jpg');
    expect(pickGlassBackgroundImage({ backgroundImageLight: 'light.jpg' }, true)).toBe(
      'light.jpg',
    );
  });
  it('treats empty and cleared values as no image', () => {
    expect(
      pickGlassBackgroundImage(
        { backgroundImageLight: '  ', backgroundImageDark: null },
        false,
      ),
    ).toBeNull();
    expect(pickGlassBackgroundImage(undefined, true)).toBeNull();
  });
});
