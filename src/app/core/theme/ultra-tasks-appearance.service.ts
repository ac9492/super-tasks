import { computed, Injectable, Signal, signal } from '@angular/core';
import { lsSetItem, readBoolLS } from '../../util/ls-util';
import { NativeGlassMaterial } from '../../../../electron/shared-with-frontend/native-glass.model';

// Keep the saved preference from builds released under the former product name.
export const ULTRA_TASKS_GLASS_KEY = 'superTasksGlassEnabled';

/**
 * What sits behind the glass surfaces:
 * - `solid`: Glass off, or the OS asks for less transparency or forced colors.
 * - `native`: the desktop app's window shows the OS material (macOS vibrancy,
 *   Windows 11 acrylic), which blurs the desktop behind it.
 * - `bitmap`: everywhere else, a pre-rendered blurred background image or
 *   palette gradient drawn once by `GlassBackdropComponent`.
 */
export type GlassBackdrop = 'solid' | 'native' | 'bitmap';

export const resolveGlassBackdrop = ({
  isGlassEnabled,
  isReducedTransparency,
  isForcedColors,
  nativeMaterial,
}: {
  isGlassEnabled: boolean;
  isReducedTransparency: boolean;
  isForcedColors: boolean;
  nativeMaterial: NativeGlassMaterial | null;
}): GlassBackdrop => {
  if (!isGlassEnabled || isReducedTransparency || isForcedColors) {
    return 'solid';
  }
  return nativeMaterial ? 'native' : 'bitmap';
};

const mediaQuerySignal = (query: string): Signal<boolean> => {
  const mediaQueryList =
    typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined;
  const matches = signal(!!mediaQueryList?.matches);
  // Root service: the listener lives as long as the app.
  mediaQueryList?.addEventListener?.('change', (ev) => matches.set(ev.matches));
  return matches.asReadonly();
};

/** Device-local presentation only: never dispatched to the synced store. */
@Injectable({ providedIn: 'root' })
export class UltraTasksAppearanceService {
  private readonly _glassEnabled = signal(readBoolLS(ULTRA_TASKS_GLASS_KEY, true));
  readonly glassEnabled = this._glassEnabled.asReadonly();

  /** Fixed for the window's lifetime; null outside the desktop app. */
  readonly nativeMaterial: NativeGlassMaterial | null =
    (typeof window !== 'undefined' && window.ea?.getNativeGlassMaterial?.()) || null;

  private readonly _isReducedTransparency = mediaQuerySignal(
    '(prefers-reduced-transparency: reduce)',
  );
  private readonly _isForcedColors = mediaQuerySignal('(forced-colors: active)');

  readonly backdrop = computed<GlassBackdrop>(() =>
    resolveGlassBackdrop({
      isGlassEnabled: this._glassEnabled(),
      isReducedTransparency: this._isReducedTransparency(),
      isForcedColors: this._isForcedColors(),
      nativeMaterial: this.nativeMaterial,
    }),
  );

  setGlass(enabled: boolean): void {
    lsSetItem(ULTRA_TASKS_GLASS_KEY, enabled);
    this._glassEnabled.set(enabled);
  }
}
