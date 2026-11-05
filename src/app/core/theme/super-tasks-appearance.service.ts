import { Injectable, signal } from '@angular/core';
import { lsSetItem, readBoolLS } from '../../util/ls-util';

export const SUPER_TASKS_GLASS_KEY = 'superTasksGlassEnabled';

/** Device-local presentation only: never dispatched to the synced store. */
@Injectable({ providedIn: 'root' })
export class SuperTasksAppearanceService {
  private readonly _glassEnabled = signal(readBoolLS(SUPER_TASKS_GLASS_KEY, true));
  readonly glassEnabled = this._glassEnabled.asReadonly();

  setGlass(enabled: boolean): void {
    lsSetItem(SUPER_TASKS_GLASS_KEY, enabled);
    this._glassEnabled.set(enabled);
  }
}
