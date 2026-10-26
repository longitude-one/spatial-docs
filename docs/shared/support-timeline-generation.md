---
title: Generating library support timelines
description: Generate deterministic SVG support calendars from a shared library roadmap JSON contract and site-wide display bounds.
---

The Node.js timeline generator turns announced release and support dates into a standalone SVG.
It follows the shared calendar layout of [PHP's Supported Versions page](https://www.php.net/supported-versions.php),
using LongitudeOne's colors and absolute dates. It does not copy PHP's support durations.

Every library roadmap uses this JSON contract for its generated timeline and support table.
The Markdown export step generates the images before asset validation; Docusaurus and portable Markdown receive the same table data.
Packagist-based documentation version classification remains independent of this roadmap configuration.

## Example calendar

The dates below are fictional fixture data, not a support commitment for a LongitudeOne library.

![Fictional library branches with actual and planned releases, announced support periods, and a branch whose schedule remains unannounced.](../assets/diagrams/support-timeline-example.svg)

Each branch has a labeled track on the same annual axis. A diamond marks a planned release; a circle marks an actual release.
Solid slate bars show active support and hatched cognac bars show security fixes only.
Announced support for planned branches has a dashed outline and remains a forecast.
Arrows indicate a support period extending beyond the common display bounds.

## One JSON file per library

The integration layout is `config/roadmaps/<library>.json`, with a separate `config/roadmaps/window.json` for all libraries.
The loader requires the library filename to match its `library` value; `example-library.json` therefore contains `"library": "example-library"`.
The executable example uses the fixtures under `tests/fixtures/roadmaps/` instead of configuring real library dates.

```json
{
  "library": "example-library",
  "branches": [
    {
      "version": "2.x",
      "status": "planned",
      "plannedReleaseDate": "2027-02-01",
      "releaseDate": null,
      "activeSupportUntil": "2028-12-31",
      "securitySupportUntil": "2029-12-31",
      "php": "^8.4",
      "notes": null
    }
  ]
}
```

| Field | Required value |
| --- | --- |
| `library` | Non-empty library identifier matching the JSON basename. |
| `branches` | Array in display order. An empty array is allowed. |
| `version` | Non-empty label, unique within the library, such as `1.x`. |
| `status` | Explicit `planned` or `released`. Calendar time never changes this value. |
| `plannedReleaseDate` | Forecast date, or `null` when unannounced. A released branch may retain its historical forecast. |
| `releaseDate` | Actual initial release date, required for `released`; must be `null` for `planned`. |
| `activeSupportUntil` | Explicit last day of active support, or `null` when unannounced. |
| `securitySupportUntil` | Explicit last day of security support, or `null` when unannounced. |
| `php` | Announced Composer constraint as text, or `null`. The timeline does not interpret Composer syntax. |
| `notes` | Non-empty explanatory text, or `null`. |

All fields are mandatory. Use `null` rather than omitting an unannounced value. Unknown keys are rejected to catch configuration typos.
Dates must be real calendar dates in `YYYY-MM-DD` format, with years from `0001` to `9999`.
Text must be non-empty and valid in XML; the renderer escapes markup characters in text and attributes.
No branch is required to have a stable release, a forecast or announced support dates.

## Shared display window

```json
{
  "startDate": "2024-01-01",
  "endDate": "2029-12-31"
}
```

Both fields are required. `endDate` must follow `startDate`; both boundary dates are included.
Use the same object for every library to keep date positions comparable. The renderer does not select a window from today's date.
Every January 1 inside the bounds has an annual graduation, including correct leap-year spacing.
Dates outside the window remain in branch labels and descriptions even when their marker is not visible.

## Period rules and unknown data

The applicable release date is `releaseDate` for a released branch and `plannedReleaseDate` for a planned branch.
Support end dates cannot precede that date when it is known. When both support ends are announced,
`securitySupportUntil` cannot precede `activeSupportUntil`.
The forecast and actual release may differ; the generator does not require one to precede the other.

| Announced dates | Rendered result |
| --- | --- |
| Planned release only | Diamond at that date; no support periods. |
| Applicable release and active-support end | Active bar from release through the complete final active-support day. |
| Applicable release and both support ends | Active bar, followed by security-only support beginning on the next day. |
| Equal active and security ends | Active bar only; no security-only days are invented. |
| Security end without active end | No support bar: the transition to security-only support is unknown. |
| Support ends without a release or forecast | No support bar: its starting date is unknown. |
| No dates | Labeled branch with unannounced values; no marker or period. |
| No branches | Calendar stating that no branches are announced. |

A `null` end date does not mean indefinite support. Only announced, placeable periods are drawn.
The implementation uses UTC calendar days and treats support end dates as inclusive; interval geometry ends at the start of the following day.
No countdown, elapsed duration, current-date marker or automatic release-state promotion is generated.

## Node.js API

```js
import { readRoadmapData } from './scripts/roadmap-data.mjs';
import { generateSupportTimeline } from './scripts/roadmap-timeline.mjs';

const { roadmap, window } = await readRoadmapData(
  'tests/fixtures/roadmaps/example-library.json',
  'tests/fixtures/roadmaps/window.json',
);
const svg = generateSupportTimeline(roadmap, window);
```

| API | Result |
| --- | --- |
| `validateRoadmapData(input)` | Validated copy of the library data, retaining explicit null values and branch order. |
| `validateTimelineWindow(input, library?)` | Validated copy of display bounds; optional library text adds diagnostic context. |
| `readRoadmapData(libraryFile, windowFile)` | Promise resolving to `{ roadmap, window }`, ready for both image and table consumers. |
| `generateSupportTimeline(roadmap, window, options?)` | UTF-8 SVG string with an accessible title, description, rows, axis and legend. No input mutation or file write. |

The validators and `RoadmapDataError` are exported from `scripts/roadmap-data.mjs`.
`options.width` defaults to `960` and must be a safe integer of at least `360` pixels.
The SVG may be wider than requested to preserve at least 54 pixels per displayed year; its `viewBox` preserves all content when scaled.
Long headings wrap. Branch names appear inside active-support bars; detailed dates and notes remain in the accessible description and support table.
The opaque ivory background, site-palette text, patterned security bars and distinct marker shapes remain readable independently of the surrounding theme.
When an image is rendered narrower than its intrinsic width, allow zoom or horizontal scrolling in the consuming layout.

### Command-line generation

Run this from the repository root; the destination directory must already exist:

```sh
node scripts/generate-roadmap-timeline.mjs tests/fixtures/roadmaps/example-library.json tests/fixtures/roadmaps/window.json example-library.svg
```

An optional fourth argument sets the width. For example, append `360` for a compact calendar.
The CLI validates all inputs before writing the SVG; an input error leaves an existing output file unchanged and returns a nonzero exit status.
Identical input data and options produce byte-identical SVG, without a network request or dependency on the clock, locale or timezone.

## Diagnostics and verification

Invalid data throws `RoadmapDataError`, with `library`, `branch` and `field` properties.
For example, a support end before the applicable release date identifies the library, branch and offending support field.
Global-window errors identify the library and `<display window>`; unreadable or malformed JSON errors identify the source filename.
Invalid renderer widths produce an ordinary `Error` describing the allowed width.

```text
Roadmap "example-library", branch "2.x", activeSupportUntil: cannot precede the applicable release date.
```

Run `node --test tests/roadmap-timeline.test.mjs` for dates, placement, transitions, clipping, unknown values, escaping,
diagnostics, file loading and determinism checks. The fixture SVG in this page is generated by the same CLI:

```sh
node scripts/generate-roadmap-timeline.mjs tests/fixtures/roadmaps/example-library.json tests/fixtures/roadmaps/window.json static/assets/diagrams/support-timeline-example.svg
```

## Maintaining library roadmaps

Edit `config/roadmaps/<library>.json` to update a roadmap. Both the SVG and table consume that file on the next build.
The library landing page is `docs/<library>/index.md`. Keep its required `title` and `description` front matter appropriate to the library.
The build replaces the entire body with the generated timeline and table in both HTML and portable Markdown; it does not append to existing prose.
Source files are not rewritten during the build. Version landing pages such as `docs/<library>/v2/index.md` remain separate and unchanged.
Do not keep a separate library-level `roadmap.md` page or a hand-written support table.

A missing library JSON file, a blank file, an empty JSON object (`{}`), or a valid configuration with no branches displays:

> The roadmap for this library has not been established yet.

No timeline or support table is generated in that case, and a previously generated image is removed on the next export.
A populated branch list remains configured even if every date is `null`. Malformed non-empty JSON, invalid populated data,
and configurations for unknown libraries fail the build with an error. An otherwise empty branch list must still satisfy the full schema.
The shared display-window file is required when at least one configured roadmap needs a timeline.

Each branch matching a documented major (for example `2.x`) links to that version's published landing page when it exists:
`v2/index.md` in portable Markdown and the corresponding explicit `.html` resource on the website.
A missing, draft, or unlisted version landing page leaves the branch label as plain text. No documentation page is invented.
Published version landing pages absent from the branch list remain accessible through a short documentation-version list below the support table.
When no roadmap is established, that list follows the default message; it is navigation, not a support schedule.
Navigation and version-status messages link to the library index, including when its roadmap has not yet been established.

1. Add or update a branch with every required field, using `null` for unannounced values.
2. Keep `status: planned` until the initial stable release actually occurs, even if a forecast date has passed.
3. Set `plannedReleaseDate` only when an exact forecast day is announced. Preserve a month-only forecast in `notes` and leave the date `null`.
4. On release, explicitly set `status: released` and `releaseDate` to the actual initial release day. A pre-release does not establish a stable release date.
5. Set each support end explicitly from the maintainer's announced schedule. Do not infer support ends from PHP's policy or treat `null` as unlimited support.
6. Copy the announced Composer PHP constraint into `php` exactly, for example `^8.4`. A list of tested PHP versions is not a Composer constraint.
7. Change `config/roadmaps/window.json` to adjust the common display bounds for every library together.
8. Run `npm test`, `npm run build`, and `sh .githooks/pre-commit`; inspect each affected roadmap in both themes and at mobile width.

`npm start` also runs the exporter. Restart it after changing JSON configuration to refresh the images and shared data snapshot.
No daily refresh, browser-side generation, automatic status promotion, or current-date calculation is needed.
Generated SVGs live under `static/assets/roadmaps/` and are ignored by Git; the next export regenerates them.
The exporter writes an internal build snapshot consumed by Docusaurus for the HTML table.
The same in-memory data produces the portable Markdown table and the image, so both publication formats retain identical dates and constraints.

The integration covers these ten roadmaps:

| Library | Initial migration evidence |
| --- | --- |
| `doctrine-spatial` | Initial releases 5.0.0 and 6.0.0; Composer constraints `^8.1` and `^8.4` at those tags. |
| `geo-parser` | Initial releases 3.0.0 and 4.0.0; Composer constraints `^8.1` and `^8.3` at those tags. |
| `spatial-core` | Initial release 1.0.0; Composer constraint `^8.3` at that tag. |
| `spatial-types` | No stable release; `^8.4` from the 1.0.0-beta Composer manifest. |
| `spatial-validator` | No stable release; `^8.4` from its Composer manifest. |
| `spatial-decoder` | No stable release; `^8.4` from its Composer manifest. |
| `spatial-encoder` | No stable release; `^8.4` from its Composer manifest. |
| `spatial-transformer` | No stable release or announced Composer constraint. |
| `wkb-parser` | Initial releases 2.0.0 and 3.0.0; Composer constraint `^8.1` at both tags. |
| `wkt-parser` | Initial releases 2.0.0 and 3.0.0; Composer constraint `^8.1` at both tags. |

The migration retains previously documented support ends and approximate forecasts; it does not establish a new support policy.
Actual release dates use the respective GitHub release publication dates, correcting inaccurate dates in the old tables.
Future branches without an announced Composer constraint use `null`, with previously listed PHP targets retained in their notes.
The support table shows branch versions, actual or forecast dates, the literal Composer constraint, and notes; no durations or countdowns are generated.
If no branches are configured, the library landing page displays the default message above without an image or table.
If a branch has support ends but no release date, the table still exposes those dates while the image draws no invented period.

Images are linked so readers can open and zoom them. HTML calendars and tables scroll horizontally on narrow screens;
the table retains semantic column headers and the standalone SVG retains its own title, description and legend.
Portable Markdown includes the complete GFM table and relative image reference, without build metadata, MDX or raw HTML.
The [shared assets publication contract](./shared-assets-publication-contract.md) validates and publishes the generated images alongside other shared resources.
