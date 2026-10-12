export function isSiteResource(href, siteUrl) {
  if (!href) return true;
  try {
    return new URL(href.replace(/^pathname:\/\//, ''), siteUrl).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

export function linkTargetProps(href, siteUrl) {
  return isSiteResource(href, siteUrl)
    ? { target: '_self', rel: undefined }
    : { target: '_blank', rel: 'noopener noreferrer' };
}

export function verifyLinkTarget({ href, target, rel }, siteUrl) {
  if (isSiteResource(href, siteUrl) && target && target !== '_self') {
    throw new Error(`Internal link must use the current tab: ${href}`);
  }
  if (!isSiteResource(href, siteUrl) && target === '_blank'
    && !['noopener', 'noreferrer'].every((token) => (rel || '').split(/\s+/).includes(token))) {
    throw new Error(`External new-tab link requires safe rel: ${href}`);
  }
}
