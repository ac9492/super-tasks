import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { expandFadeAnimation } from '../animations/expand.ani';
import { MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../t.const';

@Component({
  selector: 'help-section',
  templateUrl: './help-section.component.html',
  styleUrls: ['./help-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation],
  imports: [MatMiniFabButton, MatIcon, TranslatePipe],
})
export class HelpSectionComponent {
  readonly T = T;

  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() isShowHelp: boolean = false;
}
