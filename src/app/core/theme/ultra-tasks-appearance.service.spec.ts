import {
  resolveGlassBackdrop,
  ULTRA_TASKS_GLASS_KEY,
  UltraTasksAppearanceService,
} from './ultra-tasks-appearance.service';

describe('UltraTasksAppearanceService', () => {
  let original: string | null;
  beforeEach(() => {
    original = localStorage.getItem(ULTRA_TASKS_GLASS_KEY);
    localStorage.removeItem(ULTRA_TASKS_GLASS_KEY);
  });
  afterEach(() => {
    if (original === null) localStorage.removeItem(ULTRA_TASKS_GLASS_KEY);
    else localStorage.setItem(ULTRA_TASKS_GLASS_KEY, original);
  });
  it('defaults to glass without writing a preference', () => {
    expect(new UltraTasksAppearanceService().glassEnabled()).toBeTrue();
    expect(localStorage.getItem(ULTRA_TASKS_GLASS_KEY)).toBeNull();
  });
  it('restores solid appearance on a fresh service', () => {
    const service = new UltraTasksAppearanceService();
    service.setGlass(false);
    expect(service.glassEnabled()).toBeFalse();
    expect(service.backdrop()).toBe('solid');
    expect(new UltraTasksAppearanceService().glassEnabled()).toBeFalse();
  });
  it('can re-enable glass across restarts', () => {
    const service = new UltraTasksAppearanceService();
    service.setGlass(false);
    service.setGlass(true);
    expect(new UltraTasksAppearanceService().glassEnabled()).toBeTrue();
  });

  describe('with a stubbed platform', () => {
    let originalEa: unknown;
    let media: Record<string, boolean>;
    beforeEach(() => {
      originalEa = (window as unknown as { ea?: unknown }).ea;
      media = {};
      spyOn(window, 'matchMedia').and.callFake(
        (query: string) =>
          ({
            matches: !!media[query],
            addEventListener: () => undefined,
          }) as unknown as MediaQueryList,
      );
    });
    afterEach(() => {
      (window as unknown as { ea?: unknown }).ea = originalEa;
    });

    it('draws its own backdrop outside the desktop app', () => {
      (window as unknown as { ea?: unknown }).ea = undefined;
      const service = new UltraTasksAppearanceService();
      expect(service.nativeMaterial).toBeNull();
      expect(service.backdrop()).toBe('bitmap');
    });

    it('uses the window material the desktop app reports', () => {
      (window as unknown as { ea: unknown }).ea = {
        getNativeGlassMaterial: () => 'vibrancy',
      };
      const service = new UltraTasksAppearanceService();
      expect(service.nativeMaterial).toBe('vibrancy');
      expect(service.backdrop()).toBe('native');
    });

    it('is solid when the OS asks for less transparency or forced colors', () => {
      (window as unknown as { ea?: unknown }).ea = undefined;
      media['(prefers-reduced-transparency: reduce)'] = true;
      expect(new UltraTasksAppearanceService().backdrop()).toBe('solid');
      media['(prefers-reduced-transparency: reduce)'] = false;
      media['(forced-colors: active)'] = true;
      expect(new UltraTasksAppearanceService().backdrop()).toBe('solid');
    });
  });
});

describe('resolveGlassBackdrop()', () => {
  const base = {
    isGlassEnabled: true,
    isReducedTransparency: false,
    isForcedColors: false,
    nativeMaterial: null,
  };
  it('prefers the OS material, else the drawn backdrop', () => {
    expect(resolveGlassBackdrop(base)).toBe('bitmap');
    expect(resolveGlassBackdrop({ ...base, nativeMaterial: 'acrylic' })).toBe('native');
  });
  it('lets the Solid setting and accessibility preferences win', () => {
    for (const override of [
      { isGlassEnabled: false },
      { isReducedTransparency: true },
      { isForcedColors: true },
    ]) {
      expect(
        resolveGlassBackdrop({ ...base, nativeMaterial: 'vibrancy', ...override }),
      ).toBe('solid');
    }
  });
});
