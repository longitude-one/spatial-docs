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
    'public/index.html': '<h1 id="home">Home</h1><a href="/index.md#home">Markdown</a>',
    'public/index.md': '# Home\n\n[Home](#home)\n[External](https://other.example/missing)\n',
    '.publication-metadata/asset-manifest.json': '{}',
    'public/llms.txt': '# Documentation\n\n[Home](/index.md)\n',
    'docs/index.md': '---\ntitle: Home\ndescription: Home page\n---\n',
    '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/', slug: '/' }),
    ...changes,
  };
  for (const [name, value] of Object.entries(data)) {
    let content = value;
    if (content && name.startsWith('public/') && name.endsWith('.md')) {
      if (!content.startsWith('---')) content = `---\ntitle: Fixture\ndescription: Fixture page\n---\n\n${content}`;
      if (!content.includes('[View HTML version]')) {
        const end = content.indexOf('\n---', 3) + 4;
        content = `${content.slice(0, end)}\n\n[View HTML version](./${path.basename(name).replace(/\.md$/, '.html')})\n${content.slice(end)}`;
      }
    }
    if (content && name.startsWith('public/') && name.endsWith('.html')) {
      const href = `./${path.basename(name).replace(/\.html$/, '.md')}`;
      content = `<head><link rel="alternate" type="text/markdown" href="${href}"></head><body>${content.replace(/(<h1[^>]*>.*?<\/h1>)/, `$1<p><a rel="alternate" type="text/markdown" href="${href}">View Markdown version</a></p>`)}</body>`;
    }
    if (content && name.startsWith('.docusaurus/') && name.endsWith('.json')) {
      const metadata = JSON.parse(content);
      if (metadata.permalink !== '/absent') {
        const prefix = data['docusaurus.config.js'].includes('/spatial-docs/') ? '/spatial-docs/' : '/';
        metadata.permalink = prefix + metadata.source.slice('@site/docs/'.length).replace(/\.md$/, '.html');
      }
      content = JSON.stringify(metadata);
    }
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
  assert.deepEqual(JSON.parse(await readFile(path.join(root, '.publication-metadata/markdown-mapping.json'))), [
    { html: '/index.html', markdown: '/index.md' },
  ]);
});

test('publication rejects an internal link opening a new tab', async (t) => {
  const root = await fixture(t, {
    'public/index.html': '<h1 id="home">Home</h1><a href="/index.md#home" target="_blank" rel="noopener noreferrer">Markdown</a>',
  });
  await assert.rejects(verifyResources(root), /Internal link must use the current tab/);
});

test('publication permits safe external links and same-tab internal links', async (t) => {
  const root = await fixture(t, {
    'public/index.html': '<h1 id="home">Home</h1><a href="/index.md#home" target="_self">Markdown</a>'
      + '<a href="https://www.iso.org/" target="_blank" rel="noopener noreferrer">ISO</a>',
  });
  await verifyResources(root);
});

test('every nested resource mapping differs only by representation extension', async (t) => {
  const root = await fixture(t, {
    'public/index.md': '# Home\n\n[Reference](shared/reference.md)\n',
    'public/shared/reference.md': '---\ntitle: Reference\ndescription: Shared reference\ncanonical_html: ./reference.html\ncanonical_markdown: ./reference.md\n---\n\n[View HTML version](./reference.html)\n\n## Scope\n',
    'public/shared/reference.html': '<h1>Reference</h1><h2 id="scope">Scope</h2>',
    'public/llms.txt': '[Home](/index.md)\n[Reference](/shared/reference.md)',
    'docs/shared/reference.md': '---\ntitle: Reference\ndescription: Shared reference\n---\n',
    '.docusaurus/docusaurus-plugin-content-docs/default/reference.json': JSON.stringify({
      source: '@site/docs/shared/reference.md', permalink: '/shared/reference',
    }),
  });
  await verifyResources(root);
  const mapping = JSON.parse(await readFile(path.join(root, '.publication-metadata/markdown-mapping.json')));
  assert.equal(mapping.length, 2);
  for (const { html, markdown } of mapping) {
    assert.equal(markdown, html.replace(/\.html$/, '.md'));
    assert.ok(!(markdown.startsWith('/markdown/')));
    assert.ok((await readFile(path.join(root, 'public', markdown.slice(1)), 'utf8')).length > 0);
  }
});

test('publication rejects an indexed Markdown page unreachable from the entry point', async (t) => {
  const root = await fixture(t, {
    'public/orphan.md': '# Orphan',
    'public/orphan.html': '<h1>Orphan</h1>',
    'public/llms.txt': '[Home](/index.md)\n[Orphan](/orphan.md)',
    'docs/orphan.md': '---\ntitle: Orphan\ndescription: Orphan page\n---\n',
    '.docusaurus/docusaurus-plugin-content-docs/default/orphan.json': JSON.stringify({
      source: '@site/docs/orphan.md', permalink: '/orphan',
    }),
  });
  await assert.rejects(verifyResources(root), /Markdown pages unreachable from index.md: orphan.md/);
});

test('rejects a build that retains the legacy public Markdown directory', async (t) => {
  const root = await fixture(t, { 'public/markdown/legacy.md': '# Legacy', 'public/markdown/legacy.html': '<h1>Legacy</h1>' });
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
  assert.deepEqual(JSON.parse(await readFile(path.join(root, '.publication-metadata/markdown-mapping.json'))), [
    { html: '/index.html', markdown: '/index.md' },
  ]);
});

for (const [name, changes, message] of [
  ['HTML link', { 'public/index.html': '<h1>Home</h1><a href="/missing">Broken</a>' }, /Broken internal link/],
  ['HTML anchor', { 'public/index.html': '<h1>Home</h1><a href="#missing">Broken</a>' }, /Broken anchor/],
  ['Markdown link', { 'public/index.md': '# Home\n[Broken](missing.md)' }, /Missing or unpublished source document/],
  ['Markdown anchor', { 'public/index.md': '# Home\n[Broken](#missing)' }, /Missing GFM heading anchor/],
  ['reference link', { 'public/index.md': '# Home\n[Broken][target]\n\n[target]: /missing' }, /must be relative/],
  ['embedded HTML link', { 'public/index.md': '# Home\n<a href="/missing">Broken</a>' }, /Broken internal link/],
  ['same-origin absolute link', { 'public/index.md': '# Home\n[Broken](https://example.com/missing)' }, /Broken internal link/],
  ['missing Markdown', { 'public/index.md': null }, /Missing alternate representation/],
  ['external llms entry', { 'public/llms.txt': '[Home](/index.md)\n[Other](https://other.example/a.md)' }, /must match/],
  ['duplicate llms entry', { 'public/llms.txt': '[Home](/index.md)\n[Duplicate](/index.md)' }, /must match/],
  ['unindexed Markdown', { 'public/stale.md': '# Stale', 'public/stale.html': '<h1>Stale</h1>' }, /must match/],
  ['draft publication', { '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/', slug: '/', draft: true }) }, /must match/],
  ['unlisted publication', { '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/', slug: '/', unlisted: true }) }, /must match/],
  ['missing HTML counterpart', { '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/absent', slug: '/' }) }, /Invalid HTML representation route/],
]) {
  test(`rejects ${name}`, async (t) => {
    await assert.rejects(verifyResources(await fixture(t, changes)), message);
  });
}

test('accepts shared asset links with encoded portable paths and query strings', async (t) => {
  const { collectSharedAssets } = await import('../scripts/shared-assets.mjs');
  const root = await fixture(t, {
    'public/index.md': '# Home\n## Section\n[Anchor](#section)\n[Asset](./assets/image%2done.svg?raw=1)\n',
    'public/index.html': '<h1>Home</h1><a href="./assets/image-one.svg?raw=1">Asset</a>',
    'public/assets/image-one.svg': '<svg/>',
    'static/assets/image-one.svg': '<svg/>',
  });
  await writeFile(path.join(root, '.publication-metadata/asset-manifest.json'), JSON.stringify(await collectSharedAssets(root)));
  await verifyResources(root);
});

test('supports explicit Markdown and HTML index pages', async (t) => {
  const root = await fixture(t, {
    'public/index.md': '# Home\n[Section](section/index.md)\n',
    'public/section/index.md': '# Section',
    'public/section/index.html': '<h1>Section</h1>',
    'public/llms.txt': '[Home](/index.md)\n[Section](/section/index.md)',
    'docs/section/index.md': '---\ntitle: Section\ndescription: Section page\n---\n',
    '.docusaurus/docusaurus-plugin-content-docs/default/section.json': JSON.stringify({ source: '@site/docs/section/index.md', permalink: '/section/', slug: '/section/' }),
  });
  await verifyResources(root);
  assert.match(await readFile(path.join(root, 'public/section/index.html'), 'utf8'), /View Markdown version/);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, '.publication-metadata/markdown-mapping.json'))), [
    { html: '/index.html', markdown: '/index.md' },
    { html: '/section/index.html', markdown: '/section/index.md' },
  ]);
});

test('validates Pages subpath links and mappings', async (t) => {
  const root = await fixture(t, {
    'docusaurus.config.js': "export default {url: 'https://example.com', baseUrl: '/spatial-docs/'};",
    'public/index.html': '<h1 id="home">Home</h1><a href="/spatial-docs/index.md#home">Markdown</a>',
    'public/index.md': '# Home\n[Home](#home)',
    'public/llms.txt': '[Home](/spatial-docs/index.md)',
    '.docusaurus/docusaurus-plugin-content-docs/default/home.json': JSON.stringify({ source: '@site/docs/index.md', permalink: '/spatial-docs/', slug: '/' }),
  });
  await verifyResources(root);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, '.publication-metadata/markdown-mapping.json'))), [
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
    await assert.rejects(verifyResources(await fixture(t, { 'public/index.md': content })), message);
  });
}

test('allows only the leading generated HTML counterpart link', async (t) => {
  const root = await fixture(t, {
    'public/index.md': '[View HTML version](./index.html)\n\n# Home\n[Home](#home)',
  });
  await verifyResources(root);
  await writeFile(path.join(root, 'public/index.md'),
    '---\ntitle: Home\ndescription: Home\n---\n\n[View HTML version](./index.html)\n\n# Home\n[Another HTML link](./index.html)');
  await assert.rejects(verifyResources(root), /explicitly target .md/);
});

for (const baseUrl of ['/', '/spatial-docs/']) {
  test(`publication preview serves direct sibling representation URLs at ${baseUrl}`, { timeout: 20000 }, async (t) => {
    const markdown = '---\ntitle: Reference\ndescription: Shared reference\ncanonical_html: ./reference.html\ncanonical_markdown: ./reference.md\n---\n\n[View HTML version](./reference.html)\n';
    const root = await fixture(t, {
      'docusaurus.config.js': `export default {title: 'Test', url: 'https://example.com', baseUrl: '${baseUrl}'};`,
      'public/shared/reference.md': markdown,
      'public/shared/reference.html': '<h1>Reference HTML</h1>',
    });
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const { port } = reservation.address();
    await new Promise((resolve) => reservation.close(resolve));
    const child = spawn(process.execPath, [
      path.resolve('scripts/serve-publication.mjs'), root, '--host', '127.0.0.1', '--port', String(port), '--no-open',
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
    assert.equal(html.status, 200);
    assert.equal(html.headers.get('location'), null);
    assert.match(await html.text(), /Reference HTML/);
    const directory = await fetch(`${origin}${baseUrl}shared/reference/`, {redirect: 'manual'});
    assert.equal(directory.status, 404);
    const implicit = await fetch(`${origin}${baseUrl}shared/reference`, {redirect: 'manual'});
    assert.equal(implicit.status, 404);
    const legacy = await fetch(`${origin}${baseUrl}markdown/shared/reference.md`);
    assert.equal(legacy.status, 404);
  });
}

for (const [name, mutation] of [
  ['missing HTML', async (root) => rm(path.join(root, 'public/index.html'))],
  ['directory route', async (root) => writeFile(path.join(root, '.docusaurus/docusaurus-plugin-content-docs/default/home.json'),
    JSON.stringify({source: '@site/docs/index.md', permalink: '/'}))],
  ['duplicate mapping', async (root) => writeFile(path.join(root, '.docusaurus/docusaurus-plugin-content-docs/default/duplicate.json'),
    JSON.stringify({source: '@site/docs/index.md', permalink: '/index.html'}))],
]) {
  test(`representation corpus rejects ${name}`, async (t) => {
    const root = await fixture(t);
    await mutation(root);
    await assert.rejects(verifyResources(root), /Missing alternate representation|Invalid HTML representation route|Duplicate representation path/);
  });
}

test('rejects orphan HTML documentation outside the mapping', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'public/orphan.html'), '<div class="theme-doc-markdown"><h1>Orphan</h1></div>');
  await assert.rejects(verifyResources(root), /HTML documentation outside the one-to-one representation mapping/);
});
