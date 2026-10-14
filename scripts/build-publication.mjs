import { mkdtemp, rename, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export async function buildPublication(root, run = runBuildStep) {
  const stage = await mkdtemp(path.join(root, '.publication-staging-'));
  const destination = path.join(root, 'build');
  const backup = `${stage}.previous`;
  let previous = false;
  try {
    await run(root, stage);
    try { await lstat(destination); previous = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous) await rename(destination, backup);
    try { await rename(stage, destination); }
    catch (error) {
      if (previous) await rename(backup, destination);
      throw error;
    }
    if (previous) await rm(backup, { recursive: true, force: true });
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function execute(root, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Publication step failed (${signal ?? code}).`)));
  });
}
async function runBuildStep(root, stage) {
  await execute(root, [path.join(root, 'node_modules/@docusaurus/core/bin/docusaurus.mjs'), 'build', '--out-dir', stage]);
  await execute(root, [path.join(root, 'scripts/export-markdown.mjs'), '--verify', '--build-directory', stage]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildPublication(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
}
