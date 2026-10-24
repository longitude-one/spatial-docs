# Contributing

Follow the [documentation contribution workflow](docs/shared/documentation-contribution-workflow.md)
to prepare, write, validate and submit a documentation change. It also covers
standards citations, review, version maintenance and the documentation Definition of Done.

Report a documentation problem through the repository's documentation issue form,
or open a pull request for a focused correction using the existing PR template.

For local previews and legal configuration, see the [README](README.md).
The operational notes below cover stopping servers and publishing approved releases.

## Stop the local server

Press **Ctrl+C** in the terminal running `npm run start:local` or `npm run serve`.
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
<https://longitude-one.github.io/spatial-docs/index.html>. It is not the official
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
whole validated `public/` directory, including HTML, portable Markdown,
shared assets, `llms.txt` and `llms-full.txt`. The deployment job requires a successful build and uses
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
DOCUSAURUS_DEPLOYMENT=development npm run build:local
DOCUSAURUS_DEPLOYMENT=development npm run serve
```

Open <http://localhost:3000/spatial-docs/index.html>. The environment variable selects the
Pages subpath and development notices. Omit it for the usual local root build.
PR validation builds both configurations. Publication to official hosting and
publication triggered by release tags are outside this workflow.

## Official publication to LongitudeOne hosting

`Publish Official Documentation` runs only for pushed tags matching `x.y.z`
(three nonempty decimal numbers, for example `1.0.0` or `12.34.56`). Tags such as
`v1.0.0` and `1.0.0-rc.1`, branch pushes, pull requests and tag deletions do not
publish the official site. Create a release tag only when its commit is ready
for production. The workflow checks out the event's exact commit, runs tests,
and builds and validates the full official site before opening an SSH connection.
It publishes the complete validated `public/` tree, including HTML, portable
Markdown, shared assets, `llms.txt`, `llms-full.txt` and production `.htaccess`.

The GitHub environment is named `production`. Configure `DEPLOY_PATH`, `SSH_HOST`,
`SSH_PORT`, and `SSH_USER` as environment variables or secrets, and
`SSH_PRIVATE_KEY` as an environment **secret**. Secrets are never committed.
The private key must work without an interactive passphrase. The hosting account
needs a POSIX shell, `tar`, and permission to write in the existing absolute
`DEPLOY_PATH` directory. The web server must serve `DEPLOY_PATH/public_html`.
Restrict production environment access to release tags through GitHub settings.

Optionally configure `SSH_KNOWN_HOSTS` with the server's independently verified
OpenSSH known-hosts entry (use `[host]:port` for a nondefault port). When supplied,
the connection requires that trusted host key. Otherwise OpenSSH uses
`StrictHostKeyChecking=accept-new`: the first connection trusts the presented key,
and subsequent connections in the same run reject a changed key. Hosted runners
are ephemeral, so this fallback does not authenticate the first connection
against a previously verified key; supply `SSH_KNOWN_HOSTS` for that protection.
Private key and known-hosts files are temporary and removed when the script exits.

Publications are serialized without canceling an active run (`queue: max`, up to
100 pending runs). The deployment performs these operations in order:

1. Remove any interrupted `DEPLOY_PATH/public_html.next` and create it empty.
2. Transfer the entire build over SSH into `DEPLOY_PATH/public_html.next`.
3. Require successful local archiving, remote extraction, and expected resources.
4. Remove `DEPLOY_PATH/public_html.old` if present.
5. Rename `DEPLOY_PATH/public_html` to `DEPLOY_PATH/public_html.old` if present.
6. Rename `DEPLOY_PATH/public_html.next` to `DEPLOY_PATH/public_html`.

A build or transfer failure fails the workflow and leaves both the live site
and its existing backup intact. The first publication works without a live
directory. After success, `.old` holds the previous version. If the final rename
fails, the script attempts to restore `.old` to the live path and still fails
the workflow. The two renames leave a brief interval without `public_html`;
interruption during that interval can require restoring `.old` manually.
Inspect a failed run and the remote directories before rerunning that release's
workflow; rerunning republishes the same event commit. Do not run concurrent
manual deployments outside the workflow's concurrency group.

The deployment regression suite uses a local SSH substitute and temporary
directories to test rotation and failure handling. It never contacts production.
