import path from 'node:path';
import { statusFor, statusText } from './library-versions.mjs';

export default function remarkVersionStatus({ libraries, docsDirectory }) {
  return (tree, file) => {
    const sourcePath = path.relative(docsDirectory, file.path).split(path.sep).join('/');
    const info = statusFor(sourcePath, libraries);
    if (!info) return;
    const children = [
      { type: 'paragraph', children: [
        { type: 'strong', children: [{ type: 'text', value: `${info.status} version` }] },
        { type: 'text', value: ` — ${statusText(info).replaceAll('`', '')}` },
      ] },
    ];
    if (info.roadmap) {
      children.push({ type: 'paragraph', children: [{
        type: 'mdxJsxTextElement',
        name: 'a',
        attributes: [{ type: 'mdxJsxAttribute', name: 'href', value: `pathname:///${info.library}/roadmap.html` }],
        children: [{ type: 'text', value: 'View the library roadmap' }],
      }] });
    }
    tree.children.unshift({ type: 'blockquote', children });
  };
}
