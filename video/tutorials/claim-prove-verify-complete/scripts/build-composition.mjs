// Build the HyperFrames composition and caption files for a CLI tutorial.
// Usage: node build-composition.mjs <episodeDir> <outDir> [slug]
// Reads <episodeDir>/edit.json, captures/session.json (real command output), vo-timing/*.json (ElevenLabs
// character timings turned into cue and word times) and the VO WAVs in hyperframes/assets/media (for the
// pause snap). Writes <episodeDir>/hyperframes/index.html, <outDir>/<slug>.en.vtt, .chapters.vtt and timeline.json.
//
// Rules this file enforces (see ../../CLI-PIPELINE.md):
// - edit.json item `firstRowOnly` [line, …] shows only the first visual row of those output lines; indented
//   bullets in output hang their wrapped rows under the bullet text.
// - terminal: JetBrains Mono 28 px, 42 px rows (1.5), wrapped at termCols on word boundaries; the card grows
//   with its content up to visibleRows, then scrolls by whole rows inside a clip box (no half rows);
// - every on-screen event is anchored to a beat, a caption chunk or a spoken word, never to a fixed time;
// - caption cues start at the nearest pause found by ffmpeg silencedetect (-40 dB, 0.18 s), clamped to ±0.4 s;
//   edit.json `cueNudge` {beat: {cue: seconds}} moves a cue whose onset reads earlier after loudnorm.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, resolve } from "node:path";

const [ep, outDir, slugArg] = process.argv.slice(2);
if (!ep || !outDir) { console.error("usage: build-composition.mjs <episodeDir> <outDir> [slug]"); process.exit(2); }
const SLUG = slugArg ?? basename(resolve(ep));
const edit = JSON.parse(readFileSync(`${ep}/edit.json`, "utf8"));
const session = JSON.parse(readFileSync(`${ep}/captures/session.json`, "utf8"));
const vo = Object.fromEntries(edit.beats.map((b) => [b.id, JSON.parse(readFileSync(`${ep}/vo-timing/${b.id}.json`, "utf8"))]));
const r3 = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const keepTogether = (s) => s.replace(/Claude Code/g, "Claude Code");
const codeMarks = (s) => keepTogether(esc(s)).replace(/`([^`]+)`/g, "<code>$1</code>");
const COLS = edit.termCols, VIS = edit.visibleRows, ROW = 42, PROMPT = "greet-app % ";

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
const beatById = Object.fromEntries(beats.map((b) => [b.id, b]));

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
  }).map((s, i) => r3(s + (edit.cueNudge?.[b.id]?.[i] ?? 0)));
}

// ── Anchors ──────────────────────────────────────────────────────────────
function at(a) {
  const [id, cue, x, y] = a;
  const b = beatById[id];
  if (!b) throw new Error(`unknown beat in anchor ${JSON.stringify(a)}`);
  if (cue === null) return r3(b.start + x);
  if (typeof x === "string") {
    const [word, nth = "1"] = x.split("#");
    const hits = vo[id].words.filter((w) => w[0] === cue && w[1] === word);
    const w = hits[Number(nth) - 1];
    if (!w) throw new Error(`word "${x}" not in ${id} chunk ${cue}`);
    return r3(b.start + b.voOffset + w[2] + (y ?? 0));
  }
  return r3(b.start + b.voOffset + snapped[id][cue] + (x ?? 0));
}

// Wrap like a terminal that breaks at spaces (or after "/"), hard-breaking only a token longer than a row.
// `hang` indents continuation rows (output bullets keep their text column, so a wrapped tail never reads as a command).
function wrap(line, cols, hang = 0) {
  const out = [];
  let rest = line;
  const width = () => (out.length ? cols - hang : cols);
  while (rest.length > width()) {
    const w = width();
    let cut = -1;
    for (let i = w; i > w * 0.45; i--) {
      if (rest[i] === " ") { cut = i; break; }
      if (rest[i - 1] === "/") { cut = i; break; }
    }
    if (cut < 0) cut = w;
    out.push(rest.slice(0, cut).replace(/\s+$/, ""));
    rest = rest.slice(cut).replace(/^ /, "");
  }
  out.push(rest);
  return hang ? out.map((r, i) => (i ? " ".repeat(hang) + r : r)) : out;
}
// Output rows: an indented bullet ("   • …") hangs its continuation rows under the bullet text.
const hangOf = (line) => { const m = /^(\s+[•*-] )/.exec(line); return m ? m[1].length : 0; };

const toolLabel = { claude: "Terminal as Claude Code", codex: "Terminal as Codex", ...(edit.toolLabels ?? {}) };
for (const k of ["title", "outro"]) if (!edit[k]) throw new Error(`edit.json needs "${k}"`);
const els = [];
const tl = [];
let n = 0;

for (const [screenId, screen] of Object.entries(edit.screens)) {
  const sb = beats.filter((b) => b.screen === screenId);
  const s0 = sb[0].start, s1 = r3(sb[sb.length - 1].start + sb[sb.length - 1].dur);
  const rows = []; // {id, html, at, kind}
  const events = []; // {at, kind: "count", count, keepTopRow} | {at, kind: "hl", first, last}
  const hls = [];
  screen.items.forEach((item, itemIdx) => {
    const shot = session.shots[item.shot];
    if (!shot) throw new Error(`shot ${item.shot} missing`);
    const tCmd = at(item.at);
    const segs = wrap(PROMPT + shot.cmd, COLS).map((r, i) => (i === 0 ? r.slice(PROMPT.length) : r));
    const typeDur = r3(Math.min(1.0, shot.cmd.length / 60));
    const cmdIds = [];
    const firstCmdRow = rows.length;
    // The first prompt of a screen is there when the screen opens, like a fresh terminal.
    const shownAt = itemIdx === 0 ? s0 : tCmd;
    segs.forEach((seg, i) => {
      const id = `r${++n}`;
      cmdIds.push(id);
      const html = i === 0 ? `<span class="prompt">greet-app %</span> <span class="cmd"></span>` : `<span class="cmd"></span>`;
      rows.push({ id, html, at: i === 0 ? shownAt : tCmd, kind: "cmd" });
    });
    events.push({ at: shownAt, kind: "count", count: firstCmdRow + 1 });
    events.push({ at: tCmd, kind: "count", count: rows.length });
    tl.push(`typeCmd(${JSON.stringify(cmdIds)}, ${JSON.stringify(segs)}, ${tCmd}, ${typeDur});`);
    const lines = shot.out.split("\n");
    const ranges = item.lines ?? [[0, lines.length - 1]];
    const tOut0 = r3(tCmd + typeDur + 0.25);
    let tOut = tOut0;
    const rowsByLine = {};
    let prevEnd = -1;
    const pushElide = () => { rows.push({ id: `r${++n}`, html: "…", at: tOut, kind: "elide" }); tOut = r3(tOut + 0.04); };
    for (const [a, b] of ranges) {
      if (a > prevEnd + 1) pushElide();
      for (let li = a; li <= b; li++) {
        rowsByLine[li] = [];
        const segsOut = wrap(lines[li], COLS, hangOf(lines[li]));
        // `firstRowOnly`: show only the first visual row of a long line (a table row whose tail is empty cells).
        for (const seg of (item.firstRowOnly ?? []).includes(li) ? segsOut.slice(0, 1) : segsOut) {
          const idx = rows.length;
          rows.push({ id: `r${++n}`, html: esc(seg) || "&#8203;", at: tOut, kind: "out" });
          rowsByLine[li].push(idx);
        }
        tOut = r3(tOut + 0.04);
      }
      prevEnd = b;
    }
    if (prevEnd < lines.length - 1) pushElide();
    events.push({ at: tOut0, kind: "count", count: rows.length, keepTopRow: item.keepTop ? firstCmdRow : undefined });
    for (const h of item.hl ?? []) {
      const idxs = h.lines.flatMap((li) => {
        if (!rowsByLine[li]) throw new Error(`highlight line ${li} is not shown in shot ${item.shot}`);
        return rowsByLine[li];
      });
      const appear = Math.max(...idxs.map((i) => rows[i].at)) + 0.1;
      const from = r3(Math.max(at(h.from), appear)), to = at(h.to);
      if (to - from < 0.5) throw new Error(`highlight in shot ${item.shot} is shorter than 0.5 s`);
      hls.push({ ids: idxs.map((i) => rows[i].id), from, to });
      events.push({ at: from, kind: "hl", first: Math.min(...idxs), last: Math.max(...idxs) });
    }
  });

  // Card height and scroll, in whole rows. The card grows with its content; past visibleRows it scrolls so the
  // newest row is in view, keeps the top of a long `cat` in view (keepTop), and brings highlighted rows into view.
  events.sort((a, b) => a.at - b.at || (a.kind === "count" ? -1 : 1));
  let count = 0, top = 0, lastTop = 0, lastH = 1;
  const motion = [];
  for (const e of events) {
    if (e.kind === "count") {
      count = Math.max(count, e.count);
      top = e.keepTopRow !== undefined ? Math.min(e.keepTopRow, Math.max(0, count - VIS)) : Math.max(0, count - VIS);
    } else if (e.first < top || e.last >= top + VIS) {
      top = Math.max(0, Math.min(e.first - 1, count - VIS));
      if (e.last >= top + VIS) top = e.last - VIS + 1;
    }
    const h = Math.min(VIS, Math.max(1, count));
    if (h !== lastH) { motion.push(`tl.to("#clip-${screenId}", { height: ${h * ROW}, duration: 0.2, ease: "power2.out" }, ${r3(e.at)});`); lastH = h; }
    if (top !== lastTop) { motion.push(`tl.to("#rows-${screenId}", { y: ${-top * ROW}, duration: 0.3, ease: "power2.inOut" }, ${r3(e.at)});`); lastTop = top; }
  }

  els.push(`
      <section id="scr-${screenId}" class="clip stage" data-start="${s0}" data-duration="${r3(s1 - s0)}" data-track-index="1">
        <div class="tool-label"><span class="dot"></span>${toolLabel[screen.tool]}<code>SPECWEAVE_TOOL=${screen.tool}</code></div>
        <div class="window"><div class="viewport"><div class="clipbox" id="clip-${screenId}" data-layout-allow-overflow><div class="rows" id="rows-${screenId}" data-layout-allow-overflow data-layout-allow-overlap data-layout-allow-occlusion>
${rows.map((r) => `          <div class="row ${r.kind}" id="${r.id}">${r.html}</div>`).join("\n")}
        </div></div></div></div>
      </section>`);
  for (const r of rows) {
    if (r.kind === "cmd") tl.push(`tl.set("#${r.id}", { opacity: 1 }, ${r.at});`);
    else tl.push(`tl.fromTo("#${r.id}", { opacity: 0 }, { opacity: ${r.kind === "elide" ? 0.5 : 1}, duration: 0.1, ease: "none" }, ${r.at});`);
  }
  tl.push(...motion);
  for (const h of hls) {
    const sel = h.ids.map((id) => `#${id}`).join(",");
    tl.push(`tl.to("${sel}", { backgroundColor: "rgba(109,79,181,0.10)", boxShadow: "inset 4px 0 0 0 rgba(109,79,181,1)", duration: 0.2, ease: "none" }, ${h.from});`);
    tl.push(`tl.to("${sel}", { backgroundColor: "rgba(109,79,181,0)", boxShadow: "inset 4px 0 0 0 rgba(109,79,181,0)", duration: 0.2, ease: "none" }, ${r3(h.to - 0.2)});`);
  }
}

// ── Step chips, diff panel and VO per beat ───────────────────────────────
for (const b of beats) {
  els.push(`      <audio id="vo-${b.id}" src="assets/media/${b.id}.wav" data-start="${r3(b.start + b.voOffset)}" data-duration="${vo[b.id].duration}" data-track-index="6" data-volume="1"></audio>`);
  if (b.stepChip) {
    els.push(`      <div id="chip-${b.id}" class="clip chip" data-start="${b.start}" data-duration="${b.dur}" data-track-index="2"><span class="chip-inner" id="chipi-${b.id}">${codeMarks(b.stepChip)}</span></div>`);
    tl.push(`tl.fromTo("#chipi-${b.id}", { y: 4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: "power2.out" }, ${r3(b.start + 0.1)});`);
  }
  if (b.diffPanel) {
    const from = at(b.diffPanel.from), to = at(b.diffPanel.to);
    if (to - from > 2.5) throw new Error(`diff panel in ${b.id} is longer than 2.5 s`);
    const lines = session.offCameraDiff.split("\n").slice(4);
    const body = lines.map((l) => `<div class="dl ${l.startsWith("+") ? "add" : l.startsWith("-") ? "del" : ""}">${esc(l) || "&#8203;"}</div>`).join("");
    els.push(`      <div id="diff-${b.id}" class="clip diffpanel" data-layout-allow-overlap data-start="${from}" data-duration="${r3(to - from)}" data-track-index="3"><div class="diff-inner" id="diffi-${b.id}" data-layout-allow-overlap><div class="diff-head">${codeMarks(b.diffPanel.head)}</div><div class="diff-body">${body}</div></div></div>`);
    tl.push(`tl.fromTo("#diffi-${b.id}", { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: "power2.out" }, ${from});`);
    tl.push(`tl.to("#diffi-${b.id}", { opacity: 0, duration: 0.2, ease: "none" }, ${r3(to - 0.2)});`);
  }
}

// ── Cards ────────────────────────────────────────────────────────────────
const intro = beats[0], outro = beats[beats.length - 1];
els.push(`
      <section id="intro" class="clip card" data-start="${intro.start}" data-duration="${intro.dur}" data-track-index="1">
        <div class="card-inner">
          <div class="wordmark rise">SpecWeave</div>
          <h1 class="title rise">${codeMarks(edit.title)}</h1>
          <div class="thread" id="intro-thread"></div>
          <p class="subtitle rise">${esc((edit.subtitle ?? "A real run of the SpecWeave {version} CLI in a sample repo.").replace("{version}", session.specweave))}</p>
          <div class="footer rise">spec-weave.com/tutorials</div>
        </div>
      </section>`);
tl.push(`tl.fromTo("#intro .rise", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: "power2.out" }, ${intro.start});`);
tl.push(`tl.fromTo("#intro-thread", { width: 0 }, { width: 720, duration: 0.6, ease: "power2.out" }, ${r3(intro.start + 0.2)});`);
tl.push(`tl.to("#intro .card-inner", { opacity: 0, duration: 0.25, ease: "none" }, ${r3(intro.start + intro.dur - 0.25)});`);
els.push(`
      <section id="outro" class="clip card" data-start="${outro.start}" data-duration="${outro.dur}" data-track-index="1">
        <div class="card-inner">
          <div class="wordmark rise">SpecWeave</div>
          <div class="outro-l1 rise">${codeMarks(edit.outro.next)}</div>
          <div class="thread" id="outro-thread"></div>
          <p class="outro-l2 rise">${esc(edit.outro.note)}</p>
          <div class="footer rise">All tutorials: spec-weave.com/tutorials</div>
        </div>
      </section>`);
tl.push(`tl.fromTo("#outro .rise", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: "power2.out" }, ${outro.start});`);
tl.push(`tl.fromTo("#outro-thread", { width: 0 }, { width: 720, duration: 0.6, ease: "power2.out" }, ${r3(outro.start + 0.3)});`);

// ── Captions: snapped cue starts, extended to meet the next cue inside the beat ──
const caps = [];
for (const b of beats) {
  const cues = vo[b.id].cues;
  cues.forEach((c, i) => {
    const s = r3(b.start + b.voOffset + snapped[b.id][i]);
    const end = cues[i + 1] ? r3(b.start + b.voOffset + snapped[b.id][i + 1]) : r3(Math.min(b.start + b.dur, b.start + b.voOffset + c.end + 0.4));
    caps.push({ start: s, end, text: c.text });
  });
}
// At most two lines of at most 42 characters, broken at the space that balances them best, never inside
// backticks (a command or file name) or inside "Claude Code".
function captionLines(text) {
  const len = (s) => s.replace(/`/g, "").length;
  if (len(text) <= 42) return [text];
  let best = null;
  let inCode = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "`") inCode = !inCode;
    if (text[i] !== " " || inCode || text.slice(i - 6, i + 5) === "Claude Code") continue;
    const a = text.slice(0, i), b = text.slice(i + 1), score = Math.max(len(a), len(b));
    if (!best || score < best.score) best = { a, b, score };
  }
  if (!best || best.score > 42) console.warn(`caption needs more than two 42-character lines: ${text}`);
  return best ? [best.a, best.b] : [text];
}
for (const c of caps) {
  const d = c.end - c.start, plainLen = c.text.replace(/`/g, "").length;
  if (d < 1 || d > 6) console.warn(`cue ${d.toFixed(2)} s outside 1–6 s: ${c.text}`);
  if (plainLen > 84) console.warn(`cue longer than two 42-character lines: ${c.text}`);
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
        --iris: #6d4fb5; --iris-strong: #4a3678; --iris-tint: #ece6f8; --pass: #1d7348; --fail: #b4232c;
        --sans: "Schibsted Grotesk", sans-serif; --mono: "JetBrains Mono", monospace;
        --shadow-window: 0 1px 2px rgba(36, 21, 35, 0.06), 0 12px 32px rgba(36, 21, 35, 0.08);
      }
      body { margin: 0; background: var(--canvas); color: var(--ink); font-family: var(--sans); }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--canvas); }
      .clip { position: absolute; }
      .card, .stage { inset: 0; background: var(--canvas); }
      .card-inner { position: absolute; inset: 120px 160px 230px; }
      .wordmark { font: 700 34px/1 var(--sans); color: var(--ink); letter-spacing: -0.01em; }
      .title { margin: 170px 0 0; max-width: 1400px; font: 600 92px/1.04 var(--sans); letter-spacing: -0.025em; color: var(--ink); text-wrap: balance; }
      .thread { height: 4px; width: 0; background: var(--iris); margin-top: 44px; border-radius: 2px; }
      .subtitle { margin: 40px 0 0; font: 400 36px/1.35 var(--sans); color: var(--muted); }
      .footer { position: absolute; left: 0; bottom: 0; font: 500 26px/1.2 var(--sans); color: var(--muted); }
      .outro-l1 { margin-top: 190px; font: 600 72px/1.1 var(--sans); letter-spacing: -0.02em; color: var(--ink); }
      .outro-l1 code { font: 500 0.86em var(--mono); color: var(--ink); white-space: nowrap; }
      .outro-l2 { margin: 44px 0 0; max-width: 1300px; font: 400 32px/1.45 var(--sans); color: var(--muted); }
      .tool-label { position: absolute; right: 140px; top: 60px; font: 600 28px/1.2 var(--sans); color: var(--ink); }
      .tool-label code { font: 400 22px var(--mono); color: var(--muted); background: var(--sunken); border-radius: 4px; padding: 3px 8px; margin-left: 14px; vertical-align: 2px; }
      .tool-label .dot { display: inline-block; width: 12px; height: 12px; border-radius: 6px; background: var(--iris); margin-right: 12px; vertical-align: 3px; }
      .window { position: absolute; left: 140px; right: 140px; top: 136px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-window); padding: 18px; }
      .viewport { background: var(--sunken); border-radius: 8px; padding: 22px 30px; }
      .clipbox { height: ${ROW}px; overflow: hidden; margin: 0 -14px; padding: 0 14px; }
      .rows { will-change: transform; }
      .row { font: 400 28px/${ROW}px var(--mono); height: ${ROW}px; white-space: pre; color: var(--ink); border-radius: 4px; margin: 0 -10px; padding: 0 10px; opacity: 0; background-color: rgba(109,79,181,0); box-shadow: inset 4px 0 0 0 rgba(109,79,181,0); }
      .row.cmd { font-weight: 500; }
      .prompt { color: var(--muted); font-weight: 400; }
      .chip { left: 140px; top: 48px; z-index: 10; }
      .chip-inner { display: inline-block; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 10px 20px; font: 600 30px/1.25 var(--sans); color: var(--ink); white-space: nowrap; }
      .chip-inner code { font: 500 0.86em var(--mono); color: var(--iris-strong); }
      .diffpanel { left: 0; right: 0; top: 300px; z-index: 12; text-align: center; }
      .diff-inner { display: inline-block; text-align: left; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 2px 6px rgba(36,21,35,0.08), 0 24px 60px rgba(36,21,35,0.16); padding: 24px 32px; }
      .diff-head { font: 600 30px/1.3 var(--sans); color: var(--ink); margin-bottom: 16px; }
      .diff-head code { font: 500 0.86em var(--mono); }
      .diff-body { background: var(--sunken); border-radius: 8px; padding: 16px 24px; }
      .dl { font: 400 30px/45px var(--mono); white-space: pre; color: var(--ink); }
      .dl.add { color: var(--pass); } .dl.del { color: var(--fail); }
      .caption { left: 0; right: 0; bottom: 56px; z-index: 20; text-align: center; }
      .caption .pill { display: inline-block; white-space: nowrap; background: rgba(255, 255, 255, 0.96); border: 1px solid var(--line); color: var(--ink);
        padding: 12px 26px; border-radius: 8px; font: 600 40px/1.3 var(--sans); }
      .caption code { font: 500 0.86em var(--mono); background: var(--sunken); border-radius: 4px; padding: 0 6px; white-space: nowrap; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${total}">
${els.join("\n")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      // Types a command across its wrapped rows; segs are the row texts after the prompt.
      function typeCmd(ids, segs, start, dur) {
        const o = { n: 0 };
        const els = ids.map((id) => document.querySelector("#" + id + " .cmd"));
        const total = segs.reduce((a, s) => a + s.length, 0);
        tl.to(o, { n: total, duration: dur, ease: "none", onUpdate: () => {
          let left = Math.round(o.n);
          segs.forEach((s, i) => { els[i].textContent = s.slice(0, Math.max(0, left)); left -= s.length; });
        } }, start);
      }
${tl.map((l) => "      " + l).join("\n")}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeFileSync(`${ep}/hyperframes/index.html`, html);

// ── VTT files and timeline ───────────────────────────────────────────────
mkdirSync(outDir, { recursive: true });
const ts = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`; };
const plain = (s) => s.replace(/`/g, "");
writeFileSync(`${outDir}/${SLUG}.en.vtt`, "WEBVTT\n\n" + caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${plain(c.text)}\n`).join("\n"));
const chapters = beats.map((b) => ({ start: b.start, title: b.chapter }));
writeFileSync(`${outDir}/${SLUG}.chapters.vtt`, "WEBVTT\n\n" + chapters.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(chapters[i + 1]?.start ?? total)}\n${c.title}\n`).join("\n"));
writeFileSync(`${outDir}/timeline.json`, JSON.stringify({ total, posterAt: edit.posterAt, beats: beats.map(({ id, start, dur, chapter }) => ({ id, start, dur, chapter, mid: r3(start + dur / 2) })), captions: caps }, null, 2) + "\n");
console.log("total", total, "s;", caps.length, "captions;", beats.map((b) => `${b.id}@${b.start}`).join(" "));
