// Final take for "Hand off from Claude Code to Codex at a usage limit".
// Reseeds a disposable HOME under <demo>/final/home, runs the off-camera setup, then runs every
// on-camera command with the real specweave CLI and stores the exact output in <outJson>.
// Usage: node capture.mjs <demoDir> <specweaveRepo> <outJson>
// Nothing here touches the real HOME: every command runs under env -i with HOME=<demo>/final/home.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { userInfo } from "node:os";

const [demo, repo, outJson] = process.argv.slice(2);
if (!demo || !repo || !outJson) { console.error("usage: capture.mjs <demoDir> <specweaveRepo> <outJson>"); process.exit(2); }
const root = `${demo}/final`;
const home = `${root}/home`;
const shim = `${root}/shim`;
const app = `${home}/greet-app`;
const node = process.execPath;
rmSync(root, { recursive: true, force: true });
mkdirSync(`${home}/tmp`, { recursive: true });
mkdirSync(shim, { recursive: true });
writeFileSync(`${shim}/specweave`, `#!/bin/sh\nexec ${node} ${repo}/bin/specweave.js "$@"\n`, { mode: 0o755 });
writeFileSync(`${shim}/scutil`, `#!/bin/sh\ncase "$1 $2" in\n  "--get ComputerName") echo "Demo Mac";;\n  "--get LocalHostName"|"--get HostName") echo "demo-mac";;\n  *) exec /usr/sbin/scutil "$@";;\nesac\n`, { mode: 0o755 });
writeFileSync(`${home}/.gitconfig`, "[user]\n  name = Demo User\n  email = demo@example.com\n[init]\n  defaultBranch = main\n");

const log = `${root}/session.log`;
function env(tool) {
  return {
    PATH: `${shim}:${dirname(node)}:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: home, TMPDIR: `${home}/tmp`, TERM: "xterm-256color", LANG: "en_US.UTF-8",
    SPECWEAVE_HOST: "demo", SPECWEAVE_TOOL: tool, NO_COLOR: "1", FORCE_COLOR: "0", NO_UPDATE_NOTIFIER: "1",
  };
}
function sh(tool, cmd, cwd = app) {
  const r = spawnSync("/bin/bash", ["-c", cmd], { cwd, env: env(tool), encoding: "utf8" });
  const out = (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, "");
  appendFileSync(log, `\n[${tool}] $ ${cmd}\n${out}[exit ${r.status}]\n`);
  if (r.status !== 0) { console.error(`failed (${r.status}): ${cmd}\n${out}`); process.exit(1); }
  return out.replace(/\n$/, "");
}
const write = (rel, text) => writeFileSync(`${app}/${rel}`, text);

// Off camera: the seed from SERIES.md, SpecWeave, and a two-task increment.
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
sh("claude", "specweave auto-handoff on --mode suggest");

// Off camera: Claude Code's earlier work. T-01 done with evidence, T-02 claimed, a new test not committed yet.
sh("claude", "specweave task claim T-01");
write("src/greeting.js", 'export function greet(name) {\n  return `Hello, ${name ?? "world"}!`;\n}\n');
write("test/greeting.test.js", testHead + '\ntest("greet(name) says hello by name", () => {\n  assert.equal(greet("Ada"), "Hello, Ada!");\n});\n');
sh("claude", 'git add -A && git commit -qm "0001: greet by name"');
sh("claude", 'specweave task done T-01 --run "npm test"');
sh("claude", "specweave task claim T-02");
appendFileSync(`${app}/test/greeting.test.js`, '\ntest("a blank name falls back to the world", () => {\n  assert.equal(greet("  "), "Hello, world!");\n});\n');

// The usage reading Claude Code's status line would pass in: 95% of the 5-hour window, resetting in 130 min.
const now = Math.floor(Date.now() / 1000);
writeFileSync(`${home}/claude-status.json`, JSON.stringify({
  session_id: "demo-session-1", cwd: app, workspace: { current_dir: app }, model: { display_name: "Claude Opus 5.5" },
  rate_limits: { five_hour: { used_percentage: 95, resets_at: now + 130 * 60 }, seven_day: { used_percentage: 41, resets_at: now + 4 * 86400 } },
}) + "\n");
writeFileSync(`${home}/stop-hook.json`, JSON.stringify({ session_id: "demo-session-1", cwd: app, hook_event_name: "Stop", stop_hook_active: false }) + "\n");

// On camera.
const shots = [];
const shot = (beat, tool, cmd) => { const out = sh(tool, cmd); shots.push({ beat, tool, cmd, out }); return out; };
shot("02-limit", "claude", "specweave statusline < ~/claude-status.json");
shot("02-limit", "claude", "specweave usage-guard < ~/stop-hook.json | jq -r .systemMessage");
shot("03-handoff", "claude", 'specweave handoff --reason "usage at 95% of the 5-hour limit"');
shot("04-doc", "claude", `cat ${inc}/handoff.md`);
// A real pause between the two tools, so the timestamps and "1m ago" read like a real switch.
const gap = Number(process.env.PICKUP_GAP_SECONDS ?? 75);
execFileSync("/bin/sleep", [String(gap)]);
shot("05-pickup", "codex", "specweave pickup");
shot("05-pickup", "codex", `grep '"e":"pickup"' ${inc}/ledger.jsonl | jq -c '{e,by,note}'`);
shot("06-next", "codex", "specweave task claim T-02");
// Off camera: the change for T-02, committed under the codex tool id.
write("src/greeting.js", 'export function greet(name) {\n  return `Hello, ${name?.trim() || "world"}!`;\n}\n');
const diff = sh("codex", "git --no-pager diff src/greeting.js");
sh("codex", 'git add -A && git commit -qm "0001: fall back on a blank name"');
shot("07-done", "codex", 'specweave task done T-02 --run "npm test"');
shot("07-done", "codex", `tail -n 1 ${inc}/ledger.jsonl | jq -c '{t,e,by}'`);

const ledger = readFileSync(`${app}/${inc}/ledger.jsonl`, "utf8").trim().split("\n").map((l) => { const j = JSON.parse(l); return { t: j.t, e: j.e, by: j.by, ...(j.note ? { note: j.note } : {}) }; });
const version = sh("claude", "specweave --version");
const capture = { specweave: version, capturedAt: new Date().toISOString(), shots, offCameraDiff: diff, ledger };
const text = JSON.stringify(capture, null, 2);
const me = userInfo().username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const bad of [/\/Users\/(?!Shared\b)[^/\s"]+/, new RegExp(me, "i"), /@gmail/i, /sk_[A-Za-z0-9]{8,}/]) {
  if (bad.test(text)) { console.error("capture contains private text:", bad); process.exit(1); }
}
writeFileSync(outJson, text + "\n");
console.log(`captured ${shots.length} shots with specweave ${version}`);
