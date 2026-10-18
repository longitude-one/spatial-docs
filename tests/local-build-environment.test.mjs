import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { publicationUrls } from '../scripts/llms-config.mjs';

const execute = promisify(execFile);
async function localEnvironment(overrides = {}) {
  const environment = { ...process.env };
  delete environment.URL_PRODUCTION;
  delete environment.URL_PREPRODUCTION;
  const { stdout } = await execute(process.execPath, ['scripts/with-test-legal.mjs', process.execPath, '-e',
    'process.stdout.write(JSON.stringify({ URL_PRODUCTION: process.env.URL_PRODUCTION, URL_PREPRODUCTION: process.env.URL_PREPRODUCTION, LEGAL_TEST_MODE: process.env.LEGAL_TEST_MODE }))',
  ], { env: { ...environment, ...overrides } });
  return JSON.parse(stdout);
}

test('local fixture command configures deployment URLs when no environment was provided', async () => {
  const environment = await localEnvironment();
  assert.equal(environment.URL_PRODUCTION, 'https://www.longitude-one.fr');
  assert.equal(environment.URL_PREPRODUCTION, 'https://longitude-one.github.io');
  assert.equal(environment.LEGAL_TEST_MODE, 'true');
  assert.equal(publicationUrls(environment).base, 'https://www.longitude-one.fr/');
  assert.equal(publicationUrls({ ...environment, DOCUSAURUS_DEPLOYMENT: 'development' }).base, 'https://longitude-one.github.io/spatial-docs/');
});

test('local fixture command preserves explicit deployment settings, including invalid values', async () => {
  const environment = await localEnvironment({ URL_PRODUCTION: 'https://custom.example/docs/', URL_PREPRODUCTION: 'https://preview.example/' });
  assert.equal(environment.URL_PRODUCTION, 'https://custom.example/docs/');
  assert.equal(environment.URL_PREPRODUCTION, 'https://preview.example/');
  const invalid = await localEnvironment({ URL_PRODUCTION: '' });
  assert.equal(invalid.URL_PRODUCTION, '');
  assert.throws(() => publicationUrls(invalid), /URL_PRODUCTION/);
});

test('publication generation still rejects absent URLs without the local fixture command', () => {
  assert.throws(() => publicationUrls({}), /URL_PRODUCTION/);
  assert.throws(() => publicationUrls({ URL_PRODUCTION: 'https://official.example/', DOCUSAURUS_DEPLOYMENT: 'development' }), /URL_PREPRODUCTION/);
});
