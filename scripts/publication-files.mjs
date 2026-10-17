export const internalManifests = ['asset-manifest.json', 'markdown-mapping.json', 'documentation-manifest.json'];
export const publicInfrastructure = ['404.html', 'search.html', 'sitemap.xml', 'robots.txt', 'favicon.ico', '.nojekyll', 'CNAME'];
export function isRuntimeResource(file) {
  return /^assets\/(?:js\/[a-z0-9~_-]+\.[a-f0-9]+\.js(?:\.LICENSE\.txt)?|css\/styles\.[a-f0-9]+\.css|(?:fonts|images|media)\/[^/]+\.(?:woff2?|ttf|otf|png|jpe?g|gif|webp|svg|ico))$/.test(file);
}
export function isPublicResource(file, assets = []) {
  if (file === '.htaccess') return true;
  if (internalManifests.includes(file) || file.endsWith('.map') || file.split('/').some((part) => part.startsWith('.') && part !== '.nojekyll')) return false;
  return /\.(?:html|md)$/.test(file) || file === 'llms.txt' || publicInfrastructure.includes(file) || assets.includes(file)
    || /^search-index-[a-f0-9]+\.json$/.test(file)
    || isRuntimeResource(file);
}
