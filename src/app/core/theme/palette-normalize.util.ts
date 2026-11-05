// The palette normaliser ("colour multiplier"): whatever background, surface
// and accent a user picks, every role the UI derives from them stays readable
// and calm. Pure and deterministic, so it runs per palette/mode change only.
//
// - The mode is the contract: light palettes stay light, dark ones dark, so
//   Material's mode-based foreground tokens always have the right polarity.
// - Hue is kept; a colour moves only when it breaks a rule, and then only as
//   far as needed (bisection on OKLCH lightness, chroma gamut-mapped).
// - Separation steps are WCAG contrast ratios, which stay meaningful at the
//   dark end where OKLab lightness over-states differences between near-blacks.
// Numbers and rationale: docs/theming-contract.md.
import { contrastingInk, mixColors, PaletteColors, relativeLuminance } from './palette.util';
import {
  contrastRatio,
  deltaE,
  hexToOklch,
  minContrast,
  oklchToHex,
} from './palette-color.util';

export type PaletteMode = 'light' | 'dark';

interface Envelope {
  minL: number;
  maxL: number;
  maxC: number;
}

interface ModeRules {
  ink: '#000000' | '#ffffff';
  /** Lightness direction toward the ink: -1 darker (light mode), +1 lighter. */
  toInk: -1 | 1;
  background: Envelope;
  surface: Envelope;
  /** Minimum contrast ratios between layers, states and lines. */
  layerSeparation: number;
  raised: number;
  hover: number;
  selected: number;
  selectedVsHover: number;
  separator: number;
  border: number;
  outline: number;
  disabled: number;
  disabledInk: number;
  scrollbar: number;
  /** OKLCH lightness the semantic tones start from before solving. */
  toneStartL: number;
  /** OKLCH lightness of the inverse tooltip fill. */
  tooltipL: number;
}

export const PALETTE_RULES: Readonly<Record<PaletteMode, ModeRules>> = {
  light: {
    ink: '#000000',
    toInk: -1,
    background: { minL: 0.9, maxL: 1, maxC: 0.05 },
    surface: { minL: 0.9, maxL: 1, maxC: 0.05 },
    layerSeparation: 1.06, // the default palette is 1.066
    raised: 1, // light overlays separate by shadow: same colour as the surface
    hover: 1.08,
    selected: 1.22,
    selectedVsHover: 1.08,
    separator: 1.22,
    border: 1.32,
    outline: 3.1,
    disabled: 1.12,
    disabledInk: 2.6,
    scrollbar: 1.7,
    toneStartL: 0.62,
    tooltipL: 0.32,
  },
  dark: {
    ink: '#ffffff',
    toInk: 1,
    background: { minL: 0, maxL: 0.32, maxC: 0.05 },
    // Max 0.34 leaves room above the surface for hover, overlays and a muted
    // text tier that is still clearly dimmer than white.
    surface: { minL: 0.2, maxL: 0.34, maxC: 0.05 },
    layerSeparation: 1.15, // the default palette is 1.20
    raised: 1.1, // menus and dialogs lift above cards: shadows vanish in dark
    hover: 1.1,
    selected: 1.3,
    selectedVsHover: 1.1,
    separator: 1.3,
    border: 1.42,
    outline: 3.1,
    disabled: 1.18,
    disabledInk: 2.6,
    scrollbar: 1.7,
    toneStartL: 0.7,
    tooltipL: 0.9,
  },
};

/** 4.5:1 text (WCAG 1.4.3) and 3:1 graphics (1.4.11), each with a rounding margin. */
export const TEXT_CONTRAST = 4.6;
export const GRAPHIC_CONTRAST = 3.1;
/** Accents below ~0.02 chroma read as grey, and a grey at 3:1 looks disabled. */
const MONO_TARGET = 6;
/** Hover/selected tint source chroma cap: neon accents stay calm. */
const TINT_MAX_C = 0.12;
/** Maximum contrast of the interaction tints against the surface. */
const STATE_MAX = { hover: 1.2, selected: 1.6 };
/** OKLCH hue windows keep each state tone recognisable; C is the requested chroma. */
const SEMANTIC_SEEDS = {
  danger: { h: 27, c: 0.2, win: [20, 34] },
  warning: { h: 66, c: 0.16, win: [55, 78] },
  success: { h: 147, c: 0.15, win: [135, 158] },
  upcoming: { h: 304, c: 0.2, win: [292, 316] },
} as const;
const HARMONIZE = { share: 0.2, maxDeg: 8, nearDeg: 45, farDeg: 100, minAccentC: 0.04 };
/** Glass design opacities (panel = nav, header, side panel; canvas = content; overlay = drawers). */
export const GLASS_DESIGN_ALPHA = { panel: 0.84, canvas: 0.92, overlay: 0.95 } as const;
/** Safety cap for the accent fixed point. */
const MAX_ACCENT_ROUNDS = 12;
/** Muted text on glass stays this far (contrast ratio) from the ink; 2:1 plus margin. */
const GLASS_MUTED_STEP = 2.05;
/** 8-bit rounding must not re-trigger an envelope clamp (keeps normalising idempotent). */
const ENVELOPE_TOLERANCE = 0.004;
/** deltaE-OK above which the editor reports a colour as adjusted. */
const ADJUSTED_DELTA_E = 0.02;

export interface PaletteInkAlphas {
  separator: number;
  border: number;
  outline: number;
  disabled: number;
  disabledInk: number;
  scrollbar: number;
}

export interface PaletteGlassRoles {
  /** Smallest tint alpha that keeps ink (and a muted tier) readable on any backdrop. */
  floor: number;
  /** max(design alpha, floor) per glass surface. */
  alpha: { panel: number; canvas: number; overlay: number };
  /** Panel/canvas tint over the worst backdrop (the ink colour itself). */
  panelWorst: string;
  canvasWorst: string;
  /** Panel tint over the palette-gradient stops (typical backdrops). */
  panelTypical: string[];
  inkMuted: string;
  focusRing: string;
}

export interface PaletteRoles {
  mode: PaletteMode;
  /** The mode's text ink: black in light mode, white in dark mode. */
  ink: '#000000' | '#ffffff';
  background: string;
  surface: string;
  /** Menus, dialogs, snackbars: equals the surface in light, lifted in dark. */
  surfaceRaised: string;
  accent: string;
  backgroundInk: string;
  surfaceInk: string;
  accentInk: string;
  hover: string;
  hoverInk: string;
  selected: string;
  selectedInk: string;
  inkMuted: string;
  selectedInkMuted: string;
  /** Accent as text: 4.5:1 on every layer, including selected rows. */
  accentText: string;
  focusRing: string;
  danger: string;
  dangerInk: string;
  warning: string;
  warningInk: string;
  success: string;
  successInk: string;
  upcoming: string;
  upcomingInk: string;
  /** Inverse tooltip pair. */
  tooltip: string;
  tooltipInk: string;
  /** Mode-ink alphas for lines and quiet fills, solved on background and surface. */
  alphas: PaletteInkAlphas;
  glass: PaletteGlassRoles;
  /** Which chosen colours render differently from the stored value. */
  adjusted: Record<keyof PaletteColors, boolean>;
  /** A chosen background or surface belonged to the other mode. */
  isOtherModeColor: boolean;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const hueDiff = (from: number, to: number): number => ((to - from + 540) % 360) - 180;

/** Chromatic accents need 3:1; near-greys ramp up to 6:1 so they don't read as disabled. */
const accentTarget = (chroma: number): number =>
  GRAPHIC_CONTRAST +
  (MONO_TARGET - GRAPHIC_CONTRAST) * (1 - smoothstep(0.02, 0.08, chroma));

/**
 * Moves `hex` along OKLCH lightness in `dir` (+1 lighter, -1 darker), keeping
 * hue and the requested chroma, until `ok` holds. Returns the input unchanged
 * when it already holds, otherwise the closest passing lightness (or the
 * end of the range when nothing passes).
 */
const solveL = (
  hex: string,
  dir: -1 | 1,
  ok: (candidate: string) => boolean,
  chroma?: number,
  limit?: number,
): string => {
  if (ok(hex)) return hex;
  const [l0, c0, h] = hexToOklch(hex);
  const c = chroma ?? c0;
  const at = (l: number): string => oklchToHex([l, c, h]);
  const end = limit ?? (dir > 0 ? 1 : 0);
  if (!ok(at(end))) return at(end);
  let lo = l0;
  let hi = end;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (ok(at(mid))) hi = mid;
    else lo = mid;
  }
  return at(hi);
};

/** Clamps lightness and chroma into an envelope; a colour inside stays byte-identical. */
const envelope = (hex: string, { minL, maxL, maxC }: Envelope): string => {
  const [l, c, h] = hexToOklch(hex);
  const t = ENVELOPE_TOLERANCE;
  if (l >= minL - t && l <= maxL + t && c <= maxC + t) return hex;
  return oklchToHex([clamp(l, minL, maxL), Math.min(c, maxC), h]);
};

/** Smallest alpha of `ink` that reaches `target` contrast over every layer. */
const inkAlpha = (ink: string, layers: readonly string[], target: number): number => {
  const ok = (alpha: number): boolean =>
    layers.every((layer) => contrastRatio(mixColors(layer, ink, alpha), layer) >= target);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi * 1000) / 1000;
};

/** A neutral (background hue, C <= 0.015) at `l`. */
const neutralAt = (l: number, bgC: number, bgH: number): string =>
  oklchToHex([l, Math.min(bgC, 0.015), bgH]);

/**
 * Hover/selected keep the familiar look (8 % / 18 % accent over the surface,
 * as `color-mix` paints it) with a chroma-capped tint source, then get a
 * guaranteed minimum step from the surface, and from each other, toward the ink.
 */
const interactionTints = (
  surface: string,
  accent: string,
  rules: ModeRules,
): { hover: string; selected: string } => {
  const [aL, aC, aH] = hexToOklch(accent);
  const tint = aC > TINT_MAX_C ? oklchToHex([aL, TINT_MAX_C, aH]) : accent;
  // An accent far from the surface (near-white accent on a dark card) would
  // overshoot: lower the tint weight, keeping states quiet.
  const capped = (percent: number, max: number): string => {
    let p = percent;
    while (p > 1 && contrastRatio(mixColors(surface, tint, p / 100), surface) > max) p--;
    return mixColors(surface, tint, p / 100);
  };
  const hover = solveL(
    capped(8, STATE_MAX.hover),
    rules.toInk,
    (h) => contrastRatio(h, surface) >= rules.hover,
  );
  const selected = solveL(
    capped(18, STATE_MAX.selected),
    rules.toInk,
    (s) =>
      contrastRatio(s, surface) >= rules.selected &&
      contrastRatio(s, hover) >= rules.selectedVsHover,
  );
  return { hover, selected };
};

/** Normalises one mode's chosen colours into the roles the UI paints with. */
export const normalizePalette = (input: PaletteColors, mode: PaletteMode): PaletteRoles => {
  const rules = PALETTE_RULES[mode];
  const ink = rules.ink;
  const raw = {
    background: input.background.toLowerCase(),
    surface: input.surface.toLowerCase(),
    accent: input.accent.toLowerCase(),
  };

  // 1. Canvas: background and surface inside the mode's envelope.
  let background = envelope(raw.background, rules.background);
  let surface = envelope(raw.surface, rules.surface);

  // 2. Layer separation. The surface may sit on either side of the background
  //    (raised or recessed cards); only a minimum step is enforced. Equal
  //    colours lift the surface; with no room left the background gives way.
  if (contrastRatio(background, surface) < rules.layerSeparation) {
    const dL = hexToOklch(surface)[0] - hexToOklch(background)[0];
    const dir: -1 | 1 = Math.abs(dL) < 1e-3 || dL > 0 ? 1 : -1;
    const apart = (s: string): boolean =>
      contrastRatio(s, background) >= rules.layerSeparation;
    const limit = dir > 0 ? rules.surface.maxL : rules.surface.minL;
    // Moving keeps the envelope's chroma cap, so a second pass leaves it alone.
    const [, sC, sH] = hexToOklch(surface);
    const surfaceC = Math.min(sC, rules.surface.maxC);
    const moved = solveL(surface, dir, apart, surfaceC, limit);
    if (apart(moved)) {
      surface = moved;
    } else {
      surface = oklchToHex([limit, surfaceC, sH]);
      const separated = surface;
      background = solveL(
        background,
        dir > 0 ? -1 : 1,
        (b) => contrastRatio(b, separated) >= rules.layerSeparation,
        Math.min(hexToOklch(background)[1], rules.background.maxC),
      );
    }
  }
  const raisedFrom = surface;
  const surfaceRaised = solveL(
    surface,
    1,
    (s) => contrastRatio(s, raisedFrom) >= rules.raised,
  );

  // 3. Accent: kept while it is a usable graphic colour (>= 3:1 on every layer
  //    it sits on), otherwise moved away from the surfaces. Each candidate is
  //    judged by the target for its own chroma (moving can lose chroma to the
  //    gamut), and the tints follow the accent, so iterate to the fixed point:
  //    normalising a normalised palette then changes nothing. The accent only
  //    ever moves toward the ink, so this terminates (<= 6 rounds in the fuzz).
  let accent = raw.accent;
  let tints = interactionTints(surface, accent, rules);
  for (let round = 0; round < MAX_ACCENT_ROUNDS; round++) {
    const layers = [background, surface, surfaceRaised, tints.hover, tints.selected];
    const next = solveL(
      accent,
      rules.toInk,
      (a) => minContrast(a, layers) >= accentTarget(hexToOklch(a)[1]),
    );
    if (next === accent) break;
    accent = next;
    tints = interactionTints(surface, accent, rules);
  }
  const { hover, selected } = tints;
  const layers = [background, surface, surfaceRaised, hover, selected];
  // Muted text is re-scoped in selected rows (selectedInkMuted).
  const mutedLayers = [background, surface, surfaceRaised, hover];
  const accentText = solveL(
    accent,
    rules.toInk,
    (a) => minContrast(a, layers) >= TEXT_CONTRAST,
  );

  // 4. Neutral ramp from the ink: muted text sits at AA on its worst layer;
  //    lines and quiet fills are ink alphas so they adapt to each layer.
  const [, bgC, bgH] = hexToOklch(background);
  const inkMuted = solveL(
    neutralAt(hexToOklch(surface)[0], bgC, bgH),
    rules.toInk,
    (m) => minContrast(m, mutedLayers) >= TEXT_CONTRAST,
  );
  const selectedInkMuted = solveL(
    neutralAt(hexToOklch(selected)[0], bgC, bgH),
    rules.toInk,
    (m) => contrastRatio(m, selected) >= TEXT_CONTRAST,
  );
  const canvas = [background, surface];
  const disabledAlpha = inkAlpha(ink, [surface], rules.disabled);
  const alphas: PaletteInkAlphas = {
    separator: inkAlpha(ink, canvas, rules.separator),
    border: inkAlpha(ink, canvas, rules.border),
    outline: inkAlpha(ink, canvas, rules.outline),
    disabled: disabledAlpha,
    disabledInk: inkAlpha(
      ink,
      [mixColors(surface, ink, disabledAlpha)],
      rules.disabledInk,
    ),
    scrollbar: inkAlpha(ink, [background], rules.scrollbar),
  };

  // 5. Semantic tones: fixed hue windows (never the accent), nudged toward a
  //    distant accent hue or away from a near one, lightness solved for text
  //    contrast on every layer.
  const [, accentC, accentH] = hexToOklch(accent);
  const tone = ({ h, c, win }: { h: number; c: number; win: readonly number[] }): string => {
    let hue = h;
    if (accentC >= HARMONIZE.minAccentC) {
      const d = hueDiff(h, accentH);
      const shift =
        Math.abs(d) > HARMONIZE.farDeg
          ? 0
          : Math.abs(d) >= HARMONIZE.nearDeg
            ? clamp(d * HARMONIZE.share, -HARMONIZE.maxDeg, HARMONIZE.maxDeg)
            : -Math.sign(d || 1) * HARMONIZE.maxDeg;
      hue = clamp(h + shift, win[0], win[1]);
    }
    return solveL(
      oklchToHex([rules.toneStartL, c, hue]),
      rules.toInk,
      (t) => minContrast(t, layers) >= TEXT_CONTRAST,
      c,
    );
  };
  const danger = tone(SEMANTIC_SEEDS.danger);
  const warning = tone(SEMANTIC_SEEDS.warning);
  const success = tone(SEMANTIC_SEEDS.success);
  const upcoming = tone(SEMANTIC_SEEDS.upcoming);

  // Inverse tooltip pair: a near-ink neutral in the background's hue.
  const tooltip = neutralAt(rules.tooltipL, bgC, bgH);

  return {
    mode,
    ink,
    background,
    surface,
    surfaceRaised,
    accent,
    backgroundInk: contrastingInk(background),
    surfaceInk: contrastingInk(surface),
    accentInk: contrastingInk(accent),
    hover,
    hoverInk: contrastingInk(hover),
    selected,
    selectedInk: contrastingInk(selected),
    inkMuted,
    selectedInkMuted,
    accentText,
    focusRing: accentText,
    danger,
    dangerInk: contrastingInk(danger),
    warning,
    warningInk: contrastingInk(warning),
    success,
    successInk: contrastingInk(success),
    upcoming,
    upcomingInk: contrastingInk(upcoming),
    tooltip,
    tooltipInk: contrastingInk(tooltip),
    alphas,
    glass: glassRoles(mode, background, surface, accent, accentText),
    adjusted: {
      background: deltaE(raw.background, background) > ADJUSTED_DELTA_E,
      surface: deltaE(raw.surface, surface) > ADJUSTED_DELTA_E,
      accent: deltaE(raw.accent, accent) > ADJUSTED_DELTA_E,
    },
    isOtherModeColor:
      contrastingInk(raw.background) !== ink || contrastingInk(raw.surface) !== ink,
  };
};

/**
 * Glass tints use the background role. Final alpha = max(design, floor); the
 * floor keeps body ink >= 4.5:1 over the worst backdrop (black behind black
 * ink, white behind white ink), so it holds for any image, OS material or
 * gradient, and leaves room for a muted tier (worst composite luminance
 * >= 0.41 in light, <= 0.064 in dark). Muted text on glass gets its own role.
 */
const glassRoles = (
  mode: PaletteMode,
  background: string,
  surface: string,
  accent: string,
  accentText: string,
): PaletteGlassRoles => {
  const rules = PALETTE_RULES[mode];
  const ink = rules.ink;
  // Room for muted text that is >= 4.5:1 on the composite yet >= 2:1 from the
  // ink, as a luminance bound on the worst composite (light >= 0.42, dark <= 0.061).
  const mutedRoom = (composite: string): boolean =>
    mode === 'light'
      ? relativeLuminance(composite) + 0.05 >= 0.05 * GLASS_MUTED_STEP * TEXT_CONTRAST
      : relativeLuminance(composite) + 0.05 <= 1.05 / (GLASS_MUTED_STEP * TEXT_CONTRAST);
  let floor = 1;
  for (let percent = 0; percent <= 100; percent++) {
    const composite = mixColors(ink, background, percent / 100);
    if (contrastRatio(ink, composite) >= TEXT_CONTRAST && mutedRoom(composite)) {
      floor = percent / 100;
      break;
    }
  }
  const alpha = {
    panel: Math.max(GLASS_DESIGN_ALPHA.panel, floor),
    canvas: Math.max(GLASS_DESIGN_ALPHA.canvas, floor),
    overlay: Math.max(GLASS_DESIGN_ALPHA.overlay, floor),
  };
  const panelWorst = mixColors(ink, background, alpha.panel);
  const [, bgC, bgH] = hexToOklch(background);
  const inkMuted = solveL(
    neutralAt(hexToOklch(panelWorst)[0], bgC, bgH),
    rules.toInk,
    (m) => contrastRatio(m, panelWorst) >= TEXT_CONTRAST,
  );
  // The palette-gradient backdrop stops, as "typical" backdrops.
  const deepAccent = mixColors(accent, contrastingInk(background), 0.35);
  const panelTypical = [
    background,
    mixColors(background, accent, 0.55),
    mixColors(background, deepAccent, 0.45),
    mixColors(background, surface, 0.5),
  ].map((stop) => mixColors(stop, background, alpha.panel));
  const focusRing = solveL(
    accentText,
    rules.toInk,
    (f) => minContrast(f, [panelWorst, ...panelTypical]) >= GRAPHIC_CONTRAST,
  );
  return {
    floor,
    alpha,
    panelWorst,
    canvasWorst: mixColors(ink, background, alpha.canvas),
    panelTypical,
    inkMuted,
    focusRing,
  };
};
