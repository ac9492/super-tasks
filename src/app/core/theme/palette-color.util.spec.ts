import {
  contrastRatio,
  deltaE,
  hexToOklab,
  hexToOklch,
  minContrast,
  mixSrgb,
  oklchToHex,
} from './palette-color.util';
import { mixColors } from './palette.util';

const channelDistance = (a: string, b: string): number =>
  Math.max(
    ...[1, 3, 5].map((offset) =>
      Math.abs(
        parseInt(a.slice(offset, offset + 2), 16) -
          parseInt(b.slice(offset, offset + 2), 16),
      ),
    ),
  );

describe('palette colour maths', () => {
  it('round-trips sRGB through OKLCH within one 8-bit step', () => {
    for (let r = 0; r <= 255; r += 51) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 51) {
          const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
          expect(channelDistance(oklchToHex(hexToOklch(hex)), hex))
            .withContext(hex)
            .toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('matches reference OKLab values', () => {
    const [l, a, b] = hexToOklab('#ff0000');
    expect(l).toBeCloseTo(0.628, 3);
    expect(a).toBeCloseTo(0.2249, 3);
    expect(b).toBeCloseTo(0.1258, 3);
    expect(hexToOklab('#ffffff')[0]).toBeCloseTo(1, 4);
  });

  it('keeps greys exactly neutral', () => {
    for (const l of [0, 0.2, 0.5, 0.73, 0.9, 1]) {
      const hex = oklchToHex([l, 0, 0]);
      expect(hex.slice(1, 3)).toBe(hex.slice(3, 5));
      expect(hex.slice(3, 5)).toBe(hex.slice(5, 7));
    }
    expect(oklchToHex([1, 0, 0])).toBe('#ffffff');
    expect(oklchToHex([0, 0, 0])).toBe('#000000');
  });

  it('maps out-of-gamut colours by chroma, keeping hue and lightness', () => {
    // Very high chroma at mid lightness is far outside sRGB.
    for (const hue of [27, 66, 147, 220, 304]) {
      const hex = oklchToHex([0.6, 0.4, hue]);
      const [l, c, h] = hexToOklch(hex);
      expect(l).toBeCloseTo(0.6, 2);
      expect(c).toBeLessThan(0.4);
      expect(Math.abs(((h - hue + 540) % 360) - 180)).toBeLessThan(2);
    }
  });

  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(minContrast('#000000', ['#ffffff', '#777777'])).toBeCloseTo(
      contrastRatio('#000000', '#777777'),
      6,
    );
  });

  it('mixes like color-mix in sRGB and measures perceptual distance', () => {
    expect(mixSrgb('#ffffff', '#075b5e', 0.18)).toBe(mixColors('#ffffff', '#075b5e', 0.18));
    expect(mixSrgb('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(deltaE('#123456', '#123456')).toBe(0);
    expect(deltaE('#000000', '#ffffff')).toBeCloseTo(1, 3);
  });
});
