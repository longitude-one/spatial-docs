// Keep native route metadata for selection; navigate to published HTML resources.
export function sidebarSourcePath(href, documents, baseUrl = '/') {
  if (!href || !href.startsWith(baseUrl)) return undefined;
  const route = href.slice(baseUrl.length).replace(/\/$/, '');
  return documents.find((filename) => {
    const nativeRoute = filename.replace(/\.md$/, '').replace(/(^|\/)index$/, '');
    return nativeRoute.replace(/\/$/, '') === route;
  });
}

export function canonicalSidebarHref(href, documents, baseUrl = '/') {
  const source = sidebarSourcePath(href, documents, baseUrl);
  return source ? `pathname://${baseUrl}${source.replace(/\.md$/, '.html')}` : undefined;
}
