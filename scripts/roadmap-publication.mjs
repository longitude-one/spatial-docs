import { readdir, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'js-yaml';
import { validateRoadmapData, validateTimelineWindow, RoadmapDataError } from './roadmap-data.mjs';
import { discoverLibraries } from './library-versions.mjs';
import { baseUrl } from './site-settings.mjs';
import { generateSupportTimeline } from './roadmap-timeline.mjs';

const text = (value) => ({ type: 'text', value });
const paragraph = (value) => ({ type: 'paragraph', children: [text(value)] });
const heading = (value) => ({ type: 'heading', depth: 2, children: [text(value)] });
const headers = ['Branch', 'Initial Release', 'Active Support Until', 'Security Support Until', 'PHP Compatibility', 'Notes'];

function versionLink(library, version, label, html) {
  return { type: 'link', url: html ? `pathname://${baseUrl}${library}/${version}/index.html` : `${version}/index.md`,
    children: [text(label)] };
}

function documentationVersionNodes(library, versions, html) {
  if (!versions.length) return [];
  return [heading('Documentation versions'), { type: 'list', ordered: false, spread: false,
    children: versions.map((version) => ({ type: 'listItem', spread: false, children: [{ type: 'paragraph',
      children: [versionLink(library, version, version, html)] }] })) }];
}

/** Portable MDAST shared by Docusaurus and Markdown export; no HTML or MDX. */
export function roadmapSupportNodes(input, { library = input?.library, versions = [], html = false } = {}) {
  if (input === null) return [paragraph('The roadmap for this library has not been established yet.'), ...documentationVersionNodes(library, versions, html)];
  const roadmap = validateRoadmapData(input);
  if (!roadmap.branches.length) return roadmapSupportNodes(null, { library: roadmap.library, versions, html });
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
        [(() => {
          const major = /^(?:v)?([1-9][0-9]*)\.x$/u.exec(branch.version)?.[1];
          const version = `v${major}`;
          if (!major || !versions.includes(version)) return text(branch.version);
          return versionLink(roadmap.library, version, branch.version, html);
        })()],
        [text(date(release))],
        [text(date(branch.activeSupportUntil))],
        [text(date(branch.securitySupportUntil))],
        [branch.php === null ? text('Unannounced') : { type: 'inlineCode', value: branch.php }],
        [text(branch.notes ?? '—')],
      ].map((nodes) => ({ type: 'tableCell', children: nodes })),
    };
  });
  children.push({ type: 'table', data: { hProperties: { className: ['roadmap-support-table'], tabIndex: 0, ariaLabel: `${roadmap.library} branch support` } },
    align: headers.map(() => null), children: [
    { type: 'tableRow', children: headers.map((value) => ({ type: 'tableCell', children: [text(value)] })) }, ...rows,
  ] });
  return [...children, ...documentationVersionNodes(roadmap.library, versions, html)];
}

export function appendRoadmapSupport(tree, sourcePath, roadmaps, { html = false } = {}) {
  if (!/^[^/]+\/index\.md$/.test(sourcePath)) return;
  const library = sourcePath.split('/')[0];
  if (!Object.hasOwn(roadmaps, library)) return;
  const { roadmap, versions } = roadmaps[library];
  // Refresh only build-owned nodes; authored content (including metadata) stays in order.
  const authored = tree.children.filter((node) => !node.data?.generatedRoadmapSupport);
  const generated = roadmapSupportNodes(roadmap, { library, versions, html });
  for (const node of generated) node.data = { ...node.data, generatedRoadmapSupport: true };
  tree.children = [...authored, ...generated];
}

export default function remarkRoadmapSupport({ roadmaps, docsDirectory }) {
  return (tree, file) => appendRoadmapSupport(tree, path.relative(docsDirectory, file.path).split(path.sep).join('/'), roadmaps, { html: true });
}

async function optionalRoadmap(filename, library) {
  let raw;
  try { raw = await readFile(filename, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (!raw.trim()) return null;
  let input;
  try { input = JSON.parse(raw); }
  catch (error) { throw new Error(`Cannot read roadmap JSON ${filename}: ${error.message}`, { cause: error }); }
  if (input && typeof input === 'object' && !Array.isArray(input) && !Object.keys(input).length) return null;
  const roadmap = validateRoadmapData(input);
  if (roadmap.library !== library) {
    throw new RoadmapDataError(roadmap.library, '<configuration>', 'library', 'must match the library JSON filename.');
  }
  return roadmap.branches.length ? roadmap : null;
}

/** Validate the complete inventory before generating any build-time images. */
export async function generateRoadmapAssets(root) {
  const docs = path.join(root, 'docs');
  const libraries = await discoverLibraries(docs);
  const directory = path.join(root, 'config/roadmaps');
  let configurations = [];
  try { configurations = (await readdir(directory)).filter((name) => name.endsWith('.json') && name !== 'window.json'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const filename of configurations) {
    if (!Object.hasOwn(libraries, filename.slice(0, -5))) throw new Error(`Roadmap configuration ${filename} has no documented library.`);
  }
  const roadmaps = {};
  const images = [];
  let window;
  for (const [library, { majors, roadmap: hasIndex }] of Object.entries(libraries).sort(([a], [b]) => a.localeCompare(b))) {
    if (!hasIndex) throw new Error(`${library}: missing library landing page docs/${library}/index.md.`);
    const roadmap = await optionalRoadmap(path.join(directory, `${library}.json`), library);
    const versions = [];
    for (const major of majors) {
      try {
        const source = await readFile(path.join(docs, library, `v${major}`, 'index.md'), 'utf8');
        // Draft/unlisted pages are not published version destinations.
        const metadata = load(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source)?.[1] ?? '') ?? {};
        if (![true, 'true'].includes(metadata.draft) && ![true, 'true'].includes(metadata.unlisted)) versions.push(`v${major}`);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    roadmaps[library] = { roadmap, versions };
    if (roadmap) {
      if (!window) {
        const filename = path.join(directory, 'window.json');
        try { window = validateTimelineWindow(JSON.parse(await readFile(filename, 'utf8'))); }
        catch (error) { throw new Error(`Cannot read roadmap display window ${filename}: ${error.message}`, { cause: error }); }
      }
      images.push([`${library}.svg`, generateSupportTimeline(roadmap, window)]);
    }
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
