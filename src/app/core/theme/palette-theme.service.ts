import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { LS } from '../persistence/storage-keys.const';
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

@Injectable({ providedIn: 'root' })
export class PaletteThemeService {
  private readonly _document = inject(DOCUMENT);
  private readonly _palettes = signal<PalettePair>(readPalette());
  readonly palettes = this._palettes.asReadonly();
  private readonly _appliedVersion = signal(0);
  readonly appliedVersion = this._appliedVersion.asReadonly();

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
   * Writes to the root element: Angular Material declares its light-mode
   * component tokens on `html`, where they resolve `--palette-*`, and `body`
   * inherits everything from there.
   */
  apply(isDark: boolean): void {
    const colors = this._palettes()[isDark ? 'dark' : 'light'];
    const style = this._document.documentElement.style;
    const set = (name: string, value: string): void => style.setProperty(name, value);
    for (const name of ['background', 'surface', 'accent'] as const) {
      const color = colors[name];
      set(`--palette-${name}`, color);
      set(`--palette-${name}-ink`, contrastingInk(color));
    }
    const selected = mixColors(colors.surface, colors.accent, 0.18);
    const hover = mixColors(colors.surface, colors.accent, 0.08);
    set('--palette-selected', selected);
    set('--palette-selected-ink', contrastingInk(selected));
    set('--palette-hover', hover);
    set('--palette-hover-ink', contrastingInk(hover));
    set(
      '--palette-background-ink-channel',
      colorChannels(contrastingInk(colors.background)).join(', '),
    );
    set(
      '--palette-surface-ink-channel',
      colorChannels(contrastingInk(colors.surface)).join(', '),
    );

    // Bridge existing Material consumers, including RGB and contrast variants.
    // Every primary/accent stop uses the chosen accent; states are derived
    // separately above. The warn palette keeps Material's red so overdue dates
    // and destructive actions stay distinct from the accent.
    for (const role of ['primary', 'accent']) {
      for (const shade of [
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
      ]) {
        set(`--palette-${role}-${shade}`, colors.accent);
        set(`--palette-${role}-${shade}-no-rgb`, colorChannels(colors.accent).join(', '));
        set(`--palette-${role}-contrast-${shade}`, contrastingInk(colors.accent));
        set(
          `--palette-${role}-contrast-${shade}-no-rgb`,
          `${colorChannels(contrastingInk(colors.accent)).join(', ')}, 1`,
        );
      }
    }
    this._appliedVersion.update((version) => version + 1);
  }
}
