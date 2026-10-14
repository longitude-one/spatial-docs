import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const types = {
  '.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.pdf': 'application/pdf',
};

export function publicationServer(buildDirectory, baseUrl) {
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, {Allow: 'GET, HEAD'}).end();
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === baseUrl) {
        response.writeHead(302, {Location: `${baseUrl}index.html`}).end();
        return;
      }
      const relative = pathname.slice(baseUrl.length);
      if (!pathname.startsWith(baseUrl) || !relative || relative.split('/').some((part) => ['..', '.', ''].includes(part))
        || relative.includes('\\') || relative.includes('\0')) {
        response.writeHead(404).end();
        return;
      }
      const content = await readFile(path.join(buildDirectory, relative));
      response.writeHead(200, {'Content-Type': types[path.extname(relative)] || 'application/octet-stream', 'Content-Length': content.length});
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      response.writeHead(['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code) || error instanceof URIError ? 404 : 500).end();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const root = args[0] && !args[0].startsWith('--') ? path.resolve(args.shift()) : process.cwd();
  const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const host = option('--host', 'localhost');
  const port = Number(option('--port', '3000'));
  const {default: config} = await import(pathToFileURL(path.join(root, 'docusaurus.config.js')));
  const server = publicationServer(path.join(root, 'build'), config.baseUrl);
  server.listen(port, host, () => console.log(`Serving published resources at http://${host}:${port}${config.baseUrl}index.html`));
}
