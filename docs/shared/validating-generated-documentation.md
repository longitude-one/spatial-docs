---
title: Validating generated documentation
description: Run the final HTML and Markdown corpus checks, inspect integrity manifests and diagnose publication failures.
---

The publication build validates the assembled HTML, portable Markdown and shared
assets before replacing `public/`. A failed generation or validation preserves the
previous complete build. HTML and Markdown bodies are never compared: a difference
in technical meaning is a defect in the responsible generator.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Generate, assemble, validate and atomically promote a complete publication. |
| `npm run validate:corpus` | Revalidate the existing `public/`, including its recorded SHA-256 hashes. |
| `npm run validate:determinism` | Build twice and compare every published filename and file hash. |
| `npm run validate:assets` | Check source shared assets and references before the full build. |

Set `DOCUSAURUS_DEPLOYMENT=development` for the development base URL and supply
`URL_PRODUCTION` with the official documentation URL. Its absence or an invalid
HTTP(S) URL fails the development build. Local builds,
PR checks and deployment workflows use the same validation engine. The existing
`documentation-check` job must be required by repository branch protection to
block merging on a validation failure.

## Publication checks

The final validator reuses the document link, GFM anchor, representation link,
reachability and shared asset validators. It also checks the serialized Markdown
profile, strict front matter, closed fences and preserved format identifiers, explicit document paths,
HTML navigation, local filesystem path leakage and assembled file integrity.

Generated Markdown is parsed again with the adopted GFM parser and checked with
`markdownlint-cli2`. Its dedicated configuration permits metadata titles, headings
starting at level two, separate adjacent callouts and serializer-controlled line
lengths. Raw HTML remains forbidden. Domain identifiers such as `wkt`, `ewkt` and
`geojson` are supported.

External URLs are never fetched by the final validator. Generation still uses the
existing Packagist metadata resolution for library version status. Reproducibility
checks assume the same external version metadata for both builds.

## Manifest and reports

| Artifact | Contents |
| --- | --- |
| `.publication-metadata/documentation-manifest.json` | Source identities, HTML/Markdown pairs, shared asset paths and SHA-256 hashes of assembled publication files. |
| `.publication-metadata/asset-manifest.json` | Shared asset source identities, formats and hashes from the asset generator. |
| `.publication-metadata/markdown-mapping.json` | Public HTML and Markdown representation URLs. |
| `.publication-validation.json` | Deterministic status, errors, warnings, affected files, rules and available source positions. |

Docusaurus output remains an intermediate artifact in `build/`. Assembly selects
public documents, shared assets, the local search index, runtime bundles and
explicit infrastructure resources into `public/`, normalizing files to `0644`
and directories to `0755` before final validation. Build manifests, reports,
caches, serialized ASTs and debugging source maps remain outside this tree.
`scripts/publication-files.mjs` defines the explicit public resource policy;
new runtime or infrastructure resources must be declared there before deployment.

Manifest paths are relative to the publication root. Hashes never enter public
document or shared asset filenames. `404.html` and `search.html` are explicitly
configured application pages; every other HTML document must belong to a declared
HTML/Markdown pair. Added, missing or changed publication files fail revalidation.
The workflows transfer the exact validated tree without content changes and
retain their existing triggers and deployment mechanisms. The final validator
does not regenerate its integrity manifest during ordinary
revalidation.

The console report includes error and warning totals plus actionable diagnostics.
GitHub Actions adds annotations, with source positions when available, and the PR
workflow uploads the JSON report. A nonzero exit status prevents promotion or
publication. Orphaned shared assets are the only permitted warning category;
all other contract violations are errors.

For a failure, fix the source or generator identified by the diagnostic and rerun
`npm run build`. Do not repair generated files or regenerate a manifest to conceal
a failure.

See the [portable Markdown publication contract](./portable-markdown-publication-contract.md)
and [shared assets publication contract](./shared-assets-publication-contract.md)
for the authoritative publication rules.
