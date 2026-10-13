// Writes hyperframes/index.html and hyperframes/captions.en.vtt for the main cut.
// Inputs: scripts/vo-lines.json, vo-words/<id>.json (word timings), takes/<take>.json (cues and
// cursor moves from scripts/rec.mjs). Every animation is a transform or opacity tween on one
// GSAP timeline; times come from the narration's word timings so pops land on the words.
import { readFileSync, writeFileSync } from "node:fs";
const here = new URL("..", import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(here + p, "utf8"));
const vo = read("scripts/vo-lines.json");
const words = Object.fromEntries(vo.lines.map((l) => [l.id, read(`vo-words/${l.id}.json`).words]));
const takes = Object.fromEntries(["desk", "project", "coordinator", "usage", "connections", "providers", "autoresolve"].map((t) => [t, read(`takes/${t}.json`)]));
const dur = (id) => words[id].at(-1).end + 0.25;

// Narration schedule: each line starts after the previous one plus a breath.
const lead = { v01: 0.8, v02: 1.0, v03: 0.8, v04: 0.9, v05: 0.9, v06: 1.0, v07: 0.8, v08: 0.6, v09: 0.9, v10: 1.0, v11: 0.6, v12: 1.0 };
const start = {}; let t = 0;
for (const l of vo.lines) { t += lead[l.id]; start[l.id] = +t.toFixed(2); t += dur(l.id); }
const END = +(t + 2.6).toFixed(2);
// Absolute time of the n-th word matching re in line id.
const W = (id, re, n = 0, edge = "start") => {
  const hits = words[id].filter((w) => re.test(w.word.trim()));
  if (!hits[n]) throw new Error(`no word ${re} #${n} in ${id}`);
  return +(start[id] + hits[n][edge]).toFixed(3);
};
// Scene i spans from just before its line to just before the next.
const ids = vo.lines.map((l) => l.id);
const sceneStart = (id) => +(start[id] - (id === "v01" ? start.v01 : 0.5)).toFixed(2);
const sceneEnd = (id) => { const i = ids.indexOf(id); return i + 1 < ids.length ? sceneStart(ids[i + 1]) : END; };

const html = []; const tw = []; const vtt = []; const sfx = [];
// Sound palette: each kind rotates through its variants so repeated cues never sound identical.
const VAR = JSON.parse(readFileSync(here + "scripts/sfx-kinds.json", "utf8"));
const used = {};
const S = (t, kind, gain = 1) => { const v = VAR[kind] || [kind]; const n = (used[kind] = (used[kind] ?? -1) + 1); sfx.push({ t: +(+t).toFixed(3), kind: v[n % v.length], gain }); };
const add = (s) => html.push(s);
const T = (s) => tw.push(s);
const f = (n) => (+n).toFixed(3);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let track = 0;
const clip = (tag, id, a, b, cls, attrs = "", inner = "") => add(`<${tag} id="${id}" class="clip ${cls}" data-start="${f(a)}" data-duration="${f(b - a)}" data-track-index="${track}" ${attrs}>${inner}</${tag}>`);

// ---------- reusable pieces ----------
const CURSOR = `<svg viewBox="0 0 28 36" width="30" height="38"><path d="M2 2 L2 28 L9 21.5 L13.6 33 L18.2 31 L13.7 19.8 L23 19.8 Z" fill="#1d1f1a" stroke="#fffdf7" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
const fade = (sel, a, d = 0.35) => T(`tl.fromTo("${sel}", {opacity:0}, {opacity:1, duration:${d}, ease:"power1.out"}, ${f(a)});`);
const pop = (sel, a, from = 0.4, ease = "back.out(2.2)", d = 0.6, snd = "pop") => { if (snd) S(a, snd, 0.8); T(`tl.fromTo("${sel}", {opacity:0, scale:${from}}, {opacity:1, scale:1, duration:${d}, ease:"${ease}"}, ${f(a)});`); };
const rise = (sel, a, y = 40, d = 0.6, stagger = 0) => T(`tl.fromTo("${sel}", {opacity:0, y:${y}}, {opacity:1, y:0, duration:${d}, ease:"expo.out"${stagger ? `, stagger:${stagger}` : ""}}, ${f(a)});`);
const out = (sel, a, d = 0.3) => T(`tl.to("${sel}", {opacity:0, duration:${d}, ease:"power1.in"}, ${f(a)});`);
// Word-by-word title: each word springs up on its own.
const title = (id, text, cls = "h1") => `<div id="${id}" class="${cls}">${text.split(" ").map((w) => `<span class="w"><span>${w}</span></span>`).join(" ")}</div>`;
const titleIn = (id, a, stagger = 0.06) => T(`tl.fromTo("#${id} .w > span", {yPercent:110}, {yPercent:0, duration:0.7, ease:"expo.out", stagger:${stagger}}, ${f(a)});`);

// A screen take inside a camera. Zoom keys animate the camera (x, y, scale); the cursor replays
// the recorded moves; rings and callouts sit on recorded element boxes.
function take(name, id, a, b, mediaStart, opts = {}) {
  const tk = takes[name]; const rate = opts.rate ?? 1;
  const toScene = (s) => a + (tk.t0Offset + s - mediaStart) / rate; // take cue time -> composition time
  track++;
  add(`<div id="${id}" class="scene untimed">
  <div id="${id}-cam" class="cam">
    <video id="${id}-v" class="clip shot" src="media/${name}.mp4" muted playsinline data-start="${f(a)}" data-duration="${f(b - a)}" data-media-start="${f(mediaStart)}" data-playback-rate="${rate}" data-track-index="${track + 40}"></video>
    ${(opts.rings || []).map((r, i) => { const px = r.pad ?? 8, py = r.pad ?? 6; return `<div id="${id}-ring${i}" class="ring" style="left:${r.x - px}px;top:${r.y - py}px;width:${r.w + 2 * px}px;height:${r.h + 2 * py}px;border-width:${(3 / (r.zoom || 1)).toFixed(2)}px${r.radius ? `;border-radius:${r.radius}px` : ""}"></div>`; }).join("")}
    <div id="${id}-cur" class="cursor">${CURSOR}<i></i></div>
  </div>
  ${(opts.callouts || []).map((c, i) => `<div id="${id}-call${i}" class="callout" style="left:${c.x}px;top:${c.y}px">${c.html}</div>`).join("")}
</div>`);
  T(`tl.set("#${id}", {opacity:1}, ${f(a)}); tl.set("#${id}", {opacity:0}, ${f(b)});`);
  // Cursor: appear at the first recorded position, then follow each move with the recorded timing.
  const moves = tk.moves.filter((m) => !m.click);
  let first = true;
  for (const m of tk.moves) {
    const s0 = toScene(m.s);
    if (s0 < a - 0.01 || s0 > b) { if (!m.click && toScene(m.e ?? m.s) <= a) T(`tl.set("#${id}-cur", {x:${m.x}, y:${m.y}}, ${f(a)});`); continue; }
    if (m.click) {
      S(s0, "click");
      T(`tl.to("#${id}-cur svg", {scale:0.82, duration:0.09, yoyo:true, repeat:1, ease:"power1.inOut", transformOrigin:"2px 2px"}, ${f(s0)});`);
      T(`tl.fromTo("#${id}-cur i", {scale:0.2, opacity:0.9}, {scale:2.6, opacity:0, duration:0.55, ease:"expo.out"}, ${f(s0)});`);
      continue;
    }
    if (first) { T(`tl.fromTo("#${id}-cur", {opacity:0}, {opacity:1, duration:0.25}, ${f(Math.max(a, s0 - 0.25))});`); first = false; }
    const d = Math.max(0.35, ((m.e - m.s) / rate) * 1.15);
    T(`tl.to("#${id}-cur", {x:${m.x}, y:${m.y}, duration:${f(d)}, ease:"power3.inOut"}, ${f(s0)});`);
  }
  if (moves.length && toScene(moves[0].s) < a) T(`tl.set("#${id}-cur", {opacity:1}, ${f(a)});`);
  for (const z of opts.zooms || []) {
    const s = z.s; const x = Math.min(0, Math.max(1920 - 1920 * s, 960 - z.cx * s)); const y = Math.min(0, Math.max(1080 - 1080 * s, 540 - z.cy * s));
    T(`tl.to("#${id}-cam", {x:${f(x)}, y:${f(y)}, scale:${s}, duration:${z.d ?? 1.1}, ease:"${z.ease ?? "power3.inOut"}"}, ${f(z.at)});`);
  }
  (opts.rings || []).forEach((r, i) => {
    T(`tl.fromTo("#${id}-ring${i}", {opacity:0, scale:1.35}, {opacity:1, scale:1, duration:0.55, ease:"back.out(2.4)"}, ${f(r.at)});`);
    T(`tl.to("#${id}-ring${i}", {opacity:0, duration:0.3}, ${f(r.until ?? r.at + 2.4)});`);
  });
  (opts.callouts || []).forEach((c, i) => {
    pop(`#${id}-call${i}`, c.at, 0.5, "back.out(2.6)", 0.55);
    out(`#${id}-call${i}`, c.until ?? c.at + 2.6);
  });
  return toScene;
}
const chip = (label, sub = "", cls = "") => `<span class="pill ${cls}"><b>${label}</b>${sub ? `<em>${sub}</em>` : ""}</span>`;
const stepChip = (id, a, b, n, text) => { track++; clip("div", id, a, b, "step", "", `<span class="step-n">${n}</span>${text}`); T(`tl.fromTo("#${id}", {opacity:0, x:-30}, {opacity:1, x:0, duration:0.6, ease:"expo.out"}, ${f(a + 0.2)});`); out(`#${id}`, b - 0.35, 0.25); };
const bg = (id, a, b, src, rate = 1, mediaStart = 0, extra = "") => { track++; clip("video", id, a, b, "bg", `src="media/${src}" muted playsinline data-media-start="${mediaStart}" data-playback-rate="${rate}" ${extra}`); };
const SVGNS = 'xmlns="http://www.w3.org/2000/svg"';
const icons = {
  laptop: `<svg ${SVGNS} viewBox="0 0 64 44"><rect x="10" y="4" width="44" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M3 38h58l-4 4H7z" fill="currentColor"/></svg>`,
  tower: `<svg ${SVGNS} viewBox="0 0 64 44"><rect x="6" y="4" width="34" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M18 36h10M23 30v6" stroke="currentColor" stroke-width="3"/><rect x="45" y="4" width="14" height="36" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="52" cy="12" r="2" fill="currentColor"/></svg>`,
  box: `<svg ${SVGNS} viewBox="0 0 64 44"><rect x="8" y="10" width="48" height="26" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="18" cy="30" r="2" fill="currentColor"/><circle cx="25" cy="30" r="2" fill="currentColor"/><path d="M36 18h12M36 24h12" stroke="currentColor" stroke-width="3"/></svg>`,
  lock: `<svg ${SVGNS} viewBox="0 0 20 20"><rect x="3.5" y="8.5" width="13" height="9" rx="2" fill="currentColor"/><path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  check: `<svg ${SVGNS} viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// ---------- S1: hook ----------
{
  const a = 0, b = sceneEnd("v01");
  bg("s1-bg", a, b, "px-hook.mp4", 0.8, 2);
  track++;
  add(`<div id="s1" class="clip scene" data-start="${a}" data-duration="${f(b - a)}" data-track-index="${track}">
  <div class="vignette"></div>
  <div id="s1-q" class="s1-q">${title("s1-t", "More AI than you can use", "h1 light")}</div>
  ${["Claude", "Codex", "Grok", "Copilot"].map((n, i) => `<div id="s1-c${i}" class="s1-chip s1-c${i}"><span class="dot d${i}"></span>${n}</div>`).join("")}
  <div id="s1-team" class="s1-team"><div class="mark">SpecWithCode</div><div class="team-sub">one team</div><div class="team-line"></div></div>
</div>`);
  titleIn("s1-t", W("v01", /^probably/) - 0.2);
  out("#s1-q", W("v01", /^Clawed|^Claude/) - 0.3, 0.4);
  const at = [W("v01", /^Clawed|^Claude/), W("v01", /^codex/i), W("v01", /^Grok/), W("v01", /^Copilot/)];
  at.forEach((x, i) => { pop(`#s1-c${i}`, x - 0.08, 0.2, "elastic.out(1, 0.55)", 1.0, i % 2 ? "popHigh" : "pop"); T(`tl.to("#s1-c${i}", {y:"-=10", duration:0.95, ease:"sine.inOut", yoyo:true, repeat:1}, ${f(x + 0.9)});`); });
  const team = W("v01", /^Spec/);
  [0, 1, 2, 3].forEach((i) => T(`tl.to("#s1-c${i}", {x:${[440, -440, 380, -380][i]}, y:${[220, 220, -160, -160][i]}, scale:0.2, opacity:0, duration:0.55, ease:"back.in(1.6)"}, ${f(team - 0.15 + i * 0.03)});`));
  S(team - 0.9, "riser", 0.6);
  pop("#s1-team", team + 0.3, 0.3, "elastic.out(1, 0.6)", 1.1, "impact");
  T(`tl.fromTo("#s1-team .team-line", {scaleX:0}, {scaleX:1, duration:0.8, ease:"expo.out"}, ${f(W("v01", /^team/) - 0.1)});`);
  T(`tl.fromTo("#s1-team .team-sub", {opacity:0, y:14}, {opacity:1, y:0, duration:0.5, ease:"expo.out"}, ${f(W("v01", /^one/, 1) - 0.05)});`);
  T(`tl.to("#s1-team", {scale:1.08, duration:${f(b - team)}, ease:"none"}, ${f(team + 1.45)});`);
}

// ---------- S2: one machine can hold several subscriptions ----------
{
  const a = sceneStart("v02"), b = sceneEnd("v02");
  stepChip("st2", a, b, "1", "Machines and subscriptions");
  const machines = [
    { id: "m4", name: "MacBook M4 Max", os: "macOS", vid: "px-macbook.mp4", x: 150,
      keys: [{ p: "Claude", acct: "EasyChamp admin", c: "c-claude", n: 0 }, { p: "Codex", acct: "EasyChamp admin", c: "c-codex", n: 0 }] },
    { id: "m1", name: "M1", os: "macOS", vid: "px-minipc.mp4", x: 760,
      keys: [{ p: "Claude", acct: "Marketing", c: "c-claude", n: 1 }, { p: "Codex", acct: "Marketing", c: "c-codex", n: 1 }] },
    { id: "lin", name: "Linux box", os: "Ubuntu", vid: "px-linux.mp4", x: 1370,
      keys: [{ p: "Grok", acct: "", c: "c-grok" }, { p: "Copilot", acct: "", c: "c-copilot" }] },
  ];
  const TOP = 290;
  track++;
  T(`tl.set("#s2", {opacity:1}, ${f(a)}); tl.set("#s2", {opacity:0}, ${f(b)});`);
  add(`<div id="s2" class="scene paper untimed">
  <div class="grid"></div>
  <div class="s2-head"><div id="s2-eb" class="eyebrow big-eb">The basics</div>${title("s2-t", "One machine, many subscriptions", "h2")}</div>
  ${machines.map((m, i) => `<div id="s2-${m.id}" class="mcard2" style="left:${m.x}px;top:${TOP}px">
    <div class="mmedia"><video id="s2-v${i}" class="clip" src="media/${m.vid}" muted playsinline data-start="${f(a)}" data-duration="${f(b - a)}" data-media-start="1" data-playback-rate="0.85" data-track-index="${track + 40 + i}"></video></div>
    <div class="mbody"><div class="mc-name">${m.name}</div><div class="mc-os">${m.os}</div></div>
    <div class="slot2" style="top:262px"></div><div class="slot2" style="top:336px"></div>
    <div class="signin" id="s2-${m.id}-sign">${icons.lock}<span>Official CLI sign-in</span></div>
  </div>`).join("")}
  ${machines.flatMap((m, i) => m.keys.map((k, j) => `<div id="s2-k-${m.id}-${j}" class="key2" style="left:${m.x + 26}px;top:${TOP + 262 + j * 74}px"><span class="kdot ${k.c}"></span><b>${k.p}</b>${k.acct ? `<em id="s2-a-${m.id}-${j}">${k.acct}</em>` : ""}</div>`)).join("")}
  <div id="s2-stamp" class="stamp" style="top:890px">Nothing is resold</div>
</div>`);
  pop("#s2-eb", a + 0.5, 0.6, "back.out(2.4)", 0.5, "popHigh");
  titleIn("s2-t", W("v02", /^basics/) - 0.1);
  S(W("v02", /^basics/) - 0.15, "swipe", 0.6);
  T(`tl.fromTo("#s2", {scale:1}, {scale:1.035, duration:${f(b - a)}, ease:"none"}, ${f(a)});`);
  machines.forEach((m, i) => rise(`#s2-${m.id}`, W("v02", /^Every/) - 0.25 + i * 0.13, 110, 0.95));
  S(W("v02", /^Every/) - 0.2, "whoosh", 0.5);
  machines.forEach((m, i) => T(`tl.fromTo("#s2-${m.id}-sign", {opacity:0, y:10}, {opacity:1, y:0, duration:0.45, ease:"back.out(2)"}, ${f(W("v02", /^official/) + i * 0.1)});`));
  S(W("v02", /^official/), "tick", 0.6);
  // "one machine can hold several": the Linux box gets two small keys at once.
  machines[2].keys.forEach((_, j) => pop(`#s2-k-lin-${j}`, W("v02", /^several/) - 0.1 + j * 0.14, 0.2, "elastic.out(1, 0.5)", 0.9, "popHigh"));
  const drop = (sel, at) => { S(at + 0.42, "thud", 0.8); T(`tl.fromTo("${sel}", {opacity:0, y:-300, rotate:-7}, {opacity:1, y:0, rotate:0, duration:0.9, ease:"bounce.out"}, ${f(at)});`); };
  for (const m of machines.slice(0, 2)) m.keys.forEach((k, j) => drop(`#s2-k-${m.id}-${j}`, W("v02", new RegExp(`^${k.p}`), k.n) - 0.4));
  const hl = (sel, at) => T(`tl.fromTo("${sel}", {backgroundColor:"#22241e00", color:"#d7d3c6"}, {backgroundColor:"#bd481f", color:"#fffdf7", duration:0.3, ease:"power2.out"}, ${f(at)});`);
  hl("#s2-a-m4-0", W("v02", /^EasyChamp/)); hl("#s2-a-m4-1", W("v02", /^EasyChamp/) + 0.12);
  hl("#s2-a-m1-0", W("v02", /^marketing/)); hl("#s2-a-m1-1", W("v02", /^marketing/) + 0.12);
  S(W("v02", /^EasyChamp/), "glitch", 0.5); S(W("v02", /^marketing/), "glitch", 0.5);
  T(`tl.to("#s2-m4", {y:-12, duration:0.22, yoyo:true, repeat:1, ease:"power2.out"}, ${f(W("v02", /^M4/))});`);
  T(`tl.to("#s2-m1", {y:-12, duration:0.22, yoyo:true, repeat:1, ease:"power2.out"}, ${f(W("v02", /^M1/))});`);
  const no = W("v02", /^Nothing/) - 0.1;
  S(no + 0.2, "stamp");
  T(`tl.fromTo("#s2-stamp", {opacity:0, scale:2.2, rotate:-14}, {opacity:1, scale:1, rotate:-5, duration:0.45, ease:"back.out(1.4)"}, ${f(no)});`);
  T(`tl.to("#s2 .mcard2", {y:-6, duration:0.12, yoyo:true, repeat:1, ease:"power1.out", stagger:0.03}, ${f(no + 0.3)});`);
}

// ---------- S3: only one subscription: pick the host; sessions run locally ----------
{
  const a = sceneStart("v03"), b = sceneEnd("v03");
  stepChip("st2b", a, b, "1", "One subscription? Pick its host");
  track++;
  const hosts = [
    { id: "old", name: "Old laptop", mem: "8 GB memory", disk: "40 GB free", m: 0.22, d: 0.08, bad: true, x: 300 },
    { id: "box", name: "Linux box", mem: "32 GB memory", disk: "600 GB free", m: 0.9, d: 0.82, bad: false, x: 1000 },
  ];
  T(`tl.set("#s3", {opacity:1}, ${f(a)}); tl.set("#s3", {opacity:0}, ${f(b)});`);
  add(`<div id="s3" class="scene paper untimed">
  <div class="grid"></div>
  <div class="s3-head">${title("s3-t", "Only one subscription?", "h2")}</div>
  ${hosts.map((h) => `<div id="s3-${h.id}" class="host" style="left:${h.x}px;top:430px">
    <div class="mc-name">${h.name}</div>
    <div class="hrow"><span>${h.mem}</span><div class="bar"><i id="s3-${h.id}-m" class="${h.bad ? "bad" : "good"}"></i></div></div>
    <div class="hrow"><span>${h.disk}</span><div class="bar"><i id="s3-${h.id}-d" class="${h.bad ? "bad" : "good"}"></i></div></div>
    <div class="verdict ${h.bad ? "no" : "yes"}" id="s3-${h.id}-v">${h.bad ? "✕" : icons.check}</div>
    ${h.bad ? "" : [0, 1, 2].map((k) => `<div class="sess" id="s3-s${k}"><span class="live"></span>session ${k + 1}</div>`).join("")}
  </div>`).join("")}
  <div id="s3-key" class="key2 solo" style="left:800px;top:300px"><span class="kdot c-claude"></span><b>Claude</b><em>your one subscription</em></div>
  <div id="s3-ram" class="polaroid" style="left:300px;top:800px"><video class="clip" src="media/px-ram.mp4" muted playsinline data-start="${f(a)}" data-duration="${f(b - a)}" data-media-start="0.5" data-playback-rate="0.9" data-track-index="${track + 40}"></video><span>memory</span></div>
  <div id="s3-ssd" class="polaroid" style="left:620px;top:800px"><video class="clip" src="media/px-ssd.mp4" muted playsinline data-start="${f(a)}" data-duration="${f(b - a)}" data-media-start="0.5" data-playback-rate="0.9" data-track-index="${track + 41}"></video><span>disk</span></div>
  <div id="s3-cloud" class="cloud" style="left:1640px;top:470px"><svg ${SVGNS} viewBox="0 0 120 80"><path d="M30 70h62a22 22 0 0 0 0-44 30 30 0 0 0-57-6A24 24 0 0 0 30 70z" fill="none" stroke="currentColor" stroke-width="5"/></svg><span>someone else's cloud</span><i id="s3-strike"></i></div>
</div>`);
  titleIn("s3-t", a + 0.35);
  S(a + 0.3, "swipe", 0.6);
  hosts.forEach((h, i) => rise(`#s3-${h.id}`, W("v03", /^Then/) - 0.3 + i * 0.12, 90, 0.85));
  pop("#s3-key", W("v03", /^subscription/) - 0.1, 0.3, "elastic.out(1, 0.55)", 1.0, "popHigh");
  // The key hovers over the old laptop, gets refused, then lands on the Linux box.
  const ch = W("v03", /^choose/);
  T(`tl.to("#s3-key", {x:-420, y:102, rotate:-4, duration:0.7, ease:"power3.inOut"}, ${f(ch - 0.1)});`);
  S(ch, "swipe", 0.5);
  pop("#s3-ram", W("v03", /^memory/) - 0.2, 0.4, "back.out(2.2)", 0.6, "pop");
  pop("#s3-ssd", W("v03", /^disk/) - 0.2, 0.4, "back.out(2.2)", 0.6, "pop");
  T(`tl.fromTo("#s3-ram", {rotate:-8}, {rotate:-3, duration:0.6, ease:"back.out(2)"}, ${f(W("v03", /^memory/) - 0.2)});`);
  T(`tl.fromTo("#s3-ssd", {rotate:7}, {rotate:3, duration:0.6, ease:"back.out(2)"}, ${f(W("v03", /^disk/) - 0.2)});`);
  hosts.forEach((h) => {
    T(`tl.fromTo("#s3-${h.id}-m", {scaleX:0}, {scaleX:${h.m}, duration:0.8, ease:"expo.out"}, ${f(W("v03", /^memory/))});`);
    T(`tl.fromTo("#s3-${h.id}-d", {scaleX:0}, {scaleX:${h.d}, duration:0.8, ease:"expo.out"}, ${f(W("v03", /^disk/))});`);
  });
  const sp = W("v03", /^space/);
  pop("#s3-old-v", sp - 0.1, 0.3, "back.out(3)", 0.5, "error");
  T(`tl.to("#s3-key", {x:"+=14", duration:0.06, yoyo:true, repeat:5, ease:"none"}, ${f(sp)});`);
  T(`tl.to("#s3-key", {x:280, y:102, rotate:0, duration:0.75, ease:"power3.inOut"}, ${f(sp + 0.45)});`);
  T(`tl.to("#s3-key", {scale:0.92, duration:0.12, yoyo:true, repeat:1, ease:"power2.out"}, ${f(sp + 1.15)});`);
  S(sp + 1.1, "thud", 0.8);
  pop("#s3-box-v", sp + 1.25, 0.3, "back.out(3)", 0.5, "chime");
  T(`tl.to(["#s3-ram", "#s3-ssd"], {opacity:0, y:40, duration:0.4, ease:"power2.in", stagger:0.06}, ${f(W("v03", /^session/) - 0.4)});`);
  [0, 1, 2].forEach((k) => T(`tl.fromTo("#s3-s${k}", {opacity:0, x:-30, scale:0.8}, {opacity:1, x:0, scale:1, duration:0.55, ease:"back.out(2.2)"}, ${f(W("v03", /^session/) + k * 0.16)});`));
  S(W("v03", /^session/), "typing", 0.45);
  T(`tl.to("#s3-box", {boxShadow:"0 0 0 6px #3f6b3a55, 0 40px 90px #22241e1c", duration:0.4, yoyo:true, repeat:1}, ${f(W("v03", /^your/))});`);
  pop("#s3-cloud", W("v03", /^not/) - 0.15, 0.4, "back.out(2.2)", 0.55, "popHigh");
  T(`tl.fromTo("#s3-strike", {scaleX:0}, {scaleX:1, duration:0.35, ease:"power3.out"}, ${f(W("v03", /^cloud/) - 0.05)});`);
  S(W("v03", /^cloud/), "error", 0.7);
}

// ---------- S3: private network, then the real Connections screen ----------
{
  const a = sceneStart("v04"), b = sceneEnd("v04");
  const cut = W("v04", /^Here/) - 0.35;
  stepChip("st3", a, b, "2", "Connect your machines");
  const nodes = [
    { id: "n1", name: "M4 Max", x: 300, y: 300 }, { id: "n2", name: "M1", x: 1420, y: 250 },
    { id: "n3", name: "M3", x: 1460, y: 700 }, { id: "n4", name: "Linux box", x: 340, y: 740 },
  ];
  const hub = { x: 960, y: 520 };
  track++;
  add(`<div id="net" class="clip scene paper" data-start="${f(a)}" data-duration="${f(cut + 0.6 - a)}" data-track-index="${track}">
  <div class="grid"></div>
  <svg class="wires" ${SVGNS} viewBox="0 0 1920 1080">${nodes.map((n) => `<path id="net-w-${n.id}" d="M${n.x + 130} ${n.y + 60} C ${(n.x + 130 + hub.x) / 2} ${n.y + 60}, ${(n.x + 130 + hub.x) / 2} ${hub.y}, ${hub.x} ${hub.y}" pathLength="1"/>`).join("")}</svg>
  ${nodes.map((n) => `<div id="net-${n.id}" class="node" style="left:${n.x}px;top:${n.y}px"><div class="mc-ico">${icons.laptop}</div><div><div class="mc-name">${n.name}</div><div class="srv" id="net-${n.id}-srv"><span class="live"></span>SpecWithCode server</div></div></div>`).join("")}
  <div id="net-hub" class="hub" style="left:${hub.x - 150}px;top:${hub.y - 58}px"><div class="hub-t">Private network</div><div class="routes"><span id="net-r0">LAN</span><span id="net-r1">SSH tunnel</span><span id="net-r2">Tailscale</span></div></div>
  ${nodes.map((n) => `<div class="packet" id="net-p-${n.id}"></div>`).join("")}
</div>`);
  // Real footage first, then the diagram opens out of it.
  const netIn = W("v04", /^connect/) - 0.25;
  track++;
  T(`tl.set("#net-film", {opacity:1}, ${f(a)}); tl.set("#net-film", {opacity:0}, ${f(netIn + 0.7)});`);
  add(`<div id="net-film" class="scene untimed"><video class="clip bg" src="media/px-network.mp4" muted playsinline data-start="${f(a)}" data-duration="${f(netIn + 0.7 - a)}" data-media-start="1" data-playback-rate="0.8" data-track-index="${track + 40}"></video><div class="vignette"></div><div class="film-t">${title("net-ft", "Every machine runs its own server", "h2 light")}</div></div>`);
  titleIn("net-ft", a + 0.4);
  T(`tl.fromTo("#net-film .bg", {scale:1.12}, {scale:1, duration:${f(netIn - a)}, ease:"power1.out"}, ${f(a)});`);
  T(`tl.to("#net-film", {clipPath:"circle(0% at 50% 50%)", duration:0.7, ease:"power3.inOut"}, ${f(netIn)});`);
  T(`tl.set("#net-film", {clipPath:"circle(80% at 50% 50%)"}, ${f(a)});`);
  S(netIn, "whooshDeep", 0.7);
  nodes.forEach((n, i) => pop(`#net-${n.id}`, netIn + 0.3 + i * 0.12, 0.3, "back.out(2.2)", 0.7, i % 2 ? "popHigh" : "pop"));
  nodes.forEach((n, i) => T(`tl.fromTo("#net-${n.id}-srv", {opacity:0, x:-12}, {opacity:1, x:0, duration:0.4, ease:"back.out(2)"}, ${f(netIn + 0.6 + i * 0.08)});`));
  pop("#net-hub", W("v04", /^privately/) - 0.3, 0.3, "elastic.out(1, 0.6)", 1.0);
  nodes.forEach((n, i) => T(`tl.fromTo("#net-w-${n.id}", {strokeDashoffset:1}, {strokeDashoffset:0, duration:0.8, ease:"power2.inOut"}, ${f(W("v04", /^privately/) + i * 0.1)});`));
  [[/^network/, 0], [/^SSH/, 1], [/^tail/, 2]].forEach(([re, i]) => pop(`#net-r${i}`, W("v04", re) - 0.05, 0.3, "back.out(3)", 0.5));
  nodes.forEach((n, i) => T(`tl.fromTo("#net-p-${n.id}", {opacity:0, x:${n.x + 130 - 9}, y:${n.y + 60 - 9}}, {opacity:1, x:${hub.x - 9}, y:${hub.y - 9}, duration:0.9, ease:"power2.in", repeat:2, repeatDelay:0.3}, ${f(W("v04", /^tail/) + 0.3 + i * 0.15)});`));
  [0, 1, 2].forEach((k) => S(W("v04", /^tail/) + 1.2 + k * 1.2, "glitch", 0.35));
  T(`tl.to("#net", {scale:2.4, x:-200, y:-120, opacity:0, duration:0.6, ease:"power3.in"}, ${f(cut)});`);
  // Real screen: Settings > Connections. The card row is at y 106..641 in the 1080p frame.
  const tk = takes.connections; const ms = tk.t0Offset + 0.4;
  take("connections", "netr", cut + 0.3, b, ms, {
    zooms: [{ at: cut + 0.3, s: 1.55, cx: 1088, cy: 330, d: 1.3, ease: "expo.out" }],
    rings: [
      { x: 634, y: 276, w: 160, h: 20, at: W("v04", /^M4/) + 0.1, zoom: 1.55, until: W("v04", /^M1/) + 0.6 },
      { x: 952, y: 328, w: 272, h: 28, at: W("v04", /^paired/) - 0.2, zoom: 1.55, until: b },
      { x: 1270, y: 328, w: 272, h: 28, at: W("v04", /^paired/), zoom: 1.55, until: b },
    ],
    callouts: [{ x: 560, y: 900, html: `<b>Tailscale</b> · private HTTPS between your machines`, at: W("v04", /^M1/) + 0.2, until: W("v04", /^paired/) - 0.4 }],
  });
}

// ---------- S4: limits in one place, CLIProxyAPI hub, what happens when one runs dry ----------
{
  const a = sceneStart("v05"), b = sceneEnd("v05");
  const hubAt = W("v05", /^Pool/) - 0.3;
  stepChip("st4", a, b, "3", "Limits and fallbacks");
  const tk = takes.usage; const ms = tk.t0Offset + 0.0;
  const pop0 = a + 3.27; // popover opens 3.27 s into the take
  take("usage", "s4r", a, hubAt + 0.5, ms, {
    zooms: [{ at: a + 0.2, s: 1.6, cx: 900, cy: 900, d: 1.2 }, { at: pop0 + 0.1, s: 2.35, cx: 985, cy: 850, d: 1.1, ease: "expo.out" }],
    rings: [
      { x: 801, y: 920, w: 358, h: 62, at: W("v05", /^Session/), zoom: 2.35, until: W("v05", /^banked/) - 0.2 },
      { x: 1052, y: 806, w: 108, h: 20, at: W("v05", /^banked/), zoom: 2.35, until: W("v05", /^credits/) + 0.3 },
      { x: 801, y: 853, w: 300, h: 18, at: W("v05", /^credits/), zoom: 2.35, until: hubAt + 0.4 },
    ],
  });
  track++;
  const accts = ["Claude · account A", "Claude · account B", "Codex · account C"];
  add(`<div id="s4h" class="clip scene paper" data-start="${f(hubAt)}" data-duration="${f(b - hubAt)}" data-track-index="${track}">
  <div class="grid"></div>
  <svg class="wires" ${SVGNS} viewBox="0 0 1920 1080">${accts.map((_, i) => `<path id="s4-w${i}" d="M560 ${300 + i * 150} C 680 ${300 + i * 150}, 680 450, 800 450" pathLength="1"/>`).join("")}<path id="s4-w3" d="M1120 450 L1290 450" pathLength="1"/></svg>
  ${accts.map((n, i) => `<div id="s4-a${i}" class="acct" style="left:220px;top:${266 + i * 150}px"><span class="kdot ${i < 2 ? "c-claude" : "c-codex"}"></span>${n}</div>`).join("")}
  <div id="s4-hub" class="hubcard" style="left:800px;top:372px"><div class="eyebrow">open source</div><div class="hub-name">CLIProxyAPI hub</div><div class="hub-sub">pools your accounts</div></div>
  <div id="s4-usage" class="usage" style="left:1290px;top:300px"><div class="eyebrow">SpecWithCode · Usage</div>
    ${["Claude A", "Claude B", "Codex C"].map((n, i) => `<div class="urow"><span>${n}</span><div class="bar"><i id="s4-b${i}"></i></div></div>`).join("")}
    <div class="ufoot">Settings → Providers → Usage providers → Add hub</div></div>
  <div id="s4-opts" class="opts">${["Wait for the reset", "Switch provider", "Move to another machine"].map((o, i) => `<span id="s4-o${i}">${o}</span>`).join("")}</div>
</div>`);
  T(`tl.fromTo("#s4h", {clipPath:"circle(0% at 50% 50%)"}, {clipPath:"circle(75% at 50% 50%)", duration:0.7, ease:"power3.inOut"}, ${f(hubAt)});`);
  accts.forEach((_, i) => rise(`#s4-a${i}`, W("v05", /^Pool/) - 0.1 + i * 0.1, 30, 0.6));
  pop("#s4-hub", W("v05", /^CLI/) - 0.1, 0.3, "elastic.out(1, 0.6)", 1.0);
  [0, 1, 2].forEach((i) => T(`tl.fromTo("#s4-w${i}", {strokeDashoffset:1}, {strokeDashoffset:0, duration:0.6, ease:"power2.inOut"}, ${f(W("v05", /^CLI/) + 0.3 + i * 0.08)});`));
  T(`tl.fromTo("#s4-w3", {strokeDashoffset:1}, {strokeDashoffset:0, duration:0.5, ease:"power2.inOut"}, ${f(W("v05", /^show/) )});`);
  pop("#s4-usage", W("v05", /^show/) + 0.2, 0.5, "back.out(2)", 0.7);
  [0.62, 0.31, 0.78].forEach((v, i) => T(`tl.fromTo("#s4-b${i}", {scaleX:0}, {scaleX:${v}, duration:0.9, ease:"expo.out"}, ${f(W("v05", /^accounts/, 0) + i * 0.12)});`));
  const dry = W("v05", /^dry/);
  T(`tl.to("#s4-b2", {scaleX:1, backgroundColor:"#c2412d", duration:0.6, ease:"power2.in"}, ${f(dry - 0.6)});`);
  T(`tl.to("#s4-usage", {x:"+=8", duration:0.06, yoyo:true, repeat:5, ease:"none"}, ${f(dry)});`);
  S(dry, "error", 0.7);
  [[/^wait/i, 0], [/^provider/, 1], [/^machine/, 2]].forEach(([re, i]) => pop(`#s4-o${i}`, W("v05", re) - 0.15, 0.3, "back.out(2.6)", 0.55));
}

// ---------- S5: coordinator fans out to threads ----------
const threadsData = [
  { t: "Reusable team tactical templates", st: "Working", c: "work", m: "M4 Max", mod: "Claude Opus 5.5", pr: "PR #411" },
  { t: "Club finance: budget vs actuals", st: "Needs review", c: "review", m: "M4 Max", mod: "Claude Opus 5.5", pr: "PR #227" },
  { t: "Independent review round 2", st: "Ready", c: "ready", m: "M4 Max", mod: "Claude Opus 5.5", pr: "" },
  { t: "Fix budget i18n · es, pt-BR", st: "Ready", c: "ready", m: "M4 Max", mod: "Claude Sonnet 5.5", pr: "" },
  { t: "Translate 22 new UI strings", st: "Ready", c: "ready", m: "M4 Max", mod: "Codex GPT-5.6", pr: "" },
];
{
  const a = sceneStart("v06"), b = sceneEnd("v06");
  stepChip("st5", a, b, "4", "One coordinator, many threads");
  track++;
  add(`<div id="s5" class="clip scene paper" data-start="${f(a)}" data-duration="${f(b - a)}" data-track-index="${track}">
  <div class="grid"></div>
  <svg class="wires" ${SVGNS} viewBox="0 0 1920 1080"><path id="s5-w0" d="M330 540 L560 540" pathLength="1"/>${threadsData.map((_, i) => `<path id="s5-t${i}w" d="M900 540 C 1000 540, 1000 ${250 + i * 150}, 1090 ${250 + i * 150}" pathLength="1"/>`).join("")}</svg>
  <div id="s5-you" class="you" style="left:150px;top:470px"><div class="avatar">A</div><div>You</div></div>
  <div id="s5-coord" class="coord" style="left:560px;top:450px"><div class="eyebrow">EasyChamp</div><div class="coord-name">Coordinator</div><div class="coord-sub">plans · delegates · reports back</div></div>
  ${threadsData.map((th, i) => `<div id="s5-t${i}" class="trow" style="left:1090px;top:${200 + i * 150}px"><span class="sdot ${th.c}"></span><div class="tmain"><div class="ttitle">${esc(th.t)}</div><div class="tmeta"><span class="tag mach">${th.m}</span><span class="tag model">${th.mod}</span>${th.pr ? `<span class="tag pr">${th.pr}</span>` : ""}</div></div><span class="tstat ${th.c}">${th.st}</span></div>`).join("")}
</div>`);
  pop("#s5-you", a + 0.3, 0.3, "back.out(2.4)");
  T(`tl.fromTo("#s5", {scale:1}, {scale:1.035, duration:${f(b - a)}, ease:"none"}, ${f(a)});`);
  T(`tl.fromTo("#s5-w0", {strokeDashoffset:1}, {strokeDashoffset:0, duration:0.5, ease:"power2.inOut"}, ${f(W("v06", /^talk/) - 0.2)});`);
  pop("#s5-coord", W("v06", /^coordinator/) - 0.25, 0.3, "elastic.out(1, 0.6)", 1.0);
  const st = W("v06", /^starts/);
  threadsData.forEach((_, i) => {
    T(`tl.fromTo("#s5-t${i}w", {strokeDashoffset:1}, {strokeDashoffset:0, duration:0.45, ease:"power2.out"}, ${f(st + i * 0.14)});`);
    T(`tl.fromTo("#s5-t${i}", {opacity:0, x:-60, scale:0.85}, {opacity:1, x:0, scale:1, duration:0.7, ease:"back.out(1.9)"}, ${f(st + 0.15 + i * 0.14)});`);
  });
  T(`tl.fromTo("#s5 .tag.mach", {backgroundColor:"#fffdf7"}, {backgroundColor:"#f3dccf", duration:0.25, yoyo:true, repeat:1, stagger:0.06}, ${f(W("v06", /^machine/))});`);
  T(`tl.fromTo("#s5 .tag.model", {backgroundColor:"#fffdf7"}, {backgroundColor:"#f3dccf", duration:0.25, yoyo:true, repeat:1, stagger:0.06}, ${f(W("v06", /^model/))});`);
  T(`tl.to("#s5-coord", {scale:1.05, duration:0.18, yoyo:true, repeat:1, ease:"power1.out"}, ${f(st - 0.1)});`);
}

// ---------- S6: the real EasyChamp project ----------
{
  const a = sceneStart("v07"), b = sceneEnd("v07");
  stepChip("st6", a, b, "4", "A real project: EasyChamp");
  const tk = takes.project; const ms = tk.t0Offset + 5.0;
  // Threads panel occupies x 1460..1920. Row boxes (1080p): finance y~170-215, tactical ~275-320, idle rows from ~380.
  const Z = 1.95;
  take("project", "s6r", a, b, ms, {
    zooms: [{ at: a + 0.2, s: 1.25, cx: 1300, cy: 420, d: 1.0 }, { at: a + 1.6, s: Z, cx: 1690, cy: 400, d: 1.2, ease: "expo.inOut" }, { at: W("v07", /^Others/) + 0.6, s: 1.7, cx: 1690, cy: 650, d: 1.4 }],
    rings: [
      { x: 1478, y: 274, w: 432, h: 50, at: W("v07", /^shipping/), zoom: Z, until: W("v07", /^Another/) },
      { x: 1478, y: 170, w: 432, h: 50, at: W("v07", /^club/i), zoom: Z, until: W("v07", /^Others/) },
      { x: 1478, y: 380, w: 432, h: 170, at: W("v07", /^independent/i), zoom: 1.7, until: W("v07", /^Each/) },
      { x: 1792, y: 287, w: 66, h: 24, at: W("v07", /^pull/), zoom: 1.7, until: b },
      { x: 1792, y: 183, w: 66, h: 24, at: W("v07", /^pull/) + 0.15, zoom: 1.7, until: b },
    ],
    callouts: [
      { x: 160, y: 820, html: `<span class="sdot work"></span>Working · <b>PR #411</b>`, at: W("v07", /^tactical/) + 0.2, until: W("v07", /^Another/) },
      { x: 160, y: 820, html: `<span class="sdot review"></span>Needs review · <b>PR #227</b>`, at: W("v07", /^review/), until: W("v07", /^Others/) + 0.3 },
    ],
  });
}

// ---------- S7: inside a thread ----------
{
  const a = sceneStart("v08"), b = sceneEnd("v08");
  stepChip("st7", a, b, "4", "Inside a thread");
  const tk = takes.coordinator; const rate = 1.6; const ms = tk.t0Offset + 6.6;
  const open = a + (11.69 - 6.6) / rate;
  take("coordinator", "s7r", a, b, ms, {
    rate,
    zooms: [{ at: a + 0.1, s: 1.6, cx: 760, cy: 880, d: 0.9 }, { at: open - 0.2, s: 1.45, cx: 1494, cy: 520, d: 1.2, ease: "expo.inOut" }, { at: W("v08", /^Reply/) - 0.3, s: 1.45, cx: 1494, cy: 760, d: 1.0 }],
    rings: [{ x: 1128, y: 918, w: 732, h: 140, at: W("v08", /^Reply/) + 0.2, zoom: 1.45, until: b }],
    callouts: [{ x: 120, y: 120, html: `Replies go <b>through the coordinator</b>, with the thread as context`, at: W("v08", /^coordinator/) - 0.2, until: b - 0.2 }],
  });
  S(W("v08", /^Reply/) + 0.1, "typing", 0.4);
  track++; clip("div", "s7-sped", a, open, "sped", "", `Sped up ${rate}×`);
  fade("#s7-sped", a + 0.3, 0.25);
}

// ---------- S8: verification ----------
{
  const a = sceneStart("v09"), b = sceneEnd("v09");
  const real = W("v09", /^Anything/) - 0.4;
  stepChip("st8", a, b, "5", "Verified, not just done");
  track++;
  const checks = ["Every pull request merged", "Checks pass", "Review approved"];
  T(`tl.set("#s8", {opacity:1}, ${f(a)}); tl.set("#s8", {opacity:0}, ${f(real + 0.5)});`);
  add(`<div id="s8" class="scene paper untimed">
  <div class="grid"></div>
  <div class="s8-top"><span id="s8-done" class="big">Done</span><span id="s8-ne" class="big ne">≠</span><span id="s8-ver" class="big ver">Verified</span></div>
  <div id="s8-you" class="vcard withmedia" style="left:240px;top:330px"><div class="vmedia"><video class="clip" src="media/px-review.mp4" muted playsinline data-start="${f(a)}" data-duration="${f(real + 0.5 - a)}" data-media-start="1" data-playback-rate="0.85" data-track-index="${track + 40}"></video></div><div class="eyebrow">option 1</div><div class="vt">Check it yourself</div><div class="vs">run the check, read the receipt</div></div>
  <div id="s8-or" class="or" style="left:780px;top:520px">or</div>
  <div id="s8-auto" class="vcard auto" style="left:900px;top:340px"><div class="eyebrow">option 2 · on by default</div><div class="vt">Auto-resolve</div>
    ${checks.map((c, i) => `<div class="crow" id="s8-c${i}"><span class="cbox">${icons.check}</span>${c}</div>`).join("")}
    <div class="res"><span id="s8-res" class="tstat work">Working</span></div></div>
</div>`);
  ["#s8-done", "#s8-ne", "#s8-ver"].forEach((s, i) => pop(s, a + 0.35 + [0, W("v09", /^not/) - a - 0.6, W("v09", /^verified/) - a - 0.5][i], 0.3, "back.out(2.4)", 0.6));
  rise("#s8-you", W("v09", /^check/) - 0.3, 60, 0.8);
  pop("#s8-or", W("v09", /^or/) - 0.1, 0.3, "back.out(3)", 0.4);
  rise("#s8-auto", W("v09", /^auto/i) - 0.3, 60, 0.8);
  [[/^merged/, 0], [/^pass/, 1], [/^approved/, 2]].forEach(([re, i]) => {
    T(`tl.fromTo("#s8-c${i}", {opacity:0.35}, {opacity:1, duration:0.2}, ${f(W("v09", re) - 0.1)});`);
    S(W("v09", re) - 0.05, "tick");
    T(`tl.fromTo("#s8-c${i} .cbox", {scale:0.3, backgroundColor:"#fffdf7"}, {scale:1, backgroundColor:"#3f6b3a", duration:0.5, ease:"back.out(3)"}, ${f(W("v09", re) - 0.1)});`);
  });
  const res = W("v09", /^approved/) + 0.45;
  T(`tl.to("#s8-res", {scale:0.6, opacity:0, duration:0.15, ease:"power2.in"}, ${f(res)});`);
  T(`tl.set("#s8-res", {textContent:"Resolved", className:"tstat ready resolved"}, ${f(res + 0.15)});`);
  T(`tl.to("#s8-res", {scale:1, opacity:1, duration:0.5, ease:"back.out(3)"}, ${f(res + 0.15)});`);
  S(res + 0.15, "chime", 0.8);
  T(`tl.to("#s8", {opacity:0, duration:0.4}, ${f(real)});`);
  const tk = takes.autoresolve; const ms = tk.t0Offset + 3.0;
  take("autoresolve", "s8r", real, b, ms, {
    zooms: [{ at: real, s: 1.0, cx: 960, cy: 540, d: 0.01 }, { at: real + 0.1, s: 1.9, cx: 1000, cy: 600, d: 1.3, ease: "expo.out" }],
    // Toggle measured from the 4K take: x 1465, y 629, 30x18 at 1080p.
    rings: [{ x: 1465, y: 629, w: 30, h: 18, pad: 4, radius: 999, at: real + 1.1, zoom: 1.9, until: b }],
    callouts: [{ x: 360, y: 930, html: `Unknown evidence keeps the thread <b>waiting for you</b>`, at: real + 1.3, until: b - 0.2 }],
  });
}

// ---------- S9: which machines ----------
{
  const a = sceneStart("v10"), b = sceneEnd("v10");
  stepChip("st9", a, b, "6", "Which machines?");
  track++;
  const cards = [
    { id: "lin", os: "Linux", tag: "Fastest workers", vid: "px-linux.mp4", notes: ["Run most worker threads here"] },
    { id: "win", os: "Windows", tag: "A solid worker", vid: "px-tower.mp4", notes: ["Dev Drive for file-heavy work"] },
    { id: "mac", os: "macOS", tag: "The orchestrator", vid: "px-macbook.mp4", notes: ["Chrome and marketing tools", "iOS builds", "Computer use"] },
  ];
  T(`tl.set("#s9", {opacity:1}, ${f(a)}); tl.set("#s9", {opacity:0}, ${f(b)});`);
  add(`<div id="s9" class="scene paper untimed">
  <div class="grid"></div>
  ${cards.map((c, i) => `<div id="s9-${c.id}" class="oscard" style="left:${150 + i * 560}px;top:200px">
    <div class="osmedia">${c.vid ? `<video id="s9-v${i}" class="clip" src="media/${c.vid}" muted playsinline data-start="${f(a)}" data-duration="${f(b - a)}" data-media-start="0" data-playback-rate="0.8" data-track-index="${track + 40 + i}"></video>` : `<div class="winart">${icons.tower}</div>`}</div>
    <div class="osname">${c.os}</div><div id="s9-${c.id}-tag" class="ostag">${c.tag}</div>
    ${c.notes.map((n, j) => `<div class="osnote" id="s9-${c.id}-n${j}">${icons.check}${n}</div>`).join("")}
    ${c.id === "mac" ? `<div id="s9-apfs" class="apfs">APFS is slow for agent file churn</div>` : ""}
  </div>`).join("")}
</div>`);
  const tag = (id, re) => { rise(`#s9-${id}`, W("v10", re) - 0.4, 80, 0.8); T(`tl.fromTo("#s9-${id}-tag", {opacity:0, scale:0.5}, {opacity:1, scale:1, duration:0.6, ease:"back.out(2.6)"}, ${f(W("v10", re) + 0.25)});`); };
  T(`tl.fromTo("#s9", {scale:1}, {scale:1.03, duration:${f(b - a)}, ease:"none"}, ${f(a)});`);
  tag("lin", /^Linux/); tag("win", /^Windows/); tag("mac", /^Mac/);
  T(`tl.fromTo("#s9-lin-n0", {opacity:0, x:-14}, {opacity:1, x:0, duration:0.4, ease:"back.out(2)"}, ${f(W("v10", /^fastest/) + 0.3)});`);
  T(`tl.fromTo("#s9-win-n0", {opacity:0, x:-14}, {opacity:1, x:0, duration:0.4, ease:"back.out(2)"}, ${f(W("v10", /^solid/) + 0.3)});`);
  T(`tl.fromTo("#s9-apfs", {opacity:0, y:20, rotate:-3}, {opacity:1, y:0, rotate:-2, duration:0.5, ease:"back.out(2.4)"}, ${f(W("v10", /^APFS/) - 0.1)});`);
  [[/^Chrome/, 0], [/^iOS/, 1], [/^computer/, 2]].forEach(([re, j]) => T(`tl.fromTo("#s9-mac-n${j}", {opacity:0, x:-18}, {opacity:1, x:0, duration:0.45, ease:"back.out(2.4)"}, ${f(W("v10", re) - 0.1)});`));
  T(`tl.to("#s9-lin", {y:-14, duration:0.2, yoyo:true, repeat:1, ease:"power2.out"}, ${f(W("v10", /^fastest/))});`);
  T(`tl.to("#s9-mac", {y:-14, duration:0.2, yoyo:true, repeat:1, ease:"power2.out"}, ${f(W("v10", /^orchestrate/))});`);
}

// ---------- S11: what a good worker looks like ----------
{
  const a = sceneStart("v11"), b = sceneEnd("v11");
  stepChip("st11", a, b, "6", "A good worker");
  track++;
  const tiles = [
    { id: "cpu", big: "8", unit: "cores", sub: "or more", vid: "px-tower.mp4", re: /^eight/ },
    { id: "mem", big: "32", unit: "GB memory", sub: "64 GB for browser-heavy work", vid: "px-ram.mp4", re: /^32|^thirty/ },
    { id: "ssd", big: "SSD", unit: "a few hundred GB free", sub: "local NVMe, not network storage", vid: "px-ssd.mp4", re: /^SSD/ },
  ];
  T(`tl.set("#s11", {opacity:1}, ${f(a)}); tl.set("#s11", {opacity:0}, ${f(b)});`);
  add(`<div id="s11" class="scene paper untimed">
  <div class="grid"></div>
  <div class="s3-head">${title("s11-t", "A good worker machine", "h2")}</div>
  ${tiles.map((t, i) => `<div id="s11-${t.id}" class="spec" style="left:${150 + i * 560}px;top:300px">
    <div class="smedia"><video class="clip" src="media/${t.vid}" muted playsinline data-start="${f(a)}" data-duration="${f(b - a)}" data-media-start="1" data-playback-rate="0.8" data-track-index="${track + 40 + i}"></video></div>
    <div class="sbig"><b id="s11-${t.id}-n">${t.big}</b><span>${t.unit}</span></div><div class="ssub">${t.sub}</div>
  </div>`).join("")}
  <div id="s11-per" class="peragent"><span class="pa-eb">every parallel agent</span><span class="pa-v" id="s11-pa0">≈ 4 GB memory</span><span class="pa-plus">+</span><span class="pa-v" id="s11-pa1">≈ 10 GB disk</span></div>
</div>`);
  titleIn("s11-t", a + 0.35); S(a + 0.3, "swipe", 0.6);
  tiles.forEach((t, i) => {
    const at = W("v11", t.re) - 0.35;
    T(`tl.fromTo("#s11-${t.id}", {opacity:0, y:120, rotate:${[-4, 0, 4][i]}}, {opacity:1, y:0, rotate:0, duration:0.8, ease:"back.out(1.6)"}, ${f(at)});`);
    S(at + 0.1, i === 1 ? "whoosh" : "swipe", 0.6);
    T(`tl.fromTo("#s11-${t.id}-n", {scale:0.3}, {scale:1, duration:0.6, ease:"elastic.out(1, 0.5)"}, ${f(at + 0.3)});`);
    S(at + 0.35, "popHigh", 0.8);
  });
  pop("#s11-per", W("v11", /^Budget/) - 0.2, 0.5, "back.out(2.2)", 0.6, "pop");
  pop("#s11-pa0", W("v11", /^four/) - 0.1, 0.3, "back.out(3)", 0.5, "tick");
  pop("#s11-pa1", W("v11", /^10|^ten/) - 0.1, 0.3, "back.out(3)", 0.5, "tick");
  T(`tl.to("#s11 .spec", {y:-10, duration:0.18, yoyo:true, repeat:1, ease:"power2.out", stagger:0.08}, ${f(W("v11", /^parallel/))});`);
  S(W("v11", /^parallel/), "chime", 0.6);
}

// ---------- S10: outro ----------
{
  const a = sceneStart("v12"), b = END;
  track++;
  T(`tl.set("#s10", {opacity:1}, ${f(a)});`);
  add(`<div id="s10" class="scene paper untimed">
  <div class="grid"></div>
  <div id="s10-win" class="window"><div class="wbar"><i></i><i></i><i></i><span>SpecWithCode · Control desk</span></div><video id="s10-v" class="clip" src="media/desk.mp4" muted playsinline data-start="${f(a)}" data-duration="${f(b - a)}" data-media-start="${f(takes.desk.t0Offset)}" data-playback-rate="1" data-track-index="${track + 40}"></video></div>
  <div class="s10-words"><span id="s10-w0">Your machines.</span><span id="s10-w1">Your subscriptions.</span><span id="s10-w2" class="acc">One control desk.</span></div>
  <div id="s10-brand" class="s10-brand"><div class="mark dark">SpecWithCode</div><div class="team-line"></div><div class="s10-url">open source · <b>spec-weave.com/code</b></div></div>
</div>`);
  T(`tl.fromTo("#s10-win", {opacity:0, y:120, rotateX:18, scale:0.85}, {opacity:1, y:0, rotateX:0, scale:1, duration:1.2, ease:"expo.out"}, ${f(a + 0.1)});`);
  [[/^machines/, 0], [/^subscriptions/, 1], [/^control/, 2]].forEach(([re, i]) => pop(`#s10-w${i}`, W("v12", re) - 0.3, 0.5, "back.out(2.6)", 0.6));
  const brand = W("v12", /^Spec/) - 0.2;
  T(`tl.to("#s10-win", {scale:0.6, y:-40, opacity:0, duration:0.6, ease:"power3.in"}, ${f(brand - 0.3)});`);
  T(`tl.to(".s10-words", {y:-260, opacity:0, duration:0.5, ease:"power3.in"}, ${f(brand - 0.3)});`);
  S(brand - 1.0, "riser", 0.6);
  pop("#s10-brand", brand + 0.2, 0.3, "elastic.out(1, 0.6)", 1.1, "impact");
  S(brand + 0.7, "sparkle", 0.6);
  T(`tl.fromTo("#s10-brand .team-line", {scaleX:0}, {scaleX:1, duration:0.8, ease:"expo.out"}, ${f(brand + 0.6)});`);
  T(`tl.fromTo("#s10-brand .s10-url", {opacity:0, y:16}, {opacity:1, y:0, duration:0.5, ease:"expo.out"}, ${f(W("v12", /^open/) - 0.1)});`);
}

// ---------- narration + captions ----------
track = 90;
const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = (x % 60).toFixed(3).padStart(6, "0"); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s}`; };
for (const l of vo.lines) {
  add(`<audio id="vo-${l.id}" src="media/vo/${l.id}.wav" data-start="${f(start[l.id])}" data-duration="${f(dur(l.id))}" data-track-index="90" data-volume="1"></audio>`);
  // Captions: break the words into chunks of up to ~42 characters.
  let cur = [];
  const flush = () => { if (!cur.length) return; vtt.push(`${ts(start[l.id] + cur[0].start)} --> ${ts(start[l.id] + cur.at(-1).end)}\n${cur.map((w) => w.word.trim()).join(" ")}`); cur = []; };
  const fixes = { Clawed: "Claude", codex: "Codex", "Spec": "SpecWith", };
  for (const w0 of words[l.id]) {
    const w = { ...w0, word: w0.word.replace(/Clawed/, "Claude").replace(/\bcodex\b/, "Codex").replace(/tail scale/i, "Tailscale").replace(/anti-gravity/i, "Antigravity") };
    cur.push(w);
    const len = cur.map((x) => x.word.trim()).join(" ").length;
    if (len > 38 || /[.?!,:]$/.test(w.word.trim()) && len > 18) flush();
  }
  flush();
}
let vttText = "WEBVTT\n\n" + vtt.join("\n\n") + "\n";
vttText = vttText.replace(/Spec with [Cc]ode/g, "SpecWithCode").replace(/\btail scale\b/gi, "Tailscale").replace(/CLI proxy API/g, "CLIProxyAPI").replace(/auto resolve/g, "auto-resolve");

const css = readFileSync(here + "scripts/style.css", "utf8");
const doc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>How SpecWithCode works</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${END}">
${html.join("\n")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${tw.join("\n")}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
let vn = 0;
writeFileSync(here + "hyperframes/index.html", doc.replace(/<video class=/g, () => `<video id="vid${++vn}" class=`));
writeFileSync(here + "hyperframes/captions.en.vtt", vttText);
// Whooshes on scene changes; then drop sound cues that crowd each other (keep the first).
for (const id of ids.slice(1)) S(sceneStart(id) - 0.15, ["v04", "v07", "v10", "v12"].includes(id) ? "whooshDeep" : "whoosh", 0.7);
sfx.sort((x, y) => x.t - y.t);
const kept = []; for (const c of sfx) if (!kept.length || c.t - kept.at(-1).t > 0.14) kept.push(c);
writeFileSync(here + "hyperframes/sfx.json", JSON.stringify(kept));
console.log("duration", END, "tweens", tw.length, "starts", JSON.stringify(start));
