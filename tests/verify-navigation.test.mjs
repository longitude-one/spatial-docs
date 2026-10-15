import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { inspectNavigation, searchNavigation, verifyNavigation } from '../scripts/verify-navigation.mjs';
const require = createRequire(import.meta.url);
const lunr = createRequire(require.resolve('@easyops-cn/docusaurus-search-local'))('lunr');

for (const baseUrl of ['/', '/spatial-docs/']) {
  test(`rendered control names and canonical navigation URLs are enforced at ${baseUrl}`, () => {
    const options = { baseUrl, siteUrl: 'https://docs.example', published: new Set(['index.html', 'library/v1/index.html']) };
    const inspect = (html) => inspectNavigation(html, 'index.html', options);
    assert.deepEqual(inspect(`<button aria-controls="panel">Libraries</button><div id="panel"></div><a href="${baseUrl}library/v1/index.html">v1</a>`).links, ['library/v1/index.html']);
    assert.throws(() => inspect('<button><svg></svg></button>'), /Unnamed/);
    assert.throws(() => inspect('<button>✕</button>'), /Unnamed/);
    assert.doesNotThrow(() => inspect('<button aria-label="Clear search">✕</button>'));
    assert.throws(() => inspect('<button aria-controls="missing">Libraries</button>'), /Missing controlled panel/);
    assert.throws(() => inspect(`<a href="${baseUrl}library/v1/">v1</a>`), /explicit canonical HTML/);
    assert.doesNotThrow(() => inspect('<button aria-labelledby="label"></button><span id="label">Search</span>'));
    if (baseUrl !== '/') assert.throws(() => inspect('<a href="/index.html">Home</a>'), /leaves the site base/);
  });

  test(`integrated final-corpus journeys, search queries and exact contextual actions at ${baseUrl}`, async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'navigation-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const corpus = path.join(root, 'public'); const metadata = path.join(root, '.publication-metadata');
    await mkdir(corpus); await mkdir(metadata);
    await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
    const paths = ['index', 'doctrine-spatial/index', 'doctrine-spatial/v5/index', 'doctrine-spatial/v6/index',
      'doctrine-spatial/v7/index', 'concepts/geometries', 'standards/ogc/ogc-06-103r4', 'dbms/postgis'];
    const versions = { v5: 'Older', v6: 'Current', v7: 'Next' };
    const fields = { publishedDocuments: paths.map((file) => `${file}.md`), libraryNames: { 'doctrine-spatial': 'Doctrine Spatial' },
      libraryVersions: { 'doctrine-spatial': { versions } } };
    await writeFile(path.join(root, 'docusaurus.config.js'), `export default ${JSON.stringify({ baseUrl, url: 'https://docs.example', customFields: fields })};`);
    const documents = paths.map((file) => ({ source: `docs/${file}.md`, html: `${file}.html`, markdown: `${file}.md` }));
    await writeFile(path.join(metadata, 'documentation-manifest.json'), JSON.stringify({ documents }));
    for (const document of documents) {
      const version = document.html.split('/')[1];
      const library = document.html.startsWith('doctrine-spatial/');
      const context = library ? `<nav class="library-version-nav" aria-label="Doctrine Spatial documentation">${Object.entries(versions).map(([v, status]) =>
        `<a href="${baseUrl}doctrine-spatial/${v}/index.html" ${v === version ? 'aria-current="page"' : ''}>${v} ${status}</a>`).join('')}</nav><nav aria-label="Breadcrumbs">Doctrine Spatial ${version}</nav>` : '';
      const html = `<nav><button>Libraries</button>${paths.map((file) => `<a href="${baseUrl}${file}.html">${file}</a>`).join('')}</nav>${context}`
        + `<p aria-label="Documentation actions"><a href="./${path.posix.basename(document.markdown)}">View Markdown version</a>`
        + `<a href="https://github.com/longitude-one/spatial-docs/edit/main/${document.source}">Edit this page on GitHub</a></p>`;
      await mkdir(path.dirname(path.join(corpus, document.html)), { recursive: true });
      await mkdir(path.dirname(path.join(root, document.source)), { recursive: true });
      await writeFile(path.join(corpus, document.html), html);
      await writeFile(path.join(root, document.source), '---\ntitle: Example\ndescription: Example\n---\n');
    }
    const searchDocuments = paths.map((file, i) => ({ i, u: `${baseUrl}${file}.html`,
      t: file.startsWith('doctrine') ? 'Doctrine' : file.startsWith('dbms') ? 'PostGIS' : 'Geometry',
      b: ['Doctrine Spatial', ...(versions[file.split('/')[1]] ? [`${file.split('/')[1]} (${versions[file.split('/')[1]]})`] : [])] }));
    const engine = lunr(function () { this.ref('i'); this.field('t'); for (const doc of searchDocuments) this.add(doc); });
    const index = [{ documents: searchDocuments, index: engine.toJSON() }];
    const indexFile = path.join(corpus, 'search-index-abcd.json');
    await writeFile(indexFile, JSON.stringify(index));
    assert.equal((await verifyNavigation(root, corpus, metadata)).reachable, paths.length);
    const expected = new Set(searchDocuments.map((doc) => doc.u));
    assert.throws(() => searchNavigation(index, expected, baseUrl, [{ term: 'missing', targets: ['index.html'] }]), /does not return/);
    assert.throws(() => searchNavigation([{ ...index[0], documents: [...searchDocuments, { u: `${baseUrl}inbox/draft.html` }] }], expected, baseUrl, []), /unpublished/);
    const target = path.join(corpus, 'doctrine-spatial/v5/index.html');
    const original = await readFile(target, 'utf8');
    for (const [replacement, error] of [
      [original.replace('href="./index.md"', 'href="../v6/index.md"'), /Markdown action/],
      [original.replace('edit/main/docs/doctrine-spatial/v5/', 'edit/main/docs/doctrine-spatial/v6/'), /Contribution action/],
      [original.replace('aria-current="page"', ''), /Version navigation/],
      [original.replace('Doctrine Spatial v5</nav>', 'Different library</nav>'), /Breadcrumbs/],
    ]) {
      await writeFile(target, replacement);
      await assert.rejects(verifyNavigation(root, corpus, metadata), error);
    }
    await writeFile(target, original);
    await writeFile(indexFile, JSON.stringify([...index, { documents: [{ ...searchDocuments[0], p: 999 }], index: engine.toJSON() }]));
    await assert.rejects(verifyNavigation(root, corpus, metadata), /matching parent page/);
    await writeFile(indexFile, JSON.stringify([{ ...index[0], documents: [{ ...searchDocuments[0], h: '#missing' }, ...searchDocuments.slice(1)] }]));
    await assert.rejects(verifyNavigation(root, corpus, metadata), /broken anchor/);
  });
}
