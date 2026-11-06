# Upstream fixes integrated into Ultra Tasks

Source: `super-productivity/super-productivity`, reviewed through
`0c1adf6a6927e5780b76cde72b74d3c2b421ecff`. Ultra Tasks started at
`34e80b136852cddcc2e37f72f47791ffbbaad4b6` (229 upstream commits missing).
This is a selective backport, not a full upstream merge. GitHub's behind count
continues to reflect ancestry rather than these grouped backports.

## Included fixes

| Area                                 | Upstream commits                                       | Fork adaptation                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task-list and tracking performance   | `5d03d228f8`, `0d4d71508e`, `2b4b884c23`               | Keep all four relative-date colors and existing task markup; adapt the new clock tests to the fork's Today color.                                                           |
| Planner estimates                    | `f5ab12018e`, `0df0375239`                             | Include both day-list and timed-parent fixes.                                                                                                                               |
| Exported-log privacy                 | `677251b3bd`, `a72dc61402`                             | Include the Windows-parentheses follow-up.                                                                                                                                  |
| Today and collapsed Done performance | `1b94611dc4`, relevant parts of `6b0f7884cc`           | Preserve section creation controls and completion ordering. Keep workspace-wide archive behavior. Exclude the unrelated startup-preloading changes.                         |
| Missed deadlines                     | `f040afc03b`                                           | Extend the shared sidebar/desktop count to include unplanned missed deadlines, with parent nesting and logical-day tests.                                                   |
| Logical-day defaults                 | `90f8c83d44`                                           | Keep the fork's already-correct date-label pipe; include planning and scheduled-date-group fixes and regression tests.                                                      |
| Windows tray                         | relevant parts of `a637b7c302`                         | Remove the inherited tray GUID and update its tests; retain fork branding. Do not add the unrelated launcher shortcut feature.                                              |
| macOS window dragging                | relevant parts of `f6f97b31dc`, `1043dc036c`           | Keep drag repairs, exclude the visual navigation-divider redesign, and retain existing glass styling.                                                                       |
| Resume/unlock behavior               | `a045772091`, `62ed870f50`, `a79dc0f716`               | Include the lazy-window follow-up to avoid capturing an uninitialized window.                                                                                               |
| File-sync catch-up and recovery      | `6bf8e8a4f8`, `1e6153ab4c`, `5aeabf2cbd`, `aa4f75474f` | Use the corrected catch-up implementation rather than its reverted predecessor. Include regression coverage for pending edits, rejected uploads and stale REPAIR snapshots. |

## Preserved fork behavior

Task-row markup, date-label formatting and weekday options, palette and glass
controls, top search, task capture context, inline task creation, bulk section
moves, subtask completion counts, application identity and release configuration
are retained. The only navigation markup addition is the invisible macOS window
drag strip. The existing shared badge count remains the source for both the
Today sidebar and desktop icon.

Smart Lists, AI Command, upstream navigation/view redesigns, and unrelated
plugin/dependency updates are excluded. Plugin minimum-version enforcement is
also excluded: comparing upstream `minSupVersion` against the fork's `0.1.0`
would reject compatible plugins. A future integration needs an explicit
upstream compatibility version.

## Deferred section-move backport

`009e3a96fb` is excluded after independent review. Its new admission treats
concurrent moves of different tasks as commuting for every provider. SuperSync
can reject and reissue one move to converge, but file providers apply both
original operations without reissuing SECTION operations. If two devices move
different tasks to the top of the same section, they retain different orders.
The fork keeps its existing safety stop instead of admitting that divergence.
The original real-store reproduction was run before considering the backport
(6 failures / 14 passes); no section code, tests or contract changes are landed.

## Recovery boundary

A replacement file snapshot has no marker distinguishing an automatic REPAIR
from an explicit import. A peer with pending local work therefore keeps the
existing conflict prompt when it encounters the replacement. The local work
stays intact, including after reload. The rejected-REPAIR regression test checks
this safety gate rather than promising automatic convergence for that peer.
The recovering client and a fresh reader must still retain all uploaded work.
No sync protocol change or weakened import guard is introduced.

## Validation

- **Angular:** 1,459 tests passed across 36 focused spec files in Europe/Berlin,
  including the new sync integration cases, frozen released-state validation,
  planner estimates, counts and date labels. An additional 141 date/planning
  tests passed in America/Los_Angeles.
- **Browser UI:** 20 distinct scenarios passed across the final suite and focused
  rerun: glass controls, capture, navigation, dates and colors, Today counts,
  subtask counts, Done-list behavior, Finish Day, window-drag CSS and inline
  task creation/section placement after reload.
- **WebDAV:** all 10 regression scenarios passed, with no retries: single/split
  catch-up, competing edits, rejected REPAIR recovery, failed migration upload,
  older rejected migration recovery and stale pending REPAIR state.
  Before the file-sync backports, the recovery reproductions failed through the
  real app with blocked sync/error state, rather than a mocked service seam.
- **Sync providers:** package build and all 467 tests passed.
- **Desktop:** build and all 414 Electron tests passed. Run the Electron suite
  under `umask 022`: this environment's default `0077` prevents two filesystem
  tests from creating the intentionally permissive fixtures they need. Both
  failures were reproduced on the unchanged baseline before diagnosing this;
  no application or permission-handling code was changed to make them pass.
- **Static checks:** changed TypeScript/SCSS passed `checkFile`; CSS-variable
  validation and `git diff --check` passed. The repository-wide lint, lint-rule, tooling and mac-icon checks passed
  through the commit hooks.

Browser runs used installed Chromium via an ignored local Playwright override,
two workers, and the local Apache WebDAV server with real write preconditions.
The initial broad Angular run passed 18,858 tests but caught nine imported-test
assumptions about the fork's date service/colors; those fixtures were corrected
and pass in the final focused checks. A complete post-backport Angular rerun is
not claimed.

Native Windows/macOS installation checks and the mixed released-client/provider
matrix were not run. Browser drag tests establish CSS region invariants, not an
OS-level window drag. SuperSync E2E setup was blocked by environment HTTP 403s
on Prisma engine downloads; the unsafe section backport was excluded instead
of landing without its required provider convergence proof.

## Review

- **Fixed:** oversized-service lint mismatch from the upstream cap. Consolidated
  comments and lowered the sync orchestrator's cap to 2,530 lines, its baseline
  physical size; runtime behavior was unchanged by that cleanup.
- **Fixed:** imported test assumptions about the fork's settings dialog,
  always-visible subtask counts, semantic palette probes and date-service mocks.
  Product UI was preserved.
- **Not changed:** peer pending-work conflict gate after a replacement REPAIR.
  The test now checks preserved local work after reload and verifies the healed
  uploader/new reader, rather than promising unsupported automatic convergence.
- **Deferred:** different-task section-write admission (`009e3a96fb`), because
  file providers lack the SECTION reissue that makes the server path converge.
- **Outside scope:** the existing documented legacy replacement-detection and
  split-file check/write limitations. The backports do not redesign the file
  format or introduce speculative guards for those residuals.

## Reconciliation with current main

The backport commit `cf2d0141ad` is merged with organization main at
`a0b84a077f`. This retains the newer native encrypted accounts, account-crypto
package, UI styling, icon refresh and updated E2E helpers from main.

The sync conflict resolution keeps the file snapshot `keepPending` argument
separate from the native snapshot preparation callback. Native hydration still
commits its baseline atomically and rejects obsolete projection operations;
file catch-up preserves eligible pending edits without a discard notification.
Fresh-context sync review checked both paths. The focused 453-test suite passed,
including orchestration coverage and a real IndexedDB regression that applies a
native baseline before preserving subsequent file edits.
