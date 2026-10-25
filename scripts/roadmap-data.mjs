import { readFile } from 'node:fs/promises';
import path from 'node:path';

const day = 86400000;
const dateFields = ['plannedReleaseDate', 'releaseDate', 'activeSupportUntil', 'securitySupportUntil'];
const branchFields = ['version', 'status', ...dateFields, 'php', 'notes'];
const invalidXml = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u;

export class RoadmapDataError extends Error {
  constructor(library, branch, field, reason) {
    super(`Roadmap ${JSON.stringify(library)}, branch ${JSON.stringify(branch)}, ${field}: ${reason}`);
    this.name = 'RoadmapDataError';
    this.library = library;
    this.branch = branch;
    this.field = field;
  }
}

function fail(context, field, reason) {
  throw new RoadmapDataError(context.library, context.branch, field, reason);
}

function record(value, fields, context, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(context, field, 'must be an object.');
  for (const key of fields) {
    if (!Object.hasOwn(value, key)) fail(context, `${field}.${key}`, 'is required; use null for unannounced values.');
  }
  for (const key of Object.keys(value)) {
    if (!fields.includes(key)) fail(context, `${field}.${key}`, 'is not a supported field.');
  }
}

function text(value, context, field, nullable = false) {
  if (nullable && value === null) return value;
  if (typeof value !== 'string' || !value.trim() || invalidXml.test(value)) {
    fail(context, field, `must be ${nullable ? 'null or ' : ''}non-empty XML-safe text.`);
  }
  return value;
}

/** Calendar days in UTC; a support-until date includes that complete day. */
export function calendarDay(value, context, field) {
  if (typeof value !== 'string' || !/^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) {
    fail(context, field, 'must be a real date in YYYY-MM-DD format.');
  }
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    fail(context, field, `is not a real calendar date: ${JSON.stringify(value)}.`);
  }
  return timestamp / day;
}

/** Return a validated copy shared by SVG generation and the roadmap table. */
export function validateRoadmapData(input) {
  const context = { library: typeof input?.library === 'string' ? input.library : '<unknown library>', branch: '<configuration>' };
  record(input, ['library', 'branches'], context, 'roadmap');
  const library = text(input.library, context, 'library');
  if (!Array.isArray(input.branches)) fail(context, 'branches', 'must be an array.');
  const versions = new Set();
  const branches = input.branches.map((branch, index) => {
    const at = { library, branch: typeof branch?.version === 'string' ? branch.version : `index ${index}` };
    record(branch, branchFields, at, 'branch');
    const version = text(branch.version, at, 'version');
    if (versions.has(version)) fail(at, 'version', 'must be unique within this library.');
    versions.add(version);
    if (!['planned', 'released'].includes(branch.status)) fail(at, 'status', 'must be planned or released.');
    const result = { version, status: branch.status };
    const dates = {};
    for (const field of dateFields) {
      dates[field] = branch[field] === null ? null : calendarDay(branch[field], at, field);
      result[field] = branch[field];
    }
    if (branch.status === 'released' && branch.releaseDate === null) fail(at, 'releaseDate', 'a released branch requires an actual release date.');
    if (branch.status === 'planned' && branch.releaseDate !== null) fail(at, 'releaseDate', 'a planned branch must use plannedReleaseDate, not an actual release date.');
    const release = branch.status === 'released' ? dates.releaseDate : dates.plannedReleaseDate;
    for (const field of ['activeSupportUntil', 'securitySupportUntil']) {
      if (release !== null && dates[field] !== null && dates[field] < release) fail(at, field, 'cannot precede the applicable release date.');
    }
    if (dates.activeSupportUntil !== null && dates.securitySupportUntil !== null && dates.securitySupportUntil < dates.activeSupportUntil) {
      fail(at, 'securitySupportUntil', 'cannot precede activeSupportUntil.');
    }
    result.php = text(branch.php, at, 'php', true);
    result.notes = text(branch.notes, at, 'notes', true);
    return result;
  });
  return { library, branches };
}

export function validateTimelineWindow(input, library = '<global window>') {
  const context = { library, branch: '<display window>' };
  record(input, ['startDate', 'endDate'], context, 'window');
  const start = calendarDay(input.startDate, context, 'startDate');
  const end = calendarDay(input.endDate, context, 'endDate');
  if (end <= start) fail(context, 'endDate', 'must be after startDate.');
  return { startDate: input.startDate, endDate: input.endDate };
}

async function jsonFile(filename) {
  try {
    return JSON.parse(await readFile(filename, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read roadmap JSON ${filename}: ${error.message}`, { cause: error });
  }
}

/** Read one library JSON and one shared display-window JSON without altering either file. */
export async function readRoadmapData(libraryFile, windowFile) {
  const [libraryInput, windowInput] = await Promise.all([jsonFile(libraryFile), jsonFile(windowFile)]);
  const roadmap = validateRoadmapData(libraryInput);
  if (path.basename(libraryFile, '.json') !== roadmap.library) {
    throw new RoadmapDataError(roadmap.library, '<configuration>', 'library', 'must match the library JSON filename.');
  }
  return { roadmap, window: validateTimelineWindow(windowInput, roadmap.library) };
}
