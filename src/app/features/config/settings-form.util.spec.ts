import { FormlyFieldConfig } from '@ngx-formly/core';
import { prepareSettingsFields } from './settings-form.util';
import { IDLE_FORM_CFG } from './form-cfgs/idle-form.const';
import { T } from '../../t.const';
import { HelperClasses } from '../../app.constants';
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

  const allSections = [
    ...GLOBAL_GENERAL_FORM_CONFIG,
    ...GLOBAL_TASKS_FORM_CONFIG,
    ...GLOBAL_TIME_TRACKING_FORM_CONFIG,
    ...GLOBAL_PRODUCTIVITY_FORM_CONFIG,
  ];
  const allPrepared = (): { section: string; field: FormlyFieldConfig }[] =>
    allSections.flatMap((section) =>
      flatten(prepareSettingsFields(section.items ?? [], String(section.key), '')).map(
        (field) => ({ section: String(section.key), field }),
      ),
    );

  it('never repeats the visible description as the help (?) text', () => {
    const duplicated = allPrepared()
      .filter(
        ({ field }) =>
          field.props?.['helpKey'] &&
          field.props['helpKey'] === (field.props.description ?? undefined),
      )
      .map(({ section, field }) => section + '.' + field.key);
    expect(duplicated).toEqual([]);
  });

  it('gives a field help only from its dedicated help entry', () => {
    const [withHelp, withoutHelp] = prepareSettingsFields(
      [
        { key: 'isMinimizeToTray', type: 'checkbox', props: { label: 'L' } },
        {
          key: 'noDedicatedHelp',
          type: 'checkbox',
          props: { label: 'L', description: 'Shown below the control' },
        },
      ],
      'unknown-section',
      '',
    );
    expect(withHelp.props?.['helpKey']).toBe(T.PS.OPTION_HELP.isMinimizeToTray);
    expect(withoutHelp.props?.['helpKey']).toBeUndefined();
  });

  it('adds no per-row help to keyboard shortcuts', () => {
    const keyboardRows = allPrepared().filter(({ field }) => field.type === 'keyboard');
    expect(keyboardRows.length).toBeGreaterThan(0);
    expect(keyboardRows.filter(({ field }) => field.props?.['helpKey'])).toEqual([]);
  });

  // In the web build without the browser extension the idle toggles are hidden;
  // the paragraph explaining that must not be tucked away in "More options"
  it('keeps the idle extension info up front and hides an all-desktop collapsible', () => {
    const prepared = prepareSettingsFields(IDLE_FORM_CFG.items ?? [], 'idle', '');
    const intro = prepared.find((field) => field.type === 'tpl');
    expect(intro?.props?.['text']).toBe(T.G.EXTENSION_INFO);
    const more = prepared.find((field) => field.type === 'collapsible');
    expect(more?.className).toBe(HelperClasses.isHideForNoAdvancedFeatures);
  });
});
