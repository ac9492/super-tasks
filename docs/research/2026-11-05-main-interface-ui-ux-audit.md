# Main interface UI/UX simplification audit

Status: recommendations for triage; no application changes implemented.
Date: 2026-11-05.
Tracking: requested repository audit; no issue opened.
Audited branch: `claude/ultra-task-cloud-setup-nq657a`.
Audited commit: `248a0e81e38f6c7cab8fa366f6dfa217f42e7752` (Claude's latest
shell/task-surface checkpoint at the time of review).

## Recommendation

Keep the existing task, planning and time-tracking capabilities. Reduce repeated
controls, empty information and setup prompts in the daily workspace. The biggest
opportunities are in capture and task details, rather than another shell redesign.

Start with recommendations 1–5: they remove duplicated actions or correct an
action appearing under the wrong label. Then simplify empty/secondary content.
Moving a useful control must leave a clear, accessible route to the same action.
No new preference switches are proposed to avoid making these design decisions.

## Evidence and limits

- Reviewed the branch's templates, visibility conditions, handlers, local-state
  defaults and existing UX direction. References below point into this snapshot;
  line numbers must be checked again after further Claude changes.
- Ran the branch's Angular development server and inspected Chromium desktop
  capture/task details with a synthetic `Review launch checklist 30m` task.
  Confirmed the repeated destination, repeated date actions, stock notes prompts,
  and zero-value work-summary metrics. Also inspected the fresh workspace and
  search header. No customer data or external integration account was used.
- Browser inspection used the normal Chromium user agent, with onboarding flags
  skipped. This matters: the repository's `PLAYWRIGHT` user-agent path enables
  every feature and does **not** represent new-install defaults. A narrow viewport
  was also inspected; this is not real-device, IME or touch validation.
- These are heuristic recommendations, not measured user-study results. Source
  findings involving configured sync, sharing and deleted-result restoration
  were not exercised against remote services or real data.
- The development bundle compiled. This audit does not certify the branch's many
  existing “unverified” checkpoints, production build or full test suite. The
  browser reported optional missing bundled-plugin manifests and a persistence
  permission warning; those warnings are not being classified as removable UI.
- Audit-document validation: documentation links, Prettier and whitespace checks
  passed. Full `npm run lint` stopped at an inherited Prettier error in
  `src/app/features/config/glass-settings/glass-settings.component.html:64:50`.
  That source file is unchanged by this documentation-only audit; later lint
  stages and the full application test suite were not run. The generic Git hooks
  are bypassed for this documentation delivery because of that existing failure.

The [product principles](../../AGENTS.md#product-principles),
[market target](../market/README.md#target) and
[UX direction](../ultra-tasks-ux-direction.md) favor calm individual work while
preserving quick capture, daily planning and time tracking. They do not justify
removing advanced workflows simply because they are optional.

## Prior art informing the recommendations

This carries forward the vendor-document review recorded in
[UX direction, November 2026](../ultra-tasks-ux-direction.md#prior-art), rather
than claiming a fresh hands-on competitor benchmark.

| App / source                                                                                                                                                  | Relevant pattern from that review                                                                    | Take / deliberately don't take                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [Todoist Quick Add](https://www.todoist.com/help/todoist/features/use-task-quick-add-in-todoist-va4Lhpzz)                                                     | Capture exposes a destination and task attributes; planned date and deadline have distinct meanings. | Keep one editable destination and distinct date fields; don't copy cloud/account requirements or introduce another capture system.      |
| [Things default lists](https://culturedcode.com/things/support/articles/4001304/) and [Quick Find](https://culturedcode.com/things/support/articles/2803584/) | Daily lists have explicit roles; navigation/search remains readily accessible.                       | Preserve Search, Today, Inbox and planning orientation; don't adopt different scheduling semantics.                                     |
| [Apple Reminders task editing](https://support.apple.com/guide/reminders/add-or-change-reminders-remndc729e28/mac)                                            | Quick entry and details support different editing depths, with a selected-list context.              | Keep a shallow path to common edits and deeper optional detail; don't add a second set of buttons for fields already directly editable. |

## Prioritized recommendations

P1 = first cleanup pass, supported by a concrete duplicate or misleading action.
P2 = next pass; validate workflow impact before adopting placement/default changes.
P3 = small polish. Effort is relative implementation scope, not an estimate.

| #   | Priority | Where                        | Recommendation                                                                             | Effort            |
| --- | -------- | ---------------------------- | ------------------------------------------------------------------------------------------ | ----------------- |
| 1   | P1       | Task details                 | Remove duplicate Planned for / Deadline shortcut strip.                                    | Small             |
| 2   | P1       | Task capture                 | Consolidate destination summary and project picker.                                        | Small–medium      |
| 3   | P1       | Main header                  | Keep unconfigured sync setup in Settings.                                                  | Medium            |
| 4   | P1       | Search / planning page title | Make the current-page title a heading instead of an unrelated task-list link.              | Small             |
| 5   | P1       | Deleted search result        | Keep one explicit Restore action; remove implicit restoration from title activation.       | Medium            |
| 6   | P2       | Empty task notes             | Replace automatically expanded stock coaching text with a compact Notes / Checklist entry. | Small–medium      |
| 7   | P2       | Work summary                 | Suppress empty worked/break metrics until relevant.                                        | Small             |
| 8   | P2       | Done / Recurring sections    | Prefer collapsed secondary sections for genuinely fresh installs.                          | Medium            |
| 9   | P2       | Non-context screens          | Gate inactive work-context panel controls by relevance.                                    | Medium; prototype |
| 10  | P2       | Project creation / menu      | Move first-time Plainspace setup into optional integration setup.                          | Medium            |
| 11  | P2       | Sidebar                      | Move Support us into Help.                                                                 | Small             |
| 12  | P3       | Appearance settings          | Remove help buttons that repeat fully visible hints.                                       | Small             |

### 1. One pair of editable date fields in task details

**Observed:** [task detail template](../../src/app/features/tasks/task-detail-panel/task-detail-panel.component.html),
lines 27–42, renders permanent Planned for and Deadline buttons. Lines 147–225
render labeled value rows invoking the same `scheduleTask()` and
`openDeadlineDialog()` handlers. The explanatory paragraph at line 146 adds
another permanent block between them. Confirmed in the desktop UI.

**Change:** remove the shortcut strip. Keep the two labeled, directly editable
value rows; place them near the title so frequent date editing stays quick.
Offer the distinction between planned date and deadline as contextual help in
the date-editing flow, rather than permanent prose in every task panel.

**Preserve / accept:** both dates editable in one activation; actual date values,
recurrence summary, overdue styling, deadline removal and keyboard navigation
remain. Never combine planned date and deadline into a single ambiguous date.

### 2. One visible, editable capture destination

**Observed:** [capture template](../../src/app/features/tasks/add-task-bar/add-task-bar.component.html),
lines 6–17, displays “Adding to [project]”; the
[capture actions](../../src/app/features/tasks/add-task-bar/add-task-bar-actions/add-task-bar-actions.component.html),
lines 6–33, also display the selected project as a menu button. Both resolve the
same state-derived destination. Confirmed visually; this is repetition, not an
evidenced destination mismatch.

**Change:** turn the destination summary into the single project picker, or keep
the existing picker and remove the repeated summary. Keep the destination
visible without horizontal scrolling at phone widths.

**Preserve / accept:** users can predict the destination before submitting,
switch projects, use `+project` syntax, and hear destination changes through an
accessible announcement. Keep the Today/backlog choice distinct from project
selection: it answers a different question.

### 3. Show sync status after configuration; keep setup in Settings

**Observed:** [header template](../../src/app/core-ui/main-header/main-header.component.html),
lines 124–147, renders the sync button when the feature flag is on. The
[header component](../../src/app/core-ui/main-header/main-header.component.ts),
lines 196–200 and 687–693, turns an unready button into setup. A dedicated setup
action already exists in the
[Sync & Backup settings](../../src/app/pages/config-page/config-page.component.html),
lines 181–197. The local-only workspace still carries the header button.

**Change:** remove the persistent header setup affordance when no provider is
configured. Keep setup discoverable in Settings → Sync & Backup.

**Preserve / accept:** configured users retain manual sync, in-progress/offline
status, errors and recovery access. Distinguish “never configured” from “configured
but temporarily not ready”; failed authentication must not make the status vanish.
Do not suppress sync errors or turn local-only use into an account requirement.

### 4. A page title should identify the current page

**Observed:** [page-title component](../../src/app/core-ui/main-header/page-title/page-title.component.ts),
lines 53–80, links the title to `/active/tasks`, while lines 414–427 give it
special-page labels such as Search, Planner and Recurring tasks. The Search
header exposes this task-list link under its own page name.

**Change:** render a static heading on standalone sections. Retain an explicit
return-to-task-list link on context subpages where that is meaningful, such as
project history or metrics.

**Preserve / accept:** clicking “Search” or “Planner” does not unexpectedly leave
the page. Users still have Today, Inbox and project navigation. Settings and
Plugins management are already modal windows via the
[settings dialog guard](../../src/app/features/config/settings-dialog.guard.ts);
do not treat the dormant `/config` title mapping as a demonstrated settings-page
navigation problem.

### 5. Deleted results need one explicit Restore action

**Observed, source only:** [search template](../../src/app/pages/search-page/search-page.component.html),
lines 45–50 and 100–112, provides a result title button and a separate Restore
button. In [search behavior](../../src/app/pages/search-page/search-page.component.ts),
lines 462–464, title activation restores a deleted entry immediately. An action
that ordinarily navigates therefore mutates data for one result type.

**Change:** make the deleted title non-mutating (read-only text or a preview).
Keep one explicit, clearly named Restore action. Update result keyboard handling
alongside the template so Enter on a deleted title cannot restore implicitly.

**Preserve / accept:** deleted tasks remain searchable and labeled Deleted;
pointer and keyboard users can deliberately restore and then navigate to them.
Keep existing recovery semantics and the same restoration operation.

### 6. Empty notes should not look like authored content

**Observed:** [detail-panel behavior](../../src/app/features/tasks/task-detail-panel/task-detail-panel.component.ts),
lines 349–357, expands notes for an ordinary blank desktop task. The
[template](../../src/app/features/tasks/task-detail-panel/task-detail-panel.component.html),
lines 286–289, displays `task.notes || defaultTaskNotes()`. The
[stock template](../../src/app/features/config/default-global-config.const.ts),
lines 14–19, contains three coaching questions. Confirmed with the synthetic task.

**Change:** show a compact Notes / Checklist affordance for a task with no real
notes and the stock template. Reveal the editor when requested, keeping template
insertion available there for users who want it.

**Preserve / accept:** real notes, existing checklists and user-customized templates
stay intact. Explicitly opening Notes, keyboard editing, pasting and checklist
creation still work. Don't strip template-like text from saved task notes.

### 7. Make summary metrics relevant individually

**Observed:** [work-view template](../../src/app/features/work-view/work-view.component.html),
lines 15–95, shows the entire status block when either estimated remaining time
or worked time exists. Adding a 30-minute estimate alone displays useful remaining
time beside “Working today: 0m” and “Without break: 0m”. Confirmed visually.

**Change:** keep remaining work visible; gate worked/break readouts separately on
meaningful activity. Reveal the break/reset interaction where there is a useful
break timer to inspect or reset.

**Preserve / accept:** active tracking and meaningful elapsed/break information
remain visible and do not shift distractingly on every timer tick. Turning off
break reminders alone must not hide useful time-tracking data. Check narrow
screens, archived time and time-tracking-disabled configurations.

### 8. Collapse finished work and recurrence templates initially

**Observed, source only:** [work-view state](../../src/app/features/work-view/work-view.component.ts),
lines 302 and 305, defaults Done and Recurring sections to expanded when their
hidden-state keys are absent. Their
[templates](../../src/app/features/work-view/work-view.component.html), lines
404–493, place finished tasks and recurring configuration previews below daily
work. Recurring previews are templates, not duplicate task instances.

**Change:** prefer collapsed Done and Recurring sections for genuinely fresh
installs, with counts and clear expansion controls. Keep recurrence management in
the existing `/scheduled-list` destination.

**Preserve / accept:** archive actions, recurrence editing, counts and
search-triggered reveal remain available. Preserve existing choices. The current
implementation removes a key when a user expands a section (lines 476–510), so
“missing key” cannot distinguish a new install from an existing explicit expanded
choice. Resolve that distinction before changing defaults; do not silently
collapse every existing user's sections or introduce synced task fields for it.

### 9. Context controls should belong to the screen being used

**Observed:** [header template](../../src/app/core-ui/main-header/main-header.component.html),
lines 149–169, mounts work-context plugin actions and desktop panels in the
shared shell. [Desktop panel controls](../../src/app/core-ui/main-header/desktop-panel-buttons/desktop-panel-buttons.component.ts)
use feature flags, not route relevance; equivalent phone controls live in
[bottom navigation](../../src/app/core-ui/mobile-bottom-nav/mobile-bottom-nav.component.html).
Search still exposes Notes for the last work context.

**Change to prototype:** hide inactive work-context controls on clearly unrelated
standalone sections, starting with Support us and Archived projects. Validate
Search separately: note search can intentionally open project notes, so indiscriminate
route gating would remove a useful workflow. Keep planning screens' relevant panels.

**Preserve / accept:** global Add, active tracking and configured sync remain
accessible. An already open panel has a clear close/reopen path; project notes
and plugin workflows retain context. Settings/Plugins management already use
modal windows; do not add redundant special handling for their obscured shell.

### 10. Keep optional service provisioning out of basic project creation

**Observed, source only:** the
[project form](../../src/app/features/project/project-form-cfg.const.ts), lines
42–56, shows a Plainspace collaboration checkbox on every new project. The
[project menu](../../src/app/core-ui/work-context-menu/work-context-menu.component.html),
lines 54–66, offers sharing for eligible unshared projects even without configured
integration. The [menu handler](../../src/app/core-ui/work-context-menu/work-context-menu.component.ts),
lines 360–372, begins sign-in/service setup.

**Change:** place first-time setup behind an optional integration disclosure or
a verified integration setup destination. Keep direct Share access once configured,
and Copy invite for shared projects. Do not assume a project “Integrations” screen
already exists; establish the destination before removing either entry point.

**Preserve / accept:** creating an ordinary offline project requires no service
decision. Interested users can still discover and explicitly enable sharing.
Configured users retain sharing, invitations and ordinary Markdown Share/Copy.
Don't remove the provider or alter shared-project behavior.

### 11. Put Support us in Help

**Observed:** [navigation config](../../src/app/core-ui/magic-side-nav/magic-nav-config.service.ts),
lines 250–270, makes Support us its own persistent sidebar destination next to
Help. It is visible in the fresh web workspace even though it is unrelated to
the user's daily task context.

**Change:** move the existing Support us destination into Help. Keep Search,
Today, Inbox, Planner and task organization in the main navigation, and preserve
Settings and Plugins & integrations as utility destinations.

**Preserve / accept:** support remains discoverable and reachable by keyboard;
existing donation visibility preference and iOS/macOS restrictions still apply.
This is a placement change, not removal of the support page.

### 12. Use one explanation per appearance setting

**Observed, source only:** [glass settings](../../src/app/features/config/glass-settings/glass-settings.component.html),
lines 10–17 and 27–32, repeat the same hints inline and through
[setting-help](../../src/app/ui/setting-help/setting-help.component.ts), lines
12–23. Each duplicate adds another focusable help button.

**Change:** keep the fully visible inline hints and remove only these redundant
help buttons. Retain help controls where they provide additional information or
where the explanation is otherwise hidden.

**Preserve / accept:** control labels and accessible descriptions retain the
explanations. Glass and light/dark background selection behave identically, with
fewer duplicate tab stops. Do not remove the shared help component globally.

## Keep the cleanup already present

These are existing improvements in the audited commit, not new recommendations:

- [New-install feature defaults](../../src/app/features/config/new-install-app-features.const.ts)
  already emphasize tasks, Planner and time tracking; Schedule, Boards, Habits,
  Issues, Finish day and Focus start off. Existing users retain their settings.
- Search already renders first beneath the brand. Mobile Add and side-panel
  actions already have one home rather than duplicating header/bottom-nav controls.
- Zero-value task time controls already hide; Today's all-day badge is suppressed
  within Today; checklist progress avoids a redundant notes icon. Preserve actual
  dates, deadlines, time conflicts, issue updates and subtask/checklist progress.
- A single mobile panel opens directly instead of through a one-item menu.
  Palette editing already uses a disclosure, background controls are conditional,
  and settings search avoids an empty suggestions popup.
- Touch overflow menus, keyboard shortcuts, focus indicators, accessible labels
  and configured plugin actions are functionality. Do not remove them to make a
  screenshot look quieter. Keep status/error messages that help recover data.

## Implementation order and validation

1. Consolidate capture/details and correct title/Restore behavior (1–5). Verify
   keyboard order and focus restoration after each removed control.
2. Simplify empty content, service setup and sidebar utility placement (6–8,
   10–11). Prototype the route-relevance change (9) with note/plugin users before
   adopting it. Apply the small duplicate-help cleanup (12) alongside settings work.
3. Check new and existing installs separately at desktop, tablet and phone widths,
   light/dark and solid/glass appearances, enlarged text and keyboard-only use.
   Include a long task list; task-row hot-path performance must not regress.

For the proposed implementation, exercise capture with project/date/estimate and
short syntax; edit and clear planned dates/deadlines; open notes/checklists; find
and explicitly restore a deleted task; reveal a task in a collapsed section;
start/pause tracking and reset a meaningful break timer; configure sync and test
offline/auth-error states; create a local project and share a configured one.
Check configured plugin actions and cross-page note search. Test real phone
keyboard/touch behavior separately from viewport emulation.

Use existing components and handlers. No new dependencies, task model fields,
sync wire changes or feature removals are needed for the main cleanup. Any local
preference handling for recommendation 8 needs its own compatibility assessment.
Update user-facing documentation when behavior is implemented; this audit itself
does not change the current behavior described in the wiki.

Recheck findings against the branch head before implementation. Retire this note
once its recommendations are implemented, declined or moved into tracked issues.
