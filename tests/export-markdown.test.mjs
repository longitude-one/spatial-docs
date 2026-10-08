import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  cp,
  symlink,
  rm,
  access,
  lstat,
} from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const repository = fileURLToPath(new URL('../', import.meta.url));

function document(title, description, body = '', extraMetadata = '') {
  return `---\ntitle: ${title}\ndescription: ${description}\n${extraMetadata}---\n${body}`;
}

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
  return {
    root,
    run: (environment = {}) => execute(
      process.execPath,
      [path.join(root, 'scripts/export-markdown.mjs')],
      { env: { ...process.env, DOCUSAURUS_DEPLOYMENT: '', ...environment } },
    ),
  };
}

test('exports canonical Markdown with only portable metadata and explicit representations', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document(
      'Home',
      'The documentation home page.',
      '## Browse\n\n- Shared\n- Libraries\n',
      'id: home\nsidebar_position: 1\n',
    ),
    'docs/shared/point.md': document(
      'Point [coordinates]',
      'Represents a zero-dimensional geometry.',
      '## Coordinates\n\n```wkt\nPOINT (1 2)\n```\n',
      'id: point\n',
    ),
  });
  await run();

  const home = await readFile(path.join(root, 'static/markdown/index.md'), 'utf8');
  const point = await readFile(path.join(root, 'static/markdown/shared/point.md'), 'utf8');
  assert.match(home, /^---\ntitle: Home\ndescription: The documentation home page\.\ncanonical_html: \.\.\/index\.html\ncanonical_markdown: \.\/index\.md\n---\n\n\[View HTML version\]\(\.\.\/index\.html\)/);
  assert.doesNotMatch(home, /sidebar_position|^id:/m);
  assert.doesNotMatch(home, /^# Home$/m);
  assert.match(home, /## Browse/);
  assert.match(point, /canonical_html: \.\.\/\.\.\/shared\/point\.html/);
  assert.match(point, /canonical_markdown: \.\/point\.md/);
  assert.match(point, /\[View HTML version\]\(\.\.\/\.\.\/shared\/point\.html\)/);
  assert.match(point, /```wkt\nPOINT \(1 2\)\n```/);
  assert.match(await readFile(path.join(root, 'static/llms.txt'), 'utf8'), /- \[Point \\\[coordinates\\\]\]\(\/markdown\/shared\/point\.md\)/);
});

test('preserves the source hierarchy and excludes drafts, unlisted, and hidden pages', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Home', 'The documentation home page.'),
    'docs/shared/index.md': document('Shared', 'Shared documentation.'),
    'docs/draft.md': document('Draft', 'An unpublished draft.', '', 'draft: true\n'),
    'docs/unlisted.md': document('Unlisted', 'An unpublished page.', '', 'unlisted: true\n'),
    'docs/_hidden.md': document('Hidden', 'A hidden page.'),
    'static/markdown/stale.md': '# Stale',
  });
  await run();

  assert.match(await readFile(path.join(root, 'static/markdown/shared/index.md'), 'utf8'), /title: Shared/);
  for (const name of ['draft.md', 'unlisted.md', '_hidden.md', 'stale.md']) {
    await assert.rejects(access(path.join(root, 'static/markdown', name)));
  }
});

test('rejects MDX source files', async (t) => {
  const { run } = await fixture(t, {
    'docs/index.md': document('Home', 'The documentation home page.'),
    'docs/example.mdx': '# Example\n\n{1 + 1}',
  });
  await assert.rejects(run(), /Unsupported documentation source format: docs\/example\.mdx\. Use \.md files only\./);
});

for (const [name, source, message] of [
  ['missing front matter', '# Home', /must start with YAML front matter/],
  ['missing title', '---\ndescription: A description.\n---\n# Home', /must define a non-empty title/],
  ['missing description', '---\ntitle: Home\n---\n# Home', /must define a non-empty description/],
  ['empty title', '---\ntitle: \"\"\ndescription: A description.\n---\n# Home', /must define a non-empty title/],
  ['Docusaurus slug metadata', document('Home', 'Description.', '', 'slug: /custom\n'), /must not define Docusaurus slug metadata/],
  ['MDX expression', document('Home', 'Description.', '{1 + 1}'), /MDX JavaScript expressions are not supported/],
  ['multiline MDX expression', document('Home', 'Description.', '{\n  1 + 1\n}'), /MDX JavaScript expressions are not supported/],
  ['MDX import', document('Home', 'Description.', 'import Thing from \"thing\";'), /MDX imports and exports are not supported/],
  ['raw HTML', document('Home', 'Description.', '<div>Unsupported</div>'), /Raw HTML and JSX are not supported/],
]) {
  test(`rejects ${name}`, async (t) => {
    const { run } = await fixture(t, { 'docs/index.md': source });
    await assert.rejects(run(), message);
  });
}

for (const invalidPath of [
  'docs/Uppercase.md',
  'docs/has space.md',
  'docs/shared/Uppercase/index.md',
  'docs/shared/con.md',
  'docs/shared/name#.md',
]) {
  test(`rejects non-portable source path ${invalidPath}`, async (t) => {
    const { run } = await fixture(t, {
      'docs/index.md': document('Home', 'The documentation home page.'),
      [invalidPath]: document('Invalid', 'A non-portable source path.'),
    });
    await assert.rejects(run(), /Unsupported documentation path/);
  });
}

test('removes Markdown comments and canonicalizes CRLF and UTF-8 BOM input', async (t) => {
  const source = `\uFEFF---\r\ntitle: Home\r\ndescription: The documentation home page.\r\nid: home\r\n---\r\n\r\n<!-- source-only comment -->\r\n\r\nParagraph with two trailing spaces.  \r\n\r\n\`\`\`json\r\n{"ok": true}\r\n\`\`\`\r\n`;
  const { root, run } = await fixture(t, { 'docs/index.md': source });
  await run();
  const output = await readFile(path.join(root, 'static/markdown/index.md'));
  const markdown = output.toString('utf8');
  assert.equal(output.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);
  assert.equal(markdown.includes('\r'), false);
  assert.doesNotMatch(markdown, /source-only comment/);
  assert.match(markdown, /Paragraph with two trailing spaces\.\n/);
  assert.match(markdown, /```json\n\{"ok": true\}\n```/);
});

test('accepts a metadata-only document without inserting placeholder body content', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Reserved geometry type', 'This page documents a reserved geometry type.'),
  });
  await run();
  const output = await readFile(path.join(root, 'static/markdown/index.md'), 'utf8');
  assert.match(output, /canonical_html: \.\.\/index\.html/);
  assert.match(output, /\[View HTML version\]\(\.\.\/index\.html\)/);
  assert.doesNotMatch(output, /No content|TODO|placeholder/i);
});

test('generation is deterministic and idempotent for unchanged sources', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Home', 'The documentation home page.', '## Browse\n\nA paragraph.\n'),
    'docs/shared/point.md': document('Point', 'Represents a point.'),
  });
  await run();
  const firstOutput = await readFile(path.join(root, 'static/markdown/index.md'));
  const firstIndex = await readFile(path.join(root, 'static/llms.txt'));
  const firstInode = (await lstat(path.join(root, 'static/markdown/index.md'))).ino;
  await run();
  assert.deepEqual(await readFile(path.join(root, 'static/markdown/index.md')), firstOutput);
  assert.deepEqual(await readFile(path.join(root, 'static/llms.txt')), firstIndex);
  assert.equal((await lstat(path.join(root, 'static/markdown/index.md'))).ino, firstInode);
});

test('a failed generation leaves the last valid corpus and index untouched', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Home', 'The documentation home page.'),
  });
  await run();
  const firstOutput = await readFile(path.join(root, 'static/markdown/index.md'));
  const firstIndex = await readFile(path.join(root, 'static/llms.txt'));
  await writeFile(
    path.join(root, 'docs/invalid.md'),
    '---\ntitle: Invalid\nslug: /invalid\ndescription: Invalid slug.\n---\n',
  );

  await assert.rejects(run(), /must not define Docusaurus slug metadata/);
  assert.deepEqual(await readFile(path.join(root, 'static/markdown/index.md')), firstOutput);
  assert.deepEqual(await readFile(path.join(root, 'static/llms.txt')), firstIndex);
});

test('development deployment settings do not change generated document content', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Home', 'The documentation home page.', '[Markdown](/markdown/index.md)\n'),
  });
  await run();
  const productionMarkdown = await readFile(path.join(root, 'static/markdown/index.md'));
  await run({ DOCUSAURUS_DEPLOYMENT: 'development' });
  const developmentMarkdown = await readFile(path.join(root, 'static/markdown/index.md'));
  assert.deepEqual(developmentMarkdown, productionMarkdown);
  assert.doesNotMatch(developmentMarkdown.toString('utf8'), /Development version/);
});
