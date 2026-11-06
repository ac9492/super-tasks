import { Pipe, PipeTransform } from '@angular/core';
import { SimpleCounter } from './simple-counter.model';

const LEGACY_DEFAULT_ICONS: Readonly<Record<string, readonly [string, string]>> = {
  STANDING_DESK_ID: ['directions_walk', 'man'],
  COFFEE_COUNTER: ['free_breakfast', 'coffee'],
  STRETCHING_COUNTER: ['fitness_center', 'accessibility_new'],
};

// Resolve legacy built-in artwork at display time, preserving stored and custom icons.
export const getSimpleCounterIcon = (
  counter: Pick<SimpleCounter, 'id' | 'icon'>,
): string | null => {
  const replacement = LEGACY_DEFAULT_ICONS[counter.id];
  return replacement && counter.icon === replacement[0] ? replacement[1] : counter.icon;
};

@Pipe({ name: 'simpleCounterIcon' })
export class SimpleCounterIconPipe implements PipeTransform {
  transform(counter: Pick<SimpleCounter, 'id' | 'icon'>): string | null {
    return getSimpleCounterIcon(counter);
  }
}
