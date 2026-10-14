// The provider's only search-page URL uses a directory identity. Adapt its
// navigation link without copying the search UI or changing documentation URLs.
module.exports = function searchRouteLoader(source) {
  const original = '${baseUrl}search/?';
  if (!source.includes(original)) throw new Error('Local-search provider search-page URL changed; review the route adapter.');
  return source.replace(original, '${baseUrl}search.html?');
};
