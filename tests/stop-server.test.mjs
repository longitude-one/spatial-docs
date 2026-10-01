import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverPids, belongsToRepository } from '../scripts/stop-server.mjs';

test('selects only Node Docusaurus development and preview servers', () => {
  assert.deepEqual(serverPids(`
10 /opt/bin/node node /repo/node_modules/.bin/docusaurus start --port 3001
11 node node /repo/node_modules/@docusaurus/core/bin/docusaurus.mjs serve
12 node node /repo/node_modules/.bin/docusaurus build
13 node node unrelated-server.js start
14 npm npm exec docusaurus start
15 node node scripts/stop-server.mjs
`), [10, 11]);
});

test('requires an exact repository working directory', () => {
  assert.equal(belongsToRepository('p10\nn/repo\n', '/repo'), true);
  assert.equal(belongsToRepository('p10\nn/repo-other\n', '/repo'), false);
  assert.equal(belongsToRepository('p10\nn/repo/nested\n', '/repo'), false);
  assert.equal(belongsToRepository('', '/repo'), false);
});
