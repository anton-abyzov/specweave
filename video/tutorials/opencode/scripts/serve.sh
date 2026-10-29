#!/bin/sh
# Start a disposable SpecWithCode server for recording.
# Usage: serve.sh <demo-dir> <agent-tool> [port]   (episode 2: codex, 8331)
#   <demo-dir> holds home/ (HOME for the server and agent CLIs), studio/ (--base-dir),
#   shim/ (scutil shim that names the computer "Demo Mac"), tmp/, secret/ (mode 700).
# Runs the release's bin.mjs directly: the installed `specweave-studio` launcher
# re-sets HOME, STUDIO_HOME and the port to the real instance, so it cannot be used.
# Prints the server PID. Stop it with `kill <pid>`.
set -eu
DEMO="$1"; TOOL="$2"; PORT="${3:-8331}"
NODE="$(command -v node)"
LAUNCHER="$(command -v specweave-studio)"
BIN="${STUDIO_BIN:-$(grep -o '[^ ]*/releases/[^ ]*/bin.mjs' "$LAUNCHER" | head -1)}"
[ -f "$BIN" ] || { echo "cannot find the release bin.mjs in $LAUNCHER" >&2; exit 1; }
# Episode 2: only node, npm-installed CLIs (specweave, codex) and the system dirs. ~/.local/bin and
# Homebrew are left out so no other agent CLI (claude, cursor, grok) is found in the Codex episode.
NODE_DIR="$(dirname "$NODE")"; [ "${ISOLATE:-0}" = 1 ] && NODE_DIR="$DEMO/bin"
DEMO_PATH="$DEMO/shim:$DEMO/bin:$NODE_DIR:/usr/bin:/bin:/usr/sbin:/sbin"
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
