// Pair a headless browser with a disposable SpecWithCode server and save its
// storageState, without printing or logging the pairing URL.
// Usage: node pair-headless.mjs <pair.json> <storageState.json>
import { chromium } from "./pw.mjs";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const [pairFile, stateFile] = process.argv.slice(2);
const { pairingUrl, origin } = JSON.parse(readFileSync(pairFile, "utf8"));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "light" });
const page = await context.newPage();
await page.goto(pairingUrl, { waitUntil: "domcontentloaded" });
// Wait until the app has left the /pair route.
await page.waitForURL((u) => !u.pathname.startsWith("/pair"), { timeout: 30000 });
await page.waitForTimeout(2000);
const state = await context.storageState();
writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
chmodSync(stateFile, 0o600);
console.log("paired; landed on", new URL(page.url()).pathname, "origin", origin);
await browser.close();
