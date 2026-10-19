#!/bin/sh
# Off camera: seed a take, start its server and page, pair the recording browser, copy the Codex login, prepare.
# Usage: STUDIO_BIN=<release>/bin.mjs setup-take.sh <demo-dir> <take>
set -eu
DEMO="$1"; TAKE="$2"; HERE="$(cd "$(dirname "$0")" && pwd)"
sh "$HERE/seed.sh" "$DEMO" "$TAKE" > /dev/null
sh "$HERE/codex-auth.sh" "$DEMO/$TAKE/home"
sh "$HERE/serve.sh" "$DEMO" "$TAKE"
for i in $(seq 1 30); do curl -s -m 3 -o /dev/null http://127.0.0.1:8351/ && break; sleep 1; done
sh "$HERE/pair.sh" "$DEMO" "$TAKE"
cd "$HERE"
PWDEBUG=0 node pair-headless.mjs "$DEMO/$TAKE/secret/pair.json" "$DEMO/$TAKE/secret/state.json"
PWDEBUG=0 node record.mjs --prepare "$DEMO/$TAKE/secret/state.json"
