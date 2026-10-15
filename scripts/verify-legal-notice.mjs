import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { baseUrl } from './site-settings.mjs';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function walk(node, visit) { visit(node); for (const child of node.childNodes || []) walk(child, visit); }

export async function recordLegalPublication(root, corpus, metadata) {
  const source = JSON.parse(await readFile(path.join(root, '.docusaurus/legal-source.json'), 'utf8'));
  if (hash(await readFile(path.join(root, 'docs/legal-notice.md'))) !== source.sourceHash) throw new Error('Legal source differs from its validated configuration.');
  const hashes = {};
  for (const file of ['legal-notice.html', 'legal-notice.md']) hashes[file] = hash(await readFile(path.join(corpus, file)));
  await writeFile(path.join(metadata, 'legal-publication.json'), `${JSON.stringify({ ...source, hashes }, null, 2)}\n`);
}

export async function verifyLegalNotice(root, corpus, metadata) {
  const record = JSON.parse(await readFile(path.join(metadata, 'legal-publication.json'), 'utf8'));
  if (record.version !== 1 || !['production', 'development'].includes(record.environment)
    || typeof record.testFixture !== 'boolean' || typeof record.approved !== 'boolean'
    || (!record.testFixture && !record.approved)) throw new Error('Legal publication review approval is missing.');
  for (const file of ['legal-notice.html', 'legal-notice.md']) {
    const bytes = await readFile(path.join(corpus, file));
    if (hash(bytes) !== record.hashes?.[file]) throw new Error(`Legal publication bytes differ: ${file}`);
    if (/\{\{[A-Z_]+\}\}|\$\{LEGAL_/.test(bytes.toString('utf8'))) throw new Error(`Unresolved legal configuration: ${file}`);
  }
  const markdown = await readFile(path.join(corpus, 'legal-notice.md'), 'utf8');
  for (const heading of ['Éditeur et directeur de la publication', 'Hébergement', 'Vie privée et journaux techniques', 'Cookies et préférences locales', 'Propriété intellectuelle']) {
    if (!markdown.includes(`## ${heading}`)) throw new Error(`Missing legal notice section: ${heading}`);
  }
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await inspect(target);
      else if (entry.name.endsWith('.html')) {
        let footer = false;
        walk(parse(await readFile(target, 'utf8')), (node) => {
          if (node.tagName !== 'footer') return;
          walk(node, (child) => {
            const attrs = Object.fromEntries((child.attrs || []).map(({ name, value }) => [name, value]));
            if (child.tagName === 'a' && attrs.href === `${baseUrl}legal-notice.html`) footer = true;
          });
        });
        if (!footer) throw new Error(`Missing persistent legal footer link: ${path.relative(corpus, target)}`);
      }
    }
  }
  await inspect(corpus);
}

export async function verifyLegalPublication(environment, corpus, metadata = path.join(path.dirname(corpus), '.publication-metadata')) {
  const record = JSON.parse(await readFile(path.join(metadata, 'legal-publication.json'), 'utf8'));
  if (record.version !== 1 || record.testFixture !== false || record.approved !== true || record.environment !== environment) throw new Error('Publication requires approved legal information for this environment; test fixtures cannot be deployed.');
  for (const file of ['legal-notice.html', 'legal-notice.md']) {
    if (hash(await readFile(path.join(corpus, file))) !== record.hashes?.[file]) throw new Error(`Legal publication integrity failure: ${file}`);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [environment, directory = 'public'] = process.argv.slice(2);
  await verifyLegalPublication(environment, path.resolve(directory));
  console.log('Approved legal publication metadata and notice integrity verified (not legal certification).');
}
