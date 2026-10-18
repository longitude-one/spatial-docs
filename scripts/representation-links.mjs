import path from 'node:path';
import {parse} from 'parse5';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes || node.children || []) walk(child, visit);
}
function text(node) {
  return node.value || (node.childNodes || node.children || []).map(text).join('');
}

export function verifyDiscoveryLink(html, source, publishedPaths) {
  const fail = (message) => { throw new Error(`${source}: ${message}`); };
  const expected = path.posix.relative(path.posix.dirname(source), 'llms.txt');
  const relationships = [];
  let head;
  walk(parse(html), (node) => {
    if (node.tagName === 'head') head = node;
    const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
    if (attrs.rel?.split(/\s+/).includes('describedby')) relationships.push({node, attrs});
  });
  if (relationships.length !== 1) fail('expected exactly one describedby relationship to llms.txt.');
  const {node, attrs} = relationships[0];
  if (node.tagName !== 'link' || node.parentNode !== head) fail('describedby metadata must be a link in head.');
  if (attrs.rel !== 'describedby' || attrs.type !== 'text/plain' || attrs.href !== expected) {
    fail(`describedby metadata must declare text/plain and the relative target ${expected}.`);
  }
  if (!new Set(publishedPaths).has('llms.txt')) fail('describedby target llms.txt is missing from the publication corpus.');
}

export function verifyRepresentationLinks(html, markdown, source) {
  const fail = (message) => { throw new Error(`${source}: ${message}`); };
  const htmlHref = `./${path.posix.basename(source.replace(/\.md$/, '.html'))}`;
  const markdownHref = `./${path.posix.basename(source)}`;
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']).parse(markdown);
  const links = [];
  walk(tree, (node) => {
    if (['link', 'linkReference'].includes(node.type) && text(node) === 'View HTML version') links.push(node);
  });
  const paragraph = tree.children[1];
  if (tree.children[0]?.type !== 'yaml' || links.length !== 1 || paragraph?.type !== 'paragraph'
    || paragraph.children.length !== 1 || paragraph.children[0] !== links[0] || links[0].url !== htmlHref) {
    fail('expected exactly one relative View HTML version link immediately after front matter.');
  }
  const document = parse(html);
  const visible = [];
  const alternates = [];
  let title;
  let head;
  walk(document, (node) => {
    if (node.tagName === 'head') head = node;
    if (node.tagName === 'h1' && !title) title = node;
    const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
    if (node.tagName === 'a' && (text(node).trim() === 'View Markdown version'
      || (attrs.rel?.split(/\s+/).includes('alternate') && attrs.type === 'text/markdown'))) visible.push({node, attrs});
    if (node.tagName === 'link' && attrs.rel?.split(/\s+/).includes('alternate') && attrs.type === 'text/markdown') {
      alternates.push({node, attrs});
    }
  });
  if (visible.length !== 1 || alternates.length !== 1 || text(visible[0].node).trim() !== 'View Markdown version') fail('expected one visible Markdown link and one head alternate declaration.');
  for (const {attrs} of [...visible, ...alternates]) {
    if (attrs.href !== markdownHref || attrs.rel !== 'alternate' || attrs.type !== 'text/markdown') {
      fail('alternate links must agree on the direct relative .md target and semantics.');
    }
  }
  if (alternates[0].node.parentNode !== head) fail('alternate metadata must appear in head.');
  const parent = visible[0].node.parentNode;
  const siblings = title?.parentNode?.childNodes.filter((node) => node.tagName);
  if (!title || parent?.tagName !== 'p' || parent.parentNode !== title.parentNode
    || siblings[siblings.indexOf(title) + 1] !== parent) fail('visible Markdown link must appear directly below the document title.');
}
