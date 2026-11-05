import { FormlyFieldConfig } from '@ngx-formly/core';
import { prepareSettingsFields } from './settings-form.util';
import {
  GLOBAL_GENERAL_FORM_CONFIG,
  GLOBAL_TASKS_FORM_CONFIG,
  GLOBAL_TIME_TRACKING_FORM_CONFIG,
  GLOBAL_PRODUCTIVITY_FORM_CONFIG,
} from './global-config-form-config.const';

const flatten = (fields: FormlyFieldConfig[]): FormlyFieldConfig[] =>
  fields.flatMap((field) => [field, ...flatten(field.fieldGroup ?? [])]);

describe('settings presentation', () => {
  it('keeps field bindings, validation, visibility, and stored defaults when grouping', () => {
    const source: FormlyFieldConfig[] = [
      { key: 'defaultProjectId', type: 'input' },
      {
        key: 'notesTemplate',
        type: 'textarea',
        defaultValue: 'existing',
        hideExpression: '!model.enabled',
        validators: { minLength: () => true },
      },
    ];
    const grouped = prepareSettingsFields(source, 'tasks', 'notesTemplate');
    const field = flatten(grouped).find((item) => item.key === 'notesTemplate')!;
    expect(field.defaultValue).toBe('existing');
    expect(field.hideExpression).toBe(source[1].hideExpression);
    expect(field.validators).toBe(source[1].validators);
    expect(grouped[1].props?.['settingsExpanded']).toBeTrue();
    expect(source[1].props).toBeUndefined();
  });

  it('provides help for every labeled configuration option', () => {
    const sections = [
      ...GLOBAL_GENERAL_FORM_CONFIG,
      ...GLOBAL_TASKS_FORM_CONFIG,
      ...GLOBAL_TIME_TRACKING_FORM_CONFIG,
      ...GLOBAL_PRODUCTIVITY_FORM_CONFIG,
    ];
    const missing = sections.flatMap((section) =>
      flatten(prepareSettingsFields(section.items ?? [], String(section.key), ''))
        .filter(
          (field) =>
            field.key &&
            (field.props?.label || field.templateOptions?.label) &&
            !field.props?.['helpKey'],
        )
        .map((field) => section.key + '.' + field.key),
    );
    expect(missing).toEqual([]);
  });
});
