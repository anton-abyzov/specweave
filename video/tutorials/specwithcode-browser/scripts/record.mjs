// Record "One Chrome extension for every agent" against a disposable SpecWithCode server. Headless only
// (PWDEBUG=0). Two browsers run at once: the app (recorded as take.webm) and a separate Chrome profile with
// SpecWithCode Browser loaded from the store build (EXT, its CRX unpacked with the store key, so the extension
// ID is the store's). Every page of that Chrome is recorded too: the extension popup (opened as a tab and zoomed)
// and the tabs the agents open. Walks SHOTLIST.json's steps, draws a cursor ring and click outlines, and writes
// a cue log for the edit; each Chrome video is listed in cues.json with the cue time its recording started.
//
// Usage: EXT=<unpacked store build> PWDEBUG=0 node record.mjs <SHOTLIST.json> <storageState.json> <outDir> [origin]
//        PWDEBUG=0 node record.mjs --prepare <storageState.json> [origin]   (off camera: finish the first-run
//        setup, dismiss toasts, add ~/greet-app as a Local folder and set its permissions to Full access)
// Output: <outDir>/take.webm, <outDir>/chrome/*.webm, <outDir>/cues.json, <outDir>/stills/<shot>-end.png
import { chromium } from "./pw.mjs";
import { readFileSync, writeFileSync, mkdirSync, renameSync, chmodSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const IRIS = "#6d4fb5";
const args = process.argv.slice(2);
const prepare = args[0] === "--prepare";

const browser = await chromium.launch({ headless: true });

if (prepare) {
  const [, stateFile, origin = "http://127.0.0.1:8351"] = args;
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
  if (!(await page.getByText("greet-app", { exact: true }).count())) {
    await page.locator("[aria-label='Add project']").first().click();
    await page.waitForTimeout(900);
    await page.getByText("Local folder", { exact: true }).first().click();
    await page.waitForTimeout(900);
    await page.keyboard.type("~/greet-app", { delay: 30 });
    await page.waitForTimeout(900);
    await page.keyboard.press("Enter");
    await page.getByText("Excited to get started on greet-app").waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
  } else {
    await page.getByText("greet-app", { exact: true }).first().click();
    await page.waitForTimeout(2500);
  }
  await page.getByLabel("Project permissions").first().selectOption({ label: "Full access" });
  await page.waitForTimeout(1500);
  await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  writeFileSync(stateFile, JSON.stringify(await context.storageState()), { mode: 0o600 });
  chmodSync(stateFile, 0o600);
  console.log("prepared; on", new URL(page.url()).pathname);
  await browser.close();
  process.exit(0);
}

const [shotlistFile, stateFile, outDir, origin = "http://127.0.0.1:8351"] = args;
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
    // The pairing code carries a token: blur it wherever it shows (app field, popup field).
    const redact = document.createElement("style");
    redact.textContent = 'input[aria-label="Pairing code"], textarea#code { filter: blur(6px); }';
    document.documentElement.appendChild(redact);
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

// The Chrome profile agents use. Its pages record at 1440x1080; the popup is opened as a tab.
const CHROME = { width: 1440, height: 1080 };
if (!process.env.EXT) throw new Error("EXT (the unpacked store build) is not set");
const chrome = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "swc-rec-chrome-")), {
  headless: true,
  ...(process.env.STUDIO_TEST_CHROMIUM ? { executablePath: process.env.STUDIO_TEST_CHROMIUM } : {}),
  viewport: CHROME,
  colorScheme: "light",
  recordVideo: { dir: `${outDir}/chrome`, size: CHROME },
  args: [`--disable-extensions-except=${process.env.EXT}`, `--load-extension=${process.env.EXT}`],
});
await chrome.addInitScript(overlay);
const chromePages = [];
const trackChromePage = (p) => {
  const entry = { ms: Date.now() - t0, video: p.video(), urls: [] };
  chromePages.push(entry);
  p.on("framenavigated", (f) => { if (f === p.mainFrame()) entry.urls.push({ ms: Date.now() - t0, url: f.url() }); });
};
chrome.on("page", trackChromePage);
for (const p of chrome.pages()) trackChromePage(p);
let [worker] = chrome.serviceWorkers();
if (!worker) worker = await chrome.waitForEvent("serviceworker");
const extensionId = new URL(worker.url()).host;
let popup = null;
let popupMouse = { x: 400, y: 300 };
async function popupClick(loc, shot, i, what) {
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${what} in the popup`);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await popup.mouse.move(x, y, { steps: Math.max(8, Math.round(Math.hypot(x - popupMouse.x, y - popupMouse.y) / 30)) });
  popupMouse = { x, y };
  await popup.waitForTimeout(350);
  cue(shot, i, `popup click ${what}`);
  await popup.mouse.click(x, y);
}

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
      if (step.role) await page.getByRole(step.role, { name: step.nameRegex ? new RegExp(step.nameRegex) : step.name }).first().waitFor({ state: "visible", timeout: step.timeout ?? 20000 });
      else await page.getByText(step.textRegex ? new RegExp(step.textRegex) : step.text, { exact: !!step.exact }).first().waitFor({ state: "visible", timeout: step.timeout ?? 20000 });
      cue(shot, i, `expect ${step.text ?? step.textRegex ?? step.name ?? step.nameRegex}`);
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
    case "reload":
      // Reload the app page (cut in the edit). Used before the take-over: see SHOTLIST comment.
      cue(shot, i, "reload");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(step.after ?? 3500);
      cue(shot, i, "reloaded");
      break;
    case "click": {
      cue(shot, i, `click ${what}`);
      const loc = locate(step);
      if (step.optional && !(await loc.count())) { cue(shot, i, `skip ${what}`); break; }
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
    case "clickAt":
      // Click a fixed point (the shared browser tab is a canvas, so its page elements have no locators).
      if (step.unlessButton && (await page.getByRole("button", { name: step.unlessButton }).count())) { cue(shot, i, `skip clickAt (${step.unlessButton} shown)`); break; }
      await moveTo(step.x, step.y);
      await page.waitForTimeout(300);
      cue(shot, i, `clickAt ${step.x},${step.y}`);
      await page.mouse.click(step.x, step.y, { clickCount: step.clickCount ?? 1 });
      await page.waitForTimeout(step.after ?? 500);
      break;
    case "waitCss": {
      const deadline = Date.now() + (step.timeout ?? 300000);
      cue(shot, i, `wait ${step.css} x${step.count ?? 1}`);
      while ((await page.locator(step.css).count()) < (step.count ?? 1)) {
        if (Date.now() > deadline) throw new Error(`timed out waiting for ${step.css}`);
        await page.waitForTimeout(250);
      }
      cue(shot, i, `seen ${step.css}`);
      break;
    }
    case "still":
      await page.screenshot({ path: `${outDir}/stills/${shot}-${i}.png` });
      break;
    case "mouse":
      await moveTo(step.x, step.y);
      await page.waitForTimeout(step.ms ?? 300);
      break;
    case "popupOpen":
      // Clicking the toolbar icon opens this page; headless Chrome has no toolbar, so it opens as a tab.
      cue(shot, i, "popup open");
      popup = await chrome.newPage();
      await popup.goto(`chrome-extension://${extensionId}/src/popup.html`);
      await popup.addStyleTag({ content: "html { zoom: 2.2; background: #fff; }" });
      await popup.mouse.move(popupMouse.x, popupMouse.y);
      await popup.waitForTimeout(step.after ?? 1200);
      cue(shot, i, "popup shown");
      break;
    case "popupPaste": {
      // Paste the code the app shows (what Copy put on the clipboard) into the popup's code field.
      const code = await page.getByLabel("Pairing code").first().inputValue();
      if (!code.startsWith("swc-chrome:")) throw new Error("no pairing code on screen");
      const field = popup.locator("#code");
      await popupClick(field, shot, i, "code field");
      await popup.waitForTimeout(300);
      await field.fill(code);
      cue(shot, i, "popup pasted");
      await popup.waitForTimeout(step.after ?? 800);
      break;
    }
    case "popupType": {
      const field = popup.locator(step.css);
      await popupClick(field, shot, i, step.css);
      // The field may hold a suggested name; typing replaces it, as it would for a person who selects it first.
      await popup.keyboard.press("ControlOrMeta+A");
      await popup.keyboard.type(step.text, { delay: step.delay ?? 70 });
      cue(shot, i, `popup typed ${step.text}`);
      await popup.waitForTimeout(400);
      break;
    }
    case "popupButton": {
      await popupClick(popup.getByRole("button", { name: step.name, exact: true }), shot, i, step.name);
      if (step.phase) {
        await popup.waitForFunction((phase) => document.querySelector("#status")?.dataset.phase === phase, step.phase, { timeout: step.timeout ?? 20000 });
        cue(shot, i, `popup ${step.phase}`);
      }
      await popup.waitForTimeout(step.after ?? 800);
      break;
    }
    case "popupStill":
      await popup.screenshot({ path: `${outDir}/stills/${shot}-${i}-popup.png` });
      break;
    case "waitChromeUrl": {
      // Wait until an agent tab in the recorded Chrome has loaded a URL containing `contains`.
      const deadline = Date.now() + (step.timeout ?? 600000);
      cue(shot, i, `wait chrome ${step.contains}`);
      while (!chromePages.some((e) => e.urls.some((u) => u.url.includes(step.contains)))) {
        if (Date.now() > deadline) throw new Error(`no Chrome tab reached ${step.contains}`);
        await page.waitForTimeout(250);
      }
      cue(shot, i, `chrome at ${step.contains}`);
      break;
    }
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
await chrome.close();
await browser.close();
renameSync(await video.path(), `${outDir}/take.webm`);
const chromeVideos = [];
for (const [n, e] of chromePages.entries()) {
  if (!e.video) continue;
  const file = `${outDir}/chrome/page-${n}.webm`;
  renameSync(await e.video.path(), file);
  chromeVideos.push({ file, startedMs: e.ms, urls: e.urls });
}
writeFileSync(`${outDir}/cues.json`, JSON.stringify({ shotlist: shotlistFile, cues, chromeVideos }, null, 1));
console.log(failed ? "FAILED" : "OK", `${outDir}/take.webm`);
process.exit(failed ? 1 : 0);
