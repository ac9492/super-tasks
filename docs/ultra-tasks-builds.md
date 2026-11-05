# Ultra Tasks desktop builds

Ultra Tasks is an independent, UX-focused fork of Super Productivity. The `main` branch is the active Ultra Tasks branch, based on the former `build/combined-2026-10-25` branch. It includes the merged upstream features, PRs #10503 and #10504, the closed #10922 inline creation feature, and completed/total subtask counts.

The Windows installer and portable app are named Ultra Tasks. macOS downloads are available separately for Apple Silicon (arm64) and Intel (x64). Both platforms use the app identifier `app.ultratasks` and the `ultratasks://` desktop URL scheme. They can be installed alongside Super Productivity. Ultra Tasks reuses an existing `Super Tasks` or `super-tasks` desktop profile when no Ultra Tasks profile exists, without moving or deleting it. Explicit `--user-data-dir` profiles take precedence. Existing upstream data is not copied automatically; use its export/import interface if you want to transfer your tasks.

Windows builds are unsigned. macOS builds are ad-hoc signed (their integrity is checked, but they have no Apple Developer ID) and are not notarized. macOS may require explicit approval in System Settings → Privacy & Security. Keep the upstream license and author attribution; this is a fork, not an official upstream release. Services configured to return OAuth redirects to `superproductivity://` still open the upstream app; configure a `ultratasks://` callback where the provider supports it.

To build Windows, run `npm run buildFrontend:prod:es6`, `npm run electron:build`, then `npx electron-builder --config electron-builder.ultra-tasks.cjs --win nsis portable --x64 --publish never`.

To build macOS, run the same frontend and Electron compilation on a Mac, then `npx electron-builder --config electron-builder.ultra-tasks.cjs --mac dmg zip --x64 --arm64 --publish never`. The fork's manual build workflow performs this macOS build and retains the downloads as workflow artifacts for 30 days.

Output is saved in `.tmp/ultra-tasks-builds`. These builds use the existing combined branch's upstream base, rather than incorporating newer upstream changes.
