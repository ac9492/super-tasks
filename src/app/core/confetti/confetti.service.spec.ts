import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfettiService } from './confetti.service';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- grandfathered layer-boundary debt
import { GlobalConfigService } from '../../features/config/global-config.service';
import { MiscConfig } from '../../features/config/global-config.model';

describe('ConfettiService', () => {
  let service: ConfettiService;
  let misc: WritableSignal<Partial<MiscConfig>>;

  beforeEach(() => {
    misc = signal<Partial<MiscConfig>>({
      isDisableCelebration: false,
      isDisableAnimations: false,
    });
    spyOn(window, 'matchMedia').and.returnValue({
      matches: false,
    } as MediaQueryList);
    TestBed.configureTestingModule({
      providers: [ConfettiService, { provide: GlobalConfigService, useValue: { misc } }],
    });
    service = TestBed.inject(ConfettiService);
  });

  it('should fire when celebrations and animations are on', async () => {
    const instance = await service.createConfettiOnCanvas(
      document.createElement('canvas'),
      { particleCount: 1 },
    );
    expect(instance).toBeDefined();
    instance?.reset();
  });

  it('should not fire when "Disable celebration" is on', async () => {
    misc.set({ isDisableCelebration: true, isDisableAnimations: false });
    const instance = await service.createConfettiOnCanvas(
      document.createElement('canvas'),
      { particleCount: 1 },
    );
    expect(instance).toBeUndefined();
  });

  it('should not fire when animations are disabled', async () => {
    misc.set({ isDisableCelebration: false, isDisableAnimations: true });
    const instance = await service.createConfettiOnCanvas(
      document.createElement('canvas'),
      { particleCount: 1 },
    );
    expect(instance).toBeUndefined();
  });
});
