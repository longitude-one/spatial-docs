import { calendarDay, validateRoadmapData, validateTimelineWindow } from './roadmap-data.mjs';

// LongitudeOne identity from src/css/custom.css. The opaque background remains stable in either site theme.
const colors = { background: '#f7f3eb', surface: '#fffcf7', text: '#172b40', active: '#35546b', security: '#a66a35', planned: '#c58a51' };
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const number = (value) => String(Math.round(value * 1000) / 1000);

function wrap(value, columns) {
  const lines = [];
  let line = '';
  for (const word of value.split(/\s+/u)) {
    const characters = Array.from(word);
    if (line && Array.from(line).length + characters.length + 1 > columns) { lines.push(line); line = ''; }
    while (characters.length > columns) {
      lines.push(characters.splice(0, columns).join(''));
    }
    if (characters.length) line += `${line ? ' ' : ''}${characters.join('')}`;
  }
  if (line) lines.push(line);
  return lines;
}

function textLines(lines, x, y, { size = 14, weight = 400 } = {}) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? 20 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
}

const dayOf = (date) => calendarDay(date, { library: '<validated>', branch: '<validated>' }, 'date');
const shown = (date) => date ?? 'unannounced';

function marker(kind, x, y, title) {
  const shape = kind === 'planned'
    ? `<path d="M ${number(x)} ${y - 7} l 7 7 -7 7 -7 -7 Z" fill="${colors.planned}"/>`
    : `<circle cx="${number(x)}" cy="${y}" r="5" fill="${colors.text}"/>`;
  return `<g data-kind="${kind}-release" stroke="${colors.text}" stroke-width="1.5"><title>${escape(title)}</title>${shape}</g>`;
}

function period(kind, start, end, label, geometry, y, planned) {
  const { first, last, x } = geometry;
  // Intervals are half-open internally, with one added day for inclusive support end dates.
  if (end <= first || start >= last) return '';
  const before = start < first;
  const after = end > last;
  const left = x(Math.max(start, first));
  const right = x(Math.min(end, last));
  const fill = kind === 'active' ? colors.active : 'url(#security-pattern)';
  let result = `<g data-kind="${kind}" data-start="${start}" data-end="${end}" data-continues-before="${before}" data-continues-after="${after}"><title>${escape(label)}${before ? '; continues before display window' : ''}${after ? '; continues after display window' : ''}</title>`;
  result += `<rect x="${number(left)}" y="${y - 12}" width="${number(right - left)}" height="24" fill="${fill}" stroke="${colors.text}" stroke-width="1"${planned ? ' stroke-dasharray="4 3"' : ''}/>`;
  // White arrows remain visible against both support fills, without relying on color alone.
  if (before) result += `<path d="M ${number(left + 8)} ${y - 6} l -6 6 6 6" fill="none" stroke="${colors.background}" stroke-width="2"/>`;
  if (after) result += `<path d="M ${number(right - 8)} ${y - 6} l 6 6 -6 6" fill="none" stroke="${colors.background}" stroke-width="2"/>`;
  return `${result}</g>`;
}

/** Return a deterministic standalone SVG; no clock, support-duration policy or version classification is consulted. */
export function generateSupportTimeline(input, displayWindow, { width: requestedWidth = 960 } = {}) {
  const roadmap = validateRoadmapData(input);
  const window = validateTimelineWindow(displayWindow, roadmap.library);
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 360) throw new Error('Timeline width must be a safe integer of at least 360 pixels.');
  const first = dayOf(window.startDate);
  const last = dayOf(window.endDate) + 1;
  const years = [];
  for (let year = Number(window.startDate.slice(0, 4)); year <= Number(window.endDate.slice(0, 4)); year++) {
    const date = `${String(year).padStart(4, '0')}-01-01`;
    const position = dayOf(date);
    if (position >= first && position < last) years.push({ year, position });
  }
  // Preserve room for every annual label even if a caller requests a very narrow or unusually long calendar.
  const width = Math.max(requestedWidth, (Number(window.endDate.slice(0, 4)) - Number(window.startDate.slice(0, 4)) + 1) * 54 + 48);
  const plotWidth = width - 48;
  // A conservative one-em character budget also leaves room for wide Unicode glyphs.
  const columns = Math.floor(plotWidth / 14);
  const title = `${roadmap.library} support timeline`;
  const heading = wrap(title, Math.floor(plotWidth / 20));
  const windowLabel = wrap(`Display window: ${window.startDate} to ${window.endDate}`, columns);
  let y = 32 + heading.length * 20;
  const axisY = y + windowLabel.length * 20 + 38;
  const geometry = { first, last, x: (date) => 24 + plotWidth * (date - first) / (last - first) };
  const rows = [];
  const description = [`${title}. Display window ${window.startDate} through ${window.endDate}.`];
  y = axisY + 32;
  for (const [index, branch] of roadmap.branches.entries()) {
    const planned = branch.status === 'planned';
    const releaseDate = planned ? branch.plannedReleaseDate : branch.releaseDate;
    const release = releaseDate === null ? null : dayOf(releaseDate);
    const active = branch.activeSupportUntil === null ? null : dayOf(branch.activeSupportUntil);
    const security = branch.securitySupportUntil === null ? null : dayOf(branch.securitySupportUntil);
    const label = `Branch ${branch.version} — ${planned ? 'Planned' : 'Released'}; ${planned ? 'planned release' : 'release'}: ${shown(releaseDate)}`;
    const support = `Active support until: ${shown(branch.activeSupportUntil)}; security support until: ${shown(branch.securitySupportUntil)}.`;
    const metadata = `PHP: ${branch.php ?? 'unannounced'}.${branch.notes === null ? '' : ` Notes: ${branch.notes}`}`;
    description.push(`${label}. ${support} ${metadata}`);
    const labels = wrap(label, columns);
    const details = wrap(`${support} ${metadata}`, columns);
    const trackY = y + labels.length * 20 + 14;
    const bottom = trackY + 34 + details.length * 20;
    let row = `<g data-branch="${escape(branch.version)}" data-status="${branch.status}"><rect x="12" y="${y - 17}" width="${number(width - 24)}" height="${bottom - y + 9}" rx="4" fill="${index % 2 ? colors.background : colors.surface}"/>`;
    row += textLines(labels, 24, y, { weight: 600 });
    row += `<path d="M 24 ${trackY} H ${number(width - 24)}" stroke="${colors.text}" stroke-opacity="0.25"/>`;
    for (const tick of years) row += `<path d="M ${number(geometry.x(tick.position))} ${trackY - 17} v 34" stroke="${colors.text}" stroke-opacity="0.18"/>`;
    if (release !== null && active !== null) row += period('active', release, active + 1, `Active support: ${releaseDate} through ${branch.activeSupportUntil}${planned ? ' (planned)' : ''}`, geometry, trackY, planned);
    if (release !== null && active !== null && security !== null && security > active) {
      row += period('security', active + 1, security + 1, `Security fixes only: after ${branch.activeSupportUntil} through ${branch.securitySupportUntil}${planned ? ' (planned)' : ''}`, geometry, trackY, planned);
    }
    if (release !== null && release >= first && release < last) row += marker(branch.status, geometry.x(release), trackY, `${planned ? 'Planned release' : 'Release'}: ${releaseDate}`);
    row += textLines(details, 24, trackY + 38);
    rows.push(`${row}</g>`);
    y = bottom + 26;
  }
  if (!rows.length) { rows.push(textLines(['No branches announced.'], 24, y, { weight: 600 })); y += 48; }
  const legend = [];
  for (const [index, label] of ['Planned release (diamond)', 'Actual release (circle)', 'Active support', 'Security fixes only (hatched)'].entries()) {
    const itemY = y + index * 30;
    if (index < 2) legend.push(marker(index ? 'released' : 'planned', 34, itemY - 5, label));
    else legend.push(`<rect x="24" y="${itemY - 16}" width="20" height="16" fill="${index === 2 ? colors.active : 'url(#security-pattern)'}" stroke="${colors.text}"/>`);
    legend.push(textLines([label], 56, itemY));
  }
  y += 130;
  const footnote = wrap('Arrows indicate support continuing beyond the display window. Dashed outlines mark announced support for planned branches. Unannounced dates create no periods.', columns);
  const height = y + footnote.length * 20 + 20;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${number(width)}" height="${height}" viewBox="0 0 ${number(width)} ${height}" role="img" aria-labelledby="timeline-title timeline-description">`,
    `<title id="timeline-title">${escape(title)}</title>`,
    `<desc id="timeline-description">${escape(description.join(' '))} Planned releases use diamonds, actual releases circles, active support a solid bar, and security fixes only a hatched bar. Arrows mark clipped support periods.</desc>`,
    `<defs><pattern id="security-pattern" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${colors.security}"/><path d="M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6" stroke="${colors.text}" stroke-opacity="0.45" stroke-width="1"/></pattern></defs>`,
    `<rect width="100%" height="100%" fill="${colors.background}"/>`,
    `<g fill="${colors.text}" font-family="system-ui, -apple-system, sans-serif">`,
    textLines(heading, 24, 30, { size: 20, weight: 650 }),
    textLines(windowLabel, 24, axisY - windowLabel.length * 20 - 14),
    `<path d="M 24 ${axisY} H ${number(width - 24)}" stroke="${colors.text}"/>`,
    ...years.map((tick) => `<g data-year="${tick.year}"><path d="M ${number(geometry.x(tick.position))} ${axisY - 7} v 7" stroke="${colors.text}"/><text x="${number(geometry.x(tick.position))}" y="${axisY - 12}" text-anchor="${tick.position === first ? 'start' : 'middle'}" font-size="12">${tick.year}</text></g>`),
    ...rows, ...legend, textLines(footnote, 24, y), '</g>', '</svg>', '',
  ].join('\n');
}
