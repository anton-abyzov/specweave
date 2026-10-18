#!/bin/sh
# Put the GitHub token into git's in-memory credential cache of one take's HOME (daemon socket in that HOME), so the
# server's and the agent's plain `git push` work without the token in any file or in the agent's environment.
# Usage: GH_TOKEN=... cred.sh <take-dir> <root>        Stop with: cred.sh <take-dir> <root> exit
set -eu
D="$1"; R="$2"; OP="${3:-store}"
P="$D/shim:$R/tools:/usr/bin:/bin"
E="env -i PATH=$P HOME=$D/home LANG=en_US.UTF-8 TMPDIR=$D/tmp GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0"
if [ "$OP" = exit ]; then
  $E git credential-cache exit --socket="$D/home/.git-credential-cache/socket" 2>/dev/null || true
  rm -f "$D/home/.git-credential-cache/socket"; echo "credential cache stopped"; exit 0
fi
[ -n "${GH_TOKEN:-}" ] || { echo "GH_TOKEN is not set" >&2; exit 2; }
printf 'protocol=https\nhost=github.com\nusername=x-access-token\npassword=%s\n\n' "$GH_TOKEN" | $E git credential approve
printf 'protocol=https\nhost=github.com\n\n' | $E git credential fill | grep -c '^password=.' | sed 's/^/cached credentials: /'
