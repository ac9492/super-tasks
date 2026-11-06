import { normalizePalette } from '../palette-normalize.util';
import { contrastRatio } from '../palette-color.util';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeSelectorComponent } from './theme-selector.component';
import { GlobalThemeService } from '../global-theme.service';
import { PaletteThemeService } from '../palette-theme.service';
import { LS } from '../../persistence/storage-keys.const';
import { T } from '../../../t.const';

describe('ThemeSelectorComponent', () => {
  const setup = (
    isDark: boolean,
  ): {
    component: ThemeSelectorComponent;
    service: PaletteThemeService;
    isDarkTheme: WritableSignal<boolean>;
  } => {
    const isDarkTheme = signal(isDark);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GlobalThemeService,
          useValue: { isDarkTheme, darkMode: signal('system') },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new ThemeSelectorComponent());
    return { component, service: TestBed.inject(PaletteThemeService), isDarkTheme };
  };
  const edit = (component: ThemeSelectorComponent, key: string, value: string): void =>
    component.updateColor(
      key as 'background',
      {
        target: { value },
      } as unknown as Event,
    );

  afterEach(() => localStorage.removeItem(LS.COLOR_PALETTE));

  it('edits the displayed mode, keeps the raw choice and previews normalised colors', () => {
    const { component, service, isDarkTheme } = setup(true);
    const originalLight = service.palettes().light;
    edit(component, 'background', '#ffffff');
    edit(component, 'surface', '#000000');
    // The inputs show the raw pick; dark mode keeps dark canvases, so both
    // preview layers take white text.
    expect(component.colors().background).toBe('#ffffff');
    expect(component.roles().background).not.toBe('#ffffff');
    expect(component.previewInk().background).toBe('#ffffff');
    expect(component.previewInk().surface).toBe('#ffffff');
    expect(component.roles().adjusted.background).toBeTrue();
    expect(component.adjustedHint()).toBe(T.GCF.MISC.PALETTE.ADJUSTED_DARK);
    expect(service.palettes().light).toEqual(originalLight);
    isDarkTheme.set(false);
    expect(component.colors()).toEqual(originalLight);
    expect(component.adjustedHint()).toBeNull();
  });

  it('explains an adjusted accent without a mode note', () => {
    const { component } = setup(false);
    edit(component, 'accent', '#00ff00');
    expect(component.roles().accent).toBe('#009800');
    expect(component.adjustedHint()).toBe(T.GCF.MISC.PALETTE.ADJUSTED);
  });

  it('shows presets with the colors the app paints and marks the active one', () => {
    const { component, service } = setup(false);
    const presets = component.presets();
    expect(presets[0].selected).toBeTrue();
    expect(presets[0].swatches).toEqual([
      service.roles(false).background,
      service.roles(false).surface,
      service.roles(false).accent,
    ]);
    service.select(presets[2].colors);
    expect(component.presets()[2].selected).toBeTrue();
    expect(component.presets()[0].selected).toBeFalse();
  });
  it('offers twelve readable presets in both modes', () => {
    const { component } = setup(false);
    expect(component.presets().length).toBe(12);
    for (const preset of component.presets()) {
      for (const mode of ['light', 'dark'] as const) {
        const roles = normalizePalette(preset.colors[mode], mode);
        expect(contrastRatio(roles.surfaceInk, roles.surface))
          .withContext(preset.label + mode)
          .toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(roles.accentInk, roles.accent))
          .withContext(preset.label + mode)
          .toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
