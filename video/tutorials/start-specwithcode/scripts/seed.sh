#!/bin/sh
# Build one disposable take folder for "Start SpecWithCode with a coordinator and two workers".
# Usage: seed.sh <demo-dir> <take>      e.g. seed.sh /Users/Shared/specwithcode-demo/tut04-start-specwithcode final
# <demo>/tools/   published specweave (npm, pinned) plus links to node and codex; shared by every take
# <demo>/<take>/  home/ (HOME for the server and the agents), home/greet-app (the seed repo with increment 0001
#                 planned off camera), shim/ (scutil names the computer "Demo Mac"), studio/ (--base-dir),
#                 tmp/, secret/ (mode 700). Deleted and rebuilt on every run.
# Nothing here reads or writes the real HOME.
set -eu
DEMO="$1"; TAKE="$2"
HERE="$(cd "$(dirname "$0")" && pwd)"
NODE="$(command -v node)"
NODE_DIR="$(dirname "$NODE")"
SPECWEAVE_VERSION="${SPECWEAVE_VERSION:-3.1.0}"
T="$DEMO/tools"
if [ ! -x "$T/node_modules/.bin/specweave" ] || ! grep -q "\"version\": \"$SPECWEAVE_VERSION\"" "$T/node_modules/specweave/package.json"; then
  mkdir -p "$T"
  npm install --prefix "$T" --no-audit --no-fund --silent "specweave@$SPECWEAVE_VERSION"
fi
mkdir -p "$T/bin"
ln -sfn "$NODE" "$T/bin/node"
ln -sfn "$NODE_DIR/codex" "$T/bin/codex"
ln -sfn "$T/node_modules/.bin/specweave" "$T/bin/specweave"

R="$DEMO/$TAKE"
rm -rf "$R"
mkdir -p "$R/home/greet-app/src" "$R/home/greet-app/test" "$R/shim" "$R/studio" "$R/tmp" "$R/secret"
chmod 700 "$R/secret"
cat > "$R/shim/scutil" <<'EOF'
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
chmod 755 "$R/shim/scutil"
DEMO_PATH="$R/shim:$T/bin:/usr/bin:/bin:/usr/sbin:/sbin"
printf '# Demo HOME: the shim and the demo tools only, so the computer reads "Demo Mac" and no other agent CLI is found.\nexport PATH="%s"\n' "$DEMO_PATH" > "$R/home/.zprofile"
cp "$R/home/.zprofile" "$R/home/.bashrc"
printf '[user]\n  name = Demo User\n  email = demo@example.com\n[init]\n  defaultBranch = main\n' > "$R/home/.gitconfig"

A="$R/home/greet-app"
printf '{"name":"greet-app","version":"0.1.0","private":true,"type":"module","scripts":{"test":"node --test"}}\n' > "$A/package.json"
printf '# greet-app\n' > "$A/README.md"
printf 'export function greet() { return "Hello, world!"; }\n' > "$A/src/greeting.js"
cat > "$A/test/greeting.test.js" <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greeting.js";

test("greet() says hello to the world", () => {
  assert.equal(greet(), "Hello, world!");
});
EOF
run() { (cd "$A" && env -i PATH="$DEMO_PATH" HOME="$R/home" TMPDIR="$R/tmp" LANG=en_US.UTF-8 \
  SPECWEAVE_HOST=demo SPECWEAVE_TOOL=codex NO_COLOR=1 NO_UPDATE_NOTIFIER=1 /bin/sh -c "$1"); }
run 'git init -q -b main && git add -A && git commit -qm "Initial greet-app"'
run 'specweave init . --quick > /dev/null'
run 'git add -A && git commit -qm "Add SpecWeave"'
run 'specweave create-increment "Greet and farewell" > /dev/null'
INC="$(cd "$A/.specweave/increments" && ls -d 0001-* | head -1)"
cp "$HERE/../captures/spec.md" "$A/.specweave/increments/$INC/spec.md"
run "git add -A && git commit -qm \"0001: plan greet and farewell\""
run 'specweave --version'
echo "seeded $R (increment $INC)"
