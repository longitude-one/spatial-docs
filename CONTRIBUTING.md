# How to contribute

Install `markdownlint-cli2` if it is not already available on your machine:

```sh
npm install --global markdownlint-cli2@0.23.2
```

Lint the authored `.md` and `.mdx` files with:

```sh
markdownlint-cli2 "*.md" "docs/**/*.md" "docs/**/*.mdx" "inbox/**/*.md" "inbox/**/*.mdx"
```

The project-specific rules are defined in `.markdownlint.json`. `MD013` allows
lines up to 180 characters, or 400 characters in code blocks. `MD033` permits
the inline HTML elements `<a>` and `<aside>`.

To run the same check before each commit, install the repository's pre-commit
hook:

```sh
git config core.hooksPath .githooks
```

The hook runs the lint command and prevents the commit if linting fails. This
Git configuration is local to your clone; omit the command to skip the hook.

## Validate publishable documentation

Install the locked dependencies with `npm ci`, then run:

```sh
npm test
npm run build
```

Every pull request targeting `main` runs the `documentation-check` GitHub Actions
check, including updates and changes to the target branch. It runs the validator
regression tests, exports Markdown, builds Docusaurus, and checks the generated
HTML and Markdown links and anchors. Same-origin absolute URLs are checked
locally; external sites are not contacted.

The build rejects missing resources, invalid anchors, duplicate or unpublished
Markdown entries in `llms.txt`, and missing HTML/Markdown counterparts.
`build/markdown-mapping.json` records the verified counterparts using the actual
Docusaurus routes. Markdown exports are regenerated from scratch; drafts,
unlisted pages, and underscore-prefixed documentation are excluded from the
Markdown publication index. Files in `inbox/` are not published.

The `documentation-check` status must be required by the `main` branch ruleset,
alongside `markdownlint`. This is a repository setting, not a workflow setting.
The workflow has read-only repository permissions and performs no deployment.
