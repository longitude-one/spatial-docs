import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import remarkRoadmapSupport, { roadmapSupportNodes, generateRoadmapAssets, appendRoadmapSupport } from '../scripts/roadmap-publication.mjs';

const repository = new URL('../', import.meta.url);
const branch = (changes = {}) => ({
  version: '1.x', status: 'released', plannedReleaseDate: null, releaseDate: '2024-01-01',
  activeSupportUntil: '2024-06-30', securitySupportUntil: '2024-12-31', php: '^8.4 || ^8.5', notes: null, ...changes,
});
const roadmap = (branches = [branch()]) => ({ library: 'example-library', branches });
const window = { startDate: '2024-01-01', endDate: '2029-12-31' };
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkStringify);
const markdown = (data) => processor.stringify({ type: 'root', children: roadmapSupportNodes(data) });

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'roadmap-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'docs/example-library'), { recursive: true });
  await writeFile(path.join(root, 'docs/example-library/roadmap.md'), 'Roadmap');
  await mkdir(path.join(root, 'config/roadmaps'), { recursive: true });
  await writeFile(path.join(root, 'config/roadmaps/window.json'), JSON.stringify(window));
  await writeFile(path.join(root, 'config/roadmaps/example-library.json'), JSON.stringify(roadmap()));
  return root;
}

test('all ten real roadmaps have validated JSON and retain shared data and explicit display bounds', async () => {
  const docs = new URL('docs/', repository);
  const names = [];
  for (const entry of await readdir(docs, { withFileTypes: true })) {
    if (entry.isDirectory() && (await readdir(new URL(`${entry.name}/`, docs))).includes('roadmap.md')) names.push(entry.name);
  }
  const files = (await readdir(new URL('config/roadmaps/', repository))).filter((name) => name !== 'window.json');
  assert.equal(names.length, 10);
  assert.deepEqual(files.sort(), names.map((name) => `${name}.json`).sort());
  for (const name of names) {
    const input = JSON.parse(await readFile(new URL(`config/roadmaps/${name}.json`, repository), 'utf8'));
    assert.equal(input.library, name);
    assert.equal(roadmapSupportNodes(input).at(-1).children.length, input.branches.length + 1);
    const source = await readFile(new URL(`docs/${name}/roadmap.md`, repository), 'utf8');
    assert.doesNotMatch(source, /^\|/m, 'No duplicate hand-written support table');
  }
});

test('table preserves Composer constraints, text safety and semantic column headers', () => {
  const input = roadmap([branch({ notes: 'A | B <script> `code` & value', version: '1 | 2' })]);
  const tree = processor.parse(markdown(input));
  const table = tree.children.find(({ type }) => type === 'table');
  assert.equal(table.children.length, 2);
  assert.deepEqual(table.children[0].children.map((cell) => cell.children[0].value),
    ['Branch', 'Initial Release', 'Active Support Until', 'Security Support Until', 'PHP Compatibility', 'Notes']);
  assert.equal(table.children[1].children.length, 6);
  assert.equal(table.children[1].children[4].children[0].value, '^8.4 || ^8.5');
  assert.equal(table.children[1].children[4].children[0].type, 'inlineCode');
  assert.equal(table.children[1].children[5].children.map(({ value }) => value).join(''), 'A | B <script> `code` & value');
  assert.ok(!JSON.stringify(tree).includes('"type":"html"'));
});

test('planned dates and support are forecasts; unknown values and no stable releases remain explicit', () => {
  const output = markdown(roadmap([branch({ status: 'planned', releaseDate: null, plannedReleaseDate: '2024-05-01', php: null })]));
  assert.match(output, /1.x \(planned\)/);
  for (const date of ['2024-05-01', '2024-06-30', '2024-12-31']) assert.ok(output.includes(`${date} (forecast)`));
  assert.match(output, /No stable release/);
  assert.match(output, /Unannounced/);
  const empty = markdown(roadmap([]));
  assert.match(empty, /No branches or release schedule have been announced/);
  assert.equal(processor.parse(empty).children.find(({ type }) => type === 'table').children.length, 2);
});

test('HTML and portable Markdown consumers receive identical table and image nodes', () => {
  const data = { 'example-library': roadmap() };
  const portable = { type: 'root', children: [] };
  const html = structuredClone(portable);
  appendRoadmapSupport(portable, 'example-library/roadmap.md', data);
  remarkRoadmapSupport({ roadmaps: data, docsDirectory: '/site/docs' })(html, { path: '/site/docs/example-library/roadmap.md' });
  assert.deepEqual(html, portable);
  const image = portable.children[1].children[0].children[0];
  assert.match(image.alt, /release and support timeline/);
  assert.equal(image.url, '../assets/roadmaps/example-library.svg');
  assert.throws(() => appendRoadmapSupport({ children: [] }, 'missing/roadmap.md', data), /missing roadmap JSON/);
});

test('build-time assets use shared JSON and window; invalid inputs preserve existing images', async (t) => {
  const root = await fixture(t);
  const initial = await generateRoadmapAssets(root);
  const image = path.join(root, 'static/assets/roadmaps/example-library.svg');
  const before = await readFile(image, 'utf8');
  assert.match(before, /2024-06-30/);
  const changed = roadmap([branch({ activeSupportUntil: '2024-07-31' })]);
  await writeFile(path.join(root, 'config/roadmaps/example-library.json'), JSON.stringify(changed));
  const after = await generateRoadmapAssets(root);
  assert.notDeepEqual(after, initial);
  assert.match(markdown(after['example-library']), /2024-07-31/);
  const updatedImage = await readFile(image, 'utf8');
  assert.notEqual(updatedImage, before);
  assert.match(updatedImage, /2024-07-31/);
  await writeFile(path.join(root, 'config/roadmaps/example-library.json'), JSON.stringify(roadmap([branch({ releaseDate: 'invalid' })])));
  await assert.rejects(generateRoadmapAssets(root), /example-library.*1.x.*releaseDate/);
  assert.equal(await readFile(image, 'utf8'), updatedImage);
});

test('missing and orphaned configurations fail the inventory check', async (t) => {
  const root = await fixture(t);
  await rm(path.join(root, 'config/roadmaps/example-library.json'));
  await assert.rejects(generateRoadmapAssets(root), /example-library.json/);
  await writeFile(path.join(root, 'config/roadmaps/orphan.json'), '{}');
  await assert.rejects(generateRoadmapAssets(root), /orphan.json has no/);
});
