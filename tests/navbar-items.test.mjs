import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLibraryCategories, createNavbarItems } from '../scripts/navbar-items.mjs';

test('library navigation uses Current discovery and never defaults to a Next release', (t) => {
  const docs = mkdtempSync(path.join(os.tmpdir(), 'navbar-docs-'));
  t.after(() => rmSync(docs, { recursive: true, force: true }));
  for (const source of ['doctrine-spatial/v6/index.md', 'doctrine-spatial/v7/index.md', 'spatial-types/v1/index.md', 'spatial-types/roadmap.md']) {
    mkdirSync(path.dirname(path.join(docs, source)), { recursive: true });
    writeFileSync(path.join(docs, source), 'fixture');
  }
  const categories = createLibraryCategories({
    'doctrine-spatial': { versions: { v6: 'Current', v7: 'Next' } },
    'spatial-types': { versions: { v1: 'Next' } },
  }, docs);
  assert.equal(categories[0].items[0].to, '/doctrine-spatial/v6/index.html');
  assert.deepEqual(categories[1].items[0], { label: 'Spatial Types', to: '/spatial-types/roadmap.html', note: 'Roadmap' });
  assert.equal(categories[1].items[2].to, undefined);
});

test('missing discovery or a missing Current document falls back to an existing roadmap', (t) => {
  const docs = mkdtempSync(path.join(os.tmpdir(), 'navbar-docs-'));
  t.after(() => rmSync(docs, { recursive: true, force: true }));
  mkdirSync(path.join(docs, 'doctrine-spatial'));
  writeFileSync(path.join(docs, 'doctrine-spatial/roadmap.md'), 'fixture');
  assert.equal(createLibraryCategories({}, docs)[0].items[0].to, '/doctrine-spatial/roadmap.html');
  assert.equal(createLibraryCategories({ 'doctrine-spatial': { versions: { v6: 'Current' } } }, docs)[0].items[0].to,
    '/doctrine-spatial/roadmap.html');
});

test('global navigation preserves the agreed order and links only to real HTML resources', () => {
  const docs = path.join(process.cwd(), 'docs');
  const items = createNavbarItems({}, docs);
  assert.deepEqual(items.map(({ label }) => label), ['Overview', 'Libraries', 'Guides', 'Standards', 'Search', 'GitHub']);
  assert.equal(items.at(-1).href, 'https://github.com/longitude-one');
  assert.equal(items[2].type, items[1].type);
  assert.deepEqual(items[2].categories.map(({ label }) => label), ['DBMS', 'Concepts']);
  assert.deepEqual(items[2].categories[0].items.map(({ label }) => label), ['DBMS overview', 'PostGIS', 'MySQL', 'MariaDB', 'SQL Server']);
  assert.deepEqual(items[2].categories[1].items.map(({ label }) => label),
    ['Concepts overview', 'Geometries', 'Dimensions', 'Coordinate reference systems', 'Formats']);
  assert.equal(items[4].type, 'custom-unavailable');
  assert.equal(items[3].type, items[1].type);
  assert.deepEqual(items[3].categories.map(({ label }) => label), ['ISO', 'OGC', 'RFC']);
  assert.deepEqual(items[3].categories.flatMap(({ items }) => items.map(({ to }) => to)), [
    '/standards/iso/index.html', '/standards/iso/iso-iec-13249-3.html', '/standards/iso/iso-19107.html',
    '/standards/iso/iso-19111.html', '/standards/iso/iso-19136.html',
    '/standards/ogc/index.html', '/standards/ogc/ogc-06-103r4.html',
    '/standards/rfc/index.html', '/standards/rfc/rfc-7946.html',
  ]);
  assert.deepEqual(items[1].categories.map(({ label }) => label), ['Doctrine Integration', 'Geometry Model', 'Data Conversion', 'Parsers']);
  const links = [items[0], ...items.slice(1, 4).flatMap(({ categories }) => categories.flatMap(({ items: links }) => links))]
    .filter(({ to }) => to);
  for (const { to } of links) {
    assert.match(to, /^\/[a-z0-9/-]+\.html$/);
    assert.ok(existsSync(path.join(docs, to.slice(1).replace(/\.html$/, '.md'))), to);
  }
  assert.equal(items[1].overview, '/index.html#browse-the-documentation');
});
