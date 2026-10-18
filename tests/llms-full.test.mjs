import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLlmsFull, validateLlmsFull } from '../scripts/llms-full.mjs';

const options = { base: 'https://example.test/project/', production: 'https://official.test/', assets: ['assets/model.svg'] };
const page = (markdownPath, body = '# Content\n\nText.', title = markdownPath) => ({ markdownPath,
  content: `---\ntitle: '${title}'\ndescription: 'A description'\ncanonical_html: './index.html'\ncanonical_markdown: './index.md'\n---\n\n${body}\n` });

test('aggregates every published document once in stable editorial order, preserving duplicate content', () => {
  const pages = [page('spatial-core/v2/index.md'), page('shared/guide.md'), page('index.md')];
  const result = generateLlmsFull(pages, options);
  assert.equal(result, generateLlmsFull([...pages].reverse(), options));
  assert.ok(result.indexOf('## index.md') < result.indexOf('## shared/guide.md'));
  assert.ok(result.indexOf('## shared/guide.md') < result.indexOf('## spatial-core/v2/index.md'));
  assert.equal((result.match(/Source: /g) || []).length, 3);
  assert.equal((result.match(/# Content/g) || []).length, 3);
  assert.match(result, /Description: A description/);
  assert.doesNotMatch(result, /canonical_html|canonical_markdown|title:/);
  assert.equal(validateLlmsFull(result, pages, options), true);
});

test('rebases fragments, document links, reference definitions and assets through AST', () => {
  const pages = [page('shared/one.md', '# One\n\n[Self](#one) [Two](two.md#two) ![Model](../assets/model.svg)\n\n[Reference][two]\n\n[two]: two.md#two\n\n`[Code](two.md)`'), page('shared/two.md')];
  const result = generateLlmsFull(pages, options);
  assert.match(result, /https:\/\/example.test\/project\/shared\/one.md#one/);
  assert.equal((result.match(/https:\/\/example.test\/project\/shared\/two.md#two/g) || []).length, 2);
  assert.match(result, /https:\/\/example.test\/project\/assets\/model.svg/);
  assert.match(result, /`\[Code\]\(two.md\)`/);
  assert.doesNotMatch(result, /\[two\]:/);
});

test('reference identifiers remain scoped to their individual document', () => {
  const pages = [page('one.md', '[Other][ref]\n\n[ref]: two.md'), page('two.md', '[Other][ref]\n\n[ref]: one.md')];
  const result = generateLlmsFull(pages, options);
  assert.match(result, /\[Other\]\(https:\/\/example.test\/project\/two.md\)/);
  assert.match(result, /\[Other\]\(https:\/\/example.test\/project\/one.md\)/);
});

test('development variant identifies official production and uses active project base', () => {
  const pages = [page('index.md')];
  const result = generateLlmsFull(pages, { ...options, development: true });
  assert.match(result, /non-official development documentation/);
  assert.match(result, /https:\/\/official.test\//);
  assert.match(result, /https:\/\/example.test\/project\/index.md/);
  assert.doesNotMatch(generateLlmsFull(pages, options), /non-official/);
});

test('validation rejects omitted, duplicate, unknown, altered and improperly encoded output', () => {
  const pages = [page('one.md'), page('two.md')];
  const result = generateLlmsFull(pages, options);
  for (const changed of ['', result + result, result.replace('two.md', 'unknown.md'), result.replace('Text.', 'Changed.'),
    result.replaceAll('\n', '\r\n'), `\uFEFF${result}`, generateLlmsFull(pages.slice(0, 1), options)]) {
    assert.throws(() => validateLlmsFull(changed, pages, options));
  }
});

test('rejects malformed corpus, unavailable configuration and unresolved local resources', () => {
  assert.throws(() => generateLlmsFull([], options));
  assert.throws(() => generateLlmsFull([page('one.md'), page('one.md')], options));
  assert.throws(() => generateLlmsFull([page('../one.md')], options));
  assert.throws(() => generateLlmsFull([page('one.md')], { ...options, base: undefined }));
  assert.throws(() => generateLlmsFull([page('one.md')], { ...options, production: undefined }));
  assert.throws(() => generateLlmsFull([page('one.md')], { ...options, base: 'http://localhost/' }));
  for (const body of ['[Missing](missing.md)', '![Missing](assets/missing.svg)', '[Escape](../../outside.md)',
    '![Embedded](data:image/png;base64,abcd)', '<div>HTML</div>', '[Case](ONE.md)']) {
    assert.throws(() => generateLlmsFull([page('one.md', body)], options));
  }
});

test('leaves external links and fenced examples unchanged', () => {
  const result = generateLlmsFull([page('one.md', '[External](https://external.test/page.html)\n\n```html\n<div>example</div>\n```')], options);
  assert.match(result, /https:\/\/external.test\/page.html/);
  assert.match(result, /<div>example<\/div>/);
});


test('removes only the leading generated HTML representation switch from the published corpus', () => {
  const published = { markdownPath: 'index.md', content: `---
title: Home
description: The documentation home page.
canonical_html: ./index.html
canonical_markdown: ./index.md
---

[View HTML version](./index.html)

# Home

Published content.
` };
  const result = generateLlmsFull([published], options);
  assert.doesNotMatch(result, /View HTML version|index\.html/);
  assert.match(result, /Published content\./);
  assert.equal(validateLlmsFull(result, [published], options), true);
  assert.throws(() => generateLlmsFull([{ ...published,
    content: published.content.replace('[View HTML version]', '[Different link]') }], options));
});
