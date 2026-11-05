import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
  TimeTrackingConfig,
} from '../global-config.model';
import { T } from '../../../t.const';
import { IS_ELECTRON } from '../../../app.constants';

export const TIME_TRACKING_FORM_CFG: ConfigFormSection<TimeTrackingConfig> = {
  title: T.GCF.TIME_TRACKING.TITLE,
  help: T.GCF.TIME_TRACKING.HELP,
  key: 'timeTracking',
  items: [
    {
      key: 'defaultEstimate',
      type: 'duration',
      templateOptions: {
        label: T.GCF.TIME_TRACKING.L_DEFAULT_ESTIMATE,
        description: T.G.DURATION_DESCRIPTION,
        isShowZeroVal: true,
      },
    },
    {
      key: 'defaultEstimateSubTasks',
      type: 'duration',
      templateOptions: {
        label: T.GCF.TIME_TRACKING.L_DEFAULT_ESTIMATE_SUB_TASKS,
        description: T.G.DURATION_DESCRIPTION,
        isShowZeroVal: true,
      },
    },
    {
      key: 'isAutoStartNextTask',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TIME_TRACKING.L_IS_AUTO_START_NEXT_TASK,
      },
    },
    {
      key: 'isNotifyWhenTimeEstimateExceeded',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TIME_TRACKING.L_IS_NOTIFY_WHEN_TIME_ESTIMATE_EXCEEDED,
      },
    },
    {
      key: 'isTrackingReminderEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TIME_TRACKING.L_IS_TRACKING_REMINDER_ENABLED,
      },
    },
    {
      key: 'isTrackingReminderShowOnMobile',
      type: 'checkbox',
      hideExpression: (model) => !model.isTrackingReminderEnabled,
      templateOptions: {
        label: T.GCF.TIME_TRACKING.L_IS_TRACKING_REMINDER_SHOW_ON_MOBILE,
      },
    },
    {
      key: 'isTrackingReminderNotify',
      type: 'checkbox',
      hideExpression: (model) => !model.isTrackingReminderEnabled,
      templateOptions: {
        label: T.GCF.TIME_TRACKING.L_IS_TRACKING_REMINDER_NOTIFY,
      },
    },
    // Only the desktop app can bring its window to the front
    ...(IS_ELECTRON
      ? ([
          {
            key: 'isTrackingReminderFocusWindow',
            type: 'checkbox',
            hideExpression: (model: TimeTrackingConfig) =>
              !model.isTrackingReminderEnabled,
            templateOptions: {
              label: T.GCF.TIME_TRACKING.L_IS_TRACKING_REMINDER_FOCUS_WINDOW,
            },
          },
        ] as LimitedFormlyFieldConfig<TimeTrackingConfig>[])
      : []),
    {
      key: 'trackingReminderMinTime',
      type: 'duration',
      hideExpression: (model) => !model.isTrackingReminderEnabled,
      templateOptions: {
        label: T.GCF.TIME_TRACKING.L_TRACKING_REMINDER_MIN_TIME,
        required: true,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
  ],
};
