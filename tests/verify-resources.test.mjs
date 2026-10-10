import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { verifyResources } from '../scripts/verify-resources.mjs';

async function fixture(t, changes = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'spatial-docs-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const data = {
    'package.json': '{"type":"module"}',
    'docusaurus.config.js': "export default {url: 'https://example.com', baseUrl: '/'};",
    'build/index.html': '<h1 id="home">Home</h1><a href="/markdown/index.md#home">Markdown</a>',
    'build/markdown/index.md': '# Home\n\n[Home](#home)\n[External](https://other.example/missing)\n',
    'build/llms.txt': '# Documentation\n\n[Home](/markdown/index.md)\n',
    'docs/index.md': '---\ntitle: Home\ndescription: Home page\n---\n',
    '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/', slug: '/' }),
    ...changes,
  };
  for (const [name, content] of Object.entries(data)) {
    if (content === null) continue;
    const file = path.join(root, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return root;
}

test('valid site produces an HTML/Markdown mapping', async (t) => {
  const root = await fixture(t);
  await verifyResources(root);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'build/markdown-mapping.json'))), [
    { html: '/index.html', markdown: '/markdown/index.md' },
  ]);
});

test('ignores cached metadata for a deleted source document', async (t) => {
  const root = await fixture(t, {
    '.docusaurus/docusaurus-plugin-content-docs/default/deleted.json': JSON.stringify({
      source: '@site/docs/libraries/spatial-core/index.md',
      permalink: '/libraries/spatial-core/',
    }),
  });
  await verifyResources(root);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'build/markdown-mapping.json'))), [
    { html: '/index.html', markdown: '/markdown/index.md' },
  ]);
});

for (const [name, changes, message] of [
  ['HTML link', { 'build/index.html': '<a href="/missing">Broken</a>' }, /Broken internal link/],
  ['HTML anchor', { 'build/index.html': '<a href="#missing">Broken</a>' }, /Broken anchor/],
  ['Markdown link', { 'build/markdown/index.md': '# Home\n[Broken](missing.md)' }, /Missing or unpublished source document/],
  ['Markdown anchor', { 'build/markdown/index.md': '# Home\n[Broken](#missing)' }, /Missing GFM heading anchor/],
  ['reference link', { 'build/markdown/index.md': '# Home\n[Broken][target]\n\n[target]: /missing' }, /must be relative/],
  ['embedded HTML link', { 'build/markdown/index.md': '# Home\n<a href="/missing">Broken</a>' }, /Broken internal link/],
  ['same-origin absolute link', { 'build/markdown/index.md': '# Home\n[Broken](https://example.com/missing)' }, /Broken internal link/],
  ['missing Markdown', { 'build/markdown/index.md': null }, /Broken internal link/],
  ['external llms entry', { 'build/llms.txt': '[Home](/markdown/index.md)\n[Other](https://other.example/a.md)' }, /must match/],
  ['duplicate llms entry', { 'build/llms.txt': '[Home](/markdown/index.md)\n[Duplicate](/markdown/index.md)' }, /must match/],
  ['unindexed Markdown', { 'build/markdown/stale.md': '# Stale' }, /must match/],
  ['draft publication', { '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/', slug: '/', draft: true }) }, /must match/],
  ['unlisted publication', { '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/', slug: '/', unlisted: true }) }, /must match/],
  ['missing HTML counterpart', { '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/absent', slug: '/' }) }, /Broken internal link/],
]) {
  test(`rejects ${name}`, async (t) => {
    await assert.rejects(verifyResources(await fixture(t, changes)), message);
  });
}

test('accepts relative asset links, encoded paths and query strings', async (t) => {
  const root = await fixture(t, {
    'build/markdown/index.md': '# Home\n## Section\n[Anchor](#section)\n[Asset](../image%20one.svg?raw=1)\n',
    'build/image one.svg': '<svg/>',
  });
  await verifyResources(root);
});

test('supports explicit Markdown index pages while mapping HTML directory routes', async (t) => {
  const root = await fixture(t, {
    'build/markdown/index.md': '# Home\n[Section](section/index.md)\n',
    'build/markdown/section/index.md': '# Section',
    'build/section.html': '<h1>Section</h1>',
    'build/llms.txt': '[Home](/markdown/index.md)\n[Section](/markdown/section/index.md)',
    'docs/section/index.md': '---\ntitle: Section\ndescription: Section page\n---\n',
    '.docusaurus/docusaurus-plugin-content-docs/default/section.json': JSON.stringify({ source: '@site/docs/section/index.md', permalink: '/section/', slug: '/section/' }),
  });
  await verifyResources(root);
  assert.equal(await readFile(path.join(root, 'build/section/index.html'), 'utf8'), '<h1>Section</h1>');
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'build/markdown-mapping.json'))), [
    { html: '/index.html', markdown: '/markdown/index.md' },
    { html: '/section/index.html', markdown: '/markdown/section/index.md' },
  ]);
});

test('validates Pages subpath links and mappings', async (t) => {
  const root = await fixture(t, {
    'docusaurus.config.js': "export default {url: 'https://example.com', baseUrl: '/spatial-docs/'};",
    'build/index.html': '<h1 id="home">Home</h1><a href="/spatial-docs/markdown/index.md#home">Markdown</a>',
    'build/markdown/index.md': '# Home\n[Home](#home)',
    'build/llms.txt': '[Home](/spatial-docs/markdown/index.md)',
    '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/spatial-docs/', slug: '/' }),
  });
  await verifyResources(root);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'build/markdown-mapping.json'))), [
    { html: '/spatial-docs/index.html', markdown: '/spatial-docs/markdown/index.md' },
  ]);
});

for (const [name, content, message] of [
  ['directory-style Markdown link', '# Home\n[Home](./)', /explicitly target .md|lowercase, portable/],
  ['HTML documentation link', '# Home\n[Home](../index.html)', /must not escape docs/],
  ['duplicate heading anchors', '# Home\n## Section\n## Section', /Duplicate or ambiguous/],
  ['absolute corpus URL', '# Home\n[Home](https://example.com/markdown/index.md)', /Absolute URLs/],
]) {
  test(`rejects ${name} in the generated corpus`, async (t) => {
    await assert.rejects(verifyResources(await fixture(t, { 'build/markdown/index.md': content })), message);
  });
}

test('allows only the leading generated HTML counterpart link', async (t) => {
  const root = await fixture(t, {
    'build/markdown/index.md': '[View HTML version](../index.html)\n\n# Home\n[Home](#home)',
  });
  await verifyResources(root);
  await writeFile(path.join(root, 'build/markdown/index.md'),
    '[View HTML version](../index.html)\n\n# Home\n[Another HTML link](../index.html)');
  await assert.rejects(verifyResources(root), /must not escape docs/);
});
