#!/bin/sh
# Start a disposable SpecWithCode server for recording.
# Usage: serve.sh <demo-dir> [port] [simulate]      (this episode: 8343)
#   simulate = a provider instance id list for STUDIO_SIMULATE_USAGE_LIMIT (this episode: claudeAgent),
#   the documented test switch: every turn on a listed instance stops with a usage-limit error.
# Runs the release's bin.mjs directly under env -i with HOME=<demo>/home. SPECWEAVE_TOOL is NOT set,
# so each agent's own environment names it in the ledger (claude@demo, codex@demo).
# Prints the server PID. Stop it with `kill <pid>`.
set -eu
DEMO="$1"; PORT="${2:-8343}"; SIM="${3:-}"
NODE="$(command -v node)"
LAUNCHER="$(command -v specweave-studio)"
BIN="$(grep -o '[^ ]*/releases/[^ ]*/bin.mjs' "$LAUNCHER" | head -1)"
[ -f "$BIN" ] || { echo "cannot find the release bin.mjs in $LAUNCHER" >&2; exit 1; }
DEMO_PATH="$DEMO/shim:$DEMO/tools:$(dirname "$NODE"):/usr/bin:/bin:/usr/sbin:/sbin"
mkdir -p "$DEMO/tmp" "$DEMO/secret"; chmod 700 "$DEMO/secret"
cd "$DEMO/home"
umask 077
if [ -n "$SIM" ]; then SIMVAR="STUDIO_SIMULATE_USAGE_LIMIT=$SIM"; else SIMVAR="STUDIO_SIMULATE_NONE="; fi
nohup env -i PATH="$DEMO_PATH" HOME="$DEMO/home" LANG=en_US.UTF-8 TMPDIR="$DEMO/tmp" \
  SPECWEAVE_HOST=demo STUDIO_ENABLE_HOSTED_SERVICES=false "$SIMVAR" \
  PWDEBUG=0 PLAYWRIGHT_HTML_OPEN=never \
  "$NODE" "$BIN" serve --base-dir "$DEMO/studio" --port "$PORT" --host 127.0.0.1 --no-browser \
  >> "$DEMO/secret/server.log" 2>&1 &
echo $! > "$DEMO/secret/server.pid"
echo "$!"
