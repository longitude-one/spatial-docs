# Spatial Types migration review — Task #51

The Task uses the singular `spatial-type`; the actual corpus and published library
are named `spatial-types`. All seven collected files are accounted for below.
The collection explicitly identifies v1 and the existing publication tree is v1;
no historical major is reassigned. Library-specific APIs remain in that library.

| Collected source under `inbox/spatial-types/v1/` | Published destination under `docs/spatial-types/v1/` |
| --- | --- |
| `README.md` | `index.md` |
| `docs/instantiable-spatial-types.md` | `instantiable-spatial-types.md` |
| `docs/type-class-hierarchy.md` | `type-class-hierarchy.md` |
| `docs/immutability.md` | `immutability.md` |
| `docs/spatial-reference-systems.md` | `spatial-reference-systems.md` |
| `docs/validators.md` | `validators.md` |
| `docs/empty-multilinestring-interoperability.md` | `empty-multilinestring-interoperability.md` |

## Adaptations and exclusions

- Preserve the six reference bodies, including examples, API contracts, coverage
  matrices, Committee Draft provenance and dated interoperability limitations.
- Replace reference page level-one headings with title and description metadata.
- Fold the README's usage, installation, immutability and reference summaries
  into the major index. Qualify installation with the existing v1 constraint.
- Exclude README status, coverage, download and CI badges: live repository status
  is not a versioned usage contract. No useful API instruction is removed.
- Consolidate the abbreviated README inheritance tree into a link to the complete
  migrated hierarchy. Preserve its unsupported-type summary and catalogue link.
- Replace the old Doctrine repository recommendation with the centralized
  Doctrine Spatial entry page. Link the general OGC reference to its published page.
- Preserve source repository issue links for evidence; no collected source is a
  published link target. The interoperability page retains its 2026-09-21 snapshot
  scope and does not claim current parser compatibility.
- All six references are reachable directly from the major index.
- No source file in `inbox/` is edited, renamed or removed. No API or normative
  behavior is changed by this migration.
