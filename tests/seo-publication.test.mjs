import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateSeoResources, verifySeo } from '../scripts/seo-publication.mjs';
import { structuredDataType, pageStructuredData } from '../scripts/seo-policy.mjs';

const urls = { production: 'https://official.example/docs/', development: false };
async function fixture(t, development = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'seo-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'public');
  await mkdir(directory);
  await mkdir(path.join(root, '.generated-markdown'));
  await writeFile(path.join(root, '.generated-markdown/index.md'), '---\ntitle: Spatial documentation\ndescription: Explore spatial libraries.\n---\n');
  const config = { ...urls, development };
  const schema = pageStructuredData('index.html', 'Spatial documentation', 'Explore spatial libraries.', urls.production);
  const html = `<!doctype html><html lang="en"><head><title>Spatial documentation</title>
<link rel="canonical" href="https://official.example/docs/index.html">
<meta name="description" content="Explore spatial libraries.">
<meta property="og:title" content="Spatial documentation"><meta property="og:description" content="Explore spatial libraries.">
<meta property="og:url" content="https://official.example/docs/index.html">
<meta property="og:image" content="https://official.example/docs/assets/images/social-card.png">
${development ? '<meta name="robots" content="noindex, follow">' : ''}
<script type="application/ld+json">${JSON.stringify(schema)}</script></head>
<body><nav aria-label="Breadcrumbs">Home</nav><h1>Spatial documentation</h1><h2>Libraries</h2></body></html>`;
  await writeFile(path.join(directory, 'index.html'), html);
  await generateSeoResources(root, directory, config);
  return { root, directory, config, html };
}

test('classification distinguishes site, articles, references and navigation resources', () => {
  assert.equal(structuredDataType('index.html'), 'WebSite');
  assert.equal(structuredDataType('concepts/geometries.html'), 'TechArticle');
  assert.equal(structuredDataType('spatial-types/v1/validators.html'), 'APIReference');
  for (const resource of ['legal-notice.html', 'shared/french-website-legal-review.html', 'spatial-core/index.html', 'spatial-core/roadmap.html']) {
    assert.equal(structuredDataType(resource), null);
  }
});
for (const development of [false, true]) test(`validates ${development ? 'preproduction noindex' : 'production canonical'} publication`, async (t) => {
  const { root, directory, config } = await fixture(t, development);
  assert.equal((await verifySeo(root, directory, config)).pages, 1);
  const sitemap = await readFile(path.join(directory, 'sitemap.xml'), 'utf8');
  assert.equal(sitemap.includes('<loc>'), !development);
});
for (const [name, from, to] of [
  ['negotiated canonical', 'href="https://official.example/docs/index.html"', 'href="https://official.example/docs/index"'],
  ['Markdown canonical', 'href="https://official.example/docs/index.html"', 'href="https://official.example/docs/index.md"'],
  ['wrong host', 'href="https://official.example/docs/index.html"', 'href="https://preview.example/index.html"'],
  ['missing H1', '<h1>Spatial documentation</h1>', ''],
  ['incorrect H1 identity', '<h1>Spatial documentation</h1>', '<h1>Other page</h1>'],
  ['missing social card', '<meta property="og:image" content="https://official.example/docs/assets/images/social-card.png">', ''],
  ['wrong language', 'lang="en"', 'lang="fr"'],
  ['description divergence', 'name="description" content="Explore spatial libraries."', 'name="description" content="Generic text"'],
  ['skipped heading level', '<h2>Libraries</h2>', '<h3>Libraries</h3>'],
  ['invalid JSON-LD', '"@context":', 'broken:'],
  ['production noindex', '<head>', '<head><meta name="robots" content="noindex">'],
  ['image missing alt', '</body>', '<img src="example.png"></body>'],
]) test(`blocks publication with ${name}`, async (t) => {
  const { root, directory, config, html } = await fixture(t);
  await writeFile(path.join(directory, 'index.html'), html.replace(from, to));
  await assert.rejects(verifySeo(root, directory, config));
});
test('blocks absent preproduction noindex', async (t) => {
  const { root, directory, config, html } = await fixture(t, true);
  await writeFile(path.join(directory, 'index.html'), html.replace('<meta name="robots" content="noindex, follow">', ''));
  await assert.rejects(verifySeo(root, directory, config), /indexing directive/);
});
for (const target of ['index.md', 'index', 'search.html']) test(`rejects sitemap entry ${target}`, async (t) => {
  const { root, directory, config } = await fixture(t);
  const file = path.join(directory, 'sitemap.xml');
  await writeFile(file, (await readFile(file, 'utf8')).replace('index.html', target));
  await assert.rejects(verifySeo(root, directory, config), /sitemap/);
});
test('rejects an invalid sitemap namespace', async (t) => {
  const { root, directory, config } = await fixture(t);
  const file = path.join(directory, 'sitemap.xml');
  await writeFile(file, (await readFile(file, 'utf8')).replace('http://www.sitemaps.org/schemas/sitemap/0.9', 'https://example.org/other'));
  await assert.rejects(verifySeo(root, directory, config), /namespace/);
});
test('keeps robots crawlable so noindex remains visible', async (t) => {
  const { root, directory, config } = await fixture(t);
  await writeFile(path.join(directory, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  await assert.rejects(verifySeo(root, directory, config), /robots/);
});
for (const duplicate of ['title', 'description']) test(`rejects duplicate page ${duplicate}`, async (t) => {
  const { root, directory, config, html } = await fixture(t);
  const title = duplicate === 'title' ? 'Spatial documentation' : 'Geometry concepts';
  const description = duplicate === 'description' ? 'Explore spatial libraries.' : 'Understand geometry concepts.';
  await writeFile(path.join(root, '.generated-markdown/concepts.md'), `---\ntitle: ${title}\ndescription: ${description}\n---\n`);
  let other = html.replaceAll('Spatial documentation', title).replaceAll('Explore spatial libraries.', description).replaceAll('index.html', 'concepts.html');
  other = other.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify(pageStructuredData('concepts.html', title, description, urls.production))}</script>`);
  await writeFile(path.join(directory, 'concepts.html'), other);
  await generateSeoResources(root, directory, config);
  await assert.rejects(verifySeo(root, directory, config), new RegExp(`duplicate ${duplicate}`));
});
