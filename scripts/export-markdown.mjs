import { readdir, readFile, mkdir, writeFile, rm, rename, mkdtemp, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dump, load } from 'js-yaml';
import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { baseUrl } from './site-settings.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDirectory = path.join(rootDirectory, 'docs');
const staticDirectory = path.join(rootDirectory, 'static');
const markdownDirectory = path.join(staticDirectory, 'markdown');
const buildDirectory = path.join(rootDirectory, 'build');

const requiredContent = [
  {
    html: 'index.html',
    markdown: 'index.md',
    href: `${baseUrl}markdown/index.md`,
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

const reservedPathComponents = new Set([
  'aux',
  'con',
  'nul',
  'prn',
  ...Array.from({ length: 9 }, (_, index) => `com${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `lpt${index + 1}`),
]);

function validatePathComponent(component, sourcePath) {
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
    const pathComponents = relativePath.split('/');
    pathComponents.forEach((component, index) => {
      if (index === pathComponents.length - 1 && !entry.isDirectory()) {
        component = component.replace(/\.[^.]+$/, '');
      }
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

function stripMarkdownCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '').replace(/`+[^`]*`+/g, '');
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
  for (const field of ['title', 'description']) {
    if (typeof metadata[field] !== 'string' || metadata[field].trim() === '') {
      throw new Error(`${sourcePath} must define a non-empty ${field} in front matter.`);
    }
  }

  const body = source.slice(frontMatter.position.end.offset);
  const sanitized = stripMarkdownCodeBlocks(body);
  const withoutComments = sanitized.replace(/<!--[\s\S]*?-->/g, '');
  if (/(?:^|\n)\s*(?:import|export)\s+/m.test(withoutComments)) {
    throw new Error('MDX imports and exports are not supported in documentation source files.');
  }
  if (/\{[^\n]*[+\-*/=<>!&|?:][^\n]*\}/m.test(withoutComments)) {
    throw new Error('MDX JavaScript expressions are not supported in documentation source files.');
  }
  removeComments(tree);
  const unsupportedHtml = [];
  function inspect(node) {
    if (node.type === 'html' && !/^<!--[\s\S]*-->$/.test(node.value.trim())) {
      unsupportedHtml.push(node.value);
    }
    for (const child of node.children || []) inspect(child);
  }
  tree.children.forEach(inspect);
  if (unsupportedHtml.length > 0) {
    throw new Error('Raw HTML and JSX are not supported in documentation source files. Use portable Markdown only.');
  }

  return {
    body: markdownProcessor.stringify(tree).replace(/\r\n/g, '\n').replace(/\n*$/, '\n'),
    metadata,
  };
}

function htmlPathFor(markdownPath) {
  return markdownPath.replace(/\.md$/, '.html');
}

function publishedDocument(sourcePath, metadata, body) {
  const markdownPath = sourcePath;
  const htmlPath = htmlPathFor(markdownPath);
  const markdownName = path.basename(markdownPath);
  const htmlHref = path.posix.relative(
    path.posix.dirname(`/markdown/${markdownPath}`),
    `/${htmlPath}`,
  );
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
  const content = body.trim() ? `${body.trimEnd()}\n` : '';
  return {
    markdownPath,
    htmlPath: `/${htmlPath}`,
    markdownUrl: `/${markdownPath}`,
    title: metadata.title.trim(),
    content: `---\n${frontMatter}\n---\n\n${htmlLink}\n\n${content}`,
  };
}

function escapeMarkdownLabel(value) {
  return value.replace(/\s+/g, ' ').replace(/[\\[\]]/g, '\\$&');
}

async function promoteGeneratedOutput(stagingDirectory) {
  const destinations = [
    ['markdown', markdownDirectory],
    ['llms.txt', path.join(staticDirectory, 'llms.txt')],
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
    return await pathsHaveSameFiles(path.join(stagingDirectory, 'markdown'), markdownDirectory)
      && Buffer.from(await readFile(path.join(stagingDirectory, 'llms.txt')))
        .equals(await readFile(path.join(staticDirectory, 'llms.txt')));
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function exportMarkdown() {
  const sourceFiles = await findDocumentationFiles(docsDirectory);
  const generated = [];
  for (const sourceFile of sourceFiles.sort()) {
    const sourcePath = path.relative(docsDirectory, sourceFile).split(path.sep).join('/');
    const raw = await readFile(sourceFile, 'utf8');
    const { body, metadata } = parseSourceDocument(raw, sourcePath);
    if (sourcePath.split('/').some((part) => part.startsWith('_'))
      || metadata.draft === true || metadata.draft === 'true'
      || metadata.unlisted === true || metadata.unlisted === 'true') {
      continue;
    }
    const page = publishedDocument(sourcePath, metadata, body);
    if (generated.some(({ markdownPath, htmlPath }) => (
      markdownPath === page.markdownPath || htmlPath === page.htmlPath
    ))) {
      throw new Error(`Duplicate representation destination for ${sourcePath}.`);
    }
    generated.push(page);
  }

  await mkdir(staticDirectory, { recursive: true });
  const stagingDirectory = await mkdtemp(path.join(staticDirectory, '.markdown-staging-'));
  const stagingMarkdownDirectory = path.join(stagingDirectory, 'markdown');
  await mkdir(stagingMarkdownDirectory, { recursive: true });
  try {
    for (const page of generated) {
      const destination = path.join(stagingMarkdownDirectory, page.markdownPath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, page.content, { encoding: 'utf8', flag: 'wx' });
    }
    const index = [
      '# LongitudeOne Spatial Documentation',
      '',
      'Markdown counterparts for the published documentation pages:',
      '',
      ...generated.map(({ markdownPath, title }) => (
        `- [${escapeMarkdownLabel(title)}](${baseUrl}markdown/${markdownPath})`
      )),
      '',
    ].join('\n');
    await writeFile(path.join(stagingDirectory, 'llms.txt'), index, { encoding: 'utf8', flag: 'wx' });
    if (!await stagedOutputMatches(stagingDirectory)) {
      await promoteGeneratedOutput(stagingDirectory);
    }
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

async function verifyBuild() {
  const index = await readFile(path.join(buildDirectory, 'llms.txt'), 'utf8');
  const indexedMarkdownPaths = [...index.matchAll(/\]\(([^\s)]+\.md)\)/g)]
    .map((match) => match[1].slice(`${baseUrl}markdown/`.length));
  const markdownDirectory = path.join(buildDirectory, 'markdown');
  const generatedMarkdownPaths = (await findMarkdownFiles(markdownDirectory))
    .map((file) => path.relative(markdownDirectory, file).split(path.sep).join('/'))
    .sort();
  const listedMarkdownPaths = [...indexedMarkdownPaths].sort();

  if (listedMarkdownPaths.length !== generatedMarkdownPaths.length
    || listedMarkdownPaths.some((markdownPath, index) => markdownPath !== generatedMarkdownPaths[index])) {
    throw new Error('llms.txt must list every generated Markdown page exactly once.');
  }

  for (const markdownPath of indexedMarkdownPaths) {
    await readFile(path.join(markdownDirectory, markdownPath));
  }

  for (const requirement of requiredContent) {
    const html = await readFile(path.join(buildDirectory, requirement.html), 'utf8');
    const markdown = await readFile(path.join(buildDirectory, 'markdown', requirement.markdown), 'utf8');

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
      const markdownPath = href.slice(`${baseUrl}markdown/`.length);
      if (href.startsWith(`${baseUrl}markdown/`)) {
        await readFile(path.join(buildDirectory, 'markdown', markdownPath));
      }
    }
  }

  if (indexedMarkdownPaths.length === 0) {
    throw new Error('llms.txt does not list any Markdown pages.');
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

if (process.argv.includes('--verify')) {
  await verifyBuild();
  const { verifyResources } = await import('./verify-resources.mjs');
  await verifyResources(rootDirectory);
  console.log('Publishable resource checks passed.');
} else {
  await exportMarkdown();
}