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
const toGamma = (c: number): number => {
  if (c <= 0.0031308) return 12.92 * c;
  const power = c ** (1 / 2.4);
  const curved = 1.055 * power;
  return curved - 0.055;
};

type Matrix = readonly [Triple, Triple, Triple];
const dot = (row: Triple, v: Triple): number =>
  row.reduce((sum, weight, i) => {
    const term = weight * v[i];
    return sum + term;
  }, 0);
const multiply = (m: Matrix, v: Triple): Triple => [
  dot(m[0], v),
  dot(m[1], v),
  dot(m[2], v),
];

// Ottosson's OKLab matrices (linear sRGB -> LMS -> OKLab and back).
const LINEAR_TO_LMS: Matrix = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
const LMS_TO_OKLAB: Matrix = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];
const OKLAB_TO_LMS: Matrix = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548],
];
const LMS_TO_LINEAR: Matrix = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
];

const rgbToOklab = (rgb: Triple): Triple => {
  const lms = multiply(LINEAR_TO_LMS, [
    toLinear(rgb[0]),
    toLinear(rgb[1]),
    toLinear(rgb[2]),
  ]);
  return multiply(LMS_TO_OKLAB, [
    Math.cbrt(lms[0]),
    Math.cbrt(lms[1]),
    Math.cbrt(lms[2]),
  ]);
};

/** Unclamped linear-light sRGB; callers check the gamut. */
const oklabToLinear = (lab: Triple): Triple => {
  const lms = multiply(OKLAB_TO_LMS, lab);
  return multiply(LMS_TO_LINEAR, [lms[0] ** 3, lms[1] ** 3, lms[2] ** 3]);
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
