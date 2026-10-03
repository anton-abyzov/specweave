// Builds the v2 composition: narrated by Anton's cloned voice, with his HeyGen
// avatar on camera for the intro/outro and a talking bubble in the corner elsewhere.
// Inputs: storyboard-v2.json (what is shown and said), timeline.json (from scripts/voice.py),
// assets/avatar/{intro,outro}.{webm|mp4} (from scripts/avatar.py).
// Run: node scripts/build-v2.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SB = JSON.parse(readFileSync(join(ROOT, "storyboard-v2.json"), "utf8"));
const TL = JSON.parse(readFileSync(join(ROOT, "timeline.json"), "utf8"));
const TOTAL = TL.total;

const IMG_W = 1456, IMG_H = 840, VIEW_W = 1536, VIEW_H = 886, S0 = VIEW_W / IMG_W;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f2 = (n) => (+n).toFixed(2);

function camXY([cx, cy, z]) {
  const S = S0 * z;
  const x = Math.min(0, Math.max(VIEW_W - IMG_W * S, VIEW_W / 2 - cx * S));
  const y = Math.min(0, Math.max(VIEW_H - IMG_H * S, VIEW_H / 2 - cy * S));
  return { x: +x.toFixed(2), y: +y.toFixed(2), scale: +S.toFixed(4) };
}

function avatarFile(take) {
  for (const ext of ["webm", "mp4"]) if (existsSync(join(ROOT, `assets/avatar/${take}.${ext}`))) return { src: `assets/avatar/${take}.${ext}`, alpha: ext === "webm" };
  return null;
}

const html = [];
const js = [];
const bubble = []; // [time, side|"hide"]
const chapters = [];

const windowHtml = (id, shot) => `<div class="window"><div class="chrome"><i></i><i></i><i></i><span>claude.ai/code</span></div>
  <div class="view"><div class="cam" id="${id}-cam" data-layout-allow-overflow><img src="assets/shots/${shot}.jpg" width="${IMG_W}" height="${IMG_H}" alt="">HLS</div></div></div>`;

SB.scenes.forEach((sc, si) => {
  const t = TL.scenes[si];
  if (t.id !== sc.id) throw new Error(`timeline out of date at ${sc.id}; rerun scripts/voice.py`);
  const id = `s${si}`;
  const start = si === 0 ? 0 : t.start, dur = +(t.end - start).toFixed(3);
  const beats = t.beats;
  const beatEnd = (k) => (k + 1 < beats.length ? beats[k + 1].start : t.end);
  const open = (cls, s = start, d = dur, suffix = "") =>
    `<section id="${id}${suffix}" class="clip scene ${cls}" data-start="${f2(s)}" data-duration="${f2(d)}" data-track-index="1">`;
  if (sc.chapter) chapters.push([start, sc.title]);

  if (sc.type === "punch") {
    sc.beats.forEach((b, k) => {
      const s = k === 0 ? start : beats[k].start, e = beatEnd(k), sid = `${id}-${k}`;
      let body;
      if (b.terminal) {
        body = `<div class="term term-small"><div class="chrome"><i></i><i></i><i></i><span>Terminal</span></div><div class="tbody">
          <div class="tb" id="${sid}-tb" style="opacity:1"><div class="tl-prompt">~/codex-side (another tool)</div>
          <div class="tl-cmd"><span class="dollar">$</span><span class="typed" id="${sid}-cmd">specweave pickup</span></div>
          <div class="tl-out" id="${sid}-o">Next: T-02 Show the Overdue badge</div></div></div></div>`;
        js.push(`tl.fromTo("#${sid}-cmd", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "steps(16)" }, ${f2(s + 0.2)});`);
        js.push(`tl.fromTo("#${sid}-o", { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${f2(s + 1.0)});`);
      } else {
        body = windowHtml(sid, b.shot).replace("HLS", "");
        const c = camXY(b.cam);
        js.push(`tl.set("#${sid}-cam", ${JSON.stringify({ ...c, scale: c.scale * 0.94 })}, ${f2(s)});`);
        js.push(`tl.to("#${sid}-cam", { ...${JSON.stringify(c)}, duration: ${f2(e - s)}, ease: "none" }, ${f2(s)});`);
        js.push(`tl.set("#${sid} .window", { opacity: 1 }, ${f2(s)});`);
      }
      html.push(`${open("scene-punch", s, e - s, `-${k}`)}${body}<div class="punch"><div class="p-eyebrow">${esc(b.eyebrow)}</div><div class="p-big">${esc(b.big)}</div></div></section>`);
      js.push(`tl.fromTo("#${sid} .p-eyebrow", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35 }, ${f2(s + 0.1)});`);
      js.push(`tl.fromTo("#${sid} .p-big", { opacity: 0, y: 40, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, ${f2(s + 0.2)});`);
    });
    bubble.push([start, "right"]);
  } else if (sc.type === "shot") {
    const hls = sc.beats.map((b, k) => b.hl ? `<div class="hl" id="${id}-hl${k}" style="left:${b.hl[0] - 6}px;top:${b.hl[1] - 6}px;width:${b.hl[2] + 12}px;height:${b.hl[3] + 12}px"></div>` : "").join("");
    html.push(`${open("scene-shot")}${windowHtml(id, sc.shot).replace("HLS", hls)}</section>`);
    js.push(`tl.set("#${id}-cam", ${JSON.stringify(camXY(sc.beats[0].cam))}, ${f2(start)});`);
    js.push(`tl.fromTo("#${id} .window", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${f2(start)});`);
    sc.beats.forEach((b, k) => {
      const s = beats[k].start, e = beatEnd(k);
      if (k > 0) js.push(`tl.to("#${id}-cam", { ...${JSON.stringify(camXY(b.cam))}, duration: 1.1, ease: "power2.inOut" }, ${f2(Math.max(start, s - 0.35))});`);
      if (b.hl) {
        js.push(`tl.fromTo("#${id}-hl${k}", { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }, ${f2(s + 0.5)});`);
        js.push(`tl.to("#${id}-hl${k}", { opacity: 0, duration: 0.3 }, ${f2(e - 0.3)});`);
      }
      bubble.push([s, b.cam[0] > IMG_W / 2 ? "left" : "right"]);
    });
  } else if (sc.type === "still") {
    html.push(`${open("scene-still")}<div class="still"><img src="assets/shots/${sc.shot}.png" width="${sc.w}" height="${sc.h}" alt=""></div></section>`);
    js.push(`tl.fromTo("#${id} .still", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }, ${f2(start)});`);
    js.push(`tl.fromTo("#${id} .still img", { scale: 1 }, { scale: 1.08, duration: ${f2(dur)}, ease: "none" }, ${f2(start)});`);
    bubble.push([start, "right"]);
  } else if (sc.type === "title") {
    html.push(`${open("scene-title")}<div class="titlecard">
      ${sc.chapter ? `<div class="t-num">${esc(sc.chapter)}</div>` : ""}<div class="t-eyebrow">${esc(sc.eyebrow)}</div>
      <div class="t-title">${esc(sc.title)}${sc.accent ? ` <span class="accent">${esc(sc.accent)}</span>` : ""}</div>
      <div class="t-sub">${esc(sc.sub)}</div></div></section>`);
    if (sc.chapter) js.push(`tl.fromTo("#${id} .t-num", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 }, ${f2(start + 0.05)});`);
    js.push(`tl.fromTo("#${id} .t-eyebrow", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.4 }, ${f2(start + 0.1)});`);
    js.push(`tl.fromTo("#${id} .t-title", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, ${f2(start + 0.2)});`);
    js.push(`tl.fromTo("#${id} .t-sub", { opacity: 0 }, { opacity: 1, duration: 0.5 }, ${f2(start + 0.6)});`);
    js.push(`tl.to("#${id} .titlecard", { opacity: 0, duration: 0.35 }, ${f2(start + dur - 0.4)});`);
    bubble.push([start, "right-big"]);
  } else if (sc.type === "releases") {
    const cards = sc.beats.map((b, k) => { const c = b.card; return `<div class="rcard tone-${c.tone}" id="${id}-c${k}">
      <div class="r-tag">${esc(c.tag)}</div><div class="r-name">${esc(c.name)}</div><div class="r-by">${esc(c.by)}</div>
      ${c.lines.map((l) => `<div class="r-line">${esc(l)}</div>`).join("")}</div>`; }).join("");
    html.push(`${open("scene-releases")}<div class="r-head">Recent releases</div><div class="rgrid">${cards}</div></section>`);
    js.push(`tl.fromTo("#${id} .r-head", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5 }, ${f2(start)});`);
    sc.beats.forEach((_, k) => {
      const s = beats[k].start;
      js.push(`tl.fromTo("#${id}-c${k}", { opacity: 0, y: 60, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }, ${f2(s)});`);
      js.push(`tl.fromTo("#${id}-c${k} .r-line", { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.45, stagger: 1.2 }, ${f2(s + 0.8)});`);
      js.push(`tl.to("#${id}-c${k}", { boxShadow: "0 0 0 2px var(--accent), 0 30px 80px rgba(0,0,0,0.6)", duration: 0.4 }, ${f2(s)});`);
      if (k < sc.beats.length - 1) js.push(`tl.to("#${id}-c${k}", { opacity: 0.38, boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.5)", duration: 0.4 }, ${f2(beats[k + 1].start)});`);
    });
    bubble.push([start, "right"]);
  } else if (sc.type === "terminal") {
    const out = JSON.parse(readFileSync(join(ROOT, "terminal-v2.json"), "utf8"));
    const body = out.map((b, k) => `<div class="tb" id="${id}-b${k}"><div class="tl-prompt">${esc(b.prompt)}</div>
      <div class="tl-cmd"><span class="dollar">$</span><span class="typed" id="${id}-b${k}-cmd">${esc(b.cmd)}</span></div>
      ${b.out.map((o, j) => `<div class="tl-out" id="${id}-b${k}-o${j}">${esc(o)}</div>`).join("")}</div>`).join("");
    html.push(`${open("scene-terminal")}<div class="term"><div class="chrome"><i></i><i></i><i></i><span>Terminal</span></div><div class="tbody">${body}</div></div></section>`);
    js.push(`tl.fromTo("#${id} .term", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, ${f2(start)});`);
    sc.beats.forEach((b, k) => {
      if (b.block === undefined) return;
      const a = beats[k].start, blk = out[b.block], typeDur = Math.min(2.4, 0.045 * blk.cmd.length);
      js.push(`tl.fromTo("#${id}-b${b.block}", { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${f2(a)});`);
      js.push(`tl.fromTo("#${id}-b${b.block}-cmd", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: ${f2(typeDur)}, ease: "steps(${blk.cmd.length})" }, ${f2(a + 0.3)});`);
      blk.out.forEach((_, j) => js.push(`tl.fromTo("#${id}-b${b.block}-o${j}", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25 }, ${f2(a + 0.6 + typeDur + j * 0.35)});`));
    });
    bubble.push([start, "right"]);
  } else if (sc.type === "avatar") {
    const av = avatarFile(sc.avatar_take);
    const b = sc.beats[0];
    const media = av
      ? `<video id="${id}-av" class="${av.alpha ? "av-alpha" : "av-box"}" src="${av.src}" data-start="${f2(beats[0].start)}" data-duration="${f2(beats[0].audio)}" data-track-index="3" muted playsinline></video>`
      : `<div class="av-box av-photo"><img src="assets/avatar/anton.jpg" alt=""></div>`;
    const left = b.end
      ? `<div class="e-title">Claude Code Projects <span class="accent">+ Opus 5.5</span></div>
         <div class="e-points"><div class="e-pt">One coordinator, many threads</div><div class="e-pt">Opus 5.5, model and effort per thread</div>
         <div class="e-pt">Routines and auto-continue after limits</div><div class="e-pt">Out of usage? <b>specweave handoff</b>, then <b>pick up</b></div></div>
         <div class="e-cmd"><span class="dollar">$</span> npm i -g specweave</div><div class="e-links">spec-weave.com · github.com/anton-abyzov/specweave</div>`
      : `<div class="ai-badge">AI avatar · cloned voice</div>${b.lines.map((l) => `<div class="d-line">${esc(l)}</div>`).join("")}`;
    html.push(`${open("scene-avatar")}<div class="av-stage">${media}</div><div class="av-left">${left}</div></section>`);
    js.push(`tl.fromTo("#${id} .av-stage", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" }, ${f2(start)});`);
    if (b.end) {
      js.push(`tl.fromTo("#${id} .e-title", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, ${f2(start + 0.4)});`);
      js.push(`tl.fromTo("#${id} .e-pt", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.45, stagger: 2.2 }, ${f2(start + 2)});`);
      js.push(`tl.fromTo("#${id} .e-cmd, #${id} .e-links", { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.6 }, ${f2(start + 12)});`);
      js.push(`tl.to("#${id} .av-left, #${id} .av-stage", { opacity: 0, duration: 1.2 }, ${f2(start + dur - 1.3)});`);
    } else {
      js.push(`tl.fromTo("#${id} .ai-badge", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, ${f2(start + 0.6)});`);
      const step = (beats[0].audio - 2) / b.lines.length;
      b.lines.forEach((_, j) => js.push(`tl.fromTo("#${id} .d-line:nth-of-type(${j + 2})", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.45 }, ${f2(start + 1.6 + j * step)});`));
    }
    bubble.push([start, "hide"]);
  }
});

// Corner bubble: Anton's photo with a ring that pulses on every spoken word.
bubble.sort((a, b) => a[0] - b[0]);
const POS = { left: { x: 40, y: 846, s: 1 }, right: { x: 1680, y: 846, s: 1 }, "right-big": { x: 1560, y: 640, s: 1.6 } };
let prev = null;
for (const [t, side] of bubble) {
  if (side === prev) continue;
  if (side === "hide") js.push(`tl.to("#bubble", { opacity: 0, duration: 0.35 }, ${f2(t)});`);
  else {
    const p = POS[side];
    if (prev === null || prev === "hide") js.push(`tl.set("#bubble", { x: ${p.x}, y: ${p.y}, scale: ${p.s} }, ${f2(t)}); tl.to("#bubble", { opacity: 1, duration: 0.4 }, ${f2(t)});`);
    else js.push(`tl.to("#bubble", { x: ${p.x}, y: ${p.y}, scale: ${p.s}, duration: 0.6, ease: "power2.inOut" }, ${f2(Math.max(0, t - 0.3))});`);
  }
  prev = side;
}
const avatarWindows = TL.scenes.filter((_, i) => SB.scenes[i].type === "avatar").map((s) => [s.start, s.end]);
const inAvatar = (x) => avatarWindows.some(([a, b]) => x >= a && x < b);
for (const sc of TL.scenes) for (const b of sc.beats) for (const [, ws, we] of b.words) {
  if (inAvatar(ws) || we - ws < 0.06) continue;
  js.push(`tl.to("#bubble .ring", { scale: 1.13, opacity: 1, duration: ${f2(Math.min(0.12, (we - ws) / 2))} }, ${f2(ws)}); tl.to("#bubble .ring", { scale: 1, opacity: 0.55, duration: 0.12 }, ${f2(we)});`);
}

// Subtitles: short phrases from the voice's own word timings.
// Spoken spellings written for the voice ("N P M", "GPT 6") shown the way they are typed.
const DISPLAY = [[["N", "P", "M"], "npm"], [["dash", "G,"], "-g"], [["GPT", "6"], "GPT-6"]];
function displayWords(words) {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const hit = DISPLAY.find(([seq]) => seq.every((s, j) => words[i + j] && words[i + j][0] === s));
    if (hit) { const n = hit[0].length; out.push([hit[1], words[i][1], words[i + n - 1][2]]); i += n - 1; }
    else out.push(words[i]);
  }
  return out;
}
const subs = [];
for (const sc of TL.scenes) for (const b of sc.beats) {
  let cur = [];
  const flush = () => { if (cur.length) subs.push([cur[0][1], cur[cur.length - 1][2], cur.map((w) => w[0]).join(" ")]); cur = []; };
  for (const w of displayWords(b.words)) {
    cur.push(w);
    const text = cur.map((x) => x[0]).join(" ");
    if (/[.,:;?!]$/.test(w[0]) || cur.length >= 7 || text.length > 38) flush();
  }
  flush();
}
const subHtml = subs.map((s, i) => `<div class="sub" id="sub${i}"><span>${esc(s[2])}</span></div>`).join("");
subs.forEach((s, i) => {
  const end = i + 1 < subs.length ? Math.min(subs[i + 1][0], s[1] + 0.6) : s[1] + 0.6;
  js.push(`tl.set("#sub${i}", { opacity: 1 }, ${f2(s[0])}); tl.set("#sub${i}", { opacity: 0 }, ${f2(end)});`);
});

const css = readFileSync(join(ROOT, "scripts/style-v2.css"), "utf8")
  .replaceAll("$VIEW_W", VIEW_W).replaceAll("$VIEW_H", VIEW_H).replaceAll("$IMG_W", IMG_W).replaceAll("$IMG_H", IMG_H)
  .replaceAll("$WIN_LEFT", (1920 - VIEW_W) / 2).replaceAll("$WIN_H", VIEW_H + 34);

writeFileSync(join(ROOT, "index.html"), `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080">
<title>Claude Code Projects + Opus 5.5</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>${css}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${TOTAL}">
<div class="bgfx"></div>
${html.join("\n")}
<div id="bubble"><div class="ring"></div><img src="assets/avatar/anton-face.jpg" alt=""><div class="b-tag">AI avatar</div></div>
<div id="subs">${subHtml}</div>
<audio id="vo" src="assets/vo/narration.wav" data-start="0" data-duration="${TOTAL}" data-track-index="9" data-volume="1"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js.join("\n")}
window.__timelines["main"] = tl;
</script>
</body></html>
`);

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
writeFileSync(join(ROOT, "chapters-v2.txt"), ["0:00 Highlights", ...chapters.map(([s, t]) => `${fmt(s)} ${t}`)].join("\n") + "\n");
console.log(`index.html (v2): ${TOTAL}s (${fmt(TOTAL)}), ${subs.length} subtitles`);
