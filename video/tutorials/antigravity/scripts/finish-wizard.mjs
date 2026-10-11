// Finish the first-run wizard off camera (SERIES.md, step 7): Continue, Continue,
// Do not import projects. Usage: node finish-wizard.mjs <storageState.json> [origin]
import { chromium } from "./pw.mjs";
const [stateFile, origin = "http://127.0.0.1:8334"] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "light", storageState: stateFile });
const page = await context.newPage();
await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
for (let i = 0; i < 6; i++) {
  const dni = page.getByRole("button", { name: "Do not import projects" });
  const cont = page.getByRole("button", { name: "Continue", exact: true });
  if ((await dni.count()) && (await dni.isVisible())) { await dni.click(); console.log("do not import"); }
  else if ((await cont.count()) && (await cont.isVisible())) { await cont.click(); console.log("continue"); }
  else break;
  await page.waitForTimeout(2500);
}
console.log("landed on", new URL(page.url()).pathname);
await context.storageState({ path: stateFile });
await browser.close();
