import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const versionDirectory = /^v([1-9][0-9]*)$/;
const semverVersion = /^v?([1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const composerPrerelease = /^v?[1-9][0-9]*\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:alpha|beta|rc|dev)(?:[.-]?[0-9]+)?$/i;

export async function discoverLibraries(docsDirectory) {
  const libraries = {};
  for (const entry of await readdir(docsDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const children = await readdir(path.join(docsDirectory, entry.name), { withFileTypes: true });
    const majors = children.filter((child) => child.isDirectory() && versionDirectory.test(child.name))
      .map((child) => Number(versionDirectory.exec(child.name)[1])).sort((a, b) => a - b);
    if (majors.length) {
      let roadmap = false;
      try {
        roadmap = (await stat(path.join(docsDirectory, entry.name, 'roadmap.md'))).isFile();
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      libraries[entry.name] = { majors, roadmap };
    }
  }
  return libraries;
}

export function currentStableMajor(versions) {
  if (!Array.isArray(versions)) throw new Error('Packagist version list is unusable.');
  let current = null;
  for (const release of versions) {
    if (!release || typeof release.version !== 'string') throw new Error('Packagist release version is unusable.');
    const version = release.version;
    if (/(?:^dev-|-dev$)/i.test(version) || composerPrerelease.test(version)) continue;
    const match = semverVersion.exec(version);
    if (!match || match[4]?.split('.').some((identifier) => /^0[0-9]+$/.test(identifier))) {
      throw new Error(`Packagist release version cannot be interpreted: ${version}`);
    }
    if (match[4]) continue;
    const parts = match.slice(1, 4).map(Number);
    if (parts.some((part) => !Number.isSafeInteger(part))) throw new Error(`Packagist release version is unsafe: ${version}`);
    if (!current || parts.some((part, index) => part !== current[index] && parts.slice(0, index).every((value, i) => value === current[i]) && part > current[index])) {
      current = parts;
    }
  }
  return current?.[0] ?? null;
}

export async function fetchStableMajor(name, fetcher = fetch) {
  const packageName = `longitude-one/${name}`;
  let response;
  try {
    response = await fetcher(`https://repo.packagist.org/p2/${packageName}.json`, { signal: AbortSignal.timeout(10000) });
  } catch (error) {
    throw new Error(`Packagist request failed for ${packageName}: ${error.message}`, { cause: error });
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Packagist returned HTTP ${response.status} for ${packageName}.`);
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`Packagist returned invalid JSON for ${packageName}.`, { cause: error });
  }
  const versions = data?.packages?.[packageName];
  if (!Array.isArray(versions)) throw new Error(`Packagist returned unusable package data for ${packageName}.`);
  return currentStableMajor(versions);
}

export async function resolveLibraries(docsDirectory, fetcher = fetch) {
  const discovered = await discoverLibraries(docsDirectory);
  const result = {};
  for (const [name, { majors, roadmap }] of Object.entries(discovered)) {
    const currentMajor = await fetchStableMajor(name, fetcher);
    if (currentMajor !== null && !majors.includes(currentMajor)) {
      throw new Error(`${name}: current stable major v${currentMajor} has no documentation directory.`);
    }
    result[name] = {
      roadmap,
      versions: Object.fromEntries(majors.map((major) => [
        `v${major}`,
        currentMajor === null || major > currentMajor ? 'Next' : major === currentMajor ? 'Current' : 'Older',
      ])),
    };
  }
  return result;
}

export function statusFor(sourcePath, libraries) {
  const [library, version] = sourcePath.split('/');
  const status = libraries[library]?.versions?.[version];
  return status ? { library, status, roadmap: libraries[library].roadmap } : null;
}

export function statusText({ library, status }) {
  const detail = {
    Current: 'the current major version',
    Older: 'an older major version',
    Next: 'a major version that is not yet the current stable release',
  }[status];
  return `This documentation describes ${detail} of \`${library}\`.`;
}

export function markdownStatus(info, sourcePath) {
  const depth = sourcePath.split('/').length - 2;
  const roadmap = info.roadmap ? `\n> [View the library roadmap](${'../'.repeat(depth)}roadmap.md)` : '';
  return `> **${info.status} version** — ${statusText(info)}${roadmap}`;
}

export async function gitSiteVersion(rootDirectory, environment = process.env) {
  if (environment.DOCUSAURUS_DEPLOYMENT === 'development') return 'Development documentation';
  try {
    const { stdout } = await execute('git', ['tag', '--points-at', 'HEAD'], { cwd: rootDirectory });
    const tags = stdout.trim().split('\n').filter((tag) => /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.test(tag));
    if (tags.length === 1) return `Documentation version ${tags[0]}`;
    if (tags.length > 1) throw new Error('Multiple SemVer tags identify the current commit.');
  } catch (error) {
    if (error.message === 'Multiple SemVer tags identify the current commit.') throw error;
  }
  return 'Development documentation';
}

export async function writeManifest(rootDirectory, libraries) {
  const directory = path.join(rootDirectory, '.docusaurus');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'library-versions.json'), JSON.stringify(libraries));
}

export async function readManifest(rootDirectory) {
  return JSON.parse(await readFile(path.join(rootDirectory, '.docusaurus/library-versions.json'), 'utf8'));
}
