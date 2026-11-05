import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { GlobalThemeService } from '../global-theme.service';
import { PaletteThemeService } from '../palette-theme.service';
import {
  contrastingInk,
  DEFAULT_PALETTE,
  PaletteColors,
  PalettePair,
} from '../palette.util';

@Component({
  selector: 'theme-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonToggle, MatButtonToggleGroup, MatButton, MatIcon, TranslatePipe],
  templateUrl: './theme-selector.component.html',
  styleUrl: './theme-selector.component.scss',
})
export class ThemeSelectorComponent {
  readonly T = T;
  readonly globalThemeService = inject(GlobalThemeService);
  readonly paletteService = inject(PaletteThemeService);
  readonly mode = computed(() =>
    this.globalThemeService.isDarkTheme() ? 'dark' : 'light',
  );
  readonly colors = computed(() => this.paletteService.palettes()[this.mode()]);
  readonly previewInk = computed(() => ({
    background: contrastingInk(this.colors().background),
    surface: contrastingInk(this.colors().surface),
    accent: contrastingInk(this.colors().accent),
  }));
  readonly colorFields: { key: keyof PaletteColors; label: string }[] = [
    { key: 'background', label: T.GCF.MISC.PALETTE.BACKGROUND },
    { key: 'surface', label: T.GCF.MISC.PALETTE.SURFACE },
    { key: 'accent', label: T.GCF.MISC.PALETTE.ACCENT },
  ];
  private readonly _presets: { label: string; colors: PalettePair }[] = [
    { label: T.GCF.MISC.PALETTE.PRESET_DEFAULT, colors: DEFAULT_PALETTE },
    {
      label: T.GCF.MISC.PALETTE.PRESET_SAND,
      colors: {
        light: { background: '#f3ede2', surface: '#fffbf4', accent: '#a45c40' },
        dark: { background: '#231e19', surface: '#342c24', accent: '#e5b48e' },
      },
    },
    {
      label: T.GCF.MISC.PALETTE.PRESET_FOREST,
      colors: {
        light: { background: '#e8eee7', surface: '#f7fbf5', accent: '#44785b' },
        dark: { background: '#17221b', surface: '#26372b', accent: '#a6c99e' },
      },
    },
    {
      label: T.GCF.MISC.PALETTE.PRESET_PLUM,
      colors: {
        light: { background: '#efe9f1', surface: '#fcf8ff', accent: '#855c94' },
        dark: { background: '#241c29', surface: '#362a3e', accent: '#cfb0df' },
      },
    },
  ];
  readonly presets = computed(() =>
    this._presets.map((preset) => {
      const colors = preset.colors[this.mode()];
      return {
        ...preset,
        swatches: [colors.background, colors.surface, colors.accent],
        selected:
          JSON.stringify(preset.colors) ===
          JSON.stringify(this.paletteService.palettes()),
      };
    }),
  );

  updateColor(key: keyof PaletteColors, event: Event): void {
    this.paletteService.updateColor(
      this.mode(),
      key,
      (event.target as HTMLInputElement).value,
    );
  }
}
