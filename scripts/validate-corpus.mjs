import { readdir, readFile, writeFile, lstat, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { TextDecoder } from 'node:util';
import { load } from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { parse } from 'parse5';
import { isPublicResource, isRuntimeResource } from './publication-files.mjs';
import { baseUrl, siteUrl } from './site-settings.mjs';
import { verifyNavigation } from './verify-navigation.mjs';
import { verifyLegalNotice, recordLegalPublication } from './verify-legal-notice.mjs';
import { verifyResources } from './verify-resources.mjs';
import { validatePathComponent, validateMdxSyntax } from './export-markdown.mjs';

// These are application pages, not documentation identities.
export const infrastructureHtml = ['404.html', 'search.html'];
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
function walk(node, visit) {
  visit(node);
  for (const child of node.children || node.childNodes || []) walk(child, visit);
}
export async function corpusFiles(directory, prefix = '') {
  const result = [];
  for (const name of (await readdir(directory)).sort()) {
    const relative = prefix + name;
    const entry = await lstat(path.join(directory, name));
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are forbidden: ${relative}`);
    if (entry.isDirectory()) result.push(...await corpusFiles(path.join(directory, name), `${relative}/`));
    else if (entry.isFile()) result.push(relative);
    else throw new Error(`Expected regular publication file: ${relative}`);
  }
  return result.sort();
}

export async function assembleManifest(root, build, metadataDirectory = path.join(root, '.publication-metadata')) {
  await mkdir(metadataDirectory, { recursive: true });
  await copyFile(path.join(root, '.generated-markdown/asset-manifest.json'), path.join(metadataDirectory, 'asset-manifest.json'));
  // Expected identities come from generation, never from discovering final HTML.
  const markdown = (await corpusFiles(path.join(root, '.generated-markdown'))).filter((file) => file.endsWith('.md'));
  const assets = JSON.parse(await readFile(path.join(metadataDirectory, 'asset-manifest.json'), 'utf8'));
  const documents = markdown.map((md) => ({ source: `docs/${md}`, html: md.replace(/\.md$/, '.html'), markdown: md }));
  const mapping = documents.map(({ html, markdown: md }) => ({ html: `${baseUrl}${html}`, markdown: `${baseUrl}${md}` }));
  await writeFile(path.join(metadataDirectory, 'markdown-mapping.json'), serialize(mapping));
  const hashes = {};
  for (const file of await corpusFiles(build)) {
    hashes[file] = hash(await readFile(path.join(build, file)));
  }
  if (documents.some(({ markdown }) => markdown === 'legal-notice.md')) await recordLegalPublication(root, build, metadataDirectory);
  const manifest = { version: 1, documents, assets: Object.keys(assets).sort(), infrastructureHtml, hashes };
  await writeFile(path.join(metadataDirectory, 'documentation-manifest.json'), serialize(manifest));
  return manifest;
}

export function validateMarkdown(content, file) {
  if (content.startsWith('\uFEFF') || content.includes('\r')) throw new Error('Expected UTF-8 without BOM and LF line endings.');
  const tree = processor.parse(content);
  const frontmatter = tree.children[0];
  if (frontmatter?.type !== 'yaml') throw new Error('Missing YAML front matter.');
  const metadata = load(frontmatter.value);
  const expected = ['title', 'description', 'canonical_html', 'canonical_markdown'];
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object'
    || Object.keys(metadata).length !== expected.length || expected.some((key) => !Object.hasOwn(metadata, key))) {
    throw new Error('Publication metadata must contain only title, description, canonical_html and canonical_markdown.');
  }
  for (const key of expected) if (typeof metadata[key] !== 'string' || !metadata[key].trim()) throw new Error(`Invalid metadata field: ${key}`);
  if (metadata.canonical_html !== `./${path.posix.basename(file.replace(/\.md$/, '.html'))}`
    || metadata.canonical_markdown !== `./${path.posix.basename(file)}`) throw new Error('Invalid canonical representation metadata.');
  // GFM autolinks are valid publication syntax although the MDX parser treats them as JSX.
  let body = content.slice(frontmatter.position.end.offset);
  const autolinks = [];
  walk(tree, (node) => {
    if (node.type === 'link' && /^<[^>]+>$/.test(content.slice(node.position.start.offset, node.position.end.offset))) autolinks.push(node);
  });
  for (const node of autolinks.sort((a, b) => b.position.start.offset - a.position.start.offset)) {
    const start = node.position.start.offset - frontmatter.position.end.offset;
    const end = node.position.end.offset - frontmatter.position.end.offset;
    body = body.slice(0, start) + 'autolink' + body.slice(end);
  }
  validateMdxSyntax(body);
  walk(tree, (node) => {
    if (node.type === 'html') throw new Error(`Raw HTML is forbidden at ${node.position.start.line}:${node.position.start.column}.`);
    if (node.type !== 'code') return;
    const lines = content.slice(node.position.start.offset, node.position.end.offset).split('\n');
    const opening = lines[0].trimStart().match(/^(`{3,}|~{3,})/);
    if (!opening) return;
    const closing = lines.at(-1).replace(/^(?:\s*> ?)+/, '').trim().match(/^(`{3,}|~{3,})$/);
    if (!closing || closing[1][0] !== opening[1][0] || closing[1].length < opening[1].length) throw new Error(`Unclosed code fence at ${node.position.start.line}.`);
  });
  return tree;
}

export async function lintMarkdown(root, build, files) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs'),
      '--config', path.join(root, '.markdownlint-generated.jsonc'), ...files], { cwd: build, env: process.env });
    let output = '';
    child.stdout.on('data', (bytes) => { output += bytes; });
    child.stderr.on('data', (bytes) => { output += bytes; });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      const error = new Error(output.trim());
      error.diagnostics = output.split('\n').flatMap((line) => {
        const match = line.match(/^(.+?):(\d+)(?::(\d+))? (?:error|warning) (MD\d+)[^ ]* (.*)$/);
        return match ? [{ file: `docs/${match[1]}`, line: Number(match[2]), column: Number(match[3] || 1), rule: `markdownlint/${match[4]}`, message: match[5] }] : [];
      });
      reject(error);
    });
  });
}

export async function validateCorpus(root, build, { lint = lintMarkdown, resources = verifyResources, metadataDirectory = path.join(root, '.publication-metadata'), legal = verifyLegalNotice, navigation = verifyNavigation } = {}) {
  const errors = [];
  const warnings = [];
  const add = (file, rule, error) => {
    if (error.diagnostics?.length) { errors.push(...error.diagnostics); return; }
    const message = error.message || String(error);
    const location = message.match(/(?:docs\/|build\/|public\/)([^:\n]+):(\d+):(\d+):/);
    const position = error.line ? { line: error.line, column: error.column || 1 } : {};
    errors.push({ file: location ? `docs/${location[1]}` : error.line && file.endsWith('.md') ? `docs/${file}` : file, rule, message,
      ...(location ? { line: Number(location[2]), column: Number(location[3]) } : position) });
  };
  const check = async (file, rule, operation) => { try { return await operation(); } catch (error) { add(file, rule, error); } };
  const files = await check('', 'filesystem', () => corpusFiles(build)) || [];
  const manifest = await check('documentation-manifest.json', 'manifest', async () => {
    const value = JSON.parse(await readFile(path.join(metadataDirectory, 'documentation-manifest.json'), 'utf8'));
    if (value.version !== 1 || !Array.isArray(value.documents) || !Array.isArray(value.assets)
      || !value.documents.every((doc) => doc && ['source', 'html', 'markdown'].every((key) => typeof doc[key] === 'string'))
      || !value.assets.every((asset) => typeof asset === 'string')
      || !value.hashes || typeof value.hashes !== 'object' || Array.isArray(value.hashes)
      || Object.values(value.hashes).some((digest) => typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
      || JSON.stringify(value.infrastructureHtml) !== JSON.stringify(infrastructureHtml)) throw new Error('Unsupported documentation manifest schema.');
    return value;
  });
  const markdown = files.filter((file) => /\.md$/i.test(file));
  const references = new Set();
  const htmlDocuments = new Set(manifest?.documents?.map((doc) => doc.html));
  for (const file of files.filter((name) => /\.(?:html|md)$/i.test(name))) {
    await check(file, 'portable-path', () => file.split('/').forEach((component) => validatePathComponent(component, file)));
    await check(file, 'publication-profile', async () => {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path.join(build, file)));
      // Inspect serialized content as well as decoded HTML text/attributes below.
      const leakage = /(?:\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/|\/private\/tmp\/|\/tmp\/|\/(?:private\/)?var\/(?:folders|tmp)\/|[A-Za-z]:[\\/]Users[\\/]|\.publication-staging-|\.generated-markdown|\.docusaurus\/)/;
      if (leakage.test(content)) throw new Error('Machine-specific filesystem or intermediate build path leaked into publication.');
      if (file.endsWith('.md')) {
        const tree = validateMarkdown(content, file);
        walk(tree, (node) => { if (node.value && leakage.test(node.value)) throw new Error('Decoded Markdown exposes a local filesystem path.'); });
        // Compare fence identifiers to the source AST, never HTML/Markdown bodies.
        try {
          const source = processor.parse(await readFile(path.join(root, 'docs', file), 'utf8'));
          const known = []; const generated = [];
          walk(source, (node) => { if (node.type === 'code') known.push(node.lang); });
          walk(tree, (node) => { if (node.type === 'code') generated.push(node.lang); });
          for (const [index, language] of known.entries()) {
            if (language && generated[index] !== language) throw new Error(`Code fence ${index + 1} lost its source language or format identifier: ${language}`);
          }
        } catch (error) { if (error.code !== 'ENOENT') throw error; }

        const used = new Set();
        walk(tree, (node) => { if (['linkReference', 'imageReference'].includes(node.type)) used.add(node.identifier); });
        walk(tree, (node) => {
          if ((['link', 'image'].includes(node.type) || (node.type === 'definition' && used.has(node.identifier))) && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(node.url)) {
            references.add(path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(node.url.split(/[?#]/)[0]))));
          }
        });
      } else {
        walk(parse(content), (node) => {
          if (node.value && leakage.test(node.value)) throw new Error('Decoded HTML exposes a local filesystem path.');
          const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
          for (const value of Object.values(attrs)) if (leakage.test(value)) throw new Error('HTML attribute exposes a local filesystem path.');
          for (const attribute of ['href', 'src']) {
            if (!attrs[attribute]) continue;
            const target = new URL(attrs[attribute], `${siteUrl}${baseUrl}${file}`);
            if (target.origin !== new URL(siteUrl).origin) continue;
            if (!target.pathname.startsWith(baseUrl)) throw new Error(`HTML target escapes publication base: ${attrs[attribute]}`);
            const local = decodeURIComponent(target.pathname.slice(baseUrl.length));
            if (leakage.test(`/${local}`)) throw new Error('HTML URL exposes a local filesystem path.');
            references.add(local);
            if (!htmlDocuments.has(file)) continue;
            if (/\.md$/i.test(local)) {
              const alternate = attrs.rel === 'alternate' && attrs.type === 'text/markdown';
              if (!alternate || !['a', 'link'].includes(node.tagName)) throw new Error(`Forbidden HTML link into Markdown: ${attrs[attribute]}`);
            }
            if (attribute === 'href' && node.tagName === 'a'
              && (!path.posix.extname(local) || local.endsWith('/')) && !attrs.href.startsWith('#')) {
              throw new Error(`Directory-style HTML document target: ${attrs.href}`);
            }
          }
        });
      }
    });
  }
  if (manifest) {
    const declared = new Set([...manifest.documents.flatMap(({ html, markdown: md }) => [html, md]), ...infrastructureHtml]);
    if (declared.size !== manifest.documents.length * 2 + infrastructureHtml.length) add('documentation-manifest.json', 'mapping', new Error('Duplicate document representation identity.'));
    for (const document of manifest.documents) {
      if (document.html !== document.markdown?.replace(/\.md$/, '.html') || document.source !== `docs/${document.markdown}`) {
        add('documentation-manifest.json', 'mapping', new Error('Invalid one-to-one representation mapping.'));
      }
      for (const name of [document.html, document.markdown]) if (!Object.hasOwn(manifest.hashes, name)) add(name, 'integrity', new Error('Representation hash is missing.'));
    }
    for (const file of files.filter((name) => /\.(html|md)$/i.test(name))) {
      if (!declared.has(file)) add(file, 'unexpected-document', new Error('Generated document is not declared in the manifest.'));
    }
    const actualAssets = files.filter((name) => name.startsWith('assets/') && !isRuntimeResource(name));
    // Docusaurus bundles live under assets/js and assets/css; shared assets are declared by the dedicated manifest.
    const assetManifest = await check('asset-manifest.json', 'assets', async () => JSON.parse(await readFile(path.join(metadataDirectory, 'asset-manifest.json'), 'utf8')));
    if (assetManifest) {
      if (JSON.stringify(manifest.assets) !== JSON.stringify(Object.keys(assetManifest).sort())) add('documentation-manifest.json', 'assets', new Error('Shared asset manifests disagree.'));
      for (const file of actualAssets) if (!Object.hasOwn(assetManifest, file)) add(file, 'assets', new Error('Undeclared shared asset.'));
    }
    for (const file of manifest.assets) {
      if (!Object.hasOwn(manifest.hashes, file)) add(file, 'integrity', new Error('Shared asset hash is missing.'));
      if (!references.has(file)) warnings.push({ file, rule: 'orphaned-asset', message: 'Shared asset is not referenced by generated documentation.' });
    }
    for (const file of files) {
      if (!isPublicResource(file, manifest.assets)) add(file, 'internal-resource', new Error('Resource is not permitted in the public corpus.'));
    }
    for (const file of files) if (!Object.hasOwn(manifest.hashes, file)) {
      add(file, 'integrity', new Error('Publication file was added after assembly.'));
    }
    for (const [file, expected] of Object.entries(manifest.hashes)) {
      await check(file, 'integrity', async () => {
        if (!files.includes(file)) throw new Error('Missing manifest file (case-sensitive).');
        if (hash(await readFile(path.join(build, file))) !== expected) throw new Error('SHA-256 differs from assembled manifest.');
      });
    }
  }
  await check('', 'markdownlint', () => lint(root, build, markdown));
  await check('', 'resources', () => resources(root, build, { writeMapping: false, metadataDirectory }));
  await check('legal-notice.md', 'legal-notice', () => legal(root, build, metadataDirectory));
  await check('', 'navigation', () => navigation(root, build, metadataDirectory));
  const sort = (a, b) => `${a.file}\0${a.rule}\0${a.message}`.localeCompare(`${b.file}\0${b.rule}\0${b.message}`, 'en');
  errors.sort(sort); warnings.sort(sort);
  return { status: errors.length ? 'failed' : 'passed', errors, warnings };
}

export function formatReport(report) {
  return [`Documentation corpus: ${report.status}; ${report.errors.length} errors, ${report.warnings.length} warnings.`,
    ...['errors', 'warnings'].flatMap((kind) => report[kind].map(({ file, rule, message }) => `${kind === 'errors' ? 'ERROR' : 'WARNING'} ${file} [${rule}]: ${message}`))].join('\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const index = process.argv.indexOf('--build-directory');
  const build = index < 0 ? path.join(root, 'public') : path.resolve(process.argv[index + 1]);
  const metadataIndex = process.argv.indexOf('--metadata-directory');
  const metadataDirectory = metadataIndex < 0 ? path.join(root, '.publication-metadata') : path.resolve(process.argv[metadataIndex + 1]);
  let report;
  try {
    if (process.argv.includes('--assemble')) await assembleManifest(root, build, metadataDirectory);
    report = await validateCorpus(root, build, { metadataDirectory });
  } catch (error) {
    report = { status: 'failed', errors: [{ file: '', rule: 'assembly', message: error.message }], warnings: [] };
  }
  const reportIndex = process.argv.indexOf('--report-file');
  const reportFile = reportIndex < 0 ? path.join(root, '.publication-validation.json') : path.resolve(process.argv[reportIndex + 1]);
  await writeFile(reportFile, serialize(report));
  console.log(formatReport(report));
  if (process.env.GITHUB_ACTIONS) for (const { file, rule, message, line, column } of report.errors) {
    const escape = (value) => String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A').replaceAll(',', '%2C');
    console.log(`::error${file.startsWith('docs/') ? ` file=${escape(file)}${line ? `,line=${line},col=${column}` : ''}` : ''}::${escape(`${rule}: ${message}`)}`);
  }
  if (report.errors.length) process.exitCode = 1;
}
