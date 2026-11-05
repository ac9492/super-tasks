'use strict';

const { TAG_PREFIX, STABLE_TAG_PATTERN } = require('./release-version');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const parsePackageVersion = (value) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value);
  if (!match) {
    throw new Error(`Invalid package version: ${value}`);
  }
  return match.slice(1).map(Number);
};

const parseStableTag = (tag) => {
  return STABLE_TAG_PATTERN.test(tag)
    ? tag.slice(TAG_PREFIX.length).split('.').map(Number)
    : null;
};

const compareVersions = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return 0;
};

const computeNextTestflightVersion = (packageVersion, tags) => {
  let latest = parsePackageVersion(packageVersion);
  for (const tag of tags) {
    const parsed = parseStableTag(tag);
    if (parsed && compareVersions(parsed, latest) > 0) {
      latest = parsed;
    }
  }

  const nextPatch = latest[2] + 1;
  if (!Number.isSafeInteger(nextPatch)) {
    throw new Error('TestFlight patch version exceeds the safe integer range');
  }
  return `${latest[0]}.${latest[1]}.${nextPatch}`;
};

const main = () => {
  const packagePath = process.argv[2] || 'package.json';
  const mergedRef = process.argv[3];
  const packageVersion = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
  const tagArgs = ['tag'];
  if (mergedRef) {
    tagArgs.push('--merged', mergedRef);
  }
  tagArgs.push('--list', `${TAG_PREFIX}*`);
  const tags = execFileSync('git', tagArgs, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  process.stdout.write(`${computeNextTestflightVersion(packageVersion, tags)}\n`);
};

if (require.main === module) {
  main();
}

module.exports = { computeNextTestflightVersion };
