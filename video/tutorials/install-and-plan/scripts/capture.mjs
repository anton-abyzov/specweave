// Final take for "Install SpecWeave and plan your first increment".
// Reseeds a disposable HOME under <demo>/final/home, seeds greet-app off camera, then runs every
// on-camera command and stores the exact output in <outJson>.
// Usage: node capture.mjs <demoDir> <specweaveRepo> <outJson>
// Nothing here touches the real HOME: every command runs under env -i with HOME=<demo>/final/home.
// `npm i -g specweave` really installs from the npm registry into <home>/.npm-global (npm_config_prefix),
// and every later `specweave` command runs that installed copy. PATH holds only that bin folder, a
// folder with links to node/npm (so no other global package is reachable), the scutil shim and the system.
// <specweaveRepo> is used only to check that the installed version equals this worktree's version.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, appendFileSync, symlinkSync } from "node:fs";
import { dirname } from "node:path";
import { userInfo } from "node:os";

const [demo, repo, outJson] = process.argv.slice(2);
if (!demo || !repo || !outJson) { console.error("usage: capture.mjs <demoDir> <specweaveRepo> <outJson>"); process.exit(2); }
const root = `${demo}/final`;
const home = `${root}/home`;
const shim = `${root}/shim`;
const nodebin = `${root}/nodebin`;
const app = `${home}/greet-app`;
const node = process.execPath;
rmSync(root, { recursive: true, force: true });
mkdirSync(`${home}/tmp`, { recursive: true });
mkdirSync(shim, { recursive: true });
mkdirSync(nodebin, { recursive: true });
for (const b of ["node", "npm", "npx"]) symlinkSync(`${dirname(node)}/${b}`, `${nodebin}/${b}`);
writeFileSync(`${shim}/scutil`, `#!/bin/sh\ncase "$1 $2" in\n  "--get ComputerName") echo "Demo Mac";;\n  "--get LocalHostName"|"--get HostName") echo "demo-mac";;\n  *) exec /usr/sbin/scutil "$@";;\nesac\n`, { mode: 0o755 });
writeFileSync(`${home}/.gitconfig`, "[user]\n  name = Demo User\n  email = demo@example.com\n[init]\n  defaultBranch = main\n");

const log = `${root}/session.log`;
function env(tool) {
  return {
    PATH: `${home}/.npm-global/bin:${shim}:${nodebin}:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: home, TMPDIR: `${home}/tmp`, TERM: "xterm-256color", LANG: "en_US.UTF-8",
    npm_config_prefix: `${home}/.npm-global`, npm_config_update_notifier: "false",
    SPECWEAVE_HOST: "demo", SPECWEAVE_TOOL: tool, NO_COLOR: "1", FORCE_COLOR: "0", NO_UPDATE_NOTIFIER: "1",
  };
}
function sh(tool, cmd, cwd = app) {
  // stderr goes to the same pipe as stdout, so spinner and log lines keep the order a terminal shows.
  const r = spawnSync("/bin/bash", ["-c", `exec 2>&1\n${cmd}`], { cwd, env: env(tool), encoding: "utf8" });
  const out = (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, "");
  appendFileSync(log, `\n[${tool}] $ ${cmd}\n${out}[exit ${r.status}]\n`);
  if (r.status !== 0) { console.error(`failed (${r.status}): ${cmd}\n${out}`); process.exit(1); }
  return out.replace(/\n$/, "");
}
const write = (rel, text) => writeFileSync(`${app}/${rel}`, text);

// Off camera: the seed from SERIES.md, committed. No SpecWeave yet.
mkdirSync(`${app}/src`, { recursive: true });
mkdirSync(`${app}/test`, { recursive: true });
write("package.json", JSON.stringify({ name: "greet-app", version: "0.1.0", private: true, type: "module", scripts: { test: "node --test" } }) + "\n");
write("README.md", "# greet-app\n");
write("src/greeting.js", 'export function greet() { return "Hello, world!"; }\n');
write("test/greeting.test.js", 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { greet } from "../src/greeting.js";\n\ntest("greet() says hello to the world", () => {\n  assert.equal(greet(), "Hello, world!");\n});\n');
sh("claude", 'git init -q -b main && git add -A && git commit -qm "Initial greet-app"');
const before = sh("claude", "command -v specweave || echo none");
if (before !== "none") { console.error("specweave is reachable before the install:", before); process.exit(1); }

// On camera.
const shots = [];
const shot = (beat, tool, cmd) => { const out = sh(tool, cmd); shots.push({ beat, tool, cmd, out }); return out; };
shot("02-install", "claude", "npm i -g specweave");
shot("02-install", "claude", "node --version");
const version = shot("02-install", "claude", "specweave --version");
const repoVersion = JSON.parse(readFileSync(`${repo}/package.json`, "utf8")).version;
if (version !== repoVersion) { console.error(`installed ${version}, worktree is ${repoVersion}`); process.exit(1); }
// --adapter claude: without it, tool detection also looks in fixed folders outside PATH
// (/opt/homebrew/bin, /usr/local/bin) and would report this Mac's own tools.
shot("03-init", "claude", "specweave init . --quick --adapter claude");
sh("claude", 'git add -A && git commit -qm "Add SpecWeave"');
shot("04-create", "claude", 'specweave create-increment "Personal greeting"');
const inc = ".specweave/increments/0001-personal-greeting";
const template = readFileSync(`${app}/${inc}/spec.md`, "utf8");
// Off camera: spec.md filled in (Problem, Scope, ACs, Approach, Decisions, Tasks) from the sample in captures/.
write(`${inc}/spec.md`, readFileSync(new URL("../captures/spec.md", import.meta.url), "utf8"));
shot("06-spec", "claude", `cat ${inc}/spec.md`);
shot("08-pickup", "claude", 'git add -A && git commit -m "0001: plan personal greeting"');
shot("08-pickup", "claude", "specweave pickup");

const capture = { specweave: version, capturedAt: new Date().toISOString(), shots, specTemplate: template };
const text = JSON.stringify(capture, null, 2);
const me = userInfo().username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const bad of [/\/Users\/(?!Shared\b)[^/\s"]+/, new RegExp(me, "i"), /@gmail/i, /sk_[A-Za-z0-9]{8,}/]) {
  if (bad.test(text)) { console.error("capture contains private text:", bad); process.exit(1); }
}
writeFileSync(outJson, text + "\n");
console.log(`captured ${shots.length} shots with specweave ${version}`);
