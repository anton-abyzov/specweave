#!/usr/bin/env node
// Verifies the tutorial catalogue (src/data/tutorials.json, schema v2) against the files on disk.
//
//   node scripts/verify-tutorials.mjs            catalogue, media, studio docs, release manifest
//   node scripts/verify-tutorials.mjs --no-probe skip ffprobe duration checks
//   node scripts/verify-tutorials.mjs --built    also check build/tutorials/** after `npm run build`
//
// Rules: every published tutorial plays from first-party files with WebVTT captions and ordered
// chapters; planned tutorials claim no media; learning paths and related links name real slugs;
// every guide has its own description and at least one inbound link; agent guides carry their
// agent notes (src/data/tutorial-extras.json); the studio docs embed catalogued videos through
// <TutorialEmbed> and leave the transcript to the guide page, so the two do not duplicate.
import assert from 'node:assert/strict';
import {existsSync, readFileSync, realpathSync, statSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyManifest} from '../static/video/studio-projects/verify-tutorials.mjs';
import {NATIVE_PROOF_NOTE} from '../static/video/studio-projects/native-proof-scope.mjs';
import {isHostedMedia, publishedVideo} from './media.mjs';

const ownPath = fileURLToPath(import.meta.url);
const defaultSiteRoot = resolve(dirname(ownPath), '..');

export const AGENTS = ['claude-code', 'codex', 'opencode', 'antigravity', 'grok', 'cursor'];
export const PRODUCTS = ['cli', 'specwithcode'];
export const PLANNED_PRODUCTS = [...PRODUCTS, 'verified-skill'];
const SLUG = /^[a-z][a-z0-9-]+$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const MEDIA_KEYS = ['video', 'src', 'poster', 'captionsVtt', 'durationSeconds', 'chapters', 'publishedAt', 'uploadDate'];
/** Brand copy rules: no exclamation marks, no emoji, no arrows. */
const BANNED = [/!/, /\p{Extended_Pictographic}/u, /[←-⇿⟰-⟿]/];
/** Captured terminal output may hold "!" (it is real output), but no emoji or arrows. */
const BANNED_OUTPUT = BANNED.slice(1);
const CAPTURE_ROOT = 'video/tutorials';
const AGENT_SERIES = 'your-agent-in-specwithcode';
/** Share of a built guide's 5-word phrases that must appear on no other guide page. */
export const MIN_UNIQUE_SHARE = 0.4;
/** Studio docs that embed the studio-projects walkthroughs. */
export const STUDIO_DOCS = {
  'studio/projects.md': ['projects-and-threads', 'personal-and-connections'],
  'studio/plans-and-routines.md': ['plans-and-routines'],
  'studio/memory-and-usage.md': ['memory-and-usage'],
};

const text = (value, label) => assert(typeof value === 'string' && value.trim(), `${label} must be a non-empty string`);

function copy(value, label) {
  text(value, label);
  for (const rule of BANNED) assert(!rule.test(value), `${label} breaks the copy rules (${rule}): ${value}`);
}

function firstParty(siteRoot, sitePath, extension, label) {
  assert(typeof sitePath === 'string' && /^\/[a-z0-9][a-z0-9/_.-]*$/i.test(sitePath) && !sitePath.includes('..'),
    `${label} must be a first-party site path: ${sitePath}`);
  assert(sitePath.endsWith(extension), `${label} must end with ${extension}: ${sitePath}`);
  const root = resolve(siteRoot, 'static');
  const target = resolve(root, sitePath.slice(1));
  // Videos are served from R2; a local render, when present, is what gets probed.
  if (isHostedMedia(sitePath) && !existsSync(target)) return publishedVideo(sitePath);
  assert(existsSync(target), `${label} is missing: static${sitePath}`);
  const rel = relative(realpathSync(root), realpathSync(target));
  assert(rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), `${label} escapes static/`);
  assert(statSync(target).isFile(), `${label} is not a file`);
  return target;
}

function probeDuration(file) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file], {encoding: 'utf8'});
  assert.equal(result.status, 0, `ffprobe could not read ${file}`);
  return Number(JSON.parse(result.stdout).format?.duration);
}

function verifyTutorial(siteRoot, t, slugs, {probe}) {
  const label = `tutorial ${t.slug}`;
  assert(PRODUCTS.includes(t.product), `${label}: unknown product ${t.product}`);
  for (const key of ['title', 'seoTitle', 'summary', 'outcome', 'note']) copy(t[key], `${label}.${key}`);
  assert(t.title.length <= 70, `${label}: title over 70 characters`);
  assert(t.seoTitle.length <= 60, `${label}: seoTitle over 60 characters (the page adds " | SpecWeave")`);
  if (t.seoDescription !== undefined) {
    copy(t.seoDescription, `${label}.seoDescription`);
    assert(t.seoDescription.length <= 155, `${label}: seoDescription over 155 characters`);
  }
  assert(t.summary.length <= 160 || t.seoDescription !== undefined, `${label}: summary over 160 characters needs a seoDescription`);
  assert(Array.isArray(t.prerequisites) && t.prerequisites.every(p => typeof p === 'string' && p.trim()), `${label}: prerequisites must be strings`);
  assert(t.testedOn === null || (typeof t.testedOn === 'string' && t.testedOn.trim()), `${label}: testedOn must be a string or null`);
  assert([...AGENTS, 'multi', 'any'].includes(t.agent), `${label}: unknown agent`);
  assert(Array.isArray(t.agentsShown) && t.agentsShown.every(a => AGENTS.includes(a)), `${label}: unknown agentsShown`);
  assert.equal(t.agent === 'multi', t.agentsShown.length > 0, `${label}: only a multi-agent tutorial lists agentsShown`);
  assert(Array.isArray(t.steps) && t.steps.length >= 2, `${label}: needs at least two steps`);
  t.steps.forEach((step, i) => copy(step, `${label}.steps[${i}]`));
  assert(['captions', null].includes(t.transcript), `${label}: transcript must be "captions" or null`);
  if (t.action !== null) {
    assert(t.action && typeof t.action === 'object', `${label}: action must be an object or null`);
    copy(t.action.label, `${label}.action.label`);
    assert(/^(\/|https:\/\/)/.test(t.action.to), `${label}: action.to must be a site path or https URL`);
  }
  assert(t.guide === null || /^\/[a-z0-9]/.test(t.guide), `${label}: guide must be a site path or null`);
  assert(Array.isArray(t.related), `${label}: related must be a list`);
  for (const slug of t.related) {
    assert(slug !== t.slug, `${label}: relates to itself`);
    assert(slugs.has(slug), `${label}: related slug ${slug} is not a published tutorial`);
  }

  const v = t.video;
  assert(v && typeof v === 'object', `${label}: video is required`);
  const video = firstParty(siteRoot, v.src, '.mp4', `${label}.video.src`);
  firstParty(siteRoot, v.poster, '.jpg', `${label}.video.poster`);
  const captions = firstParty(siteRoot, v.captionsVtt, '.vtt', `${label}.video.captionsVtt`);
  assert(readFileSync(captions, 'utf8').startsWith('WEBVTT'), `${label}: captions must be WebVTT`);
  assert(['silent', 'narrated'].includes(v.audio), `${label}: audio must be silent or narrated`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(v.uploadDate) && !Number.isNaN(Date.parse(v.uploadDate)), `${label}: uploadDate must be YYYY-MM-DD`);
  assert(v.publishedAt === null || (ISO_TIME.test(v.publishedAt) && Date.parse(v.publishedAt) <= Date.now()),
    `${label}: publishedAt must be null or a past time with a zone`);
  assert(typeof v.durationSeconds === 'number' && v.durationSeconds >= 20 && v.durationSeconds <= 180, `${label}: duration out of range`);
  assert(Array.isArray(v.chapters) && v.chapters.length >= 2, `${label}: needs chapters`);
  assert.equal(v.chapters[0].start, 0, `${label}: first chapter starts at 0`);
  v.chapters.forEach((c, i) => {
    copy(c.title, `${label}: chapter title`);
    assert(typeof c.start === 'number' && c.start < v.durationSeconds, `${label}: chapter beyond the video`);
    if (i) assert(c.start > v.chapters[i - 1].start, `${label}: chapters must ascend`);
  });
  if (probe) {
    const actual = probeDuration(video);
    assert(Math.abs(actual - v.durationSeconds) <= 0.5, `${label}: duration ${v.durationSeconds}s disagrees with the file (${actual}s)`);
  }
}

function verifyPlanned(p, slugs) {
  const label = `planned ${p.slug}`;
  assert(PLANNED_PRODUCTS.includes(p.product), `${label}: unknown product`);
  copy(p.title, `${label}.title`);
  copy(p.outcome, `${label}.outcome`);
  assert(Array.isArray(p.beats) && p.beats.length > 0, `${label}: needs beats`);
  assert(typeof p.targetSeconds === 'number' && p.targetSeconds >= 30 && p.targetSeconds <= 180, `${label}: targetSeconds out of range`);
  for (const key of MEDIA_KEYS) assert(!(key in p), `${label}: planned tutorials must not claim media (${key})`);
  if (p.agent !== undefined) assert(AGENTS.includes(p.agent), `${label}: unknown agent`);
  if (p.replaces !== undefined) assert(slugs.has(p.replaces), `${label}: replaces an unknown tutorial`);
}

/** The catalogue itself. Returns {published, planned, paths} counts. */
export function verifyCatalogue(siteRoot = defaultSiteRoot, {probe = true} = {}) {
  const catalogue = JSON.parse(readFileSync(resolve(siteRoot, 'src/data/tutorials.json'), 'utf8'));
  assert.equal(catalogue.schemaVersion, 2, 'tutorials.json must be schema v2');
  assert.deepEqual(catalogue.requiredAgents, AGENTS, 'requiredAgents changed');
  assert(Array.isArray(catalogue.tutorials) && catalogue.tutorials.length > 0, 'no tutorials');
  assert(Array.isArray(catalogue.planned), 'planned must be a list');
  assert(Array.isArray(catalogue.paths) && catalogue.paths.length > 0, 'no learning paths');

  const all = new Set();
  for (const entry of [...catalogue.tutorials, ...catalogue.planned]) {
    assert(SLUG.test(entry.slug), `invalid slug: ${entry.slug}`);
    assert(!all.has(entry.slug), `duplicate slug: ${entry.slug}`);
    all.add(entry.slug);
  }
  const published = new Set(catalogue.tutorials.map(t => t.slug));
  for (const t of catalogue.tutorials) verifyTutorial(siteRoot, t, published, {probe});
  for (const p of catalogue.planned) verifyPlanned(p, published);

  for (const agent of AGENTS) {
    assert(catalogue.tutorials.some(t => t.agent === agent) || catalogue.planned.some(p => p.agent === agent),
      `no published or planned tutorial for ${agent}`);
  }

  const ids = new Set();
  for (const path of catalogue.paths) {
    assert(SLUG.test(path.id) && !ids.has(path.id), `invalid or duplicate path id: ${path.id}`);
    ids.add(path.id);
    assert(PLANNED_PRODUCTS.includes(path.product), `path ${path.id}: unknown product`);
    copy(path.title, `path ${path.id}.title`);
    copy(path.summary, `path ${path.id}.summary`);
    assert(Array.isArray(path.steps) && path.steps.length > 0, `path ${path.id}: no steps`);
    assert.equal(new Set(path.steps).size, path.steps.length, `path ${path.id}: repeats a step`);
    for (const slug of path.steps) assert(all.has(slug), `path ${path.id}: unknown step ${slug}`);
    if (path.url !== undefined) {
      assert(/^https:\/\//.test(path.url), `path ${path.id}: url must be https`);
    } else {
      assert(path.steps.some(slug => published.has(slug)), `path ${path.id}: needs at least one published step on this site`);
    }
  }
  const extras = verifyExtras(siteRoot, catalogue);

  const descriptions = new Map();
  for (const t of catalogue.tutorials) {
    const description = t.seoDescription ?? t.summary;
    assert(!descriptions.has(description), `${t.slug}: same description as ${descriptions.get(description)}`);
    descriptions.set(description, t.slug);
    const inbound = catalogue.tutorials.filter(o => o.slug !== t.slug && o.related.includes(t.slug)).length
      + catalogue.paths.filter(p => p.url === undefined && p.steps.includes(t.slug)).length;
    assert(inbound > 0, `${t.slug}: no other guide or learning path links to it`);
  }
  // The per-agent series repeats the same beats, so each episode carries what differs for its agent.
  // The path is absent while its episodes are re-recorded; the planned entries keep each agent listed.
  const series = catalogue.paths.find(p => p.id === AGENT_SERIES);
  for (const slug of (series?.steps ?? []).filter(slug => published.has(slug))) {
    assert(extras.guides[slug]?.agentNotes?.length, `${slug}: agent series guides need agentNotes in tutorial-extras.json`);
  }
  return {published: catalogue.tutorials.length, planned: catalogue.planned.length, paths: catalogue.paths.length, catalogue, extras};
}

/** src/data/tutorial-extras.json: agent notes, terminal captures and chapter notes per published guide. */
export function verifyExtras(siteRoot, catalogue) {
  const extras = JSON.parse(readFileSync(resolve(siteRoot, 'src/data/tutorial-extras.json'), 'utf8'));
  assert.equal(extras.schemaVersion, 1, 'tutorial-extras.json must be schema v1');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(extras.guidesUpdatedAt), 'tutorial-extras.json: guidesUpdatedAt must be YYYY-MM-DD');
  const bySlug = new Map(catalogue.tutorials.map(t => [t.slug, t]));
  const repoRoot = resolve(siteRoot, '..');
  for (const [slug, extra] of Object.entries(extras.guides)) {
    const label = `extras ${slug}`;
    const t = bySlug.get(slug);
    assert(t, `${label}: not a published tutorial`);
    for (const [i, note] of (extra.agentNotes ?? []).entries()) copy(note, `${label}.agentNotes[${i}]`);
    for (const ref of extra.captures ?? []) {
      copy(ref.label, `${label}: capture label`);
      const file = resolve(repoRoot, ref.file);
      const rel = relative(resolve(repoRoot, CAPTURE_ROOT), file);
      assert(rel && !rel.startsWith('..') && !isAbsolute(rel) && ref.file.endsWith('.json'), `${label}: capture ${ref.file} must be under ${CAPTURE_ROOT}/`);
      assert(existsSync(file), `${label}: missing capture ${ref.file}`);
      const run = JSON.parse(readFileSync(file, 'utf8'));
      text(run.command, `${label}: ${ref.file} command`);
      assert(!Number.isNaN(Date.parse(run.capturedAt)), `${label}: ${ref.file} has no capturedAt`);
      for (const rule of BANNED_OUTPUT) assert(!rule.test(`${run.command}\n${run.stdout ?? ''}`), `${label}: ${ref.file} output breaks the copy rules (${rule})`);
    }
    for (const note of extra.chapterNotes ?? []) {
      copy(note.text, `${label}: chapter note`);
      assert(t.video.chapters.some(c => c.start === note.start), `${label}: chapter note at ${note.start}s matches no chapter start`);
      if (note.to !== undefined) assert(/^\/[a-z0-9]/.test(note.to), `${label}: chapter note link must be a site path`);
      if (note.label !== undefined) copy(note.label, `${label}: chapter note label`);
    }
    if (extra.updatedAt !== undefined) assert(/^\d{4}-\d{2}-\d{2}$/.test(extra.updatedAt), `${label}: updatedAt must be YYYY-MM-DD`);
  }
  return extras;
}

/** The studio docs embed their walkthroughs through <TutorialEmbed>, and the release manifest matches the catalogue. */
export function verifyStudioDocs(siteRoot = defaultSiteRoot, catalogue, manifest) {
  const bySlug = new Map(catalogue.tutorials.map(t => [t.slug, t]));
  for (const [page, slugs] of Object.entries(STUDIO_DOCS)) {
    const source = readFileSync(resolve(siteRoot, 'docs', page), 'utf8');
    assert(!/<video\b|<iframe\b/.test(source), `${page}: use <TutorialEmbed>, not a raw media tag`);
    assert(source.includes("import TutorialEmbed from '@site/src/components/TutorialVideo/TutorialEmbed';"), `${page}: missing TutorialEmbed import`);
    assert(!/<summary>Read the transcript/.test(source), `${page}: the transcript belongs on the guide page; link to it instead`);
    for (const slug of slugs) {
      assert(bySlug.has(slug), `${page}: embeds ${slug}, which is not published`);
      assert(source.includes(`<TutorialEmbed slug="${slug}" />`), `${page}: does not embed ${slug}`);
      assert.equal(bySlug.get(slug).guide, `/docs/${page.replace(/\.md$/, '')}`, `${slug}: guide must point at ${page}`);
    }
  }
  const projects = readFileSync(resolve(siteRoot, 'docs/studio/projects.md'), 'utf8');
  assert(projects.includes(NATIVE_PROOF_NOTE), 'studio/projects.md must keep the native proof limitation');

  if (manifest?.status === 'ready') {
    for (const item of manifest.tutorials) {
      const entry = bySlug.get(item.id);
      assert(entry, `verified walkthrough missing from the catalogue: ${item.id}`);
      assert.equal(entry.video.src, `/video/studio-projects/${item.media.video.file}`, `${item.id}: catalogue video must be the verified file`);
      assert.equal(entry.video.poster, `/video/studio-projects/${item.media.poster.file}`, `${item.id}: catalogue poster must be the verified file`);
      assert.equal(entry.video.captionsVtt, `/video/studio-projects/${item.media.captions.file}`, `${item.id}: catalogue captions must be the verified file`);
    }
  }
  return Object.keys(STUDIO_DOCS).length;
}

/** The guide's own text: the <article>, without tags, scripts or entities. */
export function articleText(html) {
  const start = html.indexOf('<article');
  const end = html.indexOf('</article>', start);
  const body = start === -1 ? html : html.slice(start, end === -1 ? undefined : end);
  return body.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
}

/** Distinct 5-word phrases, lower-cased. */
export function shingles(text, size = 5) {
  const words = text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'.-]*/gu) ?? [];
  const set = new Set();
  for (let i = 0; i + size <= words.length; i++) set.add(words.slice(i, i + size).join(' '));
  return set;
}

/**
 * After `npm run build`: one page per published tutorial with one h1, its canonical URL and
 * structured data, the transcript open on the page, and enough text that no other guide repeats.
 */
export function verifyBuilt(siteRoot = defaultSiteRoot, catalogue, origin = 'https://spec-weave.com') {
  const hub = resolve(siteRoot, 'build/tutorials/index.html');
  const pages = new Map();
  assert(existsSync(hub), 'build/tutorials/index.html is missing');
  for (const t of catalogue.tutorials) {
    const file = resolve(siteRoot, 'build/tutorials', t.slug, 'index.html');
    assert(existsSync(file), `guide page not built: /tutorials/${t.slug}/`);
    const html = readFileSync(file, 'utf8');
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${t.slug}: needs exactly one h1`);
    const canonical = `${origin}/tutorials/${t.slug}/`;
    assert(html.includes(`rel="canonical" href="${canonical}"`) || html.includes(`href="${canonical}" rel="canonical"`), `${t.slug}: canonical missing`);
    assert(html.includes('"TechArticle"') && html.includes('"BreadcrumbList"'), `${t.slug}: structured data missing`);
    if (t.video.publishedAt) assert(html.includes('"VideoObject"') && html.includes('"Clip"'), `${t.slug}: VideoObject missing`);
    assert(html.includes(t.video.src), `${t.slug}: video not on the page`);
    if (t.transcript === 'captions') {
      assert(html.includes('id="transcript-title"'), `${t.slug}: transcript missing`);
      assert(!/<summary>\s*<h2 id="transcript-title"/.test(html), `${t.slug}: transcript is collapsed in <details>`);
    }
    if (t.video.publishedAt) {
      assert(html.includes('"transcript":'), `${t.slug}: VideoObject has no transcript`);
      assert(!html.includes('"embedUrl"'), `${t.slug}: VideoObject still has an embedUrl`);
    }
    pages.set(t.slug, shingles(articleText(html)));
  }
  for (const [slug, own] of pages) {
    const others = new Set();
    for (const [other, set] of pages) if (other !== slug) for (const s of set) others.add(s);
    const unique = [...own].filter(s => !others.has(s)).length / own.size;
    assert(unique >= MIN_UNIQUE_SHARE, `${slug}: only ${Math.round(unique * 100)}% of its 5-word phrases are on no other guide page`);
  }
  for (const p of catalogue.planned) {
    assert(!existsSync(resolve(siteRoot, 'build/tutorials', p.slug, 'index.html')), `planned tutorial has a page: ${p.slug}`);
  }
  return catalogue.tutorials.length;
}

if (process.argv[1] && resolve(process.argv[1]) === ownPath) {
  const flags = process.argv.slice(2);
  assert(flags.every(f => ['--no-probe', '--built'].includes(f)), `unknown option; use --no-probe or --built`);
  const result = verifyCatalogue(defaultSiteRoot, {probe: !flags.includes('--no-probe')});
  const manifest = verifyManifest(resolve(defaultSiteRoot, 'static/video/studio-projects'), {probe: !flags.includes('--no-probe')});
  const docs = verifyStudioDocs(defaultSiteRoot, result.catalogue, manifest);
  let built = '';
  if (flags.includes('--built')) built = ` ${verifyBuilt(defaultSiteRoot, result.catalogue)} built guide pages checked.`;
  console.log(`${result.published} published tutorials, ${result.planned} planned, ${result.paths} learning paths verified; ${docs} studio docs embed through TutorialEmbed; walkthrough manifest ${manifest.status}.${built}`);
}
