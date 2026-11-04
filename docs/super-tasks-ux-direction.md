# Super Tasks UX direction

Status: discovery draft, November 2026. This document identifies problems to investigate; it does not commit the project to a new layout or interaction model.

## Scope and evidence

Super Tasks focuses on individual task management, daily planning, and time tracking. The inherited [market position](market/README.md#target) and [scorecard](market/scorecard.md) identify quick capture, organization, and everyday polish as areas where users may struggle to reach the app's stronger capabilities. Those documents are upstream context, not independent usability evidence for this fork.

The initial demand is concrete but limited: the fork began with reports about mismatched task counts, hard-to-read dates, missing relative-date colors, and task insertion/organization. The three priorities below are hypotheses to validate with more users. They do not justify a complete rewrite or a new UI framework by themselves.

## Prior art

Checked November 2026 against vendor documentation; these are documented behaviors, not claims from hands-on testing. The examples were chosen for scanning, capture/editing, and navigation. They do not imply identical data models or features.

| App and source                                                                                                                                                                                                     | Scanning and date clarity                                                                      | Capture and editing                                                                                         | Navigation/context                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Todoist: getting started](https://www.todoist.com/help/todoist/get-started/get-started-with-todoist-OgNNJR) and [Quick Add](https://www.todoist.com/help/todoist/features/use-task-quick-add-in-todoist-va4Lhpzz) | Documentation distinguishes a scheduled date from a deadline and explains priority indicators. | Quick Add combines task text with dates, labels, and other details.                                         | The destination project can be specified while capturing a task.                     |
| Things: [default lists](https://culturedcode.com/things/support/articles/4001304/) and [Quick Find](https://culturedcode.com/things/support/articles/2803584/)                                                     | Today and Upcoming have explicitly documented roles in daily planning.                         | Its scheduling model documents when a task becomes available; that model differs from Super Productivity's. | Quick Find searches tasks and navigates to lists/projects from the keyboard.         |
| [Apple Reminders: adding and changing reminders](https://support.apple.com/guide/reminders/add-or-change-reminders-remndc729e28/mac)                                                                               | Task details expose dates, tags, and flags.                                                    | Quick-entry fields and an Edit Details action provide different depths of editing.                          | Reminders are created in the selected list, giving capture an explicit list context. |

Take: explicit destinations and date meanings, clear daily-view labels, a shallow path to common edits, and keyboard access to frequent destinations. These support a calm interface and extend concepts already present in Super Tasks.

Deliberately do not take: another app's scheduling semantics, cloud-account requirement, collaboration model, or additional task states. Do not duplicate upstream search, capture, or planning features just to copy a visual pattern.

## 1. Clearer task lists

**Question:** Can users identify which task needs attention and use its main actions without decoding a dense row?

Start with the existing task-row controls, scheduled-date/deadline badges, subtask progress, and Today count. The fork's count and date fixes are the baseline, not unfinished features to advertise again.

Explore information hierarchy, consistent spacing and labels, and the visibility of frequently used actions. Evaluate keyboard focus, long titles, large lists, light/dark themes, and non-color cues. Keep task-row performance as a constraint.

**Evidence of improvement:** testers can explain what the date and count mean, find an overdue task, and complete or start the intended task without opening unrelated controls.

## 2. Faster task capture and editing

**Question:** Can users add a task to the intended project/section and change its schedule or deadline without losing context?

Start with the existing add-task bar, inline section insertion, and task detail panel. Explore how destination and field labels are presented before adding new controls. Preserve keyboard capture, short syntax, notes, and existing save/cancel behavior.

**Evidence of improvement:** testers can predict where a task will appear and can change a scheduled date, deadline, project, or section without a misplaced task or accidental edit.

## 3. More predictable navigation

**Question:** Can users move between capture, daily work, and planning while remaining oriented?

Start with the existing side navigation, page titles, search/shortcuts, and planning entry points. Explore the visibility and consistency of Today, Inbox, project context, and planning destinations. Preserve advanced features and existing user navigation choices.

**Evidence of improvement:** testers can find an intended destination, identify their current context, and return to their previous work using both pointer and keyboard.

## Compatibility boundaries

- Preserve upstream task, project, note, time-log, and archive data structures, as well as sync operations, encryption, replay/conflict behavior, and supported migrations.
- Keep new presentation preferences local where possible. Any persisted preference needs an explicit compatibility review; no fork-only fields in synced task records for presentation changes.
- Preserve each provider's capabilities and validate authorization/callback behavior after rebranding. Test imports and mixed upstream/fork clients before making compatibility claims.
- Treat observation and presentation separately from task semantics: a new label must not silently change which tasks are scheduled, completed, or overdue.

## How to work on a priority

Gather examples from users, propose one bounded interaction, and extend the prior-art comparison for that specific decision. Produce a small prototype before changing the application. Compare the current and proposed flow with testers, including keyboard users. Implement and validate the smallest useful improvement, with relevant performance, accessibility, and compatibility checks.

No new application behavior, task schema, or sync format is introduced by this documentation draft.
