#!/bin/sh
# Mint a pairing token for the take's server into a mode-600 file, never printed.
# Usage: pair.sh <demo-dir> <take>
set -eu
DEMO="$1"; TAKE="$2"; R="$DEMO/$TAKE"
BIN="${STUDIO_BIN:-$DEMO/release/1.0.47/bin.mjs}"
umask 077
env -i PATH="$DEMO/tools/bin:/usr/bin:/bin" HOME="$R/home" LANG=en_US.UTF-8 \
  "$DEMO/tools/bin/node" "$BIN" pair --base-dir "$R/studio" --json --label recording --ttl 2h \
  > "$R/secret/pair.json" 2> "$R/secret/pair.err"
echo "pairing written to $R/secret/pair.json (mode 600)"
