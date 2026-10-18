// Off camera, headless: set this episode's settings on the disposable server before the first pull request.
//  - Project page (project scope, greet-app): Remove agent credits when merging ON, Default merge method Squash,
//    When a thread finishes = Open PR and auto-merge (checked, set if not).
//  - Source Control page: worktree branch prefix "greet/" (1.0.48 offers the prefix on the machine page only).
// Usage: PWDEBUG=0 node setup-settings.mjs <storageState.json> <origin> <projectId>
import { chromium } from "./pw.mjs";
const [stateFile, origin, projectId] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "light", storageState: stateFile });
const page = await context.newPage();
const dlg = () => page.locator("[role=dialog]").first();
async function pick(comboName, option) {
  const combo = page.getByRole("combobox", { name: comboName }).first();
  const now = (await combo.innerText()).trim();
  if (now.includes(option)) return `${comboName}: already ${now}`;
  await combo.click(); await page.waitForTimeout(500);
  await page.getByRole("option", { name: option, exact: true }).first().click(); await page.waitForTimeout(1200);
  return `${comboName}: ${now} -> ${(await combo.innerText()).trim()}`;
}
await page.goto(`${origin}/settings/projects?project=${encodeURIComponent(projectId)}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);
const sw = page.getByRole("switch", { name: "Remove agent credits when merging" }).first();
if ((await sw.getAttribute("aria-checked")) !== "true") { await sw.click(); await page.waitForTimeout(1200); }
console.log("credits switch", await sw.getAttribute("aria-checked"));
console.log(await pick("When a thread finishes", "Open PR and auto-merge"));
const mm = page.getByRole("combobox").filter({ hasText: /Last selected|Squash|Merge commit|Rebase/ }).first();
const mmName = await mm.getAttribute("aria-label");
console.log("merge combobox", mmName);
console.log(await pick(mmName, "Squash and merge"));
await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/settings-project.png` : "/dev/null" }).catch(() => {});
await page.goto(`${origin}/settings/source-control`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const prefix = page.getByRole("textbox", { name: "Branch prefix" }).first();
await prefix.scrollIntoViewIfNeeded();
await prefix.fill("greet/"); await prefix.press("Tab"); await page.waitForTimeout(1500);
console.log("prefix", await prefix.inputValue());
await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/settings-sc.png` : "/dev/null" }).catch(() => {});
// Re-read the project page to confirm the overrides stuck.
await page.goto(`${origin}/settings/projects?project=${encodeURIComponent(projectId)}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);
console.log("recheck credits", await page.getByRole("switch", { name: "Remove agent credits when merging" }).first().getAttribute("aria-checked"),
  "| finish", (await page.getByRole("combobox", { name: "When a thread finishes" }).first().innerText()).trim(),
  "| merge", (await page.getByRole("combobox", { name: mmName }).first().innerText()).trim());
await browser.close();
