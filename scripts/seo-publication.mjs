import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import sax from 'sax';
import { load } from 'js-yaml';
import { publicationUrls } from './llms-config.mjs';
import { pageStructuredData } from './seo-policy.mjs';
import { documentLanguage, localizedAlternates } from './document-language.mjs';

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
}
const text = (node) => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export async function documentationPaths(root) {
  return (await readdir(path.join(root, '.generated-markdown'), { recursive: true })).filter((file) => file.endsWith('.md')).sort();
}
export async function generateSeoResources(root, directory, urls = publicationUrls()) {
  const documents = await documentationPaths(root);
  const locations = urls.development ? [] : documents.map((file) => new URL(file.replace(/\.md$/, '.html'), urls.production).href);
  await writeFile(path.join(directory, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + locations.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>\n`).join('') + '</urlset>\n');
  // Keep both conventional and AI crawlers able to retrieve all public representations.
  await writeFile(path.join(directory, 'robots.txt'), 'User-agent: *\nAllow: /\n'
    + 'Content-Signal: search=yes, ai-input=yes, ai-train=no\n'
    + (urls.development ? '# Preproduction HTML carries noindex; crawling remains allowed.\n' : `Sitemap: ${new URL('sitemap.xml', urls.production).href}\n`));
}

export async function verifySeo(root, directory, urls = publicationUrls()) {
  const errors = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };
  const documents = await documentationPaths(root);
  const titles = new Map();
  const descriptions = new Map();
  for (const md of documents) {
    const file = md.replace(/\.md$/, '.html');
    const canonical = new URL(file, urls.production).href;
    const content = await readFile(path.join(directory, file), 'utf8');
    const tree = parse(content);
    const nodes = [];
    walk(tree, (node) => { nodes.push({ node, attrs: Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value])) }); });
    const elements = (tag) => nodes.filter(({ node }) => node.tagName === tag);
    const meta = (key) => elements('meta').filter(({ attrs }) => attrs.name === key || attrs.property === key).map(({ attrs }) => attrs.content);
    const links = elements('link').filter(({ attrs }) => attrs.rel === 'canonical');
    const title = elements('title').map(({ node }) => text(node)).join('');
    require(links.length === 1 && links[0].attrs.href === canonical && canonical.endsWith('.html'), `${file}: canonical must identify production .html`);
    require(title.trim().length > 0, `${file}: missing title`);
    require(!titles.has(title), `${file}: duplicate title with ${titles.get(title)}`);
    titles.set(title, file);
    const markdown = await readFile(path.join(root, '.generated-markdown', md), 'utf8');
    const metadata = load(markdown.match(/^---\n([\s\S]*?)\n---/)[1]);
    require(meta('description').length === 1 && meta('description')[0] === metadata.description, `${file}: description differs from source metadata`);
    require(!descriptions.has(metadata.description), `${file}: duplicate description with ${descriptions.get(metadata.description)}`);
    descriptions.set(metadata.description, file);
    require(meta('og:description')[0] === metadata.description && meta('og:title')[0] === title && meta('og:url')[0] === canonical, `${file}: inconsistent Open Graph identity`);
    require(/^https:\/\//.test(meta('og:image')[0] || ''), `${file}: missing absolute social sharing image`);
    const headings = nodes.filter(({ node }) => {
      if (!/^h[1-6]$/.test(node.tagName)) return false;
      for (let parent = node; parent; parent = parent.parentNode) {
        if (parent.attrs?.some(({ name, value }) => name === 'hidden' || (name === 'aria-hidden' && value === 'true'))) return false;
      }
      return true;
    });
    const principal = headings.filter(({ node }) => node.tagName === 'h1');
    require(principal.length === 1 && text(principal[0].node).trim() === metadata.title, `${file}: expected the document title as one principal H1`);
    let previous = 0;
    for (const { node } of headings) {
      const level = Number(node.tagName[1]);
      require(level <= previous + 1, `${file}: skipped heading level before ${text(node)}`);
      previous = level;
    }
    const language = documentLanguage(md);
    require(elements('html')[0]?.attrs.lang === language, `${file}: expected document language ${language}`);
    require(meta('og:locale')[0] === language, `${file}: Open Graph locale differs from document language`);
    if (/\.(?:fr|en)\.html$/.test(file)) {
      const expectedAlternates = localizedAlternates(file, documents, urls.production);
      const alternates = elements('link').filter(({ attrs }) => attrs.rel === 'alternate' && attrs.hreflang)
        .map(({ attrs }) => ({ language: attrs.hreflang, url: attrs.href }));
      const sort = (values) => [...values].sort((a, b) => a.language.localeCompare(b.language));
      require(JSON.stringify(sort(alternates)) === JSON.stringify(sort(expectedAlternates)), `${file}: incorrect published language alternatives`);
    }
    if (language === 'fr') {
      require(elements('body')[0]?.attrs.lang === 'en', `${file}: site interface must retain its English language boundary`);
      require(elements('div').some(({ attrs }) => attrs.class?.split(/\s+/).includes('theme-doc-markdown') && attrs.lang === 'fr'),
        `${file}: French article must declare its language inside the English interface`);
    }
    const noindex = meta('robots').some((value) => /\bnoindex\b/.test(value));
    require(noindex === urls.development, `${file}: incorrect environment indexing directive`);
    const expectedData = pageStructuredData(file, metadata.title, metadata.description, urls.production);
    const data = [];
    for (const { node, attrs } of elements('script')) if (attrs.type === 'application/ld+json') {
      try { data.push(JSON.parse(text(node))); } catch { errors.push(`${file}: invalid JSON-LD`); }
    }
    if (expectedData) require(data.some((value) => JSON.stringify(value) === JSON.stringify(expectedData)), `${file}: missing or incorrect centralized structured data`);
    require(elements('nav').some(({ attrs }) => attrs['aria-label']?.toLowerCase().includes('breadcrumb')), `${file}: missing breadcrumb navigation`);
    for (const { attrs } of elements('img')) require(Object.hasOwn(attrs, 'alt'), `${file}: image lacks alternative text attribute`);
  }
  const sitemap = await readFile(path.join(directory, 'sitemap.xml'), 'utf8');
  const locations = [];
  const parser = sax.parser(true);
  const stack = [];
  let location = '';
  parser.onopentag = (tag) => {
    const parent = stack.at(-1);
    require(parent === undefined ? tag.name === 'urlset' && tag.attributes.xmlns === 'http://www.sitemaps.org/schemas/sitemap/0.9'
      : (parent === 'urlset' && tag.name === 'url') || (parent === 'url' && tag.name === 'loc'), 'sitemap.xml: invalid sitemap structure or namespace');
    stack.push(tag.name);
    if (tag.name === 'loc') location = '';
  };
  parser.ontext = (value) => { if (stack.at(-1) === 'loc') location += value; };
  parser.onclosetag = (name) => { if (name === 'loc') locations.push(location); stack.pop(); };
  try { parser.write(sitemap).close(); } catch { errors.push('sitemap.xml: invalid XML'); }
  const expected = urls.development ? [] : documents.map((file) => new URL(file.replace(/\.md$/, '.html'), urls.production).href);
  require(JSON.stringify(locations.sort()) === JSON.stringify(expected.sort()), 'sitemap.xml: expected canonical HTML documents only');
  const robots = await readFile(path.join(directory, 'robots.txt'), 'utf8');
  require(robots.includes('User-agent: *\nAllow: /\n') && !/^Disallow:\s*\//m.test(robots), 'robots.txt: public resources must remain crawlable');
  require(robots.includes('User-agent: *\nAllow: /\nContent-Signal: search=yes, ai-input=yes, ai-train=no\n'),
    'robots.txt: expected search and AI input permission without model training permission');
  require(urls.development ? !/^Sitemap:/m.test(robots) : robots.includes(`Sitemap: ${new URL('sitemap.xml', urls.production).href}`), 'robots.txt: wrong environment sitemap');
  if (errors.length) throw new Error(errors.join('\n'));
  return { pages: documents.length, status: 'passed' };
}
