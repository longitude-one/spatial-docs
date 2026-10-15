import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeSearchIndex, searchContext, searchOptions } from '../scripts/local-search.mjs';

const fields = {
  libraryNames: { 'spatial-core': 'Spatial Core', 'doctrine-spatial': 'Doctrine Spatial' },
  libraryVersions: { 'doctrine-spatial': { versions: { v5: 'Older', v6: 'Current', v7: 'Next' } } },
};
const fixture = (urls) => [{ documents: urls.map((u) => ({ u, b: ['Overview'], t: 'Overview' })), index: {} }];

for (const base of ['/', '/spatial-docs/']) {
  test(`global search preserves HTML identities and version context under ${base}`, () => {
    const routes = ['spatial-core/v1/index', 'doctrine-spatial/v5/index', 'doctrine-spatial/v6/index', 'doctrine-spatial/v7/index',
      'standards/ogc/ogc-06-103r4', 'concepts/crs', 'dbms/mysql', 'shared/index'].map((route) => `${base}${route}`);
    const index = finalizeSearchIndex(fixture(routes), routes.map((route) => `${route}.html`), base, fields);
    assert.deepEqual(index[0].documents.map((doc) => doc.u), routes.map((route) => `${route}.html`));
    assert.deepEqual(index[0].documents[1].b, ['Doctrine Spatial', 'v5 (Older)', 'Overview']);
    assert.deepEqual(index[0].documents[2].b, ['Doctrine Spatial', 'v6 (Current)', 'Overview']);
    assert.deepEqual(index[0].documents[3].b, ['Doctrine Spatial', 'v7 (Next)', 'Overview']);
    assert.deepEqual(index[0].documents[4].b, ['Standards', 'Overview']);
  });
}

test('rejects search omissions and unpublished, Markdown or infrastructure entries', () => {
  assert.throws(() => finalizeSearchIndex(fixture([]), ['/published.html'], '/', fields), /every published/);
  for (const url of ['/inbox/draft', '/draft', '/hidden', '/page.md', '/404', '/search', '/other-base/page']) {
    assert.throws(() => finalizeSearchIndex(fixture([url]), ['/published.html'], '/', fields), /not a published HTML/);
  }
  assert.throws(() => finalizeSearchIndex({}, [], '/', fields), /unsupported structure/);
});

test('search provider stays global and indexes documentation alone', () => {
  assert.equal(searchOptions.indexDocs, true);
  assert.equal(searchOptions.indexBlog, false);
  assert.equal(searchOptions.indexPages, false);
  assert.deepEqual(searchOptions.searchContextByPaths, []);
  assert.equal(searchOptions.docsRouteBasePath, '/');
  assert.equal(searchOptions.explicitSearchResultPath, true);
  assert.deepEqual(searchContext('/concepts/crs.html', '/', fields), ['Concepts']);
});

test('search-page navigation uses an explicit HTML resource', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const loader = require('../scripts/search-route-loader.cjs');
  const source = 'const url = `${baseUrl}search/?${params}`; <button className={styles.searchClearButton}>✕</button>';
  const adapted = loader(source);
  assert.ok(adapted.includes('`${baseUrl}search.html?${params}`'));
  assert.ok(adapted.includes('aria-label="Clear search"'));
  assert.throws(() => loader('`${baseUrl}search/?`'), /accessible label adapter/);
  assert.throws(() => loader('changed provider'), /review the route adapter/);
});
