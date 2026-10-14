# spatial-docs

Official documentation for the LongitudeOne Spatial ecosystem, Doctrine
integration, spatial types, geometry formats, and standards.

## Run the site

Requirements: Node.js 20 or newer and npm 10 or newer.

```sh
npm install
npm start
```

The start command launches the Docusaurus development server. Open
<http://localhost:3000/index.html> to view the documentation home page.

Build the production site with:

```sh
npm run build
```

Preview the built files with:

```sh
npm run serve
```

Open <http://localhost:3000/index.html>. The preview serves explicit `.html`
and `.md` files directly, including `index.html`; extensionless and directory
routes are rejected. For the Pages configuration, use
<http://localhost:3000/spatial-docs/index.html>.

## Documentation sources

- `docs/shared/` contains documentation shared across the ecosystem.
- `docs/<library>/v<major>/` contains versioned library documentation.
- `docs/standards/`, `docs/concepts/` and `docs/dbms/` contain spatial references.
- Use portable `.md` sources with `title` and `description` front matter;
  MDX and raw HTML are not supported in published documentation.
- `inbox/` contains drafts that are not yet part of the published site.

## Markdown counterparts

`npm run build` exports published `.md` pages alongside their HTML counterparts
in `build/` and generates a root `build/llms.txt` index. For example,
`build/shared/index.html` and `build/shared/index.md` represent the same document;
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

## Global search

The navbar search searches all published library majors, Standards, Concepts,
DBMS and shared documentation together. Results identify the library, major and
release status; choosing another library or version does not restrict the search.
Use the search field or `Ctrl+K` (`Cmd+K` on macOS), then arrow keys and Enter.

Search is local to the browser. `npm run build` generates one hashed JSON index
beside the site assets; deploy the complete `build/` directory from that build.
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
replacing `build/`; deployment requires the complete verified directory.
