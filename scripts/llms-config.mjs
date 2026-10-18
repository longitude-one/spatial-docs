import { deploymentBasePath } from './site-settings.mjs';

export function publicationUrls(env = process.env) {
  const development = env.DOCUSAURUS_DEPLOYMENT === 'development';
  function configured(name) {
    const value = env[name];
    if (!value?.trim()) throw new Error(`${name} is required for machine-readable publication.`);
    let url;
    try { url = new URL(value); } catch { throw new Error(`${name} must be an absolute HTTPS URL.`); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || /^(localhost|127\.|\[::1\])/.test(url.hostname)) throw new Error(`${name} must be an absolute public HTTPS URL without credentials, query or fragment.`);
    return url.href.replace(/\/$/, '') + '/';
  }
  const production = configured('URL_PRODUCTION');
  const active = development ? configured('URL_PREPRODUCTION') : production;
  return { development, production, base: new URL(development ? deploymentBasePath(development).slice(1) : '', active).href };
}
