import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import remarkHomeMarkdownLink from '../scripts/remark-home-markdown-link.mjs';
import { baseUrl } from '../scripts/site-settings.mjs';

const execute = promisify(execFile);

test('HTML home Markdown link is generated from the source path without changing other documents', () => {
  const docsDirectory = path.join(process.cwd(), 'docs');
  const transform = remarkHomeMarkdownLink({ docsDirectory });
  const home = { children: [] };
  transform(home, { path: path.join(docsDirectory, 'index.md') });
  assert.equal(home.children[0].children[0].url, `pathname://${baseUrl}markdown/index.md`);
  const other = { children: [] };
  transform(other, { path: path.join(docsDirectory, 'shared/index.md') });
  assert.deepEqual(other.children, []);
});

for (const development of [false, true]) {
  test(`${development ? 'development' : 'default'} configuration keeps routes and notices consistent`, async () => {
    const { stdout } = await execute(process.execPath, ['--input-type=module', '-e', `
      import config from './docusaurus.config.js';
      import plugin from './scripts/remark-base-url.mjs';
      const tree = { children: [{ attributes: [
        { name: 'href', value: '/markdown/index.md' },
        { name: 'href', value: 'https://example.com/' },
        { name: 'href', value: '//example.com/' },
      ] }] };
      plugin()(tree);
      console.log(JSON.stringify({ config, attributes: tree.children[0].attributes }));
    `], { env: { ...process.env, DOCUSAURUS_DEPLOYMENT: development ? 'development' : '' } });
    const { config, attributes } = JSON.parse(stdout);
    assert.equal(config.baseUrl, development ? '/spatial-docs/' : '/');
    assert.equal(attributes[0].value, `${config.baseUrl}markdown/index.md`);
    assert.equal(attributes[1].value, 'https://example.com/');
    assert.equal(attributes[2].value, '//example.com/');
    if (development) {
      assert.match(config.title, /Development/);
      assert.match(config.themeConfig.announcementBar.content, /not the official LongitudeOne documentation/);
      assert.equal(config.themeConfig.announcementBar.isCloseable, false);
    } else {
      assert.equal(config.themeConfig.announcementBar, undefined);
    }
  });
}
