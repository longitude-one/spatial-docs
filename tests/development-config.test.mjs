import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);

for (const development of [false, true]) {
  test(`${development ? 'development' : 'default'} configuration keeps routes and notices consistent`, async () => {
    const { stdout } = await execute(process.execPath, ['--input-type=module', '-e', `
      import config from './docusaurus.config.js';
      import plugin from './scripts/remark-base-url.mjs';
      const tree = { children: [{ attributes: [
        { name: 'href', value: '/index.md' },
        { name: 'href', value: 'https://example.com/' },
        { name: 'href', value: '//example.com/' },
      ] }] };
      plugin()(tree);
      console.log(JSON.stringify({ config, attributes: tree.children[0].attributes }));
    `], { env: { ...process.env, DOCUSAURUS_DEPLOYMENT: development ? 'development' : '', URL_PRODUCTION: 'https://official.example/docs/' } });
    const { config, attributes } = JSON.parse(stdout);
    assert.deepEqual(config.themeConfig.colorMode, {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    });
    assert.equal(config.baseUrl, development ? '/spatial-docs/' : '/');
    assert.equal(attributes[0].value, `${config.baseUrl}index.md`);
    assert.equal(attributes[1].value, 'https://example.com/');
    assert.equal(attributes[2].value, '//example.com/');
    if (development) {
      assert.match(config.title, /Development/);
      assert.match(config.themeConfig.announcementBar.content, /not the official LongitudeOne documentation/);
      assert.equal(config.themeConfig.announcementBar.isCloseable, false);
      assert.match(config.themeConfig.announcementBar.content, /href="https:\/\/official.example\/docs\/"/);
    } else {
      assert.equal(config.themeConfig.announcementBar, undefined);
    }
  });
}

for (const value of ['', 'not a url', 'javascript:alert(1)', 'https://user:secret@example.com']) {
  test(`development configuration rejects invalid official URL ${JSON.stringify(value)}`, async () => {
    await assert.rejects(execute(process.execPath, ['--input-type=module', '-e', "import './docusaurus.config.js'"], {
      env: { ...process.env, DOCUSAURUS_DEPLOYMENT: 'development', URL_PRODUCTION: value },
    }), /URL_PRODUCTION/);
  });
}
