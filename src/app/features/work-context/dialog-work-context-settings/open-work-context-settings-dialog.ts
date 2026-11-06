import type { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { dialogSize } from '../../../ui/dialog-size.util';
import type {
  DialogWorkContextSettingsComponent,
  WorkContextSettingsDialogData,
} from './dialog-work-context-settings.component';

export const WORK_CONTEXT_SETTINGS_DIALOG_CONFIG: MatDialogConfig<WorkContextSettingsDialogData> =
  {
    restoreFocus: true,
    backdropClass: 'cdk-overlay-transparent-backdrop',
    ...dialogSize('m'),
  };

export const openWorkContextSettingsDialog = async (
  matDialog: MatDialog,
  data: WorkContextSettingsDialogData,
): Promise<MatDialogRef<DialogWorkContextSettingsComponent>> => {
  const { DialogWorkContextSettingsComponent } =
    await import('./dialog-work-context-settings.component');

  return matDialog.open(DialogWorkContextSettingsComponent, {
    ...WORK_CONTEXT_SETTINGS_DIALOG_CONFIG,
    data,
  });
};
