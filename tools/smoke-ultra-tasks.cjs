// Launch only with an isolated profile; never reads an installed app's task data.
const { _electron: electron } = require('playwright');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
(async () => {
  const profile = mkdtempSync(join(tmpdir(), 'ultra-tasks-smoke-'));
  const app = await electron.launch({
    executablePath: process.argv[2],
    args: ['--user-data-dir=' + profile, '--no-sandbox'],
    timeout: 60000,
  });
  try {
    const identity = await app.evaluate(({ app }) => ({
      name: app.getName(),
      profile: app.getPath('userData'),
    }));
    if (identity.name !== 'Ultra Tasks' || identity.profile !== profile) {
      throw new Error('Unexpected application identity: ' + JSON.stringify(identity));
    }
    const window = await app.firstWindow();
    await window.waitForSelector('body', { timeout: 60000 });
    await window.waitForFunction(() => document.title.includes('Ultra Tasks'), null, {
      timeout: 60000,
    });
    console.log('Ultra Tasks native launch passed with an isolated profile.');
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
