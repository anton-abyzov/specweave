// Generate one narration file per beat with ElevenLabs.
// Usage: XI_API_KEY=... node vo.mjs <vo-lines.json> <outDir> [id ...]
// Existing files are kept: each line is generated once; delete a file to redo it.
// The key is read from the environment and never printed or written.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const [linesFile, outDir, ...only] = process.argv.slice(2);
const key = process.env.XI_API_KEY;
if (!key) { console.error("XI_API_KEY is not set"); process.exit(2); }
const cfg = JSON.parse(readFileSync(linesFile, "utf8"));
mkdirSync(outDir, { recursive: true });
for (const line of cfg.lines) {
  if (only.length && !only.includes(line.id)) continue;
  const raw = `${outDir}/${line.id}.raw.mp3`;
  if (existsSync(raw)) { console.log("keep", line.id); continue; }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: line.spoken, model_id: cfg.modelId, voice_settings: cfg.voiceSettings }),
  });
  if (!res.ok) { console.error(line.id, res.status, (await res.text()).slice(0, 300)); process.exit(1); }
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  console.log("made", line.id, res.headers.get("character-cost") ?? "");
}
// Trim to 0.15 s head and 0.3 s tail, convert to 48 kHz mono 24-bit WAV.
for (const line of cfg.lines) {
  const raw = `${outDir}/${line.id}.raw.mp3`, wav = `${outDir}/${line.id}.wav`;
  if (!existsSync(raw)) continue;
  const f = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.15,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.3,areverse";
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", f, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", wav]);
  const d = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString().trim();
  console.log(line.id, "seconds", Number(d).toFixed(2));
}
