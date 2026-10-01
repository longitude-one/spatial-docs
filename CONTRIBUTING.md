# How to contribute

## Set up the project

Run all commands below from the repository root. Use Node.js 20 or newer and
npm 10 or newer (CI uses Node.js 24). Install the locked dependencies with:

```sh
npm ci
```

## Lint Markdown

Install `markdownlint-cli2` if it is not already available on your machine:

```sh
npm install --global markdownlint-cli2@0.23.3
```

Lint the authored `.md` and `.mdx` files with:

```sh
markdownlint-cli2 "*.md" "docs/**/*.md" "docs/**/*.mdx" "inbox/**/*.md" "inbox/**/*.mdx"
```

The project-specific rules are defined in `.markdownlint.json`. `MD013` allows
lines up to 180 characters, or 400 characters in code blocks. `MD033` permits
the inline HTML elements `<a>` and `<aside>`.

## Enable the pre-commit hook

After installing `markdownlint-cli2`, enable the repository's pre-commit
hook:

```sh
git config core.hooksPath .githooks
```

The hook runs the Markdown lint command and prevents the commit if linting
fails. It checks the source files in the working tree, not just staged files.
It does not run the automated tests or the site build.
This configuration is local to your clone and replaces any existing
`core.hooksPath` setting for this repository.

Verify the configuration and run the hook manually with:

```sh
git config --get core.hooksPath
sh .githooks/pre-commit
```

The first command should print `.githooks`. Git runs the hook automatically on
subsequent commits.

## Run automated tests

Run all regression tests with:

```sh
npm test
```

Run each suite independently with:

```sh
node --test tests/export-markdown.test.mjs
node --test tests/verify-resources.test.mjs
```

The export suite checks Markdown/MDX generation, publication exclusions,
stale output removal, and rejected input. The resource validation suite checks
links, anchors, `llms.txt`, and HTML/Markdown mappings, including failure cases.

## Validate publishable documentation

Build the site and validate its generated resources with:

```sh
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

To rerun validation on an existing build without rebuilding it:

```sh
node scripts/export-markdown.mjs --verify
```

This requires the output of a successful build, including `.docusaurus/`
metadata. After changing sources, run `npm run build` again to avoid checking
stale output.

To run all checks performed by CI locally:

```sh
sh .githooks/pre-commit
npm test
npm run build
```

Each command must succeed; any validation error produces a nonzero exit code.

## Start the local server

Start the development server with live reload:

```sh
npm start
```

Open <http://localhost:3000/> (or the address printed by Docusaurus if a
different port is selected). Markdown resources are generated before startup;
restart the development server to regenerate them after editing sources.

To preview the production build instead:

```sh
npm run build
npm run serve
```

The preview serves the generated site; rebuild it to include later edits.

## Stop the local server

Press **Ctrl+C** in the terminal running `npm start` or `npm run serve`.
There is currently no dedicated stop script: `npm stop` is not available.

If the terminal is gone or the server is stuck, find the processes listening
on its port. On macOS or Linux, for port 3000:

```sh
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

For each PID listed, inspect the command and working directory before stopping
it (replace `12345` with the actual PID):

```sh
ps -p 12345 -o pid,ppid,args
lsof -a -p 12345 -d cwd
```

After confirming it belongs to this repository's server, request a normal stop:

```sh
kill -TERM 12345
```

If the process remains stuck, force it to stop with `kill -KILL 12345`.
Repeat for any other confirmed server PID, then rerun the port lookup to
verify that nothing is listening. Substitute the actual port if it is not 3000.
