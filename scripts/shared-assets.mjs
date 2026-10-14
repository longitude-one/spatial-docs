import path from 'node:path';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';
import yaml from 'js-yaml';
import sax from 'sax';

const allowed = new Set(['svg', 'png', 'jpg', 'jpeg', 'webp', 'json', 'yaml', 'yml', 'xml', 'txt', 'csv', 'wkt', 'geojson', 'pdf', 'sql', 'php']);
const reserved = /^(?:aux|con|nul|prn|com[1-9]|lpt[1-9])(?:\.|$)/;
function portable(component) {
  return /^[a-z0-9_-][a-z0-9._-]*$/.test(component) && !component.endsWith('.') && !reserved.test(component);
}
function walk(node, callback) {
  callback(node);
  for (const child of node.children || []) walk(child, callback);
}
function validateXml(text, svg) {
  const parser = sax.parser(true, { xmlns: true });
  let root;
  let depth = 0;
  let roots = 0;
  parser.onclosetag = () => { depth -= 1; };
  parser.ondoctype = () => { throw new Error('XML document types are forbidden.'); };
  parser.onprocessinginstruction = (instruction) => {
    if (instruction.name.toLowerCase() !== 'xml') throw new Error('XML processing instructions are forbidden.');
  };
  parser.onopentag = (node) => {
    if (depth++ === 0 && ++roots > 1) throw new Error('XML must have exactly one root element.');
    root ??= node;
    if (!svg) return;
    if (node.uri && node.uri !== 'http://www.w3.org/2000/svg') throw new Error(`Unsafe SVG namespace: ${node.uri}`);
    if (['mpath', 'discard', 'script', 'foreignobject', 'iframe', 'object', 'embed', 'animate', 'animatemotion', 'animatetransform', 'set', 'style'].includes(node.local.toLowerCase())) {
      throw new Error(`Unsafe SVG element: ${node.name}`);
    }
    for (const attribute of Object.values(node.attributes)) {
      const name = attribute.local.toLowerCase();
      const value = attribute.value.trim();
      if (value.includes('\\') || name.startsWith('on') || name === 'base' || name === 'style' || /(?:javascript|data|vbscript)\s*:/i.test(value)
        || (['href', 'src'].includes(name) && !value.startsWith('#'))
        || /url\s*\(\s*['"]?(?!#)/i.test(value) || /@import|expression\s*\(/i.test(value)) {
        throw new Error(`Unsafe SVG attribute: ${attribute.name}`);
      }
    }
  };
  parser.write(text).close();
  if (!root || (svg && (root.local !== 'svg' || (root.uri && root.uri !== 'http://www.w3.org/2000/svg')))) {
    throw new Error(svg ? 'Expected an SVG root element.' : 'Expected an XML root element.');
  }
}
function validateContent(bytes, type) {
  const starts = (signature) => bytes.subarray(0, signature.length).equals(Buffer.from(signature));
  if (type === 'png') {
    if (!starts([137, 80, 78, 71, 13, 10, 26, 10]) || bytes.length < 24 || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG signature/header.');
  } else if (type === 'jpg' || type === 'jpeg') {
    if (!starts([255, 216, 255]) || bytes.length < 4 || !bytes.subarray(-2).equals(Buffer.from([255, 217]))) throw new Error('Invalid JPEG signature.');
  } else if (type === 'webp') {
    if (bytes.length < 16 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Invalid WebP signature.');
  } else if (type === 'pdf') {
    if (!starts('%PDF-') || !bytes.subarray(-1024).includes(Buffer.from('%%EOF'))) throw new Error('Invalid PDF signature.');
  } else {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\0')) throw new Error('Text assets must not contain NUL bytes.');
    if (type === 'json' || type === 'geojson') JSON.parse(text);
    if (type === 'yaml' || type === 'yml') yaml.load(text);
    if (type === 'xml' || type === 'svg') validateXml(text, type === 'svg');
  }
}

export async function collectSharedAssets(rootDirectory) {
  const directory = path.join(rootDirectory, 'static', 'assets');
  const manifest = {};
  const seen = new Set();
  async function collect(current, relative = '') {
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error(`Shared asset symbolic links are forbidden: assets/${relative}`);
    if (!stat.isDirectory()) throw new Error(`Expected shared asset directory: assets/${relative}`);
    const entries = (await readdir(current)).sort();
    for (const name of entries) {
      const local = relative ? `${relative}/${name}` : name;
      const identity = `assets/${local}`;
      if (seen.has(identity.toLowerCase())) throw new Error(`Shared asset published path collision: ${identity}`);
      seen.add(identity.toLowerCase());
      if (!portable(name)) throw new Error(`Shared asset paths must be lowercase and portable: ${identity}`);
      const source = path.join(current, name);
      const entry = await lstat(source);
      if (entry.isSymbolicLink()) throw new Error(`Shared asset symbolic links are forbidden: ${identity}`);
      if (entry.isDirectory()) { await collect(source, local); continue; }
      if (!entry.isFile()) throw new Error(`Shared asset must be a regular file: ${identity}`);
      const type = path.posix.extname(name).slice(1);
      if (!allowed.has(type)) throw new Error(`Unsupported shared asset type: ${identity}`);
      const bytes = await readFile(source);
      try { validateContent(bytes, type); } catch (error) { throw new Error(`Invalid shared asset ${identity}: ${error.message}`, { cause: error }); }
      manifest[identity] = { source: `static/${identity}`, sha256: createHash('sha256').update(bytes).digest('hex'), type };
    }
  }
  try {
    const staticStat = await lstat(path.join(rootDirectory, 'static'));
    if (staticStat.isSymbolicLink()) throw new Error('Shared asset static parent symbolic links are forbidden.');
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
  try { await collect(directory); } catch (error) {
    if (error.code === 'ENOENT' && error.path === directory) return {};
    throw error;
  }
  return Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export async function validateAssetReferences(documents, { staticDirectory, manifest, siteUrl, diagnosticPrefix = 'docs/' }) {
  try {
    if ((await lstat(staticDirectory)).isSymbolicLink()) throw new Error('Shared asset static parent symbolic links are forbidden.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const [sourcePath, { tree }] of documents) {
    const used = new Set();
    const images = new Set();
    walk(tree, (node) => { if (node.type === 'imageReference') images.add(node.identifier); });
    walk(tree, (node) => { if (node.type === 'linkReference' || node.type === 'imageReference') used.add(node.identifier); });
    const nodes = [];
    walk(tree, (node) => {
      if (['link', 'image'].includes(node.type) || (node.type === 'definition' && used.has(node.identifier))) nodes.push(node);
    });
    for (const node of nodes) {
      const target = node.url;
      const image = node.type === 'image' || (node.type === 'definition' && images.has(node.identifier));
      const fail = (reason) => {
        const position = node.position?.start;
        throw new Error(`${diagnosticPrefix}${sourcePath}${position ? `:${position.line}:${position.column}` : ''}: Invalid shared asset reference ${target}: ${reason}`);
      };
      if (/^data:/i.test(target.trim())) fail('Embedded data resources are forbidden.');
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) {
        if (siteUrl && new URL(target, siteUrl).origin === new URL(siteUrl).origin
          && (image || !/\.(?:md|html)(?:[?#]|$)/i.test(target))) fail('Local asset URLs must be relative.');
        continue;
      }
      if (target.startsWith('#')) continue;
      let pathname;
      try { pathname = decodeURIComponent(target.split(/[?#]/, 1)[0]); } catch { fail('Malformed percent encoding.'); }
      if (!pathname) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), pathname));
      // Documentation-page links are checked by the dedicated documentation validator.
      if (!image && /\.(?:md|html)$/i.test(pathname)) continue;
      if (!image && !path.posix.extname(pathname)) continue;
      if (pathname.startsWith('/') || pathname.includes('\\') || pathname.split('/').some((part) => part !== '.' && part !== '..' && !portable(part))) {
        fail('Asset paths must be relative, lowercase, portable and case-sensitive.');
      }
      if (!resolved.startsWith('assets/')) fail('Local resources must belong to the shared assets/ hierarchy.');
      if (!Object.hasOwn(manifest, resolved)) fail(`Missing shared asset: ${resolved}`);
      let current = staticDirectory;
      for (const component of resolved.split('/')) {
        const entries = await readdir(current);
        if (!entries.includes(component)) fail(`Missing case-sensitive asset path: ${resolved}`);
        current = path.join(current, component);
        if ((await lstat(current)).isSymbolicLink()) fail('Asset symbolic links are forbidden.');
      }
      if (!(await lstat(current)).isFile()) fail('Asset target must be a regular file.');
    }
  }
}
