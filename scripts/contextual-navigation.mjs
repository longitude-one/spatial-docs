import { sidebarSourcePath } from './sidebar-canonical-links.mjs';

export function logicalBreadcrumbs(source, nativeItems, { publishedDocuments = [], libraryNames = {} } = {}) {
  const sourcePath = source?.replace(/^@site\/docs\//, '');
  if (!publishedDocuments.includes(sourcePath)) return nativeItems ?? [];
  const [domain, second] = sourcePath.split('/');
  const docLink = (label, filename) => ({ type: 'link', label,
    ...(publishedDocuments.includes(filename) ? { href: `/${filename.replace(/\.md$/, '.html')}` } : {}) });
  const native = nativeItems ?? [];
  if (libraryNames[domain]) {
    const prefix = [docLink('Libraries', 'index.md'), docLink(libraryNames[domain], `${domain}/index.md`)];
    if (/^v[1-9][0-9]*$/.test(second)) {
      return [...prefix, docLink(second, `${domain}/${second}/index.md`), ...native.slice(1)];
    }
    return second === 'index.md' ? prefix : [...prefix, { type: 'link', label: 'Roadmap' }];
  }
  const names = { standards: 'Standards', concepts: 'Concepts', dbms: 'DBMS' };
  if (!names[domain]) return native;
  const prefix = docLink(names[domain], `${domain}/index.md`);
  return second === 'index.md' ? [prefix] : [prefix, ...native];
}

function context(sourcePath, libraryNames) {
  const [domain, second] = sourcePath.split('/');
  if (libraryNames[domain]) return `${domain}/${/^v[1-9][0-9]*$/.test(second) ? second : 'overview'}`;
  return ['standards', 'concepts', 'dbms'].includes(domain) ? domain : 'ecosystem';
}

export function contextualPagination(source, adjacent, { publishedDocuments = [], libraryNames = {} } = {}, baseUrl = '/') {
  if (!adjacent) return undefined;
  const current = source?.replace(/^@site\/docs\//, '');
  const target = sidebarSourcePath(adjacent.permalink, publishedDocuments, baseUrl);
  if (!current || !target || context(current, libraryNames) !== context(target, libraryNames)) return undefined;
  return { ...adjacent, permalink: `/${target.replace(/\.md$/, '.html')}` };
}
