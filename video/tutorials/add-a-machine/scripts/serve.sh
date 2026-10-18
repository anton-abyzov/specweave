#!/bin/sh
# Start a disposable SpecWithCode 1.0.47 server for recording, from the copied release in <root>.
# Usage: serve.sh <demo-dir> <root> <port> [extra serve flags...]
# Runs <root>/release/bin.mjs under env -i with HOME=<demo>/home and only the demo shim and copied tools on PATH.
# Prints the server PID (also in secret/server.pid). Stop it with `kill <pid>` (SIGTERM).
set -eu
DEMO="$1"; ROOT="$2"; PORT="$3"; shift 3
DEMO_PATH="$DEMO/shim:$ROOT/tools:/usr/bin:/bin:/usr/sbin:/sbin"
mkdir -p "$DEMO/tmp" "$DEMO/secret"; chmod 700 "$DEMO/secret"
cd "$DEMO/home"
umask 077
nohup env -i PATH="$DEMO_PATH" HOME="$DEMO/home" LANG=en_US.UTF-8 TMPDIR="$DEMO/tmp" \
  SPECWEAVE_HOST=demo STUDIO_ENABLE_HOSTED_SERVICES=false GIT_TERMINAL_PROMPT=0 GIT_CONFIG_NOSYSTEM=1 \
  PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never \
  "$ROOT/tools/node" "$ROOT/release/bin.mjs" serve --base-dir "$DEMO/studio" --port "$PORT" --host 127.0.0.1 --no-browser "$@" \
  >> "$DEMO/secret/server.log" 2>&1 < /dev/null &
echo $! > "$DEMO/secret/server.pid"
echo "$!"
