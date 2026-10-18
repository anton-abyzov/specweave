#!/bin/sh
# Seed one disposable demo folder for add-a-machine, with nothing linked into the owner's home:
#   home/greet-app  the SERIES.md seed, origin https://github.com/demo/greet-app.git (never fetched),
#                   `specweave init . --quick`, committed by Demo User <demo@example.com>;
#   shim/scutil     answers ComputerName "$NAME" (default "Demo Mac"), LocalHostName/HostName "$HOSTSHORT";
#   shim/specweave  runs the copied specweave package with the copied node;
#   home/.gitconfig Demo User, credential helpers reset with an empty "helper =" line;
#   home/.zprofile  the shim first, then the copied tools.
# Usage: seed.sh <demo-dir> <root-with-tools> [ComputerName] [hostname] [--no-repo]
set -eu
DEMO="$1"; ROOT="$2"; NAME="${3:-Demo Mac}"; HOSTSHORT="${4:-demo-mac}"; NOREPO="${5:-}"
[ -e "$DEMO/home/greet-app" ] && { echo "already seeded: $DEMO" >&2; exit 1; }
mkdir -p "$DEMO/home" "$DEMO/studio" "$DEMO/shim" "$DEMO/tmp" "$DEMO/out" "$DEMO/secret"
chmod 700 "$DEMO/secret"
cat > "$DEMO/shim/scutil" <<EOF2
#!/bin/sh
if [ "\${1:-}" = "--get" ]; then
  case "\${2:-}" in
    ComputerName) echo "$NAME"; exit 0 ;;
    LocalHostName|HostName) echo "$HOSTSHORT"; exit 0 ;;
  esac
fi
exec /usr/sbin/scutil "\$@"
EOF2
printf '#!/bin/sh\nexec %s/tools/node %s/specweave-pkg/bin/specweave.js "$@"\n' "$ROOT" "$ROOT" > "$DEMO/shim/specweave"
chmod 755 "$DEMO/shim/scutil" "$DEMO/shim/specweave"
P="$DEMO/shim:$ROOT/tools:/usr/bin:/bin:/usr/sbin:/sbin"
printf '# Demo HOME: shim first (demo computer name, copied specweave), then the copied tools.\nexport PATH="%s"\n' "$P" > "$DEMO/home/.zprofile"
cp "$DEMO/home/.zprofile" "$DEMO/home/.bash_profile"
printf '[user]\n  name = Demo User\n  email = demo@example.com\n[init]\n  defaultBranch = main\n[credential]\n  helper =\n[core]\n  hooksPath = /dev/null\n' > "$DEMO/home/.gitconfig"
[ "$NOREPO" = "--no-repo" ] && exit 0
mkdir -p "$DEMO/home/greet-app/src" "$DEMO/home/greet-app/test"
cd "$DEMO/home/greet-app"
cat > package.json <<'JSON'
{
  "name": "greet-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
JSON
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
$E git remote add origin https://github.com/demo/greet-app.git
$E git add -A
$E git commit -q -m "Initial greet-app"
$E specweave init . --quick > "$DEMO/init.out" 2>&1
$E git add -A
$E git commit -q -m "Add SpecWeave"
$E git log --oneline
