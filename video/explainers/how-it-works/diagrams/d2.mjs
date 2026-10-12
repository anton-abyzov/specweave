// d2 — "Reuse the owner, reports come back" (coordinator loop).
// h: 1920x1080 keyed to vo b07. v: 1080x1920 keyed to vo s03 (compressed).
// Contract: build({ variant, start, duration }) -> { html, css, js }.

const BRAND = {
  paper: "#f6f4ee", ink: "#252820", muted: "#65695e", line: "#d9dcd0",
  soft: "#eff2e8", cream: "#fffdf7", accent: "#bd481f",
};

const TEXT = {
  title: "Reuse the owner, reports come back",
  titleV: "Reuse the owner,<br>reports come back",
  askLabel: "Your ask",
  ask: "Two jobs: let greet take a name&nbsp;·{BR} add a CI workflow (give&nbsp;it&nbsp;to&nbsp;Codex)",
  follow: "greet() trims spaces",
  coord: "Coordinator",
  coordSub: "routes and tracks",
  threadsLabel: "Worker threads",
  c1: ["greet takes a name", "Claude Opus 5.5", "Working"],
  c2: ["CI workflow for npm test", "Codex", "Working"],
  c3: ["Write project memory", "Claude", "Idle"],
  ghost: "new duplicate thread",
  noDup: "no duplicate",
  reuse: "reuse the owner",
  ret1: "report comes back",
  ret2: "on its own",
  report: "Report",
  rows: ["Outcome", "Evidence", "Blockers"],
  cap1: "No polling.",
  cap2: "No pasting.",
};

// Geometry per variant. All values in canvas px.
const GEO = {
  h: {
    W: 1920, H: 1080, fs: 22, fsName: 28, fsAsk: 24, fsTitle: 56, fsCap: 56, fsCoord: 48,
    title: { x: 120, y: 74, w: 1200 },
    ask: { x: 100, y: 290, w: 460 },
    follow: { x: 100, y: 540, w: 460, h: 96 },
    coord: { x: 640, y: 390, w: 340, h: 190 },
    threadsLabel: { x: 1300, y: 182 },
    cards: { x: 1300, w: 500, h: 140, tops: { c2: 226, c1: 415, c3: 604 } },
    ghost: { x: 1300, y: 790, w: 500, h: 100 },
    noDup: { x: 1300, y: 902 },
    report: { x: 660, y: 168, w: 300 },
    cap: { y: 960 },
    // paths
    askLine: [[560, 390], [640, 446]],
    followLine: [[560, 588], [640, 532]],
    e4: [[980, 485], [1300, 485]],
    reuseLbl: { x: 1140, y: 500, anchor: "middle" },
    ghostLine: [[980, 556], [1300, 840]],
    ghostX: [1140, 698],
    e5: { p0: [1300, 425], p1: [1150, 274], p2: [968, 274] },
    retLbl: { x: 1130, y: 190, anchor: "middle" },
    // rider: the report's anchor point (fraction of its box) rides the e5 arc and lands at the arc end.
    rPath: { anchor: [1, 0.5], scaleTravel: 0.45 },
  },
  v: {
    W: 1080, H: 1920, fs: 28, fsName: 32, fsAsk: 30, fsTitle: 68, fsCap: 68, fsCoord: 56,
    title: { x: 80, y: 120, w: 920 },
    ask: { x: 80, y: 340, w: 920 },
    follow: { x: 80, y: 540, w: 620, h: 104 },
    coord: { x: 80, y: 710, w: 440, h: 200 },
    threadsLabel: { x: 80, y: 1072 },
    cards: { x: 80, w: 800, h: 156, tops: { c1: 1126, c2: 1312, c3: 1498 } },
    ghost: { x: 600, y: 740, w: 400, h: 140 },
    noDup: { x: 600, y: 892 },
    report: { x: 600, y: 700, w: 400 },
    cap: { y: 1730 },
    askLine: null,
    followLine: [[300, 646], [300, 708]],
    e4: [[440, 910], [440, 1126]],
    reuseLbl: { x: 414, y: 984, anchor: "end" },
    ghostLine: [[520, 810], [600, 810]],
    ghostX: [560, 810],
    e5: { p0: [880, 1190], p1: [1050, 1080], p2: [905, 950] },
    retLbl: { x: 892, y: 990, anchor: "end" },
    rPath: { anchor: [0.7625, 1], scaleTravel: 0.45 },
  },
};

// Narration-keyed local times (local = 0.2 + word.start).
const TIMES = {
  // b07: "Follow-ups go to the worker already on that area, so nothing is assigned twice.
  //       When a worker finishes, its report comes back on its own. No polling, no pasting."
  h: {
    intro: 0.0, follow: 0.2, followLine: 0.76, scan: 1.1, scanDur: 0.9, owner: 1.74,
    e4: 2.4, ghost: 3.36, ghostX: 4.6, noDup: 4.9, ghostFade: null,
    done: 5.86, rIn: 6.62, rTravel: 6.8, rDur: 1.05, retLbl: 7.85,
    rows: [7.9, 8.1, 8.3], cap1: 8.74, cap2: 9.52, under: 9.8,
  },
  // s03: "Follow-ups go to the thread that owns that area, and each report comes back
  //       on its own, no pasting."
  v: {
    intro: 0.0, follow: 0.2, followLine: 0.55, scan: 0.75, scanDur: 0.7, owner: 1.56,
    e4: 1.95, ghost: 1.45, ghostX: 2.0, noDup: 2.15, ghostFade: 2.6,
    done: 2.86, rIn: 3.0, rTravel: 3.08, rDur: 0.8, retLbl: 3.9,
    rows: [3.95, 4.1, 4.25], cap1: 4.55, cap2: 4.9, under: 5.15,
  },
};

const r2 = (n) => Math.round(n * 100) / 100;
const qb = (p0, p1, p2, t) => [
  (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
  (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
];

export function build({ variant = "h", start = 0, duration }) {
  const g = GEO[variant];
  const T = TIMES[variant];
  const id = `d2-${variant}`;
  const p = (s) => `${id}-${s}`;
  const S = (t) => r2(start + t);
  const dur = duration ?? (variant === "h" ? 11.0 : 6.2);

  // ---------- SVG helpers ----------
  const lineD = ([a, b]) => `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`;
  const quadD = ({ p0, p1, p2 }) => `M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`;
  const head = (name, tip, from, color, sw) => {
    const ang = (Math.atan2(tip[1] - from[1], tip[0] - from[0]) * 180) / Math.PI;
    return `<path id="${p(name)}" class="${p("head")}" d="M -15 -9 L 0 0 L -15 9" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${tip[0]} ${tip[1]}) rotate(${r2(ang)})"/>`;
  };

  const svg = [];
  const defs = [];
  // faint prior "ask" line (already present when the beat starts)
  if (g.askLine) {
    svg.push(`<path id="${p("askline")}" d="${lineD(g.askLine)}" fill="none" stroke="${BRAND.ink}" stroke-opacity="0.35" stroke-width="2"/>`);
    svg.push(head("askhead", g.askLine[1], g.askLine[0], BRAND.ink, 2).replace('stroke-width="2"', 'stroke-width="2" stroke-opacity="0.35"'));
  }
  // follow-up line
  if (g.followLine) {
    svg.push(`<path id="${p("fline")}" d="${lineD(g.followLine)}" fill="none" stroke="${BRAND.ink}" stroke-width="2.5" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1"/>`);
    svg.push(head("fhead", g.followLine[1], g.followLine[0], BRAND.ink, 2.5));
  }
  // ghost dashed arrow (mask reveal)
  defs.push(`<mask id="${p("gmask")}" maskUnits="userSpaceOnUse" x="0" y="0" width="${g.W}" height="${g.H}"><path id="${p("gmaskpath")}" d="${lineD(g.ghostLine)}" fill="none" stroke="#fff" stroke-width="40" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1"/></mask>`);
  svg.push(`<g mask="url(#${p("gmask")})"><path d="${lineD(g.ghostLine)}" fill="none" stroke="${BRAND.ink}" stroke-opacity="0.45" stroke-width="2.5" stroke-dasharray="10 9"/></g>`);
  svg.push(head("ghead", g.ghostLine[1], g.ghostLine[0], BRAND.ink, 2.5).replace('stroke-width="2.5"', 'stroke-width="2.5" stroke-opacity="0.45"'));
  // E4 reuse-the-owner accent arrow
  svg.push(`<path id="${p("e4")}" d="${lineD(g.e4)}" fill="none" stroke="${BRAND.accent}" stroke-width="4" stroke-linecap="round" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1"/>`);
  svg.push(head("e4head", g.e4[1], g.e4[0], BRAND.accent, 4));
  // E5 return arc
  svg.push(`<path id="${p("e5")}" d="${quadD(g.e5)}" fill="none" stroke="${BRAND.accent}" stroke-width="3" stroke-linecap="round" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1"/>`);
  const e5pre = qb(g.e5.p0, g.e5.p1, g.e5.p2, 0.9);
  svg.push(head("e5head", g.e5.p2, e5pre, BRAND.accent, 3));
  // X strike on ghost arrow
  const [gx, gy] = g.ghostX;
  const xs = variant === "h" ? 20 : 18;
  svg.push(`<path id="${p("x1")}" d="M ${gx - xs} ${gy - xs} L ${gx + xs} ${gy + xs}" fill="none" stroke="${BRAND.accent}" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1"/>`);
  svg.push(`<path id="${p("x2")}" d="M ${gx + xs} ${gy - xs} L ${gx - xs} ${gy + xs}" fill="none" stroke="${BRAND.accent}" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1"/>`);

  // ---------- HTML ----------
  const status = (key, word, working) => `
        <div class="${p("st")}">
          <span class="${p("dot")}">${working ? `<span class="${p("ring")}" id="${p(key + "-ring")}"></span>` : ""}</span>
          <span class="${p("ww")}">
            <span class="${p("w")}" id="${p(key + "-w")}">${word}</span>${key === "c1" ? `<span class="${p("w")} ${p("w2")}" id="${p("c1-done")}" data-layout-allow-overlap>Done</span>` : ""}
          </span>
        </div>`;
  const card = (key) => {
    const [name, sub, st] = TEXT[key];
    const top = g.cards.tops[key];
    return `
      <div class="${p("card")}" id="${p(key)}" style="left:${g.cards.x}px;top:${top}px;width:${g.cards.w}px;height:${g.cards.h}px">
        <div class="${p("name")}">${name}</div>
        <div class="${p("row2")}">
          <div class="${p("sub")}">${sub}</div>${status(key, st, st === "Working")}
        </div>
        <div class="${p("flash")}" id="${p(key + "-flash")}"></div>
        ${key === "c1" ? `<div class="${p("own")}" id="${p("c1-own")}"></div>` : ""}
      </div>`;
  };

  const html = `
<section id="${id}" class="clip diagram" data-start="${start}" data-duration="${dur}" data-track-index="1">
  <div class="${p("stage")}" id="${p("stage")}">
    <div class="${p("title")}" id="${p("title")}" style="left:${g.title.x}px;top:${g.title.y}px;width:${g.title.w}px">${variant === "v" ? TEXT.titleV : TEXT.title}</div>
    <svg class="${p("svg")}" viewBox="0 0 ${g.W} ${g.H}" width="${g.W}" height="${g.H}" aria-hidden="true">
      <defs>${defs.join("")}</defs>
      ${svg.join("\n      ")}
    </svg>
    <div class="${p("ask")}" id="${p("ask")}" style="left:${g.ask.x}px;top:${g.ask.y}px;width:${g.ask.w}px">
      <div class="${p("label")}">${TEXT.askLabel}</div>
      <div class="${p("asktext")}">${TEXT.ask.replace("{BR}", variant === "h" ? "<br>" : "")}</div>
    </div>
    <div class="${p("follow")}" id="${p("follow")}" style="left:${g.follow.x}px;top:${g.follow.y}px;width:${g.follow.w}px;height:${g.follow.h}px">
      <div class="${p("ftext")}"><b>Follow-up:</b> ${TEXT.follow}</div>
    </div>
    <div class="${p("coord")}" id="${p("coord")}" style="left:${g.coord.x}px;top:${g.coord.y}px;width:${g.coord.w}px;height:${g.coord.h}px">
      <div class="${p("coordtitle")}">${TEXT.coord}</div>
      <div class="${p("coordsub")}">${TEXT.coordSub}</div>
    </div>
    <div class="${p("label")} ${p("tl")}" id="${p("threadslabel")}" style="left:${g.threadsLabel.x}px;top:${g.threadsLabel.y}px">${TEXT.threadsLabel}</div>
    ${card("c1")}
    ${card("c2")}
    ${card("c3")}
    <div class="${p("scan")}" id="${p("scan")}" style="left:${g.cards.x - 34}px;width:${g.cards.w + 68}px;top:0"></div>
    <div class="${p("ghost")}" id="${p("ghost")}" style="left:${g.ghost.x}px;top:${g.ghost.y}px;width:${g.ghost.w}px;height:${g.ghost.h}px">
      <span class="${p("ghosttext")}">${TEXT.ghost}<span class="${p("strike")}" id="${p("strike")}"></span></span>
    </div>
    <div class="${p("nodup")}" id="${p("nodup")}" style="left:${g.noDup.x}px;top:${g.noDup.y}px">${TEXT.noDup}</div>
    <div class="${p("lbl")} ${p("reuselbl")}" id="${p("reuselbl")}" style="left:${g.reuseLbl.x}px;top:${g.reuseLbl.y}px">${TEXT.reuse}</div>
    <div class="${p("lbl")} ${p("retlbl")}" id="${p("retlbl")}" style="left:${g.retLbl.x}px;top:${g.retLbl.y}px">${TEXT.ret1}<br>${TEXT.ret2}</div>
    <div class="${p("report")}" id="${p("report")}" data-layout-allow-occlusion data-layout-allow-overlap style="left:${g.report.x}px;top:${g.report.y}px;width:${g.report.w}px">
      <div class="${p("label")}">${TEXT.report}</div>
      ${TEXT.rows.map((r, i) => `<div class="${p("row")}" id="${p("row" + i)}"><span class="${p("rowk")}">${r}</span><span class="${p("rowbar")}" style="width:${[46, 38, 30][i]}%"></span></div>`).join("\n      ")}
    </div>
    <div class="${p("cap")}" id="${p("cap")}" style="top:${g.cap.y}px">
      <span class="${p("capa")}" id="${p("cap1")}">${TEXT.cap1}</span>
      <span class="${p("capb")}" id="${p("cap2")}">${TEXT.cap2}<span class="${p("under")}" id="${p("under")}"></span></span>
    </div>
  </div>
</section>`;

  // ---------- CSS ----------
  const R = `#${id}`;
  const fs = g.fs;
  const css = `
@font-face { font-family: "IBM Plex Sans"; font-style: normal; font-weight: 100 700; src: url(assets/fonts/ibm-plex-sans-latin.woff2) format("woff2"); }
@font-face { font-family: "Newsreader"; font-style: normal; font-weight: 200 800; src: url(assets/fonts/newsreader-latin.woff2) format("woff2"); }
@font-face { font-family: "Newsreader"; font-style: italic; font-weight: 200 800; src: url(assets/fonts/newsreader-italic-latin.woff2) format("woff2"); }
${R} { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; background: ${BRAND.paper}; color: ${BRAND.ink}; font-family: "IBM Plex Sans", sans-serif; }
${R} .${p("stage")} { position: absolute; left: 0; top: 0; width: ${g.W}px; height: ${g.H}px; }
${R} .${p("svg")} { position: absolute; left: 0; top: 0; z-index: 1; overflow: visible; }
${R} .${p("title")} { position: absolute; font: italic 400 ${g.fsTitle}px/1.08 "Newsreader", serif; color: ${BRAND.ink}; letter-spacing: -0.005em; }
${R} .${p("label")} { font: 600 ${fs}px/1.2 "IBM Plex Sans", sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.muted}; }
${R} .${p("tl")} { position: absolute; z-index: 2; }
${R} .${p("ask")} { position: absolute; z-index: 2; box-sizing: border-box; background: ${BRAND.cream}; border: 1.5px solid ${BRAND.ink}; border-radius: 6px; padding: 24px 26px 26px; }
${R} .${p("asktext")} { margin-top: 12px; font: 400 ${g.fsAsk}px/1.42 "IBM Plex Sans", sans-serif; color: ${BRAND.ink}; }
${R} .${p("follow")} { position: absolute; z-index: 2; box-sizing: border-box; background: ${BRAND.cream}; border: 1.5px solid ${BRAND.ink}; border-left: 6px solid ${BRAND.accent}; border-radius: 6px; padding: 0 24px; display: flex; align-items: center; }
${R} .${p("ftext")} { font: 400 ${g.fsAsk}px/1.3 "IBM Plex Sans", sans-serif; color: ${BRAND.ink}; white-space: nowrap; }
${R} .${p("ftext")} b { font-weight: 600; }
${R} .${p("coord")} { position: absolute; z-index: 2; box-sizing: border-box; background: ${BRAND.paper}; border: 3px solid ${BRAND.accent}; border-radius: 22px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
${R} .${p("coordtitle")} { font: italic 400 ${g.fsCoord}px/1.05 "Newsreader", serif; color: ${BRAND.ink}; }
${R} .${p("coordsub")} { margin-top: 12px; font: 400 ${fs}px/1.2 "IBM Plex Sans", sans-serif; color: ${BRAND.muted}; }
${R} .${p("card")} { position: absolute; z-index: 2; box-sizing: border-box; background: ${BRAND.cream}; border: 1.5px solid ${BRAND.ink}; border-radius: 8px; padding: 0 28px; display: flex; flex-direction: column; justify-content: center; gap: ${Math.round(fs * 0.45)}px; }
${R} .${p("name")}, ${R} .${p("row2")} { position: relative; z-index: 2; }
${R} .${p("row2")} { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
${R} .${p("name")} { font: 500 ${g.fsName}px/1.2 "IBM Plex Sans", sans-serif; color: ${BRAND.ink}; white-space: nowrap; }
${R} .${p("sub")} { font: 400 ${fs}px/1.2 "IBM Plex Sans", sans-serif; color: ${BRAND.muted}; white-space: nowrap; }
${R} .${p("st")} { position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; flex: none; }
${R} .${p("dot")} { position: relative; width: 14px; height: 14px; border-radius: 50%; background: ${BRAND.ink}; flex: none; }
${R} .${p("ring")} { position: absolute; left: -2px; top: -2px; width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${BRAND.accent}; opacity: 0; }
${R} .${p("ww")} { position: relative; display: inline-block; min-width: ${Math.round(fs * 4.4)}px; }
${R} .${p("w")} { font: 500 ${fs}px/1.2 "IBM Plex Sans", sans-serif; color: ${BRAND.ink}; white-space: nowrap; }
${R} .${p("w2")} { position: absolute; left: 0; top: 0; opacity: 0; }
${R} .${p("flash")} { position: absolute; inset: 0; border-radius: 7px; background: ${BRAND.soft}; opacity: 0; z-index: 1; }
${R} .${p("own")} { position: absolute; inset: -8px; border-radius: 13px; border: 2.5px solid ${BRAND.accent}; opacity: 0; z-index: 0; }
${R} .${p("scan")} { position: absolute; z-index: 1; height: 0; border-top: 2px dashed ${BRAND.ink}; opacity: 0; }
${R} .${p("ghost")} { position: absolute; z-index: 2; box-sizing: border-box; border: 2px dashed rgba(37, 40, 32, 0.4); border-radius: 8px; padding: 0 28px; display: flex; align-items: center; opacity: 0; }
${R} .${p("ghosttext")} { position: relative; font: 400 ${g.fsName - 2}px/1.2 "IBM Plex Sans", sans-serif; color: ${BRAND.muted}; white-space: nowrap; }
${R} .${p("strike")} { position: absolute; left: -6px; right: -6px; top: 54%; height: 3px; background: ${BRAND.accent}; transform-origin: 0 50%; transform: scaleX(0); }
${R} .${p("nodup")} { position: absolute; z-index: 2; font: 500 ${fs}px/1.2 "IBM Plex Sans", sans-serif; color: ${BRAND.accent}; opacity: 0; }
${R} .${p("lbl")} { position: absolute; z-index: 2; font: 500 ${fs}px/1.25 "IBM Plex Sans", sans-serif; color: ${BRAND.ink}; white-space: nowrap; opacity: 0; }
${R} .${p("reuselbl")} { ${g.reuseLbl.anchor === "middle" ? "transform: translateX(-50%); text-align: center;" : g.reuseLbl.anchor === "end" ? "transform: translateX(-100%); text-align: right;" : ""} }
${R} .${p("retlbl")} { ${g.retLbl.anchor === "middle" ? "transform: translateX(-50%); text-align: center;" : g.retLbl.anchor === "end" ? "transform: translateX(-100%); text-align: right;" : ""} color: ${BRAND.accent}; }
${R} .${p("report")} { position: absolute; z-index: 5; box-sizing: border-box; background: ${BRAND.cream}; border: 1.5px solid ${BRAND.ink}; border-radius: 6px; padding: 20px 24px 14px; opacity: 0; transform-origin: 50% 50%; }
${R} .${p("row")} { display: flex; align-items: center; gap: 16px; padding: 9px 0; border-top: 1px solid ${BRAND.line}; opacity: 0; }
${R} .${p("report")} .${p("label")} { padding-bottom: 10px; }
${R} .${p("rowk")} { font: 500 ${fs}px/1.25 "IBM Plex Sans", sans-serif; color: ${BRAND.ink}; flex: none; width: ${Math.round(fs * 5)}px; }
${R} .${p("rowbar")} { display: block; height: ${Math.round(fs * 0.36)}px; border-radius: 4px; background: ${BRAND.line}; }
${R} .${p("cap")} { position: absolute; left: 0; right: 0; z-index: 4; text-align: center; font: italic 400 ${g.fsCap}px/1.15 "Newsreader", serif; color: ${BRAND.ink}; white-space: nowrap; }
${R} .${p("capa")}, ${R} .${p("capb")} { position: relative; display: inline-block; clip-path: inset(-10% 100% -30% 0); }
${R} .${p("capa")} { margin-right: 0.28em; }
${R} .${p("under")} { position: absolute; left: 0; right: 0; bottom: -0.08em; height: 4px; background: ${BRAND.accent}; transform-origin: 0 50%; transform: scaleX(0); }
`;

  // ---------- JS (absolute times on existing `tl`) ----------
  const q = (s) => JSON.stringify(`#${p(s)}`);
  const J = [];
  const add = (s) => J.push(s);
  const draw = (name, t, d, ease = "power2.inOut") =>
    add(`tl.fromTo(${q(name)}, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: ${d}, ease: "${ease}" }, ${S(t)});`);
  const pop = (name, t, d = 0.2) =>
    add(`tl.fromTo(${q(name)}, { opacity: 0 }, { opacity: 1, duration: ${d}, ease: "power1.out" }, ${S(t)});`);

  // Intro: carried-over state is present from frame 0; the main composition fades the section in.

  // Working rings pulse (finite repeats, deterministic).
  const ringDur = 1.2;
  const ringN = (until) => Math.max(0, Math.floor(until / ringDur) - 1);
  add(`tl.fromTo(${q("c2-ring")}, { scale: 1, opacity: 0.75 }, { scale: 2.6, opacity: 0, duration: ${ringDur}, ease: "power1.out", repeat: ${ringN(dur - 0.2)} }, ${S(0.1)});`);
  add(`tl.fromTo(${q("c1-ring")}, { scale: 1, opacity: 0.75 }, { scale: 2.6, opacity: 0, duration: ${ringDur}, ease: "power1.out", repeat: ${ringN(T.done - 0.2)} }, ${S(0.1)});`);

  // 1) Follow-up arrives.
  add(`tl.fromTo(${q("follow")}, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${S(T.follow)});`);
  draw("fline", T.followLine, 0.4);
  pop("fhead", T.followLine + 0.36, 0.12);

  // 2) Scan the existing threads.
  const tops = g.cards.tops;
  const order = Object.keys(tops).sort((a, b) => tops[a] - tops[b]);
  const y0 = tops[order[0]] - 14;
  const y1 = tops[order[order.length - 1]] + g.cards.h + 14;
  add(`tl.fromTo(${q("scan")}, { y: ${y0}, opacity: 0 }, { y: ${y1}, duration: ${T.scanDur}, ease: "none" }, ${S(T.scan)});`);
  add(`tl.to(${q("scan")}, { opacity: 0.55, duration: 0.12, ease: "none" }, ${S(T.scan)});`);
  add(`tl.to(${q("scan")}, { opacity: 0, duration: 0.15, ease: "none" }, ${S(T.scan + T.scanDur - 0.12)});`);
  for (const k of order) {
    const frac = (tops[k] + g.cards.h / 2 - y0) / (y1 - y0);
    const tc = T.scan + frac * T.scanDur - 0.1;
    add(`tl.fromTo(${q(k + "-flash")}, { opacity: 0 }, { opacity: 1, duration: 0.14, yoyo: true, repeat: 1, ease: "power1.inOut", immediateRender: false }, ${S(tc)});`);
  }
  // The owner lights up.
  add(`tl.fromTo(${q("c1-own")}, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }, ${S(T.owner)});`);

  // 3) Ghost duplicate is considered and struck out.
  add(`tl.fromTo(${q("gmaskpath")}, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" }, ${S(T.ghost)});`);
  pop("ghead", T.ghost + 0.4, 0.12);
  add(`tl.fromTo(${q("ghost")}, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }, ${S(T.ghost + 0.25)});`);
  draw("x1", T.ghostX, 0.16, "power1.out");
  draw("x2", T.ghostX + 0.13, 0.16, "power1.out");
  add(`tl.fromTo(${q("strike")}, { scaleX: 0 }, { scaleX: 1, duration: 0.25, ease: "power2.out" }, ${S(T.ghostX + 0.1)});`);
  pop("nodup", T.noDup, 0.25);

  // 4) Reuse the owner: accent arrow to C1.
  draw("e4", T.e4, 0.45);
  pop("e4head", T.e4 + 0.4, 0.12);
  pop("reuselbl", T.e4 + 0.3, 0.3);

  if (T.ghostFade != null) {
    for (const n of ["ghost", "ghead", "x1", "x2", "nodup"])
      add(`tl.to(${q(n)}, { opacity: 0, duration: 0.3, ease: "power1.in" }, ${S(T.ghostFade)});`);
    add(`tl.to(${JSON.stringify(`#${id} g[mask]`)}, { opacity: 0, duration: 0.3, ease: "power1.in" }, ${S(T.ghostFade)});`);
  }

  // 5) Worker finishes: Working -> Done.
  add(`tl.to(${q("c1-w")}, { opacity: 0, duration: 0.16, ease: "power1.in" }, ${S(T.done)});`);
  add(`tl.fromTo(${q("c1-done")}, { opacity: 0 }, { opacity: 1, duration: 0.24, ease: "power1.out" }, ${S(T.done + 0.14)});`);
  add(`tl.to(${q("c1-own")}, { opacity: 0.35, duration: 0.4, ease: "power1.inOut" }, ${S(T.done + 0.2)});`);

  // 6) Report rides the return arc back to the coordinator.
  draw("e5", T.rIn, T.rDur + 0.1, "power1.inOut");
  pop("e5head", T.rIn + T.rDur + 0.05, 0.12);
  pop("retlbl", T.retLbl, 0.35);
  {
    const rp = g.rPath;
    const N = 16;
    const xs = [], ys = [];
    for (let i = 1; i <= N; i++) {
      const [x, y] = qb(g.e5.p0, g.e5.p1, g.e5.p2, i / N);
      xs.push(r2(x - g.e5.p2[0])); ys.push(r2(y - g.e5.p2[1]));
    }
    const dx0 = r2(g.e5.p0[0] - g.e5.p2[0]), dy0 = r2(g.e5.p0[1] - g.e5.p2[1]);
    add(`tl.set(${q("report")}, { transformOrigin: "${rp.anchor[0] * 100}% ${rp.anchor[1] * 100}%" }, ${S(T.rIn)});`);
    add(`tl.fromTo(${q("report")}, { opacity: 0, x: ${dx0}, y: ${dy0}, scale: ${r2(rp.scaleTravel * 0.7)} }, { opacity: 1, scale: ${rp.scaleTravel}, duration: 0.2, ease: "power1.out" }, ${S(T.rIn)});`);
    add(`tl.to(${q("report")}, { keyframes: { x: ${JSON.stringify(xs)}, y: ${JSON.stringify(ys)}, easeEach: "none" }, duration: ${T.rDur}, ease: "power1.inOut" }, ${S(T.rTravel)});`);
    add(`tl.to(${q("report")}, { scale: 1, duration: ${r2(T.rDur * 0.55)}, ease: "power2.inOut" }, ${S(T.rTravel + T.rDur * 0.45)});`);
  }
  T.rows.forEach((t, i) => {
    add(`tl.fromTo(${q("row" + i)}, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.18, ease: "power2.out" }, ${S(t)});`);
  });

  // 7) Caption.
  add(`tl.fromTo(${q("cap1")}, { clipPath: "inset(-10% 100% -30% 0%)" }, { clipPath: "inset(-10% 0% -30% 0%)", duration: 0.45, ease: "power1.inOut" }, ${S(T.cap1)});`);
  add(`tl.fromTo(${q("cap2")}, { clipPath: "inset(-10% 100% -30% 0%)" }, { clipPath: "inset(-10% 0% -30% 0%)", duration: 0.45, ease: "power1.inOut" }, ${S(T.cap2)});`);
  add(`tl.fromTo(${q("under")}, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, ${S(T.under)});`);

  return { html, css, js: J.join("\n") };
}

export default build;
