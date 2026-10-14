import test from 'node:test';
import assert from 'node:assert/strict';
import remarkSharedAssets, { sharedAssetUrl } from '../scripts/remark-shared-assets.mjs';

for (const baseUrl of ['/', '/spatial-docs/']) {
  test(`shared assets bypass bundling with a single static identity at ${baseUrl}`, () => {
    for (const [source, reference] of [
      ['index.md', './assets/images/model.svg'],
      ['shared/guide.md', '../assets/images/model.svg'],
      ['spatial-core/v1/index.md', '../../assets/images/model.svg'],
    ]) {
      assert.equal(sharedAssetUrl(source, reference, baseUrl), `pathname://${baseUrl}assets/images/model.svg`);
    }
    assert.equal(sharedAssetUrl('shared/guide.md', '../assets/downloads/data.csv?next=../../somewhere#sample', baseUrl),
      `pathname://${baseUrl}assets/downloads/data.csv?next=../../somewhere#sample`);
    assert.equal(sharedAssetUrl('shared/guide.md', '../assets/downloads/data.csv?raw=1#sample', baseUrl),
      `pathname://${baseUrl}assets/downloads/data.csv?raw=1#sample`);
  });
}

test('rewrites AST asset links, images and definitions without altering code or document links', () => {
  const tree = { type: 'root', children: [
    { type: 'image', url: '../assets/images/model.svg' },
    { type: 'link', url: '../assets/schemas/model.json' },
    { type: 'definition', url: '../assets/examples/model.geojson' },
    { type: 'link', url: './other.md' },
    { type: 'code', value: '![Model](../assets/images/model.svg)' },
  ] };
  remarkSharedAssets({ docsDirectory: '/repo/docs', baseUrl: '/' })(tree, { path: '/repo/docs/shared/guide.md' });
  assert.deepEqual(tree.children.slice(0, 3).map((node) => node.url), [
    'pathname:///assets/images/model.svg', 'pathname:///assets/schemas/model.json', 'pathname:///assets/examples/model.geojson',
  ]);
  assert.equal(tree.children[3].url, './other.md');
  assert.equal(tree.children[4].value, '![Model](../assets/images/model.svg)');
  for (const url of ['https://example.org/model.svg', '#section', '/assets/model.svg', '../concepts/crs.md']) {
    assert.equal(sharedAssetUrl('shared/guide.md', url, '/'), null);
  }
});
