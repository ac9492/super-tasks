# Plugin icon sources

The icon refresh approved on 2026-11-05 uses the reviewed candidates in
[`docs/research/icon-replacements`](../../docs/research/icon-replacements/).
Icons use `currentColor` to follow the host theme and work offline.

## Material Symbols

Google Material Symbols outlines are extracted from the existing bundled
[`material-symbols-outlined.woff2`](../../src/assets/fonts/material-symbols-outlined.woff2)
at FILL=0, weight=400, 24px. The font SHA-256 is
`f7ebbdfac4f5f19c7d4dd7da5b836955fea1e8eda7fc8288d12c8a482a95ed7f`.
The outline geometry is unchanged. Copyright Google; licensed under
[Apache-2.0](licenses/LICENSE.material-symbols.txt).

| Plugin icon source                            | Symbol            |
| --------------------------------------------- | ----------------- |
| `ai-productivity-prompts/src/assets/icon.svg` | `smart_toy`       |
| `api-test-plugin/icon.svg`                    | `terminal`        |
| `app-auto-track/src/icon.svg`                 | `desktop_windows` |
| `caldav-calendar-provider/icon.svg`           | `calendar_month`  |
| `doc-mode/src/icon.svg`                       | `description`     |
| `procrastination-buster/src/assets/icon.svg`  | `psychology`      |
| `voice-reminder/icon.svg`                     | `volume_up`       |

The 17 inline paths in `doc-mode/src/ui/icons.ts` use this same source, including
`format_h1`, `format_h2`, `format_h3` for heading levels and `add_task` for actions
that create a host task. Existing task completion keeps its rounded checkbox.

`sync-md/src/assets/icon.svg` and `yesterday-tasks-plugin/icon.svg` are original
Ultra Tasks compositions using the Material `description` and `calendar_today`
outline bases at 90% scale, respectively. The added synchronization/back-arrow
badges use 1.5px round strokes. Transparency masks make the badge readable in
light and dark themes. The Material bases retain their Apache-2.0 license.

## Provider identities

These brand silhouettes are community-maintained Simple Icons vectors, licensed
under [CC0-1.0](licenses/LICENSE.simple-icons.md). Only `fill="currentColor"` and
attribution comments were added; path geometry is unchanged. Trademarks remain
their owners'. Sources were checked on 2026-11-05.

| Plugin icon source                  | Vector source                                                                                                     | Git blob SHA                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `google-calendar-provider/icon.svg` | [Simple Icons googlecalendar](https://github.com/simple-icons/simple-icons/blob/develop/icons/googlecalendar.svg) | `6049d100d7b292a07021bad26ef20b0f53cef1c7` |
| `todoist-import/src/icon.svg`       | [Simple Icons todoist](https://github.com/simple-icons/simple-icons/blob/develop/icons/todoist.svg)               | `8b53ff6cea49f2a0b1ea75884153cc96968dcd6d` |
| `ticktick-import/src/icon.svg`      | [Simple Icons ticktick](https://github.com/simple-icons/simple-icons/blob/develop/icons/ticktick.svg)             | `70952adcbe3fbc5dbe350a288822c00edd72ba66` |

The [Simple Icons license source](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md) has Git blob SHA
`70d4a7b6740c5d9b594ff2fc27d3ea7e89413185`.
