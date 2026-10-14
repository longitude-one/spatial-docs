import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { corpusFiles } from './validate-corpus.mjs';

export function compareBuilds(first, second) {
  const paths = [...new Set([...Object.keys(first), ...Object.keys(second)])].sort();
  const differences = paths.filter((file) => first[file] !== second[file]);
  if (differences.length) throw new Error(`Non-deterministic publication output: ${differences.join(', ')}`);
}
async function build(root) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: root, env: process.env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Build failed (${code}).`)));
  });
  const hashes = {};
  for (const file of await corpusFiles(path.join(root, 'build'))) {
    hashes[file] = createHash('sha256').update(await readFile(path.join(root, 'build', file))).digest('hex');
  }
  return hashes;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  compareBuilds(await build(root), await build(root));
  console.log('Two complete publication builds are byte-identical.');
}
