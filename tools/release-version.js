'use strict';

// Product release tags are separate from the inherited Super Productivity tags.
const TAG_PREFIX = 'ultra-tasks-v';
const STABLE_TAG_PATTERN = /^ultra-tasks-v\d+\.\d+\.\d+$/;
const RELEASE_TAG_PATTERN = /^ultra-tasks-v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const getReleaseInfo = (tag) => {
  if (!RELEASE_TAG_PATTERN.test(tag)) {
    return null;
  }
  return {
    version: tag.slice(TAG_PREFIX.length),
    stable: STABLE_TAG_PATTERN.test(tag),
    prerelease: !STABLE_TAG_PATTERN.test(tag),
  };
};

if (require.main === module) {
  const release = getReleaseInfo(process.env.GITHUB_REF_NAME || '');
  if (release && release.version !== require('../package.json').version) {
    throw new Error('Release tag must match the version in package.json');
  }
  console.log(`stable=${release?.stable || false}`);
  console.log(`prerelease=${release?.prerelease || false}`);
}

module.exports = { TAG_PREFIX, STABLE_TAG_PATTERN, RELEASE_TAG_PATTERN, getReleaseInfo };
