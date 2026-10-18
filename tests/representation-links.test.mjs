import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyRepresentationLinks, verifyDiscoveryLink} from '../scripts/representation-links.mjs';
import {parseRepresentationFrontMatter} from '../scripts/representation-routes.mjs';
import path from 'node:path';

const markdown = '---\ntitle: Point\ndescription: Point page\n---\n\n[View HTML version](./point.html)\n\n## Body';
const link = '<a href="./point.md" rel="alternate" type="text/markdown">View Markdown version</a>';
const metadata = '<link rel="alternate" type="text/markdown" href="./point.md">';
const html = `<head>${metadata}</head><body><h1>Point</h1><p>${link}</p><p>Body</p></body>`;

const discovery = '<link rel="describedby" type="text/plain" href="../llms.txt">';
const discoverableHtml = html.replace('</head>', `${discovery}</head>`);

test('discovery resolves to the deployment root at every document depth in both environments', () => {
  for (const base of ['https://www.longitude-one.fr/', 'https://longitude-one.github.io/spatial-docs/']) {
    for (const source of ['index.md', 'nested/index.md', 'spatial-core/v1/geometry/point.md']) {
      const href = '../'.repeat(source.split('/').length - 1) + 'llms.txt';
      const generated = html.replace('</head>', `<link rel="describedby" type="text/plain" href="${href}"></head>`);
      verifyDiscoveryLink(generated, source, new Set(['llms.txt']));
      assert.equal(new URL(href, new URL(source.replace(/\.md$/, '.html'), base)).href, `${base}llms.txt`);
    }
  }
});

for (const [name, changedHtml, corpus = ['llms.txt']] of [
  ['missing discovery', html],
  ['duplicate discovery', discoverableHtml.replace(discovery, discovery + discovery)],
  ['competing discovery', discoverableHtml.replace(discovery, discovery + discovery.replace('llms.txt', 'llms-full.txt'))],
  ['full context target', discoverableHtml.replace('../llms.txt', '../llms-full.txt')],
  ['wrong depth', discoverableHtml.replace('../llms.txt', 'llms.txt')],
  ['absolute target', discoverableHtml.replace('../llms.txt', 'https://www.longitude-one.fr/llms.txt')],
  ['root relative target', discoverableHtml.replace('../llms.txt', '/llms.txt')],
  ['target fragment', discoverableHtml.replace('../llms.txt', '../llms.txt#index')],
  ['wrong media type', discoverableHtml.replace('type="text/plain"', 'type="text/markdown"')],
  ['missing media type', discoverableHtml.replace('type="text/plain"', '')],
  ['body metadata', discoverableHtml.replace(discovery, '').replace('<body>', `<body>${discovery}`)],
  ['anchor relationship', discoverableHtml.replace(discovery, discovery.replace('<link ', '<a ') + '</a>')],
  ['missing corpus target', discoverableHtml, ['llms-full.txt']],
]) {
  test(`rejects ${name}`, () => {
    assert.throws(() => verifyDiscoveryLink(changedHtml, 'nested/point.md', corpus), /describedby/);
  });
}

test('discovery and Markdown alternate relations coexist', () => {
  verifyDiscoveryLink(discoverableHtml, 'nested/point.md', ['llms.txt']);
  verifyRepresentationLinks(discoverableHtml, markdown, 'nested/point.md');
});

test('validates direct sibling links for nested documents', () => {
  verifyRepresentationLinks(html, markdown, 'nested/point.md');
});

for (const [name, changedHtml, changedMarkdown] of [
  ['missing Markdown switch', html, markdown.replace('[View HTML version](./point.html)', '')],
  ['duplicate Markdown switch', html, `${markdown}\n\n[View HTML version](./point.html)`],
  ['misplaced Markdown switch', html, markdown.replace('\n\n[View HTML', '\n\nIntroduction\n\n[View HTML')],
  ['absolute HTML target', html, markdown.replace('./point.html', '/point.html')],
  ['directory HTML target', html, markdown.replace('./point.html', './point/')],
  ['wrong counterpart', html, markdown.replace('./point.html', './other.html')],
  ['missing front matter', html, markdown.slice(markdown.indexOf('[View HTML'))],
  ['missing visible HTML switch', html.replace(link, ''), markdown],
  ['duplicate visible HTML switch', html.replace(link, link + link), markdown],
  ['duplicate alternate with another label', html.replace(link, link + link.replace('View Markdown version', 'Download')), markdown],
  ['alternate without fixed label', html.replace('View Markdown version', 'Download'), markdown],
  ['missing head alternate', html.replace(metadata, ''), markdown],
  ['duplicate head alternate', html.replace(metadata, metadata + metadata), markdown],
  ['disagreement', html.replace('href="./point.md"', 'href="./other.md"'), markdown],
  ['absolute Markdown target', html.replaceAll('./point.md', 'https://example.com/point.md'), markdown],
  ['wrong semantics', html.replace('rel="alternate" type="text/markdown">View', '>View'), markdown],
  ['metadata outside head', html.replace(metadata, '').replace('<body>', `<body>${metadata}`), markdown],
  ['switch above title', html.replace(`<h1>Point</h1><p>${link}</p>`, `<p>${link}</p><h1>Point</h1>`), markdown],
  ['switch below content', html.replace(`<h1>Point</h1>`, '<h1>Point</h1><p>Introduction</p>'), markdown],
]) {
  test(`rejects ${name}`, () => {
    assert.throws(() => verifyRepresentationLinks(changedHtml, changedMarkdown, 'nested/point.md'));
  });
}

test('generates explicit routing metadata without changing source front matter', async () => {
  for (const source of ['index.md', 'nested/index.md', 'nested/point.md']) {
    const result = {frontMatter: {title: 'Point'}, content: 'Body'};
    const parsed = await parseRepresentationFrontMatter({
      filePath: path.resolve('docs', source), defaultParseFrontMatter: async () => result,
    });
    assert.equal(parsed.frontMatter.slug, `/${source.replace(/\.md$/, '.html')}`);
    assert.deepEqual(result.frontMatter, {title: 'Point'});
  }
});
