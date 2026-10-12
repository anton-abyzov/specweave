// d3: "The agents you already pay for, in one window" (beat B03).
// Contract: build({ variant, start, duration }) -> { html, css, js }.
// Only the 'h' (1920x1080) variant is specified; 'v' falls back to a
// stacked layout (pills in one column on the left, window on the right).

const PROVIDERS = [
  "Claude Code", "Codex", "Grok Build", "Cursor",
  "OpenCode", "Copilot", "Antigravity", "Pi",
];

// Local times (s) = 0.2 + word.start from vo-words/b03.json.
const T = {
  outline: 0.0,
  wordmark: 0.5,       // "Spec with code" 0.2-1.16 local
  fill: 0.42,
  tagline: 1.25,
  free: 1.55,          // "free" 1.38
  move: 4.3,           // "pay for." 4.18-4.78
  pills: [5.1, 5.86, 6.52, 7.24, 7.82, 8.6, 9.32, 10.38],
  subtags: 10.75,      // "It" 10.7
  rows: 11.05,         // "takes the routing" 10.92-11.64
};

const r = (n) => Math.round(n * 1000) / 1000;

function layoutH() {
  // Window W
  const W = { x: 610, y: 560, w: 700, h: 380 };
  // Pills: zigzag "loose arc", slots 215 px apart, edges sag lower.
  const pills = PROVIDERS.map((name, i) => {
    const cx = 960 + (i - 3.5) * 215;
    const sag = 44 * Math.pow((i - 3.5) / 3.5, 2);
    const top = (i % 2 === 0 ? 80 : 232) + sag;
    return { name, i, cx, top, left: cx - 130, w: 260, h: 64 };
  });
  // Thread entry points evenly spaced across W's top edge.
  const e0 = W.x + 40, e1 = W.x + W.w - 40;
  const threads = pills.map((p, i) => {
    const ex = e0 + (i * (e1 - e0)) / 7;
    const ey = W.y;
    const ys = p.top + 64; // pill bottom; the sub-tag sits on the thread later
    const yv = i % 2 === 0 ? 398 : p.top + 118; // row A clears row B; tags stay on the straight run
    const span = ey - yv;
    const d = `M ${r(p.cx)} ${r(ys)} L ${r(p.cx)} ${r(yv)} C ${r(p.cx)} ${r(yv + span * 0.55)} ${r(ex)} ${r(ey - span * 0.55)} ${r(ex)} ${r(ey)}`;
    return { d, ex, ey };
  });
  return { W, pills, threads, liftY: 540 - (W.y + (W.h + 76) / 2) };
}

// Rounded-rect outline as a path, starting top-centre, drawn on like the threads.
// Draw-ons use pathLength 1000 (dash 1000, gap 1100, offset 1010 -> 0): GSAP
// rounds px values, so a pathLength of 1 would make every line pop in at once.
function roundRect(w, h, k) {
  const m = w / 2;
  return `M ${m} 0 H ${w - k} A ${k} ${k} 0 0 1 ${w} ${k} V ${h - k} A ${k} ${k} 0 0 1 ${w - k} ${h} H ${k} A ${k} ${k} 0 0 1 0 ${h - k} V ${k} A ${k} ${k} 0 0 1 ${k} 0 Z`;
}

export function build({ variant = "h", start = 0, duration = 13.6 } = {}) {
  const id = `d3-${variant}`;
  const p = `${id}-`;
  const S = (t) => r(start + t);
  const isV = variant === "v";
  const L = layoutH();
  const { W } = L;

  // ---------- HTML ----------
  // Wordmark is laid out in full from the start and revealed per letter, so the
  // centred title never shifts while it "types".
  const wmChars = "SpecWithCode".split("").map((ch) => `<span class="${p}wmc">${ch}</span>`).join("");
  const pillHtml = L.pills
    .map(
      (q) => `
    <div class="${p}pillwrap" id="${p}pw${q.i}" style="left:${r(q.left)}px;top:${r(q.top)}px">
      <div class="${p}pill" id="${p}pill${q.i}">${q.name}</div>
      <div class="${p}subtag">own sign-in · own limits</div>
    </div>`
    )
    .join("");

  const threadHtml = L.threads
    .map(
      (t, i) => `
      <path id="${p}th${i}" class="${p}thread" d="${t.d}" pathLength="1000"/>
      <circle id="${p}knot${i}" class="${p}knot" cx="${r(t.ex)}" cy="${r(t.ey)}" r="5"/>`
    )
    .join("");

  // rows inside W (window-local coords)
  const rows = [
    { name: "Checkout form", status: "Working" },
    { name: "Payments research", status: "Idle" },
    { name: "Docs", status: "Idle" },
  ];
  const rowTop = (k) => 160 + k * 66;
  const rowHtml = rows
    .map(
      (row, k) => `
        <div class="${p}row" id="${p}row${k}" style="top:${rowTop(k)}px">
          <div class="${p}rowph" id="${p}rowph${k}"></div>
          <div class="${p}rowc" id="${p}rowc${k}">
            <span class="${p}rowname">${row.name}</span>
            <span class="${p}status"><span class="${p}dotwrap">${
        row.status === "Working" ? `<span class="${p}ring" id="${p}ring"></span>` : ""
      }<span class="${p}dot" id="${p}dot${k}"></span></span>${row.status}</span>
          </div>
        </div>`
    )
    .join("");
  // coordinator -> row threads (window-local)
  const cRight = 268, cMidY = 256;
  const cThreads = rows
    .map((_, k) => {
      const y = rowTop(k) + 28;
      return `<path id="${p}ct${k}" class="${p}cthread" pathLength="1000" d="M ${cRight} ${cMidY} C ${cRight + 30} ${cMidY} ${320 - 30} ${y} 320 ${y}"/>`;
    })
    .join("");

  const html = `
<section id="${id}" class="clip diagram" data-start="${start}" data-duration="${duration}" data-track-index="1">
  <svg class="${p}threads" viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true">${threadHtml}
  </svg>
  ${pillHtml}
  <div class="${p}wgroup" id="${p}wgroup" data-layout-allow-overflow>
    <div class="${p}win" id="${p}win" style="left:${W.x}px;top:${W.y}px;width:${W.w}px;height:${W.h}px">
      <div class="${p}body" id="${p}body">
        <div class="${p}bar" id="${p}bar">
          <span class="${p}lights"><i></i><i></i><i></i></span>
          <span class="${p}wordmark" id="${p}wordmark">${wmChars}</span>
        </div>
        <div class="${p}tagline" id="${p}tagline">Write the spec. Get the code.</div>
        <div class="${p}coord" id="${p}coord">
          <div class="${p}coordt">Coordinator</div>
          <div class="${p}coords">routes and tracks</div>
        </div>
        ${rowHtml}
        <svg class="${p}inner" viewBox="0 0 ${W.w} ${W.h}" width="${W.w}" height="${W.h}" aria-hidden="true">${cThreads}</svg>
      </div>
      <svg class="${p}outline" viewBox="-2 -2 ${W.w + 4} ${W.h + 4}" width="${W.w + 4}" height="${W.h + 4}" aria-hidden="true">
        <path id="${p}orect" d="${roundRect(W.w, W.h, 12)}" pathLength="1000"/>
      </svg>
    </div>
    <div class="${p}free" id="${p}free" style="top:${W.y + W.h + 24}px">free<span class="${p}sep"> · </span>Apple silicon Macs</div>
  </div>
</section>`;

  // ---------- CSS ----------
  const c = `#${id}`;
  const css = `
${c} { position: absolute; inset: 0; background: #f6f4ee; overflow: hidden; font-family: "IBM Plex Sans", sans-serif; color: #252820; }
${c} .${p}threads { position: absolute; left: 0; top: 0; overflow: visible; }
${c} .${p}thread { fill: none; stroke: #bd481f; stroke-width: 2; stroke-linecap: round; stroke-dasharray: 1000 1100; stroke-dashoffset: 1010; }
${c} .${p}knot { fill: #bd481f; opacity: 0; }
${c} .${p}pillwrap { position: absolute; width: 260px; display: flex; flex-direction: column; align-items: center; }
${c} .${p}pill { width: 260px; height: 64px; box-sizing: border-box; border: 1.5px solid #252820; border-radius: 32px; background: #fffdf7;
  display: flex; align-items: center; justify-content: center; font: 500 26px/1 "IBM Plex Sans", sans-serif; color: #252820; letter-spacing: 0.005em;
  opacity: 0; transform-origin: 50% 50%; }
${c} .${p}subtag { position: relative; margin-top: 14px; padding: 0 10px; background: #f6f4ee; font: 400 22px/30px "IBM Plex Sans", sans-serif; color: #65695e; white-space: nowrap; opacity: 0; }
${c} .${p}wgroup { position: absolute; inset: 0; }
${c} .${p}win { position: absolute; }
${c} .${p}body { position: absolute; inset: 0; border-radius: 12px; overflow: hidden; background: #fffdf7; opacity: 0; }
${c} .${p}outline { position: absolute; left: -2px; top: -2px; overflow: visible; }
${c} .${p}wmc { opacity: 0; }
${c} .${p}outline path { fill: none; stroke: #252820; stroke-width: 2; stroke-dasharray: 1000 1100; stroke-dashoffset: 1010; }
${c} .${p}bar { position: absolute; left: 0; right: 0; top: 0; height: 62px; background: #252820; display: flex; align-items: center; justify-content: center; }
${c} .${p}lights { position: absolute; left: 22px; top: 25px; display: flex; gap: 9px; }
${c} .${p}lights i { display: block; width: 12px; height: 12px; border-radius: 50%; background: #65695e; }
${c} .${p}wordmark { font: italic 400 36px/1 "Newsreader", serif; color: #f6f4ee; letter-spacing: 0.005em; min-height: 36px; }
${c} .${p}tagline { position: absolute; left: 28px; top: 82px; font: 400 23px/1.2 "IBM Plex Sans", sans-serif; color: #65695e; opacity: 0; }
${c} .${p}coord { position: absolute; left: 28px; top: 160px; width: 240px; height: 192px; box-sizing: border-box; border: 2.5px solid #bd481f; border-radius: 12px;
  background: #f6f4ee; display: flex; flex-direction: column; justify-content: center; padding: 0 22px; }
${c} .${p}coordt { font: italic 400 34px/1.1 "Newsreader", serif; color: #252820; }
${c} .${p}coords { margin-top: 8px; font: 400 22px/1.2 "IBM Plex Sans", sans-serif; color: #65695e; }
${c} .${p}row { position: absolute; left: 320px; width: 352px; height: 56px; box-sizing: border-box; border: 1.5px solid #d9dcd0; border-radius: 10px; background: #fffdf7; }
${c} .${p}rowph { position: absolute; left: 18px; top: 22px; width: 150px; height: 10px; border-radius: 5px; background: #eff2e8; }
${c} .${p}rowc { position: absolute; inset: 0 16px 0 18px; display: flex; align-items: center; justify-content: space-between; opacity: 0; }
${c} .${p}rowname { font: 500 22px/1 "IBM Plex Sans", sans-serif; color: #252820; white-space: nowrap; }
${c} .${p}status { display: flex; align-items: center; gap: 9px; font: 400 22px/1 "IBM Plex Sans", sans-serif; color: #65695e; white-space: nowrap; }
${c} .${p}dotwrap { position: relative; width: 14px; height: 14px; }
${c} .${p}dot { position: absolute; inset: 0; border-radius: 50%; background: #252820; transform: scale(0); }
${c} .${p}ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #bd481f; box-sizing: border-box; opacity: 0; }
${c} .${p}inner { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
${c} .${p}cthread { fill: none; stroke: #bd481f; stroke-width: 2; stroke-linecap: round; stroke-dasharray: 1000 1100; stroke-dashoffset: 1010; }
${c} .${p}free { position: absolute; left: 50%; transform: translateX(-50%); height: 52px; box-sizing: border-box; padding: 0 26px; border: 1.5px solid #252820;
  border-radius: 26px; background: #fffdf7; display: flex; align-items: center; font: 500 24px/1 "IBM Plex Sans", sans-serif; color: #252820; white-space: nowrap; opacity: 0; }
${c} .${p}sep { color: #bd481f; white-space: pre; }
`;

  // ---------- JS (absolute times on existing `tl`) ----------
  const P = `#${p}`;
  const pillTweens = T.pills
    .map(
      (t, i) => `
  tl.fromTo("${P}pill${i}", { opacity: 0, scale: 0.9, y: -10 }, { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: "back.out(1.6)" }, ${S(t - 0.08)});
  tl.to("${P}th${i}", { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }, ${S(t + 0.27)});
  tl.to("${P}knot${i}", { opacity: 1, duration: 0.15, ease: "none" }, ${S(t + 0.82)});`
    )
    .join("");

  const js = `
{
  tl.set("${P}wgroup", { y: ${r(L.liftY)} }, ${S(0)});
  tl.to("${P}orect", { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut" }, ${S(T.outline)});
  tl.to("${P}body", { opacity: 1, duration: 0.4, ease: "power1.out" }, ${S(T.fill)});
  tl.to("#${id} .${p}wmc", { opacity: 1, duration: 0.04, ease: "none", stagger: 0.045 }, ${S(T.wordmark)});
  tl.fromTo("${P}tagline", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, ${S(T.tagline)});
  tl.fromTo("${P}free", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ${S(T.free)});
  tl.to("${P}wgroup", { y: 0, duration: 0.75, ease: "power2.inOut" }, ${S(T.move)});
  ${pillTweens}
  tl.to("#${id} .${p}subtag", { opacity: 1, duration: 0.5, ease: "power1.out" }, ${S(T.subtags)});
  [0, 1, 2].forEach((k) => {
    const t0 = ${S(T.rows)} + k * 0.22;
    tl.to("${P}ct" + k, { strokeDashoffset: 0, duration: 0.45, ease: "power2.out" }, t0);
    tl.to("${P}rowph" + k, { opacity: 0, duration: 0.2, ease: "none" }, t0 + 0.3);
    tl.fromTo("${P}rowc" + k, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" }, t0 + 0.3);
    tl.to("${P}dot" + k, { scale: 1, duration: 0.25, ease: "back.out(2)" }, t0 + 0.45);
    tl.to("${P}row" + k, { borderColor: "#252820", duration: 0.3, ease: "none" }, t0 + 0.3);
  });
  tl.fromTo("${P}ring", { scale: 1, opacity: 0.7 }, { scale: 2.4, opacity: 0, duration: 1.0, ease: "power1.out" }, ${S(T.rows + 0.7)});
}
`;

  return { html, css, js };
}
