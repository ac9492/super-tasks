import { MatDialogConfig } from '@angular/material/dialog';

/**
 * Dialog widths of the design language (docs/styling-guide.md § Dialogs):
 * - `s` 440px: confirm, prompt, estimate, schedule, deadline, reminder
 * - `m` 560px: entity forms (project, tag, habit, repeat, sync, import)
 * - `l` 720px: reference content (keyboard help, logs, conflict details)
 * - `window` 1040px: the Settings and Plugins windows
 *
 * The `.dialog-s|m|l|window` panel classes in `_overwrite-material.scss` read
 * the `--dialog-w-*` tokens and never exceed the viewport minus its gutters. A
 * dialog opened without a size is at least `s` wide.
 */
export type DialogSize = 's' | 'm' | 'l' | 'window';

/**
 * Spread into `MatDialog.open()`: `open(Cmp, { ...dialogSize('m'), data })`.
 * Extra panel classes (the Settings window's own) ride along.
 */
export const dialogSize = (
  size: DialogSize,
  ...extraClasses: string[]
): Pick<MatDialogConfig, 'panelClass'> => ({
  panelClass: extraClasses.length
    ? [`dialog-${size}`, ...extraClasses]
    : `dialog-${size}`,
});
