// Keep native route metadata for selection; navigate to published HTML resources.
export function canonicalSidebarHref(href, documents, baseUrl = '/') {
  if (!href || !href.startsWith(baseUrl)) return undefined;
  const route = href.slice(baseUrl.length).replace(/\/$/, '');
  const source = documents.find((filename) => {
    const nativeRoute = filename.replace(/\.md$/, '').replace(/(^|\/)index$/, '');
    return nativeRoute.replace(/\/$/, '') === route;
  });
  return source ? `pathname://${baseUrl}${source.replace(/\.md$/, '.html')}` : undefined;
}
