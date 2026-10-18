import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { publicationUrls } from './llms-config.mjs';

const title = 'LongitudeOne Spatial Documentation';
const summary = 'LongitudeOne is a standards-oriented ecosystem of spatial libraries for PHP and Doctrine.';
const standards = 'The design draws on ISO/IEC 13249-3, ISO 19107, ISO 19111, ISO 19136, OGC Simple Features and RFC 7946.';
const escape = (value) => value.replace(/[\\[\]]/g, '\\$&');

export function generateLlmsIndex(config, paths, urls = publicationUrls()) {
  const available = new Set(paths);
  const lines = [`# ${title}`, '', `> ${summary}`, '', standards, ''];
  if (urls.development) lines.push(`Development/preproduction documentation — not official. Official documentation: ${urls.production}`, '');
  for (const section of config.sections) {
    lines.push(`## ${section.title}`, '');
    for (const entry of section.entries) {
      if (!available.has(entry.path)) throw new Error(`Curated llms.txt target is missing or unpublished: ${entry.path}`);
      if (!entry.description?.trim() || !entry.label?.trim()) throw new Error('Curated llms.txt entries require labels and descriptions.');
      lines.push(`- [${escape(entry.label)}](${urls.base}${entry.path}): ${entry.description}`);
    }
    lines.push('');
  }
  lines.push('## Full Documentation', '', `- [Complete documentation context](${urls.base}llms-full.txt): Complete public LongitudeOne Spatial documentation context.`, '');
  const content = lines.join('\n');
  validateLlmsIndex(content, new Set([...paths, 'llms.txt', 'llms-full.txt']), urls);
  return content;
}

export function validateLlmsIndex(content, available, urls = publicationUrls()) {
  const fail = (message) => { throw new Error(`Invalid llms.txt: ${message}`); };
  if (content.includes('\r') || content.startsWith('\uFEFF')) fail('expected UTF-8 without BOM and LF line endings.');
  const nodes = unified().use(remarkParse).parse(content).children;
  if (nodes[0]?.type !== 'heading' || nodes[0].depth !== 1 || nodes[0].children.length !== 1 || nodes[0].children[0].value !== title) fail('expected project H1.');
  if (nodes[1]?.type !== 'blockquote' || !content.includes(summary)) fail('expected concise PHP/Doctrine project summary after H1.');
  if (!content.includes(standards)) fail('missing principal standards context.');
  const seen = new Set();
  let sections = 0;
  let inSections = false;
  let sectionHasEntries = true;
  const headings = new Set();
  for (const node of nodes.slice(2)) {
    if (node.type === 'heading') {
      if (node.depth !== 2) fail('only one H1 followed by H2 sections is permitted.');
      if (!sectionHasEntries) fail('empty file-list section.');
      const heading = node.children.map((child) => child.value ?? '').join('');
      if (!heading.trim() || headings.has(heading)) fail('empty or duplicate section heading.');
      headings.add(heading);
      sectionHasEntries = false;
      sections += 1;
      inSections = true;
      continue;
    }
    if (!inSections) {
      if (node.type !== 'paragraph') fail('invalid introduction.');
      continue;
    }
    if (node.type !== 'list' || node.ordered) fail('H2 sections must contain file lists.');
    sectionHasEntries = true;
    for (const item of node.children) {
      const children = item.children[0]?.children;
      const link = children?.[0];
      if (item.children.length !== 1 || link?.type !== 'link' || children.length !== 2 || children[1].type !== 'text' || !/^: \S/.test(children[1].value)) fail('entries require a Markdown link and concise description.');
      if (/(?:\/|%2f)(?:\.|%2e){1,2}(?:\/|%2f|$)/i.test(link.url) || link.url.includes('\\')) fail(`invalid path escaping: ${link.url}`);
      let url;
      try { url = new URL(link.url); } catch { fail(`URL must be absolute: ${link.url}`); }
      if (!['https:', 'http:'].includes(url.protocol)) fail(`invalid URL: ${link.url}`);
      if (!url.href.startsWith(urls.base)) {
        // External resources may be curated, but another deployment of our documentation must not be mistaken for one.
        if (url.origin === new URL(urls.base).origin || url.href.startsWith(urls.production)) fail(`wrong deployment base: ${link.url}`);
        continue;
      }
      const resource = url.href.slice(urls.base.length);
      if (url.search || url.hash || resource.includes('%') || resource.split('/').some((part) => part === '..' || part === '.' || !part)) fail(`invalid public path: ${link.url}`);
      if (resource !== 'llms-full.txt' && !/^[a-z0-9/_-]+\.md$/.test(resource)) fail(`documentation must target .md: ${link.url}`);
      if (!available.has(resource)) fail(`missing or unpublished resource: ${resource}`);
      if (seen.has(resource)) fail(`duplicate resource: ${resource}`);
      seen.add(resource);
    }
  }
  if (!sections || !sectionHasEntries || ![...seen].some((resource) => resource.endsWith('.md')) || !seen.has('llms-full.txt')) fail('missing sections or full documentation link.');
  if (!available.has('llms.txt') || !available.has('llms-full.txt')) fail('llms.txt and llms-full.txt must be published together.');
  const warning = 'Development/preproduction documentation — not official.';
  if (urls.development ? !content.includes(warning) || !content.includes(urls.production) : content.includes(warning)) fail('incorrect deployment notice.');
  return true;
}

export async function verifyLlmsIndex(directory, available, urls = publicationUrls()) {
  return validateLlmsIndex(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path.join(directory, 'llms.txt'))), available, urls);
}
