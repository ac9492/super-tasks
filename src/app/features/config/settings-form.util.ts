import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from '../../t.const';

// Presentation metadata only. Grouping keeps each field's existing model key and save path.
const PRIMARY_FIELDS: Record<string, readonly string[]> = {
  localization: ['lng'],
  misc: ['defaultStartPage'],
  tasks: ['defaultProjectId', 'isConfirmBeforeDelete'],
  appFeatures: ['isPlannerEnabled', 'isBoardsEnabled', 'isProjectNotesEnabled'],
  timeTracking: ['defaultEstimate', 'defaultEstimateSubTasks'],
  idle: ['isEnableIdleTimeTracking', 'minIdleTime'],
  reminder: ['disableReminders', 'defaultTaskRemindOption'],
  takeABreak: ['isTakeABreakEnabled', 'takeABreakMinWorkingTime'],
  keyboard: [],
  taskWidget: ['isEnabled'],
};

const containsKey = (fields: FormlyFieldConfig[], key: string): boolean =>
  fields.some(
    (field) => String(field.key) === key || containsKey(field.fieldGroup ?? [], key),
  );

export const prepareSettingsFields = (
  fields: FormlyFieldConfig[],
  section: string,
  expandedField: string,
): FormlyFieldConfig[] => {
  const helpKeys: Readonly<Record<string, string>> = T.PS.OPTION_HELP;
  const decorate = (items: FormlyFieldConfig[]): FormlyFieldConfig[] =>
    items.map((field) => {
      const props = field.props ?? field.templateOptions ?? {};
      const helpKey =
        field.type === 'keyboard'
          ? T.PS.REDESIGN.KEYBOARD_HELP
          : (helpKeys[section + '_' + field.key] ??
            helpKeys[String(field.key)] ??
            props.description);
      return {
        ...field,
        props: {
          ...props,
          helpKey,
          settingsExpanded:
            !!expandedField && containsKey(field.fieldGroup ?? [], expandedField),
        },
        ...(field.fieldGroup ? { fieldGroup: decorate(field.fieldGroup) } : {}),
      };
    });
  const decorated = decorate(fields);
  const primary = PRIMARY_FIELDS[section];
  if (!primary) return decorated;
  const visible = decorated.filter((field) => primary.includes(String(field.key)));
  const more = decorated.filter((field) => !primary.includes(String(field.key)));
  return [
    ...visible,
    {
      type: 'collapsible',
      props: {
        label: T.PS.REDESIGN.MORE,
        settingsStateKey: section,
        settingsExpanded: !!expandedField && containsKey(more, expandedField),
      },
      fieldGroup: more,
    },
  ];
};
