---
title: Validating documentation navigation
description: Automated corpus checks and repeatable browser journeys for navigation, search, version context and contextual actions.
---

Navigation validation combines the final corpus gate with browser interaction checks.
The gate runs during every complete build, including pull-request CI and both publication environments.
It validates the existing information architecture; it does not certify accessibility conformance.

## Automated checks

| Check | Failure detected |
| --- | --- |
| Existing resource and anchor verifier | Broken navigation links, missing resources, invalid fragments and cross-references |
| HTML reachability from `index.html` | Published pages unreachable through the HTML link graph |
| Canonical navigation | Directory-style identities or links escaping the configured site base URL |
| Rendered control names | Empty or symbol-only names; missing `aria-controls` targets |
| Library navigation and breadcrumbs | Missing library/version context, version status or selected-version indication |
| Contextual actions | Markdown pointing to another document or GitHub editing another source/version |
| Actual search-index queries | `geometry`, `PostGIS` and `Doctrine` failing to return representative areas and available Doctrine majors |
| Search publication/context | Missing pages, unpublished results, broken result anchors, incorrect parents or missing version labels |

Search queries run against the provider's serialized index using its own Lunr engine.
Heading and body results inherit context from their title record, as in the provider's result renderer.
Existing provider tests also cover draft and unlisted sources even when their HTML files exist.
The new regression fixtures cover both `/` and `/spatial-docs/` base URLs and deliberately corrupt controls, actions, version state and search output.

The deterministic result is stored in `.publication-metadata/navigation-validation.json`.
The parent `.publication-validation.json` records a blocking `navigation` diagnostic if this check fails.
Neither report replaces the browser checks below.

```sh
npm test
node scripts/with-test-legal.mjs npm run build
node scripts/verify-navigation.mjs
```

The fictional legal wrapper is for local/CI verification only. Follow the [legal configuration checklist](./french-website-legal-review.md) before publication.
For development, set `DOCUSAURUS_DEPLOYMENT=development` and `URL_PRODUCTION=https://www.longitude-one.fr` consistently for build, verifier and preview.
Finish a build before previewing it; do not replace the preview's artifact with a different base-URL build during a browser journey.

## Repeatable browser journeys

Use a current browser on desktop and a responsive mobile viewport. In Safari, Option-Tab reaches all links under its default keyboard-navigation setting.
Check visible focus, readable labels, menu dismissal, usable touch controls, wrapping breadcrumbs and access to actions without horizontal page scrolling.

| Journey | Expected outcome |
| --- | --- |
| Entry → Libraries → Doctrine Spatial | Overview identifies the library; selector offers available major versions |
| Selector → Next, Older, Current | URL, breadcrumbs, status and contextual actions keep the selected library/major |
| Version selector with keyboard | Summary opens with Enter/Space; links are keyboard reachable; Escape closes it |
| Global menu with keyboard | Labeled button opens; links are reachable; Escape dismisses it and returns focus |
| Guides → PostGIS → related Concepts/Standards | Canonical HTML references resolve and the destination area is identifiable |
| Standards → OGC/RFC; Guides → Concepts | Both areas remain reachable from global navigation |
| Search `geometry`, `PostGIS`, `Doctrine` | Results identify their area; Doctrine includes Older, Current and Next where available |
| Search via shortcut and arrows/Enter | Selected result opens its intended explicit `.html` URL |
| Search clear control | Meaningful name “Clear search”; query can be cleared without choosing a result |
| View Markdown version | Opens the sibling `.md` for the exact page and major |
| Edit this page on GitHub | Targets the matching `docs/` source on main; inspect the link without saving an edit |
| Mobile menu → Back to main menu → Guides/Libraries/Standards | Global navigation remains available alongside the current page's sidebar |

## Story 81 implementation review

Developer browser review on 15 October 2026 used local generated artifacts with fictional legal configuration:

- Safari desktop: entry/library navigation, library selector, Older/Next context and search shortcut with keyboard selection to Spatial Core.
- Firefox responsive 320 × 480 and 390 × 844: mobile menu, return to global Guides, PostGIS, search results spanning Doctrine versions,
  Older → Current selector and matching Markdown action.
- Accessibility trees exposed named navigation landmarks, textual library/version labels, breadcrumbs and contextual actions in both layouts.
- The provider's icon-only search-clear name was corrected to “Clear search”; the route adapter has a regression guard for provider upgrades.

This review covers representative interactions and rendered structure. It is not a full WCAG/RGAA audit or a claim about every assistive technology or physical device.
Repeat the journeys after navigation, responsive styling, search-provider or version-policy changes.
