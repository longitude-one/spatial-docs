---
title: Documentation versioning
description: Defines major-version documentation for LongitudeOne libraries and the independent version of this website.
---

LongitudeOne libraries release independently, and this documentation website has its own release
cycle. A library documentation version identifies a major library release line, while the website
version identifies a release of `spatial-docs`.

## Library documentation paths

Every versioned library resource includes the library name and major version in its identity:
`<library>/v<major>/`. For example, `spatial-core/v1/geometry/point` belongs to the complete `1.x`
release line. Its HTML and portable Markdown representations use explicit paths such as
`/spatial-core/v1/geometry/point.html` and `/spatial-core/v1/geometry/point.md`.

Only a new major version creates a separate documentation tree. Minor and patch releases remain in
their major version's tree. A page identifies a minimum minor release where a described feature
was introduced during that line, for example, "Available since 1.5." It must not imply that the
feature exists throughout `1.x`.

When documentation for a new major version is created, copy the preceding documented major version
if one exists. After that initial copy, edit each tree independently. Creating the new tree does not
end maintenance of the preceding one.

## Published releases and status

At build time, determine each library's current production major version automatically from its
releases on Packagist. Use the latest stable release; development, alpha, beta, release-candidate,
and other pre-release versions do not advance the production major. For example, `1.8.2`,
`2.0.0-beta.1`, and `2.0.0-RC1` leave `v1` current until stable `2.0.0` is published.

If the required Packagist data cannot be retrieved or reliably interpreted, the build must fail. An
empty set of stable releases is a valid result when Packagist data was retrieved and interpreted
successfully.

Compare every documented major version with the latest stable major for that library:

| Documented major                     | Status    |
| ------------------------------------ | --------- |
| Lower than the current stable major  | `Older`   |
| Equal to the current stable major    | `Current` |
| Higher than the current stable major | `Next`    |

More than one major may be `Next`. If the library has no stable release, every documented major is
`Next`. When its first stable release is published, the matching documentation major becomes
`Current` on the next build.

When a stable release exists, documentation for its major version is mandatory. The build must fail
if that tree is missing, even if older or future trees exist. For example, with stable `2.4.1`, `v1`
is `Older`, `v2` is `Current`, and `v3` is `Next`; a corpus containing only `v1` and `v3` is
invalid.

Every versioned library document must expose its `Next`, `Current`, or `Older` status consistently
in HTML and portable Markdown. The status message's visual treatment and any navigation based on
status are separate decisions.

## Roadmaps and historical documentation

A library may have an optional, non-versioned roadmap outside its major-version directories, such as
`spatial-core/roadmap`. It belongs to the library as a whole. When present, the version-status
message links to the roadmap's corresponding representation: HTML links to
`/spatial-core/roadmap.html`, and portable Markdown links to the relative `.md` representation. A
missing roadmap must not fail the build.

Documentation remains editable while its major release line is maintained. Once that line is no
longer maintained, retain its documentation as historical content. Retain documentation for
discontinued or superseded libraries as well. Neither a new major release nor discontinued
maintenance automatically removes documentation; future navigation or placement of historical
content is outside this contract.

## Website version

The Git tag of `spatial-docs` that triggers an official production deployment identifies the website
version. Display that version in the production website footer, for example,
`Documentation version 1.4.0`.

A development build published from `main` has no production release tag. Its footer reads
`Development documentation`; no artificial version is assigned. The `spatial-docs` version never
appears in library documentation URLs and does not change the identity of library resources.

## Publication contract

The [portable Markdown publication contract](../shared/portable-markdown-publication-contract.md)
applies to versioned pages, roadmaps, and this page. Each published document has explicit `.html`
and `.md` representations, with the same technical information in both. Existing HTML, Markdown,
content-negotiation, SEO, and `llms.txt` publication rules continue to apply. This versioning
contract does not define version selectors, status-based navigation, search across versions, or
automatic documentation updates when libraries release.
