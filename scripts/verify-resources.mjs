import { readdir, readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import GithubSlugger from 'github-slugger';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { documentationAnchors, processDocumentationLinks } from './documentation-links.mjs';

async function files(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  }))).flat();
}

function walk(node, callback) {
  callback(node);
  for (const child of node.children || node.childNodes || []) walk(child, callback);
}

function inspect(content, html) {
  const links = [];
  const ids = new Set();
  if (html) {
    walk(parse(content), (node) => {
      const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
      if (attrs.id) ids.add(attrs.id);
      if (node.tagName === 'a' && attrs.name) ids.add(attrs.name);
      if (attrs.href) links.push(attrs.href);
      if (attrs.src) links.push(attrs.src);
    });
  } else {
    const tree = unified().use(remarkParse).use(remarkGfm).parse(content);
    const definitions = new Map();
    walk(tree, (node) => {
      if (node.type === 'definition') definitions.set(node.identifier, node.url);
    });
    const slugger = new GithubSlugger();
    walk(tree, (node) => {
      if (node.type === 'link' || node.type === 'image') links.push(node.url);
      if (node.type === 'linkReference' || node.type === 'imageReference') {
        if (!definitions.has(node.identifier)) throw new Error(`Undefined reference: ${node.identifier}`);
        links.push(definitions.get(node.identifier));
      }
      if (node.type === 'html') {
        const embedded = inspect(node.value, true);
        links.push(...embedded.links);
        for (const id of embedded.ids) ids.add(id);
      }
      if (node.type === 'heading') {
        let text = '';
        walk(node, (child) => { if (child.value) text += child.value; });
        ids.add(slugger.slug(text));
      }
    });
  }
  return { links, ids };
}

export async function verifyResources(root) {
  const build = path.join(root, 'build');
  const config = (await import(`${path.join(root, 'docusaurus.config.js')}?verify`)).default;
  const origin = new URL(config.url).origin;
  const available = new Set((await files(build)).map((file) => path.relative(build, file).split(path.sep).join('/')));
  const parsed = new Map();
  const markdownDocuments = new Map();
  for (const file of available) {
    if (file.startsWith('markdown/') && file.endsWith('.md')) {
      const sourcePath = file.slice('markdown/'.length);
      const tree = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml'])
        .parse(await readFile(path.join(build, file), 'utf8'));
      tree.children = tree.children.filter((node) => node.type !== 'yaml');
      const paragraph = tree.children[0];
      const link = paragraph?.type === 'paragraph' && paragraph.children.length === 1 ? paragraph.children[0] : null;
      const expectedHtml = path.posix.relative(path.posix.dirname(`markdown/${sourcePath}`), sourcePath.replace(/\.md$/, '.html'));
      if (link?.type === 'link' && link.url === expectedHtml
        && link.children.length === 1 && link.children[0].value === 'View HTML version') {
        tree.children.shift();
      }
      markdownDocuments.set(sourcePath, { tree, anchors: documentationAnchors(tree, sourcePath, 'build/markdown/') });
    }
    if (/\.(html|md)$/.test(file) || file === 'llms.txt') {
      parsed.set(file, inspect(await readFile(path.join(build, file), 'utf8'), file.endsWith('.html')));
    }
  }
  await processDocumentationLinks(markdownDocuments, {
    staticDirectory: build,
    siteUrl: config.url,
    diagnosticPrefix: 'build/markdown/',
  });
  function resolve(href, from) {
    const url = new URL(href, `${origin}${config.baseUrl}${from}`);
    if (url.origin !== origin) return null;
    const pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith(config.baseUrl)) throw new Error(`Outside site: ${href} in ${from}`);
    const resource = pathname.slice(config.baseUrl.length);
    const normalizedResource = resource.replace(/\/$/, '');
    const candidates = [resource, `${normalizedResource}/index.html`, `${normalizedResource}/index.md`, `${normalizedResource}.html`];
    if (!resource) candidates.unshift('index.html');
    const target = candidates.find((candidate) => available.has(candidate));
    if (!target) throw new Error(`Broken internal link: ${href} in ${from}`);
    if (url.hash && parsed.has(target) && !parsed.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))) {
      throw new Error(`Broken anchor: ${href} in ${from}`);
    }
    return target;
  }
  // Derive explicit representation paths from source paths, not Docusaurus slugs.
  const metadataDirectory = path.join(root, '.docusaurus/docusaurus-plugin-content-docs/default');
  const pages = [];
  const representationPaths = new Set();
  for (const file of (await files(metadataDirectory)).sort()) {
    if (!file.endsWith('.json')) continue;
    const doc = JSON.parse(await readFile(file, 'utf8'));
    if (!doc.source?.startsWith('@site/docs/') || !doc.permalink || doc.draft || doc.unlisted) continue;
    const source = doc.source.slice('@site/docs/'.length);
    try {
      if (!(await stat(path.join(root, 'docs', source))).isFile()) continue;
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const markdown = source.replace(/\.mdx?$/, '.md');
    const html = markdown.replace(/\.md$/, '.html');
    if (representationPaths.has(html) || representationPaths.has(markdown)) {
      throw new Error(`Duplicate representation path for ${source}.`);
    }
    representationPaths.add(html);
    representationPaths.add(markdown);
    const href = `${config.baseUrl}markdown/${markdown}`;
    const renderedHtml = resolve(doc.permalink, '');
    const htmlFile = path.join(build, html);
    if (!available.has(html)) {
      await mkdir(path.dirname(htmlFile), { recursive: true });
      await copyFile(path.join(build, renderedHtml), htmlFile);
      available.add(html);
      parsed.set(html, inspect(await readFile(htmlFile, 'utf8'), true));
    } else if (html !== renderedHtml) {
      throw new Error(`HTML representation path collides with an existing resource: ${html}.`);
    }
    const htmlUrl = `${config.baseUrl}${html}`;
    resolve(htmlUrl, '');
    resolve(href, '');
    pages.push({ html: htmlUrl, markdown: href });
  }
  pages.sort((left, right) => (left.markdown < right.markdown ? -1 : left.markdown > right.markdown ? 1 : 0));
  for (const [file, { links }] of parsed) {
    const from = file.endsWith('/index.html') ? file.slice(0, -10) : file === 'index.html' ? '' : file;
    for (const href of links) resolve(href, from);
  }
  const expected = pages.map((page) => page.markdown).sort();
  const listed = parsed.get('llms.txt')?.links.slice().sort();
  const exported = [...available].filter((file) => file.startsWith('markdown/') && file.endsWith('.md'))
    .map((file) => `${config.baseUrl}${file}`).sort();
  if (!expected.length || JSON.stringify(expected) !== JSON.stringify(listed)
    || JSON.stringify(expected) !== JSON.stringify(exported)) {
    throw new Error('llms.txt and Markdown exports must match the publishable Docusaurus pages exactly.');
  }
  await writeFile(path.join(build, 'markdown-mapping.json'), `${JSON.stringify(pages, null, 2)}\n`);
}
