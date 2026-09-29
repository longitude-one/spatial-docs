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
- `docs/libraries/` contains documentation for individual libraries.
- Use `.md` for documentation by default. Reserve `.mdx` for pages that need
  interactive React components.
- `inbox/` contains drafts that are not yet part of the published site.

## Markdown counterparts

`npm run build` exports every `.md` and `.mdx` page to `build/markdown/` and
generates a root `build/llms.txt` index. Markdown pages are copied without
front matter. MDX output preserves Markdown and static JSX child content while
omitting JSX wrappers, imports, props, and rendered component behavior. MDX
JavaScript expressions are not supported and fail the build. HTML remains the
authoritative output for interactive content and presentation.
