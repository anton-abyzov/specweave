// Builds index.html (the HyperFrames composition) from the storyboard below.
// Run: node scripts/build.mjs
// Everything on screen is a real capture: Claude Code screenshots (assets/shots)
// and the verbatim output of a real `specweave handoff` / `specweave pickup` run.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Screenshot geometry: captures are 1456x840, shown in a 1536x886 window.
const IMG_W = 1456, IMG_H = 840;
const VIEW_W = 1536, VIEW_H = 886;
const S0 = VIEW_W / IMG_W;

// ---------------------------------------------------------------------------
// Storyboard. Times are seconds from the start of each scene.
// cam: [t, cx, cy, zoom] - camera centre in screenshot px, zoom on top of fit.
// hl:  [t, dur, x, y, w, h] - highlight box in screenshot px.
// cap: [t, dur, text] - lower-third caption.
// ---------------------------------------------------------------------------
const scenes = [
  // HIGHLIGHTS ---------------------------------------------------------------
  { type: "punch", dur: 4.5, shot: "project-main", cam: [[0, 1210, 260, 1.9], [4.5, 1210, 330, 2.05]],
    big: "18 threads. One project.", eyebrow: "Claude Code Projects" },
  { type: "punch", dur: 4.5, shot: "thread-checklist", cam: [[0, 1210, 380, 1.9], [4.5, 1210, 360, 2.1]],
    big: "Every thread works on its own.", eyebrow: "Live checklists" },
  { type: "punch", dur: 4.5, shot: "project-main", cam: [[0, 480, 620, 2.0], [4.5, 470, 625, 2.2]],
    big: "Out of tokens? It pauses.", eyebrow: "Weekly limit" },
  { type: "punchterm", dur: 4.5, big: "Or picks up in another tool.", eyebrow: "specweave pickup" },
  { type: "title", dur: 6, chapter: "", eyebrow: "Full demo · now on Pro",
    title: "Claude Code Projects", accent: "+ Opus 5.5", sub: "No voice-over. Real screens, real output." },

  // RELEASES -----------------------------------------------------------------
  { type: "title", dur: 4, chapter: "01", eyebrow: "Chapter 1", title: "Recent releases", sub: "What landed, and what disappointed" },
  { type: "releases", dur: 60, cards: [
    { name: "Opus 5.5", by: "Anthropic", tone: "terra", tag: "The big one",
      lines: ["The model this whole video runs on.", "Default in Claude Code on my accounts."] },
    { name: "Claude Code Projects", by: "Anthropic", tone: "blue", tag: "Now on Pro",
      lines: ["I had early access.", "A fresh Pro account has it too: I checked."] },
    { name: "Astra 6", by: "Codex", tone: "green", tag: "Frontier",
      lines: ["Codex's newest frontier model. Very strong.", "Which is exactly why switching tools matters."] },
    { name: "GPT-6 Sol", by: "OpenAI", tone: "red", tag: "Disappointment",
      lines: ["Same release day as Opus 5.5.", "Side by side, it just didn't hold up for me."] },
  ] },

  // OPUS 5.5 -----------------------------------------------------------------
  { type: "title", dur: 4, chapter: "02", eyebrow: "Chapter 2", title: "Opus 5.5 in Claude Code", sub: "Model, effort, per thread" },
  { type: "shot", dur: 20, shot: "model-picker",
    cam: [[0, 728, 420, 1.0], [5, 1000, 700, 1.9], [20, 1010, 720, 2.05]],
    hl: [[6, 6, 984, 697, 108, 22], [12, 7, 984, 718, 108, 62]],
    cap: [[0.5, 5, "Opus 5.5 is the default model in Claude Code."],
          [6, 6, "One click to switch. It's ticked at the top."],
          [12.5, 7, "Fable 5.1, Sonnet 5.5 and Haiku 4.5 sit right below. Keys 1 to 4."]] },
  { type: "still", dur: 18, shot: "effort-zoom", w: 712, h: 664,
    cap: [[0.5, 6, "Then effort: Faster on the left, Smarter on the right."],
          [7, 5.5, "Medium is the recommended default."],
          [12.8, 5, "Turn it up for planning and reviews. Keep Medium for routine work."]] },
  { type: "shot", dur: 18, shot: "thread-checklist",
    cam: [[0, 728, 420, 1.0], [4, 1250, 760, 2.0], [18, 1280, 780, 2.15]],
    hl: [[5, 12, 1320, 803, 92, 22]],
    cap: [[0.5, 4, "And it's set per thread, not per account."],
          [5, 12.5, "This thread runs Opus 5.5 at High effort, right in its own composer."]] },

  // PROJECTS -----------------------------------------------------------------
  { type: "title", dur: 4, chapter: "03", eyebrow: "Chapter 3", title: "What Projects are", sub: "A home for long-running work" },
  { type: "shot", dur: 22, shot: "home",
    cam: [[0, 728, 420, 1.0], [6, 850, 200, 1.75], [22, 860, 215, 1.85]],
    hl: [[7, 5, 604, 137, 82, 18], [12, 5, 628, 170, 104, 18], [17, 5, 737, 170, 62, 18]],
    cap: [[0.5, 6, "Projects sit at the top of Claude Code, each with a live status."],
          [7, 5, "Needs input: a thread is waiting on you."],
          [12, 5, "Ready for review: work is done and waits for your OK."],
          [17, 5, "Working: a thread is running right now."]] },
  { type: "shot", dur: 16, shot: "projects-grid",
    cam: [[0, 728, 420, 1.0], [5, 850, 200, 1.6], [16, 850, 205, 1.65]],
    hl: [[5, 10, 445, 104, 810, 189]],
    cap: [[0.5, 4.5, "Every project is private and pinned in the sidebar."],
          [5.2, 10.5, "Six products, six projects: each keeps its own history, threads and memory."]] },
  { type: "shot", dur: 20, shot: "new-project",
    cam: [[0, 728, 420, 1.0], [4, 728, 420, 1.55], [20, 728, 425, 1.6]],
    hl: [[5, 6, 529, 276, 398, 36], [11, 4.5, 529, 358, 398, 68], [15.5, 4.5, 529, 470, 398, 105]],
    cap: [[0.5, 4.2, "Creating one takes three fields."],
          [5, 6, "A name."],
          [11, 4.5, "A goal. Optional, but every thread reads it."],
          [15.5, 4.5, "Context: the repos the project works in."]] },

  // DEMO: THREADS -------------------------------------------------------------
  { type: "title", dur: 4, chapter: "04", eyebrow: "Chapter 4", title: "Demo: threads and the coordinator", sub: "My real EasyChamp project" },
  { type: "shot", dur: 36, shot: "project-main",
    cam: [[0, 728, 420, 1.0], [7, 610, 420, 1.35], [14, 1210, 380, 1.55], [26, 1210, 300, 1.75], [36, 1210, 470, 1.75]],
    hl: [[7, 6.5, 262, 40, 690, 690], [14, 11, 975, 8, 472, 820], [26, 5, 980, 116, 460, 22], [31, 5, 980, 379, 460, 22]],
    cap: [[0.5, 6, "This is a real project: EasyChamp, my sports platform."],
          [7, 6.5, "Left: the project chat. You talk to one coordinator here."],
          [14, 11.5, "Right: every thread it started. Each one is its own agent session."],
          [26, 5, "18 threads are waiting on me."],
          [31, 5, "52 are idle: finished, or parked until there's something to do."]] },
  { type: "shot", dur: 30, shot: "coordinator-split",
    cam: [[0, 728, 420, 1.0], [5, 560, 330, 1.55], [16, 560, 470, 1.6], [30, 560, 640, 1.6]],
    hl: [[5, 10, 277, 266, 352, 106], [16, 13, 277, 413, 662, 140]],
    cap: [[0.5, 4.5, "Watch what the coordinator does with a message."],
          [5, 10.5, "A question about a match page gets its own thread, with its own scope."],
          [16, 13.5, "It even splits a thread: the TikTok question leaves the tracking thread and gets its own look."]] },
  { type: "shot", dur: 44, shot: "thread-checklist",
    cam: [[0, 728, 420, 1.0], [5, 1210, 380, 1.55], [20, 1110, 210, 1.9], [30, 1210, 625, 1.7], [44, 1210, 640, 1.75]],
    hl: [[6, 13, 983, 255, 456, 256], [20, 9, 983, 192, 228, 24], [30, 13, 983, 540, 406, 178]],
    cap: [[0.5, 4.5, "Open a thread and it's a full agent session."],
          [6, 13.5, "A live checklist: read memory, audit, sweep 224 checkouts, push the index."],
          [20, 9.5, "Threads get messages from the coordinator too. This one got 7."],
          [30, 13.5, "And then the wall every heavy user hits: usage limit reached."]] },
  { type: "shot", dur: 30, shot: "project-main",
    cam: [[0, 728, 420, 1.0], [5, 658, 222, 1.7], [16, 455, 380, 1.8], [30, 455, 380, 1.85]],
    hl: [[5, 11, 377, 175, 562, 96], [16, 13.5, 277, 342, 352, 77]],
    cap: [[0.5, 4.5, "So here's what I asked the coordinator."],
          [5, 11, "\"Make every thread ready for a handoff, so I can continue on another subscription.\""],
          [16, 14, "It started a Handoff readiness thread for exactly that. One ask, one thread."]] },

  // MEMORY, ROUTINES, LIMITS ---------------------------------------------------
  { type: "title", dur: 4, chapter: "05", eyebrow: "Chapter 5", title: "Routines, limits and results", sub: "What keeps a project moving" },
  { type: "shot", dur: 26, shot: "routines",
    cam: [[0, 728, 420, 1.0], [6, 850, 540, 1.45], [26, 850, 560, 1.5]],
    hl: [[6, 9, 450, 365, 800, 160], [15.5, 10, 450, 545, 800, 170]],
    cap: [[0.5, 5.5, "Routines are agents on a schedule."],
          [6, 9.5, "A morning briefing, email triage, a system health check."],
          [15.5, 10, "PR digests, dependency checks, release notes when a PR merges."]] },
  { type: "shot", dur: 34, shot: "project-main",
    cam: [[0, 728, 420, 1.0], [5, 480, 620, 1.9], [20, 600, 740, 1.8], [34, 600, 742, 1.85]],
    hl: [[5, 7.5, 277, 566, 405, 111], [12.5, 7, 287, 648, 320, 20], [20, 13.5, 277, 727, 662, 26]],
    cap: [[0.5, 4.5, "When the weekly limit hits, the whole project pauses."],
          [5, 7.5, "Claude says it will pick things up at 10:00 AM by itself."],
          [12.5, 7, "Auto-continue restarts every thread when the limit resets."],
          [20, 13.5, "Nice. But that can be days away. What if you can't wait?"]] },

  // HANDOFF --------------------------------------------------------------------
  { type: "title", dur: 4, chapter: "06", eyebrow: "Chapter 6", title: "Out of usage? Hand off.", sub: "SpecWeave, in one minute" },
  { type: "terminal", dur: 66,
    blocks: [
      { t: 1, prompt: "~/todo-app (Claude Code)", cmd: "specweave auto-handoff status",
        out: ["Auto-handoff is on at 90% (since 2026-09-26T03:22:09.356Z)."] },
      { t: 9, prompt: "~/todo-app (Claude Code)", cmd: "specweave handoff --reason \"Claude weekly limit at 90%\"",
        out: ["Handed off 0001-add-due-dates-to-todos (released T-02, pushed main, pushed your uncommitted edits).",
              "To continue in any tool, machine or account, say \"pick up\" there (or run `specweave pickup`).",
              "Details: .specweave/increments/0001-add-due-dates-to-todos/handoff.md"] },
      { t: 24, prompt: "~/codex-side (fresh clone, another tool)", cmd: "specweave pickup",
        out: ["Picked up the handoff from claude@antons-macbook-m4max 0m ago (Claude weekly limit at 90%): applied 6 uncommitted files.",
              "Increment 0001-add-due-dates-to-todos \"Add due dates to todos\" (active) · tasks 1/2 done · ACs 1/2 met",
              "Next: T-02 Show the Overdue badge",
              "  AC-02: Todos past their due date show an \"Overdue\" badge",
              "  Files: src/list.js, src/list.test.js | Test: node --test src/list.test.js",
              "Branch: main @ 7a631db · in sync with origin/main · 3 uncommitted files"] },
    ],
    cap: [[0.5, 8, "SpecWeave keeps the work itself in git: spec, tasks, claims, next step."],
          [9, 14.5, "Say \"hand off\" or let it fire at 90% of a limit. It pushes state and even uncommitted edits."],
          [24, 13, "In Codex, Cursor, another account or machine: say \"pick up\"."],
          [37.5, 14, "Same spec, same task, same next step and acceptance criteria. Nothing lost."],
          [52, 13.5, "Open source and free: npm i -g specweave"]] },

  // WRAP -----------------------------------------------------------------------
  { type: "end", dur: 26 },
];

// ---------------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function camXY(cx, cy, z) {
  const S = S0 * z;
  let x = VIEW_W / 2 - cx * S;
  let y = VIEW_H / 2 - cy * S;
  x = Math.min(0, Math.max(VIEW_W - IMG_W * S, x));
  y = Math.min(0, Math.max(VIEW_H - IMG_H * S, y));
  return { x: +x.toFixed(2), y: +y.toFixed(2), scale: +S.toFixed(4) };
}

let html = [];
let js = [];
let t0 = 0;
const chapters = [];

scenes.forEach((sc, i) => {
  const id = `s${i}`;
  const start = +t0.toFixed(2);
  sc.start = start;
  if (sc.type === "title" && sc.chapter) chapters.push([start, sc.title]);
  const open = `<section id="${id}" class="clip scene scene-${sc.type}" data-start="${start}" data-duration="${sc.dur}" data-track-index="1">`;
  const caps = (sc.cap || []).map((c, k) => `<div class="cap" id="${id}-cap${k}"><span>${esc(c[2])}</span></div>`).join("");
  const capJs = (sc.cap || []).map((c, k) => {
    const a = start + c[0], b = start + c[0] + c[1];
    return `capIn("#${id}-cap${k}", ${a.toFixed(2)}); capOut("#${id}-cap${k}", ${(b - 0.35).toFixed(2)});`;
  }).join("\n");

  if (sc.type === "shot" || sc.type === "punch") {
    const hls = (sc.hl || []).map((h, k) =>
      `<div class="hl" id="${id}-hl${k}" style="left:${h[2] - 6}px;top:${h[3] - 6}px;width:${h[4] + 12}px;height:${h[5] + 12}px"></div>`).join("");
    const punch = sc.type === "punch"
      ? `<div class="punch"><div class="p-eyebrow">${esc(sc.eyebrow)}</div><div class="p-big">${esc(sc.big)}</div></div>` : "";
    html.push(`${open}
      <div class="window"><div class="chrome"><i></i><i></i><i></i><span>claude.ai/code</span></div>
        <div class="view"><div class="cam" id="${id}-cam" data-layout-allow-overflow><img src="assets/shots/${sc.shot}.jpg" width="${IMG_W}" height="${IMG_H}" alt="">${hls}</div></div>
      </div>${punch}${caps}</section>`);
    const c0 = camXY(sc.cam[0][1], sc.cam[0][2], sc.cam[0][3]);
    js.push(`tl.set("#${id}-cam", ${JSON.stringify(c0)}, ${start});`);
    for (let k = 1; k < sc.cam.length; k++) {
      const [tA] = sc.cam[k - 1];
      const [tB, cx, cy, z] = sc.cam[k];
      const c = camXY(cx, cy, z);
      js.push(`tl.to("#${id}-cam", { ...${JSON.stringify(c)}, duration: ${(tB - tA).toFixed(2)}, ease: "power2.inOut" }, ${(start + tA).toFixed(2)});`);
    }
    (sc.hl || []).forEach((h, k) => {
      js.push(`hlIn("#${id}-hl${k}", ${(start + h[0]).toFixed(2)}); hlOut("#${id}-hl${k}", ${(start + h[0] + h[1] - 0.3).toFixed(2)});`);
    });
    js.push(`tl.fromTo("#${id} .window", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${start});`);
    if (sc.type === "punch") {
      js.push(`tl.fromTo("#${id} .p-eyebrow", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${(start + 0.2).toFixed(2)});`);
      js.push(`tl.fromTo("#${id} .p-big", { opacity: 0, y: 40, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, ${(start + 0.35).toFixed(2)});`);
    }
  } else if (sc.type === "still") {
    html.push(`${open}<div class="still"><img src="assets/shots/${sc.shot}.png" width="${sc.w}" height="${sc.h}" alt=""></div>${caps}</section>`);
    js.push(`tl.fromTo("#${id} .still", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }, ${start});`);
    js.push(`tl.fromTo("#${id} .still img", { scale: 1 }, { scale: 1.08, duration: ${sc.dur}, ease: "none" }, ${start});`);
  } else if (sc.type === "title") {
    html.push(`${open}<div class="titlecard">
      ${sc.chapter ? `<div class="t-num">${esc(sc.chapter)}</div>` : ""}
      <div class="t-eyebrow">${esc(sc.eyebrow)}</div>
      <div class="t-title">${esc(sc.title)}${sc.accent ? ` <span class="accent">${esc(sc.accent)}</span>` : ""}</div>
      <div class="t-sub">${esc(sc.sub)}</div></div></section>`);
    if (sc.chapter) js.push(`tl.fromTo("#${id} .t-num", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, ${(start + 0.1).toFixed(2)});`);
    js.push(`tl.fromTo("#${id} .t-eyebrow", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, ${(start + 0.2).toFixed(2)});`);
    js.push(`tl.fromTo("#${id} .t-title", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, ${(start + 0.35).toFixed(2)});`);
    js.push(`tl.fromTo("#${id} .t-sub", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out" }, ${(start + 0.8).toFixed(2)});`);
    js.push(`tl.to("#${id} .titlecard", { opacity: 0, duration: 0.4, ease: "power1.in" }, ${(start + sc.dur - 0.45).toFixed(2)});`);
  } else if (sc.type === "releases") {
    const per = sc.dur / sc.cards.length;
    const cards = sc.cards.map((c, k) => `<div class="rcard tone-${c.tone}" id="${id}-c${k}">
      <div class="r-tag">${esc(c.tag)}</div><div class="r-name">${esc(c.name)}</div><div class="r-by">${esc(c.by)}</div>
      ${c.lines.map((l) => `<div class="r-line">${esc(l)}</div>`).join("")}</div>`).join("");
    html.push(`${open}<div class="r-head">Recent releases</div><div class="rgrid">${cards}</div></section>`);
    js.push(`tl.fromTo("#${id} .r-head", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5 }, ${start});`);
    sc.cards.forEach((c, k) => {
      const a = start + k * per;
      js.push(`tl.fromTo("#${id}-c${k}", { opacity: 0, y: 60, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" }, ${(a + 0.2).toFixed(2)});`);
      js.push(`tl.fromTo("#${id}-c${k} .r-line", { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, stagger: 1.4, ease: "power2.out" }, ${(a + 1.0).toFixed(2)});`);
      js.push(`tl.to("#${id}-c${k}", { boxShadow: "0 0 0 2px var(--accent), 0 30px 80px rgba(0,0,0,0.6)", duration: 0.4 }, ${(a + 0.2).toFixed(2)});`);
      if (k < sc.cards.length - 1)
        js.push(`tl.to("#${id}-c${k}", { opacity: 0.38, boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.5)", duration: 0.5 }, ${(a + per).toFixed(2)});`);
    });
    js.push(`tl.to("#${id} .rcard", { opacity: 1, duration: 0.6 }, ${(start + sc.dur - 6).toFixed(2)});`);
  } else if (sc.type === "terminal" || sc.type === "punchterm") {
    const blocks = sc.type === "punchterm"
      ? [{ t: 0.2, prompt: "~/codex-side (another tool)", cmd: "specweave pickup",
           out: ["Picked up the handoff from claude@antons-macbook-m4max 0m ago (Claude weekly limit at 90%)",
                 "Next: T-02 Show the Overdue badge"] }]
      : sc.blocks;
    const body = blocks.map((b, k) => `<div class="tb" id="${id}-b${k}">
        <div class="tl-prompt">${esc(b.prompt)}</div>
        <div class="tl-cmd"><span class="dollar">$</span><span class="typed" id="${id}-b${k}-cmd">${esc(b.cmd)}</span></div>
        ${b.out.map((o, j) => `<div class="tl-out" id="${id}-b${k}-o${j}">${esc(o)}</div>`).join("")}</div>`).join("");
    const punch = sc.type === "punchterm"
      ? `<div class="punch"><div class="p-eyebrow">${esc(sc.eyebrow)}</div><div class="p-big">${esc(sc.big)}</div></div>` : "";
    html.push(`${open}<div class="term ${sc.type === "punchterm" ? "term-small" : ""}"><div class="chrome"><i></i><i></i><i></i><span>Terminal</span></div><div class="tbody">${body}</div></div>${punch}${caps}</section>`);
    js.push(`tl.fromTo("#${id} .term", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${start});`);
    blocks.forEach((b, k) => {
      const a = start + b.t;
      const typeDur = Math.min(2.4, 0.045 * b.cmd.length);
      js.push(`tl.fromTo("#${id}-b${k}", { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${a.toFixed(2)});`);
      js.push(`tl.fromTo("#${id}-b${k}-cmd", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: ${typeDur.toFixed(2)}, ease: "steps(${b.cmd.length})" }, ${(a + 0.3).toFixed(2)});`);
      b.out.forEach((_, j) => {
        js.push(`tl.fromTo("#${id}-b${k}-o${j}", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25 }, ${(a + 0.6 + typeDur + j * 0.35).toFixed(2)});`);
      });
    });
    if (sc.type === "punchterm") {
      js.push(`tl.fromTo("#${id} .p-eyebrow", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${(start + 0.2).toFixed(2)});`);
      js.push(`tl.fromTo("#${id} .p-big", { opacity: 0, y: 40, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, ${(start + 0.35).toFixed(2)});`);
    }
  } else if (sc.type === "end") {
    html.push(`${open}<div class="endcard">
      <div class="e-title">Claude Code Projects <span class="accent">+ Opus 5.5</span></div>
      <div class="e-points">
        <div class="e-pt">One coordinator, many threads, each a real agent session</div>
        <div class="e-pt">Opus 5.5 by default, model and effort per thread</div>
        <div class="e-pt">Routines on a schedule, auto-continue after limits</div>
        <div class="e-pt">Out of usage? <b>specweave handoff</b>, then <b>pick up</b> anywhere</div>
      </div>
      <div class="e-cmd"><span class="dollar">$</span> npm i -g specweave</div>
      <div class="e-links">spec-weave.com · github.com/anton-abyzov/specweave · verified-skill.com</div>
      <div class="e-sub">Subscribe for the next one</div></div></section>`);
    js.push(`tl.fromTo("#${id} .e-title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, ${(start + 0.2).toFixed(2)});`);
    js.push(`tl.fromTo("#${id} .e-pt", { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, stagger: 1.2, ease: "power2.out" }, ${(start + 1.2).toFixed(2)});`);
    js.push(`tl.fromTo("#${id} .e-cmd", { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, ${(start + 6.5).toFixed(2)});`);
    js.push(`tl.fromTo("#${id} .e-links", { opacity: 0 }, { opacity: 1, duration: 0.6 }, ${(start + 7.5).toFixed(2)});`);
    js.push(`tl.fromTo("#${id} .e-sub", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, ${(start + 9).toFixed(2)});`);
    js.push(`tl.to("#${id} .endcard", { opacity: 0, duration: 1.5, ease: "power1.in" }, ${(start + sc.dur - 1.6).toFixed(2)});`);
  }
  if (capJs) js.push(capJs);
  t0 += sc.dur;
});

const TOTAL = +t0.toFixed(2);

const css = `
@font-face { font-family: "Geist Sans"; src: url("assets/fonts/GeistSans.woff2") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Geist Mono"; src: url("assets/fonts/GeistMono.woff2") format("woff2"); font-weight: 100 900; }
:root { --terra:#d97757; --blue:#4f8cff; --green:#22c55e; --red:#ef4444; --text:#f5f5f7; --muted:#a3a3a3; }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:1920px; height:1080px; overflow:hidden; background:#0b0b0f; color:var(--text); font-family:"Geist Sans", sans-serif; -webkit-font-smoothing:antialiased; }
#root { position:relative; width:100%; height:100%; overflow:hidden; background:#0b0b0f; }
.bgfx { position:absolute; inset:0; background:
  radial-gradient(1200px 700px at 15% 10%, rgba(217,119,87,0.16), transparent 60%),
  radial-gradient(1000px 700px at 90% 100%, rgba(79,140,255,0.12), transparent 60%), #0b0b0f; }
.scene { position:absolute; inset:0; }
.window { position:absolute; left:${(1920 - VIEW_W) / 2}px; top:30px; width:${VIEW_W}px; height:${VIEW_H + 34}px; border-radius:16px; overflow:hidden;
  background:#faf9f7; box-shadow:0 30px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08); opacity:0; }
.chrome { height:34px; background:#1c1c22; display:flex; align-items:center; gap:8px; padding:0 14px; }
.chrome i { width:12px; height:12px; border-radius:50%; background:#ff5f57; display:block; }
.chrome i:nth-child(2) { background:#febc2e; } .chrome i:nth-child(3) { background:#28c840; }
.chrome span { margin-left:16px; font:500 14px "Geist Mono", monospace; color:#8b8b93; }
.view { position:relative; width:${VIEW_W}px; height:${VIEW_H}px; overflow:hidden; }
.cam { position:absolute; left:0; top:0; width:${IMG_W}px; height:${IMG_H}px; transform-origin:0 0; }
.cam img { display:block; width:${IMG_W}px; height:${IMG_H}px; }
.hl { position:absolute; border:3px solid var(--terra); border-radius:10px; box-shadow:0 0 0 4000px rgba(10,10,14,0.28), 0 0 24px rgba(217,119,87,0.55); opacity:0; }
.cap { position:absolute; left:0; right:0; bottom:22px; display:flex; justify-content:center; opacity:0; }
.cap span { max-width:1600px; padding:16px 30px; border-radius:16px; background:rgba(12,12,16,0.88); border:1px solid rgba(255,255,255,0.10);
  font-size:40px; font-weight:600; line-height:1.25; letter-spacing:-0.2px; text-align:center; box-shadow:0 18px 50px rgba(0,0,0,0.55); border-left:6px solid var(--terra); }
.punch { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:linear-gradient(180deg, rgba(8,8,12,0.15), rgba(8,8,12,0.55)); }
.p-eyebrow { font:600 30px "Geist Mono", monospace; color:var(--terra); letter-spacing:4px; text-transform:uppercase; opacity:0; margin-bottom:18px; }
.p-big { font-size:118px; font-weight:800; letter-spacing:-3px; text-align:center; text-shadow:0 10px 50px rgba(0,0,0,0.85); opacity:0; max-width:1700px; }
.still { position:absolute; left:0; right:0; top:60px; height:820px; display:flex; align-items:center; justify-content:center; opacity:0; }
.still img { border-radius:22px; box-shadow:0 30px 90px rgba(0,0,0,0.6); height:780px; width:auto; }
.titlecard { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding-left:180px; }
.t-num { font:700 30px "Geist Mono", monospace; color:var(--terra); opacity:0; margin-bottom:10px; }
.t-eyebrow { font:600 28px "Geist Mono", monospace; color:var(--muted); letter-spacing:5px; text-transform:uppercase; opacity:0; }
.t-title { font-size:128px; font-weight:800; letter-spacing:-4px; line-height:1.02; margin:18px 0 22px; max-width:1600px; opacity:0; }
.t-title .accent, .e-title .accent { color:var(--terra); }
.t-sub { font-size:40px; color:var(--muted); font-weight:500; opacity:0; }
.r-head { position:absolute; left:120px; top:90px; font:600 30px "Geist Mono", monospace; color:var(--muted); letter-spacing:5px; text-transform:uppercase; opacity:0; }
.rgrid { position:absolute; left:120px; right:120px; top:160px; bottom:70px; display:grid; grid-template-columns:repeat(2, 1fr); gap:40px; }
.rcard { position:relative; border-radius:28px; padding:34px 44px; background:linear-gradient(180deg, rgba(30,30,38,0.92), rgba(18,18,24,0.92));
  box-shadow:0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.5); opacity:0; overflow:hidden; }
.rcard::before { content:""; position:absolute; left:0; right:0; top:0; height:6px; background:var(--accent); }
.tone-terra { --accent:var(--terra); } .tone-blue { --accent:var(--blue); } .tone-green { --accent:var(--green); } .tone-red { --accent:var(--red); }
.r-tag { display:inline-block; font:700 22px "Geist Mono", monospace; letter-spacing:3px; text-transform:uppercase; color:var(--accent); padding:8px 16px; border-radius:999px; border:1px solid var(--accent); }
.r-name { font-size:64px; font-weight:800; letter-spacing:-2px; margin-top:16px; }
.r-by { font-size:28px; color:var(--muted); margin-bottom:14px; }
.r-line { font-size:32px; line-height:1.32; opacity:0; }
.term { position:absolute; left:110px; right:110px; top:40px; height:830px; border-radius:16px; overflow:hidden; background:#101014; box-shadow:0 30px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08); opacity:0; }
.term-small { top:120px; height:520px; left:260px; right:260px; }
.tbody { padding:30px 38px; font-family:"Geist Mono", monospace; }
.tb { margin-bottom:26px; opacity:0; }
.tl-prompt { font-size:22px; color:#7c7c86; }
.tl-cmd { font-size:30px; font-weight:600; color:#f5f5f7; margin:4px 0 8px; white-space:nowrap; }
.dollar { color:var(--green); margin-right:16px; }
.typed { display:inline-block; }
.tl-out { font-size:23px; color:#c9c9d1; line-height:1.45; white-space:pre-wrap; opacity:0; }
.endcard { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding-left:180px; }
.e-title { font-size:96px; font-weight:800; letter-spacing:-3px; opacity:0; }
.e-points { margin:36px 0 40px; }
.e-pt { font-size:38px; color:#dcdce2; margin:12px 0; opacity:0; padding-left:34px; position:relative; }
.e-pt::before { content:""; position:absolute; left:0; top:17px; width:14px; height:14px; border-radius:4px; background:var(--terra); }
.e-cmd { display:inline-block; align-self:flex-start; font:600 44px "Geist Mono", monospace; padding:18px 30px; border-radius:16px; background:#101014; border:1px solid rgba(255,255,255,0.12); opacity:0; }
.e-links { font:500 30px "Geist Mono", monospace; color:var(--muted); margin-top:30px; opacity:0; }
.e-sub { font-size:34px; color:var(--terra); font-weight:700; margin-top:22px; opacity:0; }
`;

const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920, height=1080">
<title>Claude Code Projects + Opus 5.5</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>${css}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${TOTAL}">
<div class="bgfx"></div>
${html.join("\n")}
<audio id="bed" src="assets/bed.wav" data-start="0" data-duration="${TOTAL}" data-track-index="9" data-volume="0.32"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
function capIn(sel, t) { tl.fromTo(sel, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, t); }
function capOut(sel, t) { tl.to(sel, { opacity: 0, duration: 0.3, ease: "power1.in" }, t); }
function hlIn(sel, t) { tl.fromTo(sel, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }, t); }
function hlOut(sel, t) { tl.to(sel, { opacity: 0, duration: 0.3 }, t); }
${js.join("\n")}
window.__timelines["main"] = tl;
</script>
</body>
</html>
`;

writeFileSync(join(ROOT, "index.html"), out);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
writeFileSync(join(ROOT, "chapters.txt"), ["0:00 Highlights", ...chapters.map(([s, t]) => `${fmt(s)} ${t}`)].join("\n") + "\n");
console.log(`index.html written: ${scenes.length} scenes, ${TOTAL}s (${fmt(TOTAL)})`);
console.log(["0:00 Highlights", ...chapters.map(([s, t]) => `${fmt(s)} ${t}`)].join("\n"));
