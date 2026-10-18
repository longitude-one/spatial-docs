export const isDevelopment = process.env.DOCUSAURUS_DEPLOYMENT === 'development';
export const siteUrl = (isDevelopment
  ? (process.env.URL_PREPRODUCTION || 'https://longitude-one.github.io')
  : (process.env.URL_PRODUCTION || 'https://www.longitude-one.fr')).replace(/\/$/, '');
export const deploymentBasePath = (development) => development ? '/spatial-docs/' : '/';
export const baseUrl = deploymentBasePath(isDevelopment);
export function developmentNotice(value = process.env.URL_PRODUCTION) {
  if (!value?.trim()) throw new Error('URL_PRODUCTION is required for development publication.');
  let url;
  try { url = new URL(value); } catch { throw new Error('URL_PRODUCTION must be an absolute HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('URL_PRODUCTION must be an absolute HTTP(S) URL without credentials.');
  const href = url.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `Development version — not the official LongitudeOne documentation. <a href="${href}">Read the official documentation</a>.`;
}
