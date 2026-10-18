// Final take for "Review with the other model before you ship".
// Reseeds a disposable HOME under <demo>/final/home, runs the off-camera setup, then runs every
// on-camera command with the real specweave CLI and stores the exact output in <outJson>.
// Usage: node capture.mjs <demoDir> <specweaveRepo> <outJson>
// Nothing here touches the real HOME: every command runs under env -i with HOME=<demo>/final/home.
// The one exception is the reviewer's sign-in: <home>/.codex/auth.json is a symlink to the auth.json of a
// dedicated demo Codex sign-in, named by CODEX_DEMO_AUTH, so `specweave review` runs the real Codex reviewer
// (codex exec, read-only sandbox). There is no fallback to the owner's own ~/.codex login: the first take
// (2026-10-18) linked it, which the review flagged as needing the owner's OK. Nothing of the sign-in is
// printed, and the symlink is removed when the capture ends. Shots added later come from capture-extra.mjs.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, appendFileSync, readFileSync, symlinkSync, lstatSync } from "node:fs";
import { dirname } from "node:path";
import { userInfo } from "node:os";

const [demo, repo, outJson] = process.argv.slice(2);
if (!demo || !repo || !outJson) { console.error("usage: capture.mjs <demoDir> <specweaveRepo> <outJson>"); process.exit(2); }
const demoAuth = process.env.CODEX_DEMO_AUTH;
if (!demoAuth || demoAuth === `${process.env.HOME}/.codex/auth.json`) {
  console.error("set CODEX_DEMO_AUTH to the auth.json of a dedicated demo Codex sign-in (not your own ~/.codex login)");
  process.exit(2);
}
const root = `${demo}/final`;
const home = `${root}/home`;
const shim = `${root}/shim`;
const app = `${home}/greet-app`;
const node = process.execPath;
rmSync(root, { recursive: true, force: true });
mkdirSync(`${home}/tmp`, { recursive: true });
mkdirSync(`${home}/.codex`, { recursive: true });
mkdirSync(shim, { recursive: true });
writeFileSync(`${shim}/specweave`, `#!/bin/sh\nexec ${node} ${repo}/bin/specweave.js "$@"\n`, { mode: 0o755 });
writeFileSync(`${shim}/scutil`, `#!/bin/sh\ncase "$1 $2" in\n  "--get ComputerName") echo "Demo Mac";;\n  "--get LocalHostName"|"--get HostName") echo "demo-mac";;\n  *) exec /usr/sbin/scutil "$@";;\nesac\n`, { mode: 0o755 });
writeFileSync(`${home}/.gitconfig`, "[user]\n  name = Demo User\n  email = demo@example.com\n[init]\n  defaultBranch = main\n");
const codexAuth = `${home}/.codex/auth.json`;
symlinkSync(demoAuth, codexAuth);
const linkPresent = () => { try { lstatSync(codexAuth); return true; } catch { return false; } };
const dropAuth = () => { try { rmSync(codexAuth, { force: true }); } catch { /* gone */ } };
process.on("exit", dropAuth);

const log = `${root}/session.log`;
function env(tool) {
  return {
    PATH: `${shim}:${dirname(node)}:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: home, TMPDIR: `${home}/tmp`, TERM: "xterm-256color", LANG: "en_US.UTF-8",
    SPECWEAVE_HOST: "demo", SPECWEAVE_TOOL: tool, NO_COLOR: "1", FORCE_COLOR: "0", NO_UPDATE_NOTIFIER: "1",
  };
}
function sh(tool, cmd, cwd = app) {
  const r = spawnSync("/bin/bash", ["-c", cmd], { cwd, env: env(tool), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, "");
  appendFileSync(log, `\n[${tool}] $ ${cmd}\n${out}[exit ${r.status}]\n`);
  if (r.status !== 0) { console.error(`failed (${r.status}): ${cmd}\n${out}`); process.exit(1); }
  return out.replace(/\n$/, "");
}
const write = (rel, text) => writeFileSync(`${app}/${rel}`, text);

// Off camera: the seed from SERIES.md, SpecWeave, and a one-task increment planned on main.
mkdirSync(`${app}/src`, { recursive: true });
mkdirSync(`${app}/test`, { recursive: true });
write("package.json", JSON.stringify({ name: "greet-app", version: "0.1.0", private: true, type: "module", scripts: { test: "node --test" } }) + "\n");
write("README.md", "# greet-app\n");
write("src/greeting.js", 'export function greet() { return "Hello, world!"; }\n');
const testHead = 'import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { greet } from "../src/greeting.js";\n\ntest("greet() says hello to the world", () => {\n  assert.equal(greet(), "Hello, world!");\n});\n';
write("test/greeting.test.js", testHead);
sh("claude", 'git init -q -b main && git add -A && git commit -qm "Initial greet-app"');
sh("claude", "specweave init . --quick > /dev/null");
sh("claude", 'git add -A && git commit -qm "Add SpecWeave"');
sh("claude", 'specweave create-increment "Personal greeting" > /dev/null');
const inc = ".specweave/increments/0001-personal-greeting";
write(`${inc}/spec.md`, readFileSync(new URL("../captures/spec.md", import.meta.url), "utf8"));
sh("claude", 'git add -A && git commit -qm "0001: plan personal greeting"');

// Off camera: Claude Code's work on a branch. T-01 done with a passing test that never tries a blank name.
sh("claude", "git switch -q -c personal-greeting");
sh("claude", "specweave task claim T-01");
write("src/greeting.js", 'export function greet(name) {\n  return `Hello, ${name ?? "world"}!`;\n}\n');
const testAda = testHead + '\ntest("greet(name) says hello by name", () => {\n  assert.equal(greet("Ada"), "Hello, Ada!");\n});\n';
write("test/greeting.test.js", testAda);
sh("claude", 'git add -A && git commit -qm "0001: greet by name"');
sh("claude", 'specweave task done T-01 --run "npm test"');
sh("claude", 'git add -A && git commit -qm "0001: T-01 done"');

// On camera.
const shots = [];
const shot = (beat, tool, cmd) => { const out = sh(tool, cmd); shots.push({ beat, tool, cmd, out }); return out; };
const t0 = Date.now();
shot("02-review", "claude", 'specweave review; echo "exit $?"');
const firstRunSeconds = Math.round((Date.now() - t0) / 1000);
shot("04-report", "claude", `cat ${inc}/reports/review-codex.md`);

// Off camera: Claude's fix for the finding, committed under the claude tool id; the video shows its diff.
write("src/greeting.js", 'export function greet(name) {\n  const trimmed = typeof name === "string" ? name.trim() : "";\n  return `Hello, ${trimmed || "world"}!`;\n}\n');
const diff = sh("claude", "git --no-pager diff src/greeting.js");
write("test/greeting.test.js", testAda + '\ntest("a blank name falls back to the world", () => {\n  assert.equal(greet(""), "Hello, world!");\n  assert.equal(greet("   "), "Hello, world!");\n});\n');
shot("05-fix", "claude", "npm test 2>&1 | grep -E '^# (tests|pass|fail)'");
sh("claude", 'git add -A && git commit -qm "0001: fall back on a blank name"');
const t1 = Date.now();
shot("06-again", "claude", 'specweave review; echo "exit $?"');
const secondRunSeconds = Math.round((Date.now() - t1) / 1000);
shot("07-ledger", "claude", `grep '"e":"note"' ${inc}/ledger.jsonl | jq -r .note`);

const ledger = readFileSync(`${app}/${inc}/ledger.jsonl`, "utf8").trim().split("\n").map((l) => { const j = JSON.parse(l); return { t: j.t, e: j.e, by: j.by, ...(j.note ? { note: j.note } : {}) }; });
const version = sh("claude", "specweave --version");
const codexVersion = sh("claude", "codex --version");
const capture = { specweave: version, codex: codexVersion, capturedAt: new Date().toISOString(), reviewSeconds: [firstRunSeconds, secondRunSeconds], shots, offCameraDiff: diff, ledger };
const text = JSON.stringify(capture, null, 2);
const me = userInfo().username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const bad of [/\/Users\/(?!Shared\b)[^/\s"]+/, new RegExp(me, "i"), /@gmail/i, /sk_[A-Za-z0-9]{8,}/]) {
  if (bad.test(text)) { console.error("capture contains private text:", bad); process.exit(1); }
}
dropAuth();
if (linkPresent()) { console.error("auth link still present"); process.exit(1); }
writeFileSync(outJson, text + "\n");
console.log(`captured ${shots.length} shots with specweave ${version}; reviews took ${firstRunSeconds}s and ${secondRunSeconds}s`);
