import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { SearchPageComponent } from '../search-page.component';

/** The search page in a popup: Escape or picking a result closes it. */
@Component({
  selector: 'dialog-search',
  imports: [SearchPageComponent],
  template: `
    <search-page
      [isPopup]="true"
      (itemChosen)="close()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogSearchComponent {
  private readonly _dialogRef = inject(MatDialogRef<DialogSearchComponent>);

  close(): void {
    this._dialogRef.close();
  }
}
