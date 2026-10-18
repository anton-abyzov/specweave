#!/bin/sh
# Mint a pairing token for the demo server into <take>/secret/pair.json, mode 600, never printed.
# Usage: pair.sh <take-dir> <root>
set -eu
D="$1"; R="$2"
umask 077
env -i PATH="$D/shim:$R/tools:/usr/bin:/bin" HOME="$D/home" LANG=en_US.UTF-8 TMPDIR="$D/tmp" \
  "$R/tools/node" "$R/release/bin.mjs" pair --base-dir "$D/studio" --json --label recording --ttl 2h \
  > "$D/secret/pair.json" 2> "$D/secret/pair.err"
echo "pairing written to $D/secret/pair.json (mode 600)"
