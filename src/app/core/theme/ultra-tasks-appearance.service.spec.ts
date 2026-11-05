import {
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
    expect(new UltraTasksAppearanceService().glassEnabled()).toBeFalse();
  });
  it('can re-enable glass across restarts', () => {
    const service = new UltraTasksAppearanceService();
    service.setGlass(false);
    service.setGlass(true);
    expect(new UltraTasksAppearanceService().glassEnabled()).toBeTrue();
  });
});
