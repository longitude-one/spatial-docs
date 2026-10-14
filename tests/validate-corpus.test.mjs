import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { assembleManifest, validateCorpus, validateMarkdown, formatReport, lintMarkdown } from '../scripts/validate-corpus.mjs';
import { compareBuilds } from '../scripts/check-determinism.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markdown = (body = '## Example\n\nA portable document.\n', metadata = '') => `---
title: Example
description: Portable example
canonical_html: ./index.html
canonical_markdown: ./index.md
${metadata}---

[View HTML version](./index.html)

${body}`;
const options = { lint: async () => {}, resources: async () => {} };
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'corpus-validation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const build = path.join(root, 'build');
  await mkdir(build);
  await mkdir(path.join(root, '.generated-markdown'));
  await writeFile(path.join(root, '.generated-markdown/index.md'), markdown());
  for (const [file, content] of Object.entries({ 'index.md': markdown(), 'index.html': '<h1>Different representation body</h1>',
    '404.html': '', 'search.html': '', 'asset-manifest.json': '{}', 'llms.txt': 'index', 'markdown-mapping.json': '[]' })) {
    await writeFile(path.join(build, file), content);
  }
  await assembleManifest(root, build);
  return { root, build };
}

test('manifest and reports are deterministic and representations are not compared', async (t) => {
  const { root, build } = await fixture(t);
  const first = await readFile(path.join(build, 'documentation-manifest.json'), 'utf8');
  await assembleManifest(root, build);
  assert.equal(await readFile(path.join(build, 'documentation-manifest.json'), 'utf8'), first);
  const manifest = JSON.parse(first);
  assert.match(manifest.hashes['index.md'], /^[a-f0-9]{64}$/);
  assert.deepEqual(manifest.documents, [{ source: 'docs/index.md', html: 'index.html', markdown: 'index.md' }]);
  const report = await validateCorpus(root, build, options);
  assert.equal(report.status, 'passed');
  assert.deepEqual(report, await validateCorpus(root, build, options));
  assert.match(formatReport(report), /0 errors, 0 warnings/);
});

test('rejects unexpected HTML even without Docusaurus documentation markers', async (t) => {
  const { root, build } = await fixture(t);
  await writeFile(path.join(build, 'unexpected.html'), '<p>Unmapped page</p>');
  const report = await validateCorpus(root, build, options);
  assert.ok(report.errors.some(({ rule, file }) => rule === 'unexpected-document' && file === 'unexpected.html'));
});

test('rejects unexpected Markdown, nonportable casing, spaces and reserved paths', async (t) => {
  const { root, build } = await fixture(t);
  for (const name of ['Point.md', 'point example.md', 'con.html']) await writeFile(path.join(build, name), markdown());
  const report = await validateCorpus(root, build, options);
  assert.equal(report.errors.filter(({ rule }) => rule === 'portable-path').length, 3);
});

test('detects post-assembly changes and case-sensitive missing counterparts', async (t) => {
  const { root, build } = await fixture(t);
  await writeFile(path.join(build, 'index.md'), markdown('Modified content.\n'));
  await rm(path.join(build, 'index.html'));
  const report = await validateCorpus(root, build, options);
  assert.equal(report.errors.filter(({ rule }) => rule === 'integrity').length, 2);
});

for (const [name, body, metadata, pattern] of [
  ['unknown metadata', '', 'sidebar_position: 1\n', /metadata/],
  ['raw HTML', '<div>Unsafe</div>\n', '', /HTML|JSX/],
  ['JSX', '<Widget />\n', '', /HTML|JSX/],
  ['MDX expression', '{danger()}\n', '', /MDX/],
  ['unclosed fence', '```wkt\nPOINT (0 0)\n', '', /Unclosed/],
]) {
  test(`round-trip publication profile rejects ${name}`, () => assert.throws(() => validateMarkdown(markdown(body, metadata), 'index.md'), pattern));
}
test('round-trip GFM permits autolinks, reference links, tables and domain format identifiers', () => {
  validateMarkdown(markdown('Visit <https://example.invalid>.\n\n[Reference][ref]\n\n[ref]: https://example.invalid\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```wkt\nPOINT (0 0)\n```\n\n```ewkt\nSRID=4326;POINT (0 0)\n```\n\n```geojson\n{}\n```\n'), 'index.md');
});
test('metadata types, missing fields and canonical identities are strict', () => {
  for (const content of [markdown().replace('title: Example', 'title: 12'), markdown().replace('description: Portable example\n', ''),
    markdown().replace('canonical_html: ./index.html', 'canonical_html: ./index/')]) assert.throws(() => validateMarkdown(content, 'index.md'));
  // YAML mapping order has no schema significance.
  validateMarkdown(markdown().replace('title: Example\ndescription: Portable example', 'description: Portable example\ntitle: Example'), 'index.md');
});

test('shared asset warnings are explicitly nonblocking and assets carry hashes', async (t) => {
  const { root, build } = await fixture(t);
  await mkdir(path.join(build, 'assets'));
  await writeFile(path.join(build, 'assets/orphan.txt'), 'orphan');
  await writeFile(path.join(build, 'asset-manifest.json'), JSON.stringify({ 'assets/orphan.txt': {} }));
  await assembleManifest(root, build);
  const report = await validateCorpus(root, build, options);
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.warnings.map(({ rule }) => rule), ['orphaned-asset']);
  const manifest = JSON.parse(await readFile(path.join(build, 'documentation-manifest.json'), 'utf8'));
  assert.match(manifest.hashes['assets/orphan.txt'], /^[a-f0-9]{64}$/);
});

test('rejects symlinks without following them outside the corpus', async (t) => {
  const { root, build } = await fixture(t);
  await symlink(path.join(root, '.generated-markdown/index.md'), path.join(build, 'linked.md'));
  const report = await validateCorpus(root, build, options);
  assert.ok(report.errors.some(({ rule, message }) => rule === 'filesystem' && message.includes('Symbolic links')));
});

test('rejects filesystem leakage and HTML links into Markdown outside alternates', async (t) => {
  const { root, build } = await fixture(t);
  await writeFile(path.join(build, 'index.md'), markdown('Path: /home/alice/project/file\n'));
  await writeFile(path.join(build, 'index.html'), '<a href="./index.md">Content link</a>');
  const report = await validateCorpus(root, build, options);
  assert.equal(report.errors.filter(({ rule }) => rule === 'publication-profile').length, 2);
});

test('errors from reused resource validation remain blocking and preserve source locations', async (t) => {
  const { root, build } = await fixture(t);
  const report = await validateCorpus(root, build, { ...options, resources: async () => { throw new Error('build/index.md:12:5: Missing target'); } });
  assert.equal(report.status, 'failed');
  assert.deepEqual(report.errors[0], { file: 'docs/index.md', rule: 'resources', message: 'build/index.md:12:5: Missing target', line: 12, column: 5 });
});

test('real markdownlint-cli2 lint failures block validation', async (t) => {
  const { root, build } = await fixture(t);
  await writeFile(path.join(build, 'index.md'), markdown('## Heading\nNo blank line.\n'));
  const report = await validateCorpus(root, build, { ...options, lint: (_, directory, files) => lintMarkdown(repository, directory, files) });
  assert.ok(report.errors.some(({ rule, message }) => rule === 'markdownlint/MD022'));
});

test('determinism checks detect changed, added and missing generated artifacts', () => {
  compareBuilds({ 'index.md': 'a', 'index.html': 'b' }, { 'index.html': 'b', 'index.md': 'a' });
  for (const second of [{ 'index.md': 'changed' }, {}, { 'index.md': 'a', 'extra.html': 'b' }]) {
    assert.throws(() => compareBuilds({ 'index.md': 'a' }, second), /Non-deterministic/);
  }
});

test('known source code identifiers must survive serialization; unknown identifiers may be absent', async (t) => {
  const { root, build } = await fixture(t);
  await mkdir(path.join(root, 'docs'));
  await writeFile(path.join(root, 'docs/index.md'), '```wkt\nPOINT (0 0)\n```\n');
  await writeFile(path.join(build, 'index.md'), markdown('```\nPOINT (0 0)\n```\n'));
  const report = await validateCorpus(root, build, options);
  assert.ok(report.errors.some(({ message }) => message.includes('lost its source language')));
  validateMarkdown(markdown('```\nUnspecified format\n```\n'), 'index.md');
});

test('CLI failures return a nonzero status and write deterministic JSON plus actionable text', async (t) => {
  const { root, build } = await fixture(t);
  await writeFile(path.join(build, 'index.md'), markdown('## Broken\nNo blank line.\n'));
  const reportFile = path.join(root, 'report.json');
  const args = [path.join(repository, 'scripts/validate-corpus.mjs'), '--build-directory', build, '--report-file', reportFile];
  for (let attempt = 0; attempt < 2; attempt++) {
    await assert.rejects(promisify(execFile)(process.execPath, args), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, /Documentation corpus: failed;.*errors/);
      return true;
    });
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    assert.equal(report.status, 'failed');
    assert.ok(report.errors.some(({ rule }) => rule === 'markdownlint/MD022'));
    if (attempt === 0) await writeFile(path.join(root, 'first-report.json'), JSON.stringify(report));
    else assert.equal(JSON.stringify(report), await readFile(path.join(root, 'first-report.json'), 'utf8'));
  }
});
