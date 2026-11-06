/** Present legacy built-in icons consistently without changing saved user choices. */
export const resolveTagIcon = (tag: {
  id?: string;
  icon?: string | null;
}): string | null | undefined => {
  if (tag.id === 'TODAY' && tag.icon === 'wb_sunny') {
    return 'today';
  }
  if (tag.id === 'EM_URGENT' && tag.icon === 'emergency') {
    return 'priority_high';
  }
  if (tag.id === 'EM_IMPORTANT' && tag.icon === 'priority_high') {
    return 'star';
  }
  return tag.icon;
};
