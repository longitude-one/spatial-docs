import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';

const workflow = async (name) => load(await readFile(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'));

test('development keeps its merged-main trigger and publishes the validated public tree with the configured official URL', async () => {
  const value = await workflow('development-pages');
  assert.deepEqual(value.on, { pull_request_target: { branches: ['main'], types: ['closed'] } });
  assert.equal(value.jobs.build.if, 'github.event.pull_request.merged == true');
  assert.equal(value.jobs.build.env.DOCUSAURUS_DEPLOYMENT, 'development');
  assert.equal(value.jobs.build.env.URL_PRODUCTION, 'https://www.longitude-one.fr');
  assert.equal(value.jobs.build.steps.find((step) => step.uses?.startsWith('actions/upload-pages-artifact')).with.path, 'public');
  assert.equal(value.jobs.deploy.needs, 'build');
  assert.ok(value.jobs.deploy.steps.every((step) => !step.run));
});

test('production keeps the existing tag trigger and transfers the exact public tree through the existing atomic script', async () => {
  const value = await workflow('deploy-production');
  assert.deepEqual(value.on, { push: { tags: ['[0-9]+.[0-9]+.[0-9]+'] } });
  const steps = value.jobs.publish.steps;
  const build = steps.findIndex((step) => step.run === 'npm run build');
  const transfer = steps.findIndex((step) => step.run === 'bash scripts/deploy-production.sh public');
  assert.ok(build >= 0 && transfer === build + 1);
  assert.equal(steps[build].env.DOCUSAURUS_DEPLOYMENT, 'production');
});
