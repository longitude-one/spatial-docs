import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { baseUrl } from './site-settings.mjs';
export const legalResources = ['legal-notice.fr.html', 'legal-notice.fr.md', 'legal-notice.en.html', 'legal-notice.en.md'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function walk(node, visit) { visit(node); for (const child of node.childNodes || []) walk(child, visit); }

export async function recordLegalPublication(root, corpus, metadata) {
  const source = JSON.parse(await readFile(path.join(root, '.docusaurus/legal-source.json'), 'utf8'));
  if (source.version !== 2) throw new Error('Both localized legal sources must be generated before publication.');
  for (const file of legalResources.filter((file) => file.endsWith('.md'))) {
    if (hash(await readFile(path.join(root, 'docs', file))) !== source.sourceHashes?.[file]) throw new Error(`Legal source differs from its validated configuration: ${file}`);
  }
  const hashes = {};
  for (const file of legalResources) hashes[file] = hash(await readFile(path.join(corpus, file)));
  await writeFile(path.join(metadata, 'legal-publication.json'), `${JSON.stringify({ ...source, hashes }, null, 2)}\n`);
}

export async function verifyLegalNotice(root, corpus, metadata) {
  const record = JSON.parse(await readFile(path.join(metadata, 'legal-publication.json'), 'utf8'));
  if (record.version !== 2 || !['production', 'development'].includes(record.environment)
    || typeof record.testFixture !== 'boolean' || typeof record.approved !== 'boolean'
    || (!record.testFixture && !record.approved)) throw new Error('Legal publication review approval is missing.');
  for (const file of legalResources) {
    const bytes = await readFile(path.join(corpus, file));
    if (hash(bytes) !== record.hashes?.[file]) throw new Error(`Legal publication bytes differ: ${file}`);
    if (/\{\{[A-Z_]+\}\}|\$\{LEGAL_/.test(bytes.toString('utf8'))) throw new Error(`Unresolved legal configuration: ${file}`);
  }
  const sections = {
    fr: ['Éditeur et directeur de la publication', 'Hébergement', 'Vie privée et journaux techniques', 'Cookies et préférences locales', 'Propriété intellectuelle'],
    en: ['Publisher and publication director', 'Hosting', 'Privacy and technical logs', 'Cookies and local preferences', 'Intellectual property'],
  };
  for (const [language, headings] of Object.entries(sections)) {
    const file = `legal-notice.${language}.md`;
    const markdown = await readFile(path.join(corpus, file), 'utf8');
    for (const heading of headings) if (!markdown.includes(`## ${heading}`)) throw new Error(`Missing legal notice section in ${file}: ${heading}`);
    const counterpart = `legal-notice.${language === 'fr' ? 'en' : 'fr'}.md`;
    if (![counterpart, `./${counterpart}`].some((href) => markdown.includes(`](${href})`))) throw new Error(`Missing legal language switch in ${file}`);
    const targetLanguage = language === 'fr' ? 'en' : 'fr';
    const label = language === 'fr' ? '🇬🇧 English' : '🇫🇷 Français';
    let switchFound = false;
    walk(parse(await readFile(path.join(corpus, file.replace(/\.md$/, '.html')), 'utf8')), (node) => {
      const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
      if (node.tagName === 'a' && attrs.href === `${baseUrl}legal-notice.${targetLanguage}.html` && attrs.lang === targetLanguage
        && node.childNodes.some((child) => child.nodeName === '#text' && child.value === label)) switchFound = true;
    });
    if (!switchFound) throw new Error(`Missing accessible HTML legal language switch in ${file}`);
  }
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await inspect(target);
      else if (entry.name.endsWith('.html')) {
        const footer = new Set();
        walk(parse(await readFile(target, 'utf8')), (node) => {
          if (node.tagName !== 'footer') return;
          walk(node, (child) => {
            const attrs = Object.fromEntries((child.attrs || []).map(({ name, value }) => [name, value]));
            if (child.tagName === 'a' && ['fr', 'en'].some((language) => attrs.href === `${baseUrl}legal-notice.${language}.html`)) footer.add(attrs.href);
          });
        });
        if (footer.size !== 2) throw new Error(`Missing persistent legal footer link: ${path.relative(corpus, target)}`);
      }
    }
  }
  await inspect(corpus);
}

export async function verifyLegalPublication(environment, corpus, metadata = path.join(path.dirname(corpus), '.publication-metadata')) {
  const record = JSON.parse(await readFile(path.join(metadata, 'legal-publication.json'), 'utf8'));
  if (record.version !== 2 || record.testFixture !== false || record.approved !== true || record.environment !== environment) throw new Error('Publication requires approved legal information for this environment; test fixtures cannot be deployed.');
  for (const file of legalResources) {
    if (hash(await readFile(path.join(corpus, file))) !== record.hashes?.[file]) throw new Error(`Legal publication integrity failure: ${file}`);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [environment, directory = 'public'] = process.argv.slice(2);
  await verifyLegalPublication(environment, path.resolve(directory));
  console.log('Approved legal publication metadata and notice integrity verified (not legal certification).');
}
