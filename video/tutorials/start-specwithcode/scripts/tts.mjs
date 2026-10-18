// Narration with caption timings from ElevenLabs /with-timestamps.
// Usage: XI_API_KEY=... node tts.mjs <vo-lines.json> <outDir> <timingDir> [id ...]
// One request per line, voice and model from vo-lines.json only; any error stops the run (no fallback).
// Each line is generated once: <outDir>/<id>.raw.mp3 plus <outDir>/<id>.alignment.json are kept, delete both to redo.
// Then each line is trimmed to 0.15 s before the first character and 0.3 s after the last, written as 48 kHz
// mono 24-bit WAV, and <timingDir>/<id>.json gets the caption chunks with times relative to the trimmed WAV.
// The key is read from the environment and never printed or written.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [linesFile, outDir, timingDir, ...only] = process.argv.slice(2);
const cfg = JSON.parse(readFileSync(linesFile, "utf8"));
if (cfg.voiceId !== "0Ki1af67ybTaTu4TNmO8" || cfg.modelId !== "eleven_v4") { console.error("voice or model is not the approved one"); process.exit(2); }
mkdirSync(outDir, { recursive: true });
mkdirSync(timingDir, { recursive: true });
const HEAD = 0.15, TAIL = 0.3;

for (const line of cfg.lines) {
  if (only.length && !only.includes(line.id)) continue;
  const spoken = line.chunks.map((c) => c[1]).join("");
  const raw = `${outDir}/${line.id}.raw.mp3`, alignFile = `${outDir}/${line.id}.alignment.json`;
  if (!existsSync(raw) || !existsSync(alignFile)) {
    const key = process.env.XI_API_KEY;
    if (!key) { console.error("XI_API_KEY is not set"); process.exit(2); }
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: spoken, model_id: cfg.modelId, voice_settings: cfg.voiceSettings }),
    });
    if (!res.ok) { console.error(line.id, res.status, (await res.text()).slice(0, 300)); process.exit(1); }
    const body = await res.json();
    if (!body.audio_base64 || !body.alignment) { console.error(line.id, "response has no audio or alignment"); process.exit(1); }
    writeFileSync(raw, Buffer.from(body.audio_base64, "base64"));
    writeFileSync(alignFile, JSON.stringify(body.alignment));
    console.log("made", line.id, spoken.length, "chars");
  } else console.log("keep", line.id);

  const al = JSON.parse(readFileSync(alignFile, "utf8"));
  if (al.characters.join("") !== spoken) { console.error(line.id, "alignment text differs from the input"); process.exit(1); }
  const starts = al.character_start_times_seconds, ends = al.character_end_times_seconds;
  const firstIdx = spoken.search(/\S/), lastIdx = spoken.length - 1 - [...spoken].reverse().join("").search(/\S/);
  const t0 = Math.max(0, starts[firstIdx] - HEAD);
  const t1 = ends[lastIdx] + TAIL;
  const wav = `${outDir}/${line.id}.wav`;
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", `atrim=start=${t0.toFixed(3)}:end=${t1.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,areverse,afade=t=in:d=0.05,areverse`, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", wav]);
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString().trim());
  let i = 0;
  const cues = line.chunks.map(([text, sp]) => {
    const a = i + sp.search(/\S/), b = i + sp.length - 1 - [...sp].reverse().join("").search(/\S/);
    i += sp.length;
    return { text, start: +Math.max(0, starts[a] - t0).toFixed(3), end: +Math.min(dur, ends[b] - t0).toFixed(3) };
  });
  // Word times (spoken form) for anchoring on-screen events to a word: [chunk index, word, start, end].
  const words = [];
  let base = 0;
  line.chunks.forEach(([, sp], ci) => {
    for (const m of sp.matchAll(/\S+/g)) {
      const a = base + m.index, b = a + m[0].length - 1;
      words.push([ci, m[0].toLowerCase().replace(/[^a-z0-9%-]/g, ""), +Math.max(0, starts[a] - t0).toFixed(3), +Math.min(dur, ends[b] - t0).toFixed(3)]);
    }
    base += sp.length;
  });
  writeFileSync(`${timingDir}/${line.id}.json`, JSON.stringify({ id: line.id, duration: +dur.toFixed(3), cues, words }) + "\n");
  console.log(line.id, "seconds", dur.toFixed(2));
}
