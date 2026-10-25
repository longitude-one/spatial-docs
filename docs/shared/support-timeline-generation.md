---
title: Generating library support timelines
description: Generate deterministic SVG support calendars from a shared library roadmap JSON contract and site-wide display bounds.
---

The Node.js timeline generator turns announced release and support dates into a standalone SVG.
It follows the shared calendar layout of [PHP's Supported Versions page](https://www.php.net/supported-versions.php),
using LongitudeOne's colors and absolute dates. It does not copy PHP's support durations.

This contract is shared by the SVG generator and the roadmap table integration in
[Story #127](https://github.com/longitude-one/spatial-docs/issues/127).
The generator itself does not migrate roadmaps, run automatically during the site build, or change Packagist-based version classification.

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
Long labels and notes wrap, increasing the height rather than being truncated.
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

The roadmap integration must consume this validated data directly for its table rather than maintaining a second date source.
Follow the [shared assets publication contract](./shared-assets-publication-contract.md) when including generated calendars in HTML and portable Markdown.
