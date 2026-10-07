---
id: portable-markdown-publication-contract
title: Portable Markdown publication contract
---

This page defines the portable Markdown publication contract used for
LongitudeOne documentation. The goal is to ensure that every published document
is predictable, independently consumable, machine-friendly, and semantically
similar to its HTML representation.

This contract is intentionally strict. It prevents Docusaurus-specific details
from leaking into the published Markdown and it guarantees that Markdown output
remains usable outside the Docusaurus rendering environment.

## Scope

The portable publication format is GitHub Flavored Markdown (GFM).

Published Markdown must not depend on any of the following:

- MDX;
- JSX;
- React components;
- Docusaurus-specific rendering constructs;
- raw embedded HTML.

If a source element cannot be represented in the portable Markdown contract
without losing relevant semantic meaning, the build must fail instead of silently
skipping or degrading the content.

## Publication identity and path rules

Every published documentation resource must have two explicit representations:

- an HTML representation using the `.html` extension;
- a Markdown representation using the `.md` extension.

The publication contract does not use directory-style document identities or
implicit `index.html` resolution.

For example:

```text
Source:
  docs/spatial-core/geometry/point.md

HTML:
  /spatial-core/geometry/point.html

Markdown:
  /spatial-core/geometry/point.md
```

The following representation is not valid:

```text
/spatial-core/geometry/point/
```

The explicit representation is:

```text
/spatial-core/geometry/point.html
```

Path components used for published documentation must follow strict portable
naming rules:

- lowercase characters only;
- no spaces;
- no problematic or reserved path characters;
- suitability for case-sensitive filesystems and URLs.

This rule applies to both the source hierarchy and the generated HTML/Markdown
representations. For example, the following names are valid:

```text
docs/spatial-core/geometry/point.md
```

The following are invalid:

```text
docs/Spatial-Core/geometry/point.md
docs/spatial-core/Geometry/Point.md
docs/spatial-core/geometry/point example.md
```

Documentation paths are treated as case-sensitive on every supported platform.
The file names `point.md` and `Point.md` must never be considered equivalent,
including on case-insensitive local filesystems.

## Required metadata

Every published Markdown document must contain YAML front matter. The metadata
must include at least the following fields:

```yaml
---
title: Point
description: Represents a zero-dimensional geometry.
---
```

The `title` and `description` values are mandatory. Docusaurus-specific
metadata must not appear in the publication output unless it has independent
semantic value for the published document.

Examples of metadata that must not be propagated solely because Docusaurus uses
them include sidebar ordering and rendering configuration.

## Representation URLs

The publication process must generate two canonical representation URLs for each
document:

- the canonical HTML URL;
- the canonical Markdown URL.

These values are derived automatically from the source document path and must not
require manual duplication in each source file.

The HTML representation URL must always use the `.html` extension.
The Markdown representation URL must always use the `.md` extension.

For example:

```yaml
---
title: Point
description: Represents a zero-dimensional geometry.
canonical_html: ./point.html
canonical_markdown: ./point.md
---
```

An `index.md` source must map to:

```yaml
canonical_html: ./index.html
canonical_markdown: ./index.md
```

The exact metadata field names and serialization may vary across
implementations, but the publication contract must clearly distinguish both
representations.

## Document titles and headings

The document title is defined by the mandatory `title` metadata. The
publication generator must not insert an additional level-one Markdown heading
solely to repeat this title.

Therefore, this is not required:

```md
# Point
```

when the document already declares the title in YAML front matter.

The first content heading may therefore begin at level two.

## HTML link in generated Markdown

Every published Markdown document must provide an explicit link to its HTML
representation immediately after the document metadata and therefore directly
below the title when a consumer renders the metadata.

For example:

```md
[View HTML version](./point.html)
```

This link must:

- use a relative path;
- explicitly include the `.html` extension;
- point directly to the matching HTML representation.

Directory-style URLs such as the following are not valid:

```md
[View HTML version](./point/)
```

## Internal documentation links

Links between documents in the same published documentation corpus must remain
inside the Markdown representation.

For example:

```md
[LineString](./linestring.md)
```

must be used instead of:

```md
[LineString](./linestring.html)
[LineString](./linestring/)
[LineString](https://example.org/docs/linestring.html)
```

Internal documentation links must:

- use relative paths;
- explicitly include the `.md` extension;
- target the published Markdown representation;
- preserve document fragments when present;
- respect the exact lowercase path of the target document.

Absolute URLs are forbidden for links whose destination belongs to the same
published documentation corpus.

The explicit `View HTML version` link remains the intentional exception that
allows navigation from Markdown to the corresponding HTML representation.

## Heading anchors

Links to document sections may use GFM-compatible generated heading anchors.

For example:

```md
[Coordinate dimension](./point.md#coordinate-dimension)
```

Generated anchor values must be predictable according to the chosen GFM rules.
Internal fragment links must be validated during the documentation build.
A link targeting a nonexistent generated anchor must fail validation.

## Shared assets

Resources shared between HTML and Markdown representations must not be
duplicated. Published Markdown should reference shared assets using paths relative
to the current Markdown document.

For example:

```md
![Geometry hierarchy](../../assets/images/geometry-hierarchy.svg)
```

Root-relative references such as the following are not allowed in the portable
Markdown representation when a relative reference can be generated:

```md
![Geometry hierarchy](/assets/images/geometry-hierarchy.svg)
```

This rule applies to all shared resources, including:

- images;
- diagrams;
- schemas;
- downloadable files;
- example data files;
- externally stored code samples;
- other static documentation assets.

The resulting Markdown corpus remains navigable when moved together with its
shared asset hierarchy.

## Raw HTML and unsupported content

Raw HTML must not be part of the portable Markdown publication format. Content
requiring HTML must be rewritten using supported Markdown constructs.

The generator must not silently preserve unsupported HTML as a fallback.
If equivalent semantic content cannot be produced using the supported Markdown
profile, the build must fail.

This includes any case where a source construct:

- has no supported portable Markdown representation;
- would lose relevant semantic information during conversion;
- cannot be converted deterministically.

Warnings alone are insufficient when a semantic conversion failure occurs.

## Admonitions

Admonitions must be represented using portable Markdown constructs rather than
Docusaurus-specific directives. A simple blockquote representation is used.

For example:

```md
> **Warning**
>
> This geometry representation is not supported.
```

A standardized set of labels such as `Note`, `Warning`, `Important`, and `Tip`
may be used when it improves clarity. The representation must remain legible in a
generic Markdown renderer that provides no special admonition support.

## Tables

GFM tables are part of the publication format.

```md
| Dimension | Coordinates |
|-----------|-------------|
| XY        | X, Y        |
| XYZ       | X, Y, Z     |
```

Tables must remain valid GFM and must not depend on HTML table markup.
Columns must be aligned. If a construct cannot reasonably be represented as a
GFM table, it must be expressed using another portable Markdown structure.

## Code blocks

Fenced code blocks must declare a language identifier whenever the content
language or format is known.

For example:

````md
```php
$geometry = new Point(...);
```
````

A known language must not be emitted as an untyped fenced block.
Domain-specific identifiers may be used when they add useful semantics, including:

- `php`;
- `json`;
- `sql`;
- `wkt`;
- `ewkt`;
- `geojson`;
- other clearly identified formats used by LongitudeOne documentation.

## Build-only comments and directives

Comments, annotations, and directives used exclusively by the documentation build
process must be removed from the published Markdown representation. They must not
be exposed merely because they appear in the source file.

Information intended for documentation consumers must instead be represented as
document content or publication metadata.

## Table of contents

The publication generator must not inject a table of contents into individual
Markdown documents. Document headings remain available to consumers who wish to
derive their own navigation.

This avoids duplicating structure that is already expressed by the document's
headings.

## Semantic equivalence

HTML and Markdown are different representations of the same documentation
resource. They are not required to produce identical visual presentation or
identical markup structure.

They must, however, convey the same normative and technical information.

The governing rule is:

> The HTML and Markdown representations must convey the same normative and
> technical information, while presentation may differ according to the
> capabilities of each format.

A difference in presentation is acceptable. A difference that removes, changes,
or ambiguously transforms technical or normative meaning is not acceptable.

## Summary of required constraints

The portable Markdown publication contract requires the following:

- GitHub Flavored Markdown is the publication format.
- Markdown output must not require MDX, JSX, React, or Docusaurus-specific
  rendering behavior.
- Raw HTML is forbidden in portable Markdown.
- Each published resource has explicit `.html` and `.md` representations.
- Directory-style HTML identities are forbidden.
- `index.md` maps explicitly to `index.html` and `index.md`.
- Documentation file and directory names use lowercase characters only.
- Spaces and problematic path characters are rejected.
- Paths are treated as case-sensitive on every platform.
- Every published document contains YAML front matter.
- `title` and `description` are mandatory.
- Representation URLs are generated automatically from source paths.
- The HTML link is present immediately after metadata as a relative link to the
  corresponding `.html` resource.
- Internal links target the `.md` representation with relative paths.
- GFM anchors are supported and validated.
- Shared assets use relative paths.
- Admonitions, tables, and fenced code blocks use portable Markdown patterns.
- Build-only comments and directives are removed from published output.
- The generator does not inject a table of contents.
- Semantic conversion failures cause the build to fail.

This contract is the reference for implementation, generation, linting, and CI
validation in the following stories.
