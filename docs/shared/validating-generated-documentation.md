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

For publication, supply `URL_PRODUCTION` for every build. Development builds also require
`URL_PREPRODUCTION` and `DOCUSAURUS_DEPLOYMENT=development`; the configured project
base path is appended to the preproduction URL. Missing, empty or invalid public
HTTPS URLs fail generation. PR checks and deployment workflows use the same
validation engine. The existing `documentation-check` job must be required by
repository branch protection to block merging on a validation failure.

| Environment variable | Deployment configuration |
| --- | --- |
| `URL_PRODUCTION` | Official documentation origin, configured in CI. |
| `URL_PREPRODUCTION` | GitHub Pages origin, configured in CI without the project base path. |

The local fixture commands `npm run build:local` and `npm run start:local` supply
the standard production and preproduction URLs when absent. Explicit values,
including invalid ones, are preserved for validation. This test helper also supplies
fictional legal information and must never be used to publish. Publication commands
retain the required environment configuration without defaults.

## Machine-oriented entry points

[llmstxt.org v2](https://llmstxt.org/) is the normative reference for the structure
and semantics of `llms.txt`. The project adds stricter identity, URL and corpus
validation rules. It publishes both `llms.txt` and `llms-full.txt` at the publication
root; neither can be omitted from the assembled corpus.

| Resource | Generation and validation |
| --- | --- |
| `llms.txt` | Curated section, resource and description order comes from `config/llms.json`. Every internal entry targets an existing absolute `.md` URL. |
| `llms-full.txt` | Every published portable Markdown document appears exactly once, in the editorial order defined in `scripts/llms-full.mjs`. |
| HTML discovery | Every documentation page has exactly one relative `describedby` head link to `llms.txt`, alongside its Markdown alternate. |

The index stays concise when new documents are added. Contributors deliberately
select important entry points in the editorial configuration instead of indexing
the entire corpus. Public contributor pages may be selected; internal operational
notes and unpublished sources must not be included.

The aggregate uses generated Markdown, normalizes each document's title,
description and absolute source URL, and rebases documentation links, fragments
and shared assets to the active deployment. The leading HTML representation
switch is omitted. Code examples retain their content. Footnote references and
definitions receive deterministic document namespaces, so reused labels retain
their own note content. Front matter, manifests, infrastructure and the two machine
entry points are excluded from aggregation.

Development variants identify themselves as non-official and advertise the
production documentation separately. Their document links stay within the
preproduction corpus. Production variants contain no development notice.

Structural errors, missing targets, wrong deployment URLs, duplicate discovery
relationships and incomplete aggregation fail local and CI validation before
publication. Validation compares the aggregate with a canonical reconstruction
of the complete published Markdown corpus. External links are not fetched during
builds; third-party llms.txt validators can complement these authoritative checks
without becoming a network dependency of publication.

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
