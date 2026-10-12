import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSidebarHref } from '../scripts/sidebar-canonical-links.mjs';

const documents = ['index.md', 'spatial-core/v1/index.md', 'concepts/formats.md'];
test('sidebar navigation uses source HTML identities for index and topic routes', () => {
  assert.equal(canonicalSidebarHref('/', documents), 'pathname:///index.html');
  assert.equal(canonicalSidebarHref('/spatial-core/v1/', documents), 'pathname:///spatial-core/v1/index.html');
  assert.equal(canonicalSidebarHref('/concepts/formats', documents), 'pathname:///concepts/formats.html');
  assert.equal(canonicalSidebarHref('/spatial-docs/concepts/formats', documents, '/spatial-docs/'),
    'pathname:///spatial-docs/concepts/formats.html');
});
test('external, missing and already canonical destinations are preserved', () => {
  for (const href of ['https://example.org/', '/missing', '/concepts/formats.html', undefined]) {
    assert.equal(canonicalSidebarHref(href, documents), undefined);
  }
});
