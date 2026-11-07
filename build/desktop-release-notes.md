# Ultra Tasks 0.2.0

Ultra Tasks 0.2.0 expands desktop downloads to Linux and refines task organization, settings, imports, backups, and optional sync.

## License change

The current combined Ultra Tasks distribution now uses **GNU Affero General Public License v3.0 only (`AGPL-3.0-only`)**, subject to the exceptions and existing rights described in the [licensing policy](https://github.com/ultra-tasks/ultra-tasks/blob/ultra-tasks-v0.2.0/LICENSING.md).

Original Super Productivity material and earlier MIT-licensed Ultra Tasks releases retain their existing MIT permissions. Third-party dependencies and independently licensed plugins retain their applicable licenses. See the [AGPL license](https://github.com/ultra-tasks/ultra-tasks/blob/ultra-tasks-v0.2.0/LICENSE) and [preserved upstream MIT notice](https://github.com/ultra-tasks/ultra-tasks/blob/ultra-tasks-v0.2.0/LICENSES/MIT-UPSTREAM.txt).

## What's new

- Per-project List, Board, Calendar, and Upcoming layouts, with clearer project and section move controls.
- Refined settings categories, search, theme palettes, glass styling, and compact/mobile layouts.
- Built-in Todoist and TickTick file imports with previews inside Settings.
- Password-encrypted backup export/import, browsable local recovery points, and confirmed device-local backup cleanup.
- Clearer task descriptions, search, date displays, and time-tracking controls.
- Improvements to optional encrypted accounts, sync recovery, and project-sharing support.
- Fixes to packaged-app startup and task persistence, plus selected upstream task, planner, time-tracking, and sync corrections.

## Downloads

- **Windows:** the Setup installer and Portable executable support Intel/AMD x64 and Windows ARM64.
- **macOS:** choose `arm64` for Apple Silicon, `x64` for Intel, or the Universal DMG for either. DMG installers and architecture-specific ZIP archives are provided.
- **Linux x64:** AppImage, DEB, and RPM packages are provided. The AppImage may require FUSE support from your distribution.
- `SHA256SUMS.txt` contains checksums for every download.

Windows binaries are unsigned. macOS binaries are ad-hoc signed and are not Apple-notarized. Windows SmartScreen or macOS Gatekeeper may require explicit permission to open them. On macOS, use System Settings → Privacy & Security → Open Anyway if required.

This release covers GitHub desktop downloads. It does not publish to the Microsoft, Apple, Google Play, or Snap stores. Keep a backup before upgrading; Super Productivity data can be transferred through an explicit backup export/import.

[Full changelog from 0.1.0](https://github.com/ultra-tasks/ultra-tasks/compare/ultra-tasks-v0.1.0...ultra-tasks-v0.2.0). Upstream provenance remains recorded in [build/upstream-base.json](https://github.com/ultra-tasks/ultra-tasks/blob/ultra-tasks-v0.2.0/build/upstream-base.json). Thanks to the Super Productivity contributors.
