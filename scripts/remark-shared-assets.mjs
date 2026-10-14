import path from 'node:path';

export function sharedAssetUrl(sourcePath, reference, baseUrl) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(reference)) return null;
  const split = reference.search(/[?#]/);
  const pathname = split < 0 ? reference : reference.slice(0, split);
  const suffix = split < 0 ? '' : reference.slice(split);
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), pathname));
  if (!target.startsWith('assets/')) return null;
  // Docusaurus's pathname protocol bypasses bundling/imports. The file remains
  // at its stable static URL, while portable Markdown retains the source URL.
  return `pathname://${baseUrl}${target}${suffix}`;
}

export default function remarkSharedAssets({ docsDirectory, baseUrl }) {
  return (tree, file) => {
    const sourcePath = path.relative(docsDirectory, file.path).split(path.sep).join('/');
    function visit(node) {
      if (['image', 'link', 'definition'].includes(node.type)) {
        node.url = sharedAssetUrl(sourcePath, node.url, baseUrl) ?? node.url;
      }
      for (const child of node.children || []) visit(child);
    }
    visit(tree);
  };
}
