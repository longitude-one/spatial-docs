import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import localSearch from '../scripts/local-search.mjs';

const fields = {
  libraryNames: { 'spatial-core': 'Spatial Core', 'doctrine-spatial': 'Doctrine Spatial' },
  libraryVersions: { 'doctrine-spatial': { versions: { v5: 'Older', v6: 'Current', v7: 'Next' } } },
};
const published = ['index', 'spatial-core/v1/index', 'doctrine-spatial/v5/index', 'doctrine-spatial/v6/index',
  'doctrine-spatial/v7/index', 'standards/ogc/reference', 'concepts/crs', 'dbms/mysql', 'shared/index'];

for (const baseUrl of ['/', '/spatial-docs/']) {
  test(`actual local-search provider indexes the complete published corpus at ${baseUrl}`, async (t) => {
    const siteDir = await mkdtemp(path.join(tmpdir(), 'spatial-search-provider-'));
    t.after(() => rm(siteDir, { recursive: true, force: true }));
    const outDir = path.join(siteDir, 'build');
    await mkdir(path.join(siteDir, 'docs'));
    const siteConfig = { trailingSlash: false, themeConfig: {}, customFields: fields };
    const excluded = [
      { route: 'hidden', unlisted: true },
      { route: 'frontmatter-hidden', frontMatter: { unlisted: true } },
      { route: 'draft', frontMatter: { draft: true } },
    ];
    const docs = [...published.map((route) => ({ route })), ...excluded]
      .map(({ route, ...metadata }) => ({ ...metadata, permalink: `${baseUrl}${route}.html` }));
    // Keep excluded HTML present: exclusion must follow publication metadata rather than file absence.
    for (const route of [...published, ...excluded.map((doc) => doc.route), 'inbox/unpublished', 'search', '404']) {
      const filename = path.join(outDir, `${route}.html`);
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, '<html><head><meta name="description" content="Spatial reference description"></head>'
        + `<body><article><header><h1>${route}</h1></header><p>Spatial geometry overview.</p>`
        + '<h2 id="coordinates">Coordinates<a class="hash-link" href="#coordinates">#</a></h2>'
        + '<p>Coordinate dimensionality and reference systems.</p></article></body></html>');
    }
    const provider = localSearch({ siteDir, generatedFilesDir: path.join(siteDir, '.docusaurus'), baseUrl, siteConfig });
    const routes = [];
    await provider.contentLoaded({ actions: { addRoute: (route) => routes.push(route) } });
    assert.deepEqual(routes.map((route) => route.path), [`${baseUrl}search.html`]);
    await provider.postBuild({
      outDir, baseUrl, siteConfig,
      routesPaths: [...docs.map((doc) => doc.permalink), `${baseUrl}inbox/unpublished.html`, `${baseUrl}search.html`, `${baseUrl}404.html`],
      plugins: [{ name: 'docusaurus-plugin-content-docs', content: {
        loadedVersions: [{ path: baseUrl, isLast: true, docs }],
      } }],
    });
    const indexFiles = (await readdir(outDir, { recursive: true }))
      .filter((filename) => /(?:^|[/\\])search-index.*\.json$/.test(filename));
    assert.equal(indexFiles.length, 1, 'all documentation versions must share one search index');
    const index = JSON.parse(await readFile(path.join(outDir, indexFiles[0]), 'utf8'));
    const expected = published.map((route) => `${baseUrl}${route}.html`).sort();
    const titles = index[0].documents;
    assert.deepEqual(titles.map((doc) => doc.u).sort(), expected);
    assert.deepEqual([...new Set(index.flatMap((group) => group.documents.map((doc) => doc.u)))].sort(), expected);
    assert.ok(index[1].documents.some((doc) => doc.h === '#coordinates'), 'actual provider must preserve heading anchors');
    assert.ok(index.some((group) => group.documents.some((doc) => doc.t.includes('dimensionality'))), 'body text must be searchable');
    for (const [version, status] of Object.entries(fields.libraryVersions['doctrine-spatial'].versions)) {
      const title = titles.find((doc) => doc.u === `${baseUrl}doctrine-spatial/${version}/index.html`);
      assert.deepEqual(title.b.slice(0, 2), ['Doctrine Spatial', `${version} (${status})`]);
    }
  });
}
