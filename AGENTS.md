# Repository Guidelines

## Project Structure & Module Organization

This repository publishes the LongitudeOne Spatial documentation with Docusaurus.
Author pages in `docs/shared/` for ecosystem-wide topics and `docs/libraries/` for library-specific topics.
Keep unpublished drafts in `inbox/`. Site configuration lives in `docusaurus.config.js` and `sidebars.js`;
styles and other assets live in `src/` and `static/`. Automation is in `scripts/`, with regression tests in `tests/`.
Treat `build/`, `static/markdown/`, and `static/llms.txt` as generated output; edit their source pages or generator instead.

## Build, Test, and Development Commands

Use Node.js 20+ and npm 10+ (CI uses Node.js 24).

- `npm ci` installs dependencies from the lockfile.
- `npm start` exports Markdown and starts the local development site at `http://localhost:3000/`.
- `npm test` runs all Node test suites.
- `npm run build` exports Markdown, builds the production site, and verifies generated resources.
- `npm run serve` serves the production build locally.
- `sh .githooks/pre-commit` runs the repository Markdown lint command; install `markdownlint-cli2@0.23.3` first.

## Coding Style & Naming Conventions

Use `.md` for documentation sources. The published documentation contract forbids MDX and raw HTML in source docs.
Keep pages in the appropriate topic directory and use descriptive, lowercase, hyphen-separated filenames
such as `portable-markdown-publication-contract.md`.
Follow `.markdownlint.json` (180-character prose lines; 400-character code lines).
Follow the existing two-space indentation in JavaScript, JSON, and configuration files.
Before changing publication behavior, read `docs/shared/portable-markdown-publication-contract.md`.

## Testing Guidelines

Tests use Node's built-in `node:test` runner and are named `tests/*.test.mjs`.
Add or update focused regression tests when changing scripts, configuration, export behavior, or deployment logic.
Run a relevant file with `node --test tests/export-markdown.test.mjs`;
run `npm test` and `npm run build` before opening a PR. There is no stated coverage threshold.

## Commit & Pull Request Guidelines

Recent commits use short, imperative Conventional Commit style subjects,
such as `docs: add Portable Markdown publication contract` and `ci: add pull request template`.
Use the PR template in `.github/PULL_REQUEST_TEMPLATE.md`: summarize the change, link the issue or Story,
list validation, and describe documentation or URL impact. Cite exact standard sections for normative spatial claims.
Include screenshots for visual changes when useful, and ensure Markdown lint and documentation checks pass.
