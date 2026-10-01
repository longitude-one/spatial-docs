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
node --test tests/stop-server.test.mjs
node --test tests/development-config.test.mjs
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
Alternatively, from another terminal in this repository, run:

```sh
npm stop
```

On macOS and Linux, this command uses `ps` and `lsof` to find Docusaurus
`start` and `serve` processes whose working directory is this repository.
It stops all matching servers, including background servers and servers using
other ports, without stopping servers from other repositories. Both utilities
must be installed. On other operating systems, use **Ctrl+C**.

The command sends `SIGTERM` and waits up to five seconds. It succeeds if no
server is running. If a server does not stop, it reports its PID and fails;
it does not force termination automatically.

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

## Development publication on GitHub Pages

The development site is published at
<https://longitude-one.github.io/spatial-docs/>. It is not the official
LongitudeOne documentation. Every page displays a permanent development banner;
the Markdown resources and `llms.txt` carry the same notice.

`Publish Development Documentation` runs when a pull request targeting `main`
is closed, and builds and deploys only when that pull request was merged.
The workflow uses `pull_request_target` to support merged fork contributions,
but checks out only the current trusted `main` branch, never a PR head.
Closing an unmerged PR skips both jobs. Direct pushes and tags do not publish.

Builds and deployments are serialized without interrupting an active publication.
GitHub's `queue: max` retains up to 100 pending runs; additional runs beyond that
platform limit are canceled. Each run checks out the current `main` when it starts.
The build runs tests and the complete resource validation before uploading the
whole `build/` directory, including HTML, Markdown, `llms.txt`, and
`markdown-mapping.json`. The deployment job requires a successful build and uses
GitHub's Pages artifact deployment. It does not delete the live site before
publishing, so a failed build or deployment leaves the previous publication in
place. A deployment error fails the workflow. Rerun a failed workflow from
GitHub Actions after correcting its cause.

Repository setup: select **Settings → Pages → Source → GitHub Actions** and use
the `github-pages` environment, restricted to deployments from `main`. Only the
deployment job receives `pages: write` and `id-token: write`; the build job has
read-only repository access. The first publication happens after this workflow
has been merged into `main`; this PR does not publish a preview.

To reproduce the Pages build locally on macOS or Linux:

```sh
DOCUSAURUS_DEPLOYMENT=development npm run build
DOCUSAURUS_DEPLOYMENT=development npm run serve
```

Open <http://localhost:3000/spatial-docs/>. The environment variable selects the
Pages subpath and development notices. Omit it for the usual local root build.
PR validation builds both configurations. Publication to official hosting and
publication triggered by release tags are outside this workflow.
