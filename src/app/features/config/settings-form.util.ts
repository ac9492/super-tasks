import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from '../../t.const';
import { HelperClasses } from '../../app.constants';

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

/** Set on a keyless field (e.g. a section's intro text) to keep it out of "More options". */
export const SETTINGS_INTRO_PROP = 'isSettingsIntro';

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
      // Only a dedicated help entry earns a "?": a description is already shown
      // with its control, and the keyboard section's own help covers every
      // shortcut row.
      const helpKey: string | undefined =
        field.key === undefined
          ? undefined
          : (helpKeys[section + '_' + field.key] ?? helpKeys[String(field.key)]);
      return {
        ...field,
        props: {
          ...props,
          ...(helpKey ? { helpKey } : {}),
          settingsExpanded:
            !!expandedField && containsKey(field.fieldGroup ?? [], expandedField),
        },
        ...(field.fieldGroup ? { fieldGroup: decorate(field.fieldGroup) } : {}),
      };
    });
  const decorated = decorate(fields);
  const primary = PRIMARY_FIELDS[section];
  if (!primary) return decorated;
  const isUpFront = (field: FormlyFieldConfig): boolean =>
    primary.includes(String(field.key)) || !!field.props?.[SETTINGS_INTRO_PROP];
  const visible = decorated.filter(isUpFront);
  const more = decorated.filter((field) => !isUpFront(field));
  // Hidden where all of its content is (e.g. idle options in the web build
  // without the browser extension), instead of expanding to nothing
  const isAllNoAdvancedFeatures =
    more.length > 0 &&
    more.every((field) =>
      (field.className ?? '').includes(HelperClasses.isHideForNoAdvancedFeatures),
    );
  return [
    ...visible,
    {
      type: 'collapsible',
      ...(isAllNoAdvancedFeatures
        ? { className: HelperClasses.isHideForNoAdvancedFeatures }
        : {}),
      props: {
        label: T.PS.REDESIGN.MORE,
        settingsStateKey: section,
        settingsExpanded: !!expandedField && containsKey(more, expandedField),
      },
      fieldGroup: more,
    },
  ];
};
