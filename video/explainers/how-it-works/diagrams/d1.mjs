// d1 "You are the router": four agent terminals, the developer in the middle
// pasting context between them. Variants: 'h' 1920x1080 keyed to b02,
// 'v' 1080x1920 keyed to s01 (starts on the finished sprawl state).

const PAPER = "#f6f4ee";
const INK = "#252820";
const MUTED = "#65695e";
const LINE = "#d9dcd0";
const CREAM = "#fffdf7";
const ACCENT = "#bd481f";

const f = (n) => Number(n.toFixed(3));

// Deterministic pseudo-random sequence (fixed seed, evaluated at build time).
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// h is authored on a grid, then lifted so the caption keeps a bottom margin
// that matches the top one.
function layout(variant) {
  const L = baseLayout(variant);
  if (variant !== "h") return L;
  const dy = -28;
  L.windows = L.windows.map((w) => ({ ...w, y: w.y + dy }));
  L.you = { ...L.you, y: L.you.y + dy };
  L.arrows = L.arrows.map((a) => ({ ...a, from: [a.from[0], a.from[1] + dy], to: [a.to[0], a.to[1] + dy], ly: a.ly + dy }));
  L.caption = { y: 924 };
  return L;
}

function baseLayout(variant) {
  if (variant === "v") {
    return {
      W: 1080, H: 1920, ww: 440, wh: 252, bar: 52, title: 28, lineH: 14, lineGap: 36, bodyPad: 32,
      label: 30, youSize: 52, capSize: 96, r: 86,
      windows: [
        { key: "cc", name: "Claude Code", x: 60, y: 330, rot: -1.6 },
        { key: "cx", name: "Codex", x: 580, y: 318, rot: 1.4 },
        { key: "gb", name: "Grok Build", x: 64, y: 1040, rot: 1.8 },
        { key: "cu", name: "Cursor", x: 576, y: 1052, rot: -1.2 },
      ],
      you: { x: 540, y: 812 },
      arrows: [
        { key: "goal", text: "paste goal", from: [478, 746], to: [372, 608], bend: -34, lx: 296, ly: 700 },
        { key: "error", text: "paste error", from: [708, 600], to: [602, 746], bend: -34, lx: 784, ly: 700 },
        { key: "decision", text: "paste decision", from: [478, 878], to: [372, 1022], bend: 34, lx: 270, ly: 928 },
        { key: "context", text: "paste context", from: [330, 312], to: [756, 300], bend: -120, lx: 540, ly: 194 },
        { key: "diff", text: "paste diff", from: [708, 1030], to: [602, 878], bend: 34, lx: 800, ly: 928 },
      ],
      caption: { y: 1470 },
    };
  }
  return {
    W: 1920, H: 1080, ww: 480, wh: 270, bar: 46, title: 24, lineH: 12, lineGap: 34, bodyPad: 30,
    label: 24, youSize: 40, capSize: 64, r: 70,
    windows: [
      { key: "cc", name: "Claude Code", x: 240, y: 150, rot: -1.6 },
      { key: "cx", name: "Codex", x: 1200, y: 140, rot: 1.4 },
      { key: "gb", name: "Grok Build", x: 248, y: 590, rot: 1.8 },
      { key: "cu", name: "Cursor", x: 1196, y: 598, rot: -1.2 },
    ],
    you: { x: 960, y: 505 },
    arrows: [
      { key: "goal", text: "paste goal", from: [902, 462], to: [738, 352], bend: 30, lx: 850, ly: 342 },
      { key: "error", text: "paste error", from: [1184, 344], to: [1018, 462], bend: 30, lx: 1074, ly: 342 },
      { key: "decision", text: "paste decision", from: [902, 548], to: [742, 668], bend: -30, lx: 850, ly: 672 },
      { key: "context", text: "paste context", from: [740, 214], to: [1180, 204], bend: -70, lx: 960, ly: 228 },
      { key: "diff", text: "paste diff", from: [1180, 676], to: [1018, 548], bend: -30, lx: 1080, ly: 672 },
    ],
    caption: { y: 955 },
  };
}

// Quadratic curve from a to b, bowed by `bend` px perpendicular to the chord.
function curve(a, b, bend) {
  const [x0, y0] = a, [x1, y1] = b;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const cx = (x0 + x1) / 2 + nx * bend, cy = (y0 + y1) / 2 + ny * bend;
  const ang = Math.atan2(y1 - cy, x1 - cx);
  // Stop the dashed line under the arrowhead.
  const ex = x1 - Math.cos(ang) * 6, ey = y1 - Math.sin(ang) * 6;
  return { d: `M${f(x0)} ${f(y0)} Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}`, tip: [x1, y1], ang: (ang * 180) / Math.PI };
}

const LINES = [
  [0.62, 0.38, 0.8],
  [0.48, 0.72, 0.56],
  [0.7, 0.44, 0.6],
  [0.54, 0.78, 0.4],
];
const EXTRA = [0.66, 0.5, 0.74, 0.58];

export function build({ variant, start, duration }) {
  const v = variant === "v";
  const L = layout(variant);
  const id = `d1-${variant}`;
  const p = (s) => `${id}-${s}`;
  const S = start;
  const T = (t) => f(S + t);
  const js = [];

  // ---------- HTML ----------
  const wins = L.windows.map((w, i) => {
    const widths = LINES[i];
    const lines = widths.map((lw, j) => `<i class="${p("ln")} ${p(`ln-${w.key}`)}" style="width:${Math.round(lw * 100)}%"></i>`).join("");
    const extra = `<i class="${p("ln")} ${p("ln-x")}" id="${p(`lnx-${w.key}`)}" style="width:${Math.round(EXTRA[i] * 100)}%"></i>`;
    return `<div class="${p("win")}" id="${p(`win-${w.key}`)}" style="left:${w.x}px;top:${w.y}px"><div class="${p("tilt")}" style="transform:rotate(${w.rot}deg)"><div class="${p("bar")}"><span class="${p("dots")}"><b></b><b></b><b></b></span><span class="${p("name")}">${w.name}</span></div><div class="${p("body")}">${lines}${extra}</div></div></div>`;
  }).join("");

  const defs = [];
  const paths = [];
  const labels = [];
  L.arrows.forEach((a) => {
    const c = curve(a.from, a.to, a.bend);
    defs.push(`<mask id="${p(`mask-${a.key}`)}" maskUnits="userSpaceOnUse" x="0" y="0" width="${L.W}" height="${L.H}"><path id="${p(`mp-${a.key}`)}" d="${c.d}" pathLength="100" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-dasharray="100 100" stroke-dashoffset="${v ? 0 : 100}"/></mask>`);
    const [tx, ty] = c.tip;
    const hs = v ? 1.25 : 1;
    paths.push(
      `<path class="${p("arrow")}" d="${c.d}" mask="url(#${p(`mask-${a.key}`)})"/>` +
      `<g id="${p(`head-${a.key}`)}" class="${p("head")}" transform="translate(${tx} ${ty}) rotate(${f(c.ang)}) scale(${hs})"><path d="M0 0 L-17 -8 L-13 0 L-17 8 Z"/></g>` +
      `<path id="${p(`pulse-${a.key}`)}" class="${p("pulse")}" d="${c.d}" pathLength="100"/>`
    );
    labels.push(`<div class="${p("lab")}" id="${p(`lab-${a.key}`)}" style="left:${a.lx}px;top:${a.ly}px"><span>${a.text}</span></div>`);
  });

  const html = `<section id="${id}" class="clip diagram" data-start="${start}" data-duration="${duration}" data-track-index="1">
  ${wins}
  <svg class="${p("svg")}" viewBox="0 0 ${L.W} ${L.H}" width="${L.W}" height="${L.H}"><defs>${defs.join("")}</defs>${paths.join("")}</svg>
  ${labels.join("\n  ")}
  <div class="${p("you")}" id="${p("you")}" style="left:${L.you.x - L.r}px;top:${L.you.y - L.r}px"><span>you</span></div>
  <div class="${p("cap")}" id="${p("cap")}" style="top:${L.caption.y}px"><span class="${p("capt")}" id="${p("capt")}">You = the <span class="${p("rt")}">router<i id="${p("ul")}"></i></span></span></div>
</section>`;

  // ---------- CSS ----------
  const css = `
#${id} { position: absolute; inset: 0; width: ${L.W}px; height: ${L.H}px; background: ${PAPER}; overflow: hidden; font-family: "IBM Plex Sans", sans-serif; color: ${INK}; }
#${id} .${p("win")} { position: absolute; width: ${L.ww}px; height: ${L.wh}px; }
#${id} .${p("tilt")} { position: absolute; inset: 0; box-sizing: border-box; background: ${CREAM}; border: 2px solid ${INK}; border-radius: 10px; overflow: hidden; }
#${id} .${p("bar")} { height: ${L.bar}px; background: ${INK}; display: flex; align-items: center; gap: 16px; padding: 0 18px; }
#${id} .${p("dots")} { display: flex; gap: 8px; }
#${id} .${p("dots")} b { width: ${v ? 12 : 11}px; height: ${v ? 12 : 11}px; border-radius: 50%; background: ${PAPER}; opacity: 0.32; display: block; }
#${id} .${p("name")} { font: 500 ${L.title}px/1 "IBM Plex Sans", sans-serif; color: ${PAPER}; letter-spacing: 0.01em; }
#${id} .${p("body")} { padding: ${L.bodyPad}px ${L.bodyPad}px 0; display: flex; flex-direction: column; gap: ${L.lineGap - L.lineH}px; }
#${id} .${p("ln")} { display: block; height: ${L.lineH}px; border-radius: ${L.lineH / 2}px; background: ${LINE}; transform-origin: 0 50%; }
#${id} .${p("ln")}:first-child { background: #c9cdbf; }
#${id} .${p("svg")} { position: absolute; left: 0; top: 0; overflow: visible; }
#${id} .${p("arrow")} { fill: none; stroke: ${ACCENT}; stroke-width: ${v ? 4 : 3}; stroke-dasharray: ${v ? "12 10" : "10 9"}; stroke-linecap: round; }
#${id} .${p("head")} { fill: ${ACCENT}; }
#${id} .${p("pulse")} { fill: none; stroke: ${ACCENT}; stroke-width: ${v ? 16 : 13}; stroke-linecap: round; stroke-dasharray: 0.01 1000; }
#${id} .${p("lab")} { position: absolute; width: 0; height: 0; }
#${id} .${p("lab")} span { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); white-space: nowrap; font: 500 ${L.label}px/1.2 "IBM Plex Sans", sans-serif; color: ${INK}; background: ${PAPER}; padding: 2px 8px; border-radius: 4px; }
#${id} .${p("you")} { position: absolute; width: ${L.r * 2}px; height: ${L.r * 2}px; box-sizing: border-box; border: 3px solid ${ACCENT}; border-radius: 50%; background: ${PAPER}; display: flex; align-items: center; justify-content: center; }
#${id} .${p("you")} span { font: italic 400 ${L.youSize}px/1 "Newsreader", serif; color: ${INK}; margin-top: -4px; }
#${id} .${p("cap")} { position: absolute; left: 0; right: 0; text-align: center; }
#${id} .${p("capt")} { display: inline-block; padding: 0 0.2em 0.16em; font: italic 400 ${L.capSize}px/1.1 "Newsreader", serif; color: ${INK}; clip-path: inset(-10% -2% -20% -2%); }
#${id} .${p("rt")} { position: relative; display: inline-block; }
#${id} .${p("rt")} i { position: absolute; left: 0.04em; right: -0.02em; bottom: -0.04em; height: ${v ? 6 : 5}px; background: ${ACCENT}; transform-origin: 0 50%; display: block; }
`;

  // h starts empty: initial hidden states live in CSS, the timeline reveals them.
  // v opens on the finished frame (underline included) so frame 0 reads as the thumbnail.
  const hidden = v ? "" : `
#${id} .${p("win")} { opacity: 0; transform: scale(0.92); }
#${id} .${p("ln")} { transform: scaleX(0); }
#${id} .${p("head")}, #${id} .${p("lab")}, #${id} .${p("pulse")}, #${id} .${p("you")} { opacity: 0; }
#${id} .${p("capt")} { clip-path: inset(-10% 102% -20% -2%); }
#${id} .${p("rt")} i { transform: scaleX(0); }
`;

  // ---------- JS (absolute times) ----------
  const sel = (s) => `"#${p(s)}"`;
  const winSel = (k) => sel(`win-${k}`);
  const lines = (k) => `"#${p(`win-${k}`)} .${p(`ln-${k}`)}"`;
  const arrowAt = {}; // key -> local time the arrow finished drawing

  function drawArrow(a, t0, dur) {
    js.push(`tl.fromTo(${sel(`mp-${a}`)}, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: ${dur}, ease: "power2.inOut" }, ${T(t0)});`);
    js.push(`tl.fromTo(${sel(`head-${a}`)}, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, ${T(t0 + dur - 0.08)});`);
    js.push(`tl.fromTo(${sel(`lab-${a}`)}, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }, ${T(t0 + dur - 0.05)});`);
    arrowAt[a] = t0 + dur;
  }

  // Pulses loop along drawn arrows; period shortens at `fast` (local time).
  function pulses(order, fast, slowP, fastP, phases) {
    order.forEach((a, idx) => {
      let t = arrowAt[a];
      let ph = phases[idx];
      js.push(`tl.set(${sel(`pulse-${a}`)}, { opacity: 1 }, ${T(t)});`);
      while (t < duration - 0.02) {
        const P = t >= fast ? fastP : slowP;
        let len = P * (1 - ph);
        if (t < fast && t + len > fast) len = fast - t; // cut the slow cycle at the speed change
        if (t + len > duration) len = duration - t;
        const o0 = -100 * ph;
        const o1 = o0 - (100 * len) / P;
        const a0 = T(t), a1 = T(t + len);
        js.push(`tl.fromTo(${sel(`pulse-${a}`)}, { strokeDashoffset: ${f(o0)} }, { strokeDashoffset: ${f(o1)}, duration: ${f(a1 - a0 - 0.001)}, ease: "none", immediateRender: false }, ${a0});`);
        ph = (ph + len / P) % 1;
        if (Math.abs(ph - 1) < 1e-6) ph = 0;
        t += len;
      }
    });
  }

  const keys = L.windows.map((w) => w.key);
  const arrowKeys = L.arrows.map((a) => a.key);

  if (!v) {
    // 0.0-0.8 windows pop in; their lines start typing.
    keys.forEach((k, i) => {
      js.push(`tl.fromTo(${winSel(k)}, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, ${T(0.04 + i * 0.12)});`);
      js.push(`tl.fromTo(${lines(k)}, { scaleX: 0 }, { scaleX: 1, duration: 0.32, ease: "power1.out", stagger: 0.16 }, ${T(0.32 + i * 0.12)});`);
    });
    // 0.4 "you" fades in.
    js.push(`tl.fromTo(${sel("you")}, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.8)" }, ${T(0.36)});`);

    // b02 words: paste 0.16, goal 0.58, error 1.04, what 1.6, decided 2.5,
    // agents 3.5, write 3.78, code 4.18, You 4.68, routing 5.42 (+0.2 offset).
    drawArrow("goal", 0.5, 0.48);       // "goal" 0.78
    drawArrow("error", 1.16, 0.46);     // "error" 1.24
    drawArrow("decision", 1.8, 0.62);   // "what the other agent"
    drawArrow("context", 2.56, 0.6);    // "decided" 2.7

    // "The agents write the code": each window types one more line and jitters.
    keys.forEach((k, i) => {
      js.push(`tl.fromTo(${sel(`lnx-${k}`)}, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power1.inOut" }, ${T(3.72 + i * 0.1)});`);
    });
    const rnd = lcg(20261012);
    keys.forEach((k) => {
      let t = 3.7;
      for (let n = 0; n < 25; n++) {
        t = 3.7 + n * 0.07;
        const x = f((rnd() * 2 - 1) * 3), y = f((rnd() * 2 - 1) * 3);
        js.push(`tl.to(${winSel(k)}, { x: ${x}, y: ${y}, duration: 0.069, ease: "none" }, ${T(t)});`);
      }
      t = 3.7 + 25 * 0.07;
      js.push(`tl.to(${winSel(k)}, { x: 0, y: 0, duration: 0.12, ease: "power2.out" }, ${T(t)});`);
    });
    drawArrow("diff", 4.0, 0.4);        // Cursor joins in, quickly

    pulses(["goal", "error", "decision", "context", "diff"], 3.7, 1.25, 0.6, [0, 0, 0, 0, 0.3]);

    // "You do the routing": caption writes in, underline under "router".
    js.push(`tl.fromTo(${sel("capt")}, { clipPath: "inset(-10% 102% -20% -2%)" }, { clipPath: "inset(-10% -2% -20% -2%)", duration: 0.9, ease: "power1.inOut" }, ${T(4.86)});`);
    js.push(`tl.fromTo(${sel("ul")}, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "power2.out" }, ${T(5.62)});`);
  } else {
    // S01 opens on the finished sprawl: everything drawn, pulses already running.
    arrowKeys.forEach((a) => {
      arrowAt[a] = 0;
    });
    // Busy agents: a gentle jitter through the opening, settling before the hold.
    const rnd = lcg(1920);
    keys.forEach((k) => {
      let t = 0;
      for (let n = 0; n < 30; n++) {
        t = n * 0.08;
        const x = f((rnd() * 2 - 1) * 3), y = f((rnd() * 2 - 1) * 3);
        js.push(`tl.to(${winSel(k)}, { x: ${x}, y: ${y}, duration: 0.079, ease: "none" }, ${T(t)});`);
      }
      t = 30 * 0.08;
      js.push(`tl.to(${winSel(k)}, { x: 0, y: 0, duration: 0.14, ease: "power2.out" }, ${T(t)});`);
    });
    // s01: "pasting context" 0.3-1.2 (+0.2): the window-to-window arrow nods.
    js.push(`tl.to("#${p("lab-context")} span", { color: "${ACCENT}", duration: 0.2, ease: "none" }, ${T(0.55)});`);
    js.push(`tl.to("#${p("lab-context")} span", { color: "${INK}", duration: 0.3, ease: "none" }, ${T(1.55)});`);
    pulses(["goal", "error", "decision", "context", "diff"], 0, 0.75, 0.75, [0.1, 0.55, 0.3, 0.8, 0.45]);
  }

  return { html, css: css + hidden, js: js.join("\n") };
}
