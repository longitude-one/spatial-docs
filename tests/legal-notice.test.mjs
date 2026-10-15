import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { baseUrl } from '../scripts/site-settings.mjs';
import { legalConfiguration, legalFields, testLegalEnvironment } from '../scripts/legal-configuration.mjs';
import { generateLegalNotice } from '../scripts/generate-legal-notice.mjs';
import { recordLegalPublication, verifyLegalNotice, verifyLegalPublication } from '../scripts/verify-legal-notice.mjs';

function approved() {
  const env = testLegalEnvironment({});
  for (const field of legalFields) env[field] = `Reviewed ${field}`;
  env.LEGAL_PUBLICATION_DIRECTOR = env.LEGAL_PUBLISHER_NAME;
  return { ...env, LEGAL_TEST_MODE: 'false', LEGAL_PUBLICATION_APPROVED: 'true' };
}

test('legal configuration requires every fact, explicit environment and publisher approval without logging values', () => {
  for (const field of legalFields) {
    const env = approved(); delete env[field];
    assert.throws(() => legalConfiguration(env), new RegExp(field));
  }
  assert.throws(() => legalConfiguration({ ...approved(), LEGAL_CONFIGURATION_ENVIRONMENT: 'development' }), /explicitly match production/);
  assert.throws(() => legalConfiguration({ ...approved(), LEGAL_PUBLICATION_APPROVED: 'false' }), /review/);
  assert.throws(() => legalConfiguration({ ...approved(), LEGAL_PUBLICATION_DIRECTOR: 'Someone else' }), /93-2/);
  for (const value of ['{{NAME}}', 'TODO', '<script>private value</script>', 'TEST ONLY name']) {
    assert.throws(() => legalConfiguration({ ...approved(), LEGAL_PUBLISHER_ADDRESS: value }), (error) => !error.message.includes(value));
  }
  assert.equal(legalConfiguration(approved()).approved, true);
  assert.equal(legalConfiguration(testLegalEnvironment({})).approved, false);
});

test('legal source, licenses, final footer and deployment checks share one deterministic configuration', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'legal-notice-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'templates'));
  await cp(new URL('../templates/legal-notice.md', import.meta.url), path.join(root, 'templates/legal-notice.md'));
  await writeFile(path.join(root, 'LICENSE'), 'MIT copyright preserved\n');
  await writeFile(path.join(root, 'package-lock.json'), JSON.stringify({ packages: { '': {}, 'node_modules/example': { version: '1.0.0', license: 'MIT' } } }));
  await mkdir(path.join(root, 'node_modules/example'), { recursive: true });
  await writeFile(path.join(root, 'node_modules/example/LICENSE'), 'Dependency full license\n');
  await generateLegalNotice(root, testLegalEnvironment({}));
  const source = await readFile(path.join(root, 'docs/legal-notice.md'), 'utf8');
  assert.match(source, /TEST ONLY/);
  assert.doesNotMatch(source, /\{\{[A-Z_]+\}\}/);
  assert.match(await readFile(path.join(root, 'static/assets/legal/third-party-notices.txt'), 'utf8'), /Dependency full license/);
  assert.equal(await readFile(path.join(root, 'static/assets/legal/documentation-license.txt'), 'utf8'), 'MIT copyright preserved\n');
  await generateLegalNotice(root, testLegalEnvironment({}));
  assert.equal(await readFile(path.join(root, 'docs/legal-notice.md'), 'utf8'), source);
  const corpus = path.join(root, 'public'); const metadata = path.join(root, '.publication-metadata');
  await mkdir(corpus); await mkdir(metadata);
  const html = `<footer><a href="${baseUrl}legal-notice.html">Mentions légales</a></footer>`;
  for (const file of ['legal-notice.html', '404.html', 'search.html']) await writeFile(path.join(corpus, file), html);
  await writeFile(path.join(corpus, 'legal-notice.md'), source);
  await recordLegalPublication(root, corpus, metadata);
  await verifyLegalNotice(root, corpus, metadata);
  await assert.rejects(verifyLegalPublication('production', corpus, metadata), /test fixtures cannot be deployed/);
  await writeFile(path.join(corpus, '404.html'), '<p>No footer</p>');
  await assert.rejects(verifyLegalNotice(root, corpus, metadata), /404.html/);
  await writeFile(path.join(corpus, '404.html'), html);
  await generateLegalNotice(root, approved());
  await writeFile(path.join(corpus, 'legal-notice.md'), await readFile(path.join(root, 'docs/legal-notice.md')));
  await recordLegalPublication(root, corpus, metadata);
  await verifyLegalPublication('production', corpus, metadata);
  await assert.rejects(verifyLegalPublication('development', corpus, metadata), /this environment/);
  await writeFile(path.join(corpus, 'legal-notice.md'), 'tampered');
  await assert.rejects(verifyLegalPublication('production', corpus, metadata), /integrity failure/);
});
