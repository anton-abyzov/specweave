// Record the app part of "Start SpecWithCode with a coordinator and two workers" against a disposable
// SpecWithCode server. Headless only (PWDEBUG=0). Walks SHOTLIST.json's steps, draws a cursor ring and click
// outlines into the page, and writes a cue log for the edit.
//
// Usage: PWDEBUG=0 node record.mjs <SHOTLIST.json> <storageState.json> <outDir> [origin]
//        PWDEBUG=0 node record.mjs --prepare <storageState.json> [origin]   (off camera: finish the first-run
//        setup and dismiss the provider-update toast, then save the storage state; nothing is recorded)
// Output: <outDir>/take.webm, <outDir>/cues.json, <outDir>/stills/<shot>-end.png
import { chromium } from "./pw.mjs";
import { readFileSync, writeFileSync, mkdirSync, renameSync, chmodSync } from "node:fs";

const IRIS = "#6d4fb5";
const args = process.argv.slice(2);
const prepare = args[0] === "--prepare";

const browser = await chromium.launch({ headless: true });

if (prepare) {
  const [, stateFile, origin = "http://127.0.0.1:8341"] = args;
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "light", storageState: stateFile });
  const page = await context.newPage();
  await page.goto(origin + "/welcome", { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1500);
    const t = await page.innerText("body");
    if (t.includes("How will you use this Mac")) await page.getByText("Set this Mac up as my main machine").click();
    else if (t.includes("Connect your computers") || t.includes("Connect your agents")) await page.getByRole("button", { name: "Continue" }).click();
    else if (t.includes("Choose your projects")) { await page.getByRole("button", { name: "Do not import projects" }).click(); await page.waitForTimeout(2500); break; }
    else break;
  }
  await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  for (const b of await page.getByRole("button", { name: "Dismiss notification" }).all()) await b.click().catch(() => {});
  await page.waitForTimeout(1000);
  writeFileSync(stateFile, JSON.stringify(await context.storageState()), { mode: 0o600 });
  chmodSync(stateFile, 0o600);
  console.log("prepared; on", new URL(page.url()).pathname);
  await browser.close();
  process.exit(0);
}

const [shotlistFile, stateFile, outDir, origin = "http://127.0.0.1:8341"] = args;
const shotlist = JSON.parse(readFileSync(shotlistFile, "utf8"));
mkdirSync(`${outDir}/stills`, { recursive: true });
mkdirSync(`${outDir}/video`, { recursive: true });

const overlay = `
(() => {
  const install = () => {
    if (document.getElementById("__rec_ring")) return;
    const ring = document.createElement("div");
    ring.id = "__rec_ring";
    Object.assign(ring.style, { position: "fixed", left: "-100px", top: "-100px", width: "32px", height: "32px",
      marginLeft: "-16px", marginTop: "-16px", borderRadius: "50%", border: "2px solid ${IRIS}",
      background: "rgba(109,79,181,0.15)", pointerEvents: "none", zIndex: 2147483647,
      transition: "transform 250ms ease-out", boxSizing: "border-box" });
    document.documentElement.appendChild(ring);
    addEventListener("mousemove", (e) => { ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => { ring.style.transform = "scale(1.4)"; setTimeout(() => (ring.style.transform = "scale(1)"), 250); }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();`;

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  storageState: stateFile,
  recordVideo: { dir: `${outDir}/video`, size: { width: 1920, height: 1080 } },
});
await context.addInitScript(overlay);
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
  }, { x: box.x, y: box.y, w: box.width, h: box.height, c: IRIS });
}

async function moveTo(x, y) {
  const steps = Math.max(8, Math.round(Math.hypot(x - mouse.x, y - mouse.y) / 30));
  await page.mouse.move(x, y, { steps });
  mouse = { x, y };
}

function locate(step) {
  let loc;
  if (step.css) loc = page.locator(step.css);
  else if (step.label) loc = page.getByLabel(step.label, { exact: !!step.exact });
  else if (step.role) {
    const name = step.nameRegex ? new RegExp(step.nameRegex) : step.name;
    loc = page.getByRole(step.role, name === undefined ? {} : { name, exact: !!step.exact });
  } else if (step.textRegex) loc = page.getByText(new RegExp(step.textRegex));
  else if (step.text) loc = page.getByText(step.text, { exact: !!step.exact });
  else if (step.placeholder) loc = page.getByPlaceholder(step.placeholder);
  if (step.within) loc = page.locator(step.within).locator(loc);
  return step.last ? loc.last() : loc.first();
}

async function point(loc) {
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  if (!box) throw new Error("no bounding box");
  await moveTo(box.x + box.width / 2, box.y + box.height / 2);
  return box;
}

async function runStep(shot, i, step) {
  const what = step.name ?? step.label ?? step.text ?? step.textRegex ?? step.nameRegex ?? step.css ?? step.placeholder ?? "";
  switch (step.do) {
    case "expect":
      await page.getByText(step.text, { exact: !!step.exact }).first().waitFor({ state: "visible", timeout: step.timeout ?? 20000 });
      cue(shot, i, `expect ${step.text}`);
      break;
    case "waitCount": {
      // Wait until at least `count` elements match (agent work), polling; the take keeps recording.
      const loc = locate({ ...step, last: false });
      const deadline = Date.now() + (step.timeout ?? 600000);
      cue(shot, i, `wait ${what} x${step.count}`);
      for (;;) {
        const n = step.css ? await page.locator(step.css).count() : await page.getByText(step.text, { exact: !!step.exact }).count();
        if (n >= step.count) break;
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${step.count} x ${what}`);
        await page.waitForTimeout(250);
      }
      cue(shot, i, `seen ${what} x${step.count}`);
      void loc;
      break;
    }
    case "pause":
      await page.waitForTimeout(step.ms);
      break;
    case "click": {
      cue(shot, i, `click ${what}`);
      const loc = locate(step);
      const box = await point(loc);
      await outline(box);
      await page.waitForTimeout(350);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      cue(shot, i, `clicked ${what}`);
      await page.waitForTimeout(step.after ?? 500);
      break;
    }
    case "hover": {
      const box = await point(locate(step));
      cue(shot, i, `hover ${what}`);
      void box;
      await page.waitForTimeout(step.ms ?? 1000);
      break;
    }
    case "select": {
      const loc = locate(step);
      const box = await point(loc);
      await outline(box);
      await page.waitForTimeout(400);
      cue(shot, i, `select ${step.option}`);
      await loc.selectOption({ label: step.option });
      await page.waitForTimeout(600);
      break;
    }
    case "scrollTo": {
      // Smooth-scroll the nearest scrolling ancestor until the target sits in the middle of the viewport.
      cue(shot, i, `scroll ${what}`);
      await locate(step).evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
      await page.waitForTimeout(step.ms ?? 1200);
      break;
    }
    case "type":
      if (step.placeholder) { const box = await point(page.getByPlaceholder(step.placeholder).first()); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); }
      cue(shot, i, `type ${step.text.slice(0, 24)}`);
      await page.keyboard.type(step.text, { delay: step.delay ?? 45 });
      cue(shot, i, "typed");
      await page.waitForTimeout(400);
      break;
    case "press":
      cue(shot, i, `press ${step.key}`);
      await page.keyboard.press(step.key);
      await page.waitForTimeout(step.after ?? 600);
      break;
    case "mouse":
      await moveTo(step.x, step.y);
      await page.waitForTimeout(step.ms ?? 300);
      break;
    default:
      throw new Error(`unknown step ${step.do}`);
  }
}

let failed = null;
try {
  await page.goto(origin + (shotlist.startPath ?? "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  for (const b of await page.getByRole("button", { name: "Dismiss notification" }).all()) await b.click().catch(() => {});
  await page.mouse.move(mouse.x, mouse.y);
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
renameSync(await video.path(), `${outDir}/take.webm`);
writeFileSync(`${outDir}/cues.json`, JSON.stringify({ shotlist: shotlistFile, cues }, null, 1));
console.log(failed ? "FAILED" : "OK", `${outDir}/take.webm`);
process.exit(failed ? 1 : 0);
