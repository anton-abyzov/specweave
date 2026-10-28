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

// Guides written for a search query. Add a guide here once its title and description fit.
const searchGuides = new Set([
  'agents-md-vs-claude-md', 'auto-handoff', 'claude-code-usage-limit', 'claude-code-vs-codex', 'cross-tool-handoff',
  'handoff-md', 'switch-claude-code-to-codex', 'switch-claude-code-to-cursor', 'switch-claude-code-to-opencode',
].map(slug => `/docs/guides/${slug}/`));
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
  if (pathname.startsWith('/docs/compare/') || searchGuides.has(pathname)) {
    // Search results cut longer snippets, so keep comparison pages and the search-facing guides inside the visible length.
    assert(descriptions[0].content.length <= 160, `Description over 160 characters (${descriptions[0].content.length}): ${url}`);
    assert(doc.title.length <= 60, `Title over 60 characters (${doc.title.length}): ${url}`);
  }
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

// Brand discovery is a rendered-page contract, including entity links and visible FAQ copy.
const schemaNodes = doc => [...doc.querySelectorAll('script[type="application/ld+json"]')]
  .flatMap(script => { const data = JSON.parse(script.textContent); return data['@graph'] ?? [data]; });
for (const path of ['/code/', '/code/download/']) {
  const doc = pageFor(path);
  assert(doc.querySelector('main').textContent.includes('Spec with Code'), `Missing visible brand pronunciation: ${path}`);
  assert(doc.querySelector('meta[name="description"]').content.includes('Spec with Code'), `Missing brand alias in description: ${path}`);
  assert(doc.querySelector('meta[name="description"]').content.length <= 160, `Long product description: ${path}`);
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    assert.equal(doc.querySelector(selector)?.content, `${origin}/img/studio/og-specwithcode.jpg?v=all-platforms-20261027`, `Wrong product share image: ${path}`);
  }
  const nodes = schemaNodes(doc);
  assert(nodes.some(node => node['@type'] === 'WebSite' && node['@id'] === `${origin}/#website`), `Unresolved site entity: ${path}`);
  const app = nodes.find(node => node['@type'] === 'SoftwareApplication' && node.name === 'SpecWithCode');
  assert.equal(app?.alternateName, 'Spec with Code', `Missing product alias: ${path}`);
  assert.equal(app?.['@id'], `${origin}/code/#app`, `Split product identity: ${path}`);
  const webPage = nodes.find(node => node['@type'] === 'WebPage');
  assert.equal(webPage?.isPartOf?.['@id'], `${origin}/#website`, `Page must belong to root WebSite: ${path}`);
}
const product = pageFor('/code/');
assert(product.title.includes('own computers'), 'Product title must be platform-neutral');
assert(!/own Macs|on your Mac\b/.test(product.querySelector('meta[property="og:image:alt"]')?.content ?? ''), 'Mac-only share image alt');
for (const os of ['macOS', 'Windows', 'Linux']) {
  assert(product.querySelector('meta[name="description"]').content.includes(os), `Missing platform in product description: ${os}`);
  assert(schemaNodes(product).find(node => node['@type'] === 'SoftwareApplication')?.operatingSystem.includes(os), `Missing structured platform: ${os}`);
}

assert(product.title.includes('Spec with Code'), 'Product title must explain the spaced brand');
assert.equal(schemaNodes(product).find(node => node['@type'] === 'WebPage')?.mainEntity?.['@id'], `${origin}/code/#app`);
for (const faq of schemaNodes(product).filter(node => node['@type'] === 'FAQPage')) {
  for (const question of faq.mainEntity) {
    assert(product.querySelector('main').textContent.includes(question.name), `Invisible FAQ: ${question.name}`);
    assert(product.querySelector('main').textContent.includes(question.acceptedAnswer.text), `FAQ answer differs from page: ${question.name}`);
  }
}
for (const path of searchGuides) assert(indexablePaths.has(path), `Search guide missing from sitemap: ${path}`);
const comparisonPath = '/docs/compare/spec-as-code/';
assert(indexablePaths.has(comparisonPath), 'Missing terminology guide in sitemap');
const comparison = pageFor(comparisonPath);
const article = schemaNodes(comparison).find(node => node['@type'] === 'TechArticle');
assert.equal(article?.url, `${origin}${comparisonPath}`);
assert.equal(article?.headline, comparison.querySelector('h1').textContent);
assert(comparison.querySelector('main').textContent.includes('AC-04'), 'Guide must include a concrete acceptance example');
assert(product.querySelector(`a[href="${comparisonPath}"]`), 'Product must link to terminology guide');
for (const path of ['/docs/compare/', '/docs/compare/specweave-vs-openspec/', '/docs/guides/handoff-md/']) {
  const page = pageFor(path);
  const articles = schemaNodes(page).filter(node => node['@type'] === 'TechArticle');
  assert.equal(articles.length, 1, `Expected one TechArticle: ${path}`);
  assert.equal(articles[0].url, `${origin}${path}`, `TechArticle URL differs from the page: ${path}`);
  assert.equal(`${articles[0].headline} | SpecWeave`, page.title, `TechArticle headline differs from the title: ${path}`);
}
assert.equal(schemaNodes(comparison).filter(node => node['@type'] === 'TechArticle').length, 1, 'Duplicate TechArticle on the terminology guide');
console.log('Brand SEO verified: visible alias, product identity, social cards, matching FAQ and indexable TechArticle.');
for (const path of ['/', '/code/', '/code/download/']) {
  assert(!pageFor(path).querySelector('link[href*="fonts.googleapis.com"]'), `External font stylesheet blocks rendering: ${path}`);
}
