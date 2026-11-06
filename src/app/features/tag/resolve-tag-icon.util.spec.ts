import { resolveTagIcon } from './resolve-tag-icon.util';

describe('resolveTagIcon', () => {
  it('presents the legacy built-in defaults without mutating stored tags', () => {
    const tags = [
      { id: 'TODAY', icon: 'wb_sunny' },
      { id: 'EM_URGENT', icon: 'emergency' },
      { id: 'EM_IMPORTANT', icon: 'priority_high' },
    ];
    tags.forEach(Object.freeze);

    expect(tags.map(resolveTagIcon)).toEqual(['today', 'priority_high', 'star']);
    expect(tags.map((tag) => tag.icon)).toEqual([
      'wb_sunny',
      'emergency',
      'priority_high',
    ]);
  });

  it('preserves custom icons on built-in tags and matching icons on other tags', () => {
    expect(resolveTagIcon({ id: 'TODAY', icon: '🌱' })).toBe('🌱');
    expect(resolveTagIcon({ id: 'EM_URGENT', icon: 'flag' })).toBe('flag');
    expect(resolveTagIcon({ id: 'EM_IMPORTANT', icon: null })).toBeNull();
    expect(resolveTagIcon({ id: 'user-tag', icon: 'wb_sunny' })).toBe('wb_sunny');
    expect(resolveTagIcon({ id: 'user-tag', icon: 'emergency' })).toBe('emergency');
    expect(resolveTagIcon({ id: 'user-tag', icon: 'priority_high' })).toBe(
      'priority_high',
    );
  });
});
