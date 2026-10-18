#!/bin/sh
# Start a disposable SpecWithCode server for one take.
# Usage: serve.sh <demo-dir> <take> [port]       (port 8341 for this episode)
# Runs the installed release's bin.mjs directly (the launcher re-sets HOME and the port to the real instance).
# STUDIO_BIN picks the release; the default is the newest release on this Mac.
# Environment: env -i, HOME=<take>/home, PATH = scutil shim + demo tools (node, codex, specweave) + system dirs.
# The log (it holds the pairing details) goes to <take>/secret/server.log, mode 600. Prints the PID; stop it with kill <pid>.
set -eu
DEMO="$1"; TAKE="$2"; PORT="${3:-8341}"
R="$DEMO/$TAKE"
BIN="${STUDIO_BIN:-$HOME/.specwithcode/install/releases/aec65f41a671d18d03de/bin.mjs}"
[ -f "$BIN" ] || { echo "no release at $BIN" >&2; exit 1; }
DEMO_PATH="$R/shim:$DEMO/tools/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$R/home"
umask 077
nohup env -i PATH="$DEMO_PATH" HOME="$R/home" LANG=en_US.UTF-8 TMPDIR="$R/tmp" \
  SPECWEAVE_HOST=demo SPECWEAVE_TOOL=codex STUDIO_ENABLE_HOSTED_SERVICES=false NO_UPDATE_NOTIFIER=1 \
  PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never \
  "$DEMO/tools/bin/node" "$BIN" serve --base-dir "$R/studio" --port "$PORT" --host 127.0.0.1 --no-browser \
  > "$R/secret/server.log" 2>&1 &
echo $! > "$R/secret/server.pid"
echo "$!"
