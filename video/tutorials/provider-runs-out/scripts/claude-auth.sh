#!/bin/sh
# Sign Claude Code in inside a disposable demo HOME, off camera, printing nothing secret.
# Reads this Mac's Claude Code login from the Keychain and writes <demo-home>/.claude/.credentials.json
# (mode 600) with only the access token and its real expiry: refreshToken is null, so the demo can
# never rotate the real login. Delete the file at teardown.
# Usage: claude-auth.sh <demo-home>
set -eu
DEST="$1/.claude"
mkdir -p "$DEST"; chmod 700 "$DEST"
umask 077
/usr/bin/security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null | python3 -c '
import json, sys, os, time
d = json.loads(sys.stdin.read())
o = d.get("claudeAiOauth") or {}
if not o.get("accessToken"): sys.exit("no access token in the login")
left = (o.get("expiresAt", 0) / 1000) - time.time()
if left < 1800: sys.exit("access token expires in under 30 min; use claude once to refresh it, then retry")
out = {"claudeAiOauth": {k: v for k, v in o.items() if k not in ("refreshToken",)}}
out["claudeAiOauth"]["refreshToken"] = None
dst = sys.argv[1]
fd = os.open(dst, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as f: json.dump(out, f)
os.chmod(dst, 0o600)
print(f"written (mode 600), access token valid for {int(left // 60)} min")
' "$DEST/.credentials.json"
