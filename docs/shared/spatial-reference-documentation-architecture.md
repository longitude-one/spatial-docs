---
title: Spatial reference documentation architecture
description: Defines standards, concepts and DBMS reference domains, their responsibilities and their relationship to versioned library documentation.
---

This contract defines the spatial reference architecture approved in
[Story #60](https://github.com/longitude-one/spatial-docs/issues/60#issuecomment-6085848659).
It defines where reference content belongs and how authors identify its authority,
scope and relationship to LongitudeOne implementations.

## Documentation domains

Standards, Concepts and DBMS are first-class, top-level reference domains. They are
independent of library major versions and do not belong under `shared/` or inside a
library tree. `shared/` retains ecosystem-wide authoring and publication contracts,
including this page.

The source hierarchy for reference content is:

```text
docs/
├── standards/
│   ├── iso/
│   ├── ogc/
│   └── rfc/
├── concepts/
│   ├── geometries/
│   ├── dimensions/
│   ├── crs/
│   └── formats/
└── dbms/
    ├── postgis/
    ├── mysql/
    ├── mariadb/
    └── sql-server/
```

These paths define the initial content structure, not a requirement to publish
empty pages. Reference authors create pages in these domains when substantive
content is ready. Unpublished drafts remain in `inbox/`.

Library resources retain the existing `<library>/v<major>/` source structure, for
example `docs/spatial-core/v1/geometry/index.md`, and optional library roadmaps.
The [documentation versioning contract](../about/versioning.md) continues to govern
those resources. This architecture neither relocates them nor defines new library
versioning, navigation or search behavior.

| Domain    | Responsibility                                                                                      | Content owned elsewhere                                       |
| --------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Standards | Identify normative specifications and explain LongitudeOne conformance, limitations and extensions. | Library API instructions and DBMS implementation details.     |
| Concepts  | Explain the meaning of spatial concepts and synthesize their relationships.                         | Repeated normative requirements and platform-specific rules.  |
| DBMS      | Explain a database platform's spatial behavior and LongitudeOne adaptations.                        | Normative requirements and generic library API documentation. |
| Libraries | Explain how a particular library release exposes or implements functionality.                       | Repeated standards, concepts and platform references.         |

## Standards reference

Organize standards by organization or specification family. The initial inventory
must include the following sources; inclusion in this inventory is not a claim of
LongitudeOne support or conformance:

- `standards/iso/`: ISO/IEC 13249-3, ISO 19107, ISO 19111 and ISO 19136.
- `standards/ogc/`: relevant OGC specifications, including Simple Feature Access
  and related specifications needed by documented features.
- `standards/rfc/`: relevant RFCs, including RFC 7946.

Use a specification identifier as the page basename, for example
`standards/iso/iso-19111.md` or `standards/rfc/rfc-7946.md`. When several editions
need distinct pages, append their edition or publication year and explicitly
identify the edition in the title and source record. An edition suffix identifies
a normative source, not a library major version.

Every standard reference uses these sections:

1. **Normative source:** organization, full identifier and title, edition/version,
   publication date, applicable amendments or corrigenda, and authoritative source
   links. Identify the exact clause, table or production beside each requirement
   summary. If an edition has not yet been verified, say so and do not assert its
   requirements.
2. **Purpose and scope:** what the specification covers and which portions matter
   to the documented LongitudeOne features.
3. **Relevant requirements:** concise, attributed technical summaries of verified
   requirements, separated from informative explanations.
4. **LongitudeOne support:** the common support record defined below, linking to
   the applicable library release documentation and evidence.
5. **Related references:** concepts, DBMS behavior and other normative sources
   needed to understand the subject.

Summarize requirements in original wording. Cite and link authoritative material
instead of reproducing complete standards, substantial excerpts, tables or annexes.
Do not commit copyrighted standards PDFs without permission. A catalog record may
identify an edition but does not establish the contents of an unavailable clause.
Missing normative evidence must be reported, rather than filled from memory or
inferred from database behavior.

## Concepts reference

Use topic pages in the four initial groups:

- `geometries/`: geometry families, relationships and geometric properties.
- `dimensions/`: coordinate dimensions and the meaning of coordinate components.
- `crs/`: coordinate reference systems and reference-system identification.
- `formats/`: spatial representation formats and their relationships to the model.

Each concept page contains **Meaning and scope**, **Informative explanation**,
**Normative foundations** and **Related implementations**. Explain the concept in
library-independent terms. Link to the relevant standard page and requirement
section instead of repeating its normative analysis. Link to DBMS pages for
platform constraints and versioned library pages for usage or API details.

Examples are informative unless explicitly attributed to a verified normative
source. A format concept distinguishes standard formats, LongitudeOne extensions
and vendor representations without defining new support promises.

## DBMS reference

The initial platform scope is PostGIS, MySQL, MariaDB and SQL Server, each in its
own directory. Create an `index.md` platform overview when content is available;
place focused topics alongside it, such as `dbms/mysql/srid.md`.

Each platform reference identifies the product and applicable release/version
range, authoritative vendor documentation and the LongitudeOne library versions
to which its integration statements apply. PostGIS references identify both
PostGIS and PostgreSQL versions when their behavior depends on either.

Use these sections: **Platform and version scope**, **Spatial behavior**,
**Differences from standards**, **LongitudeOne integration and support**, and
**Related references**. Within spatial behavior, cover applicable spatial types
and geometries, coordinate dimensions, CRS/SRID handling, serialization formats
and restrictions. Mark irrelevant subjects as not applicable rather than silently
implying support.

Attribute database behavior to the vendor and version. Cite the standard reference
when comparing it with a verified normative requirement. A database restriction,
extension or implementation choice must never be promoted to a normative spatial
requirement. Explain LongitudeOne limitations and required adaptations using the
same support record as standard pages.

## Common support record

Standards and DBMS references use a support table with one row per feature and
implementation scope. Concepts link to these records; library pages provide the
release-specific usage details. Do not assign one blanket conformance status to
an entire standard merely because a subset is implemented.

| Field                   | Required information                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature                 | Precisely identified requirement, behavior or capability; link to its owning reference section.                                              |
| Implementation scope    | Library and major version, minimum minor release when relevant, and DBMS/version constraints where applicable.                               |
| Status                  | `Supported`, `Partially supported`, `Unsupported` or `Not assessed`.                                                                         |
| Limitations             | Restrictions, supported subset and known gaps; state `None identified` only when supported by evidence.                                      |
| Implementation decision | Deliberate LongitudeOne choices and the approved decision or implementation evidence.                                                        |
| Extensions              | Deliberate behavior beyond the identified standard; label it as a LongitudeOne extension and identify its scope, or state `None documented`. |
| Evidence                | Versioned library documentation, tests or implementation references, and approved decisions where relevant.                                  |

`Supported` means the identified feature is implemented in the stated scope.
`Partially supported` requires an explicit supported subset and missing behavior.
`Unsupported` explicitly identifies a feature that is not supported in that scope.
`Not assessed` records missing verification; it must not be interpreted as either
support or lack of support. Support statements are documentation of evidenced
behavior, not authorization to add features or decide unresolved governance gates.

## Authority of statements

Use explicit headings, table fields or paragraph labels to distinguish:

- **Normative requirement:** a verified specification requirement with its source,
  edition and exact section reference.
- **Informative explanation:** a conceptual explanation or illustrative example.
- **LongitudeOne implementation decision:** an evidenced project choice, including
  its implementation/version scope and approved decision where applicable.
- **LongitudeOne extension:** behavior deliberately added beyond a cited standard.
- **Support or limitation:** an implementation capability or gap in a stated scope.
- **DBMS behavior:** a vendor-specific capability, restriction or extension with
  product/version attribution.

A nearby normative citation does not make an implementation decision normative.
Keep different authorities in separate paragraphs or table fields. Escalate an
unresolved normative interpretation or architectural decision through project
governance before publishing it as an established contract.

## Cross-references and publication

Each subject has one owning reference page. Library pages link to concepts;
concepts link to normative foundations, DBMS behavior and library implementations;
DBMS pages link to concepts and standards; standard pages link to related concepts
and implementation evidence. Use section links where they identify the relevant
requirement or support record precisely.

For example, a future `concepts/crs/srid.md` page could link to a verified section
in `standards/iso/iso-19111.md`, to `dbms/mysql/srid.md`, and to the relevant
versioned library page. Authors must create or verify those target pages before
publishing links; the paths here are illustrative, not existing resources.

All domains follow the
[portable Markdown publication contract](./portable-markdown-publication-contract.md).
Use lowercase, hyphen-separated `.md` source names, mandatory `title` and
`description` front matter, and no `slug`. Use relative `.md` cross-references with
valid GFM heading fragments. For example, a source at
`docs/standards/rfc/rfc-7946.md` publishes as `/standards/rfc/rfc-7946.html` and
`/standards/rfc/rfc-7946.md`; no library version component is added.

Use GFM headings, tables, lists and fenced code blocks. Do not rely on MDX, raw
HTML, tabs or custom components to convey authority or support status. HTML and
portable Markdown must retain the same scope, citations, limitations and labels.
Existing generation, link verification and resource publication rules apply to
these pages without a separate reference-specific publication mechanism.

This contract defines the structure and authoring rules. Complete reference
content, individual library APIs, navigation and search implementation remain
separate work items.
