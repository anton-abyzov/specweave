import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, realpathSync, statSync, existsSync} from 'node:fs';
import {dirname, resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {nativeProofScope, NATIVE_PROOF_NOTE} from './native-proof-scope.mjs';

const ownPath = fileURLToPath(import.meta.url);
const defaultRoot = dirname(ownPath);
const maxBytes = 100 * 1024 * 1024;
const expectedTutorials = new Map([
  ['projects-and-threads', {guide:'studio/projects.md', native:true}],
  ['memory-and-usage', {guide:'studio/memory-and-usage.md', native:false}],
  ['plans-and-routines', {guide:'studio/plans-and-routines.md', native:false}],
  ['personal-and-connections', {guide:'studio/projects.md', native:false}],
]);
const sha256 = data => createHash('sha256').update(data).digest('hex');
function inside(root, name) {
  assert.equal(typeof name, 'string', 'asset name must be a string');
  assert(!isAbsolute(name) && name.length > 0, 'asset name must be relative');
  const target = resolve(root, name);
  const rel = relative(realpathSync(root), realpathSync(target));
  assert(rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), 'asset escapes media directory');
  assert(statSync(target).isFile() && statSync(target).size <= maxBytes, 'invalid asset size/type');
  return target;
}
function asset(root, value, extension) {
  assert(value && /^[a-f0-9]{64}$/.test(value.sha256), 'asset needs SHA256');
  assert(value.file.endsWith(extension), `asset must end with ${extension}`);
  const path = inside(root, value.file);
  assert.equal(sha256(readFileSync(path)), value.sha256, `asset hash mismatch: ${value.file}`);
  return path;
}
export function verifyManifest(root, {release = false, probe = true} = {}) {
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.targetVersion, '0.2.0');
  assert(['planned', 'ready'].includes(manifest.status));
  assert(Array.isArray(manifest.tutorials) && manifest.tutorials.length === expectedTutorials.size);
  assert.equal(new Set(manifest.tutorials.map(t => t.id)).size, expectedTutorials.size);
  if (release) assert.equal(manifest.status, 'ready', 'Tutorials are planned, not release-ready');
  let captureSource = null, captureBuild = null;
  for (const tutorial of manifest.tutorials) {
    assert(/^[a-z][a-z0-9-]+$/.test(tutorial.id));
    assert(tutorial.title && /^studio\/[a-z-]+\.md$/.test(tutorial.guide));
    assert.equal(typeof tutorial.requiresNativeProof, 'boolean');
    const expected = expectedTutorials.get(tutorial.id);
    assert(expected, 'unexpected tutorial identity');
    assert.equal(tutorial.guide, expected.guide, 'tutorial guide mismatch');
    assert.equal(tutorial.requiresNativeProof, expected.native, 'native proof requirement cannot be disabled');
    if (manifest.status === 'planned') {
      assert.equal(tutorial.media, null, 'planned tutorials must not imply finished media');
      continue;
    }
    const video = asset(root, tutorial.media?.video, '.mp4');
    asset(root, tutorial.media?.poster, '.jpg');
    const captions = asset(root, tutorial.media?.captions, '.vtt');
    assert(readFileSync(captions, 'utf8').startsWith('WEBVTT'), 'captions must be WebVTT');
    const receiptPath = asset(root, tutorial.media?.receipt, '.json');
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(receipt.syntheticDataOnly, true, 'public footage must use synthetic data');
    assert.equal(receipt.headless, true, 'automated capture must remain headless');
    assert.equal(receipt.actualApplication, true, 'recreated UI is not application proof');
    assert.equal(receipt.acceptancePassed, true, 'integrated acceptance is required');
    assert.equal(receipt.privacyReviewed, true, 'raw footage needs a privacy review');
    assert.equal(receipt.version, manifest.targetVersion);
    assert(/^[a-f0-9]{40}$/.test(receipt.sourceCommit), 'capture needs an exact source commit');
    assert(/^[a-f0-9]{64}$/.test(receipt.buildSha256), 'capture needs its accepted build hash');
    assert.equal(receipt.providerTurnsStartedByRecorder, 0, 'recorder must not start inference');
    if (captureSource !== null) assert.equal(receipt.sourceCommit, captureSource, 'tutorials must show the same release source');
    if (captureBuild !== null) assert.equal(receipt.buildSha256, captureBuild, 'tutorials must show the same accepted build');
    captureSource = receipt.sourceCommit; captureBuild = receipt.buildSha256;
    assert(!Number.isNaN(Date.parse(receipt.recordedAt)), 'capture needs its date');
    assert.equal(receipt.videoSha256, tutorial.media.video.sha256);
    assert.equal(receipt.visualReviewPassed, true);
    assert.equal(receipt.captionsReviewed, true);
    if (tutorial.id === 'personal-and-connections') {
      assert.deepEqual(receipt.personalEnvironmentProof, {managedStorage:true, noGit:true, repositoryMatch:'passed', connectionDiscovery:'owned-inert-mcp', externalAccountAuthentication:'not_tested', toolInvocation:'not_requested'}, 'Personal walkthrough must use owned discovery without external account claims');
    }
    if (tutorial.requiresNativeProof) {
      nativeProofScope(receipt);
      assert.equal(receipt.nativeProofNote, NATIVE_PROOF_NOTE, 'Native receipt must retain its metadata-preservation limitation');
      assert.equal(receipt.nativeProviders?.claude, 'passed', 'Claude execution proof required');
      assert.equal(receipt.nativeProviders?.codex, 'passed', 'Codex execution proof required');
      assert(/^[a-f0-9]{64}$/.test(receipt.nativeReceiptSha256), 'native proof needs its receipt hash');
    }
    if (probe) {
      const result = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
        'stream=codec_type,width,height:format=duration', '-of', 'json', video], {encoding: 'utf8'});
      assert.equal(result.status, 0, 'ffprobe must validate tutorial video');
      const details = JSON.parse(result.stdout);
      assert.equal(details.streams?.[0]?.codec_type, 'video');
      assert(details.streams[0].width >= 1280 && details.streams[0].height >= 720);
      assert(Number(details.format?.duration) >= 30 && Number(details.format?.duration) <= 180,
        'tutorial must be 30–180 seconds');
    }
  }
  return manifest;
}
export function verifyDocs(siteRoot, manifest, {built = false} = {}) {
  const docs = resolve(siteRoot, 'docs');
  const sidebar = readFileSync(resolve(siteRoot, 'sidebars.ts'), 'utf8');
  const pages = [...new Set([...manifest.tutorials.map(t => t.guide), 'guides/claude-code-projects.md'])];
  const titles = new Set();
  for (const page of pages) {
    const path = resolve(docs, page), text = readFileSync(path, 'utf8');
    assert(text.startsWith('---\n') && /^description: .+$/m.test(text), `missing metadata: ${page}`);
    const title = text.match(/^title: (.+)$/m)?.[1];
    assert(title && !titles.has(title), `missing/duplicate title: ${page}`);
    titles.add(title);
    assert.equal((text.match(/^# /gm) ?? []).length, 1, `one page heading required: ${page}`);
    assert(text.split('\n').length < 1500);
    assert(sidebar.includes(`id: '${page.replace(/\.md$/, '')}'`), `sidebar missing ${page}`);
    for (const match of text.matchAll(/\]\((\.{1,2}\/[^)#]+)(?:#[^)]*)?\)/g)) {
      assert(existsSync(resolve(dirname(path), match[1])), `broken local link: ${page}: ${match[1]}`);
    }
    if (manifest.status === 'planned') assert(!/<video|<iframe|VideoObject/.test(text), 'no unverified media embeds');
    else {
      for (const tutorial of manifest.tutorials.filter(t => t.guide === page)) {
        assert(text.includes('<video') && text.includes(tutorial.media.video.file), `verified video not embedded: ${page}`);
        assert(text.includes('<track') && text.includes(tutorial.media.captions.file), `verified captions not embedded: ${page}`);
        if (tutorial.requiresNativeProof) assert(text.includes(NATIVE_PROOF_NOTE), 'Native transcript must retain its metadata-preservation limitation');
      }
    }
    if (built) {
      const html = readFileSync(resolve(siteRoot, 'build/docs', page.replace(/\.md$/, ''), 'index.html'), 'utf8');
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `built heading missing: ${page}`);
      const expected = `https://spec-weave.com/docs/${page.replace(/\.md$/, '')}/`;
      assert(html.includes(`rel="canonical" href="${expected}"`) || html.includes(`href="${expected}" rel="canonical"`),
        `built canonical missing: ${page}`);
    }
  }
  return pages.length;
}
const GALLERY_AGENTS = ['claude-code', 'codex', 'opencode', 'antigravity', 'grok', 'cursor'];
const GALLERY_STATUSES = ['published', 'coming-soon'];
function firstParty(siteRoot, path, extension) {
  assert(typeof path === 'string' && /^\/[a-z0-9][a-z0-9/_.-]*$/i.test(path) && !path.includes('..'), `tutorial asset must be a first-party site path: ${path}`);
  assert(path.endsWith(extension), `tutorial asset must end with ${extension}: ${path}`);
  return inside(resolve(siteRoot, 'static'), path.slice(1));
}
function probeDuration(video) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', video], {encoding: 'utf8'});
  assert.equal(result.status, 0, `ffprobe must validate gallery video: ${video}`);
  return Number(JSON.parse(result.stdout).format?.duration);
}
/** The /tutorials catalogue (src/data/tutorials.json): every verified tutorial is listed with its exact
    media, every published entry plays from first-party files with captions and chapters, and every
    upcoming agent tutorial claims no media yet. */
export function verifyGallery(siteRoot, manifest, {probe = true} = {}) {
  const gallery = JSON.parse(readFileSync(resolve(siteRoot, 'src/data/tutorials.json'), 'utf8'));
  assert.equal(gallery.schemaVersion, 1);
  assert.deepEqual(gallery.requiredAgents, GALLERY_AGENTS, 'gallery must plan one tutorial per required agent');
  assert(Array.isArray(gallery.tutorials) && gallery.tutorials.length > 0);
  const slugs = new Set();
  for (const t of gallery.tutorials) {
    assert(/^[a-z][a-z0-9-]+$/.test(t.slug), `invalid gallery slug: ${t.slug}`);
    assert(!slugs.has(t.slug), `duplicate gallery slug: ${t.slug}`);
    slugs.add(t.slug);
    assert(typeof t.title === 'string' && t.title.trim() && typeof t.summary === 'string' && t.summary.trim(), `title and summary required: ${t.slug}`);
    assert(GALLERY_STATUSES.includes(t.status), `unknown gallery status: ${t.slug}`);
    assert([...GALLERY_AGENTS, 'multi', 'any'].includes(t.agent), `unknown agent: ${t.slug}`);
    assert(Array.isArray(t.agentsShown) && t.agentsShown.every(a => GALLERY_AGENTS.includes(a)), `unknown agentsShown: ${t.slug}`);
    assert.equal(t.agent === 'multi', t.agentsShown.length > 0, `only a multi-agent tutorial lists agentsShown: ${t.slug}`);
    assert(Array.isArray(t.chapters), `chapters must be a list: ${t.slug}`);
    if (t.status === 'coming-soon') {
      for (const key of ['src', 'poster', 'captionsVtt', 'durationSeconds', 'uploadDate', 'audio']) {
        assert.equal(t[key], null, `upcoming tutorials must not imply finished media: ${t.slug}.${key}`);
      }
      assert.equal(t.chapters.length, 0, `upcoming tutorials must not list chapters: ${t.slug}`);
      continue;
    }
    const video = firstParty(siteRoot, t.src, '.mp4');
    firstParty(siteRoot, t.poster, '.jpg');
    const captions = firstParty(siteRoot, t.captionsVtt, '.vtt');
    assert(readFileSync(captions, 'utf8').startsWith('WEBVTT'), `gallery captions must be WebVTT: ${t.slug}`);
    assert(['silent', 'narrated'].includes(t.audio), `published tutorial needs its audio kind: ${t.slug}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(t.uploadDate) && !Number.isNaN(Date.parse(t.uploadDate)), `published tutorial needs its upload date: ${t.slug}`);
    assert(typeof t.durationSeconds === 'number' && t.durationSeconds >= 20 && t.durationSeconds <= 180, `published duration out of range: ${t.slug}`);
    assert(t.chapters.length >= 2, `published tutorial needs chapters: ${t.slug}`);
    assert.equal(t.chapters[0].start, 0, `first chapter starts at 0: ${t.slug}`);
    t.chapters.forEach((c, i) => {
      assert(typeof c.title === 'string' && c.title.trim(), `chapter needs a title: ${t.slug}`);
      assert(typeof c.start === 'number' && c.start < t.durationSeconds, `chapter beyond the video: ${t.slug}`);
      if (i) assert(c.start > t.chapters[i - 1].start, `chapters must ascend: ${t.slug}`);
    });
    if (probe) {
      const actual = probeDuration(video);
      assert(Math.abs(actual - t.durationSeconds) <= 0.5, `gallery duration ${t.durationSeconds}s disagrees with the file (${actual}s): ${t.slug}`);
    }
  }
  for (const agent of GALLERY_AGENTS) {
    assert(gallery.tutorials.some(t => t.agent === agent), `gallery is missing the ${agent} tutorial`);
  }
  if (manifest.status === 'ready') {
    for (const tutorial of manifest.tutorials) {
      const entry = gallery.tutorials.find(t => t.slug === tutorial.id);
      assert(entry && entry.status === 'published', `verified tutorial missing from the gallery: ${tutorial.id}`);
      assert.equal(entry.src, `/video/studio-projects/${tutorial.media.video.file}`, `gallery video must be the verified file: ${tutorial.id}`);
      assert.equal(entry.poster, `/video/studio-projects/${tutorial.media.poster.file}`, `gallery poster must be the verified file: ${tutorial.id}`);
      assert.equal(entry.captionsVtt, `/video/studio-projects/${tutorial.media.captions.file}`, `gallery captions must be the verified file: ${tutorial.id}`);
      assert.equal(entry.guide, `/docs/${tutorial.guide.replace(/\.md$/, '')}`, `gallery guide must match the manifest: ${tutorial.id}`);
    }
  } else {
    for (const tutorial of manifest.tutorials) {
      const entry = gallery.tutorials.find(t => t.slug === tutorial.id);
      assert(!entry || entry.status !== 'published', `planned tutorial cannot be published in the gallery: ${tutorial.id}`);
    }
  }
  return gallery.tutorials.length;
}
if (process.argv[1] && resolve(process.argv[1]) === ownPath) {
  const flags = process.argv.slice(2);
  assert(flags.every(f => ['--release', '--built'].includes(f)), 'unknown verifier option');
  const manifest = verifyManifest(defaultRoot, {release: flags.includes('--release')});
  const siteRoot = resolve(defaultRoot, '../../..');
  const count = verifyDocs(siteRoot, manifest, {built: flags.includes('--built')});
  const galleryCount = verifyGallery(siteRoot, manifest);
  console.log(`${count} guide pages verified; tutorial status: ${manifest.status}. ${manifest.status === 'planned' ? 'No rendered or published video claimed.' : 'Media files, provenance and video streams verified.'} ${galleryCount} gallery entries verified.`);
}
