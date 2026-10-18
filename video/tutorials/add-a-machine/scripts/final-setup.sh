#!/bin/sh
# Fresh final seeds on both machines, servers started, paired (Manage access), wizard finished, greet-app added with
# Full access, and a one-time Operate threads pairing code made on the M1 into final/main/secret/code (mode 600).
# Usage: M1SH=<ssh helper> final-setup.sh [--reset]   (--reset stops both final servers by PID and deletes final/)
# The ssh -L 8349 forward to the M1 must already run. Nothing secret is printed.
set -eu
R=/Users/Shared/specwithcode-demo/ep-add-machine; F=$R/final/main; S="$(cd "$(dirname "$0")" && pwd)"
if [ "${1:-}" = "--reset" ]; then
  [ -f $F/secret/server.pid ] && { P=$(cat $F/secret/server.pid); kill -TERM $P 2>/dev/null || true; while kill -0 $P 2>/dev/null; do sleep 1; done; }
  "$M1SH" 'R=/Users/Shared/specwithcode-demo/ep-add-machine; W=$R/final/worker; if [ -f $W/secret/server.pid ]; then P=$(cat $W/secret/server.pid); kill -TERM $P 2>/dev/null || true; for i in $(seq 1 30); do kill -0 $P 2>/dev/null || break; sleep 1; done; fi; rm -rf $W; /Applications/Tailscale.app/Contents/MacOS/Tailscale serve status 2>&1 | head -1'
  rm -rf $R/final
fi
umask 077
"$S/seed.sh" $F $R "Demo Mac" demo-mac >/dev/null
"$S/codex-auth.sh" $F/home
"$S/serve.sh" $F $R 8347 >/dev/null
"$M1SH" 'set -e; R=/Users/Shared/specwithcode-demo/ep-add-machine; W=$R/final/worker; $R/scripts/seed.sh $W $R "Demo Mac mini" demo-mac-mini >/dev/null; $R/scripts/codex-auth.sh $W/home; P=$($R/scripts/serve.sh $W $R 8349 --tailscale-serve --tailscale-serve-port 8445); nohup /usr/bin/caffeinate -i -w $P >/dev/null 2>&1 </dev/null & sleep 12; grep -c "Tailscale Serve configured" $W/secret/server.log; H=$(/Applications/Tailscale.app/Contents/MacOS/Tailscale status --json | python3 -c "import json,sys;print(json.load(sys.stdin)[\"Self\"][\"DNSName\"].rstrip(\".\"))"); curl -s -m 30 -o /dev/null -w "worker https %{http_code}\n" https://$H:8445/.well-known/studio/environment; $R/scripts/pair.sh $W $R >/dev/null'
"$S/pair.sh" $F $R >/dev/null
"$M1SH" 'cat /Users/Shared/specwithcode-demo/ep-add-machine/final/worker/secret/pair.json' > $F/secret/pair-m1.json
cd "$S"
PWDEBUG=0 node pair-headless.mjs $F/secret/pair.json $F/secret/state-main.json
PWDEBUG=0 node pair-headless.mjs $F/secret/pair-m1.json $F/secret/state-m1.json
PWDEBUG=0 node prepare.mjs $F/secret/state-main.json http://127.0.0.1:8347
PWDEBUG=0 node prepare.mjs $F/secret/state-m1.json http://127.0.0.1:8349
"$M1SH" 'R=/Users/Shared/specwithcode-demo/ep-add-machine; D=$R/final/worker; umask 077; env -i PATH=$D/shim:$R/tools:/usr/bin:/bin HOME=$D/home LANG=en_US.UTF-8 TMPDIR=$D/tmp $R/tools/node $R/release/bin.mjs pair --base-dir $D/studio --json --label "Demo Mac workers" --ttl 30m --scope orchestration:read --scope orchestration:operate > $D/secret/code.json 2>$D/secret/code.err; python3 -c "import json;print(json.load(open(\"$D/secret/code.json\"))[\"token\"])"' > $F/secret/code
mkdir -p $R/final/out
echo "final ready; code $(wc -c < $F/secret/code | tr -d ' ') bytes"
