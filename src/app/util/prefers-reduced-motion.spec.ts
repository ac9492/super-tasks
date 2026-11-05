import { signal } from '@angular/core';
import { isAnimationDisabled } from './prefers-reduced-motion';

describe('isAnimationDisabled', () => {
  it('should be false when neither the setting nor the OS asks for it', () => {
    expect(isAnimationDisabled({ isDisableAnimations: false }, signal(false))).toBe(
      false,
    );
    expect(isAnimationDisabled(undefined, signal(false))).toBe(false);
  });

  it('should follow the in-app "Disable all animations" setting', () => {
    expect(isAnimationDisabled({ isDisableAnimations: true }, signal(false))).toBe(true);
  });

  it('should follow the OS "reduce motion" setting with the in-app setting off', () => {
    expect(isAnimationDisabled({ isDisableAnimations: false }, signal(true))).toBe(true);
    expect(isAnimationDisabled(null, signal(true))).toBe(true);
  });
});
