// Mixes the sound-effect cues from hyperframes/sfx.json under a render's audio.
// Usage: node sfx.mjs <render.mp4> <sfxDir with pop/whoosh/click/tick/thud .wav> <out.mp4> [gain]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const [inp, dir, out, g = "0.45"] = process.argv.slice(2);
const cues = JSON.parse(readFileSync(new URL("../hyperframes/sfx.json", import.meta.url), "utf8"));
const kinds = [...new Set(cues.map((c) => c.kind))];
const args = ["-v", "error", "-y", "-i", inp, ...kinds.flatMap((k) => ["-i", `${dir}/${k}.wav`])];
const parts = []; const labels = [];
const split = kinds.map((k, i) => { const n = cues.filter((c) => c.kind === k).length; return `[${i + 1}:a]asplit=${n}${Array.from({ length: n }, (_, j) => `[${k}${j}]`).join("")}`; });
const used = Object.fromEntries(kinds.map((k) => [k, 0]));
cues.forEach((c, i) => { const j = used[c.kind]++; parts.push(`[${c.kind}${j}]adelay=${Math.round(c.t * 1000)}:all=1,volume=${(c.gain * g).toFixed(3)}[s${i}]`); labels.push(`[s${i}]`); });
const fc = [...split, ...parts, `${labels.join("")}amix=inputs=${labels.length}:normalize=0[fx]`, `[0:a][fx]amix=inputs=2:normalize=0:duration=first[a]`].join(";");
execFileSync("ffmpeg", [...args, "-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "pcm_s24le", out.replace(/\.mp4$/, ".mov")]);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out.replace(/\.mp4$/, ".mov"), "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", out]);
console.log("mixed", cues.length, "cues");
