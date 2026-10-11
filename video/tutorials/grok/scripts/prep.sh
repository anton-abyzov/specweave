#!/bin/sh
# Prepare one demo root for a take: seed greet-app, sign Grok in and trust the repo
# (off camera), start the server, pair a headless browser, finish the wizard.
# Usage: prep.sh <demo-root> [port]      Prints the server PID on the last line.
set -eu
ROOT="$1"; PORT="${2:-8334}"; HERE="$(cd "$(dirname "$0")" && pwd)"
sh "$HERE/seed.sh" "$ROOT"
sh "$HERE/grok-signin.sh" "$ROOT"
sh "$HERE/serve.sh" "$ROOT" grok "$PORT" >/dev/null 2>&1 </dev/null; PID=$(cat "$ROOT/secret/server.pid")
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 1
done
sh "$HERE/pair.sh" "$ROOT" >/dev/null
PWDEBUG=0 node "$HERE/pair-headless.mjs" "$ROOT/secret/pair.json" "$ROOT/secret/state.json" | sed 's/ origin .*//'
PWDEBUG=0 node "$HERE/finish-wizard.mjs" "$ROOT/secret/state.json" "http://127.0.0.1:$PORT"
chmod 600 "$ROOT/secret/state.json"
echo "$PID"
