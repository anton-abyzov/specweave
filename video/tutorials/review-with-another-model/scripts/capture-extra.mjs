// Extra on-camera shots for "Review with the other model before you ship", added after review.
// Usage: node capture-extra.mjs <demoDir> <sessionJson>
// Runs against the disposable HOME that capture.mjs left in <demo>/final/home (same env -i, same shim) and
// appends the shots to session.json. It never runs a reviewer and needs no Codex sign-in:
// - `specweave review --brief` (prints the brief, runs nothing; review.ts:75-79) in a temporary detached
//   worktree at the head the first review saw (session: offCameraDiff parent, "0001: T-01 done");
// - `git show` of Claude's fix commit (src and test), which capture.mjs made between the two reviews;
// - the verdict line of reports/review-codex.md, which the second review overwrote.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, existsSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { userInfo } from "node:os";

const [demo, sessionJson] = process.argv.slice(2);
if (!demo || !sessionJson) { console.error("usage: capture-extra.mjs <demoDir> <sessionJson>"); process.exit(2); }
const root = `${demo}/final`, home = `${root}/home`, shim = `${root}/shim`, app = `${home}/greet-app`, wt = `${home}/greet-app-first-review`;
if (existsSync(`${home}/.codex/auth.json`)) { console.error("a Codex sign-in is present in the demo home; refusing"); process.exit(1); }
const node = process.execPath;
const log = `${root}/session.log`;
const env = (tool) => ({
  PATH: `${shim}:${dirname(node)}:/usr/bin:/bin:/usr/sbin:/sbin`,
  HOME: home, TMPDIR: `${home}/tmp`, TERM: "xterm-256color", LANG: "en_US.UTF-8",
  SPECWEAVE_HOST: "demo", SPECWEAVE_TOOL: tool, NO_COLOR: "1", FORCE_COLOR: "0", NO_UPDATE_NOTIFIER: "1",
});
function sh(tool, cmd, cwd = app) {
  const r = spawnSync("/bin/bash", ["-c", cmd], { cwd, env: env(tool), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, "");
  appendFileSync(log, `\n[${tool}] $ ${cmd}\n${out}[exit ${r.status}]\n`);
  if (r.status !== 0) { console.error(`failed (${r.status}): ${cmd}\n${out}`); process.exit(1); }
  return out.replace(/\n$/, "");
}
const session = JSON.parse(readFileSync(sessionJson, "utf8"));
session.shots = session.shots.filter((s) => !s.extra);
const shots = [];
const shot = (beat, tool, cmd, cwd) => { const out = sh(tool, cmd, cwd); shots.push({ beat, tool, cmd, out, extra: true }); return out; };
const inc = ".specweave/increments/0001-personal-greeting";

const firstHead = sh("claude", "git rev-parse HEAD~1");
if (!sh("claude", "git log -1 --format=%s HEAD~1").includes("T-01 done")) { console.error("unexpected history"); process.exit(1); }
rmSync(wt, { recursive: true, force: true });
sh("claude", "git worktree prune");
sh("claude", `git worktree add -q --detach "${wt}" ${firstHead}`);
try {
  shot("02-review", "claude", "specweave review --brief", wt);
} finally {
  sh("claude", `git worktree remove --force "${wt}"`);
}
shot("05-fix", "claude", "git --no-pager show --format=%s HEAD -- src test");
shot("07-ledger", "claude", `grep -m1 '^Verdict' ${inc}/reports/review-codex.md`);

session.shots.push(...shots);
session.extraCapturedAt = new Date().toISOString();
const text = JSON.stringify(session, null, 2);
const me = userInfo().username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const bad of [/\/Users\/(?!Shared\b)[^/\s"]+/, new RegExp(me, "i"), /@gmail/i, /sk_[A-Za-z0-9]{8,}/]) {
  if (bad.test(text)) { console.error("capture contains private text:", bad); process.exit(1); }
}
writeFileSync(sessionJson, text + "\n");
const base = session.shots.length - shots.length;
shots.forEach((s, i) => console.log(`shot ${base + i}: ${s.beat} ${s.cmd} (${s.out.split("\n").length} lines)`));
