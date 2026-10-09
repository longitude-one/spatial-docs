# Copilot instructions for spatial-docs

## Repository purpose

This repository publishes the LongitudeOne Spatial documentation site with Docusaurus.
The source of truth for content lives in `docs/`; generated Markdown resources and
site artifacts are created from that source and then validated.

## High-level architecture

- `docs/` contains the authored documentation source.
  - `docs/shared/` holds reusable ecosystem-wide docs and conventions.
  - `docs/standards/`, `docs/concepts/` and `docs/dbms/` are the spatial reference domains
    defined in `docs/shared/spatial-reference-documentation-architecture.md`.
  - `docs/<library>/v<major>/` holds versioned library documentation, with optional roadmaps outside the version directories.
- `inbox/` contains draft content that is not part of the published site.
- `static/` is the generated publication surface for Markdown and `llms.txt`.
- `build/` is the verified production/development build output.
- `scripts/export-markdown.mjs` generates Markdown counterparts for the site and
  enforces publication rules such as excluding drafts, hidden pages, and
  duplicate destinations.
- `scripts/remark-base-url.mjs` and `scripts/site-settings.mjs` control the
  generated base URL and rewrites for development/publication environments.
- `docusaurus.config.js` configures the Docusaurus site, sets broken-link
  handling to fail fast, and defines docs routing and theme behavior.
- `tests/*.test.mjs` are the regression tests for export, link validation, server
  lifecycle, and configuration checks.

## Build, test, and lint commands

Use Node.js 20+ and npm 10+; CI uses Node.js 24.

```sh
npm ci
npm start
npm run build
npm test
```

Run each test file individually:

```sh
node --test tests/export-markdown.test.mjs
node --test tests/verify-resources.test.mjs
node --test tests/stop-server.test.mjs
node --test tests/development-config.test.mjs
node --test tests/deploy-production.test.mjs
```

Run markdown lint locally with:

```sh
markdownlint-cli2 "*.md" "docs/**/*.md" "docs/**/*.mdx" "inbox/**/*.md" "inbox/**/*.mdx"
```

The repository also provides a local pre-commit hook:

```sh
git config core.hooksPath .githooks
sh .githooks/pre-commit
```

## Documentation conventions

- Start with `docs/shared/index.md` and
  `docs/shared/portable-markdown-publication-contract.md` before changing
  published content.
- Use `.md` as the default source format; reserve `.mdx` for pages that require
  interactive React components.
- Do not manually edit files in `build/`, `static/markdown/`, or `static/llms.txt`;
  they are generated from source.
- `inbox/` content is draft-only and is not published.
- Pages with `draft: true`, `unlisted: true`, or underscore-prefixed filenames are
  excluded from the published Markdown index.
- MDX expressions are not supported during Markdown export and will fail the build.
- When editing documentation, keep internal links valid and preserve the
  generated HTML/Markdown counterpart relationship expected by the validator.

## Content and review conventions

- Use the repository's standard PR template in `.github/PULL_REQUEST_TEMPLATE.md`.
- When applicable, document the relevant normative standard or specification in
  the PR description and reference the exact clause or section.
- Prefer precise, source-backed references over generalized statements when
  describing spatial semantics or standards.
- Treat `docs/shared/` as the shared source of truth for cross-library guidance and
  publication conventions.

## Validation expectations

Before considering documentation changes complete, run the equivalent relevant
checks:

```sh
npm test
npm run build
```

When a change is limited to documentation generation or resource validation,
prefer the focused test file for that area instead of running the full suite only
when necessary.
