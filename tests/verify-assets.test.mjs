import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { collectSharedAssets } from '../scripts/shared-assets.mjs';
import { verifyPublishedAssets } from '../scripts/verify-assets.mjs';

async function fixture(t, baseUrl = '/') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'verify-assets-'));
  const build = path.join(root, 'build');
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'static/assets/downloads'), { recursive: true });
  await mkdir(path.join(build, 'assets/downloads'), { recursive: true });
  await mkdir(path.join(build, 'shared'), { recursive: true });
  for (const name of ['first.txt', 'second.txt']) {
    await writeFile(path.join(root, 'static/assets/downloads', name), 'identical bytes\n');
    await copyFile(path.join(root, 'static/assets/downloads', name), path.join(build, 'assets/downloads', name));
  }
  const manifest = await collectSharedAssets(root);
  await writeFile(path.join(build, 'asset-manifest.json'), JSON.stringify(manifest));
  const markdown = '[first](../assets/downloads/first.txt)\n\n[second][download]\n\n[download]: ../assets/downloads/second.txt';
  const documents = new Map([['shared/page.md', { tree: unified().use(remarkParse).parse(markdown) }]]);
  await writeFile(path.join(build, 'shared/page.html'), `<!doctype html><html><head><title>Assets</title></head><body><a href="${baseUrl}assets/downloads/first.txt">First</a><a href="../assets/downloads/second.txt">Second</a></body></html>`);
  return { root, build, documents, manifest, baseUrl };
}
for (const baseUrl of ['/', '/spatial-docs/']) {
  test(`verify distinct source identities with identical bytes under ${baseUrl}`, async (t) => {
    const context = await fixture(t, baseUrl);
    assert.equal(Object.keys(context.manifest).length, 2);
    assert.equal(context.manifest['assets/downloads/first.txt'].sha256, context.manifest['assets/downloads/second.txt'].sha256);
    await verifyPublishedAssets(context.root, context.build, context.documents, baseUrl);
  });
}
test('reject a modified generated manifest', async (t) => {
  const { root, build, documents, manifest, baseUrl } = await fixture(t);
  delete manifest['assets/downloads/second.txt'];
  await writeFile(path.join(build, 'asset-manifest.json'), JSON.stringify(manifest));
  await assert.rejects(verifyPublishedAssets(root, build, documents, baseUrl), /manifest differs/);
});
test('reject source asset mutation after publication', async (t) => {
  const { root, build, documents, baseUrl } = await fixture(t);
  await writeFile(path.join(root, 'static/assets/downloads/first.txt'), 'changed source\n');
  await assert.rejects(verifyPublishedAssets(root, build, documents, baseUrl), /manifest differs/);
});
test('reject a missing published asset even when its identity remains in the manifest', async (t) => {
  const { root, build, documents, baseUrl } = await fixture(t);
  await rm(path.join(build, 'assets/downloads/second.txt'));
  await assert.rejects(verifyPublishedAssets(root, build, documents, baseUrl), /ENOENT/);
});
test('reject modified published bytes', async (t) => {
  const { root, build, documents, baseUrl } = await fixture(t);
  await writeFile(path.join(build, 'assets/downloads/second.txt'), 'changed publication\n');
  await assert.rejects(verifyPublishedAssets(root, build, documents, baseUrl), /Published asset bytes differ/);
});
for (const baseUrl of ['/', '/spatial-docs/']) {
  test(`reject HTML referencing another identical asset instead of Markdown identity under ${baseUrl}`, async (t) => {
    const { root, build, documents } = await fixture(t, baseUrl);
    const htmlPath = path.join(build, 'shared/page.html');
    const html = await readFile(htmlPath, 'utf8');
    await writeFile(htmlPath, html.replaceAll('second.txt', 'first.txt'));
    await assert.rejects(verifyPublishedAssets(root, build, documents, baseUrl), /HTML does not reference.*second.txt/);
  });
}
test('external HTML asset URLs cannot substitute for local shared asset identity', async (t) => {
  const { root, build, documents, baseUrl } = await fixture(t);
  await writeFile(path.join(build, 'shared/page.html'), '<!doctype html><html><head><title>Assets</title></head><body><a href="https://example.com/assets/downloads/first.txt">First</a><a href="../assets/downloads/second.txt">Second</a></body></html>');
  await assert.rejects(verifyPublishedAssets(root, build, documents, baseUrl), /HTML does not reference.*first.txt/);
});

test('reject extra HTML asset references absent from the shared manifest', async (t) => {
  const { root, build, documents, baseUrl } = await fixture(t);
  const html = await readFile(path.join(build, 'shared/page.html'), 'utf8');
  await writeFile(path.join(build, 'shared/page.html'), html.replace('</body>', '<article><img src="../assets/missing.svg"></article></body>'));
  await assert.rejects(verifyPublishedAssets(root, build, documents, baseUrl), /unknown shared asset/);
});


test('reject published asset symlinks even for unreferenced files', async (t) => {
  const { root, build, baseUrl } = await fixture(t);
  await rm(path.join(build, 'assets/downloads/first.txt'));
  await symlink(path.join(root, 'static/assets/downloads/first.txt'), path.join(build, 'assets/downloads/first.txt'));
  await assert.rejects(verifyPublishedAssets(root, build, new Map(), baseUrl), /symbolic links/);
});
