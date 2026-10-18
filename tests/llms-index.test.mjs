import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLlmsIndex, validateLlmsIndex } from '../scripts/llms-index.mjs';
import { publicationUrls } from '../scripts/llms-config.mjs';

const config = { sections: [{ title: 'Start Here', entries: [{ path: 'index.md', label: 'Home', description: 'Choose a documentation topic.' }] }] };
const paths = ['index.md', 'other.md'];
const available = new Set([...paths, 'llms.txt', 'llms-full.txt']);
for (const development of [false, true]) {
  test(`curated index is deterministic and uses ${development ? 'preproduction' : 'production'} URLs`, () => {
    const urls = publicationUrls({ DOCUSAURUS_DEPLOYMENT: development ? 'development' : '', URL_PRODUCTION: 'https://official.example', URL_PREPRODUCTION: 'https://preview.example' });
    const content = generateLlmsIndex(config, paths, urls);
    assert.equal(content, generateLlmsIndex(config, [...paths].reverse(), urls));
    assert.match(content, new RegExp(development ? 'https://preview.example/spatial-docs/index.md' : 'https://official.example/index.md'));
    assert.ok(!content.includes('other.md'));
    assert.equal(validateLlmsIndex(content, available, urls), true);
    for (const [before, after] of [['index.md)', 'index.html)'], ['index.md)', 'index)'], [urls.base + 'index.md', '/index.md'], ['# LongitudeOne', '# Other\n\n# LongitudeOne']]) {
      assert.throws(() => validateLlmsIndex(content.replace(before, after), available, urls));
    }
    assert.throws(() => validateLlmsIndex(content, new Set(['index.md', 'llms.txt']), urls), /missing|published together/);
  });
}
test('required deployment URL configuration fails closed', () => {
  for (const value of [undefined, '', ' ', '/relative', 'https://localhost', 'https://x.example/#fragment', 'https://u:p@x.example']) {
    assert.throws(() => publicationUrls({ URL_PRODUCTION: value }), /URL_PRODUCTION/);
  }
  assert.throws(() => publicationUrls({ URL_PRODUCTION: 'https://official.example', DOCUSAURUS_DEPLOYMENT: 'development' }), /URL_PREPRODUCTION/);
});
test('unpublished editorial targets fail generation', () => {
  assert.throws(() => generateLlmsIndex(config, [], { base: 'https://example.com/', production: 'https://example.com/', development: false }), /missing or unpublished/);
});

test('structural, path and deployment violations fail authoritative validation', () => {
  const urls = { base: 'https://official.example/', production: 'https://official.example/', development: false };
  const content = generateLlmsIndex(config, paths, urls);
  const bad = [
    content.replace('> LongitudeOne', 'LongitudeOne'),
    content.replace('## Start Here', '### Start Here'),
    content.replace('## Full Documentation', '## Empty\n\n## Full Documentation'),
    content.replace('## Full Documentation', '## Start Here'),
    content.replace(': Choose a documentation topic.', ''),
    content.replace('https://official.example/index.md', 'https://official.example/INDEX.md'),
    content.replace('https://official.example/index.md', 'https://official.example/hidden.md'),
    content.replace('https://official.example/index.md', 'https://official.example/../index.md'),
    content.replace('https://official.example/index.md', 'https://official.example/%2e%2e/index.md'),
    content.replace('https://official.example/index.md', 'https://official.example/.%2e/index.md'),
    content.replace('https://official.example/index.md', 'https://official.example/%2e./index.md'),
    content.replace('https://official.example/index.md', 'https://official.example/wrong/index.md'),
    content.replace('- [Home]', '- invalid [Home]'),
    content.replace('## Full Documentation', '- [Duplicate](https://official.example/index.md): Duplicate.\n\n## Full Documentation'),
  ];
  for (const mutated of bad) assert.throws(() => validateLlmsIndex(mutated, available, urls));
});
