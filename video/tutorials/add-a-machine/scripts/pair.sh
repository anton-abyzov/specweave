#!/bin/sh
# Mint a pairing token with Manage access (the standard scopes plus access:read and access:write; a --scope list
# replaces the defaults) into <demo>/secret/pair.json, mode 600, never printed.
# Usage: pair.sh <demo-dir> <root>
set -eu
DEMO="$1"; ROOT="$2"
umask 077
S=""
for s in orchestration:read orchestration:operate settings:write providers:manage environment:maintain preview:operate diagnostics:read terminal:read terminal:operate source-control:write filesystem:read filesystem:write relay:read access:read access:write; do S="$S --scope $s"; done
env -i PATH="$DEMO/shim:$ROOT/tools:/usr/bin:/bin" HOME="$DEMO/home" LANG=en_US.UTF-8 TMPDIR="$DEMO/tmp" \
  "$ROOT/tools/node" "$ROOT/release/bin.mjs" pair --base-dir "$DEMO/studio" --json --label recording --ttl 30m $S \
  > "$DEMO/secret/pair.json" 2> "$DEMO/secret/pair.err"
echo "pairing written to $DEMO/secret/pair.json (mode 600)"
