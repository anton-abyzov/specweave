// Off camera, headless: send the project coordinator one message (start a worktree thread), wait until the thread
// card shows its branch, print the branch name. Usage: PWDEBUG=0 node start-thread.mjs <state.json> <origin> <projectPath> <message>
import { chromium } from "./pw.mjs";
import { writeFileSync, chmodSync } from "node:fs";
import { execFileSync } from "node:child_process";
const REPO = process.env.REPO; // the demo clone; the branch is detected there, not from page text
const [stateFile, origin, projectPath, message] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "light", storageState: stateFile });
const page = await context.newPage();
await page.goto(origin + projectPath, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
const box = page.getByPlaceholder(/Describe a task or ask a question|Ask the coordinator/).or(page.locator('[contenteditable="true"]')).last();
await box.click();
await page.keyboard.type(message, { delay: 10 });
await page.waitForTimeout(500);
await page.keyboard.press("Enter");
console.log("sent");
const deadline = Date.now() + 6 * 60 * 1000;
let branch = null;
while (Date.now() < deadline && !branch) {
  await page.waitForTimeout(3000);
  const out = execFileSync("git", ["-C", REPO, "for-each-ref", "--format=%(refname:short)", "refs/heads/greet/"], { encoding: "utf8" }).trim();
  if (out) branch = out.split("\n")[0];
}
await page.screenshot({ path: process.env.SHOT || "/dev/null" }).catch(() => {});
writeFileSync(stateFile, JSON.stringify(await context.storageState()), { mode: 0o600 }); chmodSync(stateFile, 0o600);
console.log("branch", branch);
await browser.close();
process.exit(branch ? 0 : 1);
