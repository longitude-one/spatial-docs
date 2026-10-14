import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {once} from 'node:events';
import path from 'node:path';
import os from 'node:os';
import {publicationServer} from '../scripts/serve-publication.mjs';

test('publication preview serves exact files, preserves MIME types and rejects invalid requests', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'publication-preview-'));
  await writeFile(path.join(directory, 'index.html'), '<h1>Home</h1>');
  await writeFile(path.join(directory, 'index.md'), '# Home');
  await writeFile(path.join(directory, 'app.js'), 'console.log("Home");');
  const server = publicationServer(directory, '/preview/');
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, {recursive: true, force: true});
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const [filename, type] of [['index.html', 'text/html'], ['index.md', 'text/markdown'], ['app.js', 'text/javascript']]) {
    const response = await fetch(`${origin}/preview/${filename}?download=1`, {redirect: 'manual'});
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), new RegExp(type));
    assert.equal(response.headers.get('location'), null);
  }
  const head = await fetch(`${origin}/preview/index.md`, {method: 'HEAD'});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('content-length'), '6');
  for (const target of ['/index.md', '/preview/missing.html', '/preview/index', '/preview/%', '/preview/%2e%2e%2findex.md']) {
    assert.equal((await fetch(`${origin}${target}`, {redirect: 'manual'})).status, 404);
  }
  const unsupported = await fetch(`${origin}/preview/index.md`, {method: 'POST'});
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.get('allow'), 'GET, HEAD');
  const home = await fetch(`${origin}/preview/`, {redirect: 'manual'});
  assert.equal(home.headers.get('location'), '/preview/index.html');
});
