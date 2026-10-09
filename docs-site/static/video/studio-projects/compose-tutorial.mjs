#!/usr/bin/env node
// Prepare an editable, captioned HyperFrames project from an actual private recording.
// This never marks the website manifest ready or publishes anything.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const ownPath = fileURLToPath(import.meta.url);
const titles = {
  'projects-and-threads': 'One project, independent threads',
  'memory-and-usage': 'Shared facts, honest usage',
  'plans-and-routines': 'Plan, verify and schedule',
};
const digest = value => createHash('sha256').update(value).digest('hex');
const html = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export function validateCapture(capture) {
  assert.equal(capture.schemaVersion, 1);
  assert(titles[capture.tutorial], 'unknown tutorial');
  assert.equal(capture.status, 'captured-awaiting-review', 'only a completed capture can be composed');
  for (const key of ['headless', 'actualApplication', 'syntheticDataOnly']) assert.equal(capture[key], true);
  assert.equal(capture.providerTurnsStartedByRecorder, 0);
  assert.equal(capture.version, '0.2.0');
  assert(/^[a-f0-9]{40}$/.test(capture.sourceCommit));
  assert(/^[a-f0-9]{64}$/.test(capture.buildSha256));
  assert(Array.isArray(capture.beats) && capture.beats.length >= 6 && capture.beats.length <= 20);
  let previous = 0;
  for (const beat of capture.beats) {
    assert.equal(beat.verified, true, 'unverified action cannot become a tutorial claim');
    assert(/^[a-z][a-z0-9-]*$/.test(beat.id));
    assert(Number.isFinite(beat.start) && beat.start >= previous && Number.isFinite(beat.end) && beat.end > beat.start);
    assert(typeof beat.caption === 'string' && beat.caption.length <= 240 && !/[<>\r\n]/.test(beat.caption));
    previous = beat.end;
  }
  assert(previous >= 30 && previous <= 180, 'tutorial must stay within the bounded delivery length');
  if (capture.tutorial === 'projects-and-threads') {
    assert.equal(capture.nativeProviders?.claude, 'passed');
    assert.equal(capture.nativeProviders?.codex, 'passed');
    assert(/^[a-f0-9]{64}$/.test(capture.nativeReceiptSha256));
    assert.equal(capture.acceptancePassed, true);
  }
  return previous;
}
export function validateCrop(crop) {
  assert(Array.isArray(crop) && crop.length === 4 && crop.every(Number.isInteger));
  const [x, y, width, height] = crop;
  assert(x >= 255 && y >= 0 && width >= 800 && height >= 600 && x + width <= 1920 && y + height <= 1000,
    'crop must exclude the left host sidebar and bottom composer host label');
  assert(width % 2 === 0 && height % 2 === 0, 'H.264 crop dimensions must be even');
  return crop;
}
export function compositionHtml(capture) {
  const duration = validateCapture(capture).toFixed(3);
  const captions = capture.beats.map((beat, index) => `<p id="caption-${index}" class="clip caption" data-start="${beat.start.toFixed(3)}" data-duration="${(beat.end-beat.start).toFixed(3)}" data-track-index="2">${html(beat.caption)}</p>`).join('\n');
  return `<!doctype html>
<html lang="en" data-resolution="landscape">
<head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080">
<title>${html(titles[capture.tutorial])}</title>
<style>
* { box-sizing: border-box; margin: 0; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: #101f1a; }
#root { width: 100%; height: 100%; color: #ffffff; font-family: Montserrat, sans-serif; display: grid; grid-template-rows: 90px 840px 150px; }
header { display: flex; align-items: center; justify-content: space-between; padding: 0 54px; }
h1 { font-size: 42px; font-weight: 700; letter-spacing: -0.025em; }
.brand { font-size: 20px; font-weight: 400; color: #a9dfc7; }
.screen { margin: 0 42px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f9f9f9; }
video { display: block; width: 100%; height: 100%; object-fit: contain; }
.captions { position: relative; padding: 24px 110px; }
.caption { position: absolute; inset: 22px 110px 24px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 34px; font-weight: 400; line-height: 1.35; }
</style></head>
<body><div id="root" data-composition-id="${capture.tutorial}" data-no-timeline data-duration="${duration}" data-width="1920" data-height="1080">
<header><h1>${html(titles[capture.tutorial])}</h1><p class="brand">SPECWEAVE STUDIO · ACTUAL UI</p></header>
<div class="screen"><video id="recorded-ui" class="clip" src="assets/recording.mp4" playsinline muted data-start="0" data-duration="${duration}" data-track-index="0"></video></div>
<div class="captions">${captions}</div>
</div></body></html>\n`;
}
function readBoundAsset(root, entry, extension) {
  assert(entry && entry.file.endsWith(extension) && /^[a-f0-9]{64}$/.test(entry.sha256));
  assert(!path.isAbsolute(entry.file));
  const target = fs.realpathSync(path.resolve(root, entry.file));
  const relative = path.relative(fs.realpathSync(root), target);
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'capture asset escaped its directory');
  const bytes = fs.readFileSync(target); assert.equal(digest(bytes), entry.sha256, 'capture asset hash changed');
  return {target, bytes};
}
export function compose({captureDir, output, ffmpeg = 'ffmpeg', crop = [256, 0, 1664, 1000]}) {
  const capture = json(path.join(captureDir, 'capture.json'));
  const duration = validateCapture(capture); validateCrop(crop);
  const raw = readBoundAsset(captureDir, capture.video, '.webm');
  const captions = readBoundAsset(captureDir, capture.captions, '.vtt');
  assert(captions.bytes.toString('utf8').startsWith('WEBVTT\n'));
  assert(path.resolve(output).startsWith('/Volumes/'), 'render projects belong on external storage');
  assert(!fs.existsSync(output), 'output must be new');
  fs.mkdirSync(path.join(output, 'assets'), {recursive: true, mode: 0o700}); fs.chmodSync(output, 0o700);
  // A geometric crop removes machine identity; it never recreates or alters application pixels.
  execFileSync(ffmpeg, ['-nostdin', '-v', 'error', '-i', raw.target, '-an', '-t', String(duration), '-vf',
    `crop=${crop[2]}:${crop[3]}:${crop[0]}:${crop[1]}`, '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
    '-r', '30', '-g', '30', '-keyint_min', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(output, 'assets/recording.mp4')], {timeout: 180000});
  fs.writeFileSync(path.join(output, 'index.html'), compositionHtml(capture));
  fs.writeFileSync(path.join(output, 'captions.vtt'), captions.bytes);
  fs.writeFileSync(path.join(output, 'hyperframes.json'), JSON.stringify({
    $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
    paths: {blocks:'compositions', components:'compositions/components', assets:'assets'},
    media: {autoProxy:false}, authoringSkill:'general-video',
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify({
    name: `studio-${capture.tutorial}`, private: true,
    scripts: {check: 'npx hyperframes@0.8.143 check', preview: 'npx hyperframes@0.8.143 preview --no-open',
      render: 'npx hyperframes@0.8.143 render --quality delivery --video-frame-format png'},
  }, null, 2) + '\n');
  const metadata = {schemaVersion:1, tutorial:capture.tutorial, status:'draft-awaiting-review', version:capture.version,
    sourceCommit:capture.sourceCommit, buildSha256:capture.buildSha256, recordedAt:capture.recordedAt,
    actualApplication:true, syntheticDataOnly:true, headless:true, acceptancePassed:capture.acceptancePassed,
    nativeProviders:capture.nativeProviders, nativeReceiptSha256:capture.nativeReceiptSha256 ?? null,
    providerTurnsStartedByRecorder:0,
    privacyReviewed:false, visualReviewPassed:false, captionsReviewed:false,
    crop, captureVideoSha256:capture.video.sha256, captionsSha256:capture.captions.sha256,
    croppedVideoSha256:digest(fs.readFileSync(path.join(output, 'assets/recording.mp4'))),
    duration, rendererVersion:'0.8.143', beatMidpoints:capture.beats.map(beat => Number(((beat.start + beat.end)/2).toFixed(2)))};
  fs.writeFileSync(path.join(output, 'composition.json'), JSON.stringify(metadata, null, 2) + '\n');
  return metadata;
}
if (process.argv[1] && path.resolve(process.argv[1]) === ownPath) {
  const [captureDir, output, ...rest] = process.argv.slice(2);
  assert(captureDir && output && rest.length === 0, 'Usage: compose-tutorial.mjs CAPTURE_DIRECTORY NEW_EXTERNAL_PROJECT');
  const result = compose({captureDir, output});
  console.log(JSON.stringify({status:result.status, tutorial:result.tutorial, duration:result.duration, output}));
}
