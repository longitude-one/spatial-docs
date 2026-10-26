import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { baseUrl } from './site-settings.mjs';

const parser = unified().use(remarkParse).use(remarkGfm);

export function libraryLandingNavigation(sourcePath, libraries) {
  const match = /^([^/]+)\/index\.md$/.exec(sourcePath);
  const library = match?.[1];
  const info = libraries[library];
  if (!info || info.roadmap) return null;
  const current = Object.entries(info.versions).find(([, status]) => status === 'Current')?.[0];
  const lines = ['## Get started', ''];
  if (current) {
    lines.push(`[Open current stable documentation (${current})](./${current}/index.md)`, '',
      '```bash', `composer require longitude-one/${library}:^${current.slice(1)}.0@stable`, '```', '');
  } else {
    lines.push('No stable release is currently available. The Next documentation below describes work ahead of a stable release.', '');
  }
  lines.push('## Documentation versions', '', '| Major version | Status |', '| --- | --- |');
  for (const [version, status] of Object.entries(info.versions).sort(([a], [b]) => Number(b.slice(1)) - Number(a.slice(1)))) {
    lines.push(`| [${version}](./${version}/index.md) | ${status} |`);
  }
  lines.push('', 'Version status follows the [documentation versioning contract](../about/versioning.md).', '');
  return lines.join('\n');
}

export function appendLibraryLandingNavigation(tree, sourcePath, libraries, { html = false } = {}) {
  const markdown = libraryLandingNavigation(sourcePath, libraries);
  if (!markdown) return;
  const navigation = parser.parse(markdown).children;
  if (html) {
    function canonicalLinks(node) {
      if (node.type === 'link') {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), node.url));
        node.url = `pathname://${baseUrl}${target.replace(/\.md$/, '.html')}`;
      }
      node.children?.forEach(canonicalLinks);
    }
    navigation.forEach(canonicalLinks);
  }
  // Keep the entry point ahead of detailed requirements and reference material.
  const firstHeading = tree.children.findIndex(({ type }) => type === 'heading');
  tree.children.splice(firstHeading === -1 ? tree.children.length : firstHeading, 0, ...navigation);
}

export default function remarkLibraryLandingPages({ libraries, docsDirectory }) {
  return (tree, file) => {
    const sourcePath = path.relative(docsDirectory, file.path).split(path.sep).join('/');
    appendLibraryLandingNavigation(tree, sourcePath, libraries, { html: true });
  };
}
