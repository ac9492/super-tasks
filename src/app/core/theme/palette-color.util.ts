// Colour maths for the palette normaliser: sRGB <-> OKLab/OKLCH (Ottosson
// 2020), WCAG 2.x contrast, sRGB alpha compositing (what browsers do for
// `rgba()` and `color-mix(in srgb, …)`), and chroma-reduction gamut mapping.
// Pure functions on `#rrggbb` strings; no dependencies.
import { mixColors, relativeLuminance } from './palette.util';

/** OKLCH triple: lightness 0–1, chroma (~0–0.37 in sRGB), hue in degrees. */
export type Oklch = readonly [l: number, c: number, h: number];
type Triple = readonly [number, number, number];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string): Triple => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

const rgbToHex = (rgb: Triple): string =>
  `#${rgb
    .map((channel) =>
      Math.round(clamp(channel, 0, 1) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

const toLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const toGamma = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

const rgbToOklab = (rgb: Triple): Triple => {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

/** Unclamped linear-light sRGB; callers check the gamut. */
const oklabToLinear = ([lightness, a, b]: Triple): Triple => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

const oklchToOklab = ([l, c, h]: Oklch): Triple => [
  l,
  c * Math.cos((h * Math.PI) / 180),
  c * Math.sin((h * Math.PI) / 180),
];

const inGamut = (linear: Triple): boolean =>
  linear.every((channel) => channel >= -1e-5 && channel <= 1 + 1e-5);

export const hexToOklab = (hex: string): Triple => rgbToOklab(hexToRgb(hex));

export const hexToOklch = (hex: string): Oklch => {
  const [l, a, b] = hexToOklab(hex);
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  return [l, Math.hypot(a, b), hue < 0 ? hue + 360 : hue];
};

/**
 * OKLCH -> hex. Out-of-gamut colours lose chroma (hue and lightness kept)
 * until they fit sRGB: 18 bisection steps, well under 0.001 chroma error.
 */
export const oklchToHex = ([lightness, chroma, hue]: Oklch): string => {
  const l = clamp(lightness, 0, 1);
  // Neutral axis: l = m = s = L, so every linear channel is L^3. Exact greys
  // avoid one-unit tints from matrix round-off.
  if (chroma < 0.002) {
    const grey = toGamma(l ** 3);
    return rgbToHex([grey, grey, grey]);
  }
  let linear = oklabToLinear(oklchToOklab([l, chroma, hue]));
  if (!inGamut(linear)) {
    let lo = 0;
    let hi = chroma;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklabToLinear(oklchToOklab([l, mid, hue])))) lo = mid;
      else hi = mid;
    }
    linear = oklabToLinear(oklchToOklab([l, lo, hue]));
  }
  return rgbToHex([
    toGamma(clamp(linear[0], 0, 1)),
    toGamma(clamp(linear[1], 0, 1)),
    toGamma(clamp(linear[2], 0, 1)),
  ]);
};

/** WCAG 2.x contrast ratio (1–21). */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Lowest contrast of `hex` against any of `refs`. */
export const minContrast = (hex: string, refs: readonly string[]): number =>
  Math.min(...refs.map((ref) => contrastRatio(hex, ref)));

/** Euclidean OKLab distance (deltaE-OK; ~0.02 is just noticeable). */
export const deltaE = (x: string, y: string): number => {
  const a = hexToOklab(x);
  const b = hexToOklab(y);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

/** `overlay` at `weight` over `base`, as `color-mix(in srgb, …)` paints it. */
export const mixSrgb = (base: string, overlay: string, weight: number): string =>
  mixColors(base, overlay, weight);
