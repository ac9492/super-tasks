import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LS } from '../persistence/storage-keys.const';
import { PaletteThemeService } from './palette-theme.service';
import { DEFAULT_PALETTE } from './palette.util';

describe('PaletteThemeService', () => {
  let documentMock: Document;
  beforeEach(() => {
    localStorage.removeItem(LS.COLOR_PALETTE);
    documentMock = document.implementation.createHTMLDocument();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: documentMock }],
    });
  });
  afterEach(() => localStorage.removeItem(LS.COLOR_PALETTE));
  it('restores local colors and keeps light/dark edits independent', () => {
    const service = TestBed.inject(PaletteThemeService);
    service.updateColor('light', 'background', '#000000');
    expect(service.palettes().dark).toEqual(DEFAULT_PALETTE.dark);
    TestBed.resetTestingModule();
    const restored = TestBed.inject(PaletteThemeService);
    expect(restored.palettes().light.background).toBe('#000000');
    restored.reset();
    expect(restored.palettes()).toEqual(DEFAULT_PALETTE);
  });
  it('ignores malformed storage and invalid edits', () => {
    localStorage.setItem(LS.COLOR_PALETTE, '{broken');
    const service = TestBed.inject(PaletteThemeService);
    service.updateColor('light', 'accent', 'red');
    expect(service.palettes()).toEqual(DEFAULT_PALETTE);
  });
  it('pairs opposite surfaces and bridges filled Material controls', () => {
    const service = TestBed.inject(PaletteThemeService);
    service.updateColor('light', 'background', '#000000');
    service.updateColor('light', 'surface', '#ffffff');
    service.updateColor('light', 'accent', '#0000ff');
    service.apply(false);
    const style = documentMock.body.style;
    expect(style.getPropertyValue('--palette-background-ink')).toBe('#ffffff');
    expect(style.getPropertyValue('--palette-surface-ink')).toBe('#000000');
    expect(style.getPropertyValue('--palette-primary-500-no-rgb')).toBe('0, 0, 255');
    expect(style.getPropertyValue('--palette-primary-contrast-500')).toBe('#ffffff');
    expect(style.getPropertyValue('--palette-primary-contrast-500-no-rgb')).toBe(
      '255, 255, 255, 1',
    );
  });
  it('keeps live editing usable when persistence is blocked', () => {
    const service = TestBed.inject(PaletteThemeService);
    spyOn(localStorage, 'setItem').and.throwError('blocked');
    service.updateColor('dark', 'accent', '#ff0000');
    service.apply(true);
    expect(documentMock.body.style.getPropertyValue('--palette-accent-ink')).toBe(
      '#000000',
    );
  });
});
