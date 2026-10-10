import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { verifyResources } from '../scripts/verify-resources.mjs';

async function fixture(t, changes = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'spatial-docs-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const data = {
    'package.json': '{"type":"module"}',
    'docusaurus.config.js': "export default {url: 'https://example.com', baseUrl: '/'};",
    'build/index.html': '<h1 id="home">Home</h1><a href="/index.md#home">Markdown</a>',
    'build/index.md': '# Home\n\n[Home](#home)\n[External](https://other.example/missing)\n',
    'build/llms.txt': '# Documentation\n\n[Home](/index.md)\n',
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
    { html: '/index.html', markdown: '/index.md' },
  ]);
});

test('every nested resource mapping differs only by representation extension', async (t) => {
  const root = await fixture(t, {
    'build/shared/reference.md': '---\ntitle: Reference\ndescription: Shared reference\ncanonical_html: ./reference.html\ncanonical_markdown: ./reference.md\n---\n\n[View HTML version](./reference.html)\n\n## Scope\n',
    'build/shared/reference.html': '<h1>Reference</h1><h2 id="scope">Scope</h2>',
    'build/llms.txt': '[Home](/index.md)\n[Reference](/shared/reference.md)',
    'docs/shared/reference.md': '---\ntitle: Reference\ndescription: Shared reference\n---\n',
    '.docusaurus/docusaurus-plugin-content-docs/default/reference.json': JSON.stringify({
      source: '@site/docs/shared/reference.md', permalink: '/shared/reference',
    }),
  });
  await verifyResources(root);
  const mapping = JSON.parse(await readFile(path.join(root, 'build/markdown-mapping.json')));
  assert.equal(mapping.length, 2);
  for (const { html, markdown } of mapping) {
    assert.equal(markdown, html.replace(/\.html$/, '.md'));
    assert.ok(!(markdown.startsWith('/markdown/')));
    assert.ok((await readFile(path.join(root, 'build', markdown.slice(1)), 'utf8')).length > 0);
  }
});

test('rejects a build that retains the legacy public Markdown directory', async (t) => {
  const root = await fixture(t, { 'build/markdown/legacy.md': '# Legacy' });
  await assert.rejects(verifyResources(root), /must match/);
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
    { html: '/index.html', markdown: '/index.md' },
  ]);
});

for (const [name, changes, message] of [
  ['HTML link', { 'build/index.html': '<a href="/missing">Broken</a>' }, /Broken internal link/],
  ['HTML anchor', { 'build/index.html': '<a href="#missing">Broken</a>' }, /Broken anchor/],
  ['Markdown link', { 'build/index.md': '# Home\n[Broken](missing.md)' }, /Missing or unpublished source document/],
  ['Markdown anchor', { 'build/index.md': '# Home\n[Broken](#missing)' }, /Missing GFM heading anchor/],
  ['reference link', { 'build/index.md': '# Home\n[Broken][target]\n\n[target]: /missing' }, /must be relative/],
  ['embedded HTML link', { 'build/index.md': '# Home\n<a href="/missing">Broken</a>' }, /Broken internal link/],
  ['same-origin absolute link', { 'build/index.md': '# Home\n[Broken](https://example.com/missing)' }, /Broken internal link/],
  ['missing Markdown', { 'build/index.md': null }, /Broken internal link/],
  ['external llms entry', { 'build/llms.txt': '[Home](/index.md)\n[Other](https://other.example/a.md)' }, /must match/],
  ['duplicate llms entry', { 'build/llms.txt': '[Home](/index.md)\n[Duplicate](/index.md)' }, /must match/],
  ['unindexed Markdown', { 'build/stale.md': '# Stale' }, /must match/],
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
    'build/index.md': '# Home\n## Section\n[Anchor](#section)\n[Asset](./image%20one.svg?raw=1)\n',
    'build/image one.svg': '<svg/>',
  });
  await verifyResources(root);
});

test('supports explicit Markdown index pages while mapping HTML directory routes', async (t) => {
  const root = await fixture(t, {
    'build/index.md': '# Home\n[Section](section/index.md)\n',
    'build/section/index.md': '# Section',
    'build/section.html': '<h1>Section</h1>',
    'build/llms.txt': '[Home](/index.md)\n[Section](/section/index.md)',
    'docs/section/index.md': '---\ntitle: Section\ndescription: Section page\n---\n',
    '.docusaurus/docusaurus-plugin-content-docs/default/section.json': JSON.stringify({ source: '@site/docs/section/index.md', permalink: '/section/', slug: '/section/' }),
  });
  await verifyResources(root);
  assert.equal(await readFile(path.join(root, 'build/section/index.html'), 'utf8'), '<h1>Section</h1>');
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'build/markdown-mapping.json'))), [
    { html: '/index.html', markdown: '/index.md' },
    { html: '/section/index.html', markdown: '/section/index.md' },
  ]);
});

test('validates Pages subpath links and mappings', async (t) => {
  const root = await fixture(t, {
    'docusaurus.config.js': "export default {url: 'https://example.com', baseUrl: '/spatial-docs/'};",
    'build/index.html': '<h1 id="home">Home</h1><a href="/spatial-docs/index.md#home">Markdown</a>',
    'build/index.md': '# Home\n[Home](#home)',
    'build/llms.txt': '[Home](/spatial-docs/index.md)',
    '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/spatial-docs/', slug: '/' }),
  });
  await verifyResources(root);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, 'build/markdown-mapping.json'))), [
    { html: '/spatial-docs/index.html', markdown: '/spatial-docs/index.md' },
  ]);
});

for (const [name, content, message] of [
  ['directory-style Markdown link', '# Home\n[Home](./)', /explicitly target .md|lowercase, portable/],
  ['HTML documentation link', '# Home\n[Home](./index.html)', /explicitly target .md/],
  ['duplicate heading anchors', '# Home\n## Section\n## Section', /Duplicate or ambiguous/],
  ['absolute corpus URL', '# Home\n[Home](https://example.com/index.md)', /Absolute URLs/],
]) {
  test(`rejects ${name} in the generated corpus`, async (t) => {
    await assert.rejects(verifyResources(await fixture(t, { 'build/index.md': content })), message);
  });
}

test('allows only the leading generated HTML counterpart link', async (t) => {
  const root = await fixture(t, {
    'build/index.md': '[View HTML version](./index.html)\n\n# Home\n[Home](#home)',
  });
  await verifyResources(root);
  await writeFile(path.join(root, 'build/index.md'),
    '[View HTML version](./index.html)\n\n# Home\n[Another HTML link](./index.html)');
  await assert.rejects(verifyResources(root), /explicitly target .md/);
});

for (const baseUrl of ['/', '/spatial-docs/']) {
  test(`Docusaurus preview serves sibling Markdown URLs at ${baseUrl}`, { timeout: 20000 }, async (t) => {
    const markdown = '---\ntitle: Reference\ndescription: Shared reference\ncanonical_html: ./reference.html\ncanonical_markdown: ./reference.md\n---\n\n[View HTML version](./reference.html)\n';
    const root = await fixture(t, {
      'docusaurus.config.js': `export default {title: 'Test', url: 'https://example.com', baseUrl: '${baseUrl}'};`,
      'build/shared/reference.md': markdown,
      'build/shared/reference.html': '<h1>Reference HTML</h1>',
    });
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const { port } = reservation.address();
    await new Promise((resolve) => reservation.close(resolve));
    const child = spawn(process.execPath, [
      path.resolve('node_modules/@docusaurus/core/bin/docusaurus.mjs'),
      'serve', root, '--host', '127.0.0.1', '--port', String(port), '--no-open',
    ], { env: { ...process.env, CI: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let logs = '';
    child.stdout.on('data', (data) => { logs += data; });
    child.stderr.on('data', (data) => { logs += data; });
    t.after(async () => {
      if (child.exitCode === null) {
        const exited = once(child, 'exit');
        child.kill();
        await exited;
      }
    });
    const origin = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      try {
        const response = await fetch(`${origin}${baseUrl}index.html`);
        if (response.ok) { ready = true; break; }
      } catch { /* The preview server is still starting. */ }
      assert.equal(child.exitCode, null, logs);
      await delay(25);
    }
    assert.ok(ready, logs);
    const response = await fetch(`${origin}${baseUrl}shared/reference.md`);
    assert.equal(response.status, 200);
    assert.doesNotMatch(response.headers.get('content-type') || '', /text\/html/);
    assert.equal(await response.text(), markdown);
    const html = await fetch(`${origin}${baseUrl}shared/reference.html`, { redirect: 'manual' });
    assert.ok([200, 301, 302].includes(html.status));
    // Docusaurus's preview clean-URL redirect can omit the development baseUrl.
    // Verify the corresponding HTML route with that baseUrl kept explicit.
    const rendered = await fetch(`${origin}${baseUrl}shared/reference`);
    assert.equal(rendered.status, 200);
    assert.match(await rendered.text(), /Reference HTML/);
    const legacy = await fetch(`${origin}${baseUrl}markdown/shared/reference.md`);
    assert.equal(legacy.status, 404);
  });
}
