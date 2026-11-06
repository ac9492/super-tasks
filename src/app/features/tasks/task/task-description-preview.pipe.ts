import { Pipe, PipeTransform } from '@angular/core';

// A list, heading, quote or checkbox marker at the start of a line.
const LEADING_MARKDOWN = /^\s*(?:[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|#{1,6}\s+|>\s+)?/;

/**
 * The first line of a description with its markdown marker removed, for the
 * single truncated line on the task row. Pure, so a row computes it once per
 * value rather than per change-detection pass.
 */
@Pipe({ name: 'taskDescriptionPreview' })
export class TaskDescriptionPreviewPipe implements PipeTransform {
  transform(notes: string | null | undefined): string {
    if (!notes) return '';
    for (const line of notes.split('\n')) {
      const text = line.replace(LEADING_MARKDOWN, '').trim();
      if (text) return text;
    }
    return '';
  }
}
