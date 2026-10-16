// Keep provider-specific canonical routing and the clear-control accessible
// name isolated here, without copying the search UI.
module.exports = function searchRouteLoader(source) {
  const original = '${baseUrl}search/?';
  if (!source.includes(original)) throw new Error('Local-search provider search-page URL changed; review the route adapter.');
  const clear = '<button className={styles.searchClearButton}';
  if (!source.includes(clear)) throw new Error('Local-search provider clear control changed; review its accessible label adapter.');
  return source.replace(original, '${baseUrl}search.html?')
    .replace(clear, '<button type="button" aria-label="Clear search" className={styles.searchClearButton}');
};
