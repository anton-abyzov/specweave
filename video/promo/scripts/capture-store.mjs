const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const b = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM });
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: 'light', locale: 'en-US', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });
await p.goto('https://chromewebstore.google.com/detail/specwithcode-browser/okoinngelinfjfkmkcnbgndapeiofgbb?hl=en', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.screenshot({ path: process.argv[2] });
console.log(await p.title());
await b.close();
