import path from 'node:path';

export function markdownReachability(documents, entry = 'index.md') {
  const reached = new Set();
  const queue = [entry];
  while (queue.length) {
    const source = queue.shift();
    if (reached.has(source) || !documents.has(source)) continue;
    reached.add(source);
    const tree = documents.get(source).tree;
    const definitions = new Map();
    const visit = (node, callback) => {
      callback(node);
      node.children?.forEach((child) => visit(child, callback));
    };
    visit(tree, (node) => {
      if (node.type === 'definition') definitions.set(node.identifier, node.url);
    });
    visit(tree, (node) => {
      const href = node.type === 'link' ? node.url : node.type === 'linkReference' ? definitions.get(node.identifier) : null;
      if (!href || /^[a-z][a-z\d+.-]*:|^\/\//i.test(href)) return;
      const target = href.split(/[?#]/)[0];
      if (!target.endsWith('.md')) return;
      queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(source), target)));
    });
  }
  return { reached: [...reached].sort(), missing: [...documents.keys()].filter((source) => !reached.has(source)).sort() };
}

export function verifyMarkdownReachability(documents) {
  const result = markdownReachability(documents);
  if (result.missing.length) {
    throw new Error(`Markdown pages unreachable from index.md: ${result.missing.join(', ')}`);
  }
  return result;
}
