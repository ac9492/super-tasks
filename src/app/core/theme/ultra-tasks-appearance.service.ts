import { Injectable, signal } from '@angular/core';
import { lsSetItem, readBoolLS } from '../../util/ls-util';

// Keep the saved preference from builds released under the former product name.
export const ULTRA_TASKS_GLASS_KEY = 'superTasksGlassEnabled';

/** Device-local presentation only: never dispatched to the synced store. */
@Injectable({ providedIn: 'root' })
export class UltraTasksAppearanceService {
  private readonly _glassEnabled = signal(readBoolLS(ULTRA_TASKS_GLASS_KEY, true));
  readonly glassEnabled = this._glassEnabled.asReadonly();

  setGlass(enabled: boolean): void {
    lsSetItem(ULTRA_TASKS_GLASS_KEY, enabled);
    this._glassEnabled.set(enabled);
  }
}
