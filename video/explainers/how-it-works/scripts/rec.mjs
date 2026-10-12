// Headless 4K takes of a running SpecWithCode server through a read-only session.
// Usage: rec.mjs <storageState.json> <outDir> <take>. Text on screen is masked (tailnet hostnames,
// emails, home paths, Tailscale IPs) and the read-only notice is hidden; nothing is written to the server.
import { chromium } from "./pw.mjs";
import { writeFileSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
const [state, out, seg] = process.argv.slice(2);
const B = "http://127.0.0.1:8319";
const EC = B + "/projects/github.com%2Fanton-abyzov%2Fsw-easychamp";
const TACT = EC + "?thread=thread%3Adelegated-task%3Acommand%253Amcp%253A20af504d-6f37-4c0b-a1c6-b2f1be140b44%253Adelegate-task%253Ateam-tactical-templates-2026-10-12";
const vdir = `${out}/${seg}-video`; rmSync(vdir, { recursive: true, force: true }); mkdirSync(vdir, { recursive: true });
// Cosmetic, on-screen only: cursor ring, hide the read-only notice, mask hostnames, emails and home paths.
const overlay = `(() => {
 const css = document.createElement("style"); css.textContent = "*{scrollbar-width:none} html{zoom:2}";
 const mask = (s) => s.replace(/[\\w-]+\\.[\\w-]+\\.ts\\.net/g, "m4-max.your-tailnet.ts.net").replace(/[\\w.+-]+@[\\w-]+\\.[\\w.]+/g, "you@example.com").replace(/\\/Users\\/[\\w.-]+/g, "~").replace(/\\b100\\.\\d+\\.\\d+\\.\\d+\\b/g, "100.x.y.z");
 const walk = (n) => { const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) { const v = mask(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; if (/This connection has read-only access/.test(t.nodeValue)) { const p = t.parentElement; if (p) p.style.visibility = "hidden"; } } };
 const install = () => { if (css.isConnected) return; document.head.appendChild(css);
  walk(document.body); new MutationObserver(ms => { for (const m of ms) { if (m.type === "characterData") { const v = mask(m.target.nodeValue); if (v !== m.target.nodeValue) m.target.nodeValue = v; } else m.addedNodes.forEach(n => n.nodeType === 1 ? walk(n) : n.nodeType === 3 && (n.nodeValue = mask(n.nodeValue))); } walk(document.body); }).observe(document.body, { childList: true, subtree: true, characterData: true }); };
 if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install(); })();`;
const browser = await chromium.launch({ headless: true });
// Load the page first in a non-recording context so the take starts on a settled screen.
const ctx = await browser.newContext({ storageState: state, viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1, colorScheme: "light" });
await ctx.addInitScript(overlay);
const page = await ctx.newPage(); let t0 = Date.now();
// Sharp 3840x2160 frames from the CDP screencast, each stamped with its capture time.
const cdp = await ctx.newCDPSession(page); const frames = []; let fn = 0; const tVid = Date.now();
const { writeFileSync: wf } = await import("node:fs");
cdp.on("Page.screencastFrame", async (f) => { const name = `${vdir}/f${String(++fn).padStart(5, "0")}.jpg`; wf(name, Buffer.from(f.data, "base64")); frames.push({ name, ts: f.metadata.timestamp }); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 94, maxWidth: 3840, maxHeight: 2160, everyNthFrame: 1 }); const cues = [];
const cue = (label) => { const s = (Date.now() - t0) / 1000; cues.push({ s, label }); console.log(s.toFixed(1), label); };
let mouse = { x: 2200, y: 1200 };
const moves = [];
const moveTo = async (x, y, speed = 44) => { const s0 = (Date.now() - t0) / 1000; await page.mouse.move(x, y, { steps: Math.max(12, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / speed)) }); mouse = { x, y }; moves.push({ s: s0, e: (Date.now() - t0) / 1000, x: x / 2, y: y / 2 }); };
const box = async (loc) => { await loc.scrollIntoViewIfNeeded(); return loc.boundingBox(); };
const hover = async (loc, dx = 0.5) => { const b = await box(loc); await moveTo(b.x + b.width * dx, b.y + b.height / 2); await page.waitForTimeout(250); return b; };
const click = async (loc) => { await hover(loc); moves.push({ s: (Date.now() - t0) / 1000, click: true }); await page.mouse.down(); await page.mouse.up(); };
const wait = (ms) => page.waitForTimeout(ms);
const wheel = async (dy, n = 8, gap = 90) => { for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy * 2); await wait(gap); } };
const rect = async (name, loc) => { const b = await box(loc); if (b) cues.push({ s: (Date.now() - t0) / 1000, label: "rect:" + name, rect: { x: b.x / 2, y: b.y / 2, w: b.width / 2, h: b.height / 2 } }); };
const segments = {
  async desk() {
    await page.goto(B + "/"); await wait(7000); t0 = Date.now(); cue("start");
    await rect("attention", page.getByText("Need attention").first().locator("xpath=.."));
    await rect("sessions", page.getByRole("heading", { name: /Sessions/ }).first().locator("xpath=../.."));
    await hover(page.getByText("Need attention").first()); await wait(1200); cue("attention");
    await hover(page.getByText("Hosts connected").first()); await wait(1200); cue("hosts");
    await hover(page.getByText("Reusable team tactical templates").first()); await wait(1500); cue("working-row");
    await hover(page.getByText("Club finance: budget vs actuals").nth(1)); await wait(1500); cue("review-row");
    await moveTo(2600, 1800); await wait(800); cue("end");
  },
  async project() {
    await page.goto(B + "/"); await wait(6000); t0 = Date.now(); cue("start");
    await click(page.getByRole("link", { name: /EasyChamp/ }).first()); await wait(4500); cue("opened");
    await rect("threads", page.getByText("Welcome back.").first().locator("xpath=../.."));
    await hover(page.getByText("Waiting on you").first()); await wait(900);
    await hover(page.getByText("Club finance: budget vs actuals").first()); await wait(1300); cue("finance");
    await hover(page.getByText("Reusable team tactical templates").first()); await wait(1300); cue("tactical");
    await hover(page.getByText("#411").first()); await wait(1200); cue("pr");
    await hover(page.getByText("Independent review round 2").first()); await wait(900); cue("idle");
    await click(page.getByText("Show more").first()); await wait(1500); cue("more");
    await moveTo(3380, 1400); await wheel(110, 8); await wait(1500); cue("scrolled");
    await wheel(-110, 8); await wait(1000); cue("end");
  },
  async coordinator() {
    await page.goto(TACT); await wait(8000);
    await page.getByRole("button", { name: /Close/ }).last().click().catch(() => {}); await wait(2000);
    t0 = Date.now(); cue("start");
    await moveTo(1720, 1000); await wheel(-120, 10, 120); await wait(1200); cue("up");
    await wheel(120, 10, 120); await wait(1200); cue("down");
    const chip = page.getByText("Reusable team tactical templates").last(); await hover(chip); await wait(1500); cue("chip");
    await rect("chip", chip);
    await click(page.getByRole("button", { name: /View thread/ }).last()); await wait(4000); cue("thread-open");
    await moveTo(2980, 1000); await wheel(-100, 10, 140); await wait(1200); await wheel(100, 12, 140); await wait(2000); cue("end");
  },
  async usage() {
    await page.goto(EC); await wait(7000); t0 = Date.now(); cue("start");
    const chip = page.getByRole("button", { name: /Subscription usage|usage/i }).first(); await rect("chip", chip);
    await click(chip); await wait(2500); cue("open");
    await rect("pop", page.getByText("Subscription usage").first().locator("xpath=.."));
    await hover(page.getByText("1 reset banked").first()); await wait(1500); cue("banked");
    await hover(page.getByText("Weekly · Fable").first(), 0.2); await wait(1500); cue("claude");
    await hover(page.getByText("All limits and accounts").first()); await wait(1200); cue("end");
  },
  async connections() {
    await page.goto(B + "/settings/connections"); await wait(7000); t0 = Date.now(); cue("start");
    await rect("cards", page.getByText("Connect automatically").first().locator("xpath=../../.."));
    await hover(page.getByText("M4 Max").first()); await wait(1300); cue("m4");
    await hover(page.getByText("M1", { exact: true }).first()); await wait(1300); cue("m1");
    await hover(page.getByText("M3", { exact: true }).first()); await wait(1300); cue("m3");
    await hover(page.getByText("Private HTTPS reachable").nth(1)); await wait(1300); cue("https");
    await hover(page.getByText("Most access a worker gets").first()); await wait(1300); cue("access");
    await hover(page.getByText("Add environment").first()); await wait(1200); cue("end");
  },
  async providers() {
    await page.goto(B + "/settings/providers"); await wait(7000); t0 = Date.now(); cue("start");
    await hover(page.getByText("Codex").first()); await wait(1200); cue("codex");
    await hover(page.getByText("Claude", { exact: true }).first()); await wait(1200); cue("claude");
    await moveTo(2200, 1200); await wheel(140, 12, 110); await wait(1500); cue("scrolled");
    await wait(800); cue("end");
  },
  async autoresolve() {
    await page.goto(B + "/settings/general"); await wait(6000);
    await page.getByText("Auto-resolve verified merged threads").first().scrollIntoViewIfNeeded(); await page.mouse.wheel(0, -500); await wait(1500);
    t0 = Date.now(); cue("start");
    const row = page.getByText("Auto-resolve verified merged threads").first(); await rect("row", row.locator("xpath=../.."));
    await hover(page.getByText("Auto-resume limited threads").first()); await wait(1300); cue("resume");
    await hover(row); await wait(1800); cue("autoresolve");
    await moveTo(2960, (await row.boundingBox()).y + 40); await wait(1500); cue("end");
  },
};
try { await segments[seg](); }
catch (e) { cue("error " + e.message.slice(0, 200)); }
finally {
  writeFileSync(`${out}/${seg}.cues.json`, JSON.stringify({ cues, moves }, null, 1));
  await page.waitForTimeout(500); await cdp.send("Page.stopScreencast").catch(() => {});
  const tEnd = Date.now() / 1000; await ctx.close(); await browser.close();
  // Concat list: each frame lasts until the next one; times are relative to tVid.
  const lines = []; for (let i = 0; i < frames.length; i++) { const d = (i + 1 < frames.length ? frames[i + 1].ts : tEnd) - frames[i].ts; lines.push(`file '${frames[i].name}'`, `duration ${Math.max(d, 0.001).toFixed(4)}`); }
  if (frames.length) lines.push(`file '${frames[frames.length - 1].name}'`);
  writeFileSync(`${out}/${seg}.concat`, lines.join("\n"));
  writeFileSync(`${out}/${seg}.meta.json`, JSON.stringify({ firstFrameAt: frames[0]?.ts - tVid / 1000, t0Offset: (t0 - tVid) / 1000 }));
  const { execFileSync } = await import("node:child_process");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `${out}/${seg}.concat`, "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "14", "-preset", "slow", "-g", "30", `${out}/${seg}.mp4`]);
  console.log("frames", frames.length);
}
