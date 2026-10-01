#!/usr/bin/env bash
set -euo pipefail

for name in DEPLOY_PATH SSH_HOST SSH_PORT SSH_USER SSH_PRIVATE_KEY; do
  if [[ -z ${!name:-} ]]; then
    printf 'Missing deployment setting: %s\n' "$name" >&2
    exit 1
  fi
done
if [[ $DEPLOY_PATH != /* || $DEPLOY_PATH =~ ^/+$ || ! $SSH_PORT =~ ^[0-9]+$ ||
      $SSH_HOST == -* || $SSH_USER == -* ]]; then
  echo 'Invalid deployment path or SSH settings.' >&2
  exit 1
fi

site=${1:-build}
for resource in index.html llms.txt markdown-mapping.json markdown; do
  if [[ ! -e $site/$resource ]]; then
    echo 'The complete verified site is required before deployment.' >&2
    exit 1
  fi
done

umask 077
ssh_directory=$(mktemp -d)
trap 'rm -rf -- "$ssh_directory"' EXIT
printf '%s\n' "$SSH_PRIVATE_KEY" > "$ssh_directory/key"
unset SSH_PRIVATE_KEY
host_check=accept-new
if [[ -n ${SSH_KNOWN_HOSTS:-} ]]; then
  printf '%s\n' "$SSH_KNOWN_HOSTS" > "$ssh_directory/known_hosts"
  host_check=yes
fi
ssh_options=(-i "$ssh_directory/key" -p "$SSH_PORT" -l "$SSH_USER"
  -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=30
  -o "StrictHostKeyChecking=$host_check"
  -o "UserKnownHostsFile=$ssh_directory/known_hosts")

# Quote each argument for the remote POSIX shell, including paths with spaces.
quote() {
  local escaped="'\\''"
  printf "'%s'" "${1//\'/$escaped}"
}
remote() {
  ssh "${ssh_options[@]}" "$SSH_HOST" "sh -c $(quote "$1") sh $(quote "$DEPLOY_PATH")"
}

# pipefail prevents promotion even if tar fails but the SSH command succeeds.
tar -C "$site" -cf - . | remote '
  set -eu
  cd -- "$1"
  rm -rf -- public_html.next
  mkdir -- public_html.next
  tar -xf - -C public_html.next
  test -f public_html.next/index.html
  test -f public_html.next/llms.txt
  test -f public_html.next/markdown-mapping.json
  test -d public_html.next/markdown
'

remote '
  set -eu
  cd -- "$1"
  rm -rf -- public_html.old
  if [ -e public_html ] || [ -L public_html ]; then
    mv -- public_html public_html.old
  fi
  if ! mv -- public_html.next public_html; then
    if [ -e public_html.old ] || [ -L public_html.old ]; then
      mv -- public_html.old public_html
    fi
    exit 1
  fi
'
