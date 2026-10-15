const sourcePrefix = '@site/docs/';
const editBase = 'https://github.com/longitude-one/spatial-docs/edit/main/docs/';

export function documentationActions(source, publishedDocuments, frontMatter = {}) {
  if (typeof source !== 'string' || !source.startsWith(sourcePrefix)) return null;
  const document = source.slice(sourcePrefix.length);
  if (!document.endsWith('.md') || !publishedDocuments.includes(document)
    || document.split('/').some((part) => !/^[a-z0-9_-][a-z0-9._-]*$/.test(part) || part === '..')) return null;
  return {
    markdown: `./${document.split('/').pop()}`,
    edit: frontMatter.custom_edit_url === null ? null : editBase + document.split('/').map(encodeURIComponent).join('/'),
  };
}
