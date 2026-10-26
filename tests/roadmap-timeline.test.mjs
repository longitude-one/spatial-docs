import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import sax from 'sax';
import { generateSupportTimeline } from '../scripts/roadmap-timeline.mjs';
import { readRoadmapData, validateRoadmapData, validateTimelineWindow, RoadmapDataError } from '../scripts/roadmap-data.mjs';

const run = promisify(execFile);
const window = { startDate: '2024-01-01', endDate: '2024-12-31' };
const branch = (changes = {}) => ({
  version: '1.x', status: 'released', plannedReleaseDate: null, releaseDate: '2024-01-01',
  activeSupportUntil: '2024-06-30', securitySupportUntil: '2024-12-31', php: '^8.4', notes: null, ...changes,
});
const data = (...branches) => ({ library: 'example-library', branches });

function xml(svg) {
  const parser = sax.parser(true);
  const stack = [];
  let root;
  parser.onopentag = (node) => {
    const current = { name: node.name, attributes: node.attributes, children: [], text: '' };
    if (stack.length) stack.at(-1).children.push(current);
    else root = current;
    stack.push(current);
  };
  parser.ontext = (text) => { if (stack.length) stack.at(-1).text += text; };
  parser.onclosetag = () => stack.pop();
  parser.write(svg).close();
  return root;
}
function all(node, matches) {
  return [...(matches(node) ? [node] : []), ...node.children.flatMap((child) => all(child, matches))];
}
const rows = (svg) => all(xml(svg), (node) => Object.hasOwn(node.attributes, 'data-branch'));
const kinds = (row, kind) => all(row, (node) => node.attributes['data-kind'] === kind);
const rect = (row, kind) => kinds(row, kind)[0]?.children.find((node) => node.name === 'rect');
const close = (actual, expected) => assert.ok(Math.abs(Number(actual) - expected) <= 0.001, `${actual} != ${expected}`);

test('calendar periods use actual dates, leap days and inclusive support transitions on a shared annual axis', () => {
  const svg = generateSupportTimeline(data(branch()), window);
  const root = xml(svg);
  assert.equal(root.attributes.viewBox.split(' ')[2], '960');
  const row = rows(svg)[0];
  const active = rect(row, 'active');
  const security = rect(row, 'security');
  close(active.attributes.x, 24);
  close(active.attributes.width, 912 * 182 / 366);
  close(security.attributes.x, 24 + 912 * 182 / 366);
  close(security.attributes.width, 912 * 184 / 366);
  assert.equal(kinds(row, 'released-release').length, 1);
  const years = all(root, (node) => Object.hasOwn(node.attributes, 'data-year'));
  assert.deepEqual(years.map((node) => node.attributes['data-year']), ['2024']);
  assert.match(svg, /Active support: 2024-01-01 through 2024-06-30/);
  assert.match(svg, /Security fixes only: after 2024-06-30 through 2024-12-31/);
});

test('all branches share identical time bounds and date positions', () => {
  const svg = generateSupportTimeline(data(branch(), branch({ version: '2.x' })), window);
  const [first, second] = rows(svg);
  assert.equal(rect(first, 'active').attributes.x, rect(second, 'active').attributes.x);
  assert.equal(rect(first, 'security').attributes.width, rect(second, 'security').attributes.width);
});

test('planned dates are distinct from actual releases and never promote a branch based on the clock', () => {
  const input = data(branch({ status: 'planned', releaseDate: null, plannedReleaseDate: '2024-03-01' }));
  const before = generateSupportTimeline(input, window);
  const original = Date.now;
  try {
    Date.now = () => { throw new Error('Timeline generation must not consult the clock.'); };
    assert.equal(generateSupportTimeline(input, window), before);
  } finally { Date.now = original; }
  const row = rows(before)[0];
  assert.equal(row.attributes['data-status'], 'planned');
  assert.equal(kinds(row, 'planned-release').length, 1);
  assert.equal(kinds(row, 'released-release').length, 0);
  assert.equal(rect(row, 'active').attributes['stroke-dasharray'], '4 3');
  close(Number(kinds(row, 'planned-release')[0].children[1].attributes.d.split(' ')[1]), 24 + 912 * 60 / 366);
});

test('a released branch uses its actual date even when a different historical forecast is retained', () => {
  const svg = generateSupportTimeline(data(branch({ releaseDate: '2024-02-01', plannedReleaseDate: '2024-01-01' })), window);
  const row = rows(svg)[0];
  close(rect(row, 'active').attributes.x, 24 + 912 * 31 / 366);
  close(kinds(row, 'released-release')[0].children[1].attributes.cx, 24 + 912 * 31 / 366);
});

test('unannounced dates create no inferred support periods and a roadmap without releases is representable', () => {
  const planned = branch({ status: 'planned', releaseDate: null, plannedReleaseDate: null, activeSupportUntil: null, securitySupportUntil: null, php: null });
  const svg = generateSupportTimeline(data(planned), window);
  const row = rows(svg)[0];
  assert.equal(kinds(row, 'active').length, 0);
  assert.equal(kinds(row, 'security').length, 0);
  assert.equal(kinds(row, 'planned-release').length, 0);
  assert.match(svg, /planned release: unannounced/);
  assert.match(svg, /PHP: unannounced/);
  assert.match(generateSupportTimeline(data(), window), /No branches announced\./);
});

test('a known planned date without announced support yields a marker, never a policy-derived support interval', () => {
  const svg = generateSupportTimeline(data(branch({ status: 'planned', releaseDate: null, plannedReleaseDate: '2024-02-01', activeSupportUntil: null, securitySupportUntil: null })), window);
  const row = rows(svg)[0];
  assert.equal(kinds(row, 'planned-release').length, 1);
  assert.equal(kinds(row, 'active').length, 0);
  assert.equal(kinds(row, 'security').length, 0);
});

test('missing interval prerequisites remain unknown rather than fabricating a start or end', () => {
  for (const missing of [
    { status: 'planned', releaseDate: null, plannedReleaseDate: null },
    { activeSupportUntil: null },
  ]) {
    const row = rows(generateSupportTimeline(data(branch(missing)), window))[0];
    assert.equal(kinds(row, 'active').length, 0);
    assert.equal(kinds(row, 'security').length, 0);
  }
  const row = rows(generateSupportTimeline(data(branch({ securitySupportUntil: null })), window))[0];
  assert.equal(kinds(row, 'active').length, 1);
  assert.equal(kinds(row, 'security').length, 0);
});

test('a one-day active period is visible and equal support ends produce no invented security-only interval', () => {
  const row = rows(generateSupportTimeline(data(branch({ activeSupportUntil: '2024-01-01', securitySupportUntil: '2024-01-01' })), window))[0];
  close(rect(row, 'active').attributes.width, 912 / 366);
  assert.equal(kinds(row, 'security').length, 0);
});

test('clipping respects common bounds, marks both continuations and keeps out-of-window dates in labels', () => {
  const input = data(branch({ releaseDate: '2022-01-01', activeSupportUntil: '2026-01-01', securitySupportUntil: '2028-01-01' }));
  const svg = generateSupportTimeline(input, window);
  const row = rows(svg)[0];
  const active = kinds(row, 'active')[0];
  assert.equal(active.attributes['data-continues-before'], 'true');
  assert.equal(active.attributes['data-continues-after'], 'true');
  close(rect(row, 'active').attributes.x, 24);
  close(rect(row, 'active').attributes.width, 912);
  assert.equal(kinds(row, 'released-release').length, 0);
  assert.equal(kinds(row, 'security').length, 0);
  assert.match(svg, /2022-01-01/);
  assert.match(svg, /continues before display window; continues after display window/);
  const before = rows(generateSupportTimeline(data(branch({ releaseDate: '2020-01-01', activeSupportUntil: '2020-12-31', securitySupportUntil: '2021-12-31' })), window))[0];
  assert.equal(kinds(before, 'active').length, 0);
  assert.equal(kinds(before, 'security').length, 0);
});

test('each clipped phase has its own continuation flags and a marker is visible on the last display day', () => {
  const svg = generateSupportTimeline(data(branch({ releaseDate: '2023-01-01', securitySupportUntil: '2025-12-31' })), window);
  const row = rows(svg)[0];
  assert.equal(kinds(row, 'active')[0].attributes['data-continues-before'], 'true');
  assert.equal(kinds(row, 'active')[0].attributes['data-continues-after'], 'false');
  assert.equal(kinds(row, 'security')[0].attributes['data-continues-after'], 'true');
  const atEnd = rows(generateSupportTimeline(data(branch({ status: 'planned', releaseDate: null, plannedReleaseDate: '2024-12-31', activeSupportUntil: null, securitySupportUntil: null })), window))[0];
  assert.equal(kinds(atEnd, 'planned-release').length, 1);
});

test('annual ticks are calendar boundaries rather than approximated equal-length years', () => {
  const svg = generateSupportTimeline(data(branch()), { startDate: '2023-07-01', endDate: '2025-06-30' });
  const ticks = all(xml(svg), (node) => Object.hasOwn(node.attributes, 'data-year'));
  assert.deepEqual(ticks.map((tick) => tick.attributes['data-year']), ['2024', '2025']);
  const x = (tick) => Number(tick.children[1].attributes.x);
  close(x(ticks[1]) - x(ticks[0]), 912 * 366 / 731);
});

test('SVG is standalone, XML-safe, accessible and uses the site palette without theme-dependent inheritance', () => {
  const input = { library: 'A < B & "C"', branches: [branch({ version: '1 < 2 & "three"', notes: "Use <script> & 'quotes' safely." })] };
  const svg = generateSupportTimeline(input, window);
  const root = xml(svg);
  assert.equal(root.attributes.role, 'img');
  assert.equal(root.attributes['aria-labelledby'], 'timeline-title timeline-description');
  assert.match(svg, /A &lt; B &amp; &quot;C&quot;/);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /#172b40/);
  assert.match(svg, /#35546b/);
  assert.match(svg, /#a66a35/);
  assert.match(svg, /#c58a51/);
  assert.match(svg, /fill="#f7f3eb"/);
  assert.equal(root.attributes.xmlns, 'http://www.w3.org/2000/svg');
  assert.doesNotMatch(svg, /<script|<foreignObject|href=|<image|\bonload=|var\(--|prefers-color-scheme/);
  assert.doesNotMatch(svg, /today|countdown|years? (?:ago|remaining)|months? (?:ago|remaining)/i);
});

test('long headings wrap and branch labels fit their bars; narrow calendars reserve space for annual labels', () => {
  const input = { library: 'Library'.repeat(20), branches: [branch({ version: 'Branch'.repeat(20), notes: 'Long note '.repeat(20) })] };
  const svg = generateSupportTimeline(input, window, { width: 360 });
  const root = xml(svg);
  assert.equal(root.attributes.width, '360');
  const shortHeading = xml(generateSupportTimeline({ ...input, library: 'Library' }, window, { width: 360 }));
  assert.ok(Number(root.attributes.height) > Number(shortHeading.attributes.height));
  assert.ok(all(root, (node) => node.name === 'tspan').length > 10);
  assert.match(svg, /lengthAdjust="spacingAndGlyphs"/);
  assert.doesNotMatch(svg, /…|\.\.\./);
  assert.equal(root.attributes.height, root.attributes.viewBox.split(' ')[3]);
  const longWindow = xml(generateSupportTimeline(data(), { startDate: '2020-01-01', endDate: '2030-12-31' }, { width: 360 }));
  assert.ok(Number(longWindow.attributes.width) >= 11 * 54 + 48);
});

test('generation and validation do not mutate inputs and output is deterministic across timezones', async () => {
  const input = data(branch());
  Object.freeze(input.branches[0]); Object.freeze(input.branches); Object.freeze(input); Object.freeze(window);
  assert.equal(generateSupportTimeline(input, window), generateSupportTimeline(structuredClone(input), structuredClone(window)));
  const script = `import { generateSupportTimeline } from './scripts/roadmap-timeline.mjs'; process.stdout.write(generateSupportTimeline(${JSON.stringify(input)}, ${JSON.stringify(window)}));`;
  const first = await run(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: 'Pacific/Honolulu' } });
  const second = await run(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: 'Europe/Paris' } });
  assert.equal(first.stdout, second.stdout);
});

test('invalid calendar dates and formats identify the affected library, branch and field', () => {
  for (const date of ['2023-02-29', '2024-04-31', '2024-13-01', '2024-00-01', '2024-01-00', '0000-01-01', '2024-1-01', '2024-01-01T00:00:00Z', 20240101, '', undefined]) {
    assert.throws(() => generateSupportTimeline(data(branch({ releaseDate: date })), window), (error) => {
      assert.ok(error instanceof RoadmapDataError);
      assert.equal(error.library, 'example-library'); assert.equal(error.branch, '1.x'); assert.equal(error.field, 'releaseDate');
      return true;
    });
  }
  assert.doesNotThrow(() => validateRoadmapData(data(branch({ releaseDate: '2024-02-29' }))));
  assert.throws(() => validateRoadmapData(data(branch({ plannedReleaseDate: '1900-02-29' }))), /plannedReleaseDate/);
  assert.doesNotThrow(() => validateRoadmapData(data(branch({ plannedReleaseDate: '2000-02-29' }))));
});

test('chronological validation checks every applicable release anchor and does not compare forecasts to actual dates', () => {
  for (const changes of [
    { releaseDate: '2024-07-01' },
    { activeSupportUntil: '2023-12-31' },
    { securitySupportUntil: '2023-12-31' },
    { securitySupportUntil: '2024-06-29' },
    { status: 'planned', releaseDate: null, plannedReleaseDate: '2024-07-01' },
    { status: 'planned', releaseDate: null, plannedReleaseDate: null, activeSupportUntil: '2025-01-01' },
  ]) assert.throws(() => validateRoadmapData(data(branch(changes))), /example-library.*1\.x.*(?:cannot precede)/);
  assert.doesNotThrow(() => validateRoadmapData(data(branch({ plannedReleaseDate: '2025-01-01' }))));
});

test('schema diagnostics reject missing fields, unsupported status, duplicate versions and XML-unsafe text', () => {
  for (const changes of [{ status: 'stable' }, { status: 'released', releaseDate: null }, { status: 'planned' }, { version: '' }, { php: 80400 }, { notes: '\u0001' }, { version: '\ud800' }]) {
    assert.throws(() => validateRoadmapData(data(branch(changes))), RoadmapDataError);
  }
  const missing = branch(); delete missing.activeSupportUntil;
  assert.throws(() => validateRoadmapData(data(missing)), /activeSupportUntil.*required/);
  assert.throws(() => validateRoadmapData(data(branch({ released: true }))), /branch.released.*not a supported field/);
  assert.throws(() => validateRoadmapData(data(branch(), branch())), /version.*unique/);
  assert.throws(() => validateRoadmapData({ library: 'demo', branches: null }), /branches.*array/);
  assert.throws(() => validateRoadmapData(null), RoadmapDataError);
});

test('window diagnostics reject impossible dates, reversed or equal bounds, and unknown fields', () => {
  for (const input of [
    { startDate: '2024-02-30', endDate: '2024-12-31' },
    { startDate: '2024-12-31', endDate: '2024-01-01' },
    { startDate: '2024-01-01', endDate: '2024-01-01' },
    { startDate: '2024-01-01', endDate: null },
    { ...window, end: '2025-01-01' },
  ]) assert.throws(() => generateSupportTimeline(data(branch()), input), /example-library.*display window/);
  for (const width of [0, 359, 360.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '960']) assert.throws(() => generateSupportTimeline(data(), window, { width }), /Timeline width/);
});

test('one library JSON and one shared window JSON expose the same validated data to SVG and table consumers', async () => {
  const files = fileURLToPath(new URL('./fixtures/roadmaps/', import.meta.url));
  const { roadmap, window: bounds } = await readRoadmapData(path.join(files, 'example-library.json'), path.join(files, 'window.json'));
  assert.equal(roadmap.library, 'example-library');
  assert.equal(roadmap.branches[0].php, '^8.3');
  assert.equal(roadmap.branches[1].status, 'planned');
  assert.equal(roadmap.branches[2].plannedReleaseDate, null);
  assert.equal(rows(generateSupportTimeline(roadmap, bounds)).length, 3);
  assert.equal(generateSupportTimeline(roadmap, bounds), await readFile(new URL('../static/assets/diagrams/support-timeline-example.svg', import.meta.url), 'utf8'));
});

test('CLI writes the function output and preserves an existing output on invalid input', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'roadmap-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const libraryFile = path.join(directory, 'example-library.json');
  const windowFile = path.join(directory, 'window.json');
  const destination = path.join(directory, 'timeline.svg');
  const input = data(branch());
  await writeFile(libraryFile, JSON.stringify(input));
  await writeFile(windowFile, JSON.stringify(window));
  await run(process.execPath, ['scripts/generate-roadmap-timeline.mjs', libraryFile, windowFile, destination, '360']);
  const output = await readFile(destination, 'utf8');
  assert.equal(output, generateSupportTimeline(input, window, { width: 360 }));
  await writeFile(libraryFile, JSON.stringify(data(branch({ releaseDate: '2024-02-30' }))));
  await assert.rejects(run(process.execPath, ['scripts/generate-roadmap-timeline.mjs', libraryFile, windowFile, destination]), /example-library.*1\.x.*releaseDate/);
  assert.equal(await readFile(destination, 'utf8'), output);
  await assert.rejects(run(process.execPath, ['scripts/generate-roadmap-timeline.mjs']), /Usage:/);
});

test('file failures and mismatched library filenames are actionable and cannot silently supply defaults', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'roadmap-data-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'example-library.json');
  const bounds = path.join(directory, 'window.json');
  await writeFile(bounds, JSON.stringify(window));
  await writeFile(file, JSON.stringify(data(branch())));
  const read = await readRoadmapData(file, bounds);
  assert.deepEqual(read.roadmap, data(branch()));
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), data(branch()));
  await assert.rejects(readRoadmapData(path.join(directory, 'missing.json'), bounds), /Cannot read roadmap JSON.*missing.json/);
  await writeFile(file, '{');
  await assert.rejects(readRoadmapData(file, bounds), /Cannot read roadmap JSON.*example-library.json/);
  await writeFile(file, JSON.stringify({ ...data(branch()), library: 'other-library' }));
  await assert.rejects(readRoadmapData(file, bounds), /other-library.*must match the library JSON filename/);
});


test('visible timeline labels use branch versions inside active bars without verbose metadata', () => {
  const svg = generateSupportTimeline(data(branch(), branch({ version: '2.x', status: 'planned', releaseDate: null, plannedReleaseDate: '2024-02-01' })), window);
  const root = xml(svg);
  const visible = all(root, (node) => node.name === 'text' || node.name === 'tspan').map((node) => node.text).join(' ');
  assert.doesNotMatch(visible, /Display window:|— Released|— Planned|Active support until:|security support until:|PHP:|Arrows indicate|Dashed outlines mark|Unannounced dates create/);
  for (const [index, label] of ['Branch v1.x', 'Branch v2.x'].entries()) {
    const bar = kinds(rows(svg)[index], 'active')[0];
    const text = bar.children.find((node) => node.name === 'text');
    assert.equal(text.text, label);
    const shape = bar.children.find((node) => node.name === 'rect');
    assert.ok(Number(text.attributes.x) > Number(shape.attributes.x));
    assert.ok(Number(text.attributes.x) < Number(shape.attributes.x) + Number(shape.attributes.width));
  }
});


test('branch bars have zero spacing from the calendar and each other', () => {
  const svg = generateSupportTimeline(data(branch(), branch({ version: '2.x' })), window);
  const [first, second] = rows(svg);
  const firstBar = rect(first, 'active').attributes;
  const secondBar = rect(second, 'active').attributes;
  assert.equal(Number(secondBar.y), Number(firstBar.y) + Number(firstBar.height));
  const axis = xml(svg).children.find((node) => node.name === 'g').children.find((node) => node.name === 'path');
  const axisY = Number(axis.attributes.d.split(' ')[2]);
  assert.equal(Number(firstBar.y), axisY);
  for (const row of [first, second]) {
    const background = row.children.find((node) => node.name === 'rect').attributes;
    const bar = rect(row, 'active').attributes;
    assert.equal(background.y, bar.y);
    assert.equal(background.height, bar.height);
  }
});
