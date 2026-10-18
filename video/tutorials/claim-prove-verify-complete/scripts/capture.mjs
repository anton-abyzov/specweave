// Final take for "Claim, prove, verify and complete a task".
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
// `expect` is the exit code the story needs (the blocked `specweave complete` exits 1); anything else stops the take.
function sh(tool, cmd, cwd = app, expect = 0) {
  const r = spawnSync("/bin/bash", ["-c", cmd], { cwd, env: env(tool), encoding: "utf8" });
  const out = (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, "");
  appendFileSync(log, `\n[${tool}] $ ${cmd}\n${out}[exit ${r.status}]\n`);
  if (r.status !== expect) { console.error(`exit ${r.status}, expected ${expect}: ${cmd}\n${out}`); process.exit(1); }
  return out.replace(/\n$/, "");
}
const write = (rel, text) => writeFileSync(`${app}/${rel}`, text);

// Off camera: the seed from SERIES.md, SpecWeave, and a one-task increment.
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

// On camera.
const shots = [];
const shot = (beat, tool, cmd, expect = 0) => { const out = sh(tool, cmd, app, expect); shots.push({ beat, tool, cmd, out, exit: expect }); return out; };
shot("02-claim", "claude", "specweave task claim T-01");
// Off camera: the change and its test, committed as "0001: …". A real pause stands for the editing time.
const gap = Number(process.env.EDIT_GAP_SECONDS ?? 45);
execFileSync("/bin/sleep", [String(gap)]);
write("src/greeting.js", 'export function greet(name = "world") {\n  return `Hello, ${name}!`;\n}\n');
write("test/greeting.test.js", testHead + '\ntest("greet(name) says hello by name", () => {\n  assert.equal(greet("Ada"), "Hello, Ada!");\n});\n');
const diff = sh("claude", "git --no-pager diff src/greeting.js");
const testDiff = sh("claude", "git --no-pager diff test/greeting.test.js");
sh("claude", 'git add -A && git commit -qm "0001: greet by name"');
shot("03-done", "claude", 'specweave task done T-01 --run "npm test"');
shot("04-evidence", "claude", `cat ${inc}/reports/task-T-01.txt`);
// A shorter real pause: reading the evidence before trying to close.
execFileSync("/bin/sleep", [String(Number(process.env.READ_GAP_SECONDS ?? 15))]);
shot("05-blocked", "claude", "specweave complete 0001", 1);
shot("06-verify", "claude", "specweave verify");
shot("07-report", "claude", `cat ${inc}/reports/verify.md`);
shot("07-report", "claude", `ls ${inc}/reports`);
shot("08-complete", "claude", "specweave complete 0001");
shot("08-complete", "claude", `jq -r .status ${inc}/metadata.json`);

const ledger = readFileSync(`${app}/${inc}/ledger.jsonl`, "utf8").trim().split("\n").map((l) => { const j = JSON.parse(l); return { t: j.t, e: j.e, by: j.by, ...(j.note ? { note: j.note } : {}) }; });
const version = sh("claude", "specweave --version");
const capture = { specweave: version, capturedAt: new Date().toISOString(), shots, offCameraDiff: diff, offCameraTestDiff: testDiff, ledger };
const text = JSON.stringify(capture, null, 2);
const me = userInfo().username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const bad of [/\/Users\/(?!Shared\b)[^/\s"]+/, new RegExp(me, "i"), /@gmail/i, /sk_[A-Za-z0-9]{8,}/]) {
  if (bad.test(text)) { console.error("capture contains private text:", bad); process.exit(1); }
}
writeFileSync(outJson, text + "\n");
console.log(`captured ${shots.length} shots with specweave ${version}`);
