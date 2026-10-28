import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {MODEL, VOICE, VOICE_NAME, requestBody, sha256, validateCache, validateConfig} from './narration.mjs';

const config = () => ({voiceId: VOICE, modelId: MODEL, voiceSettings: {speed: 1}, lines: [{id: '01-intro', spoken: 'One clear task.'}]});

test('rejects another voice, another model and speed changes before generation', () => {
  for (const change of [{voiceId: 'old-voice'}, {modelId: 'fallback-model'}, {voiceSettings: {speed: 1.1}}]) {
    assert.throws(() => validateConfig({...config(), ...change}));
  }
});

test('rejects legacy audio, changed spoken text and changed audio bytes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'narration-cache-'));
  try {
    const raw = join(dir, '01-intro.raw.mp3'), receipt = join(dir, '01-intro.receipt.json');
    const cfg = config(), line = cfg.lines[0];
    writeFileSync(raw, 'fixture-audio');
    assert.throws(() => validateCache(raw, receipt, cfg, line), /no provenance receipt/);
    const record = {voiceId: VOICE, voiceName: VOICE_NAME, modelId: MODEL, inputSha256: sha256(JSON.stringify(requestBody(cfg, line))), outputSha256: sha256('fixture-audio'), httpStatus: 200, requestId: 'test-only-request', voicePreflight: {voice_id: VOICE, name: VOICE_NAME, category: 'cloned'}};
    writeFileSync(receipt, JSON.stringify(record));
    assert.equal(validateCache(raw, receipt, cfg, line), true);
    assert.throws(() => validateCache(raw, receipt, cfg, {...line, spoken: 'A different script.'}), /does not match/);
    writeFileSync(raw, 'changed-audio');
    assert.throws(() => validateCache(raw, receipt, cfg, line), /does not match/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('command preflight refuses stale audio without credentials or network access', () => {
  const dir = mkdtempSync(join(tmpdir(), 'narration-cli-'));
  try {
    const cfg = config(), file = join(dir, 'config.json');
    writeFileSync(file, JSON.stringify(cfg));
    writeFileSync(join(dir, '01-intro.raw.mp3'), 'unverified');
    const wrapper = new URL('../claude-code/scripts/vo.mjs', import.meta.url);
    const result = spawnSync(process.execPath, [wrapper.pathname, file, dir, '--check'], {encoding: 'utf8', env: {PATH: process.env.PATH}});
    assert.equal(result.status, 2);
    assert.match(result.stderr, /cached audio has no provenance receipt/);
    assert.doesNotMatch(result.stderr, /XI_API_KEY/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('command check reports missing audio without attempting synthesis', () => {
  const dir = mkdtempSync(join(tmpdir(), 'narration-offline-'));
  try {
    const file = join(dir, 'config.json');
    writeFileSync(file, JSON.stringify(config()));
    const wrapper = new URL('../claude-code/scripts/vo.mjs', import.meta.url);
    const result = spawnSync(process.execPath, [wrapper.pathname, file, dir, '--check'], {encoding: 'utf8', env: {PATH: process.env.PATH}});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).networkCalls, 0);
    assert.equal(JSON.parse(result.stdout).missing, 1);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
