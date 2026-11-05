const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('ts-node/register/transpile-only');

const {
  resolveSnapUserDataDir,
  applySnapUserDataDir,
  resolveLegacyForkUserDataDir,
  applyLegacyForkUserDataDir,
} = require('./user-data-dir.ts');

test('Ultra Tasks reuses the old fork profile, never upstream or an explicit profile', () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ultra-profile-'));
  const current = path.join(root, 'Ultra Tasks');
  const previous = path.join(root, 'Super Tasks');
  try {
    fs.mkdirSync(path.join(root, 'superProductivity'));
    assert.equal(resolveLegacyForkUserDataDir(root, current), undefined);
    fs.mkdirSync(previous);
    assert.equal(resolveLegacyForkUserDataDir(root, current), previous);
    fs.mkdirSync(current);
    assert.equal(resolveLegacyForkUserDataDir(root, current), undefined);
    const originalArgv = process.argv;
    try {
      process.argv = [...originalArgv, '--user-data-dir=/explicit'];
      applyLegacyForkUserDataDir({
        getPath: () => assert.fail('explicit profile must win'),
      });
    } finally {
      process.argv = originalArgv;
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const SNAP_ENV = {
  SNAP: '/snap/superproductivity/4925',
  SNAP_USER_COMMON: '/home/u/snap/superproductivity/common',
  SNAP_USER_DATA: '/home/u/snap/superproductivity/4925',
};
const SNAP_COMMON_USER_DATA = path.join(
  SNAP_ENV.SNAP_USER_COMMON,
  '.config',
  'superProductivity',
);

const resolve = (overrides) =>
  resolveSnapUserDataDir({
    argv: ['electron', '.'],
    env: {},
    platform: 'linux',
    appName: 'superProductivity',
    ...overrides,
  });

test('snap uses the common dir shared by all revisions (#11049)', () => {
  assert.equal(resolve({ env: SNAP_ENV }), SNAP_COMMON_USER_DATA);
});

test('leaves --user-data-dir to start-app.ts, as before', () => {
  assert.equal(
    resolve({ env: SNAP_ENV, argv: ['electron', '--user-data-dir=/x/y'] }),
    undefined,
  );
});

test('keeps the default outside snap and on other platforms', () => {
  assert.equal(resolve({}), undefined);
  assert.equal(resolve({ env: SNAP_ENV, platform: 'darwin' }), undefined);
  assert.equal(resolve({ env: { SNAP: SNAP_ENV.SNAP } }), undefined);
});

test('applySnapUserDataDir sets userData and the logs path on snap', () => {
  const calls = [];
  const app = {
    getName: () => 'superProductivity',
    setPath: (name, dir) => calls.push(['setPath', name, dir]),
    setAppLogsPath: () => calls.push(['setAppLogsPath']),
  };
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...SNAP_ENV };
  try {
    applySnapUserDataDir(app);
  } finally {
    process.env = originalEnv;
  }
  const expected =
    process.platform === 'linux'
      ? [['setPath', 'userData', SNAP_COMMON_USER_DATA], ['setAppLogsPath']]
      : [];
  assert.deepEqual(calls, expected);
});

// Electron puts the singleton lock in the userData dir current at
// requestSingleInstanceLock(), so main.ts must move it first (#11049).
test('main.ts moves the snap userData before requesting the single-instance lock', () => {
  const src = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');
  // Unconditional and at top level: a call inside a platform branch would
  // still sort before the lock in the source text.
  const applyAt = src.search(/^applySnapUserDataDir\(app\);$/m);
  const lockAt = src.indexOf('requestSingleInstanceLock(');
  assert.ok(applyAt > -1 && lockAt > -1);
  assert.ok(applyAt < lockAt);
});
