#!/usr/bin/env node
// Post-deploy check of the live docs site.
//
//   node docs-site/scripts/verify-live.mjs [--origin https://spec-weave.com]
//        [--browser] [--screenshots <dir>] [--preflight] [<changed file or /path> ...]
//
// Every page must answer 200 (retried while GitHub Pages propagates), and every
// same-origin <img>, <video> and <source> on it must answer 200. Changed files
// map to their pages: docs-site/src/pages/x.tsx -> /x/, docs-site/docs/a/b.md
// -> /docs/a/b/, docs-site/static/p -> /p. With no arguments it checks /,
// /code/ and /docs/.
//
// --browser also renders each page in headless Chromium (never a visible
// window), loads lazy images eagerly (hidden tab panels too), requires every image
// to have decoded, and saves a full-page screenshot per page to --screenshots
// (default: a new directory under the system temp dir). --preflight only
// checks that Playwright and its Chromium are installed.
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULT_PATHS = ['/', '/code/', '/docs/'];

const stripOrder = (segment) => segment.replace(/^\d+[-_.]/, '');

// docs-site/... file -> site path, or null when the file is not a page or asset.
export function pageFor(file, root = repoRoot) {
  const rel = file.replace(/\\/g, '/');
  if (rel.startsWith('/')) return rel;
  if (!existsSync(path.join(root, rel))) return null; // deleted in the change
  if (rel.startsWith('docs-site/static/')) return '/' + rel.slice('docs-site/static/'.length);
  let match = /^docs-site\/src\/pages\/(.+)\.(tsx|jsx|js|md|mdx)$/.exec(rel);
  if (match) {
    const route = match[1].split('/');
    if (route.some((segment) => segment.startsWith('_'))) return null;
    if (route[route.length - 1] === 'index') route.pop();
    return route.length ? `/${route.join('/')}/` : '/';
  }
  match = /^docs-site\/docs\/(.+)\.(md|mdx)$/.exec(rel);
  if (match) {
    const route = match[1].split('/').map(stripOrder);
    if (route.some((segment) => segment.startsWith('_'))) return null;
    const slug = /^---\n[\s\S]*?^slug:\s*['"]?([^'"\n]+)['"]?\s*$[\s\S]*?^---/m.exec(readFileSync(path.join(root, rel), 'utf8'))?.[1]?.trim();
    if (slug?.startsWith('/')) return `/docs${slug === '/' ? '' : slug.replace(/\/?$/, '')}/`;
    if (slug) route[route.length - 1] = slug;
    else if (route[route.length - 1] === 'index') route.pop();
    return `/docs/${route.join('/')}${route.length ? '/' : ''}`;
  }
  return null;
}

export function assetUrls(html, pageUrl) {
  const urls = new Set();
  const tag = /<(img|video|source)\b[^>]*>/gi;
  for (const [element] of html.matchAll(tag)) {
    for (const [, value] of element.matchAll(/\s(?:src|poster)=["']([^"']+)["']/gi)) {
      if (value.startsWith('data:')) continue;
      const url = new URL(value.replace(/&amp;/g, '&'), pageUrl);
      if (url.origin === new URL(pageUrl).origin) urls.add(url.href);
    }
  }
  return [...urls];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, { attempts, delayMs }) {
  let last = '';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
      if (response.status === 200) return response;
      last = `HTTP ${response.status}`;
      await response.body?.cancel();
    } catch (error) {
      last = error.name === 'TimeoutError' ? 'timeout' : error.message;
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  throw new Error(`${url}: ${last} after ${attempts} attempts`);
}

async function checkHttp(origin, paths, failures) {
  const pages = [];
  for (const sitePath of paths) {
    const url = new URL(sitePath, origin).href;
    try {
      const response = await fetchWithRetry(url, { attempts: 10, delayMs: 6000 });
      const type = response.headers.get('content-type') ?? '';
      if (!type.includes('text/html')) { await response.body?.cancel(); console.log(`ok   ${url}`); continue; }
      const assets = assetUrls(await response.text(), response.url);
      const broken = [];
      for (let i = 0; i < assets.length; i += 6) {
        await Promise.all(assets.slice(i, i + 6).map((asset) =>
          fetchWithRetry(asset, { attempts: 3, delayMs: 3000 }).then((r) => r.body?.cancel(), (error) => broken.push(error.message))));
      }
      if (broken.length) failures.push(...broken.map((b) => `asset ${b} (on ${url})`));
      console.log(`${broken.length ? 'FAIL' : 'ok  '} ${url} (${assets.length} same-origin media)`);
      pages.push(response.url);
    } catch (error) {
      failures.push(error.message);
      console.log(`FAIL ${error.message}`);
    }
  }
  return pages;
}

async function loadChromium() {
  process.env.PWDEBUG = '0';
  process.env.PLAYWRIGHT_HTML_OPEN = 'never';
  try {
    return (await import('@playwright/test')).chromium;
  } catch {
    return (await import('playwright')).chromium;
  }
}

async function checkBrowser(pages, screenshotDir, failures) {
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    for (const url of pages) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
        // Scroll in viewport steps so loading="lazy" images start loading.
        // Lazy images in hidden panels (inactive tabs) never load on scroll,
        // so switch every image to eager first.
        await page.evaluate(async () => {
          for (const img of document.images) img.loading = 'eager';
          for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
          window.scrollTo(0, document.documentElement.scrollHeight);
        });
        const pendingImages = () => page.evaluate(() => [...document.images]
          .filter((img) => img.getAttribute('src') && !(img.complete && img.naturalWidth > 0))
          .map((img) => img.currentSrc || img.src));
        let broken = await pendingImages();
        for (let tries = 0; broken.length && tries < 20; tries++) {
          await page.waitForTimeout(500);
          broken = await pendingImages();
        }
        const file = path.join(screenshotDir, `${new URL(url).pathname.replace(/^\/|\/$/g, '').replace(/[^\w.-]+/g, '_') || 'home'}.png`);
        await page.screenshot({ path: file, fullPage: true });
        if (broken.length) failures.push(...broken.map((src) => `image did not load in the browser: ${src} (on ${url})`));
        if (errors.length) console.log(`warn ${url}: ${errors.length} page error(s): ${errors[0]}`);
        console.log(`${broken.length ? 'FAIL' : 'ok  '} ${url} rendered, screenshot ${file}`);
      } catch (error) {
        failures.push(`${url}: ${error.message.split('\n')[0]}`);
        console.log(`FAIL ${url}: ${error.message.split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

async function main(argv) {
  let origin = 'https://spec-weave.com';
  let browser = false;
  let screenshotDir = '';
  const inputs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--origin') origin = argv[++i];
    else if (argv[i] === '--browser') browser = true;
    else if (argv[i] === '--screenshots') screenshotDir = argv[++i];
    else if (argv[i] === '--preflight') {
      const chromium = await loadChromium();
      if (!existsSync(chromium.executablePath())) throw new Error('Chromium for Playwright is not installed: npx playwright install chromium');
      console.log(`Playwright Chromium ready: ${chromium.executablePath()}`);
      return;
    } else inputs.push(...argv[i].split(/\s+/).filter(Boolean));
  }
  const mapped = [...new Set(inputs.map((input) => pageFor(input)).filter(Boolean))];
  const paths = mapped.length ? mapped : DEFAULT_PATHS;
  console.log(`Checking ${paths.length} path(s) on ${origin}`);
  const failures = [];
  const pages = await checkHttp(origin, paths, failures);
  if (browser && pages.length) {
    if (!screenshotDir) screenshotDir = mkdtempSync(path.join(tmpdir(), 'specweave-live-'));
    mkdirSync(screenshotDir, { recursive: true });
    await checkBrowser(pages, screenshotDir, failures);
    console.log(`Screenshots: ${screenshotDir}`);
  }
  if (failures.length) {
    console.error(`\n${failures.length} problem(s):\n${failures.map((f) => `  - ${f}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('Live site OK');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
