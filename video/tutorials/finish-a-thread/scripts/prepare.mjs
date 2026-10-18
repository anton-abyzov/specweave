// Off camera, headless: finish the welcome wizard as a main machine, add ~/greet-app as a Local folder, set the
// project's permissions to Full access, dismiss provider-update toasts, and save the storageState back.
// Usage: PWDEBUG=0 node prepare.mjs <storageState.json> <origin>
import { chromium } from "./pw.mjs";
import { writeFileSync, chmodSync } from "node:fs";

const [stateFile, origin] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "light", storageState: stateFile });
const page = await context.newPage();
await page.goto(origin + "/welcome", { waitUntil: "domcontentloaded" });
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(2500);
  const t = await page.innerText("body");
  if (t.includes("How will you use this Mac")) await page.getByText("Set this Mac up as my main machine").click();
  else if (t.includes("Connect your computers") || t.includes("Connect your agents")) await page.getByRole("button", { name: "Continue", exact: true }).click();
  else if (t.includes("Choose your projects")) { await page.getByRole("button", { name: "Do not import projects" }).click(); await page.waitForTimeout(2500); break; }
  else break;
}
await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.locator("[aria-label='Add project']").first().click();
await page.waitForTimeout(900);
await page.getByText("Local folder", { exact: true }).first().click();
await page.waitForTimeout(1200);
await page.keyboard.type("greet-app", { delay: 20 });
await page.waitForTimeout(800);
await page.keyboard.press("Enter");
await page.getByText("Excited to get started on greet-app").first().waitFor({ timeout: 30000 });
const perm = page.locator("select:has(option[value='approval-required'])").first();
await perm.selectOption({ label: "Full access" });
await page.waitForTimeout(1500);
const projectPath = new URL(page.url()).pathname;
await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
for (const b of await page.getByRole("button", { name: /Dismiss|Close notification/ }).all()) await b.click().catch(() => {});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const perm2 = await page.goto(origin + projectPath, { waitUntil: "domcontentloaded" }).then(async () => {
  await page.waitForTimeout(2500);
  return page.locator("select:has(option[value='approval-required'])").first().inputValue();
});
await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
writeFileSync(stateFile, JSON.stringify(await context.storageState()), { mode: 0o600 });
chmodSync(stateFile, 0o600);
console.log("prepared", origin, "project", projectPath, "permissions", perm2);
await browser.close();
