import { Pipe, PipeTransform } from '@angular/core';
import { resolveTagIcon } from './resolve-tag-icon.util';

@Pipe({ name: 'tagIcon' })
export class TagIconPipe implements PipeTransform {
  transform(tag: { id?: string; icon?: string | null }): string | null | undefined {
    return resolveTagIcon(tag);
  }
}
