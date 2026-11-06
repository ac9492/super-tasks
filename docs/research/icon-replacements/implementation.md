# Approved Icon Refresh Implementation

The user approved all flagged candidates on 2026-11-05, including the candidates
after the first 70 reviewed individually. The app now uses the approved icon
vocabulary across navigation, tasks, dates, notes, timers, settings, integrations,
plugins, and native shortcuts. The comparison artwork remains a historical
review snapshot.

[Before/after board](../icon-replacements.html) · [Approval record](approval.json) ·
[Per-candidate implementation ledger](implementation.json)

## Coverage and Conditional Choices

All 210 comparison cards are accounted for. Independent source review records
201 implementations, two conditional implementations, two already-correct cases,
three text equivalents, one updated dormant declaration, and one retained
conditional icon. There are no outstanding replacement gaps.

- **Contribute:** retained the broad contribution icon because its destination
  covers code, design, and translations. The proposed code icon depended on a
  code-specific label and destination.
- **Deletion:** recoverable task deletion uses a trash icon; project/tag/board
  deletion keeps permanent-delete artwork because those flows have no restore
  bin. Removing recurrence keeps existing tasks as regular tasks.
- **Completion:** archived completed status uses a check; the explicitly optional
  decorative project trophy remains. Existing Doc Mode task controls already use
  the approved rounded checkbox.
- **Runtime providers:** the actual configured provider mark remains visible with
  a sync badge. The GitHub preview was a representative example, not a fixed logo
  for every integration.
- **Text-only contexts:** chart goal labels use translated “Goal met / Goal not
  met”; planner messages use “Tasks: N”. These avoid inserting font ligature names
  into canvas/text output. Social sharing buttons retain their platform names.
- **Saved choices:** pure display resolvers update only known built-in IDs with
  their exact legacy default icons. Other custom icons/emoji stay as chosen. No
  stored objects, data model, sync schema, or timer behavior changed.
- **Native artwork:** Android Today vectors, shortcut shells, and widget checkbox
  vectors are updated; iOS Today binds to the native calendar symbol. Native
  platform packaging/device verification remains separate from the web checks.

Plugin icons were regenerated through the existing owner build. All 17 Doc Mode
inline paths now use the bundled outlined geometry; heading levels and task
creation use the specific approved glyphs. Source attribution and complete
applicable license text travel with the plugin artwork.

## Validation

- Development Angular build passed.
- Modified TypeScript/styles passed the required file checks; templates were formatted.
- Tooling/native shortcut checks and translation/placeholder checks passed.
- Plugin owner build regenerated all 16 bundled plugins; Doc Mode typecheck/tests passed.
- Focused browser checks passed for four note rendering cases and two date-display
  cases, including reload persistence and a large task list. The existing Settings
  test helper was updated for the current flat layout, More options and modal closing.
- Focused Angular regression groups passed (147 session/date/provider tests, 158
  configuration/detail tests, 25 shared-widget tests, 12 attachment-list tests, and 90 copy/plugin-management tests).
- Native plist and changed XML vectors parse successfully. Native device/package
  builds were not run in this Linux environment.

The final affected Angular command is `CHROME_BIN=/usr/bin/chromium npm run quiet -- test:affected`; it runs the full Berlin suite and the configured Los Angeles regression subset for these shared UI changes. The commit hook also runs the repository lint/tooling checks. Detailed execution logs remain in the local `.tmp/logs/` directory.
