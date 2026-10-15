---
title: Shared assets publication contract
description: Source paths, supported static formats, safety checks and atomic publication of assets shared by HTML and portable Markdown.
---

Static documentation assets live under `static/assets/` and are published once
under `assets/` at the site's base URL. HTML and portable Markdown reference the
same resource. This contract covers source files, not build-generated assets
such as the website's JavaScript and CSS.

## Identity and references

| Rule | Required behavior |
| --- | --- |
| Source mapping | `static/assets/<path>` becomes `assets/<path>` without reorganization |
| Names | Lowercase portable components, no spaces, trailing dots or reserved device names |
| Case | Source paths and references must match exactly on every platform |
| Source files | Real files only; symbolic links and special files are rejected |
| Distinct resources | Different source paths remain distinct even when bytes are identical |
| Content | Copied byte for byte; no resizing, recompression, optimization or format conversion |
| Public names | Stable source filenames, without generated content hashes |
| Collisions | Fatal errors; resources are never silently overwritten or renamed |
| References | AST-detected images and links, including reference-style definitions |
| Markdown | Relative paths to the shared hierarchy; no embedded `data:` resources |
| HTML | The same public asset identity as Markdown, including development base URLs |
| Missing resources | Fatal validation errors, including incorrect filename casing |
| Unreferenced resources | Allowed for direct downloads or future documentation |

Local documentation resources outside the shared hierarchy are rejected. Links
to intentionally external resources may remain external; store resources needed
to understand the documentation locally. SVG markup belongs in an external file,
not inline HTML in a Markdown page.

## Supported static formats

The allowlist is explicit. Adding another extension requires a deliberate
publication-contract and validator change.

| Purpose | Extensions | Basic content checks |
| --- | --- | --- |
| Images and file diagrams | `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp` | XML/SVG safety or image signature/header checks |
| Structured resources | `.json`, `.geojson`, `.yaml`, `.yml`, `.xml` | Syntax parsing; no spatial or schema conformance implied |
| Text and data | `.txt`, `.csv`, `.wkt` | Valid UTF-8 without NUL bytes |
| Downloadable source examples | `.sql`, `.php` | Valid UTF-8 without NUL bytes; files are never executed by validation |
| Documents | `.pdf` | PDF header and end marker |

These checks recognize the file type where practical. They do not replace full
image decoding, PDF validation, language compilation, geometry validation or
normative conformance analysis.

## SVG and XML safety

XML must be well formed and contain one root element. Document types and
non-XML processing instructions are rejected. SVG uses the SVG namespace or an
unprefixed SVG root. Foreign element namespaces are rejected.

SVG validation rejects scripts, event handlers, embedded foreign content,
animations, executable URLs, external `href`/`src` references and external CSS
resources. It also rejects `<style>` blocks, `style` attributes and backslash
escapes in attribute values to avoid CSS obfuscation. Use presentation attributes
such as `fill`, `stroke` and `font-size`; local `#id` references are permitted.

## Manifest and publication

The build generates an internal `.publication-metadata/asset-manifest.json` automatically. Each public asset path
maps to its source path, SHA-256 digest and extension-derived type:

```json
{
  "assets/downloads/positions.csv": {
    "source": "static/assets/downloads/positions.csv",
    "sha256": "<computed-sha256>",
    "type": "csv"
  }
}
```

Entries have deterministic ordering and contain no timestamps or machine-specific
paths. Do not edit the manifest or use its hash to rename an asset.
`static/asset-manifest.json` is reserved for build tooling and rejected as an authored static resource.

`npm run build` validates sources before generation, uses `build/` for
intermediate Docusaurus output, assembles public files in a temporary directory,
and checks the complete corpus, internal manifest, asset bytes and HTML/Markdown
references. Only a completely valid directory replaces `public/`; failures retain
the preceding valid publication. The deployment copies the complete verified
public corpus and promotes it as one site, including its assets. Manifests remain
internal and are not deployed. HTTP cache policy is outside this contract.

## Local and CI checks

```bash
npm run validate:assets
npm test
npm run build
```

`validate:assets` checks static assets and published source references locally
without fetching release data or creating publication output. Invalid input
returns a non-zero status. The documentation CI runs the same validator, tests
and production/development builds; any failure fails `documentation-check`.
The repository's required-check protection governs merge blocking.

See [Using documentation assets](./using-documentation-assets.md) for working
files and relative-link examples, and the
[portable Markdown publication contract](./portable-markdown-publication-contract.md#shared-assets)
for representation-level rules.
