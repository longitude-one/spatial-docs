import { writeFile } from 'node:fs/promises';
import { readRoadmapData } from './roadmap-data.mjs';
import { generateSupportTimeline } from './roadmap-timeline.mjs';

const [libraryFile, windowFile, outputFile, width, ...extra] = process.argv.slice(2);
try {
  if (!libraryFile || !windowFile || !outputFile || extra.length) {
    throw new Error('Usage: node scripts/generate-roadmap-timeline.mjs <library.json> <window.json> <output.svg> [width]');
  }
  const { roadmap, window } = await readRoadmapData(libraryFile, windowFile);
  const svg = generateSupportTimeline(roadmap, window, width === undefined ? {} : { width: Number(width) });
  await writeFile(outputFile, svg, 'utf8');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
