#!/bin/sh
# Mint a pairing token for the demo server into a mode-600 file, never printed.
# Usage: pair.sh <demo-dir>
set -eu
DEMO="$1"
LAUNCHER="$(command -v specweave-studio)"
BIN="${STUDIO_BIN:-$(grep -o '[^ ]*/releases/[^ ]*/bin.mjs' "$LAUNCHER" | head -1)}"
umask 077
env -i PATH="$(dirname "$(command -v node)"):/usr/bin:/bin" HOME="$DEMO/home" LANG=en_US.UTF-8 \
  "$(command -v node)" "$BIN" pair --base-dir "$DEMO/studio" --json --label recording --ttl 2h \
  > "$DEMO/secret/pair.json" 2> "$DEMO/secret/pair.err"
echo "pairing written to $DEMO/secret/pair.json (mode 600)"
