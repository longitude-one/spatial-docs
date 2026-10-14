import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { markdownReachability, verifyMarkdownReachability } from '../scripts/markdown-reachability.mjs';

const documents = (sources) => new Map(Object.entries(sources).map(([name, markdown]) =>
  [name, { tree: unified().use(remarkParse).parse(markdown) }]));
test('Markdown traversal follows inline and reference links, fragments, queries and cycles', () => {
  const corpus = documents({
    'index.md': '[Library](library/index.md#overview)',
    'library/index.md': '[Guide][guide]\n\n[guide]: ./guide.md?view=plain#start',
    'library/guide.md': '[Home](../index.md)',
  });
  assert.deepEqual(verifyMarkdownReachability(corpus), { reached: ['index.md', 'library/guide.md', 'library/index.md'], missing: [] });
});
test('HTML counterparts, external links and unlinked definitions cannot hide orphaned Markdown pages', () => {
  const corpus = documents({
    'index.md': '[HTML](./orphan.html)\n[External](https://example.org/orphan.md)\n\n[unused]: orphan.md',
    'orphan.md': '[Home](./index.md)',
  });
  assert.deepEqual(markdownReachability(corpus).missing, ['orphan.md']);
  assert.throws(() => verifyMarkdownReachability(corpus), /unreachable.*orphan.md/);
});
