// Off camera helper, headless: open the demo app with a saved storageState, run a snippet with `page`, screenshot.
// Usage: PWDEBUG=0 node explore.mjs <storageState.json> <origin> <snippet.mjs|-> <out.png> [path]
import { chromium } from "./pw.mjs";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
const [stateFile, origin, snippet, out, path = "/"] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "light", storageState: stateFile });
const page = await context.newPage();
await page.goto(origin + path, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
try {
  if (snippet !== "-") {
    const code = readFileSync(snippet, "utf8");
    const fn = new Function("page", "origin", `return (async () => { ${code} })();`);
    const r = await fn(page, origin);
    if (r !== undefined) console.log(typeof r === "string" ? r : JSON.stringify(r, null, 1));
  }
} catch (e) { console.error("SNIPPET ERROR:", e.message.split("\n")[0]); }
await page.screenshot({ path: out });
writeFileSync(stateFile, JSON.stringify(await context.storageState()), { mode: 0o600 });
chmodSync(stateFile, 0o600);
console.log("url", new URL(page.url()).pathname);
await browser.close();
