import { inject, Pipe, PipeTransform } from '@angular/core';
import { DateService } from '../../core/date/date.service';
import { ShortTimeHtmlPipe } from './short-time-html.pipe';
import {
  formatTaskDateLabel,
  TaskDateDisplayOptions,
} from '../../core/date-time-format/task-date-display';
import { DateTimeFormatService } from '../../core/date-time-format/date-time-format.service';

@Pipe({ name: 'shortPlannedAt', standalone: true })
export class ShortPlannedAtPipe implements PipeTransform {
  private _shortTimeHtmlPipe = inject(ShortTimeHtmlPipe);
  private _dateTimeFormatService = inject(DateTimeFormatService);
  private _dateService = inject(DateService);

  transform(
    value?: number | null,
    timeOnly?: boolean,
    todayStr: string = this._dateService.todayStr(),
    options: TaskDateDisplayOptions = this._dateTimeFormatService.taskDateDisplay(),
  ): string | null {
    if (typeof value !== 'number') {
      return null;
    }

    const logicalDate = new Date(value - this._dateService.getStartOfNextDayDiffMs());
    if (this._dateService.todayStr(logicalDate) === todayStr || timeOnly) {
      return this._shortTimeHtmlPipe.transform(value);
    } else {
      return formatTaskDateLabel(logicalDate, todayStr, options);
    }
  }
}
