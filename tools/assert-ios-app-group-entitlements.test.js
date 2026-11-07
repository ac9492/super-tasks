const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const runCheck = (t, appGroup, shareGroup = appGroup) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-app-group-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const app = path.join(dir, 'App.app');
  fs.mkdirSync(path.join(app, 'PlugIns', 'ShareExtension.appex'), { recursive: true });
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  // Stand in for macOS codesign's entitlement output; exercise the actual gate.
  fs.writeFileSync(
    path.join(bin, 'codesign'),
    '#!/usr/bin/env bash\n' +
      'group="$MOCK_APP_GROUP"\n' +
      'if [[ "${@: -1}" == *.appex ]]; then group="$MOCK_SHARE_GROUP"; fi\n' +
      'printf \'<plist><dict><key>com.apple.security.application-groups</key><array><string>%s</string></array></dict></plist>\' "$group"\n',
    { mode: 0o755 },
  );
  const bash =
    process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
  return spawnSync(
    bash,
    [path.join(__dirname, 'assert-ios-app-group-entitlements.sh'), app],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        MOCK_APP_GROUP: appGroup,
        MOCK_SHARE_GROUP: shareGroup,
      },
    },
  );
};

test('accepts the fork App Group on both signed bundles', (t) => {
  const result = runCheck(t, 'group.app.ultratasks');
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
});

test('rejects an IPA signed with the upstream App Group', (t) => {
  const result = runCheck(t, 'group.com.super-productivity.app');
  assert.equal(result.status, 1, result.error?.message || result.stderr);
  assert.match(result.stdout, /not signed with the group.app.ultratasks App Group/);
});

test('rejects a share extension missing the fork App Group', (t) => {
  const result = runCheck(t, 'group.app.ultratasks', '');
  assert.equal(result.status, 1, result.error?.message || result.stderr);
  assert.match(result.stdout, /ShareExtension.appex is not signed/);
});
