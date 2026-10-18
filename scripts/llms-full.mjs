import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkStringify from 'remark-stringify';
import { load } from 'js-yaml';
import { libraryCategories } from './navbar-items.mjs';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml'])
  .use(remarkStringify, { bullet: '-', fences: true, listItemIndent: 'one' });
// This editorial configuration follows the site's overview, reference and library navigation.
export const llmsFullOrder = ['index.md', 'about/', 'shared/', 'standards/', 'concepts/', 'dbms/',
  ...libraryCategories.flatMap(({ libraries }) => libraries.map(([name]) => `${name}/`)), 'legal-notice.md'];
const text = (value) => ({ type: 'text', value });
const paragraph = (value) => ({ type: 'paragraph', children: [text(value)] });
function walk(node, visit) {
  visit(node);
  for (const child of node.children || []) walk(child, visit);
}
function normalizedBase(value, field) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`Missing or invalid ${field}.`); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
    || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error(`Invalid ${field}.`);
  return `${url.href.replace(/\/+$/, '')}/`;
}
function orderedPages(pages) {
  const seen = new Set();
  for (const { markdownPath } of pages) {
    if (typeof markdownPath !== 'string' || !markdownPath.endsWith('.md') || markdownPath.startsWith('/')
      || markdownPath.split('/').some((part) => !part || part === '.' || part === '..') || seen.has(markdownPath)) {
      throw new Error(`Invalid or duplicate corpus document: ${markdownPath}`);
    }
    seen.add(markdownPath);
  }
  const rank = (name) => {
    const index = llmsFullOrder.findIndex((prefix) => prefix.endsWith('/') ? name.startsWith(prefix) : name === prefix);
    return index < 0 ? llmsFullOrder.length : index;
  };
  return [...pages].sort((a, b) => rank(a.markdownPath) - rank(b.markdownPath)
    || (a.markdownPath < b.markdownPath ? -1 : a.markdownPath > b.markdownPath ? 1 : 0));
}

export function generateLlmsFull(pages, { base, production, development = false, assets = [] } = {}) {
  base = normalizedBase(base, 'deployment base');
  production = normalizedBase(production, 'production URL');
  const ordered = orderedPages(pages);
  if (!ordered.length) throw new Error('Cannot aggregate an empty documentation corpus.');
  const resources = new Set([...ordered.map(({ markdownPath }) => markdownPath), ...assets]);
  const children = [{ type: 'heading', depth: 1, children: [text('LongitudeOne Spatial — Complete documentation')] }];
  if (development) children.push(paragraph('Warning: this is non-official development documentation.'), {
    type: 'paragraph', children: [text('Official production documentation: '), { type: 'link', url: production, children: [text(production)] }],
  });
  for (const page of ordered) {
    const { markdownPath, content } = page;
    if (typeof content !== 'string' || content.startsWith('\uFEFF') || content.includes('\r')) throw new Error(`Invalid portable Markdown encoding: ${markdownPath}`);
    const tree = processor.parse(content);
    const frontmatter = tree.children.shift();
    if (frontmatter?.type !== 'yaml') throw new Error(`Missing normalized metadata: ${markdownPath}`);
    const metadata = load(frontmatter.value);
    for (const field of ['title', 'description']) {
      if (typeof metadata?.[field] !== 'string' || !metadata[field].trim()) throw new Error(`Missing ${field}: ${markdownPath}`);
    }
    // The generated representation switch is publication chrome, not document content.
    const counterpart = tree.children[0];
    const counterpartLink = counterpart?.type === 'paragraph' && counterpart.children.length === 1 ? counterpart.children[0] : null;
    if (counterpartLink?.type === 'link' && counterpartLink.url === metadata.canonical_html
      && counterpartLink.children.length === 1 && counterpartLink.children[0].type === 'text'
      && counterpartLink.children[0].value === 'View HTML version') tree.children.shift();
    const source = new URL(markdownPath, base).href;
    const rebase = (value, image = false) => {
      if (/^data:/i.test(value)) throw new Error(`Embedded data URI: ${markdownPath}`);
      const target = new URL(value, source);
      const local = !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value) || target.href.startsWith(base);
      if (!local) return value;
      if (!target.href.startsWith(base)) throw new Error(`Link escapes deployment base: ${value}`);
      const resource = decodeURIComponent(target.pathname.slice(new URL(base).pathname.length));
      if (!resources.has(resource)) throw new Error(`Unknown published resource: ${value} in ${markdownPath}`);
      if (!image && /\.(?:html?|mdx)$/i.test(resource)) throw new Error(`Non-Markdown document link: ${value}`);
      return target.href;
    };
    const definitions = new Map();
    walk(tree, (node) => { if (node.type === 'definition') definitions.set(node.identifier, node); });
    walk(tree, (node) => {
      if (node.type === 'html' || node.type === 'yaml') throw new Error(`Non-portable content in ${markdownPath}`);
      if (node.type === 'linkReference' || node.type === 'imageReference') {
        const definition = definitions.get(node.identifier);
        if (!definition) throw new Error(`Undefined reference in ${markdownPath}: ${node.identifier}`);
        node.type = node.type === 'linkReference' ? 'link' : 'image';
        node.url = definition.url;
        node.title = definition.title;
        delete node.identifier;
        delete node.label;
        delete node.referenceType;
      }
      if (node.type === 'link' || node.type === 'image') node.url = rebase(node.url, node.type === 'image');
    });
    walk(tree, (node) => {
      if (node.children) node.children = node.children.filter((child) => child.type !== 'definition');
    });
    children.push({ type: 'thematicBreak' }, { type: 'heading', depth: 2, children: [text(metadata.title.trim().replace(/\s+/g, ' '))] },
      paragraph(`Description: ${metadata.description.trim().replace(/\s+/g, ' ')}`), {
        type: 'paragraph', children: [text('Source: '), { type: 'link', url: source, children: [text(metadata.title.trim().replace(/\s+/g, ' '))] }],
      }, ...tree.children);
  }
  return processor.stringify({ type: 'root', children });
}

// Reconstructing the canonical artifact verifies boundaries, coverage, order, metadata,
// rebased links and exact source content together, including duplicate/unknown blocks.
export function validateLlmsFull(content, pages, options) {
  if (typeof content !== 'string' || !content || content.startsWith('\uFEFF') || content.includes('\r')) {
    throw new Error('llms-full.txt must be nonempty UTF-8 without BOM and use LF line endings.');
  }
  if (content !== generateLlmsFull(pages, options)) throw new Error('llms-full.txt differs from the complete canonical published corpus.');
  return true;
}
