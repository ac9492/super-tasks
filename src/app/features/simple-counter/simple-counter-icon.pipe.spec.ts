import { getSimpleCounterIcon } from './simple-counter-icon.pipe';

describe('getSimpleCounterIcon', () => {
  it('shows the current artwork for persisted built-in defaults without changing them', () => {
    const counters = [
      { id: 'STANDING_DESK_ID', icon: 'directions_walk' },
      { id: 'COFFEE_COUNTER', icon: 'free_breakfast' },
      { id: 'STRETCHING_COUNTER', icon: 'fitness_center' },
    ];
    const original = counters.map((counter) => ({ ...counter }));

    expect(counters.map(getSimpleCounterIcon)).toEqual([
      'man',
      'coffee',
      'accessibility_new',
    ]);
    expect(counters).toEqual(original);
  });

  it('preserves a customized icon on a built-in counter and legacy icons on user counters', () => {
    expect(getSimpleCounterIcon({ id: 'STANDING_DESK_ID', icon: 'coffee' })).toBe(
      'coffee',
    );
    expect(getSimpleCounterIcon({ id: 'custom-counter', icon: 'directions_walk' })).toBe(
      'directions_walk',
    );
    expect(getSimpleCounterIcon({ id: 'STRETCHING_COUNTER', icon: ':custom' })).toBe(
      ':custom',
    );
    expect(getSimpleCounterIcon({ id: 'COFFEE_COUNTER', icon: null })).toBeNull();
  });
});
