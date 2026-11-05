import { EnvironmentInjector, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GlobalThemeService, resolveSystemSurfaceColor } from './global-theme.service';
import { GlassBackdrop } from './ultra-tasks-appearance.service';
import { NativeGlassState } from '../../../../electron/shared-with-frontend/native-glass.model';

interface GlobalThemeInitHarness {
  init(): void;
  darkMode: WritableSignal<'system' | 'dark' | 'light'>;
  _hasInitialized: boolean;
  _environmentInjector: EnvironmentInjector;
  _paletteThemeService: { apply: jasmine.Spy };
  isDarkTheme: WritableSignal<boolean>;
  _setBackgroundTint(value: boolean): void;
  _initIcons(): void;
  _setChartTheme(isDark: boolean): Promise<void>;
  _initHandlersForInitialBodyClasses(): void;
  _initGlass(): void;
  _initThemeWatchers(): void;
}

interface GlassHarness {
  _initGlass(): void;
  document: Document;
  darkMode: WritableSignal<'system' | 'dark' | 'light'>;
  isDarkTheme: WritableSignal<boolean>;
  _appearanceService: {
    backdrop: WritableSignal<GlassBackdrop>;
    nativeMaterial: 'vibrancy' | 'acrylic' | null;
  };
  _paletteThemeService: {
    palettes: () => {
      light: { background: string };
      dark: { background: string };
    };
  };
}

describe('resolveSystemSurfaceColor()', () => {
  it('uses an opaque theme-supplied hex color', () => {
    expect(resolveSystemSurfaceColor('  #ece5d4  ', false)).toBe('#ece5d4');
    expect(resolveSystemSurfaceColor('#abc', false)).toBe('#aabbcc');
  });

  it('normalizes an opaque CSS rgb color for Android', () => {
    expect(resolveSystemSurfaceColor('rgb(26, 24, 22)', true)).toBe('#1a1816');
  });

  it('falls back to the current mode when the token is empty or not a solid color', () => {
    expect(resolveSystemSurfaceColor('', false)).toBe('#f8f8f7');
    expect(resolveSystemSurfaceColor('linear-gradient(red, blue)', true)).toBe('#131314');
    expect(resolveSystemSurfaceColor('rgb(256, 0, 0)', true)).toBe('#131314');
  });

  it('accepts a computed theme token that resolves through another custom property', () => {
    try {
      document.body.style.setProperty('--test-system-surface', '#abc');
      document.body.style.setProperty('--system-surface', 'var(--test-system-surface)');

      const computedColor = getComputedStyle(document.body).getPropertyValue(
        '--system-surface',
      );

      expect(resolveSystemSurfaceColor(computedColor, false)).toBe('#aabbcc');
    } finally {
      document.body.style.removeProperty('--system-surface');
      document.body.style.removeProperty('--test-system-surface');
    }
  });
});

describe('GlobalThemeService palette initialization', () => {
  beforeEach(() => TestBed.configureTestingModule({}));
  it('applies palettes on mode changes without overriding the chosen mode', () => {
    const service = Object.create(GlobalThemeService.prototype) as GlobalThemeInitHarness;
    service.darkMode = signal<'system' | 'dark' | 'light'>('light');
    service.isDarkTheme = signal(false);
    service._hasInitialized = false;
    service._environmentInjector = TestBed.inject(EnvironmentInjector);
    const apply = jasmine.createSpy('apply');
    service._paletteThemeService = { apply };
    service._setBackgroundTint = (): void => undefined;
    service._initIcons = (): void => undefined;
    service._setChartTheme = async (): Promise<void> => undefined;
    service._initHandlersForInitialBodyClasses = (): void => undefined;
    service._initGlass = (): void => undefined;
    service._initThemeWatchers = (): void => undefined;
    service.init();
    TestBed.tick();
    expect(apply).toHaveBeenCalledWith(false);
    service.isDarkTheme.set(true);
    TestBed.tick();
    expect(apply).toHaveBeenCalledWith(true);
    expect(service.darkMode()).toBe('light');
  });
});

describe('GlobalThemeService glass appearance', () => {
  const GLASS_CLASSES = [
    'st-solid',
    'st-glass',
    'st-glass-native',
    'st-glass-bitmap',
    'st-glass-acrylic',
  ];
  let originalEa: unknown;

  const createHarness = (
    backdrop: GlassBackdrop,
    nativeMaterial: 'vibrancy' | 'acrylic' | null,
  ): GlassHarness => {
    const service = Object.create(GlobalThemeService.prototype) as GlassHarness;
    service.document = document;
    service.darkMode = signal<'system' | 'dark' | 'light'>('dark');
    service.isDarkTheme = signal(true);
    service._appearanceService = { backdrop: signal(backdrop), nativeMaterial };
    service._paletteThemeService = {
      palettes: () => ({
        light: { background: '#f8f8f7' },
        dark: { background: '#131314' },
      }),
    };
    return service;
  };
  const bodyGlassClasses = (): string[] =>
    GLASS_CLASSES.filter((name) => document.body.classList.contains(name));

  beforeEach(() => {
    TestBed.configureTestingModule({});
    originalEa = (window as unknown as { ea?: unknown }).ea;
  });
  afterEach(() => {
    document.body.classList.remove(...GLASS_CLASSES);
    (window as unknown as { ea?: unknown }).ea = originalEa;
  });

  it('sets the body classes synchronously and keeps them current', () => {
    const service = createHarness('bitmap', null);
    TestBed.runInInjectionContext(() => service._initGlass());
    expect(bodyGlassClasses()).toEqual(['st-glass', 'st-glass-bitmap']);
    service._appearanceService.backdrop.set('solid');
    TestBed.tick();
    expect(bodyGlassClasses()).toEqual(['st-solid']);
  });

  it('marks acrylic so the content sheet stays opaque', () => {
    const service = createHarness('native', 'acrylic');
    (window as unknown as { ea: unknown }).ea = { setNativeGlass: () => undefined };
    TestBed.runInInjectionContext(() => service._initGlass());
    expect(bodyGlassClasses()).toEqual([
      'st-glass',
      'st-glass-native',
      'st-glass-acrylic',
    ]);
  });

  it('reports the effective state to the desktop window', () => {
    const sent: NativeGlassState[] = [];
    (window as unknown as { ea: unknown }).ea = {
      setNativeGlass: (state: NativeGlassState) => sent.push(state),
    };
    const service = createHarness('native', 'vibrancy');
    TestBed.runInInjectionContext(() => service._initGlass());
    TestBed.tick();
    expect(sent.at(-1)).toEqual({
      isEnabled: true,
      themeSource: 'dark',
      solidColor: '#131314',
    });
    service._appearanceService.backdrop.set('solid');
    service.darkMode.set('system');
    TestBed.tick();
    expect(sent.at(-1)).toEqual({
      isEnabled: false,
      themeSource: 'system',
      solidColor: '#131314',
    });
  });

  it('sends nothing outside the desktop app', () => {
    const setNativeGlass = jasmine.createSpy('setNativeGlass');
    (window as unknown as { ea: unknown }).ea = { setNativeGlass };
    const service = createHarness('bitmap', null);
    TestBed.runInInjectionContext(() => service._initGlass());
    TestBed.tick();
    expect(setNativeGlass).not.toHaveBeenCalled();
  });
});

describe('GlobalThemeService.registerSvgIconFromContent()', () => {
  interface IconRegistrationHarness {
    registerSvgIconFromContent(iconName: string, svgContent: string): void;
    _registeredPluginIcons: Set<string>;
    _matIconRegistry: { addSvgIconLiteral: jasmine.Spy };
    _domSanitizer: { bypassSecurityTrustHtml: (value: string) => string };
  }

  let harness: IconRegistrationHarness;

  beforeEach(() => {
    harness = Object.create(GlobalThemeService.prototype) as IconRegistrationHarness;
    harness._registeredPluginIcons = new Set<string>();
    harness._matIconRegistry = {
      addSvgIconLiteral: jasmine.createSpy('addSvgIconLiteral'),
    };
    harness._domSanitizer = { bypassSecurityTrustHtml: (value: string) => value };
  });

  /** MatIconRegistry parses the registered literal with `div.innerHTML`. */
  const renderRegisteredLiteral = (): HTMLDivElement => {
    const div = document.createElement('div');
    div.innerHTML = harness._matIconRegistry.addSvgIconLiteral.calls.mostRecent()
      .args[1] as string;
    return div;
  };

  it('registers a benign plugin icon', () => {
    harness.registerSvgIconFromContent(
      'plugin-a-icon',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 2"></path></svg>',
    );

    expect(harness._matIconRegistry.addSvgIconLiteral).toHaveBeenCalledTimes(1);
    expect(renderRegisteredLiteral().querySelector('path')?.getAttribute('d')).toBe(
      'M1 2',
    );
    expect(harness._registeredPluginIcons.has('plugin-a-icon')).toBe(true);
  });

  it('does not register content that is not an SVG', () => {
    harness.registerSvgIconFromContent('plugin-b-icon', '<div>nope</div>');

    expect(harness._matIconRegistry.addSvgIconLiteral).not.toHaveBeenCalled();
    expect(harness._registeredPluginIcons.has('plugin-b-icon')).toBe(false);
  });

  it('registers no live markup for a plugin icon that smuggles CDATA', () => {
    harness.registerSvgIconFromContent(
      'plugin-c-icon',
      '<svg xmlns="http://www.w3.org/2000/svg"><desc><![CDATA[><img src=x onerror="window.alert(1)">]]></desc><circle r="4"></circle></svg>',
    );

    expect(harness._matIconRegistry.addSvgIconLiteral).toHaveBeenCalledTimes(1);
    const rendered = renderRegisteredLiteral();
    expect(rendered.querySelector('img')).toBeNull();
    expect(rendered.querySelector('[onerror]')).toBeNull();
    expect(rendered.querySelector('circle')?.getAttribute('r')).toBe('4');
  });

  it('does not register an icon whose content is entirely stripped', () => {
    harness.registerSvgIconFromContent(
      'plugin-e-icon',
      '<svg xmlns="http://www.w3.org/2000/svg"><desc><![CDATA[><img src=x onerror="window.alert(1)">]]></desc></svg>',
    );

    // Registering an empty literal would make `hasPluginIcon()` true, so callers would pick
    // this icon name over their own fallback and render nothing.
    expect(harness._matIconRegistry.addSvgIconLiteral).not.toHaveBeenCalled();
    expect(harness._registeredPluginIcons.has('plugin-e-icon')).toBe(false);
  });

  it('strips an event handler from a plugin icon before registering it', () => {
    harness.registerSvgIconFromContent(
      'plugin-d-icon',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="window.alert(1)"><circle r="4"></circle></svg>',
    );

    const rendered = renderRegisteredLiteral();
    expect(rendered.querySelector('svg')?.getAttribute('onload')).toBeNull();
    expect(rendered.querySelector('circle')?.getAttribute('r')).toBe('4');
  });
});
