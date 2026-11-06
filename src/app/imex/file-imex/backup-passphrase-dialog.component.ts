import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../t.const';
import { useDialogSize } from '../../ui/dialog-size.util';

@Component({
  selector: 'backup-passphrase-dialog',
  imports: [
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (creating ? T.PS.REFINEMENT.ENCRYPT : T.PS.REFINEMENT.UNLOCK) | translate }}
    </h2>
    <form (ngSubmit)="submit()">
      <mat-dialog-content>
        <p>
          {{
            (creating ? T.PS.REFINEMENT.PASSWORD_HELP : T.PS.REFINEMENT.UNLOCK_HELP)
              | translate
          }}
        </p>
        <mat-form-field
          ><mat-label>{{ T.PS.REFINEMENT.PASSWORD | translate }}</mat-label>
          <input
            matInput
            type="password"
            name="passphrase"
            [(ngModel)]="passphrase"
            [attr.autocomplete]="creating ? 'new-password' : 'current-password'"
          />
        </mat-form-field>
        @if (creating) {
          <mat-form-field
            ><mat-label>{{ T.PS.REFINEMENT.CONFIRM_PASSWORD | translate }}</mat-label>
            <input
              matInput
              type="password"
              name="confirm"
              [(ngModel)]="confirm"
              autocomplete="new-password"
            />
          </mat-form-field>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button
          mat-button
          type="button"
          mat-dialog-close
        >
          {{ T.PS.REFINEMENT.CANCEL | translate }}
        </button>
        <button
          mat-flat-button
          type="submit"
          [disabled]="
            !passphrase ||
            (creating && (passphrase.length < 12 || passphrase !== confirm))
          "
        >
          {{ T.PS.REFINEMENT.CONTINUE | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupPassphraseDialogComponent {
  private readonly _size = useDialogSize('s');
  readonly T = T;
  readonly creating = inject<boolean>(MAT_DIALOG_DATA);
  private readonly _dialog = inject(
    MatDialogRef<BackupPassphraseDialogComponent, string>,
  );
  passphrase = '';
  confirm = '';
  submit(): void {
    if (
      !this.passphrase ||
      (this.creating && (this.passphrase.length < 12 || this.passphrase !== this.confirm))
    )
      return;
    this._dialog.close(this.passphrase);
    this.passphrase = this.confirm = '';
  }
}
