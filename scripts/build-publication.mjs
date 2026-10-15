import { mkdtemp, rename, rm, lstat, mkdir, readFile, copyFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { corpusFiles } from './validate-corpus.mjs';
import { isPublicResource } from './publication-files.mjs';

export async function assemblePublication(root, intermediate, destination) {
  const assets = Object.keys(JSON.parse(await readFile(path.join(root, '.generated-markdown/asset-manifest.json'), 'utf8')));
  await mkdir(destination, { recursive: true, mode: 0o755 });
  await chmod(destination, 0o755);
  for (const file of await corpusFiles(intermediate)) {
    if (!isPublicResource(file, assets)) continue;
    const target = path.join(destination, file);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o755 });
    await copyFile(path.join(intermediate, file), target);
    await chmod(target, 0o644);
    let directory = path.dirname(target);
    while (directory !== destination) { await chmod(directory, 0o755); directory = path.dirname(directory); }
  }
}

export async function buildPublication(root, run = runBuildStep) {
  const workspace = await mkdtemp(path.join(root, '.publication-staging-'));
  const stage = path.join(workspace, 'public');
  const metadata = path.join(workspace, 'metadata');
  await mkdir(stage, { mode: 0o755 });
  await mkdir(metadata, { mode: 0o700 });
  const promotions = [{ from: stage, to: path.join(root, 'public') }, { from: metadata, to: path.join(root, '.publication-metadata') }];
  try {
    await run(root, stage, metadata);
    try {
      for (const [index, promotion] of promotions.entries()) {
        promotion.backup = path.join(workspace, `previous-${index}`);
        try { await lstat(promotion.to); await rename(promotion.to, promotion.backup); promotion.previous = true; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        await rename(promotion.from, promotion.to);
        promotion.promoted = true;
      }
    } catch (error) {
      for (const promotion of [...promotions].reverse()) {
        if (promotion.promoted) await rm(promotion.to, { recursive: true, force: true });
        if (promotion.previous) await rename(promotion.backup, promotion.to);
      }
      throw error;
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function execute(root, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Publication step failed (${signal ?? code}).`)));
  });
}
async function runBuildStep(root, stage, metadata) {
  const intermediate = path.join(root, 'build');
  await execute(root, [path.join(root, 'node_modules/@docusaurus/core/bin/docusaurus.mjs'), 'build', '--out-dir', intermediate]);
  await assemblePublication(root, intermediate, stage);
  await execute(root, [path.join(root, 'scripts/validate-corpus.mjs'), '--assemble', '--build-directory', stage, '--metadata-directory', metadata]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildPublication(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
}
