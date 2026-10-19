// Add narration (and optionally a music bed) to an existing silent video, and write captions
// that match the spoken words.
//
// Usage: XI_API_KEY=... node video/narration/narrate.mjs <script.json> [--dry]
//
// script.json:
// {
//   "video": "docs-site/static/video/x.mp4",        // silent source, picture is copied untouched
//   "out": "docs-site/static/video/x.mp4",          // may equal video (source is read first)
//   "vtt": "docs-site/static/video/x.vtt",
//   "work": "video/narration/work/x",               // cache: one mp3 + alignment per line
//   "music": { "file": "/abs/bed.wav", "db": -24 }, // optional
//   "lines": [ { "start": 0.3, "end": 4.0, "text": "Caption words.", "say": "optional spoken form" } ]
// }
//
// Each line must fit its window [start, end]. A line up to 15% too long is sped up; longer
// lines fail with the overrun so the script can be shortened. Captions are cut at sentence and
// clause boundaries (at most 2 lines of 42 characters) and timed from ElevenLabs' character
// alignment. The key is read from the environment and never printed or written.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const VOICE = "0Ki1af67ybTaTu4TNmO8"; // "Anton Abyzov best voice"; never the older clones
const MODEL = "eleven_v4";
const SETTINGS = { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true, speed: 1.0 };
const MAX_TEMPO = 1.15;

const [scriptFile, flag] = process.argv.slice(2);
const dry = flag === "--dry";
const cfg = JSON.parse(readFileSync(scriptFile, "utf8"));
const work = resolve(cfg.work);
mkdirSync(work, { recursive: true });
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }).toString();
const probe = (f) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim());

const videoDur = probe(cfg.video);
const key = process.env.XI_API_KEY;

async function tts(line, prev, next) {
  const id = createHash("sha256").update(JSON.stringify([VOICE, MODEL, SETTINGS, line.say ?? line.text])).digest("hex").slice(0, 16);
  const mp3 = `${work}/${id}.mp3`, js = `${work}/${id}.json`;
  if (existsSync(mp3) && existsSync(js)) return { mp3, align: JSON.parse(readFileSync(js, "utf8")) };
  if (dry) return null;
  if (!key) { console.error("XI_API_KEY is not set"); process.exit(2); }
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: line.say ?? line.text, model_id: MODEL, voice_settings: SETTINGS, previous_text: prev, next_text: next }),
    });
    if (res.ok) {
      const body = await res.json();
      writeFileSync(mp3, Buffer.from(body.audio_base64, "base64"));
      const a = body.alignment ?? body.normalized_alignment ?? null;
      writeFileSync(js, JSON.stringify(a));
      return { mp3, align: a };
    }
    const msg = (await res.text()).slice(0, 300);
    if (attempt >= 4 || (res.status < 500 && res.status !== 429)) throw new Error(`TTS ${res.status}: ${msg}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

// Caption chunks: split at sentence ends, then at commas/semicolons/dashes, then by words,
// so each chunk fits two lines of 42 characters.
function chunks(text) {
  const out = [];
  const sentences = text.split(/(?<=[.!?]["”’)]*)\s+/);
  for (const s of sentences.map((x) => x.trim()).filter(Boolean)) {
    if (s.length <= 76) { out.push(s); continue; }
    const parts = s.split(/(?<=[,;:—])\s+/);
    let cur = "";
    for (const p of parts) {
      if (cur && (cur + " " + p).length > 76) { out.push(cur); cur = p; } else cur = cur ? cur + " " + p : p;
    }
    if (cur) out.push(cur);
  }
  // Hard-wrap anything still too long by words.
  return out.flatMap((c) => {
    if (c.length <= 76) return [c];
    const w = c.split(" "), res = [];
    let cur = "";
    for (const x of w) { if (cur && (cur + " " + x).length > 76) { res.push(cur); cur = x; } else cur = cur ? cur + " " + x : x; }
    if (cur) res.push(cur);
    return res;
  });
}
function wrap(c) {
  if (c.length <= 42) return c;
  const w = c.split(" ");
  let best = null;
  for (let i = 1; i < w.length; i++) {
    const a = w.slice(0, i).join(" "), b = w.slice(i).join(" ");
    const score = Math.max(a.length, b.length);
    if (!best || score < best.score) best = { score, s: `${a}\n${b}` };
  }
  return best.s;
}
const ts = (t) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};

const placed = [], cues = [], report = [];
let failed = false;
for (const [i, line] of cfg.lines.entries()) {
  if (!(line.end > line.start)) throw new Error(`line ${i + 1}: end must be after start`);
  if (line.end > videoDur + 0.01) throw new Error(`line ${i + 1}: ends at ${line.end} after the video (${videoDur.toFixed(2)} s)`);
  if (i && line.start < cfg.lines[i - 1].end - 0.001) throw new Error(`line ${i + 1}: overlaps the previous line`);
  const said = (l) => l && (l.say ?? l.text);
  const r = await tts(line, said(cfg.lines[i - 1]), said(cfg.lines[i + 1]));
  if (!r) { report.push(`${i + 1}: not generated (dry run)`); continue; }
  const a = r.align;
  const chars = a?.characters ?? [];
  const st = a?.character_start_times_seconds ?? [], en = a?.character_end_times_seconds ?? [];
  const firstIdx = chars.findIndex((c) => /\S/.test(c));
  let lastIdx = chars.length - 1; while (lastIdx > 0 && !/\S/.test(chars[lastIdx])) lastIdx--;
  const raw = probe(r.mp3);
  const s0 = firstIdx >= 0 ? Math.max(0, st[firstIdx] - 0.04) : 0;
  const e0 = lastIdx >= 0 && en[lastIdx] ? Math.min(raw, en[lastIdx] + 0.12) : raw;
  const speech = e0 - s0, window = line.end - line.start;
  let tempo = 1;
  if (speech > window) tempo = speech / window;
  const fits = tempo <= MAX_TEMPO;
  if (!fits) failed = true;
  report.push(`${String(i + 1).padStart(2)} ${line.start.toFixed(2)}-${line.end.toFixed(2)} window ${window.toFixed(2)} speech ${speech.toFixed(2)} tempo ${tempo.toFixed(3)}${fits ? "" : `  TOO LONG: cut about ${(speech - window * MAX_TEMPO).toFixed(2)} s`}`);
  const wav = `${work}/line-${String(i + 1).padStart(2, "0")}.wav`;
  const atempo = tempo > 1 ? `,atempo=${tempo.toFixed(4)}` : "";
  run("ffmpeg", ["-y", "-v", "error", "-i", r.mp3, "-af", `atrim=start=${s0.toFixed(3)}:end=${e0.toFixed(3)},asetpts=PTS-STARTPTS${atempo},afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, speech / tempo - 0.05).toFixed(3)}:d=0.05`, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", wav]);
  placed.push({ wav, at: line.start });
  // Time each caption chunk from the character alignment.
  const text = line.text;
  const cs = chunks(text);
  let cursor = 0;
  const joined = chars.join("");
  const startOf = (idx) => (st[idx] ?? s0);
  const endOf = (idx) => (en[idx] ?? e0);
  const toVideo = (t) => line.start + (Math.max(t, s0) - s0) / tempo;
  const chunkTimes = cs.map((c) => {
    const pos = chars.length ? joined.indexOf(c.slice(0, Math.min(12, c.length)), cursor) : -1;
    const from = pos >= 0 ? pos : cursor;
    const to = Math.min(chars.length - 1, from + c.length - 1);
    cursor = to + 1;
    return chars.length && !line.say ? { c, t0: toVideo(startOf(from)), t1: toVideo(endOf(to)) } : null;
  });
  if (line.say && chars.length) {
    // Spoken form differs from the caption: map each chunk boundary to the same share of the
    // spoken text, snapped to the nearest word gap, and read its time from the alignment.
    const total = cs.reduce((n, c) => n + c.length + 1, 0);
    const gaps = chars.map((c, k) => (/\s/.test(c) ? k : -1)).filter((k) => k >= 0);
    let acc = 0, prevT = toVideo(startOf(firstIdx));
    cs.forEach((c, k) => {
      acc += c.length + 1;
      let t1;
      if (k === cs.length - 1) t1 = toVideo(endOf(lastIdx));
      else {
        const target = Math.round((acc / total) * chars.length);
        // A chunk that ends a sentence or clause snaps to the same punctuation in the spoken form.
        const kind = /[.!?]$/.test(c) ? /[.!?]/ : /[;:,]$/.test(c) ? /[;:,]/ : null;
        const ends = kind ? gaps.filter((g) => kind.test(chars[g - 1] ?? "")) : [];
        const pool = ends.length ? ends : gaps;
        const gap = pool.reduce((b, g) => (Math.abs(g - target) < Math.abs(b - target) ? g : b), pool[0] ?? target);
        t1 = toVideo(startOf(Math.min(chars.length - 1, gap + 1)));
      }
      cues.push({ t0: prevT, t1, c });
      prevT = t1;
    });
  } else if (chunkTimes.some((x) => !x)) {
    // No alignment: share the spoken time by character count.
    const total = cs.reduce((n, c) => n + c.length, 0);
    let t = line.start;
    cs.forEach((c) => { const d = (speech / tempo) * (c.length / total); cues.push({ t0: t, t1: t + d, c }); t += d; });
  } else chunkTimes.forEach((x) => cues.push(x));
}
console.log(report.join("\n"));
if (dry) process.exit(0);
if (failed) { console.error("Some lines are too long for their window; shorten them and run again."); process.exit(1); }

// Captions: hold each cue until the next one starts (or 1.2 s after speech, whichever is first).
for (let i = 0; i < cues.length; i++) {
  const next = cues[i + 1]?.t0 ?? videoDur;
  cues[i].t1 = Math.min(next, Math.max(cues[i].t1 + 0.6, cues[i].t0 + 1.2), videoDur);
  if (cues[i].t1 - cues[i].t0 < 0.8) cues[i].t1 = Math.min(next, cues[i].t0 + 0.8);
}
const vtt = ["WEBVTT", "", "NOTE Captions match the narration. Times follow the spoken words.", ""];
cues.forEach((q, i) => vtt.push(String(i + 1), `${ts(q.t0)} --> ${ts(q.t1)}`, wrap(q.c), ""));

// Mix: voice lines at their start times, optional music bed ducked under the voice.
const mixWav = `${work}/mix.wav`;
const args = ["-y", "-v", "error"];
placed.forEach((p) => args.push("-i", p.wav));
const filters = placed.map((p, i) => `[${i}:a]adelay=${Math.round(p.at * 1000)}:all=1,apad[v${i}]`);
filters.push(`${placed.map((_, i) => `[v${i}]`).join("")}amix=inputs=${placed.length}:normalize=0:duration=longest,atrim=0:${videoDur.toFixed(3)},aformat=channel_layouts=stereo[voice]`);
let outLabel = "[voice]";
if (cfg.music) {
  args.push("-stream_loop", "-1", "-i", cfg.music.file);
  const m = placed.length;
  const fadeOut = Math.max(0, videoDur - 2.5).toFixed(3);
  filters.push(`[voice]asplit=2[vmix][vkey]`);
  filters.push(`[${m}:a]atrim=0:${videoDur.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume=${cfg.music.db}dB,afade=t=in:d=1.5,afade=t=out:st=${fadeOut}:d=2.5[bed]`);
  filters.push(`[bed][vkey]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=500[ducked]`);
  filters.push(`[vmix][ducked]amix=inputs=2:normalize=0:duration=first[mixed]`);
  outLabel = "[mixed]";
}
args.push("-filter_complex", filters.join(";"), "-map", outLabel, "-ar", "48000", "-c:a", "pcm_s24le", mixWav);
run("ffmpeg", args);

// Two-pass loudness to -16 LUFS / -1.5 dBTP.
const stderrOf = (args) => spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 1 << 28 }).stderr;
const m1 = JSON.parse(stderrOf(["-hide_banner", "-nostats", "-i", mixWav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json", "-f", "null", "-"]).match(/\{[\s\S]*\}/)[0]);
const normWav = `${work}/norm.wav`;
const ln = `loudnorm=I=-16:TP=-1.5:LRA=8:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true`;
run("ffmpeg", ["-y", "-v", "error", "-i", mixWav, "-af", `${ln},aresample=48000`, "-c:a", "pcm_s24le", normWav]);

const out = resolve(cfg.out), tmp = `${out}.tmp.mp4`;
mkdirSync(dirname(out), { recursive: true });
run("ffmpeg", ["-y", "-v", "error", "-i", cfg.video, "-i", normWav, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", videoDur.toFixed(3), "-movflags", "+faststart", tmp]);
renameSync(tmp, out);
writeFileSync(cfg.vtt, vtt.join("\n"));
const er = stderrOf(["-hide_banner", "-nostats", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"]).split("Summary:").pop();
const lufs = (er.match(/I:\s+(-?[\d.]+) LUFS/) ?? [])[1], peak = (er.match(/Peak:\s+(-?[\d.]+) dBFS/) ?? [])[1];
console.log(`wrote ${cfg.out} (${probe(out).toFixed(2)} s, source ${videoDur.toFixed(2)} s) ${lufs} LUFS, true peak ${peak} dBFS`);
console.log(`wrote ${cfg.vtt} (${cues.length} cues)`);
