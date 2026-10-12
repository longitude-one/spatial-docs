import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import sidebars from '../sidebars.js';

function sidebarDocuments(items) {
  return items.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (item.type === 'doc') return [item.id];
    if (item.type === 'category') {
      return [...(item.link?.type === 'doc' ? [item.link.id] : []), ...sidebarDocuments(item.items)];
    }
    throw new Error(`Unsupported sidebar item type: ${item.type}`);
  });
}

test('Concepts uses an overview and flat topic pages like DBMS', async () => {
  const concepts = sidebars.docsSidebar.find((item) => item.label === 'Concepts');
  const topics = ['geometries', 'dimensions', 'crs', 'formats'];
  assert.deepEqual(concepts.link, { type: 'doc', id: 'concepts/index' });
  assert.deepEqual(concepts.items, ['concepts/index', ...topics.map((topic) => `concepts/${topic}`)]);
  const entries = await readdir(new URL('../docs/concepts/', import.meta.url), { withFileTypes: true });
  assert.deepEqual(entries.map((entry) => entry.name).sort(), ['index.md', ...topics.map((topic) => `${topic}.md`)].sort());
  assert.ok(entries.every((entry) => entry.isFile()), 'Concept references must be files directly under docs/concepts/');
});

test('the documentation menu includes every published source page and no missing pages', async () => {
  const docsDirectory = new URL('../docs/', import.meta.url);
  const publishedIds = [];
  for (const filename of await readdir(docsDirectory, { recursive: true })) {
    if (!filename.endsWith('.md') || filename.split(path.sep).some((part) => part.startsWith('_'))) continue;
    const source = await readFile(new URL(filename.split(path.sep).join('/'), docsDirectory), 'utf8');
    const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
    assert.ok(frontMatter, `${filename} must have front matter`);
    const metadata = yaml.load(frontMatter[1]);
    if (metadata.draft || metadata.unlisted) continue;
    const directory = path.dirname(filename);
    const basename = metadata.id ?? path.basename(filename, '.md');
    publishedIds.push(directory === '.' ? basename : `${directory.split(path.sep).join('/')}/${basename}`);
  }

  const menuIds = [...new Set(sidebarDocuments(sidebars.docsSidebar))];
  assert.deepEqual(menuIds.sort(), publishedIds.sort(),
    'Every published document must be reachable from the documentation menu');
});
