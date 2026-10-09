import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCapture, validateCrop, compositionHtml} from './compose-tutorial.mjs';
const capture = () => ({schemaVersion:1, tutorial:'memory-and-usage', status:'captured-awaiting-review',
  headless:true, actualApplication:true, syntheticDataOnly:true, providerTurnsStartedByRecorder:0,
  version:'0.2.0', sourceCommit:'a'.repeat(40), buildSha256:'b'.repeat(64),
  beats:Array.from({length:6}, (_, i) => ({id:`beat-${i}`, start:i*7, end:(i+1)*7, verified:true, caption:'Review actual application evidence.'}))});
test('failed, invented, unordered, unverified and overlong captures cannot become compositions', () => {
  assert.equal(validateCapture(capture()), 42);
  for (const patch of [{status:'failed'}, {headless:false}, {actualApplication:false}, {syntheticDataOnly:false}, {providerTurnsStartedByRecorder:1}]) {
    assert.throws(() => validateCapture({...capture(), ...patch}));
  }
  for (const patch of [{verified:false}, {start:0}, {end:181}, {caption:'<script>fabricate</script>'}]) {
    const c = capture(); Object.assign(c.beats[3], patch); assert.throws(() => validateCapture(c));
  }
});
test('mixed-provider composition requires actual accepted provider proof', () => {
  const c = {...capture(), tutorial:'projects-and-threads'};
  assert.throws(() => validateCapture(c));
  assert.equal(validateCapture({...c, acceptancePassed:true, nativeProviders:{claude:'passed', codex:'passed'}}), 42);
});
test('privacy crop excludes sidebar and composer host identities', () => {
  validateCrop([256, 0, 1664, 1000]);
  for (const crop of [[0,0,1920,1080], [256,0,1664,1080], [255,0,1665,1000], [256,-5,1664,1000], [256,0,500,1000]]) assert.throws(() => validateCrop(crop));
});
test('composition uses actual frozen footage and complete timed captions without generated application UI', () => {
  const output = compositionHtml(capture());
  assert.equal((output.match(/<video /g) ?? []).length, 1);
  assert.equal((output.match(/class="clip caption"/g) ?? []).length, 6);
  assert.match(output, /data-duration="42.000"/);
  assert.match(output, /src="assets\/recording.mp4"/);
  assert(!/Date\.now|Math\.random|<iframe|fetch\(|\.play\(|currentTime/.test(output));
});
