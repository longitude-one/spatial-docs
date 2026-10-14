import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSidebarHref, sidebarSourcePath } from '../scripts/sidebar-canonical-links.mjs';

const documents = ['index.md', 'spatial-core/v1/index.md', 'concepts/formats.md'];
test('sidebar navigation uses source HTML identities for index and topic routes', () => {
  assert.equal(canonicalSidebarHref('/', documents), 'pathname:///index.html');
  assert.equal(canonicalSidebarHref('/spatial-core/v1/', documents), 'pathname:///spatial-core/v1/index.html');
  assert.equal(canonicalSidebarHref('/concepts/formats', documents), 'pathname:///concepts/formats.html');
  assert.equal(canonicalSidebarHref('/spatial-docs/concepts/formats', documents, '/spatial-docs/'),
    'pathname:///spatial-docs/concepts/formats.html');
});
test('external and missing destinations are preserved', () => {
  for (const href of ['https://example.org/', '/missing', undefined]) {
    assert.equal(canonicalSidebarHref(href, documents), undefined);
  }
});

test('explicit HTML routes retain source identity for sidebar and contextual pagination', () => {
  for (const baseUrl of ['/', '/spatial-docs/']) {
    for (const source of documents) {
      const href = `${baseUrl}${source.replace(/\.md$/, '.html')}`;
      assert.equal(sidebarSourcePath(href, documents, baseUrl), source);
      assert.equal(canonicalSidebarHref(href, documents, baseUrl), `pathname://${href}`);
    }
  }
});
