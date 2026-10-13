// Writes short/index.html and short/captions.en.vtt: the 9:16 cut. Each narration line gets a
// headline, a window onto the matching part of the main render (short/media/main.mp4), and
// word-by-word captions.
import { readFileSync, writeFileSync } from "node:fs";
const here = new URL("..", import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(here + p, "utf8"));
const vo = read("scripts/vo-lines-short.json");
const words = Object.fromEntries(vo.lines.map((l) => [l.id, read(`vo-words/${l.id}.json`).words]));
const dur = (id) => words[id].at(-1).end + 0.2;
const plan = {
  s01: { head: "One machine,<br>one subscription", segs: [[22.0, 99]] },
  s02: { head: "Connected over<br>Tailscale", segs: [[44.6, 2.6], [57.4, 99]] },
  s03: { head: "One coordinator.<br>Many threads.", segs: [[79.4, 99]] },
  s04: { head: "Auto-resolve, only<br>when it's verified", segs: [[119.4, 99]] },
  s05: { head: "Linux for speed.<br>Mac to orchestrate.", segs: [[131.0, 3.6], [148.9, 99]] },
};
const start = {}; let t = 0.5;
for (const l of vo.lines) { start[l.id] = +t.toFixed(2); t += dur(l.id) + 0.45; }
const END = +(t + 1.2).toFixed(2);
const f = (n) => (+n).toFixed(3);
const html = []; const tw = []; const vtt = [];
const T = (s) => tw.push(s);
let vid = 0;
vo.lines.forEach((l, i) => {
  const a = i === 0 ? 0 : start[l.id] - 0.3; const b = i + 1 < vo.lines.length ? start[vo.lines[i + 1].id] - 0.3 : END;
  const p = plan[l.id];
  html.push(`<div id="h-${l.id}" class="clip head" data-start="${f(a)}" data-duration="${f(b - a)}" data-track-index="2">${p.head.split("<br>").map((x) => `<div class="hl"><span>${x}</span></div>`).join("")}</div>`);
  T(`tl.fromTo("#h-${l.id} .hl > span", {yPercent:110}, {yPercent:0, duration:0.7, ease:"expo.out", stagger:0.08}, ${f(a + 0.05)});`);
  let s = a;
  p.segs.forEach(([from, len], j) => {
    const e = j + 1 < p.segs.length ? Math.min(b, s + len) : b; vid++;
    html.push(`<video id="m${vid}" class="clip shot" src="media/main.mp4" muted playsinline data-start="${f(s)}" data-duration="${f(e - s)}" data-media-start="${f(from)}" data-playback-rate="1" data-track-index="1"></video>`);
    T(`tl.fromTo("#m${vid}", {scale:0.94, opacity:0}, {scale:1, opacity:1, duration:0.45, ease:"back.out(1.8)"}, ${f(s)});`);
    s = e;
  });
  html.push(`<audio id="vo-${l.id}" src="media/vo/${l.id}.wav" data-start="${f(start[l.id])}" data-duration="${f(dur(l.id))}" data-track-index="9" data-volume="1"></audio>`);
  // Captions in chunks of up to ~22 characters; the spoken word turns accent.
  const fix = (w) => w.replace(/^Spec$/, "SpecWithCode").replace(/^tail$/, "Tailscale").replace(/^Auto$/, "Auto-resolve");
  const ws = []; const raw = words[l.id];
  for (let k = 0; k < raw.length; k++) {
    let w = raw[k].word.trim(); let end = raw[k].end;
    if (/^Spec$/.test(w) && raw[k + 2] && /^code/i.test(raw[k + 2].word.trim())) { w = "SpecWithCode" + raw[k + 2].word.trim().replace(/^code/i, ""); end = raw[k + 2].end; k += 2; }
    else if (/^tail$/.test(w) && raw[k + 1]) { w = "Tailscale"; end = raw[k + 1].end; k += 1; }
    else if (/^Auto$/.test(w) && raw[k + 1]) { w = "Auto-resolve"; end = raw[k + 1].end; k += 1; }
    if (/^\./.test(w) && ws.length) { ws.at(-1).w += w; ws.at(-1).e = end; continue; }
    ws.push({ w: fix(w), s: raw[k].start, e: end, s0: raw[k].start });
  }
  // recompute starts for merged words
  let chunks = [], cur = [];
  for (const x of ws) { cur.push(x); const len = cur.map((y) => y.w).join(" ").length; if (len > 20 || /[.,]$/.test(x.w)) { chunks.push(cur); cur = []; } }
  if (cur.length) chunks.push(cur);
  chunks.forEach((c, ci) => {
    const cs = start[l.id] + c[0].s - 0.05, ce = ci + 1 < chunks.length ? start[l.id] + chunks[ci + 1][0].s - 0.05 : start[l.id] + c.at(-1).e + 0.25;
    const id = `c-${l.id}-${ci}`;
    html.push(`<div id="${id}" class="clip cap" data-start="${f(cs)}" data-duration="${f(ce - cs)}" data-track-index="3">${c.map((x, k) => `<span id="${id}-${k}">${x.w}</span>`).join(" ")}</div>`);
    T(`tl.fromTo("#${id}", {scale:0.8, opacity:0}, {scale:1, opacity:1, duration:0.25, ease:"back.out(2.5)"}, ${f(cs)});`);
    c.forEach((x, k) => T(`tl.to("#${id}-${k}", {color:"#bd481f", duration:0.08}, ${f(start[l.id] + x.s)});`));
    vtt.push(`${ts(cs + 0.05)} --> ${ts(ce)}\n${c.map((x) => x.w).join(" ")}`);
  });
});
function ts(x) { const m = Math.floor(x / 60), s = (x % 60).toFixed(3).padStart(6, "0"); return `00:${String(m).padStart(2, "0")}:${s}`; }
html.push(`<div id="brand" class="clip brand" data-start="0" data-duration="${f(END)}" data-track-index="4"><span>SpecWithCode</span> · specwithcode.dev</div>`);
const doc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>SpecWithCode in 35 seconds</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "IBM Plex Sans"; font-weight: 100 700; src: url(assets/fonts/ibm-plex-sans-latin.woff2) format("woff2"); }
      @font-face { font-family: "Newsreader"; font-style: italic; font-weight: 200 800; src: url(assets/fonts/newsreader-italic-latin.woff2) format("woff2"); }
      body { margin: 0; background: #f6f4ee; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #f6f4ee; background-image: radial-gradient(#22241e14 1.4px, transparent 1.6px); background-size: 36px 36px; }
      .clip { position: absolute; }
      .head { left: 60px; right: 60px; top: 230px; font: italic 400 96px/1.08 "Newsreader", serif; color: #22241e; text-align: center; }
      .hl { overflow: hidden; padding-bottom: 0.06em; } .hl > span { display: inline-block; }
      .shot { left: 0; top: 640px; width: 1080px; height: 607.5px; box-shadow: 0 40px 90px #22241e33; }
      .cap { left: 60px; right: 60px; top: 1390px; text-align: center; font: 700 76px/1.15 "IBM Plex Sans", sans-serif; color: #22241e; }
      .brand { left: 0; right: 0; bottom: 150px; text-align: center; font: 500 36px/1 "IBM Plex Sans", sans-serif; color: #6a6d63; }
      .brand span { font: italic 400 46px/1 "Newsreader", serif; color: #22241e; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="short" data-start="0" data-width="1080" data-height="1920" data-duration="${END}">
${html.join("\n")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${tw.join("\n")}
      window.__timelines["short"] = tl;
    </script>
  </body>
</html>
`;
writeFileSync(here + "short/index.html", doc);
writeFileSync(here + "short/captions.en.vtt", "WEBVTT\n\n" + vtt.join("\n\n") + "\n");
console.log("short duration", END, JSON.stringify(start));
