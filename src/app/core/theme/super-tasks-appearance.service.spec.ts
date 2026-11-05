import {
  SUPER_TASKS_GLASS_KEY,
  SuperTasksAppearanceService,
} from './super-tasks-appearance.service';

describe('SuperTasksAppearanceService', () => {
  let original: string | null;
  beforeEach(() => {
    original = localStorage.getItem(SUPER_TASKS_GLASS_KEY);
    localStorage.removeItem(SUPER_TASKS_GLASS_KEY);
  });
  afterEach(() => {
    if (original === null) localStorage.removeItem(SUPER_TASKS_GLASS_KEY);
    else localStorage.setItem(SUPER_TASKS_GLASS_KEY, original);
  });
  it('defaults to glass without writing a preference', () => {
    expect(new SuperTasksAppearanceService().glassEnabled()).toBeTrue();
    expect(localStorage.getItem(SUPER_TASKS_GLASS_KEY)).toBeNull();
  });
  it('restores solid appearance on a fresh service', () => {
    const service = new SuperTasksAppearanceService();
    service.setGlass(false);
    expect(service.glassEnabled()).toBeFalse();
    expect(new SuperTasksAppearanceService().glassEnabled()).toBeFalse();
  });
  it('can re-enable glass across restarts', () => {
    const service = new SuperTasksAppearanceService();
    service.setGlass(false);
    service.setGlass(true);
    expect(new SuperTasksAppearanceService().glassEnabled()).toBeTrue();
  });
});
