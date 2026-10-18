// The language suffix describes article content, independently of the site's UI locale.
export function documentLanguage(resource) {
  return /\.fr\.(?:md|html)$/.test(resource) ? 'fr' : 'en';
}

export function localizedAlternates(resource, publishedDocuments, productionUrl) {
  if (!/\.(?:fr|en)\.html$/.test(resource)) return [];
  return ['fr', 'en'].flatMap((language) => {
    const html = resource.replace(/\.(?:fr|en)\.html$/, `.${language}.html`);
    return publishedDocuments.includes(html.replace(/\.html$/, '.md'))
      ? [{ language, url: new URL(html, productionUrl.replace(/\/$/, '') + '/').href }] : [];
  });
}
