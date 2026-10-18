// Build the HyperFrames composition and caption files for an app tutorial (SpecWithCode footage, Weave look).
// Usage: node build-composition.mjs <episodeDir> <outDir> [slug]
// Reads <episodeDir>/edit.json, vo-timing/*.json (ElevenLabs character timings) and the VO WAVs in
// hyperframes/assets/media (for the pause snap). Writes <episodeDir>/hyperframes/index.html,
// <outDir>/<slug>.en.vtt, <slug>.chapters.vtt and timeline.json.
//
// Layout (the handoff-claude-to-codex Weave look): footage sits inside a framed window with margins, never full
// bleed. The step chip and the speed badge sit above the window, a "Known issue" note below it, captions below
// that, so no overlay covers app UI.
// - An app beat is a list of shots. Each shot has an `aspect` (crop width / height; default 16:9), `segments`
//   [srcStart, srcEnd, rate] in take.mp4 and camera keyframes {src, x, y, w} (h = w / aspect, eased over 0.6 s).
//   The window is the largest box of that aspect inside 1280x720, centred under the chip row.
// - `fit` on the beat's last segment sets its rate so the beat is filled (refused below `minRate`, default 0.75).
// - A speed badge shows for one segment at a time, only where the rate is 1.5x or more; the label is the
//   segment's own rate, or "Slowed to N×" below 0.75x (allowed only down to `minRate`). Segments between 0.75x and
//   1.15x carry no badge; 1.15x–1.5x is refused as a hidden speed-up.
// - `chip` on a shot sets the step label from that shot's first frame (or from `chipAt`, a source time).
// - `note` on a shot ({text, from?, to?} in source seconds) shows a known-issue line under the window.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, resolve } from "node:path";

const [ep, outDir, slugArg] = process.argv.slice(2);
if (!ep || !outDir) { console.error("usage: build-composition.mjs <episodeDir> <outDir> [slug]"); process.exit(2); }
const SLUG = slugArg ?? basename(resolve(ep));
const edit = JSON.parse(readFileSync(`${ep}/edit.json`, "utf8"));
const vo = Object.fromEntries(edit.beats.map((b) => [b.id, JSON.parse(readFileSync(`${ep}/vo-timing/${b.id}.json`, "utf8"))]));
const r3 = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const codeMarks = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const W = 1920, H = 1080;
const BOX = { w: 1280, h: 720, top: 112 };
const BOX_LEFT = (W - BOX.w) / 2;
const NOTE_TOP = BOX.top + BOX.h + 18;

// ── Beat times ─────────────────────────────────────────────────────────────
let t = 0;
const beats = edit.beats.map((b) => {
  const voOffset = b.voOffset ?? edit.voOffset, tail = b.tail ?? edit.tailAfterVo;
  const dur = r3(voOffset + vo[b.id].duration + tail + (b.extra ?? 0));
  const out = { ...b, voOffset, start: r3(t), dur };
  t += dur;
  return out;
});
const total = r3(t);

// ── Pause snap for caption cues ───────────────────────────────────────────
function silenceEnds(id) {
  const wav = `${ep}/hyperframes/assets/media/${id}.wav`;
  if (!existsSync(wav)) throw new Error(`missing ${wav}`);
  const r = execFileSync("/bin/sh", ["-c", `ffmpeg -hide_banner -nostats -i "${wav}" -af silencedetect=n=-40dB:d=0.18 -f null - 2>&1`], { encoding: "utf8" });
  return [...r.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
}
const snapped = {};
for (const b of beats) {
  const ends = silenceEnds(b.id);
  snapped[b.id] = vo[b.id].cues.map((c, i) => {
    if (i === 0) return c.start;
    let best = c.start, bestD = 0.4001;
    for (const e of ends) { const d = Math.abs(e - c.start); if (d < bestD) { best = e; bestD = d; } }
    return r3(best);
  });
}

const els = [];
const tl = [];
const badges = [];
const timelineShots = [];

// ── App beats: windows, footage, cameras, chips, notes ────────────────────
const appBeats = beats.filter((b) => b.kind === "app");
appBeats.forEach((b, bi) => {
  const shots = b.shots.map((s) => ({ ...s, segments: s.segments.map((x) => [...x]) }));
  const flat = shots.flatMap((s, si) => s.segments.map((seg) => ({ seg, si })));
  const fixed = flat.slice(0, -1).reduce((a, { seg: [ss, se, rate] }) => a + (se - ss) / rate, 0);
  const last = flat[flat.length - 1].seg;
  if (last[2] === "fit") last[2] = r3((last[1] - last[0]) / (b.dur - fixed));
  for (const { seg: [ss, se, rate] } of flat) {
    if (!(se > ss)) throw new Error(`${b.id}: empty segment ${ss}-${se}`);
    if (rate < (b.minRate ?? 0.75)) throw new Error(`${b.id}: rate ${rate} below ${b.minRate ?? 0.75}x at ${ss}`);
    if (rate > 1.15 && rate < 1.5) throw new Error(`${b.id}: rate ${rate} at ${ss} is a hidden speed-up; use <=1.15 or >=1.5`);
  }
  for (let i = 1; i < flat.length; i++) if (flat[i].seg[0] < flat[i - 1].seg[1] - 0.001) throw new Error(`${b.id}: source goes backwards at ${flat[i].seg[0]}`);
  const sum = flat.reduce((a, { seg: [ss, se, rate] }) => a + (se - ss) / rate, 0);
  if (Math.abs(sum - b.dur) > 0.02) throw new Error(`${b.id}: segments last ${sum.toFixed(3)} s, beat is ${b.dur} s`);
  const next = appBeats[bi + 1];
  if (next && last[1] > next.shots[0].segments[0][0] + 0.001) throw new Error(`${b.id} ends after ${next.id} starts in the source`);

  // Source time -> composition time inside this beat.
  const map = (src) => {
    let at = b.start;
    for (const { seg: [ss, se, rate] } of flat) {
      if (src <= se) return r3(at + Math.max(0, src - ss) / rate);
      at += (se - ss) / rate;
    }
    return r3(b.start + b.dur);
  };

  let at = b.start;
  let chipText = null, chipStart = null;
  const chips = [];
  shots.forEach((s, si) => {
    const aspect = s.aspect ?? 16 / 9;
    const ww = aspect >= BOX.w / BOX.h ? BOX.w : BOX.h * aspect;
    const wh = ww / aspect;
    const left = (W - ww) / 2, top = BOX.top + (BOX.h - wh) / 2;
    const shotStart = r3(at);
    const shotDur = r3(s.segments.reduce((a, [ss, se, rate]) => a + (se - ss) / rate, 0));
    const id = `${b.id}-${si}`;
    const cls = `cam-${id}`;
    els.push(`      <div id="win-${id}" class="clip win" data-start="${shotStart}" data-duration="${shotDur}" data-track-index="1" style="left:${r3(left - 12)}px;top:${r3(top - 12)}px;width:${r3(ww + 24)}px;height:${r3(wh + 24)}px"></div>`);
    s.segments.forEach(([ss, se, rate], i) => {
      const d = r3((se - ss) / rate);
      els.push(`      <video id="v-${id}-${i}" class="clip footage ${cls}" src="${edit.take}" muted playsinline data-start="${r3(at)}" data-duration="${d}" data-media-start="${r3(ss + edit.syncOffset)}" data-playback-rate="${rate}" data-track-index="0"></video>`);
      if (rate >= 1.5 || rate < 0.75) {
        const label = rate >= 1.5 ? `Sped up ${rate >= 2 ? Math.round(rate) : Math.round(rate * 10) / 10}×` : `Slowed to ${Math.round(rate * 100) / 100}×`;
        const prev = badges[badges.length - 1];
        if (prev && prev.label === label && Math.abs(prev.start + prev.dur - at) < 0.01) prev.dur = r3(prev.dur + d);
        else badges.push({ start: r3(at), dur: d, label });
      }
      at += d;
    });
    const cams = s.cam ?? [{ src: s.segments[0][0], x: 0, y: 0, w: W }];
    const camVars = (c) => {
      const h = c.w / aspect;
      if (c.x < 0 || c.y < 0 || c.x + c.w > W + 0.5 || c.y + h > H + 0.5) throw new Error(`${id}: camera ${JSON.stringify(c)} (h ${h.toFixed(1)}) leaves the frame`);
      const sc = ww / c.w;
      if (sc > 2.65) throw new Error(`${id}: camera ${JSON.stringify(c)} magnifies ${sc.toFixed(2)}x (max 2.65)`);
      const rad = 6 / sc;
      const clip = `inset(${r3(c.y)}px ${r3(W - c.x - c.w)}px ${r3(H - c.y - h)}px ${r3(c.x)}px round ${r3(rad)}px)`;
      return `{ scale: ${r3(sc)}, x: ${r3(left - c.x * sc)}, y: ${r3(top - c.y * sc)}, clipPath: "${clip}" }`;
    };
    tl.push(`tl.set(".${cls}", ${camVars(cams[0]).replace(/ }$/, ', transformOrigin: "0 0" }')}, ${shotStart});`);
    for (const c of cams.slice(1)) {
      const tc = map(c.src);
      tl.push(`tl.to(".${cls}", { ...${camVars(c)}, duration: ${c.dur ?? 0.6}, ease: "power2.inOut" }, ${r3(Math.min(tc, shotStart + shotDur - 0.3))});`);
    }
    if (s.chip !== undefined && s.chip !== chipText) {
      const cs = s.chipAt !== undefined ? map(s.chipAt) : shotStart;
      if (chipText) chips.push({ text: chipText, start: chipStart, end: cs });
      chipText = s.chip; chipStart = cs;
    }
    if (s.note) {
      const ns = s.note.from !== undefined ? map(s.note.from) : shotStart;
      const ne = s.note.to !== undefined ? map(s.note.to) : r3(shotStart + shotDur);
      const nid = `note-${id}`;
      els.push(`      <div id="${nid}" class="clip note" data-start="${ns}" data-duration="${r3(ne - ns)}" data-track-index="4"><span class="note-inner" id="${nid}-i"><b>Known issue in 1.0.45:</b> ${codeMarks(s.note.text)}</span></div>`);
      tl.push(`tl.fromTo("#${nid}-i", { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: "power2.out" }, ${r3(ns + 0.05)});`);
    }
    timelineShots.push({ beat: b.id, shot: si, start: shotStart, dur: shotDur, window: { left: r3(left), top: r3(top), w: r3(ww), h: r3(wh) }, segments: s.segments });
  });
  if (chipText) chips.push({ text: chipText, start: chipStart, end: r3(b.start + b.dur) });
  chips.forEach((c, ci) => {
    const cid = `chip-${b.id}-${ci}`;
    els.push(`      <div id="${cid}" class="clip chip" data-start="${c.start}" data-duration="${r3(c.end - c.start)}" data-track-index="2"><span class="chip-inner" id="${cid}-i">${codeMarks(c.text)}</span></div>`);
    tl.push(`tl.fromTo("#${cid}-i", { y: 4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: "power2.out" }, ${r3(c.start + 0.05)});`);
  });
  b.chips = chips;
  b.resolved = flat.map((f) => f.seg);
});

// ── VO and speed badges ───────────────────────────────────────────────────
for (const b of beats) {
  els.push(`      <audio id="vo-${b.id}" src="assets/media/${b.id}.wav" data-start="${r3(b.start + b.voOffset)}" data-duration="${vo[b.id].duration}" data-track-index="6" data-volume="1"></audio>`);
}
badges.forEach((s, i) => {
  els.push(`      <div id="speed-${i}" class="clip speed" data-start="${s.start}" data-duration="${s.dur}" data-track-index="3"><span class="speed-inner">${s.label}</span></div>`);
});

// ── Cards ────────────────────────────────────────────────────────────────
const intro = beats[0], outro = beats[beats.length - 1];
const steps = edit.intro?.steps ?? [];
els.push(`
      <section id="intro" class="clip card" data-start="${intro.start}" data-duration="${intro.dur}" data-track-index="1">
        <div class="card-inner">
          <div class="wordmark rise">SpecWithCode</div>
          <h1 class="title rise">${codeMarks(edit.title)}</h1>
          <div class="thread" id="intro-thread"></div>
          <p class="subtitle rise">${esc(edit.subtitle)}</p>
          <ol class="steps">${steps.map((s, i) => `<li class="step" id="step-${i}"><span class="num">${i + 1}</span>${codeMarks(s)}</li>`).join("")}</ol>
          <div class="footer rise">spec-weave.com/tutorials</div>
        </div>
      </section>`);
tl.push(`tl.fromTo("#intro .rise", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: "power2.out" }, ${intro.start});`);
tl.push(`tl.fromTo("#intro-thread", { width: 0 }, { width: 720, duration: 0.6, ease: "power2.out" }, ${r3(intro.start + 0.2)});`);
const stepAt = edit.intro?.stepAt ?? [];
steps.forEach((_, i) => tl.push(`tl.fromTo("#step-${i}", { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, ${r3(intro.start + (stepAt[i] ?? 1.6 + i * 0.8))});`));
tl.push(`tl.to("#intro .card-inner", { opacity: 0, duration: 0.25, ease: "none" }, ${r3(intro.start + intro.dur - 0.25)});`);
const notes = edit.outro.notes ?? [];
els.push(`
      <section id="outro" class="clip card" data-start="${outro.start}" data-duration="${outro.dur}" data-track-index="1">
        <div class="card-inner">
          <div class="wordmark rise">SpecWithCode</div>
          <div class="outro-l1 rise">${codeMarks(edit.outro.next)}</div>
          <div class="thread" id="outro-thread"></div>
          <ul class="disclose">${notes.map((n, i) => `<li id="disc-${i}">${codeMarks(n)}</li>`).join("")}</ul>
          <div class="footer rise">All tutorials: spec-weave.com/tutorials</div>
        </div>
      </section>`);
tl.push(`tl.fromTo("#outro .rise", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: "power2.out" }, ${outro.start});`);
tl.push(`tl.fromTo("#outro-thread", { width: 0 }, { width: 720, duration: 0.6, ease: "power2.out" }, ${r3(outro.start + 0.3)});`);
const discAt = edit.outro.noteAt ?? [];
notes.forEach((_, i) => tl.push(`tl.fromTo("#disc-${i}", { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, ${r3(outro.start + (discAt[i] ?? 0.6 + i * 0.8))});`));

// ── Captions ─────────────────────────────────────────────────────────────
const caps = [];
for (const b of beats) {
  const cues = vo[b.id].cues;
  cues.forEach((c, i) => {
    const s = r3(b.start + b.voOffset + snapped[b.id][i]);
    const end = cues[i + 1] ? r3(b.start + b.voOffset + snapped[b.id][i + 1]) : r3(Math.min(b.start + b.dur, b.start + b.voOffset + c.end + 0.4));
    caps.push({ start: s, end, text: c.text });
  });
}
function captionLines(text) {
  const len = (s) => s.replace(/`/g, "").length;
  if (len(text) <= 42) return [text];
  let best = null, inCode = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "`") inCode = !inCode;
    if (text[i] !== " " || inCode) continue;
    const a = text.slice(0, i), b = text.slice(i + 1), score = Math.max(len(a), len(b));
    if (!best || score < best.score) best = { a, b, score };
  }
  if (!best || best.score > 42) console.warn(`caption needs more than two 42-character lines: ${text}`);
  return best ? [best.a, best.b] : [text];
}
for (const c of caps) {
  const d = c.end - c.start;
  if (d < 1 || d > 6) console.warn(`cue ${d.toFixed(2)} s outside 1–6 s: ${c.text}`);
}
caps.forEach((c, i) => {
  els.push(`      <div id="cap-${i + 1}" class="clip caption" data-start="${c.start}" data-duration="${r3(c.end - c.start)}" data-track-index="5"><span class="pill">${captionLines(c.text).map(codeMarks).join("<br>")}</span></div>`);
});

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>${esc(edit.title)}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Schibsted Grotesk"; font-style: normal; font-weight: 400 900; src: url(assets/fonts/schibsted-grotesk-latin.woff2) format("woff2"); }
      @font-face { font-family: "JetBrains Mono"; font-style: normal; font-weight: 100 800; src: url(assets/fonts/jetbrains-mono-latin.woff2) format("woff2"); }
      :root {
        --canvas: #f8f7f9; --panel: #ffffff; --sunken: #efedf2; --ink: #241523; --muted: #675d69; --line: #dedae5;
        --iris: #6d4fb5; --iris-strong: #4a3678; --iris-tint: #ece6f8; --sans: "Schibsted Grotesk", sans-serif; --mono: "JetBrains Mono", monospace;
        --shadow-window: 0 1px 2px rgba(36, 21, 35, 0.06), 0 12px 32px rgba(36, 21, 35, 0.08);
      }
      code { font-variant-ligatures: none; font-feature-settings: "calt" 0, "liga" 0; }
      body { margin: 0; background: var(--canvas); color: var(--ink); font-family: var(--sans); }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--canvas); }
      .clip { position: absolute; }
      .win { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow-window); box-sizing: border-box; }
      .footage { left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover; transform-origin: 0 0; z-index: 2; }
      .card { inset: 0; background: var(--canvas); }
      .card-inner { position: absolute; inset: 120px 160px 150px; }
      .wordmark { font: 700 34px/1 var(--sans); color: var(--ink); letter-spacing: -0.01em; }
      .title { margin: 120px 0 0; max-width: 1400px; font: 600 88px/1.04 var(--sans); letter-spacing: -0.025em; color: var(--ink); text-wrap: balance; }
      .thread { height: 4px; width: 0; background: var(--iris); margin-top: 40px; border-radius: 2px; }
      .subtitle { margin: 34px 0 0; font: 400 34px/1.35 var(--sans); color: var(--muted); }
      .steps { list-style: none; margin: 40px 0 0; padding: 0; display: flex; gap: 28px; }
      .step { opacity: 0; display: flex; align-items: center; gap: 14px; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 24px 14px 16px; font: 600 30px/1.2 var(--sans); color: var(--ink); }
      .step .num { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 20px; background: var(--iris-tint); color: var(--iris-strong); font: 700 24px/1 var(--sans); }
      .footer { position: absolute; left: 0; bottom: 0; font: 500 26px/1.2 var(--sans); color: var(--muted); }
      .outro-l1 { margin-top: 120px; font: 600 72px/1.1 var(--sans); letter-spacing: -0.02em; color: var(--ink); }
      .outro-l1 code { font: 500 0.86em var(--mono); color: var(--ink); white-space: nowrap; }
      .disclose { list-style: none; margin: 40px 0 0; padding: 0; max-width: 1500px; }
      .disclose li { opacity: 0; position: relative; padding-left: 28px; margin: 0 0 14px; font: 400 30px/1.38 var(--sans); color: var(--muted); }
      .disclose li::before { content: ""; position: absolute; left: 0; top: 16px; width: 10px; height: 10px; border-radius: 5px; background: var(--iris); }
      .chip { left: ${BOX_LEFT}px; top: 36px; z-index: 10; }
      .chip-inner { display: inline-block; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 10px 20px; font: 600 30px/1.25 var(--sans); color: var(--ink); white-space: nowrap; }
      .chip-inner code { font: 500 0.86em var(--mono); color: var(--iris-strong); }
      .speed { right: ${BOX_LEFT}px; top: 36px; z-index: 10; }
      .speed-inner { display: inline-block; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 10px 18px; font: 600 28px/1.25 var(--sans); color: var(--muted); }
      .note { left: 0; right: 0; top: ${NOTE_TOP}px; z-index: 12; text-align: center; }
      .note-inner { display: inline-block; background: var(--iris-tint); border-left: 4px solid var(--iris); border-radius: 6px; padding: 6px 18px; font: 400 26px/1.3 var(--sans); color: var(--ink); white-space: nowrap; }
      .note-inner b { font-weight: 700; color: var(--iris-strong); }
      .caption { left: 0; right: 0; bottom: 30px; z-index: 20; text-align: center; }
      .caption .pill { display: inline-block; white-space: nowrap; background: rgba(255, 255, 255, 0.96); border: 1px solid var(--line); color: var(--ink);
        padding: 10px 26px; border-radius: 8px; font: 600 38px/1.28 var(--sans); }
      .caption code { font: 500 0.86em var(--mono); background: var(--sunken); border-radius: 4px; padding: 0 6px; white-space: nowrap; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${total}">
${els.join("\n")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${tl.map((l) => "      " + l).join("\n")}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeFileSync(`${ep}/hyperframes/index.html`, html);

mkdirSync(outDir, { recursive: true });
const ts = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`; };
const plain = (s) => s.replace(/`/g, "");
writeFileSync(`${outDir}/${SLUG}.en.vtt`, "WEBVTT\n\n" + caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${plain(c.text)}\n`).join("\n"));
const chapters = beats.map((b) => ({ start: b.start, title: b.chapter }));
writeFileSync(`${outDir}/${SLUG}.chapters.vtt`, "WEBVTT\n\n" + chapters.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(chapters[i + 1]?.start ?? total)}\n${c.title}\n`).join("\n"));
writeFileSync(`${outDir}/timeline.json`, JSON.stringify({ total, posterAt: edit.posterAt, beats: beats.map(({ id, start, dur, chapter, resolved, chips }) => ({ id, start, dur, chapter, mid: r3(start + dur / 2), ...(resolved ? { segments: resolved, chips } : {}) })), shots: timelineShots, badges, captions: caps }, null, 2) + "\n");
console.log("total", total, "s;", caps.length, "captions;", beats.map((b) => `${b.id}@${b.start}`).join(" "));
for (const b of appBeats) console.log(" ", b.id, JSON.stringify(b.resolved));
console.log("  badges", JSON.stringify(badges));
