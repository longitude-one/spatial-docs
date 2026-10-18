---
title: HTML SEO audit for Story 39
description: Initial and final technical SEO findings, static payload measurements and accepted audit limitations for Story 39.
---

This audit was performed on 18 October 2026 against commit `2b86ffe` and the Story 39 implementation.
It evaluates technical search indexing and publication behavior, independently of proprietary ranking scores.

## Initial baseline

The initial assembled production corpus contained 79 documentation pages.
The initial audit used parse5 HTML inspection, generated sitemap inspection, Apache configuration inspection and byte measurements.
Lighthouse subsequently compared an isolated reconstruction of the unchanged initial commit with the implementation.

| Signal | Initial result | Correction |
| --- | --- | --- |
| Canonical host | 79 pages identified the GitHub Pages host in production. | Production configuration supplies the official canonical base. |
| Open Graph identity | URLs inherited the same incorrect host. | Centralized production identity. |
| H1 | All 79 pages had one H1. | Preserved and enforced. |
| Language and descriptions | French legal notice incorrectly declared English; descriptions matched source metadata. | Source language and description fidelity enforced. |
| JSON-LD | Breadcrumb data present; no centralized site/article classification. | Site identity, article and explicit API classification added. |
| Robots | No deliberate `robots.txt`. | Crawlable resources and production sitemap announcement. |
| Sitemap | Generated from the incorrect host and provider route list. | Inventory-derived canonical documentation entries only. |
| Alternate HTTP responses | No Markdown or negotiated response indexing directive. | Apache `X-Robots-Tag: noindex`. |
| Preproduction | No global HTML noindex policy. | Global noindex and empty sitemap. |
| Social image | No default sharing image. | Reusable PNG card. |
| Static HTML payload | 2,143,787 bytes total; largest page 79,293 bytes. | No added third-party runtime or network dependency. |

The initial static findings were recorded before source changes.

## Lighthouse and loading performance

Lighthouse 13.5.0 with Chrome Headless Shell 155.0.8059.84 audited `/index.html` using its default mobile simulation.
Both initial and final builds were served locally; the initial commit was reconstructed with `git archive 2b86ffe` in an isolated temporary directory.
The static preview comparison isolates application changes; the Apache measurement includes the production transport improvements.

| Signal | Initial static preview | Final static preview | Final isolated Apache |
| --- | --- | --- | --- |
| Advisory performance score | 71 | 71 | 100 |
| Advisory SEO / accessibility scores | 100 / 100 | 100 / 100 | 100 / 100 |
| First Contentful Paint | 4.3 s | 4.2 s | 0.9 s |
| Largest Contentful Paint | 5.2 s | 5.2 s | 1.9 s |
| Total Blocking Time | 0 ms | 0 ms | 30 ms |
| Cumulative Layout Shift | 0 | 0 | 0 |
| Initial transferred resources | 847 KiB | 853 KiB | 243 KiB |

Lighthouse's perfect initial SEO score missed the incorrect canonical host and absent cross-representation indexing policy.
Project-defined validation therefore remains the publication specification.
The measurements are single local lab runs, not production field Core Web Vitals or a ranking guarantee.

The initial audit identified uncompressed responses and absent cache lifetimes.
Production Apache now compresses supported text formats when `mod_deflate` is available and caches content-hashed JavaScript, CSS
and search indexes for one year with `immutable`. Stable document filenames do not receive that immutable policy.
Apache integration tests check real gzip responses and immutable cache headers.

To reproduce, run Lighthouse against the publication server or an isolated Apache serving the generated corpus:

```sh
npx lighthouse http://localhost:3093/index.html --only-categories=performance,seo,accessibility --output=json
```

Use a locally available Chrome executable through `CHROME_PATH`; this audit downloaded its temporary browser separately.
No browser or Lighthouse dependency is introduced into the application or mandatory CI checks.

## Final validation

The complete production and preproduction builds enforce the [SEO policy](./html-seo-policy.md).
Mutation tests exercise canonical hosts and suffixes, required metadata, heading hierarchy, language, JSON-LD, sitemap exclusions and environment policy.
Apache integration tests verify 1,275 real HTTP responses, including continued representation access and indexing directives.
The French notice is now `legal-notice.fr.md`, with an English translation at `legal-notice.en.md`.
Both representations and translations are included in legal integrity checks and the documentation inventory.
All `.fr.md` pages declare French HTML and article content, while English interface text keeps an explicit English boundary.
This corrects the language defect identified during independent review of the initial Story 39 implementation.
The former unqualified legal-notice identity is retired as explicitly requested; links now target the language-qualified pages.

Preproduction keeps its own local search index: public search-engine exclusion must not disable user search.

Representative generated JSON-LD is checked with the official Schema.org validator.
The root page and a combined sample of generated `WebSite`, `TechArticle`, `APIReference` and breadcrumb data
returned zero errors and zero warnings from `https://validator.schema.org/validate`.
The mandatory local gate validates every generated JSON-LD object against the centrally selected metadata and type.

## Accepted limitations and operational follow-up

- Lab LCP and CLS are recorded above; field INP and field Core Web Vitals were not measured.
- Lighthouse still flags approximately 11 KiB unused compressed CSS, 55 KiB unused compressed JavaScript and a 280 ms render-blocking opportunity.
  These originate in the existing Docusaurus/search presentation bundles; broader framework changes are deferred beyond this Story.
- Production text compression requires Apache `mod_filter` and `mod_deflate`; deployments without them remain valid but lose the measured transfer reduction.
- No third-party font, analytics, structured-data fetch or SEO JavaScript dependency is added to page loads.
- Development and production builds retain existing Node/Docusaurus tooling warnings; these do not indicate a failed publication gate.
- Informative image alt text still requires editorial review; an automated check detects missing attributes only.
- Schema.org article types do not promise Google rich results; Rich Results Test is therefore not used for those types.
- Test builds use the existing legal fixture helper and must never be deployed. Real publication still requires approved legal configuration.
- HTTPS host behavior and search-engine indexing can only be confirmed after Alexandre's production deployment.

Submit the production sitemap through Search Console after deployment. No Google account or external validator is required by CI.
