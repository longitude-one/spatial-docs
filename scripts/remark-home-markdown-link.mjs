import path from 'node:path';
import { baseUrl } from './site-settings.mjs';

// Keep the existing HTML home-page download link out of the portable source.
export default function remarkHomeMarkdownLink({ docsDirectory }) {
  return (tree, file) => {
    const sourcePath = path.relative(docsDirectory, file.path).split(path.sep).join('/');
    if (sourcePath !== 'index.md') return;
    tree.children.push({
      type: 'paragraph',
      children: [{
        type: 'link',
        url: `pathname://${baseUrl}${sourcePath}`,
        children: [{ type: 'text', value: 'Read this page as Markdown' }],
      }],
    });
  };
}
