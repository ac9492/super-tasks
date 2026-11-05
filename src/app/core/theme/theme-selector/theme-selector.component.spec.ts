import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeSelectorComponent } from './theme-selector.component';
import { GlobalThemeService } from '../global-theme.service';
import { PaletteThemeService } from '../palette-theme.service';
import { LS } from '../../persistence/storage-keys.const';

describe('ThemeSelectorComponent', () => {
  afterEach(() => localStorage.removeItem(LS.COLOR_PALETTE));
  it('edits the displayed mode and previews independently contrasting surfaces', () => {
    const isDarkTheme = signal(true);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GlobalThemeService,
          useValue: { isDarkTheme, darkMode: signal('system') },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new ThemeSelectorComponent());
    const service = TestBed.inject(PaletteThemeService);
    const originalLight = service.palettes().light;
    component.updateColor('background', {
      target: { value: '#ffffff' },
    } as unknown as Event);
    component.updateColor('surface', {
      target: { value: '#000000' },
    } as unknown as Event);
    expect(component.previewInk().background).toBe('#000000');
    expect(component.previewInk().surface).toBe('#ffffff');
    expect(service.palettes().light).toEqual(originalLight);
    isDarkTheme.set(false);
    expect(component.colors()).toEqual(originalLight);
  });
});
