// Sole-voice tutorial narration. No silent cache reuse or automatic retry.
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

export const VOICE = '0Ki1af67ybTaTu4TNmO8';
export const VOICE_NAME = 'Anton Abyzov best voice';
export const MODEL = 'eleven_v4';
export const sha256 = value => createHash('sha256').update(value).digest('hex');

export function validateConfig(cfg) {
  if (cfg.voiceId !== VOICE) throw new Error('Refusing unapproved narration voice');
  if (cfg.modelId !== MODEL) throw new Error('Refusing unapproved narration model');
  if (cfg.voiceSettings?.speed !== 1) throw new Error('Narration speed must remain 1.0');
  if (!Array.isArray(cfg.lines) || cfg.lines.length === 0) throw new Error('Narration lines are required');
  const ids = new Set();
  for (const line of cfg.lines) {
    if (!/^[a-z0-9-]+$/.test(line.id) || ids.has(line.id)) throw new Error('Invalid or duplicate narration line id');
    if (typeof line.spoken !== 'string' || !line.spoken.trim()) throw new Error('Spoken text is required');
    ids.add(line.id);
  }
  if (cfg.lines.reduce((sum, line) => sum + line.spoken.length, 0) > 10000) throw new Error('Narration exceeds the 10000-character batch bound');
}

export function requestBody(cfg, line) {
  return {text: line.spoken, model_id: cfg.modelId, voice_settings: cfg.voiceSettings};
}

export function validateCache(raw, receiptFile, cfg, line) {
  if (!existsSync(raw)) return false;
  if (!existsSync(receiptFile)) throw new Error(`${line.id}: cached audio has no provenance receipt; use a new output directory`);
  const receipt = JSON.parse(readFileSync(receiptFile, 'utf8'));
  if (receipt.voiceId !== VOICE || receipt.voiceName !== VOICE_NAME || receipt.modelId !== MODEL ||
      receipt.inputSha256 !== sha256(JSON.stringify(requestBody(cfg, line))) ||
      receipt.outputSha256 !== sha256(readFileSync(raw)) || receipt.httpStatus !== 200 ||
      !receipt.requestId || receipt.voicePreflight?.voice_id !== VOICE ||
      receipt.voicePreflight?.name !== VOICE_NAME || receipt.voicePreflight?.category !== 'cloned') {
    throw new Error(`${line.id}: cached audio provenance does not match approved input and voice; use a new output directory`);
  }
  return true;
}

export async function runNarration(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes('--check');
  const [linesFile, outDir, ...only] = argv.filter(arg => arg !== '--check');
  if (!linesFile || !outDir) throw new Error('Usage: vo.mjs <vo-lines.json> <outDir> [line-id ...] [--check]');
  const cfg = JSON.parse(readFileSync(linesFile, 'utf8'));
  validateConfig(cfg);
  const lines = cfg.lines.filter(line => only.length === 0 || only.includes(line.id));
  if (!lines.length || only.some(id => !cfg.lines.some(line => line.id === id))) throw new Error('Unknown narration line id');
  const cached = new Set();
  // Validate every selected cache before any network access or filesystem mutation.
  for (const line of lines) {
    if (validateCache(join(outDir, `${line.id}.raw.mp3`), join(outDir, `${line.id}.receipt.json`), cfg, line)) cached.add(line.id);
    if (existsSync(join(outDir, `${line.id}.pending.json`)) && !cached.has(line.id)) {
      throw new Error(`${line.id}: previous synthesis outcome is unknown; reconcile its pending receipt before retry`);
    }
  }
  if (checkOnly) {
    console.log(JSON.stringify({voiceId: VOICE, modelId: MODEL, cached: cached.size, missing: lines.length - cached.size, networkCalls: 0}));
    return;
  }
  const key = process.env.XI_API_KEY;
  let voice;
  if (cached.size !== lines.length) {
    if (!key) throw new Error('XI_API_KEY is not set');
    const preflight = await fetch(`https://api.elevenlabs.io/v1/voices/${VOICE}`, {headers: {'xi-api-key': key}});
    if (!preflight.ok) throw new Error(`ElevenLabs voice preflight returned HTTP ${preflight.status}`);
    const metadata = await preflight.json();
    if (metadata.voice_id !== VOICE || metadata.name !== VOICE_NAME || metadata.category !== 'cloned') {
      throw new Error('Live voice identity differs from the approved cloned voice');
    }
    voice = {voice_id: metadata.voice_id, name: metadata.name, category: metadata.category, checkedAt: new Date().toISOString()};
  }
  mkdirSync(outDir, {recursive: true});
  for (const line of lines) {
    if (cached.has(line.id)) { console.log('verified cache', line.id); continue; }
    const body = requestBody(cfg, line);
    const pendingFile = join(outDir, `${line.id}.pending.json`);
    const startedAt = new Date().toISOString();
    writeFileSync(pendingFile, JSON.stringify({startedAt, voiceId: VOICE, modelId: MODEL, inputSha256: sha256(JSON.stringify(body))}, null, 2));
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: 'POST', headers: {'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg'}, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${line.id}: synthesis returned HTTP ${res.status}; no retry was attempted`);
    if (!res.headers.get('content-type')?.toLowerCase().includes('audio/')) {
      throw new Error(`${line.id}: synthesis did not return audio; reconcile pending operation`);
    }
    const audio = Buffer.from(await res.arrayBuffer());
    const requestId = res.headers.get('request-id');
    if (!audio.length || !requestId) throw new Error(`${line.id}: synthesis response lacks audio or request id; reconcile pending operation`);
    writeFileSync(join(outDir, `${line.id}.raw.mp3`), audio);
    writeFileSync(join(outDir, `${line.id}.receipt.json`), JSON.stringify({
      startedAt, completedAt: new Date().toISOString(), voiceId: VOICE, voiceName: VOICE_NAME, modelId: MODEL,
      characters: line.spoken.length, inputSha256: sha256(JSON.stringify(body)), outputSha256: sha256(audio),
      httpStatus: res.status, requestId, characterCost: res.headers.get('character-cost'), voicePreflight: voice,
    }, null, 2));
    console.log('generated with receipt', line.id);
  }
  // Natural timing only: trim silence, never time-stretch or pitch-shift narration.
  for (const line of lines) {
    const raw = join(outDir, `${line.id}.raw.mp3`), wav = join(outDir, `${line.id}.wav`);
    const filter = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.15,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.3,areverse';
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', filter, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', wav]);
    const receiptFile=join(outDir, `${line.id}.receipt.json`);
    const receipt=JSON.parse(readFileSync(receiptFile,'utf8'));
    writeFileSync(receiptFile,JSON.stringify({...receipt,derivedOutputSha256:sha256(readFileSync(wav)),derivation:{filter,sampleRate:48000,channels:1,codec:'pcm_s24le',speed:1}},null,2));
    console.log(line.id, 'seconds', execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString().trim());
  }
}
