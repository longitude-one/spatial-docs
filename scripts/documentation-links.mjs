import path from 'node:path';
import { slug } from 'github-slugger';

function walk(node, callback) {
  callback(node);
  for (const child of node.children || []) walk(child, callback);
}

function diagnostic(sourcePath, node, target, resolved, reason, prefix = 'docs/') {
  const position = node.position?.start;
  const location = position ? `:${position.line}:${position.column}` : '';
  return new Error(`${prefix}${sourcePath}${location}: Invalid internal documentation link: ${target}\n`
    + `Resolved target: ${resolved}\nReason: ${reason}`);
}

function headingText(node) {
  if (node.type === 'image' || node.type === 'imageReference') return node.alt || '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  return (node.children || []).map(headingText).join('');
}

export function documentationAnchors(tree, sourcePath, diagnosticPrefix = 'docs/') {
  const anchors = new Set();
  walk(tree, (node) => {
    if (node.type !== 'heading') return;
    const anchor = slug(headingText(node));
    if (anchors.has(anchor)) {
      throw diagnostic(sourcePath, node, `#${anchor}`, sourcePath,
        'Duplicate or ambiguous GFM heading anchor. Use distinct headings; numeric suffixes are not inferred.', diagnosticPrefix);
    }
    anchors.add(anchor);
  });
  return anchors;
}

const reserved = /^(?:aux|con|nul|prn|com[1-9]|lpt[1-9])(?:\.|$)/;

function portablePath(value) {
  return value.split('/').every((component) => component === '.' || component === '..'
    || (/^[a-z0-9_-][a-z0-9._-]*$/.test(component) && !component.endsWith('.') && !reserved.test(component)));
}

export async function processDocumentationLinks(documents, { staticDirectory, siteUrl, diagnosticPrefix = 'docs/' }) {
  const origin = new URL(siteUrl).origin;
  for (const [sourcePath, document] of documents) {
    const references = new Set();
    walk(document.tree, (node) => {
      if (node.type === 'linkReference') references.add(node.identifier);
    });
    const links = [];
    walk(document.tree, (node) => {
      if (node.type === 'link' || (node.type === 'definition' && references.has(node.identifier))) links.push(node);
    });
    for (const node of links) {
      const original = node.url;
      const fail = (resolved, reason) => { throw diagnostic(sourcePath, node, original, resolved, reason, diagnosticPrefix); };
      const absolute = /^[a-z][a-z0-9+.-]*:/i.test(original) || original.startsWith('//');
      if (absolute) {
        let url;
        try { url = new URL(original, siteUrl); } catch { fail(original, 'Invalid URL.'); }
        if (url.origin !== origin) {
          if (url.protocol === 'pathname:') fail(original, 'Internal links must use relative explicit .md source paths.');
          continue;
        }
        let pathname;
        try { pathname = decodeURIComponent(url.pathname); } catch { fail(url.pathname, 'Malformed percent encoding.'); }
        const candidates = [pathname.replace(/^\//, '')];
        for (const prefix of ['markdown/', 'spatial-docs/', 'spatial-docs/markdown/']) {
          if (candidates[0].startsWith(prefix)) candidates.push(candidates[0].slice(prefix.length));
        }
        if (candidates.some((candidate) => {
          // Detect an invalid absolute reference without repairing its spelling.
          const identity = candidate.toLowerCase();
          return documents.has(identity.replace(/\.html$/, '.md'))
            || documents.has(`${identity.replace(/\/$/, '')}/index.md`)
            || documents.has(`${identity}.md`);
        }) || pathname === '/') {
          fail(url.pathname, 'Absolute URLs to the documentation corpus are forbidden. Use relative .md paths.');
        }
        continue;
      }

      const hashAt = original.indexOf('#');
      const fragment = hashAt < 0 ? '' : original.slice(hashAt + 1);
      const beforeFragment = hashAt < 0 ? original : original.slice(0, hashAt);
      const queryAt = beforeFragment.indexOf('?');
      const targetPath = queryAt < 0 ? beforeFragment : beforeFragment.slice(0, queryAt);
      const query = queryAt < 0 ? '' : beforeFragment.slice(queryAt);
      let decodedPath;
      let decodedFragment;
      try {
        decodedPath = decodeURIComponent(targetPath);
        decodedFragment = decodeURIComponent(fragment);
      } catch { fail(targetPath || sourcePath, 'Malformed percent encoding.'); }
      if (!targetPath && original.startsWith('#')) {
        if (!document.anchors.has(decodedFragment)) fail(sourcePath, 'Missing GFM heading anchor.');
        continue;
      }
      if (decodedPath.startsWith('/')) fail(decodedPath, 'Internal links must be relative.');
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), decodedPath));
      const escapes = resolved === '..' || resolved.startsWith('../');
      const extension = path.posix.extname(decodedPath);
      const isDocument = !extension || extension === '.md' || extension === '.html'
        || /\.(?:md|html)$/i.test(decodedPath);
      if (!isDocument) {
        // The public Markdown and source hierarchies have the same depth.
        // An escaping path would also escape the site's shared asset surface.
        if (escapes) {
          fail(resolved, 'Relative target escapes docs/ and is not a published shared asset.');
        }
        continue;
      }
      if (decodedPath.endsWith('/')) fail(resolved, 'Documentation links must explicitly target .md files; directory targets are forbidden.');
      if (!portablePath(decodedPath) || decodedPath.includes('\\')) {
        fail(resolved, 'Documentation paths must be lowercase, portable and case-sensitive; invalid names are never repaired.');
      }
      if (escapes) fail(resolved, 'Documentation targets must not escape docs/.');
      if (extension !== '.md') fail(resolved, 'Documentation links must explicitly target .md files; HTML, directory and extensionless targets are forbidden.');
      if (!documents.has(resolved)) fail(resolved, 'Missing or unpublished source document (resolution is case-sensitive).');
      if (hashAt >= 0 && !documents.get(resolved).anchors.has(decodedFragment)) fail(resolved, 'Missing GFM heading anchor.');
      const relative = path.posix.relative(path.posix.dirname(sourcePath), resolved);
      node.url = `${relative}${query}${hashAt < 0 ? '' : `#${fragment}`}`;
    }
  }
}
