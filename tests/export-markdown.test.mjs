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
  await cp(path.join(repository, 'scripts/library-versions.mjs'), path.join(root, 'scripts/library-versions.mjs'));
  await cp(path.join(repository, 'scripts/documentation-links.mjs'), path.join(root, 'scripts/documentation-links.mjs'));
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

  const home = await readFile(path.join(root, '.generated-markdown/index.md'), 'utf8');
  const point = await readFile(path.join(root, '.generated-markdown/shared/point.md'), 'utf8');
  assert.match(home, /^---\ntitle: Home\ndescription: The documentation home page\.\ncanonical_html: \.\/index\.html\ncanonical_markdown: \.\/index\.md\n---\n\n\[View HTML version\]\(\.\/index\.html\)/);
  assert.doesNotMatch(home, /sidebar_position|^id:/m);
  assert.doesNotMatch(home, /^# Home$/m);
  assert.match(home, /## Browse/);
  assert.match(point, /canonical_html: \.\/point\.html/);
  assert.match(point, /canonical_markdown: \.\/point\.md/);
  assert.match(point, /\[View HTML version\]\(\.\/point\.html\)/);
  assert.match(point, /```wkt\nPOINT \(1 2\)\n```/);
  assert.match(await readFile(path.join(root, '.generated-markdown/llms.txt'), 'utf8'), /- \[Point \\\[coordinates\\\]\]\(\/shared\/point\.md\)/);
});

test('preserves the source hierarchy and excludes drafts, unlisted, and hidden pages', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Home', 'The documentation home page.'),
    'docs/shared/index.md': document('Shared', 'Shared documentation.'),
    'docs/draft.md': document('Draft', 'An unpublished draft.', '', 'draft: true\n'),
    'docs/unlisted.md': document('Unlisted', 'An unpublished page.', '', 'unlisted: true\n'),
    'docs/_hidden.md': document('Hidden', 'A hidden page.'),
    '.generated-markdown/stale.md': '# Stale',
    'static/markdown/legacy.md': '# Old public prefix',
    'static/llms.txt': 'Old index',
    'static/assets/retained.json': '{}',
  });
  await run();

  assert.match(await readFile(path.join(root, '.generated-markdown/shared/index.md'), 'utf8'), /title: Shared/);
  for (const name of ['draft.md', 'unlisted.md', '_hidden.md', 'stale.md']) {
    await assert.rejects(access(path.join(root, '.generated-markdown', name)));
  }
  await assert.rejects(access(path.join(root, 'static/markdown')));
  await assert.rejects(access(path.join(root, 'static/llms.txt')));
  assert.equal(await readFile(path.join(root, 'static/assets/retained.json'), 'utf8'), '{}');
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
  'docs/uppercase-extension.MD',
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
  const output = await readFile(path.join(root, '.generated-markdown/index.md'));
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
  const output = await readFile(path.join(root, '.generated-markdown/index.md'), 'utf8');
  assert.match(output, /canonical_html: \.\/index\.html/);
  assert.match(output, /\[View HTML version\]\(\.\/index\.html\)/);
  assert.doesNotMatch(output, /No content|TODO|placeholder/i);
});

test('generation is deterministic and idempotent for unchanged sources', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Home', 'The documentation home page.', '## Browse\n\nA paragraph.\n'),
    'docs/shared/point.md': document('Point', 'Represents a point.'),
  });
  await run();
  const firstOutput = await readFile(path.join(root, '.generated-markdown/index.md'));
  const firstIndex = await readFile(path.join(root, '.generated-markdown/llms.txt'));
  const firstInode = (await lstat(path.join(root, '.generated-markdown/index.md'))).ino;
  await run();
  assert.deepEqual(await readFile(path.join(root, '.generated-markdown/index.md')), firstOutput);
  assert.deepEqual(await readFile(path.join(root, '.generated-markdown/llms.txt')), firstIndex);
  assert.equal((await lstat(path.join(root, '.generated-markdown/index.md'))).ino, firstInode);
});

test('a failed generation leaves the last valid corpus and index untouched', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Home', 'The documentation home page.'),
  });
  await run();
  const firstOutput = await readFile(path.join(root, '.generated-markdown/index.md'));
  const firstIndex = await readFile(path.join(root, '.generated-markdown/llms.txt'));
  await writeFile(
    path.join(root, 'docs/invalid.md'),
    '---\ntitle: Invalid\nslug: /invalid\ndescription: Invalid slug.\n---\n',
  );

  await assert.rejects(run(), /must not define Docusaurus slug metadata/);
  assert.deepEqual(await readFile(path.join(root, '.generated-markdown/index.md')), firstOutput);
  assert.deepEqual(await readFile(path.join(root, '.generated-markdown/llms.txt')), firstIndex);
});

test('development deployment settings do not change generated document content', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Home', 'The documentation home page.', '[Markdown](./index.md)\n'),
  });
  await run();
  const productionMarkdown = await readFile(path.join(root, '.generated-markdown/index.md'));
  await run({ DOCUSAURUS_DEPLOYMENT: 'development' });
  const developmentMarkdown = await readFile(path.join(root, '.generated-markdown/index.md'));
  assert.deepEqual(developmentMarkdown, productionMarkdown);
  assert.doesNotMatch(developmentMarkdown.toString('utf8'), /Development version/);
});

test('resolves source links structurally and preserves fragments, external URLs, assets and literals', async (t) => {
  const { root, run } = await fixture(t, {
    'docs/index.md': document('Home', 'Home page.', '## Home\n'),
    'docs/shared/point.md': document('Point', 'Point page.', '## **Coordinates** and `values`\n## Café\n'),
    'docs/shared/nested/example.md': document('Example', 'Nested example.', [
      '## Local section',
      '',
      '[Point](.././point.md?raw=1#coordinates-and-values)',
      '[Unicode](../point.md#caf%C3%A9)',
      '[Home](../../index.md)',
      '[Local](#local-section)',
      'See [Point][point-doc] and [Home].',
      '',
      '[point-doc]: ../point.md#coordinates-and-values',
      '[Home]: ../../index.md',
      '',
      '[External](https://example.org/Point.html?raw=1#Coordinates)',
      '[Same-host external](https://longitude-one.github.io/another-project/help.html)',
      '[Mail](mailto:docs@example.org)',
      '[Protocol relative](//example.org/Point.html)',
      '[Schema](../../assets/schema.json)',
      '![Model](../../assets/model.svg)',
      '![Reference model][model-asset]',
      '',
      '[model-asset]: ../../assets/model.svg',
      '',
      'Literal `../Point.html`, https://example.org/Point.html and ./point/ remain text.',
      '',
      '```json',
      '{"url":"../Point.html","markdown":"[Point](../Point.html)"}',
      '```',
      '',
      '```sql',
      "SELECT '../Point.html';",
      '```',
    ].join('\n')),
    'static/assets/schema.json': '{}',
    'static/assets/model.svg': '<svg/>',
  });
  await run();
  const outputPath = path.join(root, '.generated-markdown/shared/nested/example.md');
  const first = await readFile(outputPath, 'utf8');
  assert.match(first, /\[Point\]\(\.\.\/point\.md\?raw=1#coordinates-and-values\)/);
  assert.match(first, /\[Unicode\]\(\.\.\/point\.md#caf%C3%A9\)/);
  assert.match(first, /\[Home\]\(\.\.\/\.\.\/index\.md\)/);
  assert.match(first, /\[Local\]\(#local-section\)/);
  assert.match(first, /\[point-doc\]: \.\.\/point\.md#coordinates-and-values/);
  for (const literal of ['https://example.org/Point.html?raw=1#Coordinates',
    'https://longitude-one.github.io/another-project/help.html', 'mailto:docs@example.org',
    '//example.org/Point.html', '../../assets/schema.json', '../../assets/model.svg',
    '{"url":"../Point.html","markdown":"[Point](../Point.html)"}', "SELECT '../Point.html';"]) {
    assert.ok(first.includes(literal), `Preserves ${literal}`);
  }
  await run({ DOCUSAURUS_DEPLOYMENT: 'development' });
  assert.equal(await readFile(outputPath, 'utf8'), first);
});

for (const [name, target, reason] of [
  ['missing document', './missing.md', /Missing or unpublished source document/],
  ['wrong casing', './Point.md', /lowercase, portable and case-sensitive/],
  ['wrong extension casing', './point.MD', /lowercase, portable and case-sensitive/],
  ['spaces', './point%20example.md', /lowercase, portable and case-sensitive/],
  ['reserved name', './con.md', /lowercase, portable and case-sensitive/],
  ['unsupported characters', './point%3F.md', /lowercase, portable and case-sensitive/],
  ['backslash', './folder%5Cpoint.md', /lowercase, portable and case-sensitive/],
  ['extensionless target', './point', /explicitly target .md files/],
  ['directory target', './shared/', /explicitly target .md files|lowercase, portable/],
  ['HTML target', './point.html', /explicitly target .md files/],
  ['manually written HTML exception', './index.html', /explicitly target .md files/],
  ['root-relative Markdown', '/point.md', /must be relative/],
  ['absolute Markdown', 'https://longitude-one.github.io/point.md', /Absolute URLs/],
  ['absolute HTML', 'https://longitude-one.github.io/point.html', /Absolute URLs/],
  ['absolute URL with encoded path', 'https://longitude-one.github.io/%70oint.md', /Absolute URLs/],
  ['absolute URL with invalid case', 'https://longitude-one.github.io/Point.md', /Absolute URLs/],
  ['absolute directory', 'https://longitude-one.github.io/shared/', /Absolute URLs/],
  ['absolute exported Markdown', 'https://longitude-one.github.io/markdown/point.md', /Absolute URLs/],
  ['development absolute Markdown', 'https://longitude-one.github.io/spatial-docs/markdown/point.md', /Absolute URLs/],
  ['protocol-relative internal URL', '//longitude-one.github.io/point.md', /Absolute URLs/],
  ['Docusaurus pathname URL', 'pathname:///markdown/index.md', /relative explicit .md/],
  ['outside document', '../outside.md', /must not escape docs/],
  ['outside license', '../LICENSE', /lowercase, portable|must not escape docs/],
  ['unpublished outside asset', '../secret.json', /not a published shared asset/],
  ['missing cross-document anchor', './point.md#missing', /Missing GFM heading anchor/],
  ['missing local anchor', '#missing', /Missing GFM heading anchor/],
  ['numeric suffix for duplicate heading', './point.md#coordinates-1', /Missing GFM heading anchor/],
  ['malformed URL encoding', './point.md#bad%zz', /Malformed percent encoding/],
]) {
  test(`rejects ${name} before publication with source diagnostics`, async (t) => {
    const { run } = await fixture(t, {
      'docs/index.md': document('Home', 'Home page.', `\n[Target](${target})\n`),
      'docs/point.md': document('Point', 'Point page.', '## Coordinates\n'),
      'docs/shared/index.md': document('Shared', 'Shared page.'),
    });
    await assert.rejects(run(), (error) => {
      assert.match(error.stderr, /docs\/index\.md:6:1: Invalid internal documentation link/);
      assert.ok(error.stderr.includes(target));
      assert.match(error.stderr, /Resolved target:/);
      assert.match(error.stderr, reason);
      return true;
    });
  });
}

for (const metadata of ['draft: true\n', 'unlisted: true\n']) {
  test(`rejects links to excluded page ${metadata.trim()}`, async (t) => {
    const { run } = await fixture(t, {
      'docs/index.md': document('Home', 'Home page.', '[Hidden](./hidden.md)'),
      'docs/hidden.md': document('Hidden', 'Excluded page.', '', metadata),
    });
    await assert.rejects(run(), /Missing or unpublished source document/);
  });
}

test('rejects reference-style invalid targets at their source definition', async (t) => {
  const { run } = await fixture(t, {
    'docs/index.md': document('Home', 'Home page.', '\n[Point][point-doc]\n\n[point-doc]: ./Point.md\n'),
  });
  await assert.rejects(run(), /docs\/index\.md:8:1: Invalid internal documentation link: \.\/Point\.md/);
});

test('rejects links to hidden source documents', async (t) => {
  const { run } = await fixture(t, {
    'docs/index.md': document('Home', 'Home page.', '[Hidden](./_hidden.md)'),
    'docs/_hidden.md': document('Hidden', 'Excluded page.'),
  });
  await assert.rejects(run(), /Missing or unpublished source document/);
});

for (const headings of ['## Coordinates\n## Coordinates\n', '## **Coordinates**\n## Coordinates\n']) {
  test(`rejects ambiguous heading anchors in ${JSON.stringify(headings)}`, async (t) => {
    const { run } = await fixture(t, { 'docs/index.md': document('Home', 'Home page.', headings) });
    await assert.rejects(run(), /Duplicate or ambiguous GFM heading anchor/);
  });
}

for (const kind of ['file', 'directory']) {
  test(`rejects a symbolic ${kind} in the source hierarchy`, async (t) => {
    const { root, run } = await fixture(t, {
      'docs/index.md': document('Home', 'Home page.', kind === 'file' ? '[Point](./alias.md)' : '[Point](./alias/point.md)'),
      'docs/shared/point.md': document('Point', 'Point page.'),
    });
    await symlink(kind === 'file' ? 'shared/point.md' : 'shared', path.join(root, 'docs', kind === 'file' ? 'alias.md' : 'alias'));
    await assert.rejects(run(), /Symbolic links are not supported/);
  });
}

test('invalid source links leave the last published corpus untouched', async (t) => {
  const { root, run } = await fixture(t, { 'docs/index.md': document('Home', 'Home page.') });
  await run();
  const before = await readFile(path.join(root, '.generated-markdown/index.md'));
  await writeFile(path.join(root, 'docs/index.md'), document('Home', 'Home page.', '[Missing](./missing.md)'));
  await assert.rejects(run(), /Missing or unpublished source document/);
  assert.deepEqual(await readFile(path.join(root, '.generated-markdown/index.md')), before);
});
