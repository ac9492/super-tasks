import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { LS } from '../persistence/storage-keys.const';
import { normalizePalette, PaletteRoles } from './palette-normalize.util';
import {
  colorChannels,
  contrastingInk,
  DEFAULT_PALETTE,
  isPaletteColors,
  mixColors,
  PaletteColors,
  PalettePair,
} from './palette.util';

const readPalette = (): PalettePair => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(LS.COLOR_PALETTE) || 'null');
    if (typeof raw === 'object' && raw !== null) {
      const stored = raw as Record<string, unknown>;
      if (isPaletteColors(stored.light) && isPaletteColors(stored.dark)) {
        return { light: stored.light, dark: stored.dark };
      }
    }
  } catch {
    // Malformed or unavailable device-local storage uses the calm default.
  }
  return structuredClone(DEFAULT_PALETTE);
};

const samePaletteColors = (a: PaletteColors, b: PaletteColors): boolean =>
  a.background === b.background && a.surface === b.surface && a.accent === b.accent;

const MATERIAL_STOPS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  'A100',
  'A200',
  'A400',
  'A700',
] as const;

/**
 * Warn stops: the light stops are danger tints over the surface (Material
 * consumers use them as fills behind darker warn text); every other stop is
 * the danger tone itself, which reads as text on every layer.
 */
const WARN_TINTS = new Map<string, number>([
  ['50', 0.1],
  ['100', 0.18],
  ['200', 0.3],
  ['300', 0.5],
  ['400', 0.75],
]);

const channels = (hex: string): string => colorChannels(hex).join(', ');
const percent = (alpha: number): string => `${Math.round(alpha * 100)}%`;

/**
 * Every custom property `apply()` writes on the root element for one mode's
 * roles (docs/theming-contract.md lists the contract for each).
 */
export const paletteCssVars = (r: PaletteRoles): Map<string, string> => {
  const inkAlpha = (alpha: number): string => `rgba(${channels(r.ink)}, ${alpha})`;
  const vars = new Map<string, string>([
    ['--palette-background', r.background],
    ['--palette-surface', r.surface],
    ['--palette-accent', r.accent],
    ['--palette-background-ink', r.backgroundInk],
    ['--palette-surface-ink', r.surfaceInk],
    ['--palette-accent-ink', r.accentInk],
    ['--palette-background-ink-channel', channels(r.backgroundInk)],
    ['--palette-surface-ink-channel', channels(r.surfaceInk)],
    ['--palette-selected', r.selected],
    ['--palette-selected-ink', r.selectedInk],
    ['--palette-hover', r.hover],
    ['--palette-hover-ink', r.hoverInk],
    ['--palette-surface-raised', r.surfaceRaised],
    ['--palette-ink-muted', r.inkMuted],
    ['--palette-selected-ink-muted', r.selectedInkMuted],
    ['--palette-accent-text', r.accentText],
    ['--palette-focus-ring', r.focusRing],
    ['--palette-separator', inkAlpha(r.alphas.separator)],
    ['--palette-border', inkAlpha(r.alphas.border)],
    ['--palette-outline', inkAlpha(r.alphas.outline)],
    ['--palette-disabled', inkAlpha(r.alphas.disabled)],
    ['--palette-disabled-ink', inkAlpha(r.alphas.disabledInk)],
    ['--palette-scrollbar', inkAlpha(r.alphas.scrollbar)],
    ['--palette-danger', r.danger],
    ['--palette-danger-ink', r.dangerInk],
    ['--palette-warning', r.warning],
    ['--palette-warning-ink', r.warningInk],
    ['--palette-success', r.success],
    ['--palette-success-ink', r.successInk],
    ['--palette-upcoming', r.upcoming],
    ['--palette-upcoming-ink', r.upcomingInk],
    ['--palette-tooltip-bg', r.tooltip],
    ['--palette-tooltip-ink', r.tooltipInk],
    // Glass (consumed by _glass.scss): tints are the background role, alphas
    // are max(design, contrast floor), the edge line is the separator.
    ['--glass-panel-tint', r.background],
    ['--glass-canvas-tint', r.background],
    ['--glass-panel-alpha', percent(r.glass.alpha.panel)],
    ['--glass-canvas-alpha', percent(r.glass.alpha.canvas)],
    ['--glass-overlay-alpha', percent(r.glass.alpha.overlay)],
    ['--glass-ink-muted', r.glass.inkMuted],
    ['--glass-focus-ring', r.glass.focusRing],
    ['--glass-edge-line', inkAlpha(r.alphas.separator)],
  ]);
  // Material palette stops, including RGB and contrast variants: primary and
  // accent are the (normalised) accent, warn is the danger role.
  for (const role of ['primary', 'accent', 'warn'] as const) {
    for (const stop of MATERIAL_STOPS) {
      const tint = role === 'warn' ? WARN_TINTS.get(stop) : undefined;
      const base = role === 'warn' ? r.danger : r.accent;
      const color = tint === undefined ? base : mixColors(r.surface, base, tint);
      const ink = contrastingInk(color);
      vars.set(`--palette-${role}-${stop}`, color);
      vars.set(`--palette-${role}-${stop}-no-rgb`, channels(color));
      vars.set(`--palette-${role}-contrast-${stop}`, ink);
      vars.set(`--palette-${role}-contrast-${stop}-no-rgb`, `${channels(ink)}, 1`);
    }
  }
  return vars;
};

@Injectable({ providedIn: 'root' })
export class PaletteThemeService {
  private readonly _document = inject(DOCUMENT);
  private readonly _palettes = signal<PalettePair>(readPalette());
  /** Raw chosen colours, as stored. The UI paints with `roles()`. */
  readonly palettes = this._palettes.asReadonly();
  private readonly _appliedVersion = signal(0);
  readonly appliedVersion = this._appliedVersion.asReadonly();
  // Memoised per mode, so editing one mode never re-normalises the other.
  private readonly _lightColors = computed(() => this._palettes().light, {
    equal: samePaletteColors,
  });
  private readonly _darkColors = computed(() => this._palettes().dark, {
    equal: samePaletteColors,
  });
  private readonly _lightRoles = computed(() =>
    normalizePalette(this._lightColors(), 'light'),
  );
  private readonly _darkRoles = computed(() =>
    normalizePalette(this._darkColors(), 'dark'),
  );

  /** The normalised roles the UI paints with in that mode. */
  roles(isDark: boolean): PaletteRoles {
    return isDark ? this._darkRoles() : this._lightRoles();
  }

  updateColor(mode: keyof PalettePair, key: keyof PaletteColors, value: string): void {
    const colors = { ...this._palettes()[mode], [key]: value };
    if (!isPaletteColors(colors)) return;
    this.select({ ...this._palettes(), [mode]: colors });
  }

  select(palettes: PalettePair): void {
    if (!isPaletteColors(palettes.light) || !isPaletteColors(palettes.dark)) return;
    this._palettes.set(structuredClone(palettes));
    try {
      localStorage.setItem(LS.COLOR_PALETTE, JSON.stringify(palettes));
    } catch {
      // Color editing still works for this session when storage is unavailable.
    }
  }

  reset(): void {
    this.select(DEFAULT_PALETTE);
  }

  /**
   * Runs only on palette/mode changes. No task-row observers or DOM reads.
   * Writes the normalised roles to the root element: Angular Material
   * declares its light-mode component tokens on `html`, where they resolve
   * `--palette-*`, and `body` inherits everything from there.
   */
  apply(isDark: boolean): void {
    const style = this._document.documentElement.style;
    for (const [name, value] of paletteCssVars(this.roles(isDark))) {
      style.setProperty(name, value);
    }
    this._appliedVersion.update((version) => version + 1);
  }
}
