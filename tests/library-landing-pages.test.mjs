import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import {
  libraryLandingNavigation, appendLibraryLandingNavigation,
} from '../scripts/library-landing-pages.mjs';
import { baseUrl } from '../scripts/site-settings.mjs';

const parser = unified().use(remarkParse).use(remarkGfm);
const libraries = {
  'spatial-core': { roadmap: false, versions: { v1: 'Older', v2: 'Current', v3: 'Next' } },
  'spatial-decoder': { roadmap: false, versions: { v1: 'Next' } },
};

test('landing navigation selects the current stable major and exposes every documented version', () => {
  const markdown = libraryLandingNavigation('spatial-core/index.md', libraries);
  assert.match(markdown, /current stable documentation \(v2\).*\.\/v2\/index\.md/);
  assert.match(markdown, /composer require longitude-one\/spatial-core:\^2\.0/);
  assert.doesNotMatch(markdown, /composer require.*\^3\.0/);
  assert.match(markdown, /\[v3\].*Next/);
  assert.match(markdown, /\[v2\].*Current/);
  assert.match(markdown, /\[v1\].*Older/);
  assert.doesNotMatch(markdown, /roadmap\.md/);
  assert.ok(markdown.indexOf('[v3]') < markdown.indexOf('[v2]'));
});

test('landing entry points update after a stable release without defaulting to prerelease documentation', () => {
  const next = { 'spatial-core': { roadmap: false, versions: { v2: 'Older', v3: 'Current', v4: 'Next' } } };
  assert.match(libraryLandingNavigation('spatial-core/index.md', next), /composer require.*\^3\.0/);
  const preview = libraryLandingNavigation('spatial-decoder/index.md', libraries);
  assert.match(preview, /No stable release is currently available/);
  assert.match(preview, /\[v1\].*Next/);
  assert.doesNotMatch(preview, /composer require|current stable documentation|roadmap/);
});

test('versioned pages, roadmaps and reference indexes do not become library landing pages', () => {
  for (const source of ['spatial-core/v2/index.md', 'spatial-core/roadmap.md', 'concepts/index.md', 'index.md']) {
    assert.equal(libraryLandingNavigation(source, libraries), null);
  }
});

function links(tree) {
  return [...(tree.type === 'link' ? [tree.url] : []), ...(tree.children ?? []).flatMap(links)];
}

test('HTML and portable Markdown share navigation content with representation-specific links', () => {
  const source = 'Library summary.\n\n## Requirements\n\nExisting content.\n';
  const markdown = parser.parse(source);
  const html = parser.parse(source);
  appendLibraryLandingNavigation(markdown, 'spatial-core/index.md', libraries);
  appendLibraryLandingNavigation(html, 'spatial-core/index.md', libraries, { html: true });
  assert.equal(markdown.children[1].children[0].value, 'Get started');
  assert.deepEqual(links(html), links(markdown).map((url) => {
    const target = url.startsWith('../') ? 'about/versioning.md' : `spatial-core/${url.slice(2)}`;
    return `pathname://${baseUrl}${target.replace(/\.md$/, '.html')}`;
  }));
  assert.deepEqual(html.children.filter(({ type }) => type === 'heading'), markdown.children.filter(({ type }) => type === 'heading'));
  assert.equal(html.children.at(-1).children[0].value, 'Existing content.');
});


test('roadmap landing pages do not receive the superseded getting-started body', () => {
  const tree = parser.parse('The roadmap for this library has not been established yet.');
  const before = structuredClone(tree);
  appendLibraryLandingNavigation(tree, 'spatial-core/index.md', { 'spatial-core': { roadmap: true, versions: { v1: 'Current' } } });
  assert.deepEqual(tree, before);
});
