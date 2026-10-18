#!/bin/sh
# Start a disposable SpecWithCode 1.0.47 server for one take, and greet-app's demo page beside it.
# Usage: serve.sh <demo-dir> <take> [port]       (port 8349 for this episode; the page is on 127.0.0.1:5173)
# Runs the copied release's bin.mjs directly (the installed launcher re-sets HOME and the port to the real instance).
# Environment: env -i, HOME=<take>/home, PATH = scutil shim + copied demo tools (node, codex, specweave) + system dirs.
# USER=demo keeps the server's Claude quota reader from finding the real Keychain item (it looks up account $USER).
# The log (it holds the pairing details) goes to <take>/secret/server.log, mode 600.
# Prints both PIDs; stop them with kill <pid> (saved in <take>/secret/server.pid and page.pid).
set -eu
DEMO="$1"; TAKE="$2"; PORT="${3:-8349}"
R="$DEMO/$TAKE"
BIN="${STUDIO_BIN:-$DEMO/release/1.0.47/bin.mjs}"
[ -f "$BIN" ] || { echo "no release at $BIN" >&2; exit 1; }
DEMO_PATH="$R/shim:$DEMO/tools/bin:/usr/bin:/bin:/usr/sbin:/sbin"
umask 077
cd "$R/home/greet-app"
nohup env -i PATH="$DEMO_PATH" HOME="$R/home" LANG=en_US.UTF-8 TMPDIR="$R/tmp" PORT=5173 \
  "$DEMO/tools/bin/node" serve.js > "$R/tmp/page.log" 2>&1 &
echo $! > "$R/secret/page.pid"
cd "$R/home"
nohup env -i PATH="$DEMO_PATH" HOME="$R/home" USER=demo LOGNAME=demo LANG=en_US.UTF-8 TMPDIR="$R/tmp" \
  SPECWEAVE_HOST=demo SPECWEAVE_TOOL=codex STUDIO_ENABLE_HOSTED_SERVICES=false NO_UPDATE_NOTIFIER=1 \
  PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never \
  "$DEMO/tools/bin/node" "$BIN" serve --base-dir "$R/studio" --port "$PORT" --host 127.0.0.1 --no-browser \
  > "$R/secret/server.log" 2>&1 &
echo $! > "$R/secret/server.pid"
echo "server $(cat "$R/secret/server.pid") page $(cat "$R/secret/page.pid")"
