// Build one HyperFrames composition (main 16:9 or short 9:16) from edit.json,
// the diagram modules, the VO word timings and vo-lines.json. Writes
// <cut dir>/index.html and <cut dir>/captions.en.vtt.
//
// Usage: node scripts/assemble.mjs main|short
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cutName = process.argv[2] ?? "main";
const edit = JSON.parse(readFileSync(join(ROOT, "edit.json"), "utf8"))[cutName];
const lines = Object.fromEntries(JSON.parse(readFileSync(join(ROOT, "scripts/vo-lines.json"), "utf8")).lines.map((l) => [l.id, l]));
const OUT = join(ROOT, edit.dir);
const { W, H } = edit;
const FPS = 30;
const snap = (t) => Math.round(t * FPS) / FPS;
const r3 = (t) => Number(t.toFixed(3));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const probe = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(OUT, f)]).toString().trim());

// ---- beats ---------------------------------------------------------------------
let t = 0;
const beats = edit.beats.map((b) => { const x = { ...b, start: snap(t), dur: snap(b.dur) }; t += x.dur; return x; });
const total = snap(t);

// ---- captions: chunk the written line, align chunks to Whisper's words ------------
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
function align(a, b) {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const map = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m;) { if (a[i] === b[j]) { map[i] = j; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  return map;
}
function chunk(text, max) {
  const words = text.split(/\s+/), out = [];
  let cur = [];
  words.forEach((w, i) => {
    cur.push(w);
    const left = words.length - i - 1;
    if ((/[.,:;!?]$/.test(w) && cur.length >= 3 && left >= 2) || cur.length >= max) { out.push(cur.join(" ")); cur = []; }
  });
  if (cur.length) { if (cur.length < 2 && out.length) out[out.length - 1] += " " + cur.join(" "); else out.push(cur.join(" ")); }
  return out;
}
const cues = [];
for (const b of beats) {
  if (!b.vo) continue;
  const ws = JSON.parse(readFileSync(join(ROOT, "vo-words", `${b.vo}.json`), "utf8")).words;
  const spoken = ws.flatMap((w) => norm(w.word).map((tok) => ({ tok, s: w.start, e: w.end })));
  const voStart = b.start + (b.voAt ?? edit.voOffset);
  const parts = chunk(lines[b.vo].text, edit.captionWords);
  const written = parts.flatMap((p, ci) => norm(p).map((tok) => ({ tok, ci })));
  const map = align(written.map((x) => x.tok), spoken.map((x) => x.tok));
  const last = spoken[spoken.length - 1].e;
  parts.forEach((p, ci) => {
    const idx = written.map((w, i) => (w.ci === ci ? i : -1)).filter((i) => i >= 0);
    const hits = idx.map((i) => map[i]).filter((j) => j >= 0);
    const frac = idx[0] / written.length;
    const s = ci === 0 ? 0 : hits.length ? spoken[hits[0]].s : frac * last;
    cues.push({ beat: b, text: p, start: voStart + s, end: 0 });
  });
  const mine = cues.filter((c) => c.beat === b);
  mine.forEach((c, i) => { c.end = i < mine.length - 1 ? mine[i + 1].start : Math.min(b.start + b.dur, voStart + last + 0.4); });
}
cues.forEach((c) => { c.start = snap(c.start); c.end = snap(c.end); });
cues.forEach((c, i) => { const nx = cues[i + 1]; c.end = snap(Math.max(c.end, c.start + 0.8)); if (nx && c.end > nx.start) nx.start = c.end; });

const ts = (s) => { const ms = Math.round(s * 1000); const p = (n, l = 2) => String(n).padStart(l, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))}.${p(ms % 1000, 3)}`; };
writeFileSync(join(OUT, "captions.en.vtt"), ["WEBVTT", "", ...cues.flatMap((c, i) => [String(i + 1), `${ts(c.start)} --> ${ts(c.end)}`, c.text, ""])].join("\n"));

// ---- layers ----------------------------------------------------------------------
const html = [], css = [], tweens = [];
let n = 0;
const box = ({ cx, cy, scale }) => {
  const x = Math.min(Math.max(cx, W / 2 / scale), 1920 - W / 2 / scale), y = Math.min(Math.max(cy, H / 2 / scale), 1080 - H / 2 / scale);
  return { l: W / 2 - x * scale, t: H / 2 - y * scale, w: 1920 * scale, h: 1080 * scale };
};
const frame = (crop) => {
  if (!crop) return "left:0;top:0;width:100%;height:100%;object-fit:cover";
  const b = box(crop);
  return `left:${r3(b.l)}px;top:${r3(b.t)}px;width:${r3(b.w)}px;height:${r3(b.h)}px;transform-origin:0 0`;
};
const fadeIn = (sel, at, d = 0.25) => tweens.push(`tl.fromTo("${sel}", { opacity: 0 }, { opacity: 1, duration: ${d}, ease: "none" }, ${r3(at)});`);
const diagrams = {};
for (const b of beats) {
  let lastEnd = b.start;
  for (const L of b.layers) {
    const at = snap(b.start + (L.at ?? 0));
    const end = L.dur ? snap(at + L.dur) : b.start + b.dur;
    if (L.type === "video") {
      let cur = at;
      L.segments.forEach(([ss, se, rate = 1], i) => {
        const isLast = i === L.segments.length - 1;
        const d = isLast ? snap(end - cur) : snap((se - ss) / rate);
        const id = `v${++n}`;
        html.push(`<video id="${id}" class="clip media" src="${L.src}" muted playsinline data-start="${r3(cur)}" data-duration="${r3(d)}" data-media-start="${r3(ss)}" data-playback-rate="${rate}" data-track-index="0" style="${frame(L.crop ?? (L.zoom ? { cx: 960, cy: 540, scale: W / 1920 } : null))}"></video>`);
        if (L.zoom && i === L.segments.length - 1) {
          const z = L.zoom, from = box(L.crop ?? { cx: 960, cy: 540, scale: W / 1920 }), to = box(z);
          tweens.push(`tl.to("#${id}", { x: ${r3(to.l - from.l)}, y: ${r3(to.t - from.t)}, scale: ${r3(to.w / from.w)}, duration: ${z.dur ?? 1.2}, ease: "power2.inOut" }, ${r3(cur + (z.at ?? 0.5))});`);
        }
        if (rate > 1.05) html.push(`<div class="clip chip sped" data-start="${r3(cur)}" data-duration="${r3(d)}" data-track-index="3">Sped up ${Math.round(rate)}×</div>`);
        if (i === 0 && L.fade !== false && cur > 0) fadeIn(`#${id}`, cur, 0.2);
        cur = snap(cur + d);
      });
    } else if (L.type === "diagram") {
      diagrams[L.mod] ??= await import(join(ROOT, "diagrams", `${L.mod}.mjs`));
      const r = diagrams[L.mod].build({ variant: L.variant, start: at, duration: r3(end - at) });
      html.push(r.html); css.push(r.css); tweens.push(r.js);
      fadeIn(`#${L.mod}-${L.variant}`, at, 0.2);
      if (L.scale ?? edit.diagramScale) css.push(`#${L.mod}-${L.variant} { transform: scale(${L.scale ?? edit.diagramScale}); transform-origin: 50% ${L.origin ?? "0%"}; }`);
    } else if (L.type === "outro") {
      html.push(`<section id="outro" class="clip outro" data-start="${at}" data-duration="${r3(end - at)}" data-track-index="2">
  <div class="outro-card"><div class="eyebrow rise">FREE · NO ACCOUNT · APPLE SILICON MACS</div><div class="outro-title rise">SpecWithCode</div><div class="thread" id="outro-thread"></div><div class="outro-sub rise">One coordinator for the coding agents you already pay for.</div><div class="outro-url rise">spec-weave.com/studio</div></div></section>`);
      tweens.push(`tl.fromTo("#outro .outro-card", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${r3(at + 0.2)});`);
      tweens.push(`tl.fromTo("#outro .rise", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.1, ease: "power2.out" }, ${r3(at + 0.4)});`);
      tweens.push(`tl.fromTo("#outro-thread", { width: 0 }, { width: ${W > H ? 560 : 520}, duration: 0.6, ease: "power2.out" }, ${r3(at + 0.6)});`);
    }
    lastEnd = Math.max(lastEnd, end);
  }
  if (b.chip) {
    html.push(`<div class="clip chip step" data-start="${r3(b.start)}" data-duration="${r3(b.dur)}" data-track-index="4"><span class="chip-inner" id="chip-${b.id}">${esc(b.chip).replace(/→/g, '<span class="arrow">→</span>')}</span></div>`);
    tweens.push(`tl.fromTo("#chip-${b.id}", { y: 4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: "power2.out" }, ${r3(b.start + 0.2)});`);
  }
  if (b.vo) html.push(`<audio id="vo-${b.id}" src="media/vo/${b.vo}.wav" data-start="${r3(b.start + (b.voAt ?? edit.voOffset))}" data-duration="${r3(probe(`media/vo/${b.vo}.wav`))}" data-track-index="6" data-volume="1"></audio>`);
}
cues.forEach((c, i) => html.push(`<div class="clip caption" data-start="${r3(c.start)}" data-duration="${r3(c.end - c.start)}" data-track-index="5"><span class="pill">${esc(c.text)}</span></div>`));

const V = H > W;
const doc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(edit.title)}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "IBM Plex Sans"; font-style: normal; font-weight: 100 700; src: url(assets/fonts/ibm-plex-sans-latin.woff2) format("woff2"); }
      @font-face { font-family: "Newsreader"; font-style: normal; font-weight: 200 800; src: url(assets/fonts/newsreader-latin.woff2) format("woff2"); }
      @font-face { font-family: "Newsreader"; font-style: italic; font-weight: 200 800; src: url(assets/fonts/newsreader-italic-latin.woff2) format("woff2"); }
      :root { --paper: #f6f4ee; --ink: #252820; --muted: #65695e; --line: #d9dcd0; --soft: #eff2e8; --cream: #fffdf7; --accent: #bd481f;
        --sans: "IBM Plex Sans", sans-serif; --display: "Newsreader", serif; }
      body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--sans); }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--paper); }
      .clip { position: absolute; }
      .media { object-fit: cover; }
      .chip { top: ${V ? 120 : 48}px; z-index: 10; }
      .chip.step { left: ${V ? 60 : 48}px; right: ${V ? 60 : "auto"}; }
      .chip-inner, .chip.sped { display: inline-block; background: rgba(255, 253, 247, 0.94); border: 1px solid var(--line); border-radius: 4px;
        padding: 10px 18px; font: 500 ${V ? 30 : 26}px/1.3 var(--sans); color: var(--ink); box-shadow: 0 18px 50px #2528200d; white-space: nowrap; }
      .chip.sped { right: ${V ? 60 : 48}px; ${V ? "top: 190px;" : ""} font-size: 22px; color: var(--muted); }
      .chip .arrow { color: var(--accent); }
      .caption { left: 0; right: 0; bottom: ${V ? 300 : 64}px; z-index: 20; text-align: center; }
      .caption .pill { display: inline-block; max-width: ${V ? 900 : 1000}px; text-wrap: balance; background: rgba(37, 40, 32, 0.9); color: #f6f4ee;
        padding: ${V ? "16px 28px" : "12px 24px"}; border-radius: 6px; font: 600 ${V ? 52 : 40}px/1.3 var(--sans); }
      .outro { inset: 0; display: flex; align-items: center; justify-content: center; }
      .outro-card { background: rgba(255, 253, 247, 0.95); border: 1px solid var(--line); border-radius: 8px; padding: ${V ? "72px 64px" : "72px 96px"};
        width: ${V ? 820 : 1000}px; box-sizing: border-box; box-shadow: 0 30px 80px #25282024; }
      .eyebrow { font: 500 ${V ? 24 : 22}px/1.3 var(--sans); letter-spacing: 0.12em; color: var(--muted); }
      .outro-title { margin-top: 28px; font: italic 400 ${V ? 112 : 120}px/1 var(--display); color: var(--ink); }
      .thread { height: 4px; width: 0; background: var(--accent); margin-top: 28px; }
      .outro-sub { margin-top: 32px; font: 400 ${V ? 38 : 34}px/1.35 var(--sans); color: var(--ink); }
      .outro-url { margin-top: 28px; font: 600 ${V ? 44 : 40}px/1.2 var(--sans); color: var(--accent); }
${css.join("\n")}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="${W}" data-height="${H}" data-duration="${total}">
${html.join("\n")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${tweens.join("\n      ")}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeFileSync(join(OUT, "index.html"), doc);
console.log(JSON.stringify({ total, beats: beats.map((b) => [b.id, b.start, b.dur]), cues: cues.length }));
