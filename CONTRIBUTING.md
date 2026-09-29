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
