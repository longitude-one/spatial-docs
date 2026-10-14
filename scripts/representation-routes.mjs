import path from 'node:path';

// Generate routing metadata in memory; authors never maintain publication paths.
export async function parseRepresentationFrontMatter(params) {
  const result = await params.defaultParseFrontMatter(params);
  const relative = path.relative(path.resolve('docs'), params.filePath).split(path.sep).join('/');
  if (relative.startsWith('../') || !relative.endsWith('.md')) return result;
  if (Object.hasOwn(result.frontMatter, 'slug')) throw new Error('Source slug metadata is forbidden.');
  return {...result, frontMatter: {...result.frontMatter, slug: `/${relative.replace(/\.md$/, '.html')}`}};
}
