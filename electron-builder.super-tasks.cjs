// Fork-only packaging identity; upstream release configuration remains reusable.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { load } = require('js-yaml');

const config = load(readFileSync(join(__dirname, 'electron-builder.yaml'), 'utf8'));
config.appId = 'io.github.ac9492.supertasks';
config.productName = 'Super Tasks';
config.artifactName = 'Super-Tasks-${version}-${os}-${arch}.${ext}';
config.directories.output = '.tmp/super-tasks-builds';
config.publish = null;
config.win.publish = null;
config.nsis.artifactName = 'Super-Tasks-Setup-${version}-${arch}.${ext}';
config.portable.artifactName = 'Super-Tasks-Portable-${version}-${arch}.${ext}';
config.mac.appId = config.appId;
// Re-sign the renamed Electron bundle; skipping signing leaves an invalid
// upstream signature and can produce macOS's misleading "damaged" message.
config.mac.identity = '-';
config.mac.artifactName = 'Super-Tasks-${version}-mac-${arch}-adhoc.${ext}';
config.mac.notarize = false;
config.mac.publish = null;
delete config.mac.provisioningProfile;
config.mac.extendInfo.NSAppleEventsUsageDescription =
  'Super Tasks reads the frontmost app and window title to suggest which task to track.';
config.dmg.sign = false;
config.dmg.publish = null;
config.protocols = [{ name: 'Super Tasks', schemes: ['supertasks'] }];
module.exports = config;
