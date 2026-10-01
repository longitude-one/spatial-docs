import { readdir, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { baseUrl, isDevelopment, developmentNotice } from './site-settings.mjs';

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
    html: 'shared/markdown-export-example/index.html',
    markdown: 'shared/markdown-export-example.md',
    text: 'The coordinate sequence is retained in the Markdown counterpart.',
  },
];

async function findDocumentationFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findDocumentationFiles(entryPath);
    }

    return /\.(md|mdx)$/.test(entry.name) ? [entryPath] : [];
  }));

  return nested.flat();
}

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { body: content, metadata: {} };
  }

  const metadata = Object.fromEntries(
    match[1].split(/\r?\n/).flatMap((line) => {
      const field = line.match(/^([\w-]+):\s*(.*?)\s*$/);
      return field ? [[field[1], field[2].replace(/^['"]|['"]$/g, '')]] : [];
    }),
  );

  return { body: content.slice(match[0].length), metadata };
}

function markdownPathFor(sourcePath, metadata) {
  if (metadata.slug === '/') {
    return 'index.md';
  }

  return sourcePath.replace(/\.mdx?$/, '.md');
}

function unwrapMdx(node) {
  if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') {
    throw new Error('MDX JavaScript expressions cannot be exported as Markdown.');
  }
  if (node.type === 'mdxjsEsm') {
    return [];
  }
  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    return node.children.flatMap(unwrapMdx);
  }
  if (node.children) {
    node.children = node.children.flatMap(unwrapMdx);
  }

  return [node];
}

function convertMdxToMarkdown(content) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkStringify);
  const tree = processor.parse(content);
  tree.children = tree.children.flatMap(unwrapMdx);

  return processor.stringify(tree);
}

function titleFor(sourcePath, metadata, body) {
  const heading = body.match(/^#\s+(.+)$/m);
  return metadata.title || heading?.[1] || path.basename(sourcePath).replace(/\.mdx?$/, '');
}

function rebaseMarkdown(content) {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkStringify);
  const tree = processor.parse(content);
  function visit(node) {
    if (node.url?.startsWith('/') && !node.url.startsWith('//')) {
      node.url = `${baseUrl}${node.url.slice(1)}`;
    }
    if (node.type === 'html') {
      node.value = node.value.replace(/((?:href|src)=["'])\/(?!\/)/g, `$1${baseUrl}`);
    }
    for (const child of node.children || []) visit(child);
  }
  visit(tree);
  return processor.stringify(tree);
}

async function exportMarkdown() {
  const sourceFiles = await findDocumentationFiles(docsDirectory);
  await rm(markdownDirectory, { recursive: true, force: true });
  await mkdir(markdownDirectory, { recursive: true });

  const generated = [];
  for (const sourceFile of sourceFiles.sort()) {
    const sourcePath = path.relative(docsDirectory, sourceFile).split(path.sep).join('/');
    const { body, metadata } = parseFrontMatter(await readFile(sourceFile, 'utf8'));
    if (sourcePath.split('/').some((part) => part.startsWith('_'))
      || metadata.draft === 'true' || metadata.unlisted === 'true') {
      continue;
    }
    const markdownPath = markdownPathFor(sourcePath, metadata);
    if (generated.some((page) => page.markdownPath === markdownPath)) {
      throw new Error(`Duplicate Markdown destination: ${markdownPath}`);
    }
    const markdown = sourcePath.endsWith('.mdx') ? convertMdxToMarkdown(body) : body;
    const content = isDevelopment ? `> ${developmentNotice}\n\n${rebaseMarkdown(markdown)}` : markdown;
    const destination = path.join(markdownDirectory, markdownPath);

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content);
    generated.push({ markdownPath, title: titleFor(sourcePath, metadata, body) });
  }

  const index = [
    '# LongitudeOne Spatial Documentation',
    '',
    ...(isDevelopment ? [developmentNotice, ''] : []),
    'Markdown counterparts for the published documentation pages:',
    '',
    ...generated.map(({ markdownPath, title }) => `- [${title}](${baseUrl}markdown/${markdownPath})`),
    '',
  ].join('\n');
  await writeFile(path.join(staticDirectory, 'llms.txt'), index);
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