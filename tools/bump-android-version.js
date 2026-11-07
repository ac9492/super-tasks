const fs = require('fs');
const path = require('path');
const { generateReleaseNotes, getAndroidVersionInfo } = require('./release-notes');

const syncAndroidVersion = ({ gradleFilePath, version, versionCodeOverride = '' }) => {
  const info = getAndroidVersionInfo(version);
  if (
    versionCodeOverride !== '' &&
    (!/^[1-9]\d*$/.test(versionCodeOverride) || Number(versionCodeOverride) > 2100000000)
  ) {
    throw new Error('ANDROID_VERSION_CODE must be an integer from 1 to 2100000000');
  }
  const code = versionCodeOverride || info.versionCodeWithUnderscores;
  const content = fs.readFileSync(gradleFilePath, 'utf8');
  const updated = content
    .replace(/versionCode [\d_]+/g, `versionCode ${code}`)
    .replace(/versionName "[^"]+"/g, `versionName "${version}"`);
  fs.writeFileSync(gradleFilePath, updated, 'utf8');
  console.log(`Updated build.gradle to version ${version} (code ${code})`);
  return info;
};

if (require.main === module) {
  const version = require('../package.json').version;
  const { isPreRelease, versionCode } = syncAndroidVersion({
    gradleFilePath: path.join(__dirname, '..', 'android', 'app', 'build.gradle'),
    version,
    // CI's per-main-push code is derived from the last stable fork tag.
    versionCodeOverride: process.env.ANDROID_VERSION_CODE || '',
  });
  if (!process.argv.includes('--skip-release-notes')) {
    generateReleaseNotes({ version, isPreRelease, versionCode });
  }
}

module.exports = { syncAndroidVersion };
