import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  discoverLibraries, currentStableMajor, fetchStableMajor, resolveLibraries,
  statusFor, markdownStatus, gitSiteVersion,
} from '../scripts/library-versions.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'library-versions-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const docs = path.join(root, 'docs');
  for (const directory of ['about', 'spatial-core/v1', 'spatial-core/v2', 'spatial-core/v3',
    'spatial-decoder/v1', 'spatial-decoder/v01', 'spatial-decoder/v0', 'spatial-decoder/V2']) {
    await mkdir(path.join(docs, directory), { recursive: true });
  }
  await writeFile(path.join(docs, 'spatial-core/roadmap.md'), 'roadmap');
  return docs;
}

function reply(status, versions, name = 'longitude-one/spatial-core') {
  return { status, ok: status === 200, json: async () => ({ packages: { [name]: versions.map((version) => ({ version })) } }) };
}

test('discovers direct versioned libraries and optional roadmaps', async (t) => {
  const docs = await fixture(t);
  assert.deepEqual(await discoverLibraries(docs), {
    'spatial-core': { majors: [1, 2, 3], roadmap: true },
    'spatial-decoder': { majors: [1], roadmap: false },
  });
});

test('stable versions ignore prereleases and classify two libraries independently', async (t) => {
  const docs = await fixture(t);
  const requested = [];
  const libraries = await resolveLibraries(docs, async (url) => {
    requested.push(url);
    return url.includes('spatial-core')
      ? reply(200, ['1.8.2', '2.0.0-beta.1', '2.0.0-RC1', '2.0.x-dev'])
      : { status: 404, ok: false };
  });
  assert.deepEqual(requested, [
    'https://repo.packagist.org/p2/longitude-one/spatial-core.json',
    'https://repo.packagist.org/p2/longitude-one/spatial-decoder.json',
  ]);
  assert.deepEqual(libraries['spatial-core'].versions, { v1: 'Current', v2: 'Next', v3: 'Next' });
  assert.deepEqual(libraries['spatial-decoder'].versions, { v1: 'Next' });
  assert.equal(statusFor('spatial-core/v1/geometry/point.md', libraries).status, 'Current');
  assert.equal(statusFor('spatial-core/roadmap.md', libraries), null);
  assert.match(markdownStatus(statusFor('spatial-core/v1/geometry/point.md', libraries), 'spatial-core/v1/geometry/point.md'), /\.\.\/\.\.\/roadmap\.md/);
  assert.doesNotMatch(markdownStatus(statusFor('spatial-decoder/v1/index.md', libraries), 'spatial-decoder/v1/index.md'), /roadmap/);
});

test('a new stable major changes status without source edits', async (t) => {
  const docs = await fixture(t);
  const libraries = await resolveLibraries(docs, async (url) => url.includes('spatial-core')
    ? reply(200, ['1.8.2', '2.0.0']) : { status: 404, ok: false });
  assert.deepEqual(libraries['spatial-core'].versions, { v1: 'Older', v2: 'Current', v3: 'Next' });
});

test('package without stable releases has only Next documentation', async () => {
  assert.equal(await fetchStableMajor('spatial-core', async () => reply(200, ['dev-main', '1.0.0-beta.1'])), null);
  assert.equal(currentStableMajor(['1.2.0', '1.11.0', '2.0.0-RC1'].map((version) => ({ version }))), 1);
});

test('missing current stable major fails', async (t) => {
  const docs = await fixture(t);
  await assert.rejects(resolveLibraries(docs, async (url) => url.includes('spatial-core')
    ? reply(200, ['4.0.0']) : { status: 404, ok: false }), /current stable major v4/);
});

for (const [name, fetcher] of [
  ['network failure', async () => { throw new Error('offline'); }],
  ['server failure', async () => ({ status: 503, ok: false })],
  ['invalid JSON', async () => ({ status: 200, ok: true, json: async () => { throw new Error('bad JSON'); } })],
  ['unusable response', async () => ({ status: 200, ok: true, json: async () => ({ packages: {} }) })],
  ['uninterpretable version', async () => reply(200, ['unusual-release'])],
]) {
  test(`rejects Packagist ${name}`, async () => {
    await assert.rejects(fetchStableMajor('spatial-core', fetcher));
  });
}

test('detects development website version', async () => {
  assert.equal(await gitSiteVersion(process.cwd(), { DOCUSAURUS_DEPLOYMENT: 'development' }), 'Development documentation');
});

test('a SemVer tag at HEAD identifies the official documentation version', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'site-version-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  await run('git', ['init', '-q', root]);
  await run('git', ['-C', root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false',
    'commit', '--allow-empty', '-qm', 'Initial']);
  assert.equal(await gitSiteVersion(root, {}), 'Development documentation');
  await run('git', ['-C', root, 'tag', '1.4.0']);
  assert.equal(await gitSiteVersion(root, {}), 'Documentation version 1.4.0');
});

test('HTML status plugin marks every versioned page and links the HTML roadmap', async () => {
  const { default: plugin } = await import('../scripts/remark-version-status.mjs');
  const docsDirectory = path.join(process.cwd(), 'docs');
  const libraries = { 'spatial-core': { roadmap: true, versions: { v1: 'Current' } } };
  const tree = { children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Body' }] }] };
  plugin({ libraries, docsDirectory })(tree, { path: path.join(docsDirectory, 'spatial-core/v1/geometry/point.md') });
  assert.equal(tree.children[0].type, 'blockquote');
  assert.match(tree.children[0].children[0].children[1].value, /current major version of spatial-core/);
  assert.equal(tree.children[0].children[1].children[0].attributes[0].value, 'pathname:///spatial-core/roadmap.html');
  const plain = { children: [] };
  plugin({ libraries, docsDirectory })(plain, { path: path.join(docsDirectory, 'spatial-core/roadmap.md') });
  assert.deepEqual(plain.children, []);
});
