// Record the APP shots of one episode against a disposable SpecWithCode server.
// Headless only. Walks each APP shot's `steps` in SHOTLIST.json, draws a cursor
// ring and click outlines into the page, and writes a cue log for the edit.
//
// Usage: PWDEBUG=0 [DEMO_HOME=<demo>/home] node record-app.mjs <SHOTLIST.json> <storageState.json> <outDir> [origin] [startPath]
// add-a-machine: <storageState.json> may be a comma-separated list (one per origin; cookie names are port-specific,
// so they merge into one context). SHOTLIST "origins" maps names to origins for {"do":"goto","origin":name,"path"}.
// Privacy: an init stylesheet blurs the invitation line, the pasted line, the pairing code and the machine card's
// tailnet address in every frame. "captureValue" writes an input's value to a mode-600 file (never logged);
// "fillFromFile" fills an input from such a file with page.fill (no typing, no clipboard).
// An "offCamera" step, or a click's "offCameraBeforeClick", runs scripts/<script> <DEMO_HOME> (episode 2:
// codex-auth.sh); nothing changes on screen.
// Output: <outDir>/take.webm, <outDir>/cues.json, <outDir>/stills/<shot>-<n>.png
import { chromium } from "./pw.mjs";
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const SCRIPTS = dirname(fileURLToPath(import.meta.url));

const [shotlistFile, stateFile, outDir, origin = "http://127.0.0.1:8343", startPath = "/"] = process.argv.slice(2);
const shotlist = JSON.parse(readFileSync(shotlistFile, "utf8"));
const origins = shotlist.origins ?? {};
const mergedState = { cookies: [], origins: [] };
for (const f of stateFile.split(",")) {
  const s = JSON.parse(readFileSync(f, "utf8"));
  mergedState.cookies.push(...s.cookies);
  mergedState.origins.push(...s.origins);
}
mkdirSync(`${outDir}/stills`, { recursive: true });
mkdirSync(`${outDir}/video`, { recursive: true });

const ACCENT = "#6d4fb5"; // Weave iris
const overlay = `
(() => {
  const install = () => {
    if (document.getElementById("__rec_ring")) return;
    const ring = document.createElement("div");
    ring.id = "__rec_ring";
    Object.assign(ring.style, { position: "fixed", left: "-100px", top: "-100px", width: "32px", height: "32px",
      marginLeft: "-16px", marginTop: "-16px", borderRadius: "50%", border: "2px solid ${ACCENT}",
      background: "rgba(109,79,181,0.15)", pointerEvents: "none", zIndex: 2147483647,
      transition: "transform 250ms ease-out", boxSizing: "border-box" });
    document.documentElement.appendChild(ring);
    addEventListener("mousemove", (e) => { ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => { ring.style.transform = "scale(1.4)"; setTimeout(() => (ring.style.transform = "scale(1)"), 250); }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  storageState: mergedState,
  recordVideo: { dir: `${outDir}/video`, size: { width: 1920, height: 1080 } },
});
await context.addInitScript(overlay);
// Blur every secret or identifying value before the first frame: the invitation line (both inputs), the pairing
// code, and the tailnet address on the machine card (li[aria-label=<machine>] p span.truncate).
const BLUR = `
input[aria-label="Invitation line for the main machine"],
input[aria-label="Invitation from the other machine"]:not(:placeholder-shown),
input[aria-label^="Pairing code made on"]:not(:placeholder-shown),
li[aria-label] p span.truncate { filter: blur(7px) !important; }
`;
await context.addInitScript((css) => {
  const add = () => {
    if (document.getElementById("__rec_blur")) return;
    const st = document.createElement("style");
    st.id = "__rec_blur";
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
  add();
}, BLUR);
const page = await context.newPage();
const t0 = Date.now();
const cues = [];
const cue = (shot, step, label) => {
  const ms = Date.now() - t0;
  cues.push({ shot, step, label, ms });
  console.log(`${(ms / 1000).toFixed(2)}s ${shot} #${step} ${label}`);
};
let mouse = { x: 960, y: 540 };

async function outline(box) {
  await page.evaluate(({ x, y, w, h, c }) => {
    const o = document.createElement("div");
    Object.assign(o.style, { position: "fixed", left: `${x - 4}px`, top: `${y - 4}px`, width: `${w + 8}px`, height: `${h + 8}px`,
      outline: `2px solid ${c}`, borderRadius: "4px", pointerEvents: "none", zIndex: 2147483646 });
    document.documentElement.appendChild(o);
    setTimeout(() => o.remove(), 800);
  }, { x: box.x, y: box.y, w: box.width, h: box.height, c: ACCENT });
}

async function moveTo(x, y) {
  const steps = Math.max(8, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / 30));
  await page.mouse.move(x, y, { steps });
  mouse = { x, y };
}

function locate(step) {
  let loc;
  if (step.role) {
    const name = step.nameRegex ? new RegExp(step.nameRegex) : step.name;
    loc = page.getByRole(step.role, name === undefined ? {} : { name, exact: !!step.exact });
  } else if (step.textRegex) loc = page.getByText(new RegExp(step.textRegex));
  else if (step.text) loc = page.getByText(step.text, { exact: !!step.exact });
  else if (step.placeholder) loc = page.getByPlaceholder(step.placeholder);
  else if (step.css) loc = page.locator(step.css);
  else if (step.label) loc = page.getByLabel(step.label, { exact: !!step.exact });
  return step.last ? loc.last() : loc.first();
}

async function pointAndClick(loc, beforeClick) {
  await loc.waitFor({ state: "visible", timeout: 20000 });
  await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  const box = await loc.boundingBox();
  if (!box) throw new Error("no bounding box");
  await moveTo(box.x + box.width / 2, box.y + box.height / 2);
  await outline(box);
  await page.waitForTimeout(350);
  if (beforeClick) { beforeClick(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); return; }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

function offCamera(shot, i, script) {
  if (!process.env.DEMO_HOME) throw new Error("offCamera needs DEMO_HOME");
  cue(shot, i, `offCamera ${script}`);
  execFileSync(join(SCRIPTS, script), [process.env.DEMO_HOME], { stdio: ["ignore", "ignore", "inherit"] });
}

async function waitTurn(shot, i) {
  cue(shot, i, "turn-start");
  // A turn shows a Stop button while it runs. Wait for it to appear, then to go away.
  const stop = page.getByRole("button", { name: /Stop|Interrupt/ });
  try { await stop.first().waitFor({ state: "visible", timeout: 15000 }); } catch {}
  const deadline = Date.now() + 10 * 60 * 1000;
  let idle = 0;
  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    idle = (await stop.count()) === 0 ? idle + 1 : 0;
    if (idle >= 4) break;
  }
  cue(shot, i, "turn-end");
}

async function runStep(shot, i, step) {
  switch (step.do) {
    case "expect":
      await page.getByText(step.textRegex ? new RegExp(step.textRegex) : step.text, { exact: false }).first().waitFor({ state: "visible", timeout: step.timeout ?? 20000 });
      cue(shot, i, `expect ${step.text ?? step.textRegex}`);
      break;
    case "pause":
      await page.waitForTimeout(step.ms);
      break;
    case "click":
      cue(shot, i, `click ${step.name ?? step.nameRegex ?? step.textRegex ?? step.text}`);
      // offCameraBeforeClick: run the script after the pointer is on the target, right before the click.
      await pointAndClick(locate(step), step.offCameraBeforeClick ? () => offCamera(shot, i, step.offCameraBeforeClick) : undefined);
      await page.waitForTimeout(500);
      break;
    case "clickIfPresent": {
      const loc = locate(step);
      if ((await loc.count()) && (await loc.isVisible())) {
        cue(shot, i, `click ${step.name ?? step.nameRegex ?? step.textRegex}`);
        await pointAndClick(loc);
        await page.waitForTimeout(500);
      } else cue(shot, i, `skip ${step.name ?? step.nameRegex ?? step.textRegex}`);
      break;
    }
    case "hover": {
      const loc = locate(step);
      await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      const box = await loc.boundingBox();
      await moveTo(box.x + box.width / 2, box.y + box.height / 2);
      cue(shot, i, `hover ${step.text ?? step.name}`);
      await page.waitForTimeout(step.ms ?? 1000);
      break;
    }
    case "type":
      if (step.placeholder || step.css) {
        const l = step.css ? page.locator(step.css) : page.getByPlaceholder(step.placeholder);
        await pointAndClick(step.last ? l.last() : l.first());
      }
      cue(shot, i, `type ${step.text.slice(0, 24)}`);
      await page.keyboard.type(step.text, { delay: step.delay ?? 45 });
      await page.waitForTimeout(400);
      break;
    case "press":
      cue(shot, i, `press ${step.key}`);
      await page.keyboard.press(step.key);
      await page.waitForTimeout(600);
      break;
    case "waitTurn":
      await waitTurn(shot, i);
      break;
    case "ensureOption": {
      const combo = page.getByRole("combobox", { name: step.combobox }).first();
      const text = (await combo.innerText().catch(() => "")) || "";
      if (!text.includes(step.option)) {
        cue(shot, i, `select ${step.option}`);
        await pointAndClick(combo);
        await page.waitForTimeout(400);
        await pointAndClick(page.getByRole("option", { name: step.option }).first());
      } else cue(shot, i, `already ${step.option}`);
      break;
    }
    case "goto":
      cue(shot, i, `goto ${step.origin}${step.path ?? "/"}`);
      await page.goto((origins[step.origin] ?? step.origin) + (step.path ?? "/"), { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(step.ms ?? 2500);
      break;
    case "captureValue": {
      const v = await locate(step).inputValue();
      if (!v) throw new Error("captureValue: empty");
      writeFileSync(step.to, v, { mode: 0o600 });
      cue(shot, i, `captured ${v.length} chars`);
      break;
    }
    case "fillFromFile": {
      const loc = locate(step);
      await pointAndClick(loc);
      await loc.fill(readFileSync(step.file, "utf8").trim());
      cue(shot, i, "filled from file");
      await page.waitForTimeout(step.ms ?? 600);
      break;
    }
    case "selectOption": {
      const combo = locate(step);
      cue(shot, i, `select ${step.option}`);
      await pointAndClick(combo);
      await page.waitForTimeout(500);
      await pointAndClick(page.getByRole("option", { name: step.option, exact: true }).first());
      await page.waitForTimeout(500);
      break;
    }
    case "offCamera":
      offCamera(shot, i, step.script);
      break;
    default:
      throw new Error(`unknown step ${step.do}`);
  }
}

let failed = null;
try {
  await page.goto(origin + startPath, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  // Sync mark: a 300 ms black frame lets the edit align cues to the video exactly.
  await page.evaluate(() => {
    const b = document.createElement("div");
    b.id = "__rec_sync";
    Object.assign(b.style, { position: "fixed", inset: "0", background: "#000", zIndex: 2147483647 });
    document.documentElement.appendChild(b);
  });
  cue("sync", 0, "black-on");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("__rec_sync")?.remove());
  cue("sync", 0, "black-off");
  await page.waitForTimeout(1000);
  for (const shot of shotlist.shots.filter((s) => s.kind === "APP")) {
    cue(shot.id, -1, "shot-start");
    for (const [i, step] of shot.steps.entries()) await runStep(shot.id, i, step);
    cue(shot.id, 999, "shot-end");
    await page.screenshot({ path: `${outDir}/stills/${shot.id}-end.png` });
  }
} catch (e) {
  failed = e;
  console.error("TAKE STOPPED:", e.message.split("\n")[0]);
  await page.screenshot({ path: `${outDir}/stills/failed.png` }).catch(() => {});
}
const video = page.video();
await context.close();
await browser.close();
const path = await video.path();
renameSync(path, `${outDir}/take.webm`);
writeFileSync(`${outDir}/cues.json`, JSON.stringify({ shotlist: shotlistFile, cues }, null, 1));
console.log(failed ? "FAILED" : "OK", `${outDir}/take.webm`);
process.exit(failed ? 1 : 0);
