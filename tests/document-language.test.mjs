import test from 'node:test';
import assert from 'node:assert/strict';
import { documentLanguage, localizedAlternates } from '../scripts/document-language.mjs';
import { pageStructuredData } from '../scripts/seo-policy.mjs';

test('French suffixes identify article language independently of the UI locale or directory', () => {
  for (const path of ['legal-notice.fr.md', 'legal-notice.fr.html', 'shared/guide.fr.md']) assert.equal(documentLanguage(path), 'fr');
  for (const path of ['legal-notice.en.md', 'concepts/crs.html', 'shared/french-review.md']) assert.equal(documentLanguage(path), 'en');
  assert.equal(pageStructuredData('shared/guide.fr.html', 'Guide', 'Un guide.', 'https://example.org')['inLanguage'], 'fr');
});

test('language alternatives refer only to published translations on the canonical production base', () => {
  const published = ['legal-notice.fr.md', 'legal-notice.en.md'];
  const expected = [
    { language: 'fr', url: 'https://official.example/docs/legal-notice.fr.html' },
    { language: 'en', url: 'https://official.example/docs/legal-notice.en.html' },
  ];
  for (const resource of ['legal-notice.fr.html', 'legal-notice.en.html']) {
    assert.deepEqual(localizedAlternates(resource, published, 'https://official.example/docs/'), expected);
  }
  assert.deepEqual(localizedAlternates('legal-notice.fr.html', ['legal-notice.fr.md'], 'https://official.example/docs/'), expected.slice(0, 1));
  assert.deepEqual(localizedAlternates('index.html', published, 'https://official.example'), []);
});
