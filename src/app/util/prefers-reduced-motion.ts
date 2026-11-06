import { Signal, signal } from '@angular/core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const createPrefersReducedMotion = (): Signal<boolean> => {
  const mediaQueryList =
    typeof window !== 'undefined' ? window.matchMedia?.(REDUCED_MOTION_QUERY) : undefined;
  const prefersReducedMotion = signal(!!mediaQueryList?.matches);
  mediaQueryList?.addEventListener?.('change', (ev) =>
    prefersReducedMotion.set(ev.matches),
  );
  return prefersReducedMotion.asReadonly();
};

/** The OS "reduce motion" setting, kept current while the app runs. */
export const PREFERS_REDUCED_MOTION: Signal<boolean> = createPrefersReducedMotion();

/**
 * Whether app animations are off: the in-app "Disable all animations" setting
 * or the OS "reduce motion" setting. Every switch for Angular, Material and CSS
 * animations reads this, so the two settings behave the same. Reactive when
 * read in a signal context.
 */
export const isAnimationDisabled = (
  misc: { isDisableAnimations?: boolean } | null | undefined,
  prefersReducedMotion: Signal<boolean> = PREFERS_REDUCED_MOTION,
): boolean => !!misc?.isDisableAnimations || prefersReducedMotion();
