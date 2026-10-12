// d4 "Reported done is not Verified" (the done ladder).
// h: 1920x1080 keyed to VO b11. v: 1080x1920 keyed to VO s05.
// build({ variant, start, duration }) -> { html, css, js }

const ID = 'd4';

const TOKEN_TEXT = 'Task: CI workflow runs npm test';

const LAYOUTS = {
  h: {
    W: 1920, H: 1080, axis: 'x',
    fs: 24, tokenFs: 24, smallFs: 24, titleFs: 64,
    title: 'Reported done is not Verified',
    titleBox: { left: 120, top: 84, width: 1400 },
    pillH: 60,
    // pill centres along the rail
    pills: [
      { key: 'planned', label: 'Planned', x: 410, y: 504, w: 164 },
      { key: 'progress', label: 'In progress', x: 770, y: 504, w: 204 },
      { key: 'reported', label: 'Reported done', x: 1130, y: 504, w: 234 },
      { key: 'verified', label: 'Verified', x: 1550, y: 504, w: 166 },
    ],
    blocked: { label: 'Blocked', x: 770, y: 652, w: 160, conn: 'M 770 534 V 622' },
    token: { w: 400, h: 58, offX: 0, offY: -100 }, // relative to the pill centre
    worker: { w: 108, h: 58, side: 'left', gap: 10 },
    gate: { x: 1372, bar: { left: 1368, top: 328, width: 8, height: 244 }, origin: '50% 0%', retract: 'scaleY' },
    button: { x: 1372, y: 298, w: 236, h: 60 },
    press: { x: 1372, y: 228, align: 'center', text: 'you press it' },
    person: { x: 1546, y: 298, labelSide: 'right' },
    caption: { x: 1130, y: 568, text: 'a report, not proof' },
    bracket: { d: 'M 410 334 V 316 H 1130 V 334', len: 18 + 720 + 18, label: { x: 770, y: 276 }, text: 'a worker can move it this far' },
    receipt: { left: 1420, top: 566, width: 260 },
  },
  v: {
    W: 1080, H: 1920, axis: 'y',
    fs: 28, tokenFs: 28, smallFs: 28, titleFs: 84,
    title: 'Reported done<br>is not Verified',
    titleBox: { left: 96, top: 236, width: 900 },
    pillH: 68,
    pills: [
      { key: 'planned', label: 'Planned', x: 650, y: 660, w: 190 },
      { key: 'progress', label: 'In progress', x: 650, y: 880, w: 238 },
      { key: 'reported', label: 'Reported done', x: 650, y: 1100, w: 272 },
      { key: 'verified', label: 'Verified', x: 650, y: 1470, w: 194 },
    ],
    blocked: { label: 'Blocked', x: 892, y: 880, w: 164, conn: 'M 769 880 H 810' },
    token: { w: 372, h: 112, offX: -365, offY: 0 },
    worker: { w: 132, h: 64, side: 'top', gap: 16 },
    gate: { x: 0, bar: { left: 92, top: 1281, width: 620, height: 8 }, origin: '100% 50%', retract: 'scaleX' },
    button: { x: 856, y: 1285, w: 284, h: 68 },
    press: { x: 926, y: 1224, align: 'center', text: 'you press it' }, // right edge flush with the button, clear of the caption,
    person: { x: 830, y: 1430, labelSide: 'right' },
    caption: { x: 650, y: 1150, text: 'a report, not proof' },
    arrowStart: { 2: 1206 }, // the Reported done arrow starts below its caption
    bracket: null,
    receipt: null,
  },
};

// Narration word times (seconds from narration start). Local time = 0.2 + word.start.
const CUES = {
  h: { // b11
    pills: 0.2, worker: 0.36, toProgress: 0.84, toReported: 1.38, done: 1.7,
    you: 2.38, cursorIn: 2.62, press: 3.64, open: 4.0, slide: 4.42, check: 5.04, receipt: 5.68,
  },
  v: { // s05
    pills: 0.2, worker: 0.34, toProgress: 0.86, toReported: 1.44, done: 1.74,
    you: 2.44, cursorIn: 2.5, press: 2.98, open: 3.3, slide: 3.6, check: 4.3, receipt: null,
  },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function build({ variant = 'h', start = 0, duration }) {
  const L = LAYOUTS[variant];
  if (!L) throw new Error(`d4: unknown variant ${variant}`);
  const C = CUES[variant];
  const S = `${ID}-${variant}`; // section id
  const p = (n) => `${S}-${n}`; // prefixed class/id
  const dur = duration ?? (variant === 'h' ? 7.4 : 5.4);
  const T = (t) => +(start + t).toFixed(3);
  const half = L.pillH / 2;

  // ---------- geometry ----------
  const P = L.pills;
  const tokenPos = (i) => ({ x: P[i].x + L.token.offX, y: P[i].y + L.token.offY });
  const workerPos = (i) => {
    const t = tokenPos(i);
    if (L.worker.side === 'left') return { x: t.x - L.token.w / 2 - L.worker.gap - L.worker.w / 2, y: t.y };
    return { x: t.x, y: t.y - L.token.h / 2 - L.worker.gap - L.worker.h / 2 };
  };

  // arrows between consecutive pills
  const arrows = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    if (L.axis === 'x') {
      const x1 = a.x + a.w / 2 + 14, x2 = b.x - b.w / 2 - 14, y = a.y;
      arrows.push({ d: `M ${x1} ${y} H ${x2}`, len: x2 - x1, head: `M ${x2 - 11} ${y - 7} L ${x2} ${y} L ${x2 - 11} ${y + 7}` });
    } else {
      const y1 = (L.arrowStart && L.arrowStart[i]) || a.y + half + 14, y2 = b.y - half - 14, x = a.x;
      arrows.push({ d: `M ${x} ${y1} V ${y2}`, len: y2 - y1, head: `M ${x - 7} ${y2 - 11} L ${x} ${y2} L ${x + 7} ${y2 - 11}` });
    }
  }

  // ---------- html ----------
  const anchor = (id, x, y, inner, extraCls = '') =>
    `<div id="${p(id)}" class="${p('anchor')} ${extraCls}" style="left:${x}px;top:${y}px">${inner}</div>`;

  const pillsHtml = P.map((q, i) =>
    anchor(`pa${i}`, q.x, q.y, `<div id="${p(`pill${i}`)}" class="${p('pill')}" style="width:${q.w}px">${esc(q.label)}</div>`)
  ).join('\n');

  const B = L.blocked;
  const blockedHtml = anchor('blocked', B.x, B.y, `<div class="${p('pill')} ${p('pill-blocked')}" style="width:${B.w}px">${esc(B.label)}</div>`);

  const t0 = tokenPos(0), w0 = workerPos(0);
  const tokenHtml = anchor('token', t0.x, t0.y, `<div id="${p('token-card')}" class="${p('token')}" style="width:${L.token.w}px;height:${L.token.h}px">${esc(TOKEN_TEXT)}</div>`);
  const workerHtml = anchor('worker', w0.x, w0.y, `<div class="${p('worker')}" style="width:${L.worker.w}px;height:${L.worker.h}px">worker</div>`);

  const G = L.gate;
  const gateHtml = `<div id="${p('gate')}" class="${p('gate')}" style="left:${G.bar.left}px;top:${G.bar.top}px;width:${G.bar.width}px;height:${G.bar.height}px;transform-origin:${G.origin}"></div>`;
  const btn = L.button;
  const buttonHtml = anchor('btn-a', btn.x, btn.y, `<div id="${p('btn')}" class="${p('btn')}" style="width:${btn.w}px;height:${btn.h}px">Run verification</div>`);
  const pressHtml = anchor('press', L.press.x, L.press.y, `<div class="${p('small')}">${esc(L.press.text)}</div>`);

  const personSvg = `<svg class="${p('person-svg')}" width="48" height="60" viewBox="0 0 48 60" aria-hidden="true"><circle cx="24" cy="17" r="12" fill="none" stroke="#252820" stroke-width="3"/><path d="M4 58 C4 41 13 34 24 34 C35 34 44 41 44 58" fill="none" stroke="#252820" stroke-width="3" stroke-linecap="round"/></svg>`;
  const personHtml = anchor('person', L.person.x, L.person.y, `<div class="${p('person')}">${personSvg}<span class="${p('person-label')}">you</span></div>`);

  const cursorSvg = `<svg width="40" height="48" viewBox="0 0 40 48" aria-hidden="true"><path d="M4 3 L4 38 L13 30 L19.5 44 L26 41 L19.5 27.5 L31 27.5 Z" fill="#252820" stroke="#f6f4ee" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  const curStart = { x: L.person.x - 10, y: L.person.y + 10 };
  const cursorHtml = `<div id="${p('cursor')}" class="${p('cursor')}" style="left:${curStart.x}px;top:${curStart.y}px">${cursorSvg}</div>`;

  const captionHtml = anchor('cap', L.caption.x, L.caption.y, `<div class="${p('caption')}">${esc(L.caption.text)}</div>`, p('anchor-top'));

  const br = L.bracket;
  const bracketLabelHtml = br ? anchor('br-label', br.label.x, br.label.y, `<div class="${p('small')} ${p('accent-text')}">${esc(br.text)}</div>`) : '';

  let receiptHtml = '';
  if (L.receipt) {
    const R = L.receipt;
    const check = `<svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true"><path d="M3 12 L10 18.5 L23 4" fill="none" stroke="#bd481f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const bar = (w) => `<span class="${p('rbar')}" style="width:${w}px"></span>`;
    const zig = (() => {
      const n = 13, w = R.width, step = w / n; let d = `M 0 0`;
      for (let i = 0; i < n; i++) d += ` L ${(i + 0.5) * step} 10 L ${(i + 1) * step} 0`;
      return `<svg class="${p('zig')}" width="${w}" height="12" viewBox="0 0 ${w} 12" preserveAspectRatio="none" aria-hidden="true"><path d="${d} Z" fill="#fffdf7" stroke="#d9dcd0" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    })();
    receiptHtml = `<div id="${p('slot')}" class="${p('slot')}" style="left:${R.left - 14}px;top:${R.top - 6}px;width:${R.width + 28}px"></div>
<div id="${p('receipt')}" class="${p('receipt')}" style="left:${R.left}px;top:${R.top}px;width:${R.width}px">
  <div class="${p('rhead')}">receipt</div>
  <div class="${p('row')}" id="${p('row0')}"><span>outcome</span>${check}</div>
  <div class="${p('row')}" id="${p('row1')}"><span>exit code</span><span class="${p('mono')}">0</span></div>
  <div class="${p('row')}" id="${p('row2')}"><span>output</span><span class="${p('bars')}">${bar(64)}${bar(38)}</span></div>
  <div class="${p('row')}" id="${p('row3')}"><span>hash</span><span class="${p('bars')}">${bar(86)}</span></div>
  ${zig}
</div>`;
  }

  const svg = `<svg class="${p('svg')}" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}" aria-hidden="true">
  ${arrows.map((a, i) => `<path id="${p(`ar${i}`)}" d="${a.d}" class="${p('stroke')}" stroke-dasharray="${a.len}" stroke-dashoffset="${a.len}"/><path id="${p(`ah${i}`)}" d="${a.head}" class="${p('stroke')} ${p('head')}"/>`).join('\n  ')}
  <path id="${p('bconn')}" d="${B.conn}" class="${p('stroke')} ${p('dashed')}"/>
  ${br ? `<path id="${p('bracket')}" d="${br.d}" class="${p('bracket')}" stroke-dasharray="${br.len}" stroke-dashoffset="${br.len}"/>` : ''}
</svg>`;

  const html = `<section id="${S}" class="clip diagram" data-start="${start}" data-duration="${dur}" data-track-index="1">
<div id="${p('title')}" class="${p('title')}" style="left:${L.titleBox.left}px;top:${L.titleBox.top}px;width:${L.titleBox.width}px">${L.title}</div>
${svg}
${bracketLabelHtml}
${blockedHtml}
${pillsHtml}
${gateHtml}
${buttonHtml}
${pressHtml}
${personHtml}
${captionHtml}
${receiptHtml}
${workerHtml}
${tokenHtml}
${cursorHtml}
</section>`;

  // ---------- css ----------
  const s = `#${S}`;
  const css = `
${s} { position: absolute; inset: 0; width: ${L.W}px; height: ${L.H}px; overflow: hidden; background: #f6f4ee; color: #252820; font-family: "IBM Plex Sans", sans-serif; }
${s} .${p('svg')} { position: absolute; left: 0; top: 0; }
${s} .${p('stroke')} { fill: none; stroke: #252820; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
${s} .${p('head')} { opacity: 0; }
${s} .${p('dashed')} { stroke-dasharray: 6 7; opacity: 0; }
${s} .${p('bracket')} { fill: none; stroke: #bd481f; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
${s} .${p('title')} { position: absolute; font: italic 400 ${L.titleFs}px/1.06 "Newsreader", serif; color: #252820; letter-spacing: -0.01em; }
${s} .${p('anchor')} { position: absolute; width: 0; height: 0; }
${s} .${p('anchor')} > * { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); }
${s} .${p('anchor-top')} > * { transform: translate(-50%, 0); }
${s} .${p('pill')} { box-sizing: border-box; height: ${L.pillH}px; display: flex; align-items: center; justify-content: center; white-space: nowrap;
  border: 1.5px solid #252820; border-radius: ${half}px; background: #fffdf7; font: 500 ${L.fs}px/1 "IBM Plex Sans", sans-serif; color: #252820; }
${s} .${p('pill-blocked')} { border-color: #65695e; color: #65695e; }
${s} #${p('pa0')}, ${s} #${p('pa1')}, ${s} #${p('pa2')}, ${s} #${p('pa3')}, ${s} #${p('blocked')} { opacity: 0; }
${s} .${p('token')} { box-sizing: border-box; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 20px;
  background: #fffdf7; border: 1.5px solid #252820; border-radius: 6px; font: 500 ${L.tokenFs}px/1.25 "IBM Plex Sans", sans-serif; color: #252820; text-wrap: balance;
  ${variant === 'h' ? 'white-space: nowrap;' : ''} }
${s} #${p('token')}, ${s} #${p('worker')} { opacity: 0; }
${s} .${p('worker')} { box-sizing: border-box; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: #252820; color: #f6f4ee;
  font: 500 ${L.fs}px/1 "IBM Plex Sans", sans-serif; }
${s} .${p('gate')} { position: absolute; background: #bd481f; border-radius: 4px; opacity: 0; }
${s} .${p('btn')} { box-sizing: border-box; display: flex; align-items: center; justify-content: center; white-space: nowrap; border: 2px solid #bd481f; border-radius: 8px;
  background: #fffdf7; color: #bd481f; font: 600 ${L.fs}px/1 "IBM Plex Sans", sans-serif; }
${s} #${p('btn-a')} { opacity: 0; }
${s} .${p('small')} { white-space: nowrap; font: 400 ${L.smallFs}px/1.2 "IBM Plex Sans", sans-serif; color: #65695e; }
${s} .${p('accent-text')} { color: #bd481f; font-weight: 500; }
${s} #${p('press')}, ${s} #${p('br-label')}, ${s} #${p('person')}, ${s} #${p('cap')} { opacity: 0; }
${s} .${p('person')} { display: flex; align-items: center; gap: 14px; }
${s} .${p('person')} > svg { display: block; }
${s} .${p('person-label')} { font: 500 ${L.fs}px/1 "IBM Plex Sans", sans-serif; color: #252820; }
${s} .${p('caption')} { white-space: nowrap; font: italic 400 ${Math.round(L.fs * 1.25)}px/1.1 "Newsreader", serif; color: #65695e; }
${s} .${p('cursor')} { position: absolute; opacity: 0; transform-origin: 4px 3px; }
${s} .${p('cursor')} svg { display: block; }
${s} .${p('slot')} { position: absolute; height: 6px; border-radius: 3px; background: #252820; opacity: 0; }
${s} .${p('receipt')} { position: absolute; box-sizing: border-box; padding: 16px 22px 18px; background: #fffdf7; border: 1.5px solid #d9dcd0; border-bottom: none;
  font: 400 22px/1 "IBM Plex Sans", sans-serif; color: #252820; clip-path: inset(0% 0% 100% 0%); }
${s} .${p('rhead')} { font: 500 22px/1 "IBM Plex Sans", sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #65695e; padding-bottom: 12px; border-bottom: 1.5px dashed #d9dcd0; }
${s} .${p('row')} { display: flex; align-items: center; justify-content: space-between; height: 46px; border-bottom: 1px dashed #d9dcd0; opacity: 0; }
${s} .${p('row')}:last-of-type { border-bottom: none; }
${s} .${p('mono')} { font: 500 22px/1 ui-monospace, Menlo, monospace; }
${s} .${p('bars')} { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
${s} .${p('rbar')} { display: block; height: 6px; border-radius: 3px; background: #d9dcd0; }
${s} .${p('zig')} { position: absolute; left: -1.5px; bottom: -11px; width: calc(100% + 3px); display: block; }
`;

  // ---------- js ----------
  const q = (n) => `"#${p(n)}"`;
  const lines = [];
  const add = (str) => lines.push(str);
  const c = C;

  // title is on screen from the first frame, so the beat never opens on a blank page

  // pills left to right / top to bottom, 0.12 stagger
  const off = L.axis === 'x' ? { y: 12 } : { x: -12 };
  const offTo = L.axis === 'x' ? 'y: 0' : 'x: 0';
  const offFrom = L.axis === 'x' ? 'y: 12' : 'x: -12';
  P.forEach((_, i) => {
    add(`tl.fromTo(${q(`pa${i}`)}, { ${offFrom}, opacity: 0 }, { ${offTo}, opacity: 1, duration: 0.3, ease: "power2.out" }, ${T(c.pills + i * 0.12)});`);
  });
  void off;
  arrows.forEach((a, i) => {
    const at = c.pills + 0.12 + i * 0.12;
    add(`tl.to(${q(`ar${i}`)}, { strokeDashoffset: 0, duration: 0.28, ease: "power1.inOut" }, ${T(at)});`);
    add(`tl.to(${q(`ah${i}`)}, { opacity: 1, duration: 0.1, ease: "none" }, ${T(at + 0.24)});`);
  });
  // blocked side branch, static at 40%
  add(`tl.to(${q('bconn')}, { opacity: 0.4, duration: 0.25, ease: "none" }, ${T(c.pills + 0.3)});`);
  add(`tl.fromTo(${q('blocked')}, { ${offFrom}, opacity: 0 }, { ${offTo}, opacity: 0.4, duration: 0.3, ease: "power2.out" }, ${T(c.pills + 0.3)});`);
  // gate + button
  const gateFrom = G.retract === 'scaleY' ? 'scaleY: 0' : 'scaleX: 0';
  const gateTo = G.retract === 'scaleY' ? 'scaleY: 1' : 'scaleX: 1';
  add(`tl.fromTo(${q('gate')}, { ${gateFrom}, opacity: 1 }, { ${gateTo}, opacity: 1, duration: 0.35, ease: "power2.out" }, ${T(c.pills + 0.5)});`);
  add(`tl.fromTo(${q('btn-a')}, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }, ${T(c.pills + 0.45)});`);

  // token on Planned, worker beside it
  add(`tl.fromTo(${q('token')}, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.6)" }, ${T(c.pills + 0.1)});`);
  add(`tl.set(${q('pill0')}, { backgroundColor: "#eff2e8" }, ${T(c.pills + 0.35)});`);
  add(`tl.fromTo(${q('worker')}, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.6)" }, ${T(c.worker)});`);

  // pushes
  const axis = L.axis;
  const push = (i, at, d = 0.4) => {
    const tp = tokenPos(i), wp = workerPos(i), tp0 = tokenPos(0), wp0 = workerPos(0);
    const dt = axis === 'x' ? `x: ${tp.x - tp0.x}` : `y: ${tp.y - tp0.y}`;
    const dw = axis === 'x' ? `x: ${wp.x - wp0.x}` : `y: ${wp.y - wp0.y}`;
    add(`tl.to(${q('token')}, { ${dt}, duration: ${d}, ease: "power2.inOut" }, ${T(at)});`);
    add(`tl.to(${q('worker')}, { ${dw}, duration: ${d}, ease: "power2.inOut" }, ${T(at)});`); // same curve as the token, so the gap never closes
    // landing: small settle on the card + pill state swap
    add(`tl.to(${q('token-card')}, { scale: 1.04, duration: 0.08, ease: "power1.out", yoyo: true, repeat: 1 }, ${T(at + d - 0.02)});`);
    add(`tl.set(${q(`pill${i - 1}`)}, { backgroundColor: "#fffdf7" }, ${T(at + d)});`);
    add(`tl.set(${q(`pill${i}`)}, { backgroundColor: "#eff2e8" }, ${T(at + d)});`);
  };
  push(1, c.toProgress);
  push(2, c.toReported);

  // bracket: a worker can move it this far
  if (br) {
    add(`tl.to(${q('bracket')}, { strokeDashoffset: 0, duration: 0.8, ease: "power1.inOut" }, ${T(c.toProgress + 0.1)});`);
    add(`tl.fromTo(${q('br-label')}, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, ${T(c.toProgress + 0.55)});`);
  }

  // Reported done turns dashed
  add(`tl.set(${q('pill2')}, { borderStyle: "dashed", borderWidth: 2 }, ${T(c.done + 0.1)});`);

  // bump the gate and stop with a small shake
  const bumpAt = c.done + 0.2;
  const tpR = tokenPos(2), tp0 = tokenPos(0);
  let bump;
  if (axis === 'x') {
    const base = tpR.x - tp0.x;
    const reach = (G.bar.left - 2) - (tpR.x + L.token.w / 2); // distance to the bar
    bump = { k: 'x', base, reach };
  } else {
    const base = tpR.y - tp0.y;
    const reach = (G.bar.top - 2) - (tpR.y + L.token.h / 2);
    bump = { k: 'y', base, reach };
  }
  add(`tl.to(${q('token')}, { ${bump.k}: ${bump.base + bump.reach}, duration: 0.12, ease: "power2.in" }, ${T(bumpAt)});`);
  add(`tl.to(${q('token')}, { ${bump.k}: ${bump.base}, duration: 0.3, ease: "power3.out" }, ${T(bumpAt + 0.12)});`);
  add(`tl.to(${q('token-card')}, { keyframes: [{ rotation: -2, duration: 0.05 }, { rotation: 2, duration: 0.07 }, { rotation: -1, duration: 0.06 }, { rotation: 0, duration: 0.06 }], ease: "none" }, ${T(bumpAt + 0.12)});`);
  add(`tl.to(${q('gate')}, { opacity: 0.55, duration: 0.08, yoyo: true, repeat: 1, ease: "none" }, ${T(bumpAt + 0.1)});`);
  add(`tl.fromTo(${q('cap')}, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, ${T(bumpAt + 0.15)});`);

  // the person, and "you press it"
  add(`tl.fromTo(${q('person')}, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, ${T(c.you - 0.04)});`);
  add(`tl.fromTo(${q('press')}, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, ${T(c.you + 0.06)});`);

  // cursor travels from the person to the button and clicks
  const curEnd = { x: btn.x + 6, y: btn.y + 2 };
  const travel = Math.max(0.3, c.press - 0.12 - (c.cursorIn + 0.12));
  add(`tl.fromTo(${q('cursor')}, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none" }, ${T(c.cursorIn)});`);
  add(`tl.to(${q('cursor')}, { x: ${curEnd.x - curStart.x}, y: ${curEnd.y - curStart.y}, duration: ${travel.toFixed(3)}, ease: "power2.inOut" }, ${T(c.cursorIn + 0.12)});`);
  add(`tl.to(${q('cursor')}, { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1, ease: "power1.inOut" }, ${T(c.press - 0.04)});`);
  add(`tl.set(${q('btn')}, { backgroundColor: "#bd481f", color: "#f6f4ee" }, ${T(c.press)});`);
  add(`tl.to(${q('btn-a')}, { scale: 0.95, duration: 0.08, yoyo: true, repeat: 1, ease: "power1.inOut" }, ${T(c.press)});`);
  add(`tl.to(${q('cursor')}, { opacity: 0, duration: 0.25, ease: "none" }, ${T(c.press + 0.45)});`);

  // the gate opens (retracts into the button), token slides to Verified
  const gateOpen = G.retract === 'scaleY' ? 'scaleY: 0' : 'scaleX: 0';
  add(`tl.to(${q('gate')}, { ${gateOpen}, duration: 0.35, ease: "power2.inOut" }, ${T(c.open)});`);
  const tpV = tokenPos(3);
  const dV = axis === 'x' ? `x: ${tpV.x - tp0.x}` : `y: ${tpV.y - tp0.y}`;
  const slideD = Math.max(0.45, Math.min(0.65, c.check - c.slide - 0.05));
  add(`tl.to(${q('token')}, { ${dV}, duration: ${slideD.toFixed(3)}, ease: "power2.inOut" }, ${T(c.slide)});`);
  add(`tl.set(${q('pill2')}, { backgroundColor: "#fffdf7" }, ${T(c.slide + 0.1)});`);
  add(`tl.to(${q('token-card')}, { borderColor: "#bd481f", duration: 0.2, ease: "none" }, ${T(c.slide + slideD - 0.05)});`);
  add(`tl.set(${q('pill3')}, { backgroundColor: "#bd481f", color: "#f6f4ee", borderColor: "#bd481f" }, ${T(c.check)});`);
  add(`tl.to(${q('pa3')}, { scale: 1.06, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.out" }, ${T(c.check)});`);

  // receipt prints downward row by row
  if (L.receipt && c.receipt != null) {
    add(`tl.to(${q('slot')}, { opacity: 1, duration: 0.15, ease: "none" }, ${T(c.receipt - 0.15)});`);
    add(`tl.to(${q('receipt')}, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "power1.out" }, ${T(c.receipt)});`);
    for (let i = 0; i < 4; i++) {
      add(`tl.fromTo(${q(`row${i}`)}, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, ${T(c.receipt + 0.14 + i * 0.13)});`);
    }
    add(`tl.to(${q('slot')}, { opacity: 0, duration: 0.25, ease: "none" }, ${T(c.receipt + 0.8)});`);
  }

  return { html, css, js: lines.join('\n') };
}

export default build;
