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
<http://localhost:3000/> to view the documentation home page.

Build the production site with:

```sh
npm run build
```

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
