import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logicalBreadcrumbs, contextualPagination } from '../scripts/contextual-navigation.mjs';

const fields = {
  libraryNames: { 'spatial-core': 'Spatial Core', 'geo-parser': 'Geo Parser' },
  publishedDocuments: ['index.md', 'spatial-core/index.md',
    'spatial-core/v1/index.md', 'spatial-core/v1/geometry/index.md', 'spatial-core/v2/index.md',
    'geo-parser/v4/index.md', 'standards/iso/index.md', 'standards/iso/iso-19111.md',
    'concepts/index.md', 'concepts/formats.md', 'dbms/mysql.md'],
};
test('library breadcrumb hierarchy uses logical names and native nested topic labels', () => {
  const crumbs = logicalBreadcrumbs('@site/docs/spatial-core/v1/geometry/index.md', [
    { label: 'Spatial Core · v1' }, { label: 'Geometry primitives', href: '/spatial-core/v1/geometry/' },
  ], fields);
  assert.deepEqual(crumbs.map(({ label }) => label), ['Libraries', 'Spatial Core', 'v1', 'Geometry primitives']);
  assert.equal(crumbs[1].href, '/spatial-core/index.html');
  assert.equal(crumbs[2].href, '/spatial-core/v1/index.html');
});
test('unversioned entries and reference domains retain their own logical context', () => {
  assert.deepEqual(logicalBreadcrumbs('@site/docs/spatial-core/index.md', [], fields).map((item) => item.label),
    ['Libraries', 'Spatial Core']);
  assert.deepEqual(logicalBreadcrumbs('@site/docs/standards/iso/iso-19111.md', [{ label: 'ISO' }, { label: 'ISO 19111' }], fields)
    .map((item) => item.label), ['Standards', 'ISO', 'ISO 19111']);
  assert.deepEqual(logicalBreadcrumbs('@site/docs/concepts/index.md', [], fields).map((item) => item.label), ['Concepts']);
  assert.deepEqual(logicalBreadcrumbs('@site/docs/dbms/mysql.md', [{ label: 'MySQL' }], fields).map((item) => item.label),
    ['DBMS', 'MySQL']);
});
test('pagination retains native human labels and canonical destinations for the selected major', () => {
  for (const base of ['/', '/spatial-docs/']) {
    const next = contextualPagination('@site/docs/spatial-core/v1/index.md', {
      title: 'Spatial Core geometry primitives', permalink: `${base}spatial-core/v1/geometry/`,
    }, fields, base);
    assert.deepEqual(next, { title: 'Spatial Core geometry primitives', permalink: '/spatial-core/v1/geometry/index.html' });
  }
});
test('pagination cannot cross a library, major or reference domain, or point to an unpublished source', () => {
  for (const permalink of ['/spatial-core/v2/', '/geo-parser/v4/', '/concepts/formats', '/missing']) {
    assert.equal(contextualPagination('@site/docs/spatial-core/v1/index.md', { title: 'Target', permalink }, fields), undefined);
  }
  assert.equal(contextualPagination('@site/docs/concepts/index.md', { title: 'MySQL', permalink: '/dbms/mysql' }, fields), undefined);
  assert.equal(contextualPagination('@site/docs/spatial-core/index.md', { title: 'Old roadmap', permalink: '/spatial-core/roadmap' }, fields), undefined);
});
