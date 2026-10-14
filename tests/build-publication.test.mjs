import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPublication } from '../scripts/build-publication.mjs';

async function fixture(t, existing = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atomic-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  if (existing) {
    await mkdir(path.join(root, 'build'));
    await writeFile(path.join(root, 'build/previous.txt'), 'valid previous corpus');
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
    assert.equal(await readFile(path.join(root, 'build/assets/example.txt'), 'utf8'), 'verified asset');
    assert.deepEqual(await readdir(root), ['build']);
  });
}
test('failed build or validation retains the complete previous corpus', async (t) => {
  const root = await fixture(t);
  await assert.rejects(buildPublication(root, async (_, stage) => {
    await writeFile(path.join(stage, 'partial.txt'), 'invalid');
    throw new Error('unsafe SVG or failed build');
  }), /unsafe SVG/);
  assert.equal(await readFile(path.join(root, 'build/previous.txt'), 'utf8'), 'valid previous corpus');
  assert.deepEqual(await readdir(root), ['build']);
});
test('promotion failure restores the previous corpus', async (t) => {
  const root = await fixture(t);
  await assert.rejects(buildPublication(root, async (_, stage) => rm(stage, { recursive: true })), /ENOENT/);
  assert.equal(await readFile(path.join(root, 'build/previous.txt'), 'utf8'), 'valid previous corpus');
  assert.deepEqual(await readdir(root), ['build']);
});
