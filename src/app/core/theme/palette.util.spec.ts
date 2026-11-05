import {
  contrastingInk,
  isPaletteColors,
  mixColors,
  relativeLuminance,
} from './palette.util';

describe('palette contrast', () => {
  it('chooses the stronger WCAG contrast across the RGB cube', () => {
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
          const luminance = relativeLuminance(hex);
          const black = (luminance + 0.05) / 0.05;
          const white = 1.05 / (luminance + 0.05);
          const ink = contrastingInk(hex);
          expect(ink === '#000000' ? black : white).toBeGreaterThanOrEqual(4.5);
          expect(ink === '#000000' ? black : white).toBe(Math.max(black, white));
        }
      }
    }
  });
  it('uses luminance rather than brightness or mode', () => {
    expect(contrastingInk('#00ff00')).toBe('#000000');
    expect(contrastingInk('#ff0000')).toBe('#000000');
    expect(contrastingInk('#0000ff')).toBe('#ffffff');
    expect(contrastingInk('#777777')).toBe('#000000');
  });
  it('derives opaque states and validates persisted colors', () => {
    expect(mixColors('#ffffff', '#000000', 0.5)).toBe('#808080');
    expect(
      isPaletteColors({ background: '#abcdef', surface: '#123456', accent: '#ABCD00' }),
    ).toBeTrue();
    for (const value of [
      null,
      {},
      { background: 'red', surface: '#fff', accent: 'url(x)' },
    ]) {
      expect(isPaletteColors(value)).toBeFalse();
    }
  });
});
