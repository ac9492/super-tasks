import { MatDialogConfig } from '@angular/material/dialog';

/**
 * Dialog widths of the design language (docs/styling-guide.md § Dialogs):
 * - `s` 440px: confirm, prompt, estimate, schedule, deadline, reminder
 * - `m` 560px: entity forms (project, tag, habit, repeat, sync, import)
 * - `l` 720px: reference content (keyboard help, logs, conflict details)
 *
 * The `.dialog-s|m|l` panel classes in `_overwrite-material.scss` read the
 * `--dialog-w-*` tokens and never exceed the viewport minus its gutters. A
 * dialog opened without a size is at least `s` wide.
 */
export type DialogSize = 's' | 'm' | 'l';

/** Spread into `MatDialog.open()`: `open(Cmp, { ...dialogSize('m'), data })`. */
export const dialogSize = (size: DialogSize): Pick<MatDialogConfig, 'panelClass'> => ({
  panelClass: `dialog-${size}`,
});
