import { SettingHelpComponent } from '../../../ui/setting-help/setting-help.component';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
} from '@angular/core';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { GlobalThemeService } from '../global-theme.service';
import { PaletteThemeService } from '../palette-theme.service';
import { normalizePalette } from '../palette-normalize.util';
import { DEFAULT_PALETTE, PaletteColors, PalettePair } from '../palette.util';

@Component({
  selector: 'theme-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SettingHelpComponent,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatButton,
    MatIcon,
    TranslatePipe,
  ],
  templateUrl: './theme-selector.component.html',
  styleUrl: './theme-selector.component.scss',
})
export class ThemeSelectorComponent {
  readonly colorsExpanded = model(false);
  readonly T = T;
  readonly globalThemeService = inject(GlobalThemeService);
  readonly paletteService = inject(PaletteThemeService);
  readonly mode = computed(() =>
    this.globalThemeService.isDarkTheme() ? 'dark' : 'light',
  );
  /** Raw chosen colors: the inputs show what the user picked. */
  readonly colors = computed(() => this.paletteService.palettes()[this.mode()]);
  /** Normalised roles: the preview shows what the app paints. */
  readonly roles = computed(() => this.paletteService.roles(this.mode() === 'dark'));
  readonly previewInk = computed(() => ({
    background: this.roles().backgroundInk,
    surface: this.roles().surfaceInk,
    accent: this.roles().accentInk,
  }));
  /** One hint line when normalisation changed a chosen color. */
  readonly adjustedHint = computed(() => {
    const roles = this.roles();
    if (!Object.values(roles.adjusted).some(Boolean)) return null;
    if (!roles.isOtherModeColor) return T.GCF.MISC.PALETTE.ADJUSTED;
    return roles.mode === 'dark'
      ? T.GCF.MISC.PALETTE.ADJUSTED_DARK
      : T.GCF.MISC.PALETTE.ADJUSTED_LIGHT;
  });
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
  // Normalised per mode only, not on every color edit.
  private readonly _presetSwatches = computed(() => {
    const mode = this.mode();
    return this._presets.map((preset) => {
      const roles = normalizePalette(preset.colors[mode], mode);
      return [roles.background, roles.surface, roles.accent];
    });
  });
  readonly presets = computed(() => {
    const current = JSON.stringify(this.paletteService.palettes());
    return this._presets.map((preset, index) => ({
      ...preset,
      swatches: this._presetSwatches()[index],
      selected: JSON.stringify(preset.colors) === current,
    }));
  });

  updateColor(key: keyof PaletteColors, event: Event): void {
    this.paletteService.updateColor(
      this.mode(),
      key,
      (event.target as HTMLInputElement).value,
    );
  }
}
