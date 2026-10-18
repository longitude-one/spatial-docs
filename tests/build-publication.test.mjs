import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, stat, symlink, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPublication, assemblePublication } from '../scripts/build-publication.mjs';

async function fixture(t, existing = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atomic-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  if (existing) {
    await mkdir(path.join(root, 'public'));
    await writeFile(path.join(root, 'public/previous.txt'), 'valid previous corpus');
  }
  return root;
}
for (const existing of [false, true]) {
  test(`promotes a complete verified corpus atomically (previous=${existing})`, async (t) => {
    const root = await fixture(t, existing);
    await buildPublication(root, async (_, stage) => {
      await mkdir(path.join(stage, 'assets'));
      await writeFile(path.join(stage, 'assets/example.txt'), 'verified asset');
      await writeFile(path.join(stage, 'index.html'), 'verified documentation');
    });
    assert.equal(await readFile(path.join(root, 'public/assets/example.txt'), 'utf8'), 'verified asset');
    assert.deepEqual(await readdir(root), ['.publication-metadata', 'public']);
  });
}
test('failed build or validation retains the complete previous corpus', async (t) => {
  const root = await fixture(t);
  await assert.rejects(buildPublication(root, async (_, stage) => {
    await writeFile(path.join(stage, 'partial.txt'), 'invalid');
    throw new Error('unsafe SVG or failed build');
  }), /unsafe SVG/);
  assert.equal(await readFile(path.join(root, 'public/previous.txt'), 'utf8'), 'valid previous corpus');
  assert.deepEqual(await readdir(root), ['public']);
});
test('promotion failure restores the previous corpus', async (t) => {
  const root = await fixture(t);
  await assert.rejects(buildPublication(root, async (_, stage) => rm(stage, { recursive: true })), /ENOENT/);
  assert.equal(await readFile(path.join(root, 'public/previous.txt'), 'utf8'), 'valid previous corpus');
  assert.deepEqual(await readdir(root), ['public']);
});

async function assemblyFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'assembly-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const intermediate = path.join(root, 'build');
  const destination = path.join(root, 'candidate');
  await mkdir(path.join(root, '.generated-markdown'), { recursive: true });
  await writeFile(path.join(root, '.generated-markdown/asset-manifest.json'), JSON.stringify({ 'assets/examples/point.json': {} }));
  const files = {
    'index.html': 'HTML', 'index.md': 'Markdown', 'llms.txt': 'Index', 'llms-full.txt': 'Complete', '404.html': 'Missing',
    'assets/examples/point.json': '{}', 'assets/js/main.123abc.js': 'runtime',
    'assets/css/styles.123abc.css': 'styles', 'search-index-123abc.json': '{}', 'sitemap.xml': '<xml/>',
    'asset-manifest.json': '{}', 'markdown-mapping.json': '{}', 'documentation-manifest.json': '{}',
    'validation-report.json': '{}', 'ast.json': '{}', 'debug.log': 'internal',
    'assets/js/main.123abc.js.map': '{}', '.cache/leak.html': 'cache', 'temporary.txt': 'internal',
  };
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(intermediate, file)), { recursive: true });
    await writeFile(path.join(intermediate, file), content);
    await chmod(path.join(intermediate, file), 0o755);
  }
  return { root, intermediate, destination, files };
}

test('assembles only served resources, preserving bytes and normalizing executable permissions', async (t) => {
  const { root, intermediate, destination, files } = await assemblyFixture(t);
  await assemblePublication(root, intermediate, destination);
  const { corpusFiles } = await import('../scripts/validate-corpus.mjs');
  const expected = ['index.html', 'index.md', 'llms.txt', 'llms-full.txt', '404.html', 'assets/examples/point.json',
    'assets/js/main.123abc.js', 'assets/css/styles.123abc.css', 'search-index-123abc.json', 'sitemap.xml'].sort();
  assert.deepEqual(await corpusFiles(destination), expected);
  for (const file of expected) {
    assert.equal(await readFile(path.join(destination, file), 'utf8'), files[file]);
    assert.equal((await stat(path.join(destination, file))).mode & 0o777, 0o644);
    assert.equal((await stat(path.join(intermediate, file))).mode & 0o777, 0o755);
  }
  for (const directory of ['', 'assets', 'assets/examples']) assert.equal((await stat(path.join(destination, directory))).mode & 0o777, 0o755);
});

test('assembly rejects symbolic links rather than following them into the public corpus', async (t) => {
  const { root, intermediate, destination } = await assemblyFixture(t);
  await symlink(path.join(intermediate, 'index.html'), path.join(intermediate, 'linked.html'));
  await assert.rejects(assemblePublication(root, intermediate, destination), /Symbolic links/);
});

test('metadata promotion failure rolls back both the public corpus and its matching internal metadata', async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, '.publication-metadata'));
  await writeFile(path.join(root, '.publication-metadata/version'), 'previous manifest');
  await assert.rejects(buildPublication(root, async (_, stage, metadata) => {
    await writeFile(path.join(stage, 'index.html'), 'new corpus');
    await rm(metadata, { recursive: true });
  }), /ENOENT/);
  assert.equal(await readFile(path.join(root, 'public/previous.txt'), 'utf8'), 'valid previous corpus');
  assert.equal(await readFile(path.join(root, '.publication-metadata/version'), 'utf8'), 'previous manifest');
});

test('promotion preserves the exact already-validated file bytes and timestamps', async (t) => {
  const root = await fixture(t);
  let validated;
  await buildPublication(root, async (_, stage) => {
    await writeFile(path.join(stage, 'index.html'), 'validated bytes');
    validated = await stat(path.join(stage, 'index.html'));
  });
  const published = await stat(path.join(root, 'public/index.html'));
  assert.equal(published.mtimeMs, validated.mtimeMs);
  assert.equal(published.ino, validated.ino);
  assert.equal(await readFile(path.join(root, 'public/index.html'), 'utf8'), 'validated bytes');
});
