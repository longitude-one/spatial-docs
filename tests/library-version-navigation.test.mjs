import { test } from 'node:test';
import assert from 'node:assert/strict';
import { libraryVersionNavigation } from '../scripts/library-version-navigation.mjs';

const context = {
  libraryVersions: {
    'spatial-core': { versions: { v1: 'Older', v2: 'Current', v3: 'Next' } },
    'wkt-parser': { versions: { v3: 'Current' } },
    'spatial-decoder': { versions: { v1: 'Next' } },
  },
  libraryNames: { 'spatial-core': 'Spatial Core', 'wkt-parser': 'WKT Parser', 'spatial-decoder': 'Spatial Decoder' },
  publishedDocuments: [
    'spatial-core/index.md', 'spatial-core/roadmap.md',
    'spatial-core/v1/index.md', 'spatial-core/v1/geometry/point.md',
    'spatial-core/v2/index.md', 'spatial-core/v2/geometry/point.md',
    'spatial-core/v3/index.md', 'spatial-core/v3/unpublished.md',
    'wkt-parser/index.md', 'wkt-parser/v3/index.md',
    'spatial-decoder/index.md', 'spatial-decoder/v1/index.md',
    'standards/iso/index.md', 'concepts/index.md', 'dbms/index.md', 'shared/index.md', 'index.md',
  ],
};

test('consulted document identifies its library, major and status independently of the current release', () => {
  const navigation = libraryVersionNavigation('@site/docs/spatial-core/v1/geometry/point.md', context);
  assert.equal(navigation.name, 'Spatial Core');
  assert.equal(navigation.version, 'v1');
  assert.equal(navigation.status, 'Older');
  assert.equal(navigation.overview, '/spatial-core/index.html');
  assert.deepEqual(navigation.current, { version: 'v2', to: '/spatial-core/v2/index.html' });
  assert.deepEqual(navigation.versions.find(({ selected }) => selected), {
    version: 'v1', status: 'Older', to: '/spatial-core/v1/geometry/point.html', selected: true,
  });
});

test('switching versions preserves a published counterpart and falls back to an existing major index', () => {
  const { versions } = libraryVersionNavigation('spatial-core/v1/geometry/point.md', context);
  assert.equal(versions.find(({ version }) => version === 'v2').to, '/spatial-core/v2/geometry/point.html');
  assert.equal(versions.find(({ version }) => version === 'v3').to, '/spatial-core/v3/index.html');
  assert.deepEqual(versions.map(({ status }) => status), ['Next', 'Current', 'Older']);
});

test('overview and roadmap context stays unversioned with stable documentation as the entry point', () => {
  for (const page of ['index.md', 'roadmap.md']) {
    const navigation = libraryVersionNavigation(`spatial-core/${page}`, context);
    assert.equal(navigation.version, null);
    assert.equal(navigation.status, null);
    assert.equal(navigation.current.version, 'v2');
    assert.ok(navigation.versions.every(({ selected }) => !selected));
  }
  assert.equal(libraryVersionNavigation('spatial-core/roadmap.md', context).context, 'Roadmap');
});

test('a library with only Next documentation never acquires a stable default', () => {
  const overview = libraryVersionNavigation('spatial-decoder/index.md', context);
  assert.equal(overview.current, null);
  assert.equal(overview.currentVersion, null);
  const next = libraryVersionNavigation('spatial-decoder/v1/index.md', context);
  assert.equal(next.status, 'Next');
  assert.deepEqual(next.versions, [{ version: 'v1', status: 'Next', to: '/spatial-decoder/v1/index.html', selected: true }]);
});

test('cross-library links adopt target metadata instead of carrying a previously selected version', () => {
  const previous = libraryVersionNavigation('spatial-core/v1/index.md', context);
  const target = libraryVersionNavigation('@site/docs/wkt-parser/v3/index.md', context);
  assert.equal(previous.version, 'v1');
  assert.equal(target.name, 'WKT Parser');
  assert.equal(target.status, 'Current');
  assert.ok(target.versions.every(({ to }) => to.startsWith('/wkt-parser/')));
});

test('references, unknown libraries and unpublished documents receive no library controls', () => {
  for (const source of ['standards/iso/index.md', 'concepts/index.md', 'dbms/index.md', 'shared/index.md',
    'index.md', 'spatial-validator/index.md', 'spatial-core/v99/index.md']) {
    assert.equal(libraryVersionNavigation(source, context), null, source);
  }
});

test('unavailable documentation targets are never fabricated', () => {
  const withoutIndexes = { ...context, publishedDocuments: ['spatial-core/v1/geometry/point.md'] };
  const navigation = libraryVersionNavigation('spatial-core/v1/geometry/point.md', withoutIndexes);
  assert.equal(navigation.overview, null);
  assert.equal(navigation.current, null);
  assert.equal(navigation.currentVersion, 'v2');
  assert.deepEqual(navigation.versions.map(({ to }) => to), ['/spatial-core/v1/geometry/point.html']);
});
