import { documentLanguage } from './document-language.mjs';
// Explicit classification keeps API semantics independent from directory naming.
const apiReferences = new Set([
  'spatial-types/v1/validators.html',
  'spatial-types/v1/instantiable-spatial-types.html',
  'spatial-encoder/v1/strategies.html',
]);
export function structuredDataType(resource) {
  if (resource === 'index.html') return 'WebSite';
  if (['legal-notice.fr.html', 'legal-notice.en.html', 'shared/french-website-legal-review.html'].includes(resource)
    || /(?:^|\/)(?:index|roadmap)\.html$/.test(resource)) return null;
  return apiReferences.has(resource) ? 'APIReference' : 'TechArticle';
}
export function pageStructuredData(resource, title, description, productionUrl) {
  const type = structuredDataType(resource);
  if (!type) return null;
  return {
    '@context': 'https://schema.org', '@type': type,
    [type === 'WebSite' ? 'name' : 'headline']: title,
    description, url: new URL(resource, productionUrl.replace(/\/$/, '') + '/').href,
    inLanguage: documentLanguage(resource),
  };
}
