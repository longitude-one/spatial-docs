// Server negotiation preserves the requested URL. The browser router must match
// that URL too, or hydration replaces a successful HTML response with a 404.
export function addResourceRouteAliases(routes, documents, baseUrl = '/') {
  const published = new Set(documents.map((document) => `${baseUrl}${document.replace(/\.md$/, '.html')}`));
  for (const route of [...routes]) {
    if (route.routes) addResourceRouteAliases(route.routes, documents, baseUrl);
    if (!route.exact || !published.has(route.path)) continue;
    const aliases = [route.path.slice(0, -5)];
    if (route.path === `${baseUrl}index.html`) aliases.push(baseUrl);
    for (const alias of aliases) {
      if (!routes.some((candidate) => candidate.path === alias)) {
        routes.splice(routes.indexOf(route) + 1, 0, {...route, path: alias});
      }
    }
  }
}
