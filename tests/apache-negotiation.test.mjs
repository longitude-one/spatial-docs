import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { installApacheConfiguration, apacheConfiguration } from '../scripts/apache-negotiation.mjs';

const enabled = process.env.APACHE_INTEGRATION === '1';
test('Apache configuration generation is deterministic', async () => {
  assert.equal(await apacheConfiguration(), await apacheConfiguration());
});

test('installs exactly the generated Apache configuration with public file permissions', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'apache-configuration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await installApacheConfiguration(root);
  assert.equal(await readFile(path.join(root, '.htaccess'), 'utf8'), await apacheConfiguration());
  assert.equal((await stat(path.join(root, '.htaccess'))).mode & 0o777, 0o644);
});

test('actual production .htaccess negotiates HTTP responses', { skip: !enabled, timeout: 30000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'apache-negotiation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'site');
  await mkdir(site);
  const files = {
    'index.html': '<h1>HTML home</h1>', 'index.md': '# Markdown home',
    'nested/geometry/point.html': '<h1>HTML point</h1>', 'nested/geometry/point.md': '# Markdown point',
    'nested/geometry/point.json': '{"unsupported":true}',
    'short.html': '<p>HTML</p>', 'short.md': '# Much longer Markdown representation for tie breaking',
    'missing.html': '<p>Missing pair</p>', 'missing.json': 'unrelated',
    'assets/index.html': '<p>Static directory index</p>', 'assets/extensionless': 'static extensionless asset', 'assets/file.txt': 'static text',
    'llms.txt': 'LLM index', 'llms-full.txt': 'Full LLM index', 'robots.txt': 'robots', 'sitemap.xml': '<xml/>',
  };
  for (const [name, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(site, name)), { recursive: true });
    await writeFile(path.join(site, name), content);
  }
  await installApacheConfiguration(site);
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const modules = process.env.APACHE_MODULES || (process.platform === 'darwin' ? '/usr/libexec/apache2' : '/usr/lib/apache2/modules');
  const binary = process.env.APACHE_HTTPD || (process.platform === 'darwin' ? '/usr/sbin/httpd' : '/usr/sbin/apache2');
  const { stdout: compiledModules } = await promisify(execFile)(binary, ['-l']);
  const modulesToLoad = ['mpm_prefork', 'unixd', 'authz_core', 'authz_host', 'mime', 'negotiation', 'dir', 'rewrite', 'headers']
    .filter((name) => !compiledModules.includes(`mod_${name}.c`));
  const config = path.join(root, 'httpd.conf');
  await writeFile(config, `ServerRoot "${root}"
PidFile "${root}/httpd.pid"
Listen 127.0.0.1:${port}
ServerName localhost
${modulesToLoad.map((name) => `LoadModule ${name}_module "${modules}/mod_${name}.so"`).join('\n')}
ErrorLog "${root}/error.log"
LogLevel warn
TypesConfig /dev/null
DocumentRoot "${site}"
<Directory "${site}">
  Require all granted
  AllowOverride FileInfo Options=MultiViews
  Options FollowSymLinks
  DirectoryIndex index.html
</Directory>
`);
  let stderr = '';
  const server = spawn(binary, ['-f', config, '-DFOREGROUND'], { detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
  server.stderr.on('data', (data) => { stderr += data; });
  server.on('error', (error) => { stderr += error.message; });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill('SIGTERM');
      await new Promise((resolve) => server.once('exit', resolve));
    }
  });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; ; attempt++) {
    try { await fetch(`${base}/robots.txt`); break; }
    catch {
      if (attempt === 50 || server.exitCode !== null) {
        let log = ''; try { log = await readFile(path.join(root, 'error.log'), 'utf8'); } catch {}
        assert.fail(`Apache did not start: ${stderr}\n${log}`);
      }
      await delay(50);
    }
  }
  async function request(uri, accept, expected, status = 200, negotiated = true) {
    // fetch supplies */* by default, so raw http is used for the absent header case.
    const { request: httpRequest } = await import('node:http');
    const response = await new Promise((resolve, reject) => {
      const req = httpRequest(`${base}${uri}`, { headers: accept === undefined ? {} : { Accept: accept } }, (res) => {
        let body = ''; res.setEncoding('utf8'); res.on('data', (data) => { body += data; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
      req.on('error', reject); req.end();
    });
    assert.equal(response.status, status, `${uri} Accept: ${accept}: ${response.body}\n${await readFile(path.join(root, 'error.log'), 'utf8')}`);
    assert.equal(response.headers.location, undefined, 'selection must not redirect');
    const varies = (response.headers.vary || '').toLowerCase().split(/,\s*/).includes('accept');
    assert.equal(varies, negotiated, `Vary for ${uri} Accept: ${accept}`);
    if (status === 200 && expected) {
      const extension = expected === 'html' ? '.html' : '.md';
      assert.match(response.headers['content-type'], new RegExp(`^text/${expected}(?:;|$)`));
      const physical = uri.endsWith(extension) ? uri : `${uri}${extension}`;
      assert.equal(response.body, files[physical.slice(1)]);
    }
    return response;
  }
  for (const uri of ['/index', '/nested/geometry/point', '/short']) {
    for (const [accept, expected, status] of [
      [undefined, 'html'], ['', 'html'], ['*/*', 'html'], ['text/*', 'html'],
      ['text/html', 'html'], ['text/markdown', 'markdown'],
      ['text/html, text/markdown', 'html'], ['text/markdown, text/html', 'html'],
      ['text/markdown;q=1.0, text/html;q=0.8', 'markdown'],
      ['text/html;q=1.0, text/markdown;q=0.8', 'html'],
      ['text/html;q=0.800, text/markdown;q=0.801', 'markdown'],
      ['text/markdown;q=0.800, text/html;q=0.801', 'html'],
      ['text/html;q=0.5, text/markdown;q=0.500', 'html'],
      ['text/html;q=0, text/markdown', 'markdown'],
      ['text/markdown;q=0, */*;q=1', 'html'],
      ['text/html;q=0, text/*;q=0.8', 'markdown'],
      ['text/*;q=0, */*;q=1', null, 406],
      ['text/html;q=0, text/markdown;q=0', null, 406],
      ['application/json', null, 406], ['*/*;q=0', null, 406],
      ['TEXT/MARKDOWN; Q=0.9, text/html;q=0.1', 'markdown'],
      ['text/html-extra, text/markdown', 'markdown'],
      ['text/html;q=0.080, text/markdown;q=0.09', 'markdown'],
      ['text/html;q=0.8, text/markdown;charset=utf-8;q=0.9', 'markdown'],
      ['text/html;charset=iso-8859-1', null, 406],
      ['text/html;unknown=value', null, 406],
      ['text/markdown;q=1, text/markdown;charset=utf-8;q=0.5, text/html;q=0.8', 'html'],
    ]) await request(uri, accept, expected, status);
    await request(`${uri}.html`, 'text/markdown', 'html', 200, false);
    await request(`${uri}.md`, 'text/html', 'markdown', 200, false);
    await request(`${uri}.html`, '*/*;q=0', 'html', 200, false);
    await request(`${uri}.md`, '*/*;q=0', 'markdown', 200, false);
  }
  for (const name of ['assets/extensionless', 'assets/file.txt', 'llms.txt', 'llms-full.txt', 'robots.txt', 'sitemap.xml', 'nested/geometry/point.json']) {
    const response = await request(`/${name}`, 'application/json', null, 200, false);
    assert.equal(response.body, files[name]);
  }
  for (const uri of ['/missing', '/absent', '/assets/absent']) await request(uri, 'text/markdown', null, 404, false);
  assert.equal((await request('/assets/', 'text/markdown', null, 200, false)).body, files['assets/index.html']);
});
