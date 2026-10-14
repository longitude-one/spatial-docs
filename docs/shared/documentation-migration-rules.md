---
title: Documentation migration rules
description: Defines how collected documentation is assigned to its owning library, major version or shared reference domain while preserving the migration corpus.
---

These rules guide migration from the collected `inbox/<library>/v<major>/`
corpus into published documentation. They establish ownership and version
assignment without defining the detailed structure of individual libraries.
They implement [Story #48](https://github.com/longitude-one/spatial-docs/issues/48)
alongside the existing versioning, reference architecture and publication contracts.

## Preserve the collected sources

Use the collected `inbox/` corpus as migration source material. Create or adapt
destination pages under `docs/`; do not move their collected sources.
Do not edit, rename, reorganize or delete any collected file. The original
structure, formats and version context remain available for comparison.

Conversion, rewriting, merging and reorganization affect only the destination
documentation. Record the corresponding collected source paths in the migration
Task or pull request so reviewers can compare source and destination. Identify
deliberately excluded material and its justification rather than silently
discarding useful information.

`inbox/` remains a private migration workspace, excluded from HTML, portable
Markdown, `llms.txt`, `llms-full.txt`, sitemap, navigation and publication artifacts.
A published page must not link to a collected file as a documentation resource.

## Assign the owning documentation domain

Choose the destination from the content's responsibility, not its source format
or the number of source files containing similar explanations.

| Content responsibility | Destination |
| --- | --- |
| A library's code, public API, configuration, behavior or usage | `docs/<library>/v<major>/` |
| Ecosystem-wide authoring, migration or publication contract | `docs/shared/` |
| Normative specification and evidenced conformance | `docs/standards/` |
| Library-independent spatial meaning and relationships | `docs/concepts/` |
| Database-specific behavior and LongitudeOne adaptations | `docs/dbms/` |

The [spatial reference documentation architecture](./spatial-reference-documentation-architecture.md)
governs the reference domains and their authoring requirements. Shared content
must genuinely apply independently to multiple libraries; similar text alone
does not justify extracting library documentation into a shared domain.

For example, instructions for `spatial-core` APIs remain owned by
`spatial-core`. A general spatial explanation belongs to Concepts only when
it is independent of a particular library's implementation. Library pages
then link to that reference instead of duplicating its explanation.

## Assign the library major version

Apply the [documentation versioning contract](../about/versioning.md).
Versioned library pages retain the `docs/<library>/v<major>/` identity.

| Evidence in the collected content | Destination major |
| --- | --- |
| Explicit association with a historical major or genuinely historical behavior | That historical major |
| Non-historical code, API, behavior or usage with no explicit historical association; `Current` exists | The library's `Current` major |
| The same non-historical content; no stable release and therefore no `Current` | The appropriate `Next` major |

Determine `Current` from the latest stable Packagist release as specified by
the versioning contract. A pre-release does not advance it. When several majors
are `Next`, choose the major matching the documented development code; do not
assume the highest or lowest directory is appropriate. If release or code
evidence cannot establish the target, resolve the assignment before publishing.

Review both the collection's version directory and the actual described
behavior. An old repository directory layout alone does not make documentation
historical. Conversely, do not modernize historical behavior silently or publish
it as current usage. For example, material explicitly documenting
`doctrine-spatial` 4.x belongs under `docs/doctrine-spatial/v4/`, even when a
newer major exists.

Minor and patch releases remain within their major's tree. Identify minimum
minor availability where needed. Migration does not change release-status
discovery or the rules for creating and maintaining major documentation trees.

## Doctrine Spatial ownership

General explanations collected from `doctrine-spatial` are not automatically
shared references. When they explain Doctrine Spatial behavior or usage, retain
them under that library and apply the same version-assignment rules.

Material explicitly associated with 5.x retains `docs/doctrine-spatial/v5/`.
Non-historical material without an explicit historical association follows the
resolved `Current` major, or the appropriate `Next` when no stable release exists.
The major number in an earlier migration example does not pin `Current`.
Extract a reference only when it genuinely belongs independently to multiple
libraries and satisfies the approved reference architecture.

## Consolidate overlapping material

Published documentation may merge or reorganize overlapping collected sources.
Preserve useful information, examples, library ownership and version context.
Do not combine incompatible historical and current instructions into an
unqualified usage example.

Keep separate version-specific explanations when consolidation would obscure
behavior differences. Link to an owning shared reference when appropriate,
without artificially deduplicating library-specific instructions. The collected
files remain unchanged and available for comparison throughout this work.

## Convert formats and review links

Markdown, reStructuredText and other collected formats may be converted into
the supported `.md` source format. The source format does not decide ownership
or version. Rewrite unsupported constructs in the destination while preserving
their technical meaning; MDX and raw HTML are not supported published sources.

Review migrated links and examples. When a corresponding page has already
been centralized, link to its published source using a relative `.md` path
and a valid heading fragment when needed. Verify the target exists and retains
the intended library and version context. Do not introduce obsolete documentation
dependencies when the corresponding centralized resource is available.

Relevant links to source code repositories, external specifications and other
external resources may remain external. Check their targets; do not invent a
centralized destination for material that has not been published.

## Verify the destination

Every migrated page follows the
[portable Markdown publication contract](./portable-markdown-publication-contract.md):
lowercase, hyphen-separated paths, mandatory `title` and `description` front
matter, no `slug`, portable GFM content and verified relative `.md` links.
The pipeline generates the explicit `.html` and `.md` representations; authors
edit source pages rather than generated files.

Before presenting a library migration for review:

1. Compare destination pages against the identified collected sources and
   explain any exclusions or consolidation in the Task or pull request.
2. Verify library ownership, historical context and `Current` or `Next` assignment.
3. Check examples, internal targets and relevant external references.
4. Confirm every published page is reachable through internal Markdown links
   from the corpus index, as required by the publication contract.
5. Run Markdown lint, `npm test` and `npm run build`, including generated-resource
   verification; confirm no `inbox/` file changed.

These rules do not collect additional sources, migrate a complete library,
remove source-repository documentation, redirect legacy production URLs, retire
historical documentation or redesign navigation and search. Those actions belong
to separate approved work items.
