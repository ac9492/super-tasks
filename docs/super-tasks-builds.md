# Super Tasks desktop builds

Super Tasks is Adrian's personal fork of Super Productivity. The combined branch includes the merged upstream features, PRs #10503 and #10504, the closed #10922 inline creation feature, and completed/total subtask counts.

The Windows installer and portable app are named Super Tasks. macOS downloads are available separately for Apple Silicon (arm64) and Intel (x64). Both platforms use the app identifier `io.github.ac9492.supertasks`, their own Super Tasks data folder, and the `supertasks://` desktop URL scheme. They can be installed alongside Super Productivity. Existing upstream data is not copied automatically; use its export/import interface if you want to transfer your tasks.

Builds are unsigned and macOS builds are not notarized. Keep the upstream license and author attribution; this is a fork, not an official upstream release. Services configured to return OAuth redirects to `superproductivity://` still open the upstream app; configure a `supertasks://` callback where the provider supports it.

To build Windows, run `npm run buildFrontend:prod:es6`, `npm run electron:build`, then `npx electron-builder --config electron-builder.super-tasks.cjs --win nsis portable --x64 --publish never`.

To build macOS, run the same frontend and Electron compilation on a Mac, then `npx electron-builder --config electron-builder.super-tasks.cjs --mac dmg zip --x64 --arm64 --publish never`. The fork's manual build workflow performs this macOS build and retains the downloads as workflow artifacts for 30 days.

Output is saved in `.tmp/super-tasks-builds`. These builds use the existing combined branch's upstream base, rather than incorporating newer upstream changes.
