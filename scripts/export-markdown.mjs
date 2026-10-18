import { readdir, readFile, mkdir, writeFile, rm, rename, mkdtemp, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dump, load } from 'js-yaml';
import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { baseUrl, siteUrl } from './site-settings.mjs';
import { documentationAnchors, processDocumentationLinks } from './documentation-links.mjs';
import { resolveLibraries, statusFor, markdownStatus, writeManifest } from './library-versions.mjs';
import { collectSharedAssets, validateAssetReferences } from './shared-assets.mjs';
import { generateLlmsIndex, verifyLlmsIndex } from './llms-index.mjs';
import { generateLlmsFull } from './llms-full.mjs';
import { publicationUrls } from './llms-config.mjs';
import { appendLibraryLandingNavigation } from './library-landing-pages.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDirectory = path.join(rootDirectory, 'docs');
const staticDirectory = path.join(rootDirectory, 'static');
const markdownDirectory = path.join(rootDirectory, '.generated-markdown');
const buildArgument = process.argv.indexOf('--build-directory');
const buildDirectory = buildArgument < 0 ? path.join(rootDirectory, 'public') : path.resolve(process.argv[buildArgument + 1]);

const requiredContent = [
  {
    html: 'index.html',
    markdown: 'index.md',
    href: './index.md',
    text: 'Reference and contributor documentation for the LongitudeOne Spatial ecosystem.',
  },
  {
    html: 'shared/markdown-export-example.html',
    markdown: 'shared/markdown-export-example.md',
    text: 'The coordinate sequence is retained in the Markdown counterpart.',
  },
];

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ['yaml'])
  .use(remarkStringify, {
    bullet: '-',
    closeAtx: false,
    emphasis: '*',
    fences: true,
    incrementListMarker: false,
    listItemIndent: 'one',
    rule: '-',
    setext: false,
    strong: '*',
  });

const mdxProcessor = unified()
  .use(remarkParse)
  .use(remarkMdx);

const reservedPathComponents = new Set([
  'aux',
  'con',
  'nul',
  'prn',
  ...Array.from({ length: 9 }, (_, index) => `com${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `lpt${index + 1}`),
]);

export function validatePathComponent(component, sourcePath) {
  if (!/^[a-z0-9_-][a-z0-9._-]*$/.test(component)
    || component.endsWith('.')
    || reservedPathComponents.has(component.split('.')[0])) {
    throw new Error(`Unsupported documentation path: ${sourcePath}. Use lowercase, portable path names.`);
  }
}

async function findDocumentationFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    const relativePath = path.relative(docsDirectory, entryPath).split(path.sep).join('/');
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not supported in the documentation hierarchy: docs/${relativePath}.`);
    }
    const pathComponents = relativePath.split('/');
    pathComponents.forEach((component) => {
      validatePathComponent(component, relativePath);
    });
    if (entry.isDirectory()) {
      return findDocumentationFiles(entryPath);
    }
    if (entry.name.endsWith('.mdx')) {
      throw new Error(`Unsupported documentation source format: ${path.relative(rootDirectory, entryPath)}. Use .md files only.`);
    }

    return entry.name.endsWith('.md') ? [entryPath] : [];
  }));

  return nested.flat();
}

function removeComments(node) {
  if (!node.children) {
    return;
  }

  node.children = node.children.filter((child) => (
    child.type !== 'html' || !/^<!--[\s\S]*-->$/.test(child.value.trim())
  ));
  for (const child of node.children) {
    removeComments(child);
  }
  node.children = node.children.filter((child) => (
    !(child.type === 'paragraph' && child.children.length === 0)
  ));
}

export function validateMdxSyntax(body) {
  const tree = mdxProcessor.parse(body.replace(/<!--[\s\S]*?-->/g, ''));
  function inspect(node) {
    if (node.type === 'mdxjsEsm') {
      throw new Error('MDX imports and exports are not supported in documentation source files.');
    }
    if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') {
      throw new Error('MDX JavaScript expressions are not supported in documentation source files.');
    }
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      throw new Error('Raw HTML and JSX are not supported in documentation source files. Use portable Markdown only.');
    }
    for (const child of node.children || []) inspect(child);
  }
  inspect(tree);
}

function parseSourceDocument(content, sourcePath) {
  const source = content.replace(/^\uFEFF/, '');
  const tree = markdownProcessor.parse(source);
  const frontMatter = tree.children[0]?.type === 'yaml' ? tree.children.shift() : undefined;
  if (!frontMatter) {
    throw new Error(`${sourcePath} must start with YAML front matter containing title and description.`);
  }

  const metadata = load(frontMatter.value);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`${sourcePath} must have a YAML mapping as front matter.`);
  }
  if (Object.hasOwn(metadata, 'slug')) {
    throw new Error(`${sourcePath} must not define Docusaurus slug metadata.`);
  }
  for (const field of ['canonical_html', 'canonical_markdown']) {
    if (Object.hasOwn(metadata, field)) throw new Error(`${sourcePath}: representation metadata is exclusively build-managed.`);
  }
  for (const field of ['title', 'description']) {
    if (typeof metadata[field] !== 'string' || metadata[field].trim() === '') {
      throw new Error(`${sourcePath} must define a non-empty ${field} in front matter.`);
    }
  }

  validateMdxSyntax(source.slice(frontMatter.position.end.offset));
  removeComments(tree);
  const unsupportedHtml = [];
  function inspect(node) {
    if (node.type === 'html' && !/^<!--[\s\S]*-->$/.test(node.value.trim())) {
      unsupportedHtml.push(node.type);
    }
    if (node.type === 'link' || node.type === 'linkReference') {
      const labelText = (child) => child.value || (child.children || []).map(labelText).join('');
      const label = labelText(node);
      if (/^View (HTML|Markdown) version$/i.test(label.trim())) {
        throw new Error(`${sourcePath}: representation-switching links are exclusively build-managed.`);
      }
    }
    for (const child of node.children || []) inspect(child);
  }
  tree.children.forEach(inspect);
  if (unsupportedHtml.length > 0) {
    throw new Error('Raw HTML and JSX are not supported in documentation source files. Use portable Markdown only.');
  }

  return {
    tree,
    metadata,
  };
}

function htmlPathFor(markdownPath) {
  return markdownPath.replace(/\.md$/, '.html');
}

function publishedDocument(sourcePath, metadata, body, libraries) {
  const markdownPath = sourcePath;
  const htmlPath = htmlPathFor(markdownPath);
  const markdownName = path.basename(markdownPath);
  const htmlHref = `./${path.posix.basename(htmlPath)}`;
  const publishedMetadata = {
    title: metadata.title.trim(),
    description: metadata.description.trim(),
    canonical_html: htmlHref,
    canonical_markdown: `./${markdownName}`,
  };
  const frontMatter = dump(publishedMetadata, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  }).trimEnd();
  const htmlLink = `[View HTML version](${htmlHref})`;
  const info = statusFor(sourcePath, libraries);
  const status = info ? `${markdownStatus(info, sourcePath)}\n\n` : '';
  const content = body.trim() ? `${body.trimEnd()}\n` : '';
  return {
    markdownPath,
    htmlPath: `/${htmlPath}`,
    markdownUrl: `/${markdownPath}`,
    title: metadata.title.trim(),
    content: `---\n${frontMatter}\n---\n\n${htmlLink}\n\n${status}${content}`,
  };
}

function escapeMarkdownLabel(value) {
  return value.replace(/\s+/g, ' ').replace(/[\\[\]]/g, '\\$&');
}

async function promoteGeneratedOutput(stagingDirectory) {
  const destinations = [
    ['.', markdownDirectory],
  ];
  const backupDirectory = `${stagingDirectory}-backup`;
  await mkdir(backupDirectory);
  const backedUp = [];
  const promoted = [];
  try {
    for (const [, destination] of destinations) {
      try {
        await lstat(destination);
        const backup = path.join(backupDirectory, path.basename(destination));
        await rename(destination, backup);
        backedUp.push([backup, destination]);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    for (const [stagedName, destination] of destinations) {
      await rename(path.join(stagingDirectory, stagedName), destination);
      promoted.push(destination);
    }
  } catch (error) {
    await Promise.all(promoted.map((destination) => rm(destination, { recursive: true, force: true })));
    const rollbackErrors = [];
    for (const [backup, destination] of backedUp.reverse()) {
      try {
        await rename(backup, destination);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], 'Markdown promotion failed and the previous output could not be fully restored.');
    }
    await rm(backupDirectory, { recursive: true, force: true });
    throw error;
  }
  await rm(backupDirectory, { recursive: true, force: true });
}

async function pathsHaveSameFiles(left, right) {
  const leftEntries = await readdir(left, { withFileTypes: true });
  const rightEntries = await readdir(right, { withFileTypes: true });
  if (leftEntries.length !== rightEntries.length) return false;
  const rightByName = new Map(rightEntries.map((entry) => [entry.name, entry]));
  for (const leftEntry of leftEntries) {
    const rightEntry = rightByName.get(leftEntry.name);
    if (!rightEntry || leftEntry.isDirectory() !== rightEntry.isDirectory()) return false;
    const leftPath = path.join(left, leftEntry.name);
    const rightPath = path.join(right, leftEntry.name);
    if (leftEntry.isDirectory()) {
      if (!await pathsHaveSameFiles(leftPath, rightPath)) return false;
    } else if (!Buffer.from(await readFile(leftPath)).equals(await readFile(rightPath))) {
      return false;
    }
  }
  return true;
}

async function stagedOutputMatches(stagingDirectory) {
  try {
    return await pathsHaveSameFiles(stagingDirectory, markdownDirectory);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function exportMarkdown() {
  const sourceFiles = await findDocumentationFiles(docsDirectory);
  const generated = [];
  const documents = new Map();
  for (const sourceFile of sourceFiles.sort()) {
    const sourcePath = path.relative(docsDirectory, sourceFile).split(path.sep).join('/');
    const raw = await readFile(sourceFile, 'utf8');
    const { tree, metadata } = parseSourceDocument(raw, sourcePath);
    if (sourcePath.split('/').some((part) => part.startsWith('_'))
      || metadata.draft === true || metadata.draft === 'true'
      || metadata.unlisted === true || metadata.unlisted === 'true') {
      continue;
    }
    documents.set(sourcePath, { tree, metadata, anchors: documentationAnchors(tree, sourcePath) });
  }
  const assetManifest = await collectSharedAssets(rootDirectory);
  await processDocumentationLinks(documents, { staticDirectory, siteUrl });
  await validateAssetReferences(documents, { staticDirectory, manifest: assetManifest, siteUrl });
  try {
    await lstat(path.join(staticDirectory, 'asset-manifest.json'));
    throw new Error('Published path collision: static/asset-manifest.json conflicts with the generated asset manifest.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (process.argv.includes('--validate-assets')) {
    console.log(`Validated ${Object.keys(assetManifest).length} shared assets and their published documentation references.`);
    return;
  }
  const libraries = await resolveLibraries(docsDirectory);
  for (const [sourcePath, document] of documents) {
    appendLibraryLandingNavigation(document.tree, sourcePath, libraries);
    document.anchors = documentationAnchors(document.tree, sourcePath);
  }
  await processDocumentationLinks(documents, { staticDirectory, siteUrl });
  for (const [sourcePath, { tree, metadata }] of documents) {
    const body = markdownProcessor.stringify(tree).replace(/\r\n/g, '\n').replace(/\n*$/, '\n');
    const page = publishedDocument(sourcePath, metadata, body, libraries);
    if (generated.some(({ markdownPath, htmlPath }) => (
      markdownPath === page.markdownPath || htmlPath === page.htmlPath
    ))) {
      throw new Error(`Duplicate representation destination for ${sourcePath}.`);
    }
    generated.push(page);
  }

  await mkdir(staticDirectory, { recursive: true });
  const stagingDirectory = await mkdtemp(path.join(rootDirectory, '.generated-markdown-staging-'));
  try {
    await writeFile(path.join(stagingDirectory, 'asset-manifest.json'), `${JSON.stringify(assetManifest, null, 2)}\n`, { flag: 'wx' });
    for (const page of generated) {
      const destination = path.join(stagingDirectory, page.markdownPath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, page.content, { encoding: 'utf8', flag: 'wx' });
    }
    const urls = publicationUrls();
    const editorial = JSON.parse(await readFile(path.join(rootDirectory, 'config/llms.json'), 'utf8'));
    const index = generateLlmsIndex(editorial, generated.map((page) => page.markdownPath), urls);
    const full = generateLlmsFull(generated, { ...urls, assets: Object.keys(assetManifest) });
    await writeFile(path.join(stagingDirectory, 'llms-full.txt'), full, { encoding: 'utf8', flag: 'wx' });
    await writeFile(path.join(stagingDirectory, 'llms.txt'), index, { encoding: 'utf8', flag: 'wx' });
    if (!await stagedOutputMatches(stagingDirectory)) {
      await promoteGeneratedOutput(stagingDirectory);
    }
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
  // Retire the old generated publication surface only after a valid replacement
  // exists. Shared static assets remain untouched.
  await rm(path.join(staticDirectory, 'markdown'), { recursive: true, force: true });
  await rm(path.join(staticDirectory, 'llms.txt'), { force: true });
  await writeManifest(rootDirectory, libraries);
}

async function verifyBuild() {
  const available = new Set((await findMarkdownFiles(buildDirectory)).map((file) => path.relative(buildDirectory, file).split(path.sep).join('/')));
  for (const file of ['llms.txt', 'llms-full.txt']) { await readFile(path.join(buildDirectory, file)); available.add(file); }
  await verifyLlmsIndex(buildDirectory, available);

  for (const requirement of requiredContent) {
    const html = await readFile(path.join(buildDirectory, requirement.html), 'utf8');
    const markdown = await readFile(path.join(buildDirectory, requirement.markdown), 'utf8');

    if (requirement.href && !html.includes(`href="${requirement.href}"`)) {
      throw new Error(`${requirement.html} does not link to ${requirement.href}.`);
    }
    if (!markdown.includes(requirement.text)) {
      throw new Error(`${requirement.markdown} is missing required content: ${requirement.text}`);
    }
  }

  const htmlFiles = await findHtmlFiles(buildDirectory);
  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, 'utf8');
    const markdownLinks = [...html.matchAll(/href="([^"]+\.md)"/g)];
    for (const [, href] of markdownLinks) {
      const markdownPath = href.slice(baseUrl.length);
      if (href.startsWith(baseUrl)) {
        await readFile(path.join(buildDirectory, markdownPath));
      }
    }
  }

}

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findHtmlFiles(entryPath);
    }

    return entry.name.endsWith('.html') ? [entryPath] : [];
  }));

  return nested.flat();
}

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findMarkdownFiles(entryPath);
    }

    return entry.name.endsWith('.md') ? [entryPath] : [];
  }));

  return nested.flat();
}

if (process.argv[1] && await realpath(process.argv[1]) === await realpath(fileURLToPath(import.meta.url))) {
  if (process.argv.includes('--verify')) {
    await verifyBuild();
    const { verifyResources } = await import('./verify-resources.mjs');
    await verifyResources(rootDirectory, buildDirectory);
    console.log('Publishable resource checks passed.');
  } else {
    await exportMarkdown();
  }
}
