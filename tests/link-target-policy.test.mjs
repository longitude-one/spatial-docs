import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSiteResource, linkTargetProps, verifyLinkTarget } from '../scripts/link-target-policy.mjs';

test('internal HTML, Markdown, anchors and same-origin URLs use the current tab at both deployment bases', () => {
  for (const base of ['/', '/spatial-docs/']) {
    const site = `https://docs.example.org${base}`;
    for (const href of [`${base}spatial-core/index.html`, `pathname://${base}index.html`, './index.md',
      '#geometry', `${site}concepts/formats.html`]) {
      assert.equal(isSiteResource(href, site), true);
      assert.deepEqual(linkTargetProps(href, site), { target: '_self', rel: undefined });
      assert.throws(() => verifyLinkTarget({ href, target: '_blank' }, site), /current tab/);
      verifyLinkTarget({ href }, site);
    }
  }
});
test('external sites use safe new-tab links and unsafe generated targets fail verification', () => {
  for (const href of ['https://github.com/longitude-one', 'https://www.iso.org/standard/123.html', '//www.ogc.org/']) {
    const site = 'https://docs.example.org/';
    assert.equal(isSiteResource(href, site), false);
    const props = linkTargetProps(href, site);
    assert.deepEqual(props, { target: '_blank', rel: 'noopener noreferrer' });
    verifyLinkTarget({ href, ...props }, site);
    assert.throws(() => verifyLinkTarget({ href, target: '_blank', rel: 'noopener' }, site), /safe rel/);
  }
});
