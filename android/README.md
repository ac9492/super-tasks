# Ultra Tasks for Android

The Android (Capacitor) project for [Ultra Tasks](https://github.com/ac9492/ultra-tasks), inherited from the upstream Super Productivity Android app. Ultra Tasks does not publish Android builds yet; these notes cover building the app locally from this repository.

## Launch Modes

The app supports two launch modes:

1. **Connectivity-Free Mode** (Recommended) – The app's web assets are bundled in the APK, so the core features work without an internet connection. You can still sync with WebDAV or Dropbox, or work entirely offline.
2. **Online-Only Mode (Compatibility Mode)** – The app loads the web app from a server: the upstream production web app, a local development server, or a self-hosted server. Requires an internet connection.

Connectivity-Free Mode was added upstream in October 2024 ([super-productivity-android PR #57](https://github.com/super-productivity/super-productivity-android/pull/57)).

### Configuring Launch Mode

To configure the launch mode, adjust the `LAUNCH_MODE` setting in `android/app/app_config.properties`:

- **0**: Default behaviour (read from SharedPreferences)
- **1**: Force Online-Only Mode (Compatibility Mode)
- **2**: Force Connectivity-Free Mode (Recommended)

**Recommendation**: Set `LAUNCH_MODE` to `2` for Connectivity-Free Mode.

### How to Adjust `LAUNCH_MODE`

1. Open `android/app/app_config.properties` in a text editor.
2. Find the `LAUNCH_MODE` setting and set it to your desired mode (`0`, `1`, or `2`).

```properties
LAUNCH_MODE=2
```

**Important**: The `app_config.properties` file is intended for local modifications only. **DO NOT COMMIT** your changes to this file unless you are sure of what you are doing.

### Detailed Configuration Guides

- **[Connectivity-Free Mode Documentation (Recommended)](./README_OFFLINE.md)**: Step-by-step guide to setting up and building the app in Connectivity-Free Mode.
- **[Online-Only Mode (Compatibility) Documentation](./README_ONLINE.md)**: Step-by-step guide to setting up and building the app in Online-Only Mode.
