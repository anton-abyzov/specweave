import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {verifyManifest, verifyDocs} from './verify-tutorials.mjs';
const base = new URL('./manifest.json', import.meta.url);
function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), '0888-tutorial-validation-'));
  try {copyFileSync(base, join(root, 'manifest.json')); fn(root);} finally {rmSync(root, {recursive: true, force: true});}
}
test('planned content validates without pretending to be release-ready', () => fixture(root => {
  assert.equal(verifyManifest(root).status, 'planned');
  assert.throws(() => verifyManifest(root, {release: true}), /not release-ready/);
}));
test('ready status requires real hashed media, not a missing recording', () => fixture(root => {
  const m = JSON.parse(readFileSync(join(root, 'manifest.json'))); m.status = 'ready';
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(m));
  assert.throws(() => verifyManifest(root, {release: true}), /asset needs SHA256/);
}));
test('planned tutorials cannot advertise fabricated output', () => fixture(root => {
  const m = JSON.parse(readFileSync(join(root, 'manifest.json')));
  m.tutorials[0].media = {video: {file: 'does-not-exist.mp4'}};
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(m));
  assert.throws(() => verifyManifest(root), /must not imply finished/);
}));
function readyFixture(root) {
  const m = JSON.parse(readFileSync(base));
  const save = (file, content) => {
    writeFileSync(join(root, file), content);
    return {file, sha256: createHash('sha256').update(content).digest('hex')};
  };
  m.status = 'ready';
  for (const t of m.tutorials) {
    const video = save(`${t.id}.mp4`, 'synthetic contract fixture, not a video');
    t.media = {video, poster: save(`${t.id}.jpg`, 'synthetic poster'),
      captions: save(`${t.id}.vtt`, 'WEBVTT\n\n00:00.000 --> 00:01.000\nFixture\n'),
      receipt: save(`${t.id}.json`, JSON.stringify({syntheticDataOnly: true, headless: true,
        actualApplication: true, acceptancePassed: true, privacyReviewed: true, version: '0.2.0',
        sourceCommit: 'a'.repeat(40), buildSha256:'b'.repeat(64), providerTurnsStartedByRecorder:0,
        nativeReceiptSha256:'c'.repeat(64), recordedAt: '2026-10-09T00:00:00Z',
        videoSha256: video.sha256, visualReviewPassed: true, captionsReviewed: true,
        personalEnvironmentProof:{managedStorage:true, noGit:true, repositoryMatch:'passed', connectionDiscovery:'owned-inert-mcp', externalAccountAuthentication:'not_tested', toolInvocation:'not_requested'},
        nativeProviders: {claude: 'passed', codex: 'passed'}}))};
  }
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(m));
  return m;
}
test('contract-valid receipts do not bypass real video probing', () => fixture(root => {
  readyFixture(root);
  assert.equal(verifyManifest(root, {release: true, probe: false}).status, 'ready');
  assert.throws(() => verifyManifest(root, {release: true}), /ffprobe/);
}));
test('mixed-provider proof cannot be bypassed by changing manifest metadata', () => fixture(root => {
  const m = readyFixture(root); m.tutorials[0].requiresNativeProof = false;
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(m));
  assert.throws(() => verifyManifest(root, {release:true, probe:false}), /cannot be disabled/);
}));
test('different runtime sources and builds cannot be combined into one release tutorial series', () => fixture(root => {
  for (const patch of [{sourceCommit:'d'.repeat(40)}, {buildSha256:'e'.repeat(64)}, {providerTurnsStartedByRecorder:1}]) {
    const m = readyFixture(root), entry = m.tutorials[1].media.receipt;
    const content = JSON.stringify({...JSON.parse(readFileSync(join(root, entry.file))), ...patch});
    writeFileSync(join(root, entry.file), content); entry.sha256 = createHash('sha256').update(content).digest('hex');
    writeFileSync(join(root, 'manifest.json'), JSON.stringify(m));
    assert.throws(() => verifyManifest(root, {release:true, probe:false}), /same release source|same accepted build|must not start inference/);
  }
}));
test('rejects changed assets and symlink escape even if metadata claims readiness', () => fixture(root => {
  const m = readyFixture(root), video = m.tutorials[0].media.video;
  writeFileSync(join(root, video.file), 'changed');
  assert.throws(() => verifyManifest(root, {release: true, probe: false}), /hash mismatch/);
  rmSync(join(root, video.file));
  symlinkSync(new URL('./manifest.json', import.meta.url), join(root, video.file));
  assert.throws(() => verifyManifest(root, {release: true, probe: false}), /escapes media/);
}));
test('unknown native acceptance cannot satisfy the mixed-provider demonstration', () => fixture(root => {
  const m = readyFixture(root), entry = m.tutorials[0].media.receipt;
  const receipt = JSON.parse(readFileSync(join(root, entry.file)));
  receipt.nativeProviders.codex = 'not_requested';
  const data = JSON.stringify(receipt); writeFileSync(join(root, entry.file), data);
  entry.sha256 = createHash('sha256').update(data).digest('hex');
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(m));
  assert.throws(() => verifyManifest(root, {release: true, probe: false}), /Codex execution proof/);
}));

test('Personal walkthrough is required and shares exact source and build with the native cohort', () => fixture(root => {
  let m = readyFixture(root); m.tutorials = m.tutorials.filter(t => t.id !== 'personal-and-connections');
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(m));
  assert.throws(() => verifyManifest(root, {release:true, probe:false}));
  for (const patch of [{sourceCommit:'d'.repeat(40)}, {buildSha256:'e'.repeat(64)}, {personalEnvironmentProof:{externalAccountAuthentication:'passed'}}]) {
    m = readyFixture(root);
    const entry = m.tutorials.find(t => t.id === 'personal-and-connections').media.receipt;
    const data = JSON.stringify({...JSON.parse(readFileSync(join(root, entry.file))), ...patch});
    writeFileSync(join(root, entry.file), data); entry.sha256=createHash('sha256').update(data).digest('hex');
    writeFileSync(join(root,'manifest.json'), JSON.stringify(m));
    assert.throws(() => verifyManifest(root, {release:true,probe:false}), /same release source|same accepted build|owned discovery/);
  }
}));

test('a shared guide must embed both the native and Personal tutorials with captions', () => fixture(root => {
  const m = readyFixture(root), pages = [...new Set([...m.tutorials.map(t => t.guide), 'guides/claude-code-projects.md'])];
  for (const page of pages) {
    const file = join(root, 'docs', page); mkdirSync(dirname(file), {recursive:true});
    const videos = m.tutorials.filter(t => t.guide === page && t.id !== 'personal-and-connections').map(t => `<video src="${t.media.video.file}"><track src="${t.media.captions.file}"/></video>`).join('\n');
    writeFileSync(file, `---\ntitle: ${page}\ndescription: Fixture metadata\n---\n# Guide\n${videos}\n`);
  }
  writeFileSync(join(root,'sidebars.ts'), pages.map(page => `id: '${page.replace(/\.md$/, '')}'`).join('\n'));
  assert.throws(() => verifyDocs(root,m), /verified video not embedded/);
  const t = m.tutorials.find(t => t.id === 'personal-and-connections'), file=join(root,'docs',t.guide);
  writeFileSync(file, readFileSync(file,'utf8')+`<video src="${t.media.video.file}"><track src="${t.media.captions.file}"/></video>\n`);
  assert.equal(verifyDocs(root,m),4);
}));
