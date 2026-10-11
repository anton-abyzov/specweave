// Build the HyperFrames composition and the two WebVTT files for one episode.
// Inputs: SHOTLIST.json (beats, VO, step chips, chapters, cards), edit.json (beat
// lengths, footage segments, captions, highlights), the TERM capture, and the
// word timings Whisper produced for each VO file (mlx_whisper --word-timestamps).
//
// Usage: node build-composition.mjs <episodeDir> <wordsDir> <outVttBase>
//   writes <episodeDir>/hyperframes/index.html, <outVttBase>.en.vtt, <outVttBase>.chapters.vtt
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const [epDir, wordsDir, vttBase] = process.argv.slice(2);
const shotlist = JSON.parse(readFileSync(join(epDir, "SHOTLIST.json"), "utf8"));
const edit = JSON.parse(readFileSync(join(epDir, "edit.json"), "utf8"));
const FPS = 30;
const snap = (t) => Math.round(t * FPS) / FPS;
const r3 = (t) => Number(t.toFixed(3));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const codeHtml = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
const plain = (s) => s.replace(/`/g, "");

// ---- beat timing -------------------------------------------------------------
let t = 0;
const beats = edit.beats.map((b) => {
  const shot = shotlist.shots.find((s) => s.id === b.id);
  if (!shot) throw new Error(`no shot ${b.id}`);
  const beat = { ...b, shot, start: snap(t), dur: snap(b.dur) };
  t += beat.dur;
  return beat;
});
const total = snap(t);

// ---- VO and caption timing ----------------------------------------------------
function words(id) {
  const f = join(wordsDir, `${id}.json`);
  const d = JSON.parse(readFileSync(f, "utf8"));
  return d.segments.flatMap((s) => s.words.map((w) => ({ w: w.word.trim(), s: w.start, e: w.end })));
}
const cues = [];
// Align written caption words to Whisper's words (LCS on normalized tokens), so each
// cue starts on its first spoken word and ends on its last one.
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
const NUM = { eleven: "11" };
function align(a, b) {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const map = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) { map[i] = j; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return map;
}
for (const b of beats) {
  const ws = words(b.id);
  const voStart = b.start + edit.voOffset;
  const spoken = ws.flatMap((w) => norm(w.w).map((tok) => ({ tok, s: w.s, e: w.e })));
  const written = b.captions.flatMap((c, ci) => norm(plain(c.text)).map((tok) => ({ tok: NUM[tok] ?? tok, ci })));
  const map = align(written.map((x) => x.tok), spoken.map((x) => x.tok));
  b.captions.forEach((c, ci) => {
    const idx = written.map((w, i) => (w.ci === ci ? i : -1)).filter((i) => i >= 0);
    const hits = idx.map((i) => map[i]).filter((j) => j >= 0);
    if (!hits.length) throw new Error(`caption not found in VO: ${c.text}`);
    const first = ci === 0 ? 0 : hits[0], last = ci === b.captions.length - 1 ? spoken.length - 1 : hits[hits.length - 1];
    cues.push({ beat: b, text: c.text, lift: c.lift ?? 0, start: voStart + spoken[first].s, end: voStart + spoken[last].e });
  });
}
// No gaps inside a beat; at least 1 s; never past the beat; at most 6 s.
for (let i = 0; i < cues.length; i++) {
  const c = cues[i], n = cues[i + 1];
  const beatEnd = c.beat.start + c.beat.dur;
  c.start = snap(c.start);
  if (n && n.beat === c.beat) c.end = n.start; else c.end = Math.min(beatEnd, c.end + 0.5);
  c.end = snap(Math.min(Math.max(c.end, c.start + 1), beatEnd, c.start + 6));
}

// ---- VTT ---------------------------------------------------------------------
const ts = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), x = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(x).padStart(3, "0")}`;
};
const vtt = ["WEBVTT", ""];
cues.forEach((c, i) => { vtt.push(String(i + 1), `${ts(c.start)} --> ${ts(c.end)}`, plain(c.text), ""); });
writeFileSync(`${vttBase}.en.vtt`, vtt.join("\n"));
const chapters = [];
for (const b of beats) {
  const last = chapters[chapters.length - 1];
  if (last && last.title === b.shot.chapter) last.end = b.start + b.dur;
  else chapters.push({ title: b.shot.chapter, start: b.start, end: b.start + b.dur });
}
const cvtt = ["WEBVTT", ""];
chapters.forEach((c, i) => cvtt.push(`chapter-${i + 1}`, `${ts(c.start)} --> ${ts(c.end)}`, c.title, ""));
writeFileSync(`${vttBase}.chapters.vtt`, cvtt.join("\n"));

const voLen = (id) => {
  const f = join(epDir, "hyperframes", edit.voDir, `${id}.wav`);
  return r3(Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim()));
};
// ---- composition ---------------------------------------------------------------
const html = [];
const tweens = [];
let vid = 0;
for (const b of beats) {
  const s = b.shot;
  if (s.kind === "MG" && b.id.endsWith("intro")) {
    html.push(`
      <section id="intro" class="clip card" data-start="${b.start}" data-duration="${b.dur}" data-track-index="1">
        <div class="card-inner">
          <div class="eyebrow rise">${esc(s.card.eyebrow.toUpperCase())}</div>
          <h1 class="title rise">${esc(s.card.title.replace(" in SpecWithCode", ""))}<span class="roman"> in SpecWithCode</span></h1>
          <div class="thread" id="intro-thread"></div>
          <p class="subtitle rise">${esc(s.card.subtitle)}</p>
          <div class="footer rise">spec-weave.com</div>
        </div>
      </section>`);
    tweens.push(`tl.fromTo("#intro .rise", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: "power2.out" }, ${b.start});`);
    tweens.push(`tl.fromTo("#intro-thread", { width: 0 }, { width: 720, duration: 0.6, ease: "power2.out" }, ${b.start + 0.3});`);
    tweens.push(`tl.to("#intro .card-inner", { opacity: 0, duration: 0.25, ease: "none" }, ${b.start + 3.75});`);
  } else if (s.kind === "MG") {
    const [l1, l2, l3] = s.card.lines;
    const l1html = esc(l1).replace("$sw-done", '<code class="accent">$sw-done</code>');
    html.push(`
      <section id="outro" class="clip card" data-start="${b.start}" data-duration="${b.dur}" data-track-index="1">
        <div class="card-inner outro">
          <div class="eyebrow rise">SPECWITHCODE TUTORIAL ${String(shotlist.episode).padStart(2, "0")}</div>
          <div class="outro-l1 rise">${l1html}</div>
          <div class="thread" id="outro-thread"></div>
          <div class="outro-l2 rise">${esc(l2)}</div>
          <div class="outro-l3 rise">${esc(l3)}</div>
        </div>
      </section>`);
    tweens.push(`tl.fromTo("#outro .rise", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: "power2.out" }, ${b.start});`);
    tweens.push(`tl.fromTo("#outro-thread", { width: 0 }, { width: 720, duration: 0.6, ease: "power2.out" }, ${b.start + 0.3});`);
  } else if (s.kind === "TERM") {
    const step = s.steps[0];
    const cap = JSON.parse(readFileSync(join(epDir, step.capture), "utf8"));
    const lines = cap.stdout.split("\n");
    step.lineNumbers.forEach((n, i) => { if (lines[n - 1] !== step.showLines[i]) throw new Error(`capture line ${n} differs: ${lines[n - 1]}`); });
    const rows = ["…", step.showLines[0], "…", step.showLines[1], "…"];
    html.push(`
      <section id="term" class="clip termstage" data-start="${b.start}" data-duration="${b.dur}" data-track-index="1">
        <div class="term">
          <div class="term-row"><span class="prompt">${esc(step.prompt)}</span> <span id="term-cmd"></span><span class="caret" id="term-caret"></span></div>
          ${rows.map((r, i) => `<div class="term-row out ${r === "…" ? "elide" : "hl"}" id="term-out-${i}">${esc(r.replace(/^ {3}/, ""))}</div>`).join("\n          ")}
        </div>
      </section>`);
    const cmd = step.command;
    const typeStart = b.start + 0.35, typeDur = cmd.length / 40;
    tweens.push(`{ const o = { n: 0 }; const el = document.getElementById("term-cmd"); const cmd = ${JSON.stringify(cmd)};
      tl.to(o, { n: cmd.length, duration: ${r3(typeDur)}, ease: "none", onUpdate: () => { el.textContent = cmd.slice(0, Math.round(o.n)); } }, ${r3(typeStart)}); }`);
    tweens.push(`tl.set("#term-caret", { opacity: 0 }, ${r3(typeStart + typeDur + 0.25)});`);
    rows.forEach((_, i) => tweens.push(`tl.fromTo("#term-out-${i}", { opacity: 0 }, { opacity: ${rows[i] === "…" ? 0.5 : 1}, duration: 0.12, ease: "none" }, ${r3(typeStart + typeDur + 0.35 + i * 0.06)});`));
  } else {
    // APP: footage segments, back to back.
    let at = b.start;
    b.segments.forEach(([ss, se, rate], i) => {
      const isLast = i === b.segments.length - 1;
      const d = isLast ? snap(b.start + b.dur - at) : snap((se - ss) / rate);
      vid++;
      html.push(`
      <video id="v${vid}" class="clip footage" src="${edit.take}" muted playsinline data-start="${r3(at)}" data-duration="${r3(d)}" data-media-start="${r3(ss + edit.syncOffset)}" data-playback-rate="${rate}" data-track-index="0"></video>`);
      if (rate > 1.05) html.push(`
      <div id="sped-${vid}" class="clip chip sped" data-start="${r3(at)}" data-duration="${r3(d)}" data-track-index="3">Sped up ${Math.round(rate)}×</div>`);
      at = snap(at + d);
    });
    (b.highlights ?? []).forEach((h, i) => html.push(`
      <div id="hl-${b.id}-${i}" class="clip hl-box" data-start="${r3(b.start + h.from)}" data-duration="${r3(h.to - h.from)}" data-track-index="4" style="left:${h.x}px;top:${h.y}px;width:${h.w}px;height:${h.h}px"></div>`));
  }
  if (s.stepChip) {
    const chip = s.stepChip.length > 64 ? "…" + s.stepChip.slice(-63) : s.stepChip;
    const chipHtml = esc(chip).replace(/→/g, '<span class="arrow">→</span>').replace(/(specweave init \. --quick|~\/greet-app|ledger\.jsonl|codex login|\$)/g, "<code>$1</code>");
    html.push(`
      <div id="chip-${b.id}" class="clip chip step" data-start="${b.start}" data-duration="${b.dur}" data-track-index="2"><span class="chip-inner" id="chipi-${b.id}">${chipHtml}</span></div>`);
    tweens.push(`tl.fromTo("#chipi-${b.id}", { y: 4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: "power2.out" }, ${r3(b.start + 0.2)});`);
  }
  html.push(`
      <audio id="vo-${b.id}" src="${edit.voDir}/${b.id}.wav" data-start="${r3(b.start + edit.voOffset)}" data-duration="${voLen(b.id)}" data-track-index="6" data-volume="1"></audio>`);
}
cues.forEach((c, i) => {
  const dark = c.beat.shot.kind === "TERM";
  html.push(`
      <div id="cap-${i + 1}" class="clip caption${dark ? " dark" : ""}" data-start="${r3(c.start)}" data-duration="${r3(c.end - c.start)}" data-track-index="5"${c.lift ? ` style="bottom:${64 + c.lift}px"` : ""}><span class="pill">${codeHtml(c.text)}</span></div>`);
});

const doc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>${esc(shotlist.title)}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "IBM Plex Sans"; font-style: normal; font-weight: 100 700; src: url(assets/fonts/ibm-plex-sans-latin.woff2) format("woff2"); }
      @font-face { font-family: "Newsreader"; font-style: normal; font-weight: 200 800; src: url(assets/fonts/newsreader-latin.woff2) format("woff2"); }
      @font-face { font-family: "Newsreader"; font-style: italic; font-weight: 200 800; src: url(assets/fonts/newsreader-italic-latin.woff2) format("woff2"); }
      :root {
        --paper: #f6f4ee; --ink: #252820; --muted: #65695e; --line: #d9dcd0; --soft: #eff2e8; --accent: #bd481f;
        --term-bg: #20231c; --term-ink: #e8ecdf; --dark-paper: #181914; --dark-ink: #ece8dc; --dark-soft: #23261e;
        --sans: "IBM Plex Sans", sans-serif; --display: "Newsreader", serif; --mono: ui-monospace, monospace;
      }
      body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--sans); }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--paper); }
      .clip { position: absolute; }
      .footage { inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .card, .termstage { inset: 0; background: var(--paper); }
      .card-inner { position: absolute; inset: 96px; }
      .eyebrow { font: 500 24px/1.2 var(--sans); letter-spacing: 0.12em; color: var(--muted); }
      .title { margin: 236px 0 0; font: italic 400 120px/1.05 var(--display); color: var(--ink); }
      .title .roman { font-style: normal; }
      .thread { height: 4px; width: 0; background: var(--accent); margin-top: 36px; }
      .subtitle { margin: 40px 0 0; font: 400 36px/1.35 var(--sans); color: var(--muted); }
      .footer { position: absolute; left: 0; bottom: 0; font: 500 24px/1.2 var(--sans); color: var(--muted); }
      .outro-l1 { margin-top: 300px; font: 400 72px/1.1 var(--display); color: var(--ink); }
      .outro-l1 code { font-family: var(--mono); font-size: 62px; color: var(--accent); }
      .outro-l2 { margin-top: 40px; font: 400 32px/1.4 var(--sans); color: var(--ink); }
      .outro-l3 { margin-top: 12px; font: 400 32px/1.4 var(--sans); color: var(--muted); }
      .term { position: absolute; left: 50%; top: 50%; width: 1500px; margin-left: -750px; margin-top: -200px; box-sizing: border-box;
        background: var(--term-bg); color: var(--term-ink); border: 1px solid var(--line); border-radius: 4px; padding: 40px 48px;
        font: 400 30px/1.5 var(--mono); }
      .term-row { white-space: pre; min-height: 45px; position: relative; }
      .term-row.out { opacity: 0; }
      .term-row.hl::before { content: ""; position: absolute; left: -48px; top: 4px; bottom: 4px; width: 3px; background: var(--accent); }
      .prompt { color: #a8ab9d; }
      .caret { display: inline-block; width: 16px; height: 34px; background: var(--term-ink); vertical-align: -6px; margin-left: 2px; }
      .chip { top: 48px; z-index: 10; }
      .chip.step { left: 272px; }
      .chip-inner, .chip.sped { display: inline-block; background: rgba(239, 242, 232, 0.92); border: 1px solid var(--line); border-radius: 4px;
        padding: 10px 18px; font: 500 22px/1.3 var(--sans); color: var(--ink); box-shadow: 0 18px 50px #25282008; white-space: nowrap; }
      .chip.sped { top: auto; right: 48px; bottom: 48px; color: var(--muted); }
      .chip .arrow { color: var(--accent); }
      .chip code { font-family: var(--mono); font-size: 0.92em; }
      .hl-box { z-index: 8; background: rgba(189, 72, 31, 0.12); outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 4px; }
      .caption { left: 0; right: 0; bottom: 64px; z-index: 20; text-align: center; }
      .caption .pill { display: inline-block; max-width: 880px; text-wrap: balance; background: rgba(246, 244, 238, 0.92); color: var(--ink);
        padding: 12px 24px; border-radius: 4px; font: 600 40px/1.3 var(--sans); }
      .caption.dark .pill { background: rgba(24, 25, 20, 0.92); color: var(--dark-ink); }
      .caption code { font-family: var(--mono); font-weight: 600; font-size: 0.92em; background: var(--soft); border-radius: 4px; padding: 0 4px; white-space: nowrap; }
      .caption.dark code { background: var(--dark-soft); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${total}">
${html.join("\n")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${tweens.join("\n      ")}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeFileSync(join(epDir, "hyperframes", "index.html"), doc);
console.log(JSON.stringify({ total, beats: beats.map((b) => ({ id: b.id, start: b.start, dur: b.dur })), chapters: chapters.map((c) => ({ start: r3(c.start), title: c.title })), cues: cues.length }, null, 1));
