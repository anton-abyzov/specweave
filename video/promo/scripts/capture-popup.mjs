const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.PWDEBUG = '0';
const ext = process.env.EXTENSION_DIR; // specwithcode-dev apps/chrome-extension
const out = process.argv[2];
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'swc-ext-')), {
  headless: true, executablePath: process.env.CHROMIUM,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  viewport: { width: 380, height: 620 }, deviceScaleFactor: 3, colorScheme: 'light',
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;
console.log('extension id', id);
const states = {
  connected: { phase: 'connected', label: 'Personal', machine: 'MacBook Pro', attachedTabs: 2, lastConnectedAt: Date.now() - 4 * 60_000 },
  'not-paired': { phase: 'not_paired' },
};
for (const [name, state] of Object.entries(states)) {
  const page = await ctx.newPage();
  await page.addInitScript(s => {
    const real = chrome.runtime.sendMessage.bind(chrome.runtime);
    chrome.runtime.sendMessage = async m => (m?.type === 'status' ? { state: s } : real(m));
  }, state);
  await page.goto(`chrome-extension://${id}/src/popup.html`);
  await page.waitForTimeout(600);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 380, height: h });
  await page.screenshot({ path: join(out, `popup-${name}.png`) });
  console.log(name, h);
  await page.close();
}
await ctx.close();
