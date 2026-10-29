import { calendarDay, validateRoadmapData, validatePhpReference, validateTimelineWindow } from './roadmap-data.mjs';

// LongitudeOne identity from src/css/custom.css. The opaque background remains stable in either site theme.
const colors = { background: '#f7f3eb', surface: '#fffcf7', text: '#172b40', active: '#35546b', security: '#a66a35', planned: '#c58a51' };
const phpColors = { active: '#aebbc2', security: '#d8ccbd', outline: '#647078' };
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

function period(kind, start, end, label, geometry, y, planned, branchLabel, secondary = false) {
  const { first, last, x } = geometry;
  // Intervals are half-open internally, with one added day for inclusive support end dates.
  if (end <= first || start >= last) return '';
  const before = start < first;
  const after = end > last;
  const left = x(Math.max(start, first));
  const right = x(Math.min(end, last));
  const fill = secondary
    ? (kind === 'active' ? phpColors.active : 'url(#php-security-pattern)')
    : (kind === 'active' ? colors.active : 'url(#security-pattern)');
  const halfHeight = secondary ? 8 : 12;
  let result = `<g data-kind="${kind}" data-start="${start}" data-end="${end}" data-continues-before="${before}" data-continues-after="${after}">`;
  // PHP details belong only to the non-visible description, without tooltip commentary.
  if (!secondary) result += `<title>${escape(label)}${before ? '; continues before display window' : ''}${after ? '; continues after display window' : ''}</title>`;
  result += `<rect x="${number(left)}" y="${y - halfHeight}" width="${number(right - left)}" height="${halfHeight * 2}" fill="${fill}" stroke="${secondary ? phpColors.outline : colors.text}" stroke-width="1"${planned ? ' stroke-dasharray="4 3"' : ''}/>`;
  if (kind === 'active' && branchLabel) {
    const available = Math.max(1, right - left - 28);
    const fit = Array.from(branchLabel).length * 8 > available ? ` textLength="${number(available)}" lengthAdjust="spacingAndGlyphs"` : '';
    result += `<text x="${number((left + right) / 2)}" y="${y + 5}" text-anchor="middle" font-size="14" font-weight="600" fill="${colors.background}"${fit}>${escape(branchLabel)}</text>`;
  }
  // Continuation arrows remain distinct against each group's support fills.
  if (before) result += `<path d="M ${number(left + 8)} ${y - 6} l -6 6 6 6" fill="none" stroke="${secondary ? phpColors.outline : colors.background}" stroke-width="2"/>`;
  if (after) result += `<path d="M ${number(right - 8)} ${y - 6} l 6 6 -6 6" fill="none" stroke="${secondary ? phpColors.outline : colors.background}" stroke-width="2"/>`;
  return `${result}</g>`;
}

/** Build a standalone SVG and its shared calendar geometry without consulting the clock. */
export function buildSupportTimeline(input, displayWindow, { width: requestedWidth = 960, phpReference = null } = {}) {
  const roadmap = validateRoadmapData(input);
  const php = phpReference === null ? null : validatePhpReference(phpReference);
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
  const title = `${roadmap.library} support timeline`;
  const heading = wrap(title, Math.floor(plotWidth / 20));
  let y = 32 + heading.length * 20;
  const axisY = y + 18;
  const geometry = { first, last, x: (date) => 24 + plotWidth * (date - first) / (last - first) };
  const rows = [];
  const description = [`${title}. Display window ${window.startDate} through ${window.endDate}.`];
  // The first bar starts at the calendar baseline.
  y = axisY - 2;
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
    const branchLabel = `Branch v${branch.version.replace(/^v/u, '')}`;
    const trackY = y + 14;
    let row = `<g data-branch="${escape(branch.version)}" data-status="${branch.status}"><rect x="12" y="${trackY - 12}" width="${number(width - 24)}" height="24" fill="${index % 2 ? colors.background : colors.surface}"/>`;
    row += `<path d="M 24 ${trackY} H ${number(width - 24)}" stroke="${colors.text}" stroke-opacity="0.25"/>`;
    for (const tick of years) row += `<path d="M ${number(geometry.x(tick.position))} ${trackY - 12} v 24" stroke="${colors.text}" stroke-opacity="0.18"/>`;
    if (release !== null && active !== null) row += period('active', release, active + 1, `Active support: ${releaseDate} through ${branch.activeSupportUntil}${planned ? ' (planned)' : ''}`, geometry, trackY, planned, branchLabel);
    if (release !== null && active !== null && security !== null && security > active) {
      row += period('security', active + 1, security + 1, `Security fixes only: after ${branch.activeSupportUntil} through ${branch.securitySupportUntil}${planned ? ' (planned)' : ''}`, geometry, trackY, planned);
    }
    if (release !== null && release >= first && release < last) row += marker(branch.status, geometry.x(release), trackY, `${planned ? 'Planned release' : 'Release'}: ${releaseDate}`);
    if (release === null) row += textLines([`${branchLabel} — release unannounced`], 24, trackY + 5, { weight: 600 });
    rows.push(`${row}</g>`);
    y += 24;
  }
  if (!rows.length) { rows.push(textLines(['No branches announced.'], 24, y, { weight: 600 })); y += 48; }
  const phpRows = [];
  // Reference data alone must never establish a library roadmap.
  for (const branch of roadmap.branches.length ? php?.branches ?? [] : []) {
    const releaseDate = branch.status === 'planned' ? branch.plannedReleaseDate : branch.releaseDate;
    if (releaseDate === null || branch.activeSupportUntil === null) continue;
    const release = dayOf(releaseDate);
    const active = dayOf(branch.activeSupportUntil) + 1;
    const end = branch.securitySupportUntil === null ? active : dayOf(branch.securitySupportUntil) + 1;
    if (end <= first || release >= last) continue;
    const label = `PHP ${branch.version}`;
    description.push(`${label}; ${branch.status} release: ${releaseDate}; active support until: ${branch.activeSupportUntil}; security support until: ${shown(branch.securitySupportUntil)}.`);
    const trackY = y + 10;
    let row = `<g data-php-version="${escape(branch.version)}">`;
    row += period('active', release, active, '', geometry, trackY, branch.status === 'planned', null, true);
    if (end > active) row += period('security', active, end, '', geometry, trackY, branch.status === 'planned', null, true);
    const left = geometry.x(Math.max(release, first));
    const right = geometry.x(Math.min(end, last));
    const labelWidth = label.length * 7;
    const activeRight = geometry.x(Math.min(active, last));
    // Reserve room for continuation arrows as well as the uncompressed label.
    const activePadding = release < first || active > last ? 16 : 6;
    let anchor = 'middle';
    let labelX;
    if (activeRight - left >= labelWidth + activePadding * 2) {
      labelX = (left + activeRight) / 2;
    } else if (active < last && end > Math.max(active, first)) {
      anchor = 'start';
      const securityLeft = geometry.x(Math.max(active, first));
      const padding = active < first ? 16 : 6;
      const rightPadding = end > last ? 16 : 6;
      labelX = Math.max(30, Math.min(securityLeft + padding, width - 24 - rightPadding - labelWidth));
    } else {
      // A clipped active-only sliver still keeps its label inside the calendar.
      labelX = Math.max(24 + labelWidth / 2, Math.min(width - 24 - labelWidth / 2, (left + right) / 2));
    }
    row += `<text x="${number(labelX)}" y="${trackY + 4}" text-anchor="${anchor}" font-size="12">${escape(label)}</text>`;
    phpRows.push(`${row}</g>`);
    y += 16;
  }
  const barBottom = y + 2;
  y += 26;
  const legend = [];
  for (const [index, label] of ['Planned release (diamond)', 'Actual release (circle)', 'Active support', 'Security fixes only (hatched)'].entries()) {
    const itemY = y + index * 30;
    if (index < 2) legend.push(marker(index ? 'released' : 'planned', 34, itemY - 5, label));
    else legend.push(`<rect x="24" y="${itemY - 16}" width="20" height="16" fill="${index === 2 ? colors.active : 'url(#security-pattern)'}" stroke="${colors.text}"/>`);
    legend.push(textLines([label], 56, itemY));
  }
  y += 130;
  const height = y + 20;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${number(width)}" height="${height}" viewBox="0 0 ${number(width)} ${height}" role="img" aria-labelledby="timeline-title timeline-description">`,
    `<title id="timeline-title">${escape(title)}</title>`,
    `<desc id="timeline-description">${escape(description.join(' '))} Planned releases use diamonds, actual releases circles, active support a solid bar, and security fixes only a hatched bar. Arrows mark clipped support periods.</desc>`,
    `<defs><pattern id="security-pattern" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${colors.security}"/><path d="M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6" stroke="${colors.text}" stroke-opacity="0.45" stroke-width="1"/></pattern></defs>`,
    ...(phpRows.length ? [`<defs><pattern id="php-security-pattern" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${phpColors.security}"/><path d="M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6" stroke="${phpColors.outline}" stroke-width="1"/></pattern></defs>`] : []),
    `<rect width="100%" height="100%" fill="${colors.background}"/>`,
    `<g fill="${colors.text}" font-family="system-ui, -apple-system, sans-serif">`,
    textLines(heading, 24, 30, { size: 20, weight: 650 }),
    `<path d="M 24 ${axisY} H ${number(width - 24)}" stroke="${colors.text}"/>`,
    ...years.map((tick) => `<g data-year="${tick.year}"><path d="M ${number(geometry.x(tick.position))} ${axisY - 7} v 7" stroke="${colors.text}"/><text x="${number(geometry.x(tick.position))}" y="${axisY - 12}" text-anchor="${tick.position === first ? 'start' : 'middle'}" font-size="12">${tick.year}</text></g>`),
    ...rows, ...(phpRows.length ? [`<g data-reference="PHP">${phpRows.join('')}</g>`] : []), ...legend, '</g>', '</svg>', '',
  ].join('\n');
  return { svg, layout: { first, last, width, height, left: 24, right: width - 24, top: axisY, bottom: barBottom } };
}

/** Return a deterministic standalone SVG; browser-only decoration is not part of the portable image. */
export function generateSupportTimeline(input, displayWindow, options) {
  return buildSupportTimeline(input, displayWindow, options).svg;
}
