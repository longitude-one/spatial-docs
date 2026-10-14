import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { collectSharedAssets, validateAssetReferences } from '../scripts/shared-assets.mjs';

async function fixture(t, files = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shared-assets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, 'static/assets', name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return root;
}
function documents(markdown) {
  return new Map([['shared/page.md', { tree: unified().use(remarkParse).parse(markdown) }]]);
}
test('manifest preserves hierarchy, distinct identities and deterministic hashes including orphan assets', async (t) => {
  const root = await fixture(t, { 'examples/b.txt': 'same', 'examples/a.txt': 'same' });
  const manifest = await collectSharedAssets(root);
  assert.deepEqual(Object.keys(manifest), ['assets/examples/a.txt', 'assets/examples/b.txt']);
  assert.equal(manifest['assets/examples/a.txt'].sha256, manifest['assets/examples/b.txt'].sha256);
  assert.equal(manifest['assets/examples/a.txt'].source, 'static/assets/examples/a.txt');
  assert.equal(manifest['assets/examples/a.txt'].type, 'txt');
  assert.deepEqual(manifest, await collectSharedAssets(root));
});
test('absent assets hierarchy is valid', async (t) => {
  assert.deepEqual(await collectSharedAssets(await fixture(t)), {});
});
for (const name of ['Upper/file.txt', 'bad name.txt', 'con.txt', 'bad?.txt', 'trailing./a.txt', 'script.js']) {
  test(`reject nonportable or unsupported asset ${name}`, async (t) => {
    await assert.rejects(collectSharedAssets(await fixture(t, { [name]: 'text' })), /portable|Unsupported/);
  });
}
test('reject asset file and root symbolic links', async (t) => {
  const root = await fixture(t, { 'real.txt': 'text' });
  await symlink('real.txt', path.join(root, 'static/assets/link.txt'));
  await assert.rejects(collectSharedAssets(root), /symbolic/);
  const second = await fixture(t);
  await mkdir(path.join(second, 'static'));
  await symlink(path.join(root, 'static/assets'), path.join(second, 'static/assets'));
  await assert.rejects(collectSharedAssets(second), /symbolic/);
});
for (const [type, content] of Object.entries({
  json: '{bad}', geojson: '{bad}', yaml: 'a: [', xml: '<root><bad></root>', svg: '<svg><g></svg>',
  png: 'fake', jpg: 'fake', jpeg: 'fake', webp: 'fake', pdf: 'fake', txt: Buffer.from([255]),
})) {
  test(`reject invalid ${type} content`, async (t) => {
    await assert.rejects(collectSharedAssets(await fixture(t, { [`file.${type}`]: content })), /Invalid shared asset/);
  });
}
for (const content of [
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  '<svg onload="alert(1)"/>', '<svg><foreignObject/></svg>',
  '<svg><use href="https://example.com/a.svg#x"/></svg>',
  '<svg><a href="java&#x73;cript:alert(1)"/></svg>',
  '<svg><rect style="fill:url(https://example.com/a)"/></svg>',
  '<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>',
  '<!DOCTYPE svg [<!ENTITY a "text">]><svg/>',
]) {
  test(`reject unsafe SVG ${content}`, async (t) => {
    await assert.rejects(collectSharedAssets(await fixture(t, { 'unsafe.svg': content })), /Unsafe|forbidden/);
  });
}
test('valid SVG, structured text and downloadable code remain byte-identifiable', async (t) => {
  const root = await fixture(t, {
    'diagram.svg': '<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="p" d="M0 0"/></defs><use href="#p"/></svg>',
    'schema.xml': '<?xml version="1.0"?><root/>', 'data.json': '{}', 'data.geojson': '{}',
    'data.yaml': 'key: value', 'example.php': '<?php echo 1;', 'example.sql': 'SELECT 1;',
  });
  assert.equal(Object.keys(await collectSharedAssets(root)).length, 7);
});
test('AST validates inline and reference assets while ignoring fenced examples and intentional external resources', async (t) => {
  const root = await fixture(t, { 'image.svg': '<svg/>', 'example.sql': 'SELECT 1;' });
  const manifest = await collectSharedAssets(root);
  await validateAssetReferences(documents('![image](../assets/image.svg)\n\n[download][sql]\n\n[sql]: ../assets/example.sql\n\n![external](https://example.com/image.svg)\n\n[page](other.md#anchor)\n\n```md\n![missing](missing.png)\n```'), { staticDirectory: path.join(root, 'static'), manifest });
});
for (const markdown of [
  '![x](../assets/missing.png)', '[x](../assets/missing.sql)', '![x](../assets/Image.svg)',
  '![x](/assets/image.svg)', '[x](../../package.json)', '![x](../img/image.svg)',
  '![x](data:image/png;base64,abc)', '[x](data:text/plain,abc)',
  '![x][asset]\n\n[asset]: ../assets/missing.svg', '[x](../assets/%49mage.svg)',
]) {
  test(`reject invalid asset reference ${markdown}`, async (t) => {
    const root = await fixture(t, { 'image.svg': '<svg/>' });
    await assert.rejects(validateAssetReferences(documents(markdown), { staticDirectory: path.join(root, 'static'), manifest: await collectSharedAssets(root) }), /Invalid shared asset reference/);
  });
}
test('reference validation independently rejects symlinks even with a forged manifest', async (t) => {
  const root = await fixture(t, { 'real.txt': 'text' });
  await symlink('real.txt', path.join(root, 'static/assets/link.txt'));
  await assert.rejects(validateAssetReferences(documents('[x](../assets/link.txt)'), { staticDirectory: path.join(root, 'static'), manifest: { 'assets/link.txt': {} } }), /symbolic/);
});

test('reject multiple XML roots and CSS-obfuscated SVG style', async (t) => {
  for (const [name, content] of Object.entries({ 'multiple.xml': '<a/><b/>', 'multiple.svg': '<svg/><svg/>', 'css.svg': '<svg><rect style="fill:red"/></svg>' })) {
    await assert.rejects(collectSharedAssets(await fixture(t, { [name]: content })), /Invalid shared asset/);
  }
});

test('reject symlinked static parent in collection and reference validation', async (t) => {
  const real = await fixture(t, { 'real.txt': 'text' });
  const root = await fixture(t);
  await symlink(path.join(real, 'static'), path.join(root, 'static'));
  await assert.rejects(collectSharedAssets(root), /symbolic/);
  await assert.rejects(validateAssetReferences(documents('[x](../assets/real.txt)'), { staticDirectory: path.join(root, 'static'), manifest: { 'assets/real.txt': {} } }), /symbolic/);
});
for (const content of [
  '<svg><rect fill="u\\72l(https://example.com/a)"/></svg>',
  '<svg><mpath href="#x"/></svg>', '<svg><discard/></svg>',
  '<svg xmlns:x="http://example.com"><x:other/></svg>',
]) {
  test(`reject escaped CSS or unsafe SVG namespace/animation ${content}`, async (t) => {
    await assert.rejects(collectSharedAssets(await fixture(t, { 'unsafe.svg': content })), /Unsafe/);
  });
}

test('same-origin absolute asset URLs must use portable relative references', async (t) => {
  const root = await fixture(t, { 'image.svg': '<svg/>' });
  const manifest = await collectSharedAssets(root);
  await assert.rejects(validateAssetReferences(documents('![x](https://docs.example/assets/image.svg)'), {
    staticDirectory: path.join(root, 'static'), manifest, siteUrl: 'https://docs.example',
  }), /must be relative/);
});
