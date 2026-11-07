const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { syncAndroidVersion } = require('./bump-android-version');

const withGradleFile = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'android-version-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'build.gradle');
  fs.copyFileSync(path.join(__dirname, '../android/app/build.gradle'), file);
  return file;
};

test('stamps the native release version and decimal-safe code from the product version', (t) => {
  const file = withGradleFile(t);
  syncAndroidVersion({ gradleFilePath: file, version: '0.2.0' });
  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /versionName "0\.2\.0"/);
  assert.match(content, /versionCode 2_00_9000\b/);
  assert.doesNotMatch(content, /versionCode 0/);
});

test('keeps prerelease names and reserves stable version codes', (t) => {
  const file = withGradleFile(t);
  syncAndroidVersion({ gradleFilePath: file, version: '0.3.0-rc.2' });
  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /versionName "0\.3\.0-rc\.2"/);
  assert.match(content, /versionCode 3_00_0002\b/);
});

test('preserves the per-push CI version code while syncing the product version', (t) => {
  const file = withGradleFile(t);
  syncAndroidVersion({
    gradleFilePath: file,
    version: '0.2.0',
    versionCodeOverride: '2009001',
  });
  assert.match(fs.readFileSync(file, 'utf8'), /versionCode 2009001\b/);
  assert.match(fs.readFileSync(file, 'utf8'), /versionName "0\.2\.0"/);
});

test('rejects invalid Play version codes without changing the native project', (t) => {
  const file = withGradleFile(t);
  const original = fs.readFileSync(file, 'utf8');
  for (const versionCodeOverride of ['0', '-1', '1.5', '002', '2100000001', 'abc']) {
    assert.throws(
      () =>
        syncAndroidVersion({
          gradleFilePath: file,
          version: '0.2.0',
          versionCodeOverride,
        }),
      /ANDROID_VERSION_CODE/,
    );
    assert.equal(fs.readFileSync(file, 'utf8'), original);
  }
});
