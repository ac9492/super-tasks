import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LS } from '../persistence/storage-keys.const';
import { paletteCssVars, PaletteThemeService } from './palette-theme.service';
import { normalizePalette } from './palette-normalize.util';
import { DEFAULT_PALETTE } from './palette.util';

const ROLE_TOKENS = [
  '--palette-background',
  '--palette-surface',
  '--palette-surface-raised',
  '--palette-accent',
  '--palette-accent-text',
  '--palette-ink-muted',
  '--palette-selected-ink-muted',
  '--palette-focus-ring',
  '--palette-separator',
  '--palette-border',
  '--palette-outline',
  '--palette-disabled',
  '--palette-disabled-ink',
  '--palette-scrollbar',
  '--palette-danger',
  '--palette-danger-ink',
  '--palette-warning',
  '--palette-warning-ink',
  '--palette-success',
  '--palette-success-ink',
  '--palette-upcoming',
  '--palette-upcoming-ink',
  '--palette-tooltip-bg',
  '--palette-tooltip-ink',
  '--glass-panel-tint',
  '--glass-canvas-tint',
  '--glass-panel-alpha',
  '--glass-canvas-alpha',
  '--glass-overlay-alpha',
  '--glass-ink-muted',
  '--glass-focus-ring',
  '--glass-edge-line',
];

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
  it('stores the raw choice but paints normalised roles that keep the mode', () => {
    const service = TestBed.inject(PaletteThemeService);
    service.updateColor('light', 'background', '#000000');
    service.updateColor('light', 'surface', '#ffffff');
    service.updateColor('light', 'accent', '#0000ff');
    service.apply(false);
    expect(service.palettes().light.background).toBe('#000000');
    // Material declares its light-mode tokens on `html`, so the palette must
    // resolve there too; `body` inherits it.
    const style = documentMock.documentElement.style;
    expect(documentMock.body.style.getPropertyValue('--palette-accent')).toBe('');
    expect(style.getPropertyValue('--palette-background')).toBe('#dedede');
    expect(style.getPropertyValue('--palette-background-ink')).toBe('#000000');
    expect(style.getPropertyValue('--palette-surface-ink')).toBe('#000000');
    expect(style.getPropertyValue('--palette-primary-500')).toBe('#0000ff');
    expect(style.getPropertyValue('--palette-primary-500-no-rgb')).toBe('0, 0, 255');
    expect(style.getPropertyValue('--palette-primary-contrast-500')).toBe('#ffffff');
    expect(style.getPropertyValue('--palette-primary-contrast-500-no-rgb')).toBe(
      '255, 255, 255, 1',
    );
  });
  it('writes every role, glass and Material token on the root element', () => {
    const service = TestBed.inject(PaletteThemeService);
    service.apply(false);
    const style = documentMock.documentElement.style;
    for (const token of ROLE_TOKENS) {
      expect(style.getPropertyValue(token)).withContext(token).not.toBe('');
    }
    const roles = normalizePalette(DEFAULT_PALETTE.light, 'light');
    expect(style.getPropertyValue('--palette-ink-muted')).toBe(roles.inkMuted);
    expect(style.getPropertyValue('--palette-outline')).toBe(
      `rgba(0, 0, 0, ${roles.alphas.outline})`,
    );
    expect(style.getPropertyValue('--glass-panel-alpha')).toBe('75%');
    expect(style.getPropertyValue('--glass-edge-line')).toBe(
      style.getPropertyValue('--palette-separator'),
    );
    expect(style.getPropertyValue('--palette-accent-500')).toBe(
      DEFAULT_PALETTE.light.accent,
    );
  });
  it('writes the warn palette from the danger role, never from the accent', () => {
    const service = TestBed.inject(PaletteThemeService);
    service.updateColor('light', 'accent', '#d32f2f');
    service.apply(false);
    const style = documentMock.documentElement.style;
    const danger = style.getPropertyValue('--palette-danger');
    expect(danger).not.toBe('#d32f2f');
    for (const stop of ['500', '700', '800', '900', 'A100', 'A700']) {
      expect(style.getPropertyValue(`--palette-warn-${stop}`)).toBe(danger);
    }
    expect(style.getPropertyValue('--palette-warn-contrast-500')).toBe(
      style.getPropertyValue('--palette-danger-ink'),
    );
    // Light stops are fills behind warn text.
    expect(style.getPropertyValue('--palette-warn-50')).not.toBe(danger);
  });
  it('updates the roles on mode switch and memoises them per mode', () => {
    const service = TestBed.inject(PaletteThemeService);
    const light = service.roles(false);
    service.apply(true);
    const style = documentMock.documentElement.style;
    expect(style.getPropertyValue('--palette-background')).toBe(
      DEFAULT_PALETTE.dark.background,
    );
    expect(style.getPropertyValue('--palette-ink-muted')).toBe(
      normalizePalette(DEFAULT_PALETTE.dark, 'dark').inkMuted,
    );
    const dark = service.roles(true);
    service.updateColor('dark', 'accent', '#ff0000');
    // Editing one mode re-normalises only that mode.
    expect(service.roles(false)).toBe(light);
    expect(service.roles(true)).not.toBe(dark);
    expect(service.roles(true).accent).not.toBe(dark.accent);
  });
  it('keeps live editing usable when persistence is blocked', () => {
    const service = TestBed.inject(PaletteThemeService);
    spyOn(localStorage, 'setItem').and.throwError('blocked');
    service.updateColor('dark', 'accent', '#ff0000');
    service.apply(true);
    expect(
      documentMock.documentElement.style.getPropertyValue('--palette-accent-ink'),
    ).toBe('#000000');
  });
  it('maps roles to custom properties without touching the DOM', () => {
    const vars = paletteCssVars(normalizePalette(DEFAULT_PALETTE.dark, 'dark'));
    expect(vars.get('--palette-separator')).toMatch(/^rgba\(255, 255, 255, 0\.\d+\)$/);
    expect(vars.get('--palette-tooltip-ink')).toBe('#000000');
    expect(vars.get('--glass-panel-tint')).toBe(DEFAULT_PALETTE.dark.background);
  });
});
