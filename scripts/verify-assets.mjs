import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'parse5';
import { collectSharedAssets, validateAssetReferences } from './shared-assets.mjs';

export async function verifyPublishedAssets(root, build, documents, baseUrl, siteUrl = 'https://asset-check.invalid', metadataDirectory = path.join(root, '.publication-metadata')) {
  const expected = await collectSharedAssets(root);
  const actual = JSON.parse(await readFile(path.join(metadataDirectory, 'asset-manifest.json'), 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Published asset manifest differs from source assets.');
  for (const [published, { sha256 }] of Object.entries(expected)) {
    let current = build;
    for (const component of published.split('/')) {
      current = path.join(current, component);
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Published asset symbolic links are forbidden: ${published}`);
    }
    const bytes = await readFile(path.join(build, published));
    if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw new Error(`Published asset bytes differ: ${published}`);
  }
  await validateAssetReferences(documents, { staticDirectory: build, manifest: actual, siteUrl, diagnosticPrefix: 'build/' });
  for (const [sourcePath, { tree }] of documents) {
    const references = new Set();
    const definitions = new Map();
    const used = new Set();
    function markdown(node) {
      if (node.type === 'definition') definitions.set(node.identifier, node.url);
      if (['imageReference', 'linkReference'].includes(node.type)) used.add(node.identifier);
      if (['image', 'link'].includes(node.type)) references.add(node.url);
      for (const child of node.children || []) markdown(child);
    }
    markdown(tree);
    for (const identifier of used) references.add(definitions.get(identifier));
    const assets = new Set([...references].filter(Boolean).filter((url) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url))
      .map((url) => path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), decodeURIComponent(url.split(/[?#]/)[0]))))
      .filter((url) => Object.hasOwn(actual, url)));
    const found = new Set();
    const html = parse(await readFile(path.join(build, sourcePath.replace(/\.md$/, '.html')), 'utf8'));
    function inspect(node, inArticle = false) {
      inArticle ||= node.tagName === 'article';
      for (const attribute of node.attrs || []) {
        if (!['href', 'src'].includes(attribute.name)) continue;
        const url = new URL(attribute.value, `${siteUrl}${baseUrl}${sourcePath.replace(/\.md$/, '.html')}`);
        if (url.origin !== new URL(siteUrl).origin) continue;
        const published = decodeURIComponent(url.pathname.slice(baseUrl.length));
        if (url.pathname.startsWith(baseUrl) && Object.hasOwn(actual, published)) found.add(published);
        else if (inArticle && (node.tagName === 'img' || (node.tagName === 'a'
          && path.posix.extname(url.pathname) && !/\.(?:md|html)$/i.test(url.pathname)))) {
          throw new Error(`${sourcePath}: HTML references an unknown shared asset ${attribute.value}`);
        }
      }
      for (const child of node.childNodes || []) inspect(child, inArticle);
    }
    inspect(html);
    for (const asset of assets) if (!found.has(asset)) throw new Error(`${sourcePath}: HTML does not reference the shared Markdown asset ${asset}`);
  }
}
