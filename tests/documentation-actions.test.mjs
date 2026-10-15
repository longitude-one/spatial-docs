import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentationActions } from '../scripts/documentation-actions.mjs';
import { verifyRepresentationLinks } from '../scripts/representation-links.mjs';

const published = ['index.md', 'standards/iso/index.md', 'spatial-core/v1/geometry/point.md',
  'spatial-core/v2/geometry/point.md', 'spatial-core/v3/geometry/point.md'];

for (const page of published) {
  test(`actions preserve the exact document identity: ${page}`, () => {
    assert.deepEqual(documentationActions(`@site/docs/${page}`, published), {
      markdown: `./${page.split('/').pop()}`,
      edit: `https://github.com/longitude-one/spatial-docs/edit/main/docs/${page}`,
    });
  });
}
test('historical, Current and Next contexts never redirect to another major or artifact', () => {
  for (const version of ['v1', 'v2', 'v3']) {
    const page = `spatial-core/${version}/geometry/point.md`;
    const actions = documentationActions(`@site/docs/${page}`, published);
    assert.ok(actions.edit.endsWith(`/docs/${page}`));
    assert.ok(!actions.edit.includes('.html') && !actions.edit.includes('.generated-markdown'));
    assert.equal(actions.markdown, './point.md');
  }
});
test('non-editable source documents retain their Markdown action', () => {
  assert.deepEqual(documentationActions('@site/docs/index.md', published, { custom_edit_url: null }), {
    markdown: './index.md', edit: null,
  });
});
test('generated, unpublished and invalid source identities have no contextual actions', () => {
  for (const source of [undefined, '@site/src/pages/search.js', '@site/.generated-markdown/index.md',
    '@site/docs/missing.md', '@site/docs/../index.md', '@site/docs/Point.md']) {
    assert.equal(documentationActions(source, [...published, '../index.md', 'Point.md']), null, source);
  }
});
test('grouped edit and Markdown actions preserve the existing publication contract', () => {
  const actions = documentationActions('@site/docs/spatial-core/v1/geometry/point.md', published);
  const html = `<head><link rel="alternate" type="text/markdown" href="${actions.markdown}"></head>
<body><h1>Point</h1><p role="group" aria-label="Documentation actions">
<a href="${actions.markdown}" rel="alternate" type="text/markdown">View Markdown version</a>
<a href="${actions.edit}" target="_blank" rel="noopener noreferrer">Edit this page on GitHub</a></p></body>`;
  verifyRepresentationLinks(html, '---\ntitle: Point\ndescription: Point\n---\n\n[View HTML version](./point.html)', 'spatial-core/v1/geometry/point.md');
});
