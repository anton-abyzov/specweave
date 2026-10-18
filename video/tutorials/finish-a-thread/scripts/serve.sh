#!/bin/sh
# Start a disposable SpecWithCode 1.0.48 server for recording, from the copied release in <root>.
# Usage: GH_TOKEN=... serve.sh <take-dir> <root> <port>
# GH_TOKEN is read from this script's own environment (the caller loads it inline from `gh auth token`), passed to
# the server only, never written or printed. Runs under env -i with HOME=<take>/home and only the shim and copied
# tools on PATH. Prints the server PID (also in secret/server.pid). Stop it with `kill <pid>`.
set -eu
D="$1"; R="$2"; PORT="$3"
[ -n "${GH_TOKEN:-}" ] || { echo "GH_TOKEN is not set" >&2; exit 2; }
P="$D/shim:$R/tools:/usr/bin:/bin:/usr/sbin:/sbin"
mkdir -p "$D/tmp" "$D/secret"; chmod 700 "$D/secret"
cd "$D/home"
umask 077
nohup env -i PATH="$P" HOME="$D/home" LANG=en_US.UTF-8 TMPDIR="$D/tmp" GH_TOKEN="$GH_TOKEN" \
  SPECWEAVE_HOST=demo STUDIO_ENABLE_HOSTED_SERVICES=false GIT_TERMINAL_PROMPT=0 GIT_CONFIG_NOSYSTEM=1 \
  PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never \
  "$R/tools/node" "$R/release/bin.mjs" serve --base-dir "$D/studio" --port "$PORT" --host 127.0.0.1 --no-browser \
  >> "$D/secret/server.log" 2>&1 < /dev/null &
echo $! > "$D/secret/server.pid"
echo "$!"
