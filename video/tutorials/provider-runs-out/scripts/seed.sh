#!/bin/sh
# Seed one disposable demo folder: home/greet-app (SERIES.md seed, `specweave init . --quick`,
# then the two-task increment from captures/spec.md, written off camera), the scutil shim
# that names the computer "Demo Mac", a `specweave` shim that runs this worktree's CLI,
# a tools/ folder with only the claude and codex CLIs, and home/.zprofile.
# Usage: seed.sh <demo-dir> <specweave-repo>     (refuses to reuse an existing home/greet-app)
set -eu
DEMO="$1"; REPO="$2"
EP="$(cd "$(dirname "$0")/.." && pwd)"
[ -e "$DEMO/home/greet-app" ] && { echo "already seeded: $DEMO" >&2; exit 1; }
NODE="$(command -v node)"; NODE_BIN="$(dirname "$NODE")"
mkdir -p "$DEMO/home/greet-app/src" "$DEMO/home/greet-app/test" "$DEMO/studio" "$DEMO/shim" "$DEMO/tools" "$DEMO/tmp" "$DEMO/out" "$DEMO/secret"
chmod 700 "$DEMO/secret"
cat > "$DEMO/shim/scutil" <<'SH'
#!/bin/sh
if [ "${1:-}" = "--get" ]; then
  case "${2:-}" in
    ComputerName) echo "Demo Mac"; exit 0 ;;
    LocalHostName|HostName) echo "demo-mac"; exit 0 ;;
  esac
fi
exec /usr/sbin/scutil "$@"
SH
printf '#!/bin/sh\nexec %s %s/bin/specweave.js "$@"\n' "$NODE" "$REPO" > "$DEMO/shim/specweave"
chmod 755 "$DEMO/shim/scutil" "$DEMO/shim/specweave"
ln -sfn "$HOME/.local/bin/claude" "$DEMO/tools/claude"
ln -sfn "$NODE_BIN/codex" "$DEMO/tools/codex"
P="$DEMO/shim:$DEMO/tools:$NODE_BIN:/usr/bin:/bin:/usr/sbin:/sbin"
printf '# Demo HOME: shim first (Demo Mac, this worktree'"'"'s specweave), then only claude and codex.\nexport PATH="%s"\n' "$P" > "$DEMO/home/.zprofile"
printf '[user]\n  name = Demo User\n  email = demo@example.com\n[init]\n  defaultBranch = main\n' > "$DEMO/home/.gitconfig"
cd "$DEMO/home/greet-app"
printf '%s\n' '{"name":"greet-app","version":"0.1.0","private":true,"type":"module","scripts":{"test":"node --test"}}' \
  | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2))' > package.json
printf '# greet-app\n' > README.md
printf 'export function greet() {\n  return "Hello, world!";\n}\n' > src/greeting.js
cat > test/greeting.test.js <<'JS'
import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greeting.js";

test("greets the world", () => {
  assert.equal(greet(), "Hello, world!");
});
JS
E="env -i PATH=$P HOME=$DEMO/home LANG=en_US.UTF-8 TMPDIR=$DEMO/tmp SPECWEAVE_HOST=demo SPECWEAVE_TOOL=cli GIT_CONFIG_NOSYSTEM=1"
$E git init -q -b main
$E git add -A
$E git -c core.hooksPath=/dev/null commit -q -m "Initial greet-app"
$E specweave init . --quick > "$DEMO/init.out" 2>&1
$E git add -A
$E git -c core.hooksPath=/dev/null commit -q -m "Add SpecWeave"
$E specweave create-increment "Personal greeting" >> "$DEMO/init.out" 2>&1
cp "$EP/captures/spec.md" .specweave/increments/0001-personal-greeting/spec.md
$E git add -A
$E git -c core.hooksPath=/dev/null commit -q -m "0001: plan personal greeting"
$E git log --oneline
ls .specweave/increments/0001-personal-greeting
