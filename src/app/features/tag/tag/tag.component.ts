import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  Signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { isSingleEmoji } from '../../../util/extract-first-emoji';
import { resolveTagIcon } from '../resolve-tag-icon.util';

export interface TagComponentTag {
  title: string;
  id?: string;
  icon?: string;
  svgIcon?: string;
  color?: string;
  theme?: {
    primary: string;
  };

  [key: string]: any;
}

@Component({
  selector: 'tag',
  templateUrl: './tag.component.html',
  styleUrls: ['./tag.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
  standalone: true,
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Angular host binding syntax
    '[attr.role]': "isHideTitle() ? 'img' : null",
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Angular host binding syntax
    '[attr.aria-label]': 'isHideTitle() ? tag().title : null',
  },
})
export class TagComponent {
  tag = input.required<TagComponentTag>();
  isHideTitle = input(false);
  readonly displayIcon = computed(() => resolveTagIcon(this.tag()));

  // @HostBinding('style.background')
  color: Signal<string | undefined> = computed(() => {
    const currentTag = this.tag();
    return currentTag.color || (currentTag.theme && currentTag.theme.primary);
  });

  isEmojiIcon: Signal<boolean> = computed(() => {
    const icon = this.displayIcon();
    return icon ? isSingleEmoji(icon) : false;
  });
}
