import type { App } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

/** Reuse this fork's existing profile after its rename; never adopt upstream data. */
export const resolveLegacyForkUserDataDir = (
  appDataDir: string,
  currentUserDataDir: string,
): string | undefined => {
  if (existsSync(currentUserDataDir)) return undefined;
  return ['Super Tasks', 'super-tasks']
    .map((name) => join(appDataDir, name))
    .find((dir) => existsSync(dir));
};

export const applyLegacyForkUserDataDir = (app: App): void => {
  if (process.argv.some((arg) => arg.includes('--user-data-dir='))) return;
  const dir = resolveLegacyForkUserDataDir(
    app.getPath('appData'),
    app.getPath('userData'),
  );
  if (dir) {
    app.setPath('userData', dir);
    app.setAppLogsPath();
  }
};

/**
 * The snap userData dir: $SNAP_USER_COMMON, which survives refreshes, instead
 * of the per-revision $SNAP_USER_DATA default. Undefined outside snap and when
 * `--user-data-dir` is passed (start-app.ts applies that one).
 */
export const resolveSnapUserDataDir = ({
  argv,
  env,
  platform,
  appName,
}: {
  argv: readonly string[];
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  appName: string;
}): string | undefined => {
  if (argv.some((val) => val.includes('--user-data-dir='))) {
    return undefined;
  }
  if (platform === 'linux' && env.SNAP && env.SNAP_USER_COMMON) {
    return join(env.SNAP_USER_COMMON, '.config', appName);
  }
  return undefined;
};

/**
 * Must run before `app.requestSingleInstanceLock()`: Electron creates the
 * singleton lock in the userData dir current at that call. Locking first put
 * it in the per-revision snap dir while IndexedDB lives in the common dir, so
 * instances of two snap revisions did not exclude each other and both opened
 * the same LevelDB (#11049).
 */
export const applySnapUserDataDir = (app: App): void => {
  const dir = resolveSnapUserDataDir({
    argv: process.argv,
    env: process.env,
    platform: process.platform,
    appName: app.getName(),
  });
  if (dir) {
    app.setPath('userData', dir);
    app.setAppLogsPath();
  }
};
