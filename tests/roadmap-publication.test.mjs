import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import { discoverLibraries } from '../scripts/library-versions.mjs';
import remarkRoadmapSupport, { roadmapSupportNodes, generateRoadmapAssets, appendRoadmapSupport } from '../scripts/roadmap-publication.mjs';

const repository = new URL('../', import.meta.url);
// Keep exact deployment destinations independent of the URL generator under test.
const expectedHtmlDirectory = process.env.DOCUSAURUS_DEPLOYMENT === 'development'
  ? 'pathname:///spatial-docs/example-library/'
  : 'pathname:///example-library/';
const branch = (changes = {}) => ({
  version: '1.x', status: 'released', plannedReleaseDate: null, releaseDate: '2024-01-01',
  activeSupportUntil: '2024-06-30', securitySupportUntil: '2024-12-31', php: '^8.4 || ^8.5', notes: null, ...changes,
});
const roadmap = (branches = [branch()]) => ({ library: 'example-library', branches });
const window = { startDate: '2024-01-01', endDate: '2029-12-31' };
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']).use(remarkStringify);
const markdown = (data) => processor.stringify({ type: 'root', children: roadmapSupportNodes(data) });

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'roadmap-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'docs/example-library/v1'), { recursive: true });
  await writeFile(path.join(root, 'docs/example-library/v1/index.md'), 'Version');
  await writeFile(path.join(root, 'docs/example-library/index.md'), 'Roadmap');
  await mkdir(path.join(root, 'config/roadmaps'), { recursive: true });
  await writeFile(path.join(root, 'config/roadmaps/window.json'), JSON.stringify(window));
  await writeFile(path.join(root, 'config/roadmaps/example-library.json'), JSON.stringify(roadmap()));
  return root;
}

test('all ten real roadmaps have validated JSON and retain shared data and explicit display bounds', async () => {
  const docs = new URL('docs/', repository);
  const names = Object.keys(await discoverLibraries(docs.pathname));
  const files = (await readdir(new URL('config/roadmaps/', repository))).filter((name) => name !== 'window.json');
  assert.equal(names.length, 10);
  assert.deepEqual(files.sort(), names.map((name) => `${name}.json`).sort());
  for (const name of names) {
    const input = JSON.parse(await readFile(new URL(`config/roadmaps/${name}.json`, repository), 'utf8'));
    assert.equal(input.library, name);
    assert.equal(roadmapSupportNodes(input).at(-1).children.length, input.branches.length + 1);
    const source = await readFile(new URL(`docs/${name}/index.md`, repository), 'utf8');
    assert.doesNotMatch(source, /^\|/m, 'No duplicate hand-written support table');
    assert.ok(!(await readdir(new URL(`${name}/`, docs))).includes('roadmap.md'));
    assert.match(source, /^title: .+/m);
    assert.match(source, /^description: .+/m);
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
  assert.equal(table.children[1].children[0].children[0].value, '1 | 2');
  assert.equal(table.children[1].children[4].children[0].value, '^8.4 || ^8.5');
  assert.equal(table.children[1].children[4].children[0].type, 'inlineCode');
  assert.equal(table.children[1].children[5].children.map(({ value }) => value).join(''), 'A | B <script> `code` & value');
  assert.ok(!JSON.stringify(tree).includes('"type":"html"'));
});

test('planned dates and support are forecasts; unknown values and no stable releases remain explicit', () => {
  const output = markdown(roadmap([branch({ status: 'planned', releaseDate: null, plannedReleaseDate: '2024-05-01', php: null })]));
  assert.equal(processor.parse(output).children.find(({ type }) => type === 'table').children[1].children[0].children[0].value, '1.x');
  assert.doesNotMatch(output, /\(planned\)|\(released\)/);
  for (const date of ['2024-05-01', '2024-06-30', '2024-12-31']) assert.ok(output.includes(`${date} (forecast)`));
  assert.match(output, /No stable release/);
  assert.match(output, /Unannounced/);
  const empty = markdown(roadmap([]));
  assert.equal(empty.trim(), 'The roadmap for this library has not been established yet.');
  assert.ok(!processor.parse(empty).children.some(({ type }) => ['table', 'image'].includes(type)));
});

test('HTML and portable Markdown consumers receive identical table and image nodes', () => {
  const data = { 'example-library': { roadmap: roadmap(), versions: [] } };
  const portable = { type: 'root', children: [] };
  const html = structuredClone(portable);
  appendRoadmapSupport(portable, 'example-library/index.md', data);
  remarkRoadmapSupport({ roadmaps: data, docsDirectory: '/site/docs' })(html, { path: '/site/docs/example-library/index.md' });
  assert.deepEqual(html, portable);
  const image = portable.children[1].children[0].children[0];
  assert.match(image.alt, /release and support timeline/);
  assert.equal(image.url, '../assets/roadmaps/example-library.svg');
  const unrelated = { children: [{ type: 'text', value: 'Unrelated' }] };
  appendRoadmapSupport(unrelated, 'concepts/index.md', data);
  assert.equal(unrelated.children[0].value, 'Unrelated');
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
  assert.match(markdown(after['example-library'].roadmap), /2024-07-31/);
  const updatedImage = await readFile(image, 'utf8');
  assert.notEqual(updatedImage, before);
  assert.match(updatedImage, /2024-07-31/);
  await writeFile(path.join(root, 'config/roadmaps/example-library.json'), JSON.stringify(roadmap([branch({ releaseDate: 'invalid' })])));
  await assert.rejects(generateRoadmapAssets(root), /example-library.*1.x.*releaseDate/);
  assert.equal(await readFile(image, 'utf8'), updatedImage);
});

test('missing configuration shows the default message, while orphaned configuration fails', async (t) => {
  const root = await fixture(t);
  await rm(path.join(root, 'config/roadmaps/example-library.json'));
  const data = await generateRoadmapAssets(root);
  assert.equal(data['example-library'].roadmap, null);
  assert.equal(markdown(data['example-library'].roadmap).trim(), 'The roadmap for this library has not been established yet.');
  await writeFile(path.join(root, 'config/roadmaps/orphan.json'), '{}');
  await assert.rejects(generateRoadmapAssets(root), /orphan.json has no/);
});


test('generated roadmaps omit the timeline instructions and support explanatory paragraphs', () => {
  const output = markdown(roadmap());
  assert.doesNotMatch(output, /Open the timeline to zoom|Solid slate bars|Dashed outlines identify forecasts|Planned branches and their support dates are forecasts|The table remains usable without the timeline/);
});


for (const configuration of ['', '  \n', '{}', JSON.stringify(roadmap([]))]) {
  test(`unpopulated configuration ${JSON.stringify(configuration)} has no timeline or support table`, async (t) => {
    const root = await fixture(t);
    await generateRoadmapAssets(root);
    await writeFile(path.join(root, 'config/roadmaps/example-library.json'), configuration);
    const data = await generateRoadmapAssets(root);
    assert.equal(data['example-library'].roadmap, null);
    assert.deepEqual(await readdir(path.join(root, 'static/assets/roadmaps')), []);
    assert.equal(markdown(data['example-library'].roadmap).trim(), 'The roadmap for this library has not been established yet.');
  });
}

for (const configuration of ['{', 'null', '[]', '{"branches":[]}', JSON.stringify({ ...roadmap([]), library: 'wrong' }),
  JSON.stringify({ ...roadmap([]), unexpected: true }), JSON.stringify(roadmap([branch({ releaseDate: 'bad' })]))]) {
  test(`nonempty invalid configuration ${configuration} is an error`, async (t) => {
    const root = await fixture(t);
    await writeFile(path.join(root, 'config/roadmaps/example-library.json'), configuration);
    await assert.rejects(generateRoadmapAssets(root));
  });
}

const authoredSource = '---\ntitle: Library\ndescription: Library roadmap.\nsidebar_position: 2\n---\n\n'
  + '## Introduction\n\nAuthored **explanation** with [version](v1/index.md).\n\n'
  + '- First item\n- Second item\n\n![Diagram](../assets/diagram.svg)\n\n'
  + '```php\n$example = "Release timeline";\n```\n\n## Branch support\n\nFinal authored paragraph.\n';

for (const html of [false, true]) {
  for (const input of [roadmap(), null, roadmap([])]) {
    test(`authored content precedes generated content and survives refresh (html=${html}, roadmap=${input?.branches.length ?? 'missing'})`, () => {
      const tree = processor.parse(authoredSource);
      const authored = structuredClone(tree.children);
      const data = { 'example-library': { roadmap: input, versions: ['v1'] } };
      const apply = () => html
        ? remarkRoadmapSupport({ roadmaps: data, docsDirectory: '/site/docs' })(tree, { path: '/site/docs/example-library/index.md' })
        : appendRoadmapSupport(tree, 'example-library/index.md', data);
      apply();
      assert.deepEqual(tree.children.slice(0, authored.length), authored);
      assert.equal(tree.children[authored.length].type, input?.branches.length ? 'heading' : 'paragraph');
      const first = structuredClone(tree);
      apply();
      assert.deepEqual(tree, first);
      data['example-library'].roadmap = roadmap([branch({ notes: 'Updated configuration' })]);
      apply();
      assert.deepEqual(tree.children.slice(0, authored.length), authored);
      assert.match(processor.stringify(tree), /Updated configuration/);
      assert.equal(tree.children.filter(({ type }) => type === 'table').length, 1);
      data['example-library'].roadmap = null;
      apply();
      assert.deepEqual(tree.children.slice(0, authored.length), authored);
      assert.equal(tree.children.filter(({ type }) => type === 'table').length, 0);
      assert.equal(tree.children[authored.length].children[0].value, 'The roadmap for this library has not been established yet.');
      assert.equal(tree.children.at(-1).children[0].children[0].children[0].url,
        html ? `${expectedHtmlDirectory}v1/index.html` : 'v1/index.md');
      const versionTree = processor.parse(authoredSource);
      appendRoadmapSupport(versionTree, 'example-library/v1/index.md', data, { html });
      assert.deepEqual(versionTree, processor.parse(authoredSource));
    });
  }
}

test('documented majors link to version landing pages in both representations, missing versions stay text', async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'docs/example-library/v2'));
  await mkdir(path.join(root, 'docs/example-library/v3'));
  await writeFile(path.join(root, 'docs/example-library/v3/index.md'), '---\ntitle: Draft\ndescription: Draft.\ndraft: true\n---\n');
  await writeFile(path.join(root, 'config/roadmaps/example-library.json'), JSON.stringify(roadmap([
    branch(), branch({ version: '2.x' }), branch({ version: '3.x' }), branch({ version: '4.x' }),
  ])));
  const data = await generateRoadmapAssets(root);
  assert.deepEqual(data['example-library'].versions, ['v1']);
  for (const html of [false, true]) {
    const tree = { children: [] };
    appendRoadmapSupport(tree, 'example-library/index.md', data, { html });
    const table = tree.children.find(({ type }) => type === 'table');
    const labels = table.children.slice(1).map((row) => row.children[0].children[0]);
    assert.equal(labels[0].type, 'link');
    assert.equal(labels[0].url, html ? `${expectedHtmlDirectory}v1/index.html` : 'v1/index.md');
    assert.deepEqual(labels.slice(1).map(({ type }) => type), ['text', 'text', 'text']);
  }
});

test('fully unannounced branches remain a configured roadmap', async (t) => {
  const root = await fixture(t);
  const input = roadmap([branch({ status: 'planned', releaseDate: null, plannedReleaseDate: null,
    activeSupportUntil: null, securitySupportUntil: null, php: null })]);
  await writeFile(path.join(root, 'config/roadmaps/example-library.json'), JSON.stringify(input));
  const data = await generateRoadmapAssets(root);
  assert.deepEqual(data['example-library'].roadmap, input);
  assert.match(markdown(input), /Unannounced/);
  assert.match(await readFile(path.join(root, 'static/assets/roadmaps/example-library.svg'), 'utf8'), /release unannounced/);
});


test('documentation versions list includes every published version even when linked in the support table', () => {
  for (const input of [roadmap(), null]) {
    for (const html of [false, true]) {
      const nodes = roadmapSupportNodes(input, { library: 'example-library', versions: ['v1', 'v2'], html });
      const list = nodes.find(({ type }) => type === 'list');
      const links = list.children.map((item) => item.children[0].children[0]);
      assert.deepEqual(links.map(({ url }) => url), html
        ? [`${expectedHtmlDirectory}v1/index.html`, `${expectedHtmlDirectory}v2/index.html`]
        : ['v1/index.md', 'v2/index.md']);
      assert.deepEqual(links.map(({ children }) => children[0].value), ['v1', 'v2']);
      if (!input) assert.ok(!nodes.some(({ type }) => type === 'table'));
    }
  }
  assert.ok(!roadmapSupportNodes(roadmap(), { versions: [] }).some(({ type }) => type === 'list'));
});
