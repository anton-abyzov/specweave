// After the take: run the on-camera terminal commands in the demo repo and store their exact output.
// Usage: node capture-ledger.mjs <demoDir> <specweaveRepo> <outJson>
// Runs under env -i with HOME=<demo>/home and the demo shim (this worktree's specweave); no SPECWEAVE_TOOL.
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { userInfo } from "node:os";
const [demo, repo, outJson] = process.argv.slice(2);
const app = `${demo}/home/greet-app`;
const env = { PATH: `${demo}/shim:${dirname(process.execPath)}:/usr/bin:/bin`, HOME: `${demo}/home`, TMPDIR: `${demo}/tmp`, LANG: "en_US.UTF-8",
  SPECWEAVE_HOST: "demo", NO_COLOR: "1", FORCE_COLOR: "0", NO_UPDATE_NOTIFIER: "1", TERM: "xterm-256color" };
const shots = [];
for (const [beat, cmd] of [["06-ledger", "specweave task list"], ["06-ledger", "git log --oneline -3"]]) {
  const r = spawnSync("/bin/sh", ["-c", cmd], { cwd: app, env, encoding: "utf8" });
  if (r.status !== 0) { console.error(cmd, r.status, r.stderr); process.exit(1); }
  shots.push({ beat, tool: "terminal", cmd, out: (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, "").replace(/\n$/, "") });
}
const text = JSON.stringify(shots);
const me = userInfo().username;
if (/\/Users\/(?!Shared)[^/"]+/.test(text) || text.includes(me) || /@gmail|sk_[A-Za-z0-9]{8}/.test(text)) { console.error("privacy check failed"); process.exit(3); }
const version = JSON.parse(readFileSync(`${repo}/package.json`, "utf8")).version;
writeFileSync(outJson, JSON.stringify({ specweave: version, app: "SpecWithCode 1.0.43", capturedAt: new Date().toISOString(), shots }, null, 1) + "\n");
shots.forEach((s, i) => { console.log("=====", i, s.cmd); s.out.split("\n").forEach((l, j) => console.log(j, l)); });
