// Verify the generated artifact, including the metadata emitted by theme wrappers.
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';

const build = fileURLToPath(new URL('../build/', import.meta.url));
const origin = 'https://spec-weave.com';
const fileFor = pathname => `${build}${pathname.slice(1)}${pathname.endsWith('/') ? 'index.html' : ''}`;
const pageFor = pathname => new JSDOM(readFileSync(fileFor(pathname), 'utf8')).window.document;
const sitemap = new JSDOM(readFileSync(`${build}sitemap.xml`, 'utf8'), {contentType: 'text/xml'}).window.document;
const urls = [...sitemap.querySelectorAll('loc')].map(node => node.textContent);
assert(urls.length > 0, 'The sitemap must contain public pages');
assert.equal(new Set(urls).size, urls.length, 'Sitemap URLs must be unique');

// Googlebot currently follows the wildcard group. Keep its sitemap URLs clear
// of every disallow in that group, including wildcard and end-anchor rules.
const wildcardDisallows = [];
let agents = [];
let rulesStarted = false;
for (const line of readFileSync(`${build}robots.txt`, 'utf8').split('\n')) {
  const directive = line.split('#')[0].trim().match(/^([^:]+):\s*(.*)$/);
  if (!directive) continue;
  const [, name, value] = directive;
  if (name.toLowerCase() === 'user-agent') {
    if (rulesStarted) agents = [];
    agents.push(value.toLowerCase());
    rulesStarted = false;
  } else if (['allow', 'disallow'].includes(name.toLowerCase())) {
    rulesStarted = true;
    if (agents.includes('*') && name.toLowerCase() === 'disallow' && value) {
      const pattern = value.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      wildcardDisallows.push(new RegExp(`^${pattern}`));
    }
  }
}

const titles = new Map();
const indexablePaths = new Set();
let internalLinks = 0;
for (const url of urls) {
  const {pathname, origin: pageOrigin} = new URL(url);
  assert.equal(pageOrigin, origin, `Unexpected sitemap origin: ${url}`);
  assert(pathname.endsWith('/'), `Directory URLs must use a trailing slash: ${url}`);
  assert(!wildcardDisallows.some(rule => rule.test(pathname)), `Robots blocks sitemap URL: ${url}`);
  indexablePaths.add(pathname);
  const doc = pageFor(pathname);
  const canonical = [...doc.querySelectorAll('link[rel="canonical"]')];
  assert.equal(canonical.length, 1, `Expected one canonical: ${url}`);
  assert.equal(canonical[0].href, url, `Sitemap and canonical disagree: ${url}`);
  assert(!/noindex/i.test(doc.querySelector('meta[name="robots"]')?.content ?? ''), `Sitemap includes noindex page: ${url}`);
  assert(doc.title.trim(), `Missing title: ${url}`);
  assert(!titles.has(doc.title), `Duplicate title: ${doc.title} (${titles.get(doc.title)}, ${url})`);
  titles.set(doc.title, url);
  const descriptions = doc.querySelectorAll('meta[name="description"]');
  assert.equal(descriptions.length, 1, `Expected one description: ${url}`);
  assert(descriptions[0].content.trim(), `Empty description: ${url}`);
  assert.equal(doc.querySelectorAll('h1').length, 1, `Expected one page heading: ${url}`);
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) JSON.parse(script.textContent);
  for (const link of doc.querySelectorAll('a[href]')) {
    const target = new URL(link.getAttribute('href'), url);
    if (target.origin !== origin) continue;
    const path = target.pathname.endsWith('/') || /\.[^/]+$/.test(target.pathname) ? target.pathname : `${target.pathname}/`;
    assert(existsSync(fileFor(path)), `Broken internal link: ${url} -> ${target.href}`);
    internalLinks++;
  }
}

for (const path of ['/search/', '/blog/tags/seo/', '/evidence/handoff-demo.html']) {
  assert(!indexablePaths.has(path), `Utility or archive included in sitemap: ${path}`);
  assert(/noindex/i.test(pageFor(path).querySelector('meta[name="robots"]')?.content ?? ''), `Missing intentional noindex: ${path}`);
}
assert(!wildcardDisallows.some(rule => rule.test('/search/')), 'Search must be crawlable so Google can read noindex');
assert(!indexablePaths.has('/docs/overview/'), 'The copied README must not compete with the introduction');
assert.equal(new URL(pageFor('/docs/overview/').querySelector('link[rel="canonical"]').href, origin).href, `${origin}/docs/overview/introduction/`);
console.log(`SEO artifact verified: ${urls.length} indexable URLs; unique titles, descriptions, headings, matching canonicals; ${internalLinks} internal links; intentional exclusions preserved.`);
