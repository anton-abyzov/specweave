// Off-camera UI exploration for the shot list: run steps from a JSON file, screenshot, dump a11y names.
// Usage: PWDEBUG=0 node explore.mjs <storageState.json> <steps.json> <outDir> [origin]
import { chromium } from "./pw.mjs";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const [stateFile, stepsFile, outDir, origin = "http://127.0.0.1:8351"] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "light", storageState: stateFile });
const page = await ctx.newPage();
let n = 0;
for (const s of JSON.parse(readFileSync(stepsFile, "utf8"))) {
  try {
    if (s.goto) await page.goto(origin + s.goto, { waitUntil: "domcontentloaded" });
    if (s.click) await page.getByRole(s.click.role, { name: s.click.name, exact: !!s.click.exact }).first().click();
    if (s.text) await page.getByText(s.text, { exact: !!s.exact }).first().click();
    if (s.type) await page.keyboard.type(s.type, { delay: 10 });
    if (s.press) await page.keyboard.press(s.press);
    await page.waitForTimeout(s.wait ?? 2000);
    if (s.shot) { await page.screenshot({ path: `${outDir}/${String(++n).padStart(2, "0")}-${s.shot}.png` }); }
    if (s.dump) writeFileSync(`${outDir}/${s.dump}.txt`, (await page.locator("body").ariaSnapshot()).slice(0, 40000));
  } catch (e) { console.log("step failed", JSON.stringify(s), e.message.split("\n")[0]); await page.screenshot({ path: `${outDir}/failed-${n}.png` }); break; }
}
await browser.close();
