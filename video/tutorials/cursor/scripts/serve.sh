#!/bin/sh
# Start a disposable SpecWithCode server for recording.
# Usage: serve.sh <demo-dir> <agent-tool> [port]
#   <demo-dir> holds home/ (HOME for the server and agent CLIs), studio/ (--base-dir),
#   shim/ (scutil shim that names the computer "Demo Mac"), tmp/, secret/ (mode 700).
# Runs the release's bin.mjs directly: the installed `specweave-studio` launcher
# re-sets HOME, STUDIO_HOME and the port to the real instance, so it cannot be used.
# Prints the server PID. Stop it with `kill <pid>`.
set -eu
DEMO="$1"; TOOL="$2"; PORT="${3:-8332}"
NODE="$(command -v node)"
LAUNCHER="$(command -v specweave-studio)"
BIN="$(grep -o '[^ ]*/releases/[^ ]*/bin.mjs' "$LAUNCHER" | head -1)"
[ -f "$BIN" ] || { echo "cannot find the release bin.mjs in $LAUNCHER" >&2; exit 1; }
DEMO_PATH="$DEMO/shim:$(dirname "$NODE"):$(dirname "$(command -v cursor-agent 2>/dev/null || echo /usr/bin/true)"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
mkdir -p "$DEMO/tmp" "$DEMO/secret"; chmod 700 "$DEMO/secret"
cd "$DEMO/home"
umask 077
nohup env -i PATH="$DEMO_PATH" HOME="$DEMO/home" LANG=en_US.UTF-8 TMPDIR="$DEMO/tmp" \
  SPECWEAVE_HOST=demo SPECWEAVE_TOOL="$TOOL" STUDIO_ENABLE_HOSTED_SERVICES=false \
  PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never \
  "$NODE" "$BIN" serve --base-dir "$DEMO/studio" --port "$PORT" --host 127.0.0.1 --no-browser \
  > "$DEMO/secret/server.log" 2>&1 &
echo $! > "$DEMO/secret/server.pid"
echo "$!"
