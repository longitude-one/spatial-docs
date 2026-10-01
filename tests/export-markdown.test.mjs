import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, symlink, rm, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const repository = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t, sources) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'spatial-docs-export-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'scripts'));
  await cp(path.join(repository, 'scripts/export-markdown.mjs'), path.join(root, 'scripts/export-markdown.mjs'));
  await cp(path.join(repository, 'scripts/site-settings.mjs'), path.join(root, 'scripts/site-settings.mjs'));
  await symlink(path.join(repository, 'node_modules'), path.join(root, 'node_modules'));
  for (const [name, body] of Object.entries(sources)) {
    const file = path.join(root, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
  return { root, run: (environment = {}) => execute(process.execPath, [path.join(root, 'scripts/export-markdown.mjs')], { env: { ...process.env, DOCUSAURUS_DEPLOYMENT: '', ...environment } }) };
}

test('exports public Markdown and MDX, excluding drafts and removing stale resources', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/home.md': '---\nslug: /\n---\n# Home',
    'docs/example.mdx': '# Example\n\n<aside>Static content</aside>',
    'docs/draft.md': '---\ndraft: true\n---\n# Draft',
    'docs/unlisted.md': '---\nunlisted: true\n---\n# Unlisted',
    'docs/_hidden.md': '# Hidden',
    'static/markdown/stale.md': '# Stale',
  });
  await run();
  assert.match(await readFile(path.join(root, 'static/markdown/example.md'), 'utf8'), /Static content/);
  assert.equal(await readFile(path.join(root, 'static/markdown/index.md'), 'utf8'), '# Home');
  for (const name of ['draft', 'unlisted', '_hidden', 'stale']) {
    await assert.rejects(access(path.join(root, `static/markdown/${name}.md`)));
  }
});

test('generation fails on unsupported MDX expressions', async (t) => {
  const { run } = await fixture(t, { 'docs/example.mdx': '# Example\n\n{1 + 1}' });
  await assert.rejects(run(), /MDX JavaScript expressions cannot be exported/);
});

test('generation fails on colliding Markdown destinations', async (t) => {
  const { run } = await fixture(t, { 'docs/example.md': '# One', 'docs/example.mdx': '# Two' });
  await assert.rejects(run(), /Duplicate Markdown destination/);
});

test('development exports identify themselves and rebase internal links without changing code', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/home.md': '---\nslug: /\n---\n# Home\n\n[Markdown](/markdown/index.md)\n\n<a href="/markdown/index.md">HTML</a>\n\n`[Code](/unchanged)`\n\n[External](https://example.com/)\n',
  });
  await run({ DOCUSAURUS_DEPLOYMENT: 'development' });
  const markdown = await readFile(path.join(root, 'static/markdown/index.md'), 'utf8');
  const index = await readFile(path.join(root, 'static/llms.txt'), 'utf8');
  assert.match(markdown, /Development version — not the official LongitudeOne documentation/);
  assert.match(markdown, /\[Markdown\]\(\/spatial-docs\/markdown\/index.md\)/);
  assert.match(markdown, /href="\/spatial-docs\/markdown\/index.md"/);
  assert.match(markdown, /`\[Code\]\(\/unchanged\)`/);
  assert.match(markdown, /https:\/\/example.com\//);
  assert.match(index, /Development version/);
  assert.match(index, /\/spatial-docs\/markdown\/index.md/);
});
