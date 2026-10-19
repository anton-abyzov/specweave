#!/bin/sh
# Build one disposable take folder for "Let agents use a browser".
# Usage: seed.sh <demo-dir> <take>      e.g. seed.sh /Users/Shared/specwithcode-demo/tut09-agents-use-a-browser final
# <demo>/tools/   copied (not linked) node, codex and specweave 3.1.0, so no real-HOME path shows up anywhere
# <demo>/release/1.0.47/   a copy of the SpecWithCode 1.0.47 release bundle
# <demo>/<take>/  home/ (HOME for the server and the agent), home/greet-app (the seed repo plus a one-page
#                 greeting demo in public/), shim/ (scutil names the computer "Demo Mac"), studio/ (--base-dir,
#                 with the release's pinned headless shell copied into tools/), tmp/, secret/ (mode 700).
# Deleted and rebuilt on every run. Nothing here writes the real HOME
# (the already-installed pinned headless shell is copied from it, read only).
set -eu
DEMO="$1"; TAKE="$2"
T="$DEMO/tools"
[ -x "$T/bin/node" ] && [ -x "$T/bin/codex" ] && [ -x "$T/bin/specweave" ] || { echo "tools missing in $T" >&2; exit 1; }
R="$DEMO/$TAKE"
rm -rf "$R"
mkdir -p "$R/home/greet-app/src" "$R/home/greet-app/test" "$R/home/greet-app/public" "$R/shim" "$R/studio/tools" "$R/tmp" "$R/secret"
chmod 700 "$R/secret"
SHELL_SRC="${HEADLESS_SHELL_SRC:-$HOME/.specwithcode/m4/tools/chrome-headless-shell}"
cp -R "$SHELL_SRC" "$R/studio/tools/chrome-headless-shell"
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
cat > "$R/shim/hostname" <<'EOF'
#!/bin/sh
echo demo-mac
EOF
chmod 755 "$R/shim/scutil" "$R/shim/hostname"
DEMO_PATH="$R/shim:$T/bin:/usr/bin:/bin:/usr/sbin:/sbin"
printf '# Demo HOME: the shim and the demo tools only, so the computer reads "Demo Mac" and no other agent CLI is found.\nexport PATH="%s"\n' "$DEMO_PATH" > "$R/home/.zprofile"
cp "$R/home/.zprofile" "$R/home/.bashrc"
printf '[user]\n  name = Demo User\n  email = demo@example.com\n[init]\n  defaultBranch = main\n' > "$R/home/.gitconfig"

A="$R/home/greet-app"
printf '{"name":"greet-app","version":"0.1.0","private":true,"type":"module","scripts":{"test":"node --test","start":"node serve.js"}}\n' > "$A/package.json"
printf '# greet-app\n\n`npm start` serves the demo page on http://127.0.0.1:5173.\n' > "$A/README.md"
cat > "$A/src/greeting.js" <<'EOF'
export function greet(name) {
  const who = (name ?? "").trim();
  return who ? `Hello, ${who}!` : "Hello, world!";
}
EOF
cat > "$A/test/greeting.test.js" <<'EOF'
import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greeting.js";

test("greets by name", () => {
  assert.equal(greet("Ada"), "Hello, Ada!");
});

test("falls back on a blank name", () => {
  assert.equal(greet("  "), "Hello, world!");
});
EOF
cat > "$A/public/index.html" <<'EOF'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>greet-app</title>
<style>
  /* Sized in vw so the page reads at any tab width, including a scaled-down panel. */
  :root { color-scheme: light; --ink: #241523; --iris: #6d4fb5; --line: #dcd7e3; --canvas: #f8f7f9; font-size: 2.1vw; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--canvas);
         font: 1rem/1.45 -apple-system, "Helvetica Neue", Arial, sans-serif; color: var(--ink); }
  main { width: 62vw; background: #fff; border: 0.06rem solid var(--line); border-radius: 0.8rem; padding: 1.8rem 2rem; }
  h1 { margin: 0 0 0.2rem; font-size: 1.7rem; }
  p.lede { margin: 0 0 1.1rem; color: #6b6070; }
  label { display: block; font-weight: 600; margin-bottom: 0.35rem; }
  .row { display: flex; gap: 0.5rem; }
  input { flex: 1; min-width: 0; font: inherit; padding: 0.5rem 0.7rem; border: 0.06rem solid var(--line); border-radius: 0.45rem; }
  button { font: inherit; font-weight: 600; padding: 0.5rem 1.1rem; border: 0; border-radius: 0.45rem; background: var(--iris); color: #fff; cursor: pointer; }
  output { display: block; margin-top: 1.2rem; font-size: 1.6rem; font-weight: 700; min-height: 2.3rem; }
</style>
</head>
<body>
<main>
  <h1>greet-app</h1>
  <p class="lede">Type a name and press Greet.</p>
  <form id="f">
    <label for="name">Name</label>
    <div class="row">
      <input id="name" name="name" autocomplete="off" placeholder="Your name">
      <button type="submit">Greet</button>
    </div>
  </form>
  <output id="out" aria-live="polite"></output>
</main>
<script type="module">
  import { greet } from "/src/greeting.js";
  const f = document.getElementById("f");
  const out = document.getElementById("out");
  f.addEventListener("submit", (e) => { e.preventDefault(); out.textContent = greet(f.name.value); });
</script>
</body>
</html>
EOF
cat > "$A/serve.js" <<'EOF'
// Serve public/ and src/ on 127.0.0.1:5173 (no dependencies).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const root = new URL(".", import.meta.url).pathname;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  const file = path === "/" ? join(root, "public/index.html") : path.startsWith("/src/") ? join(root, path) : null;
  try {
    if (!file) throw new Error();
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("Not found"); }
}).listen(Number(process.env.PORT ?? 5173), "127.0.0.1", () => console.log(`greet-app on http://127.0.0.1:${process.env.PORT ?? 5173}`));
EOF
run() { (cd "$A" && env -i PATH="$DEMO_PATH" HOME="$R/home" TMPDIR="$R/tmp" LANG=en_US.UTF-8 \
  SPECWEAVE_HOST=demo SPECWEAVE_TOOL=codex NO_COLOR=1 NO_UPDATE_NOTIFIER=1 /bin/sh -c "$1"); }
run 'git init -q -b main && git add -A && git commit -qm "Initial greet-app"'
run 'specweave init . --quick > /dev/null'
run 'git add -A && git commit -qm "Add SpecWeave"'
run 'node --test > /dev/null'
echo "seeded $R"
