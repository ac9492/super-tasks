'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeNextTestflightVersion } = require('./ios-testflight-version');

test('increments the trusted package patch when it is newest', () => {
  assert.equal(
    computeNextTestflightVersion('18.22.0', [
      'super-tasks-v18.21.2',
      'super-tasks-v18.22.0',
    ]),
    '18.22.1',
  );
});

test('increments the highest stable tag when it is newer than the package', () => {
  assert.equal(
    computeNextTestflightVersion('18.21.2', [
      'super-tasks-v18.22.0',
      'super-tasks-v18.21.3',
    ]),
    '18.22.1',
  );
});

test('strips package prerelease suffix and compares numeric components', () => {
  assert.equal(
    computeNextTestflightVersion('18.9.0-RC.1', [
      'super-tasks-v18.10.0',
      'super-tasks-v18.11.0-beta.1',
    ]),
    '18.10.1',
  );
});

test('ignores non-stable and malformed tags', () => {
  assert.equal(
    computeNextTestflightVersion('18.22.0', [
      'super-tasks-v18.22.1-rc.0',
      'not-a-version',
    ]),
    '18.22.1',
  );
});

test('rejects a malformed package version', () => {
  assert.throws(
    () => computeNextTestflightVersion('18.22', ['super-tasks-v18.22.0']),
    /package/,
  );
});

test('inherited upstream tags cannot advance the fork version', () => {
  assert.equal(
    computeNextTestflightVersion('0.1.0', ['v19.1.0', 'v99.0.0', 'super-tasks-v0.1.0']),
    '0.1.1',
  );
});
