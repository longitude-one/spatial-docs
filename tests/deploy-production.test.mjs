import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const execute = promisify(execFile);
const script = resolve('scripts/deploy-production.sh');

async function fixture(t, mode = '') {
  const root = await mkdtemp(join(tmpdir(), 'production-deploy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const destination = join(root, "hosting's directory");
  const build = join(root, 'build');
  const bin = join(root, 'bin');
  await Promise.all([mkdir(destination), mkdir(build, { recursive: true }), mkdir(bin)]);
  for (const [name, content] of Object.entries({
    'index.html': 'new HTML', 'llms.txt': 'new index', 'markdown-mapping.json': '{}',
    'index.md': 'new Markdown', '.hidden': 'complete tree',
  })) await writeFile(join(build, name), content);
  for (const suffix of ['', '.old', '.next']) {
    await mkdir(join(destination, `public_html${suffix}`));
    await writeFile(join(destination, `public_html${suffix}`, 'version'), suffix || 'current');
  }
  // Execute remote commands locally: no SSH server, credentials or network needed.
  await writeFile(join(bin, 'ssh'), `#!/usr/bin/env bash
set -eu
printf 'call\\n' >> "$TEST_ROOT/calls"
printf '%s\\n' "$@" > "$TEST_ROOT/ssh-arguments"
command="\${!#}"
if [[ $TEST_MODE == transfer-failure ]]; then
  bash -c "$command"
  exit 23
fi
bash -c "$command"
`, { mode: 0o755 });
  const { stdout: realTar } = await execute('which', ['tar']);
  await writeFile(join(bin, 'tar'), `#!/usr/bin/env bash
if [[ $TEST_MODE == extraction-failure && $1 == -xf ]]; then exit 26; fi
"${realTar.trim()}" "$@"
result=$?
if [[ $TEST_MODE == archive-failure && $1 == -C ]]; then exit 24; fi
exit "$result"
`, { mode: 0o755 });
  const { stdout: realMv } = await execute('which', ['mv']);
  await writeFile(join(bin, 'mv'), `#!/usr/bin/env bash
if [[ $TEST_MODE == promotion-failure && $2 == public_html.next ]]; then exit 25; fi
exec "${realMv.trim()}" "$@"
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, DEPLOY_PATH: destination,
    SSH_HOST: 'test.invalid', SSH_PORT: '22', SSH_USER: 'test', SSH_PRIVATE_KEY: 'test-only',
    TEST_ROOT: root, TEST_MODE: mode };
  return { root, destination, build, run: (extra = {}) => execute('bash', [script, build], { env: { ...env, ...extra } }) };
}

test('publishes the complete site and retains the previous live version', async t => {
  const f = await fixture(t);
  await f.run();
  for (const file of ['index.html', 'llms.txt', 'markdown-mapping.json', 'index.md', '.hidden']) {
    assert.equal(await readFile(join(f.destination, 'public_html', file), 'utf8'), await readFile(join(f.build, file), 'utf8'));
  }
  assert.equal(await readFile(join(f.destination, 'public_html.old/version'), 'utf8'), 'current');
  await assert.rejects(access(join(f.destination, 'public_html.next')));
  await assert.rejects(access(join(f.destination, 'public_html/version')));
});

test('supports the first deployment without a live directory', async t => {
  const f = await fixture(t);
  await rm(join(f.destination, 'public_html'), { recursive: true });
  await f.run();
  assert.equal(await readFile(join(f.destination, 'public_html/index.html'), 'utf8'), 'new HTML');
  await assert.rejects(access(join(f.destination, 'public_html.old')));
});

for (const mode of ['transfer-failure', 'archive-failure', 'extraction-failure']) {
  test(`${mode} leaves both live and backup versions unchanged`, async t => {
    const f = await fixture(t, mode);
    await assert.rejects(f.run());
    assert.equal(await readFile(join(f.destination, 'public_html/version'), 'utf8'), 'current');
    assert.equal(await readFile(join(f.destination, 'public_html.old/version'), 'utf8'), '.old');
    assert.equal(await readFile(join(f.root, 'calls'), 'utf8'), 'call\n');
  });
}

for (const pinned of [false, true]) {
  test(`SSH ${pinned ? 'pinned host' : 'first-use trust'} uses temporary credentials and batch mode`, async t => {
    const f = await fixture(t);
    await f.run({ SSH_KNOWN_HOSTS: pinned ? 'test.invalid ssh-ed25519 test-key' : '' });
    const args = (await readFile(join(f.root, 'ssh-arguments'), 'utf8')).split('\n');
    assert.ok(args.includes(`StrictHostKeyChecking=${pinned ? 'yes' : 'accept-new'}`));
    assert.ok(args.includes('BatchMode=yes'));
    assert.ok(args.includes('IdentitiesOnly=yes'));
    await assert.rejects(access(args[args.indexOf('-i') + 1]));
  });
}

test('failed final rename restores the live version and reports failure', async t => {
  const f = await fixture(t, 'promotion-failure');
  await assert.rejects(f.run());
  assert.equal(await readFile(join(f.destination, 'public_html/version'), 'utf8'), 'current');
});

test('incomplete build fails before any SSH connection', async t => {
  const f = await fixture(t);
  await rm(join(f.build, 'llms.txt'));
  await assert.rejects(f.run());
  await assert.rejects(access(join(f.root, 'calls')));
});

test('missing sibling Markdown fails before any SSH connection', async t => {
  const f = await fixture(t);
  await rm(join(f.build, 'index.md'));
  await assert.rejects(f.run());
  await assert.rejects(access(join(f.root, 'calls')));
});

test('legacy public Markdown prefix is rejected before deployment', async t => {
  const f = await fixture(t);
  await mkdir(join(f.build, 'markdown'));
  await assert.rejects(f.run(), /without a markdown directory/);
  await assert.rejects(access(join(f.root, 'calls')));
});

for (const settings of [{ SSH_PRIVATE_KEY: '' }, { DEPLOY_PATH: '/' }, { DEPLOY_PATH: 'relative' }, { SSH_PORT: 'invalid' }]) {
  test(`invalid configuration ${JSON.stringify(settings)} fails before SSH`, async t => {
    const f = await fixture(t);
    await assert.rejects(f.run(settings));
    await assert.rejects(access(join(f.root, 'calls')));
  });
}
