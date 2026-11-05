import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingHelpComponent } from '../setting-help/setting-help.component';

@Component({
  selector: 'formly-setting',
  imports: [SettingHelpComponent, TranslatePipe],
  template: `
    <div
      class="setting-row"
      [attr.data-setting-key]="field.key"
    >
      <div class="setting-control"><ng-container #fieldComponent /></div>
      @if (props['helpKey']) {
        <setting-help
          [label]="props.label || ''"
          [text]="props['helpKey'] | translate: props['descriptionTranslateParams']"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormlySettingWrapperComponent extends FieldWrapper {}
