#!/bin/sh
# Seed one disposable demo root for the Grok episode: home/greet-app (the SERIES.md
# seed, `specweave init . --quick --adapter generic`, two Demo User commits),
# shim/scutil ("Demo Mac") and home/.zprofile (puts the shim first for login shells).
# Usage: seed.sh <demo-root>     e.g. /Users/Shared/specwithcode-demo/ep05-grok/final
# Grok sign-in and folder trust are separate (see SCRIPT.md, "Grok recording notes").
set -eu
ROOT="$1"
[ -e "$ROOT/home/greet-app" ] && { echo "$ROOT/home/greet-app exists" >&2; exit 1; }
mkdir -p "$ROOT/home/greet-app/src" "$ROOT/home/greet-app/test" "$ROOT/shim" "$ROOT/studio" "$ROOT/out" "$ROOT/tmp" "$ROOT/secret"
chmod 700 "$ROOT/secret"
NODE_BIN="$(dirname "$(command -v node)")"
GROK_BIN="$(dirname "$(command -v grok)")"

cat > "$ROOT/shim/scutil" <<'EOF'
#!/bin/sh
# Demo shim: SpecWithCode names this computer from `scutil --get ComputerName`.
if [ "$1" = "--get" ] && [ "$2" = "ComputerName" ]; then echo "Demo Mac"; exit 0; fi
if [ "$1" = "--get" ] && [ "$2" = "LocalHostName" ]; then echo "demo-mac"; exit 0; fi
if [ "$1" = "--get" ] && [ "$2" = "HostName" ]; then echo "demo-mac"; exit 0; fi
exec /usr/sbin/scutil "$@"
EOF
chmod 755 "$ROOT/shim/scutil"
cat > "$ROOT/home/.zprofile" <<EOF
# Demo HOME: the shim first, so SpecWithCode names this computer "Demo Mac".
export PATH="$ROOT/shim:$NODE_BIN:$GROK_BIN:\$PATH"
EOF

cd "$ROOT/home/greet-app"
cat > package.json <<'EOF'
{
  "name": "greet-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
EOF
printf '%s\n' 'export function greet() {' '  return "Hello, world!";' '}' > src/greeting.js
cat > test/greeting.test.js <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greeting.js";

test("greets the world", () => {
  assert.equal(greet(), "Hello, world!");
});
EOF
echo "# greet-app" > README.md
G() { git -c user.name="Demo User" -c user.email=demo@example.com -c core.hooksPath=/dev/null "$@"; }
git init -q -b main
git config user.name "Demo User"; git config user.email demo@example.com
G add -A; G commit -q -m "Initial greet-app"
env -i PATH="$ROOT/shim:$NODE_BIN:/usr/bin:/bin:/usr/sbin:/sbin" HOME="$ROOT/home" LANG=en_US.UTF-8 TMPDIR="$ROOT/tmp" \
  specweave init . --quick --adapter generic > "$ROOT/out/init.log" 2>&1
G add -A; G commit -q -m "Add SpecWeave"
git log --format='%h %an %s'
