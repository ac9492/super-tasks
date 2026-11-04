import { inject, Pipe, PipeTransform } from '@angular/core';
import { dateStrToUtcDate } from '../../util/date-str-to-utc-date';
import { TranslateService } from '@ngx-translate/core';
import { T } from 'src/app/t.const';
import { isDBDateStr } from '../../util/get-db-date-str';
import {
  formatTaskDateLabel,
  TaskDateDisplayOptions,
} from '../../core/date-time-format/task-date-display';
import { DateService } from '../../core/date/date.service';
import { DateTimeFormatService } from '../../core/date-time-format/date-time-format.service';

@Pipe({
  name: 'localDateStr',
  standalone: true,
})
export class LocalDateStrPipe implements PipeTransform {
  private _dateTimeFormatService = inject(DateTimeFormatService);
  private translateService = inject(TranslateService);
  private _dateService = inject(DateService);

  transform(
    value: string | null | undefined,
    todayStr: string = this._dateService.todayStr(),
    options: TaskDateDisplayOptions = this._dateTimeFormatService.taskDateDisplay(),
  ): string | null {
    if (typeof value !== 'string' || !isDBDateStr(value)) {
      return null;
    }
    if (value === todayStr) {
      const translation = this.translateService.instant(T.G.TODAY_TAG_TITLE);
      if (translation.length <= 7) {
        return translation;
      }
    }

    const d = dateStrToUtcDate(value);
    return formatTaskDateLabel(d, todayStr, options);
  }
}
