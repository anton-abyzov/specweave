import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, copyFileSync, writeFileSync, readFileSync, rmSync, symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyManifest} from './verify-tutorials.mjs';
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
  const m = JSON.parse(readFileSync(join(root, 'manifest.json')));
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
        sourceCommit: 'a'.repeat(40), recordedAt: '2026-10-09T00:00:00Z',
        videoSha256: video.sha256, visualReviewPassed: true, captionsReviewed: true,
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
