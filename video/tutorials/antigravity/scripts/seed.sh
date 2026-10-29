#!/bin/sh
# Seed one disposable demo folder for a take: home/greet-app (SERIES.md seed, then
# `specweave init . --quick`), the scutil shim that names the computer "Demo Mac",
# and home/.zprofile that puts the shim first in the agent's login shell.
# Usage: seed.sh <demo-dir>     (refuses to reuse an existing home/greet-app)
# Prints nothing private: the init output goes to <demo-dir>/init.out.
set -eu
DEMO="$1"
[ -e "$DEMO/home/greet-app" ] && { echo "already seeded: $DEMO" >&2; exit 1; }
NODE_BIN="$(dirname "$(command -v node)")"
# ISOLATE=1: leave the node dir (and every npm-installed agent CLI in it) off PATH; link node,
# specweave and the episode's agent into <demo>/bin with AGENT_BINS instead.
[ "${ISOLATE:-0}" = 1 ] && NODE_BIN="$1/bin"
TOOL="${TOOL:-codex}"
mkdir -p "$DEMO/bin"
# AGENT_BINS: "name=/abs/path" pairs linked into <demo>/bin (a bare path keeps its basename).
for b in ${AGENT_BINS:-}; do case "$b" in *=*) ln -sf "${b#*=}" "$DEMO/bin/${b%%=*}" ;; *) ln -sf "$b" "$DEMO/bin/$(basename "$b")" ;; esac; done
mkdir -p "$DEMO/home/greet-app/src" "$DEMO/home/greet-app/test" "$DEMO/studio" "$DEMO/shim" "$DEMO/tmp" "$DEMO/out" "$DEMO/secret"
chmod 700 "$DEMO/secret"

cat > "$DEMO/shim/scutil" <<'EOF'
#!/bin/sh
# Demo shim: SpecWithCode names this computer from scutil.
if [ "${1:-}" = "--get" ]; then
  case "${2:-}" in
    ComputerName) echo "Demo Mac"; exit 0 ;;
    LocalHostName|HostName) echo "demo-mac"; exit 0 ;;
  esac
fi
exec /usr/sbin/scutil "$@"
EOF
chmod 755 "$DEMO/shim/scutil"

cat > "$DEMO/home/.zprofile" <<EOF
# Demo HOME: the shim first, so SpecWithCode names this computer "Demo Mac". PATH is set,
# not prepended, so /etc/paths.d (Homebrew) cannot add other agent CLIs to the Codex episode.
export PATH="$DEMO/shim:$DEMO/bin:$NODE_BIN:/usr/bin:/bin:/usr/sbin:/sbin"
EOF

cd "$DEMO/home/greet-app"
printf '%s\n' '{"name":"greet-app","version":"0.1.0","private":true,"type":"module","scripts":{"test":"node --test"}}' \
  | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2))' > package.json
printf '# greet-app\n' > README.md
printf 'export function greet() {\n  return "Hello, world!";\n}\n' > src/greeting.js
cat > test/greeting.test.js <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greeting.js";

test("greets the world", () => {
  assert.equal(greet(), "Hello, world!");
});
EOF
git init -q -b main
git config user.name "Demo User"
git config user.email demo@example.com
git add -A
git commit -q -m "Initial greet-app" >/dev/null 2>&1
env -i PATH="$DEMO/shim:$DEMO/bin:$NODE_BIN:/usr/bin:/bin:/usr/sbin:/sbin" HOME="$DEMO/home" LANG=en_US.UTF-8 TMPDIR="$DEMO/tmp" \
  SPECWEAVE_HOST=demo SPECWEAVE_TOOL="$TOOL" \
  specweave init . --quick ${INIT_ARGS:-} > "$DEMO/init.out" 2>&1
git add -A
git commit -q -m "Add SpecWeave" >/dev/null 2>&1
git log --oneline
