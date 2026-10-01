import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const repository = realpathSync(fileURLToPath(new URL('../', import.meta.url)));

export function serverPids(processes) {
  return processes.split('\n').flatMap((line) => {
    const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.+)$/);
    if (!match || path.basename(match[2]) !== 'node') return [];
    // Match the Docusaurus CLI and its server subcommands, never builds or npm.
    return /(?:^|\s)\S*\bdocusaurus(?:\.mjs|\.js)?\s+(?:start|serve)(?:\s|$)/.test(match[3])
      ? [Number(match[1])] : [];
  });
}

export function belongsToRepository(output, root) {
  return output.split('\n').includes(`n${root}`);
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}

async function stop() {
  if (!['darwin', 'linux'].includes(process.platform)) {
    throw new Error('npm stop supports macOS and Linux (ps and lsof required). Use Ctrl+C in the server terminal on other systems.');
  }
  const processes = execFileSync('ps', ['-axo', 'pid=,comm=,args='], { encoding: 'utf8' });
  const targets = [];
  for (const pid of serverPids(processes)) {
    let cwd;
    try {
      cwd = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      if (!alive(pid)) continue;
      throw error;
    }
    if (belongsToRepository(cwd, repository)) targets.push(pid);
  }
  if (!targets.length) {
    console.log('No Docusaurus server is running for this repository.');
    return;
  }
  for (const pid of targets) {
    try { process.kill(pid, 'SIGTERM'); } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    if (targets.every((pid) => !alive(pid))) {
      console.log(`Stopped Docusaurus server(s): ${targets.join(', ')}.`);
      return;
    }
    await delay(100);
  }
  const remaining = targets.filter(alive);
  throw new Error(`Server process(es) did not stop: ${remaining.join(', ')}. Inspect them before using kill -KILL <PID>.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  stop().catch((error) => {
    console.error(`Unable to stop Docusaurus: ${error.message}`);
    process.exitCode = 1;
  });
}
