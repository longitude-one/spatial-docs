# spatial-docs

Official documentation for the LongitudeOne Spatial ecosystem, Doctrine
integration, spatial types, geometry formats, and standards.

## Run the site

Requirements: Node.js 20 or newer and npm 10 or newer.

```sh
npm install
npm run start:local
```

The start command launches the Docusaurus development server. Open
<http://localhost:3000/index.html> to view the documentation home page.

Build a local preview with fictional legal information:

```sh
npm run build:local
```

Preview the built files with:

```sh
npm run serve
```

The local commands require no legal environment variables and generate fictional
legal notices. Their output cannot be deployed. For publication, supply the
reviewed [legal configuration](#legal-notice-configuration) and run `npm run build`.

Open <http://localhost:3000/index.html>. The preview serves explicit `.html`
and `.md` files directly, including `index.html`; extensionless and directory
routes are rejected. For the Pages configuration, use
<http://localhost:3000/spatial-docs/index.html>.

The final deployable artifact is `public/`. Docusaurus uses `build/` as an
intermediate directory; `.publication-metadata/` retains internal integrity and
asset manifests. Deploy only the validated `public/` tree without rebuilding or
transforming its content. Internal manifests, reports, caches and source maps
are excluded from it. Public files use mode `0644` and directories `0755`.

For the development site, set `DOCUSAURUS_DEPLOYMENT=development` and provide
`URL_PRODUCTION` as the absolute URL of the official documentation before
building or previewing. Missing or invalid values fail the development build.
The announcement links to that configured URL; production builds do not need it.

## Documentation sources

- `docs/shared/` contains documentation shared across the ecosystem.
- `docs/<library>/v<major>/` contains versioned library documentation.
- `docs/standards/`, `docs/concepts/` and `docs/dbms/` contain spatial references.
- Use portable `.md` sources with `title` and `description` front matter;
  MDX and raw HTML are not supported in published documentation.
- `inbox/` contains drafts that are not yet part of the published site.

## Markdown counterparts

`npm run build` exports published `.md` pages alongside their HTML counterparts
in `public/` and generates a root `public/llms.txt` index. For example,
`public/shared/index.html` and `public/shared/index.md` represent the same document;
there is no public `markdown/` prefix.

The internal `.generated-markdown/` directory contains generated Markdown with
portable metadata and the matching relative HTML link. Docusaurus copies its
contents directly to the publication root. Source-relative documentation links
and heading anchors are validated before publication; invalid targets fail the
build. See the [portable publication contract](docs/shared/portable-markdown-publication-contract.md).

Each HTML page displays `View Markdown version` directly below its title and
exposes the same relative target through alternate metadata in its head.
Each Markdown page displays `View HTML version` immediately after front matter.
These links and representation metadata are build-managed; source documents
must not maintain them manually. The build and CI reject missing counterparts,
invalid routes, inconsistent targets, and duplicate switching links.

## Contextual documentation actions

The actions below each documentation title include `View Markdown version` and
`Edit this page on GitHub`. The edit action opens the corresponding source under
`docs/` on the repository's `main` branch, preserving its library, major version
and path. It never edits a generated artifact or redirects historical/Next pages
to the Current major. Both actions have text labels and wrap on small screens.

Pages without a published documentation source have no edit action. For a source
that should not offer editing, set `custom_edit_url: null` in its front matter;
the Markdown action remains available. Contextual actions are build-managed and
must not be duplicated in document content.

## Global search

The navbar search searches all published library majors, Standards, Concepts,
DBMS and shared documentation together. Results identify the library, major and
release status; choosing another library or version does not restrict the search.
Use the search field or `Ctrl+K` (`Cmd+K` on macOS), then arrow keys and Enter.

Search is local to the browser. `npm run build` generates one hashed JSON index
beside the site assets; deploy the complete `public/` directory from that build.
Preview with `npm run serve`; the plugin does not generate an index during
`npm start`. No search account, API key or server-side service is required.
Portable Markdown, drafts, unlisted pages and `inbox/` are not indexed.

The pinned `@easyops-cn/docusaurus-search-local` provider is integrated only in
`scripts/local-search.mjs` and `scripts/search-route-loader.cjs`. This adapter
preserves the site's explicit `.html` routes, adds version context and rejects
an index with missing or unpublished documents. Replace these adapters and the
single theme registration when changing providers; documentation sources and
publication paths do not depend on its index format. Provider upgrades must
pass the local-search regression tests and both publication builds.

## Shared documentation assets

Store documentation images, diagrams, schemas, examples and downloads in
`static/assets/`. See [the contributor guide](docs/shared/using-documentation-assets.md)
and [asset contract](docs/shared/shared-assets-publication-contract.md).
Run `npm run validate:assets` for offline source validation. The normal build
checks the generated manifest and shared bytes in a staging directory before
replacing `public/`; deployment requires the complete verified directory.

## Legal notice configuration

Publication builds require reviewed legal information supplied through environment variables.
See the [French legal review and configuration checklist](docs/shared/french-website-legal-review.md) for all required values and environment approval.
Actual publisher contact details must stay outside Git; rendered notices intentionally make those details public.
For local development or validation with fictional, non-deployable information, use:

```sh
npm run start:local
npm run build:local
```

These commands use `scripts/with-test-legal.mjs`, which supplies fictional values
to the child process. Publication commands continue to require reviewed legal configuration.

Navigation is checked in the final publication gate. See [navigation validation](docs/shared/validating-documentation-navigation.md)
for the automated report and desktop/mobile browser journeys.
