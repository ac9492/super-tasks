import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../t.const';

/** Shared help affordance for settings rows and custom controls. */
@Component({
  selector: 'setting-help',
  imports: [MatTooltip, MatIcon, TranslatePipe],
  template: `
    <button
      type="button"
      class="setting-help-button"
      [matTooltip]="plainText()"
      #tooltip="matTooltip"
      matTooltipPosition="above"
      [matTooltipHideDelay]="120"
      (click)="showHelp(tooltip, $event)"
      [attr.aria-label]="(T.PS.REDESIGN.HELP | translate) + ' — ' + label()"
    >
      <mat-icon aria-hidden="true">help_outline</mat-icon>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingHelpComponent {
  readonly T = T;
  readonly text = input.required<string>();
  readonly label = input.required<string>();
  showHelp(tooltip: MatTooltip, event: MouseEvent): void {
    event.stopPropagation();
    tooltip.show();
    if (event instanceof PointerEvent && event.pointerType === 'touch') {
      tooltip.hide(2500);
    }
  }
  readonly plainText = computed(() =>
    this.text()
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}
