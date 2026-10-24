---
title: Documentation contribution workflow
description: Prepare, write, validate, review and maintain LongitudeOne documentation changes across library versions and spatial references.
---

Use this workflow to contribute a correction, a new explanation or documentation
for changed library behavior. It applies to published sources in `docs/` and
connects writing, local checks and independent review in one contribution path.

## Prepare a focused change

1. Identify the reader's problem and the expected improvement. Check existing
   issues and pages before proposing another explanation of the same subject.
2. For substantial work, agree the scope and acceptance criteria in an issue
   before implementation. Use the repository's documentation issue form to report
   missing or incorrect content; a small correction may go directly to a PR.
3. Identify the owning domain and, for library content, the applicable major
   version. Read the relevant public API, release-specific code and tests.
4. Create a branch from up-to-date `main`, make the focused change, then validate
   it and open a pull request. Keep unrelated corrections in separate changes.

### Choose the owning page

| Content | Source location | Responsibility |
| --- | --- | --- |
| Library documentation | `docs/<library>/v<major>/` | Public behavior, API, configuration and usage for that release line. |
| Standards | `docs/standards/` | Verified normative foundations and evidenced LongitudeOne conformance. |
| Concepts | `docs/concepts/` | Spatial meaning explained independently of a library API or database. |
| DBMS | `docs/dbms/` | Platform-specific behavior and LongitudeOne interaction with that platform. |
| Shared guidance | `docs/shared/` | Ecosystem-wide contribution and publication contracts. |

Follow the [spatial reference architecture](./spatial-reference-documentation-architecture.md)
for the required reference sections and support records. Link to the owning page
instead of duplicating its explanation. Keep unpublished drafts in `inbox/`;
published pages must not depend on those drafts. For collected migration sources,
follow the [migration rules](./documentation-migration-rules.md).

## Write portable Markdown

Markdown (`.md`) is the standard documentation source format. Docusaurus renders
the HTML site; the same source produces an independently usable portable Markdown
representation. Authors edit sources, and the build generates both representations.

Follow the [portable Markdown publication contract](./portable-markdown-publication-contract.md).
Use GFM headings, lists, tables, fenced code, links and images. MDX, JSX, React
components, Docusaurus-specific constructs and raw HTML are forbidden in published
sources. Do not maintain representation-switching links or generated metadata by hand.

Use lowercase, hyphen-separated filenames and non-empty YAML `title` and
`description` metadata. Do not add `slug`. For example:

```markdown
---
title: Creating a geometry
description: Create a geometry using the documented library release.
---

Start with the reader's task and a minimal example.

## Important constraints

Explain the constraints needed to use the example correctly.
```

### Writing conventions

- Write clear technical English, including headings, image labels, alternative
  text and code comments. Use short paragraphs and consistent terminology.
- Explain unfamiliar spatial terms when introduced, or link to their Concept
  reference. Begin with a concrete use case before introducing technical detail.
- Show a minimal example before edge cases. Use tables for comparisons and
  illustrations when they explain relationships more clearly than prose.
- Separate normative requirements, informative explanations, implemented
  LongitudeOne behavior and platform behavior. Label planned or unverified
  capabilities explicitly; do not present them as available functionality.
- Describe limitations and version constraints where readers need them.
  Avoid blanket conformance claims based on one supported feature.

### Standards and platform evidence

For a normative statement, identify the organization, standard/specification/RFC,
edition or version, and the relevant verified clause, section, table or production.
Place a precise citation beside the requirement and link to the owning Standards
reference or authoritative source. Do not invent clause numbers or infer a rule
from a database's behavior. Report missing evidence or unresolved interpretation
to the maintainer before publishing the affected claim.

Summarize ISO, OGC, RFC and other normative material in original wording and
reference the source. Do not reproduce protected passages, tables, annexes or
standards PDFs without appropriate permission. A catalog entry identifies a
publication; it does not prove the requirements in an unavailable clause.

For DBMS behavior, identify the platform and applicable version, and cite official
vendor documentation where practical. Separate a vendor restriction or extension
from the corresponding standard. Describe deliberate LongitudeOne restrictions,
extensions and other implementation decisions explicitly, with their applicable
library/version scope and evidence.

### Examples and assets

Check examples against the public behavior of the documented release. Inspect
the corresponding API signatures, code and tests; do not assume `main` matches
an Older release. State a minimum minor release when an example needs one.
Keep setup minimal, name required dependencies and verify claimed output.

Use valid, representative spatial values where practical. If an example
intentionally demonstrates invalid input, label the failure and expected result.
For WKT, WKB, GeoJSON, coordinate reference system (CRS) identifiers or coordinate
dimensions, verify both the applicable specification/variant and LongitudeOne
support in that version. Keep code, serialized values and illustrations consistent.

Follow [Using documentation assets](./using-documentation-assets.md) for images,
diagrams and downloads. Give informative images meaningful alternative text and
check their labels and contrast in both light and dark themes.

### Links and cross-references

Link published pages with relative `.md` paths, including a verified heading
fragment when needed. For example, this source links to
`../about/versioning.md#library-documentation-paths`. Preserve the intended
library and major version in the destination instead of silently redirecting
readers to Current documentation.

Do not use same-site absolute URLs, extensionless paths or directory targets
for documentation cross-references. HTML generation converts source links to
explicit `.html` paths; portable Markdown retains `.md` paths. Ensure new pages
are reachable through Markdown links from `docs/index.md`, normally through
their domain index. Broken internal links and fragments fail validation.
Check external targets separately: the publication validator does not fetch them.

## Validate locally

Use Node.js 20+ and npm 10+; CI uses Node.js 24. Install the locked dependencies
and run the source lint and tests from the repository root:

```sh
npm ci
PATH="$PWD/node_modules/.bin:$PATH" sh .githooks/pre-commit
npm test
npm run build:local
```

The hook runs the same source globs as the Markdown Lint workflow, using
`markdownlint-cli2@0.23.3` installed by `npm ci`. The authoritative source rules
are in `.markdownlint.json` (180-character prose and 400-character code lines).
Do not define competing lint rules. Limit any necessary exception to the
smallest practical scope, explain its technical reason in source or configuration,
and make it reviewable. Never disable a rule globally to avoid isolated repairs.

`npm run build:local` invokes `npm run build` with fictional legal configuration
and default site URLs, producing a non-deployable local preview. Publication
builds require reviewed legal/environment configuration as described in the
repository README. Never commit personal legal values or deploy fixture output.

| Check | What it establishes |
| --- | --- |
| Source lint hook | Source Markdown follows the existing repository lint configuration. |
| `npm test` | Automated regression checks pass. |
| `npm run build:local` | Export, HTML build, internal links/fragments, reachability and final publication-resource validation pass. |
| `npm run serve` after the build | Lets you inspect the generated HTML, Markdown counterpart, examples, assets and navigation. |

Before opening a PR, correct applicable failures and inspect both published
representations. Edit the identified source or generator, never generated files
in `build/`, intermediate export directories or `public/` to conceal a failure.

The PR's `documentation-check` CI job also validates assets, runs tests, compares
two complete builds for determinism and builds the development Pages variant.
Separate jobs run source Markdown lint and Apache negotiation integration tests.
To reproduce those additional checks locally:

```sh
node scripts/with-test-legal.mjs npm run validate:assets
node scripts/with-test-legal.mjs npm run validate:determinism
DOCUSAURUS_DEPLOYMENT=development npm run build:local
npm run test:apache
```

Apache integration requires the runtime described in the repository README.
See [Validating generated documentation](./validating-generated-documentation.md)
for diagnostics and reports. Report a check you could not run with its reason;
do not claim it passed. A successful build does not prove technical or normative accuracy.

## Open and review the pull request

1. Review the diff, commit the source changes with a concise imperative subject
   such as `docs: clarify version maintenance`, and push your branch.
2. Open a PR against `main` using the repository PR template. Explain the reader's
   problem, resulting change and related issue or Story. Keep only relevant details.
3. Identify affected libraries/versions, normative sources and precise clauses
   where applicable, validation actually run, and impact on URLs, navigation or
   generated resources. Explain any justified lint exception or unavailable check.
4. Request an independent reviewer through GitHub. Wait for automated checks;
   inspect failed job logs, correct the cause and push the correction.
5. Address blocking review findings and request review again after corrections.
   The maintainer makes the final merge decision; an open PR does not make a Story Done.

Technical review verifies correctness, public library behavior, normative evidence,
the distinction between standards/platforms/LongitudeOne decisions, version context,
examples, links, writing quality and publication compatibility as applicable.
Automated checks complement this review; passing them alone is insufficient for approval.

Report blocking findings against the affected criterion, contract or source.
Unresolved architecture, public API, breaking-change or normative interpretation
decisions require the maintainer's decision before the affected work proceeds.
For the LongitudeOne work-item workflow, review concludes `READY FOR MERGE`,
`CHANGES REQUIRED` or `DECISION REQUIRED`; reviewers do not merge their own review.

## Maintain the right versions

Use the [versioning contract](../about/versioning.md) to identify Current, Older
and Next; do not redefine those classifications in a correction.

| Target | Maintenance rule |
| --- | --- |
| Current | Correct the applicable public behavior; do not automatically propagate the change to Older or Next. |
| Older | Preserve that release line's behavior and API; do not modernize it to match Current. |
| Next | Identify future-major behavior clearly as Next and verify it against that major's intended implementation. |
| Several majors | Apply a shared correction only after checking it independently for each affected major. |

For example, a wording correction may apply to several majors, while an API
example introduced in a later major must not be copied into an incompatible
Older tree. Keep minimum minor availability explicit within a major.

Document breaking public behavior in the corresponding major's documentation.
When users need specific migration instructions, provide a migration guide or
section explaining relevant API/behavior differences, required user actions and
examples where useful. A list of commits is not migration guidance.

## Documentation Definition of Done

Every change to public library behavior requires a documentation-impact assessment.
Consider public APIs, spatial types, accepted/generated formats, coordinate
dimensions, CRS/SRID behavior, validation, documented errors/exceptions, DBMS
compatibility, standards conformance, limitations and extensions.

A change affecting documented public behavior is incomplete until its
documentation is updated. If no documentation is affected, record that explicit
determination and its reason in the PR; do not make an artificial documentation
edit. The reviewer checks this assessment alongside the implementation.

Before merge, the documentation portion of the project Definition of Done requires:

- Applicable documentation and migration guidance are correct for each targeted version.
- Examples, citations, links and both publication representations have been reviewed.
- Repository documentation validation and required CI checks pass.
- Independent review has no remaining blocking findings or unresolved governed decisions.

These requirements supplement the project's functional, test and compatibility
requirements. The work item becomes Done only after merge and verification of
the complete Definition of Done, including any required follow-up corrections.
