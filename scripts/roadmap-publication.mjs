import { readdir, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { readRoadmapData, validateRoadmapData } from './roadmap-data.mjs';
import { generateSupportTimeline } from './roadmap-timeline.mjs';

const text = (value) => ({ type: 'text', value });
const paragraph = (value) => ({ type: 'paragraph', children: [text(value)] });
const heading = (value) => ({ type: 'heading', depth: 2, children: [text(value)] });
const headers = ['Branch', 'Initial Release', 'Active Support Until', 'Security Support Until', 'PHP Compatibility', 'Notes'];

/** Portable MDAST shared by Docusaurus and Markdown export; no HTML or MDX. */
export function roadmapSupportNodes(input) {
  const roadmap = validateRoadmapData(input);
  const image = `../assets/roadmaps/${roadmap.library}.svg`;
  const children = [heading('Release timeline'), {
    type: 'paragraph', data: { hProperties: { className: ['roadmap-timeline'] } }, children: [{ type: 'link', url: image, children: [{
      type: 'image', url: image,
      alt: `${roadmap.library} release and support timeline. Planned releases use diamonds; actual releases use circles. Full dates and PHP compatibility follow in the support table.`,
    }] }],
  }, heading('Branch support')];
  if (!roadmap.branches.some(({ status }) => status === 'released')) {
    children.push(paragraph('No stable release is announced in this roadmap. Available forecasts are listed below.'));
  }
  const rows = roadmap.branches.map((branch) => {
    const planned = branch.status === 'planned';
    const release = planned ? branch.plannedReleaseDate : branch.releaseDate;
    const date = (value) => value === null ? 'Unannounced' : `${value}${planned ? ' (forecast)' : ''}`;
    return {
      type: 'tableRow', children: [
        [text(branch.version)],
        [text(date(release))],
        [text(date(branch.activeSupportUntil))],
        [text(date(branch.securitySupportUntil))],
        [branch.php === null ? text('Unannounced') : { type: 'inlineCode', value: branch.php }],
        [text(branch.notes ?? '—')],
      ].map((nodes) => ({ type: 'tableCell', children: nodes })),
    };
  });
  if (!rows.length) {
    children.push(paragraph('No branches or release schedule have been announced.'));
    rows.push({ type: 'tableRow', children: headers.map((_, index) => ({
      type: 'tableCell', children: [text(index === 5 ? 'No schedule announced.' : 'Unannounced')],
    })) });
  }
  children.push({ type: 'table', data: { hProperties: { className: ['roadmap-support-table'], tabIndex: 0, ariaLabel: `${roadmap.library} branch support` } },
    align: headers.map(() => null), children: [
    { type: 'tableRow', children: headers.map((value) => ({ type: 'tableCell', children: [text(value)] })) }, ...rows,
  ] });
  return children;
}

export function appendRoadmapSupport(tree, sourcePath, roadmaps) {
  if (!/^[^/]+\/roadmap\.md$/.test(sourcePath)) return;
  const library = sourcePath.split('/')[0];
  if (!Object.hasOwn(roadmaps, library)) throw new Error(`${sourcePath}: missing roadmap JSON configuration.`);
  tree.children.push(...roadmapSupportNodes(roadmaps[library]));
}

export default function remarkRoadmapSupport({ roadmaps, docsDirectory }) {
  return (tree, file) => appendRoadmapSupport(tree, path.relative(docsDirectory, file.path).split(path.sep).join('/'), roadmaps);
}

/** Validate the complete inventory before generating any build-time images. */
export async function generateRoadmapAssets(root) {
  const docs = path.join(root, 'docs');
  const libraries = [];
  for (const entry of await readdir(docs, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if ((await readdir(path.join(docs, entry.name))).includes('roadmap.md')) libraries.push(entry.name);
  }
  const directory = path.join(root, 'config/roadmaps');
  let configurations = [];
  try { configurations = (await readdir(directory)).filter((name) => name.endsWith('.json') && name !== 'window.json'); }
  catch (error) { if (error.code !== 'ENOENT' || libraries.length) throw error; }
  for (const filename of configurations) {
    if (!libraries.includes(filename.slice(0, -5))) throw new Error(`Roadmap configuration ${filename} has no docs/<library>/roadmap.md.`);
  }
  const roadmaps = {};
  const images = [];
  for (const library of libraries.sort()) {
    const { roadmap, window } = await readRoadmapData(path.join(directory, `${library}.json`), path.join(directory, 'window.json'));
    roadmaps[library] = roadmap;
    images.push([`${library}.svg`, generateSupportTimeline(roadmap, window)]);
  }
  const destination = path.join(root, 'static/assets/roadmaps');
  if (images.length) await mkdir(destination, { recursive: true });
  for (const [name, svg] of images) {
    let previous;
    try { previous = await readFile(path.join(destination, name), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous !== svg) await writeFile(path.join(destination, name), svg);
  }
  // This directory belongs exclusively to the generator.
  try {
    for (const name of await readdir(destination)) {
      if (!images.some(([image]) => image === name)) await rm(path.join(destination, name));
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return roadmaps;
}
