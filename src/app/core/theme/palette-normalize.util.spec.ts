import { contrastRatio, deltaE, hexToOklch } from './palette-color.util';
import {
  GLASS_DESIGN_ALPHA,
  normalizePalette,
  PaletteMode,
  PaletteRoles,
} from './palette-normalize.util';
import { DEFAULT_PALETTE, mixColors, PaletteColors, PalettePair } from './palette.util';

const MODES: PaletteMode[] = ['light', 'dark'];

/** The shipped default and presets, then deliberately hostile picks. */
const STRESS_PALETTES: { key: string; colors: PalettePair }[] = [
  { key: 'default', colors: DEFAULT_PALETTE },
  {
    key: 'sand',
    colors: {
      light: { background: '#f3ede2', surface: '#fffbf4', accent: '#a45c40' },
      dark: { background: '#231e19', surface: '#342c24', accent: '#e5b48e' },
    },
  },
  {
    key: 'forest',
    colors: {
      light: { background: '#e8eee7', surface: '#f7fbf5', accent: '#44785b' },
      dark: { background: '#17221b', surface: '#26372b', accent: '#a6c99e' },
    },
  },
  {
    key: 'plum',
    colors: {
      light: { background: '#efe9f1', surface: '#fcf8ff', accent: '#855c94' },
      dark: { background: '#241c29', surface: '#362a3e', accent: '#cfb0df' },
    },
  },
  {
    key: 'neon-green',
    colors: {
      light: { background: '#ffffff', surface: '#ffffff', accent: '#00ff00' },
      dark: { background: '#000000', surface: '#111111', accent: '#00ff00' },
    },
  },
  {
    key: 'neon-magenta',
    colors: {
      light: { background: '#fafafa', surface: '#ffffff', accent: '#ff00ff' },
      dark: { background: '#121212', surface: '#1e1e1e', accent: '#ff00ff' },
    },
  },
  {
    key: 'accent-eq-bg',
    colors: {
      light: { background: '#f8f8f7', surface: '#ffffff', accent: '#f8f8f7' },
      dark: { background: '#131314', surface: '#242426', accent: '#131314' },
    },
  },
  {
    key: 'accent-near-surface',
    colors: {
      light: { background: '#f8f8f7', surface: '#ffffff', accent: '#eef6fb' },
      dark: { background: '#131314', surface: '#242426', accent: '#2b2b33' },
    },
  },
  {
    key: 'wrong-mode',
    colors: {
      light: { background: '#000000', surface: '#1c1c1e', accent: '#0a84ff' },
      dark: { background: '#ffffff', surface: '#f2f2f2', accent: '#007aff' },
    },
  },
  {
    key: 'saturated-bg',
    colors: {
      light: { background: '#ff0000', surface: '#ffffff', accent: '#0000ff' },
      dark: { background: '#0000ff', surface: '#000080', accent: '#ffff00' },
    },
  },
  {
    key: 'pastel',
    colors: {
      light: { background: '#ffd1dc', surface: '#ffe4e1', accent: '#b0e0e6' },
      dark: { background: '#ffd1dc', surface: '#ffe4e1', accent: '#b0e0e6' },
    },
  },
  {
    key: 'mid-grey',
    colors: {
      light: { background: '#808080', surface: '#8c8c8c', accent: '#999999' },
      dark: { background: '#808080', surface: '#8c8c8c', accent: '#999999' },
    },
  },
  {
    key: 'brown-olive',
    colors: {
      light: { background: '#6b4f2a', surface: '#808000', accent: '#556b2f' },
      dark: { background: '#3b2f1e', surface: '#4b4b1e', accent: '#808000' },
    },
  },
  {
    key: 'recessed-surface',
    colors: {
      light: { background: '#ffffff', surface: '#d6d6d6', accent: '#3367d6' },
      dark: { background: '#2e2e2e', surface: '#121212', accent: '#8ab4f8' },
    },
  },
  {
    key: 'one-colour',
    colors: {
      light: { background: '#3366cc', surface: '#3366cc', accent: '#3366cc' },
      dark: { background: '#3366cc', surface: '#3366cc', accent: '#3366cc' },
    },
  },
  {
    key: 'mono',
    colors: {
      light: { background: '#ffffff', surface: '#ffffff', accent: '#000000' },
      dark: { background: '#000000', surface: '#000000', accent: '#ffffff' },
    },
  },
  {
    key: 'red-accent',
    colors: {
      light: { background: '#f8f8f7', surface: '#ffffff', accent: '#d32f2f' },
      dark: { background: '#131314', surface: '#242426', accent: '#ef5350' },
    },
  },
  {
    key: 'yellow-accent',
    colors: {
      light: { background: '#fffde7', surface: '#ffffff', accent: '#ffeb3b' },
      dark: { background: '#1a1a10', surface: '#2a2a1a', accent: '#ffeb3b' },
    },
  },
];

/**
 * Every pair the UI paints, as WCAG contrast ratios: text 4.5:1 (1.4.3),
 * graphics and states 3:1 (1.4.11), quiet lines as a visible-but-calm range,
 * hierarchy checks so roles do not collapse into each other. Returns the
 * failing pairs (empty = all pass).
 */
const failingPairs = (r: PaletteRoles): string[] => {
  const failures: string[] = [];
  const range = (id: string, value: number, min: number, max = Infinity): void => {
    if (value < min - 1e-9 || value > max + 1e-9) failures.push(`${id} ${value.toFixed(3)}`);
  };
  const c = contrastRatio;
  const ink = r.ink;
  const onSurface = (alpha: number): string => mixColors(r.surface, ink, alpha);
  const disabled = onSurface(r.alphas.disabled);
  const layers = {
    background: r.background,
    surface: r.surface,
    raised: r.surfaceRaised,
    hover: r.hover,
    selected: r.selected,
  };
  // Text >= 4.5
  range('T01 ink on background', c(r.backgroundInk, r.background), 4.5);
  range('T02 ink on surface', c(r.surfaceInk, r.surface), 4.5);
  range('T02b ink on raised', c(r.surfaceInk, r.surfaceRaised), 4.5);
  range('T03 ink on hover', c(r.hoverInk, r.hover), 4.5);
  range('T04 ink on selected', c(r.selectedInk, r.selected), 4.5);
  for (const [name, layer] of Object.entries(layers)) {
    if (name !== 'selected') range(`T05 muted on ${name}`, c(r.inkMuted, layer), 4.5);
    range(`T10 accent text on ${name}`, c(r.accentText, layer), 4.5);
    for (const tone of ['danger', 'warning', 'success', 'upcoming'] as const) {
      range(`T12 ${tone} on ${name}`, c(r[tone], layer), 4.5);
    }
  }
  range('T07 muted in selected row', c(r.selectedInkMuted, r.selected), 4.5);
  range('T09 ink on accent fill', c(r.accentInk, r.accent), 4.5);
  range('T19 ink on danger fill', c(r.dangerInk, r.danger), 4.5);
  range('T19b ink on warning fill', c(r.warningInk, r.warning), 4.5);
  range('T19c ink on success fill', c(r.successInk, r.success), 4.5);
  range('T19d ink on upcoming fill', c(r.upcomingInk, r.upcoming), 4.5);
  range('T20 Material mode ink on surface', c(ink, r.surface), 4.5);
  range('T21 tooltip ink', c(r.tooltipInk, r.tooltip), 4.5);
  // Graphics >= 3
  for (const [name, layer] of Object.entries(layers)) {
    range(`G01 accent on ${name}`, c(r.accent, layer), 3);
    range(`G04 focus ring on ${name}`, c(r.focusRing, layer), 3);
  }
  range('G07 outline on surface', c(onSurface(r.alphas.outline), r.surface), 3);
  range(
    'G07b outline on background',
    c(mixColors(r.background, ink, r.alphas.outline), r.background),
    3,
  );
  range('G11 tooltip vs raised surface', c(r.tooltip, r.surfaceRaised), 3);
  // Quiet ranges
  range(
    'Q01 separator on background',
    c(mixColors(r.background, ink, r.alphas.separator), r.background),
    1.15,
    1.75,
  );
  range('Q02 border on surface', c(onSurface(r.alphas.border), r.surface), 1.2, 1.7);
  range('Q03 surface vs background', c(r.surface, r.background), r.mode === 'light' ? 1.06 : 1.15);
  range('Q04 hover vs surface', c(r.hover, r.surface), 1.06);
  range('Q05 selected vs surface', c(r.selected, r.surface), 1.2);
  range('Q06 selected vs hover', c(r.selected, r.hover), 1.06);
  range('Q07 disabled label', c(mixColors(disabled, ink, r.alphas.disabledInk), disabled), 2, 4.2);
  range('Q08 scrollbar', c(mixColors(r.background, ink, r.alphas.scrollbar), r.background), 1.6);
  // Glass: worst backdrop = the ink colour; typical = palette-gradient stops.
  range('GL1 ink on glass panel', c(r.backgroundInk, r.glass.panelWorst), 4.5);
  range('GL2 muted on glass panel', c(r.glass.inkMuted, r.glass.panelWorst), 4.5);
  range('GL3 ink on glass canvas', c(r.backgroundInk, r.glass.canvasWorst), 4.5);
  range('GL4 focus ring on glass panel', c(r.glass.focusRing, r.glass.panelWorst), 3);
  for (const panel of r.glass.panelTypical) {
    // --glass-edge-line is --palette-separator.
    range('GL5 glass edge line', c(mixColors(panel, ink, r.alphas.separator), panel), 1.15, 1.75);
    range('GL4b focus ring on typical glass', c(r.glass.focusRing, panel), 3);
  }
  range('GL6 glass muted distinct from ink', c(r.glass.inkMuted, r.backgroundInk), 2);
  // Hierarchy / identity
  range('H01 muted distinct from ink', c(r.inkMuted, r.surfaceInk), 2);
  for (const role of ['backgroundInk', 'surfaceInk', 'hoverInk', 'selectedInk'] as const) {
    if (r[role] !== ink) failures.push(`H02 ${role} is not the mode ink`);
  }
  range('H05 disabled distinct from accent', deltaE(disabled, r.accent), 0.1);
  return failures;
};

/** Deterministic LCG (Numerical Recipes), so the fuzz is identical on every run. */
const seededHex = (seed: number): (() => string) => {
  let state = seed >>> 0;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  return () => `#${(next() >>> 8).toString(16).padStart(6, '0')}`;
};

const renormalize = (r: PaletteRoles): PaletteRoles =>
  normalizePalette({ background: r.background, surface: r.surface, accent: r.accent }, r.mode);

const STABLE_ROLES = ['background', 'surface', 'accent', 'hover', 'selected', 'inkMuted'] as const;

describe('normalizePalette', () => {
  for (const { key, colors } of STRESS_PALETTES) {
    for (const mode of MODES) {
      it(`${key}/${mode}: every pair passes`, () => {
        expect(failingPairs(normalizePalette(colors[mode], mode))).toEqual([]);
      });
    }
  }

  it('keeps the shipped palettes byte-identical, with the familiar 8 % / 18 % tints', () => {
    for (const { key, colors } of STRESS_PALETTES.slice(0, 4)) {
      for (const mode of MODES) {
        const input = colors[mode];
        const r = normalizePalette(input, mode);
        const context = `${key}/${mode}`;
        expect(r.background).withContext(context).toBe(input.background);
        expect(r.surface).withContext(context).toBe(input.surface);
        expect(r.accent).withContext(context).toBe(input.accent);
        expect(r.hover).withContext(context).toBe(mixColors(input.surface, input.accent, 0.08));
        expect(r.selected)
          .withContext(context)
          .toBe(mixColors(input.surface, input.accent, 0.18));
        expect(r.adjusted).toEqual({ background: false, surface: false, accent: false });
        expect(r.glass.alpha).withContext(context).toEqual({ ...GLASS_DESIGN_ALPHA });
      }
    }
  });

  it('derives the documented default roles', () => {
    const light = normalizePalette(DEFAULT_PALETTE.light, 'light');
    expect([light.inkMuted, light.selectedInkMuted, light.surfaceRaised]).toEqual([
      '#6c6c6c',
      '#616161',
      '#ffffff',
    ]);
    expect([light.danger, light.warning, light.success, light.upcoming]).toEqual([
      '#c0161b',
      '#8d5300',
      '#00703e',
      '#823cc3',
    ]);
    const dark = normalizePalette(DEFAULT_PALETTE.dark, 'dark');
    expect([dark.inkMuted, dark.surfaceRaised]).toEqual(['#989898', '#2b2c2e']);
    expect([dark.danger, dark.warning, dark.success, dark.upcoming]).toEqual([
      '#ff877b',
      '#f0951b',
      '#43c07a',
      '#c494ff',
    ]);
    expect(dark.focusRing).toBe(dark.accentText);
  });

  it('keeps the mode: a black light background becomes the darkest allowed light one', () => {
    const r = normalizePalette(
      { background: '#000000', surface: '#1c1c1e', accent: '#0a84ff' },
      'light',
    );
    expect(r.background).toBe('#dedede');
    expect(r.backgroundInk).toBe('#000000');
    expect(r.adjusted.background).toBeTrue();
    expect(r.isOtherModeColor).toBeTrue();
  });

  it('moves a neon accent only as far as it must and keeps its hue', () => {
    const r = normalizePalette(
      { background: '#ffffff', surface: '#ffffff', accent: '#00ff00' },
      'light',
    );
    expect(r.accent).toBe('#009800');
    expect(r.accentInk).toBe('#000000');
    expect(r.adjusted).toEqual({ background: true, surface: false, accent: true });
    expect(r.isOtherModeColor).toBeFalse();
  });

  it('is idempotent: normalising normalised colours changes nothing', () => {
    for (const { key, colors } of STRESS_PALETTES) {
      for (const mode of MODES) {
        const r = normalizePalette(colors[mode], mode);
        const again = renormalize(r);
        for (const role of STABLE_ROLES) {
          expect(again[role]).withContext(`${key}/${mode} ${role}`).toBe(r[role]);
        }
        expect(again.adjusted).toEqual({ background: false, surface: false, accent: false });
      }
    }
  });

  it('keeps the hue of chromatic choices', () => {
    for (const { key, colors } of STRESS_PALETTES) {
      for (const mode of MODES) {
        const r = normalizePalette(colors[mode], mode);
        for (const role of ['background', 'surface', 'accent'] as const) {
          const [, c0, h0] = hexToOklch(colors[mode][role]);
          const [, c1, h1] = hexToOklch(r[role]);
          if (c0 > 0.03 && c1 > 0.03) {
            const shift = Math.abs(((h1 - h0 + 540) % 360) - 180);
            expect(shift).withContext(`${key}/${mode} ${role}`).toBeLessThan(3);
          }
        }
      }
    }
  });

  it('keeps semantic tones apart from the accent and in their own hue family', () => {
    const red = normalizePalette(
      { background: '#f8f8f7', surface: '#ffffff', accent: '#d32f2f' },
      'light',
    );
    const blue = normalizePalette(
      { background: '#f8f8f7', surface: '#ffffff', accent: '#1565c0' },
      'light',
    );
    for (const r of [red, blue]) {
      const dangerHue = hexToOklch(r.danger)[2];
      expect(dangerHue).toBeGreaterThanOrEqual(19.5);
      expect(dangerHue).toBeLessThanOrEqual(34.5);
    }
    // A near accent pushes danger away from it; a distant one barely moves it.
    expect(deltaE(red.danger, red.accent)).toBeGreaterThan(0.04);
  });

  it('passes every pair and stays idempotent on a seeded random fuzz', () => {
    const randomHex = seededHex(20261105);
    const failures: Record<string, number> = {};
    let firstFailure: { mode: PaletteMode; input: PaletteColors; ids: string[] } | null =
      null;
    for (const mode of MODES) {
      for (let i = 0; i < 300; i++) {
        const input = { background: randomHex(), surface: randomHex(), accent: randomHex() };
        const r = normalizePalette(input, mode);
        const ids = failingPairs(r);
        const again = renormalize(r);
        for (const role of STABLE_ROLES) {
          if (again[role] !== r[role]) ids.push(`idempotent ${role}`);
        }
        for (const id of ids) {
          const name = id.replace(/ [\d.]+$/, '');
          failures[name] = (failures[name] ?? 0) + 1;
        }
        if (ids.length && !firstFailure) firstFailure = { mode, input, ids };
      }
    }
    expect(failures).withContext(JSON.stringify(firstFailure)).toEqual({});
  });
});
