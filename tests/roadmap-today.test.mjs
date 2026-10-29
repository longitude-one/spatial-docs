import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { todayMarkerPosition, installTimelineToday } from '../src/roadmap-today.mjs';

const first = Date.UTC(2024, 0, 1) / 86400000;
const layout = { first, last: first + 366, width: 960, height: 300, left: 24, right: 936, top: 70, bottom: 166 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`);

test('today uses the shared inclusive day axis, leap-day spacing and only the bar area', () => {
  const start = todayMarkerPosition(layout, new Date(2024, 0, 1, 23, 59));
  close(start.left, 2.5);
  close(start.top, 70 / 300 * 100);
  close(start.height, 96 / 300 * 100);
  assert.equal(start.date, '2024-01-01');
  const leap = todayMarkerPosition(layout, new Date(2024, 1, 29, 12));
  close(leap.left, (24 + 912 * 59 / 366) / 960 * 100);
  const end = todayMarkerPosition(layout, new Date(2024, 11, 31, 23, 59));
  close(end.left, (24 + 912 * 365 / 366) / 960 * 100);
  assert.equal(todayMarkerPosition(layout, new Date(2023, 11, 31)), null);
  assert.equal(todayMarkerPosition(layout, new Date(2025, 0, 1)), null);
});

test('date positions use the visitor calendar day across timezones rather than the build timezone', async () => {
  const run = promisify(execFile);
  const source = `import { todayMarkerPosition } from './src/roadmap-today.mjs'; console.log(JSON.stringify(todayMarkerPosition(${JSON.stringify(layout)}, new Date('2024-03-01T00:30:00Z'))));`;
  for (const [timezone, expected] of [['Pacific/Honolulu', '2024-02-29'], ['Europe/Paris', '2024-03-01']]) {
    const { stdout } = await run(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env, TZ: timezone } });
    assert.equal(JSON.parse(stdout).date, expected);
  }
});

test('invalid or unavailable calendar geometry does not create a misleading marker', () => {
  for (const input of [null, {}, { ...layout, width: 0 }, { ...layout, last: first }, { ...layout, bottom: 301 }, { ...layout, right: 1000 }]) {
    assert.equal(todayMarkerPosition(input, new Date(2024, 0, 1)), null);
  }
  assert.equal(todayMarkerPosition(layout, new Date('invalid')), null);
});

function fixture(raw = JSON.stringify(layout)) {
  const events = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const link = {
    marker: null,
    querySelector() { return this.marker; },
    append(marker) { this.marker = marker; },
  };
  const timeline = { querySelector: () => link, getAttribute: () => raw };
  const document = {
    visibilityState: 'visible',
    querySelectorAll: () => [timeline],
    createElement: () => ({ style: {}, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, remove() { link.marker = null; } }),
    addEventListener: (name, listener) => events.set(name, listener),
    removeEventListener: (name) => events.delete(name),
  };
  const browser = {
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    addEventListener: (name, listener) => events.set(name, listener),
    removeEventListener: (name) => events.delete(name),
  };
  return { document, browser, events, timers, link };
}

test('an open page refreshes at local midnight, on visibility and on page restore without duplicating markers', () => {
  const { document, browser, events, timers, link } = fixture();
  let now = new Date(2024, 1, 28, 23, 59, 59);
  const stop = installTimelineToday(document, browser, () => now);
  assert.equal(link.marker.attributes['aria-label'], 'Today: 2024-02-28');
  assert.equal(link.marker.attributes.role, 'img');
  assert.equal([...timers.values()][0].delay, 1100);
  const marker = link.marker;
  const before = marker.style.left;
  now = new Date(2024, 1, 29);
  [...timers.values()][0].callback();
  assert.equal(link.marker, marker);
  assert.notEqual(marker.style.left, before);
  assert.equal(marker.attributes['aria-label'], 'Today: 2024-02-29');
  assert.equal(timers.size, 1);
  now = new Date(2024, 2, 1);
  document.visibilityState = 'hidden';
  events.get('visibilitychange')();
  assert.equal(marker.attributes['aria-label'], 'Today: 2024-02-29');
  document.visibilityState = 'visible';
  events.get('visibilitychange')();
  assert.equal(marker.attributes['aria-label'], 'Today: 2024-03-01');
  now = new Date(2025, 0, 1);
  events.get('pageshow')();
  assert.equal(link.marker, null, 'The marker disappears when today leaves the display window');
  stop();
  assert.equal(timers.size, 0);
  assert.equal(events.size, 0);
});

test('invalid metadata is harmless and can never supply an inline script to the marker', () => {
  const { document, browser, link } = fixture('<script>bad</script>');
  const stop = installTimelineToday(document, browser, () => new Date(2024, 0, 1));
  assert.equal(link.marker, null);
  stop();
});
