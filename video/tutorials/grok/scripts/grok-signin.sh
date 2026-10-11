#!/bin/sh
# Sign Grok in inside a demo HOME, off camera, then trust the demo repo.
# Copies only the current access key from ~/.grok/auth.json (no refresh token; the
# email and name fields are replaced with demo values) to <root>/home/.grok/auth.json,
# mode 600, never printed. Run `grok models` in your own HOME first if the key is
# close to expiry. Delete <root>/home/.grok/auth.json at teardown.
# Usage: grok-signin.sh <demo-root>
set -eu
ROOT="$1"; HERE="$(cd "$(dirname "$0")" && pwd)"
umask 077
mkdir -p "$ROOT/home/.grok"; chmod 700 "$ROOT/home/.grok"
python3 - "$ROOT/home/.grok/auth.json" <<'PY'
import json, os, sys
src = json.load(open(os.path.expanduser("~/.grok/auth.json")))
out = {}
for k, v in src.items():
    v = dict(v); v.pop("refresh_token", None)
    v.update(email="demo@example.com", first_name="Demo", profile_image_asset_id="")
    out[k] = v
fd = os.open(sys.argv[1], os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as f: json.dump(out, f)
PY
"$HERE/demo-env.sh" "$ROOT" grok models >/dev/null 2>&1 || { echo "grok is not signed in in the demo HOME" >&2; exit 1; }
"$HERE/demo-env.sh" "$ROOT" grok --trust inspect --json | jq -r '[.skills[].name|select(startswith("sw-"))]|length' | sed 's/^/sw-* skills visible to grok: /'
"$HERE/demo-env.sh" "$ROOT" grok inspect --json | jq -r '"projectTrusted: \(.projectTrusted)"'
