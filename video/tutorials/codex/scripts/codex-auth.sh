#!/bin/sh
# Sign Codex in inside a disposable demo HOME, off camera, without printing anything secret.
# Copies ~/.codex/auth.json to <demo-home>/.codex/auth.json (mode 600) with the refresh token
# blanked, so the demo can never rotate (and invalidate) the real login. The access token
# alone lasts until it expires (about ten days after the last refresh on this Mac).
# Usage: codex-auth.sh <demo-home>        Delete the file at teardown: rm <demo-home>/.codex/auth.json
set -eu
DEST="$1/.codex"
mkdir -p "$DEST"; chmod 700 "$DEST"
umask 077
python3 - "$HOME/.codex/auth.json" "$DEST/auth.json" <<'EOF'
import json, sys, base64, datetime, os
src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))
t = d.get("tokens") or {}
p = t["access_token"].split(".")[1]; p += "=" * (-len(p) % 4)
exp = datetime.datetime.fromtimestamp(json.loads(base64.urlsafe_b64decode(p))["exp"], datetime.timezone.utc)
left = exp - datetime.datetime.now(datetime.timezone.utc)
if left.total_seconds() < 6 * 3600: sys.exit("access token expires too soon; refresh the real Codex login first")
t["refresh_token"] = ""
fd = os.open(dst, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as f: json.dump(d, f)
os.chmod(dst, 0o600)
print(f"written (mode 600), access token valid for {left.days} d {left.seconds // 3600} h")
EOF
