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

test('publication builds use reviewed legal variables and never the fictional CI wrapper', async () => {
  for (const [name, job, environment] of [['development-pages', 'build', 'github-pages'], ['deploy-production', 'publish', 'production']]) {
    const value = await workflow(name);
    assert.equal(value.jobs[job].environment, environment);
    const build = value.jobs[job].steps.find((step) => step.run === 'npm run build');
    for (const field of ['LEGAL_PUBLISHER_NAME', 'LEGAL_PUBLISHER_ADDRESS', 'LEGAL_PUBLISHER_PHONE', 'LEGAL_PUBLICATION_DIRECTOR',
      'LEGAL_HOST_NAME', 'LEGAL_HOST_ADDRESS', 'LEGAL_HOST_PHONE', 'LEGAL_ADDITIONAL_STORAGE', 'LEGAL_CONFIGURATION_ENVIRONMENT', 'LEGAL_PUBLICATION_APPROVED']) {
      assert.equal(build.env[field], '${{ vars.' + field + ' }}');
    }
    assert.equal(build.env.LEGAL_TEST_MODE, false);
    assert.ok(value.jobs[job].steps.every((step) => !step.run?.includes('with-test-legal')));
  }
  const checks = await workflow('documentation-check');
  assert.ok(checks.jobs['documentation-check'].steps.some((step) => step.run === 'node scripts/with-test-legal.mjs npm run build'));
});

test('legal variable migration preserves every non-legal deployment source', async () => {
  const value = await workflow('deploy-production');
  const transfer = value.jobs.publish.steps.find((step) => step.run === 'bash scripts/deploy-production.sh public');
  assert.deepEqual(transfer.env, {
    DEPLOY_PATH: '${{ secrets.DEPLOY_PATH }}',
    SSH_HOST: '${{ secrets.SSH_HOST }}',
    SSH_PORT: '${{ secrets.SSH_PORT }}',
    SSH_USER: '${{ secrets.SSH_USER }}',
    SSH_PRIVATE_KEY: '${{ secrets.SSH_PRIVATE_KEY }}',
    SSH_KNOWN_HOSTS: '${{ secrets.SSH_KNOWN_HOSTS }}',
  });
});
