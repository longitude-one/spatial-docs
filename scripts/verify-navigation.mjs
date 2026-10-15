import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parse } from 'parse5';
import { load } from 'js-yaml';
import { libraryVersionNavigation } from './library-version-navigation.mjs';

// Use the search provider's own engine rather than introducing a second implementation.
const require = createRequire(import.meta.url);
const lunr = createRequire(require.resolve('@easyops-cn/docusaurus-search-local'))('lunr');
const attrs = (node) => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
const text = (node) => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
function all(node, predicate) {
  return [...(predicate(node) ? [node] : []), ...(node.childNodes || []).flatMap((child) => all(child, predicate))];
}
const hasClass = (node, name) => (attrs(node).class || '').split(/\s+/).includes(name);

export function inspectNavigation(html, file, { baseUrl, siteUrl, published }) {
  const tree = parse(html);
  const origin = new URL(siteUrl).origin;
  const current = `${origin}${baseUrl}${file}`;
  const fail = (message) => { throw new Error(`${file}: ${message}`); };
  const ids = new Map(all(tree, (node) => attrs(node).id).map((node) => [attrs(node).id, node]));
  for (const node of all(tree, (node) => ['button', 'summary'].includes(node.tagName)
    || (node.tagName === 'input' && ['search', 'text'].includes(attrs(node).type)))) {
    const attributes = attrs(node);
    const label = attributes['aria-label'] || attributes['aria-labelledby']?.split(/\s+/).map((id) => text(ids.get(id) || {})).join(' ') || text(node);
    if (!/[\p{L}\p{N}]/u.test(label)) fail(`Unnamed navigation control: ${node.tagName}`);
    if (attributes['aria-controls'] && !ids.has(attributes['aria-controls'])) fail(`Missing controlled panel: ${attributes['aria-controls']}`);
  }
  const links = [];
  for (const node of all(tree, (node) => node.tagName === 'a' && attrs(node).href)) {
    const href = attrs(node).href;
    const url = new URL(href, current);
    if (url.origin !== origin) continue;
    if (!url.pathname.startsWith(baseUrl)) fail(`Navigation leaves the site base URL: ${href}`);
    const target = decodeURIComponent(url.pathname.slice(baseUrl.length));
    if (published.has(target)) links.push(target);
    else if (published.has(`${target.replace(/\/$/, '')}.html`) || published.has(`${target}index.html`)) {
      fail(`Navigation requires an explicit canonical HTML URL: ${href}`);
    }
  }
  return { tree, links, all: (predicate) => all(tree, predicate), fail };
}

export function searchNavigation(index, expected, baseUrl, queries) {
  const documents = index.flatMap((group) => group.documents);
  const indexed = new Set(documents.map((doc) => doc.u));
  if ([...indexed].some((url) => !expected.has(url)) || [...expected].some((url) => !indexed.has(url))) {
    throw new Error('Search must contain exactly the published HTML corpus, without drafts or unpublished content.');
  }
  const engines = index.map((group) => ({ engine: lunr.Index.load(group.index), documents: new Map(group.documents.map((doc) => [String(doc.i), doc])) }));
  const journeys = [];
  for (const { term, targets } of queries) {
    const results = new Set(engines.flatMap(({ engine, documents: group }) => engine.search(term).map((hit) => group.get(hit.ref)?.u)));
    for (const target of targets) if (!results.has(`${baseUrl}${target}`)) throw new Error(`Search journey "${term}" does not return ${target}`);
    journeys.push({ term, targets });
  }
  return journeys;
}

export async function verifyNavigation(root, corpus, metadata = path.join(root, '.publication-metadata')) {
  const config = (await import(`${path.join(root, 'docusaurus.config.js')}?navigation`)).default;
  const manifest = JSON.parse(await readFile(path.join(metadata, 'documentation-manifest.json'), 'utf8'));
  const published = new Set(manifest.documents.map(({ html }) => html));
  const graph = new Map();
  const anchors = new Map();
  for (const document of manifest.documents) {
    const page = inspectNavigation(await readFile(path.join(corpus, document.html), 'utf8'), document.html,
      { baseUrl: config.baseUrl, siteUrl: config.url, published });
    graph.set(document.html, page.links);
    anchors.set(`${config.baseUrl}${document.html}`, new Set(page.all((node) => attrs(node).id).map((node) => attrs(node).id)));
    const actions = page.all((node) => attrs(node)['aria-label'] === 'Documentation actions');
    if (actions.length !== 1) page.fail('Expected one named contextual action group.');
    const links = all(actions[0], (node) => node.tagName === 'a');
    const markdown = links.filter((node) => text(node).trim() === 'View Markdown version');
    if (markdown.length !== 1 || attrs(markdown[0]).href !== `./${path.posix.basename(document.markdown)}`) page.fail('Markdown action lost document/version identity.');
    const source = await readFile(path.join(root, document.source), 'utf8');
    const frontMatter = load(source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '') || {};
    const edits = links.filter((node) => text(node).trim() === 'Edit this page on GitHub');
    const expectedEdit = `https://github.com/longitude-one/spatial-docs/edit/main/${document.source}`;
    if (frontMatter.custom_edit_url === null ? edits.length !== 0 : edits.length !== 1 || attrs(edits[0]).href !== expectedEdit) page.fail('Contribution action lost source/version identity.');
    const context = libraryVersionNavigation(`@site/${document.source}`, config.customFields);
    if (context) {
      const nav = page.all((node) => node.tagName === 'nav' && hasClass(node, 'library-version-nav'))[0];
      if (!nav || attrs(nav)['aria-label'] !== `${context.name} documentation`) page.fail('Library navigation has no meaningful context label.');
      const versionLinks = all(nav, (node) => node.tagName === 'a');
      for (const version of context.versions) {
        const link = versionLinks.find((node) => attrs(node).href === `${config.baseUrl}${version.to.slice(1)}` && text(node).includes(version.status));
        if (!link || (version.selected && attrs(link)['aria-current'] !== 'page')) page.fail(`Version navigation lost ${version.version} (${version.status}).`);
      }
      const breadcrumbs = page.all((node) => attrs(node)['aria-label'] === 'Breadcrumbs')[0];
      if (!breadcrumbs || !text(breadcrumbs).includes(context.name) || (context.version && !text(breadcrumbs).includes(context.version))) page.fail('Breadcrumbs lost library/version context.');
    }
  }
  const reachable = new Set();
  function visit(file) { if (reachable.has(file)) return; reachable.add(file); for (const target of graph.get(file) || []) visit(target); }
  visit('index.html');
  const unreachable = [...published].filter((file) => !reachable.has(file));
  if (unreachable.length) throw new Error(`HTML navigation cannot reach: ${unreachable.join(', ')}`);
  const indexes = (await readdir(corpus)).filter((file) => /^search-index-[a-f0-9]+\.json$/.test(file));
  if (indexes.length !== 1) throw new Error('Navigation requires one global search index.');
  const index = JSON.parse(await readFile(path.join(corpus, indexes[0]), 'utf8'));
  const queries = [
    { term: 'geometry', targets: ['concepts/geometries.html', 'standards/ogc/ogc-06-103r4.html'] },
    { term: 'PostGIS', targets: ['dbms/postgis.html'] },
    { term: 'Doctrine', targets: ['doctrine-spatial/index.html', ...Object.keys(config.customFields.libraryVersions['doctrine-spatial'].versions)
      .map((version) => `doctrine-spatial/${version}/index.html`)] },
  ];
  const searches = searchNavigation(index, new Set([...published].map((file) => `${config.baseUrl}${file}`)), config.baseUrl, queries);
  const titles = new Map(index[0].documents.map((doc) => [doc.i, doc]));
  for (const [groupNumber, group] of index.entries()) for (const doc of group.documents) {
    const title = groupNumber === 0 ? doc : titles.get(doc.p);
    if (!title || title.u !== doc.u) throw new Error(`Search result has no matching parent page: ${doc.u}`);
    if (doc.h && !anchors.get(doc.u)?.has(decodeURIComponent(doc.h.replace(/^#/, '')))) throw new Error(`Search result has a broken anchor: ${doc.u}${doc.h}`);
    const [library, version] = doc.u.slice(config.baseUrl.length).split('/');
    const status = config.customFields.libraryVersions[library]?.versions[version];
    const breadcrumbs = title.b;
    if (status && (!breadcrumbs?.includes(config.customFields.libraryNames[library]) || !breadcrumbs.includes(`${version} (${status})`))) {
      throw new Error(`Search result lost library/version context: ${doc.u}`);
    }
  }
  const report = { version: 1, status: 'passed', documents: published.size, reachable: reachable.size, searches,
    scope: 'Rendered HTML structure and actual search-index queries; responsive and keyboard interactions require the documented browser review.' };
  await writeFile(path.join(metadata, 'navigation-validation.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyNavigation(process.cwd(), path.resolve(process.argv[2] || 'public'));
  console.log('Documentation navigation structure, context and search journeys passed.');
}
