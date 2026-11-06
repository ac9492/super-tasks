import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ShareService } from '../share.service';
import { ShareDialogOptions, ShareResult, ShareTarget } from '../share.model';
import { ShareFormatter } from '../share-formatter';
import { T } from '../../../t.const';
import { TranslatePipe } from '@ngx-translate/core';
import { useDialogSize } from '../../../ui/dialog-size.util';

interface ShareTargetButton {
  target: ShareTarget;
  label: string;
  icon?: string;
  color?: string;
}

@Component({
  selector: 'dialog-share',
  templateUrl: './dialog-share.component.html',
  styleUrls: ['./dialog-share.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    TranslatePipe,
  ],
})
export class DialogShareComponent {
  private readonly _dialogSize = useDialogSize('m');
  private _dialogRef = inject(MatDialogRef<DialogShareComponent>);
  private _shareService = inject(ShareService);

  readonly data = inject<ShareDialogOptions>(MAT_DIALOG_DATA);
  readonly T = T;

  mastodonInstance = this.data.mastodonInstance || 'mastodon.social';

  readonly shareTargets: ShareTargetButton[] = [
    { target: 'twitter', label: 'Twitter / X' },
    { target: 'linkedin', label: 'LinkedIn' },
    { target: 'reddit', label: 'Reddit' },
    { target: 'facebook', label: 'Facebook' },
    { target: 'whatsapp', label: 'WhatsApp' },
    { target: 'telegram', label: 'Telegram' },
    { target: 'email', label: 'Email', icon: 'email' },
    { target: 'mastodon', label: 'Mastodon' },
  ];

  async shareToTarget(target: ShareTarget): Promise<void> {
    let payload = this.data.payload;

    // Optimize for Twitter
    if (target === 'twitter') {
      payload = ShareFormatter.optimizeForTwitter(payload);
    }

    const result: ShareResult = await this._shareService.shareToTarget(payload, target);

    if (result.success) {
      this._dialogRef.close(result);
    }
  }

  async shareNative(): Promise<void> {
    const result: ShareResult = await this._shareService.tryNativeShare(
      this.data.payload,
    );

    if (result.success) {
      this._dialogRef.close(result);
    }
  }

  async copyText(): Promise<void> {
    const text = this._shareService.formatTextForClipboard(this.data.payload);
    const result: ShareResult = await this._shareService.copyToClipboard(text, 'Text');

    if (result.success) {
      this._dialogRef.close(result);
    }
  }

  close(): void {
    this._dialogRef.close();
  }
}
