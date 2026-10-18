import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {C, FONT} from '../studio-tutorial/theme';
import {Backdrop, Chip, Copy, Eyebrow, Highlight, Pop, Reveal, ScaleCtx, SourceNote, Window} from '../studio-tutorial/primitives';

// How to join a Mac to a SpecWithCode cluster. Product scenes are real screenshots
// (1440x900 CSS px at 2x) captured headless from a private test server built from
// specwithcode main; the invitation line is masked. Anything drawn is labelled.
const SRC_W = 1440;
const SRC_H = 900;
const WIN = {left: 712, top: 176, w: 1088, h: 680};
const SHOT = 'Screenshot · SpecWithCode 1.0.43, captured 18 Oct 2026';

const ease = Easing.bezier(0.65, 0, 0.35, 1);
type Rect = [x: number, y: number, w: number];
type CamKey = {f: number; r: Rect};

/** A still screenshot through a moving camera. Keys are rects in source CSS px. */
const Still: React.FC<{src: string; keys: CamKey[]; children?: React.ReactNode}> = ({src, keys, children}) => {
  const frame = useCurrentFrame();
  let r = keys[0].r;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (frame >= a.f && frame <= b.f) {
      const t = ease((frame - a.f) / Math.max(1, b.f - a.f));
      r = [0, 1, 2].map((k) => a.r[k] + (b.r[k] - a.r[k]) * t) as Rect;
    } else if (frame > b.f) r = b.r;
  }
  const s = WIN.w / r[2];
  return <div style={{position: 'absolute', inset: 0}}>
    <div style={{position: 'absolute', width: SRC_W, height: SRC_H, transformOrigin: '0 0', transform: `scale(${s}) translate(${-r[0]}px, ${-r[1]}px)`}}>
      <Img src={staticFile(src)} style={{width: SRC_W, height: SRC_H, display: 'block'}} />
      <ScaleCtx.Provider value={s}>{children}</ScaleCtx.Provider>
    </div>
  </div>;
};

const FULL: Rect = [0, 0, SRC_W];

/** Corner tag that says what the window shows. */
const Tag: React.FC<{kind: 'screenshot' | 'illustration' | 'terminal'}> = ({kind}) => {
  const label = {screenshot: 'Real screenshot', illustration: 'Illustration', terminal: 'Terminal graphic'}[kind];
  return <div style={{position: 'absolute', left: WIN.left + WIN.w - 18, top: WIN.top - 22, transform: 'translateX(-100%)'}}>
    <Pop at={18}><Chip tone={kind === 'screenshot' ? 'olive' : 'rust'} size={17}>{label}</Chip></Pop>
  </div>;
};

const Split: React.FC<{copy: React.ReactNode; children: React.ReactNode; note: string; kind: 'screenshot' | 'illustration' | 'terminal'}> = ({copy, children, note, kind}) =>
  <AbsoluteFill>
    <Backdrop />
    <div style={{position: 'absolute', left: 110, top: 0, bottom: 0, display: 'flex', alignItems: 'center'}}>{copy}</div>
    {children}
    <Tag kind={kind} />
    <SourceNote>{note}</SourceNote>
  </AbsoluteFill>;

const InWindow: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) =>
  <div style={{position: 'absolute', left: WIN.left, top: WIN.top}}>
    <Window w={WIN.w} h={WIN.h} title={title} delay={4}>{children}</Window>
  </div>;

/** Label laid over the masked invitation line, in source px. */
const MaskLabel: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => {
  const frame = useCurrentFrame();
  return <div style={{position: 'absolute', left: x, top: y, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.sans, fontWeight: 500, fontSize: 12, color: '#fff', letterSpacing: '0.02em', opacity: interpolate(frame, [30, 44], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
    Line hidden in this video · it works like a password
  </div>;
};

const Opening: React.FC = () =>
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Backdrop />
    <div style={{textAlign: 'center'}}>
      <Eyebrow delay={2} color={C.muted}>SpecWithCode · Connections</Eyebrow>
      <div style={{height: 36}} />
      <Reveal delay={8}><div style={{fontFamily: FONT.serif, fontSize: 128, lineHeight: 1, color: C.ink, letterSpacing: '-0.03em'}}>Add another Mac</div></Reveal>
      <Reveal delay={16}><div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 128, lineHeight: 1.12, color: C.olive, letterSpacing: '-0.03em'}}>with one line.</div></Reveal>
      <div style={{height: 52}} />
      <div style={{display: 'flex', gap: 14, justifyContent: 'center'}}>
        {['Tailscale on both Macs', 'SpecWithCode on both', 'About two minutes'].map((a, i) =>
          <Pop key={a} at={34 + i * 7}><Chip tone="soft" size={22}>{a}</Chip></Pop>)}
      </div>
    </div>
  </AbsoluteFill>;

/** Diagram of the two roles. Drawn, not captured. */
const Roles: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [50, 95], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const Box: React.FC<{title: string; sub: string; at: number; tone: string}> = ({title, sub, at, tone}) =>
    <Pop at={at}><div style={{width: 420, padding: '34px 38px', background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 18, boxShadow: '0 30px 60px -36px rgba(32,35,28,.4)'}}>
      <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 17, letterSpacing: '0.14em', textTransform: 'uppercase', color: tone}}>{sub}</div>
      <div style={{height: 12}} />
      <div style={{fontFamily: FONT.serif, fontSize: 48, color: C.ink, letterSpacing: '-0.02em'}}>{title}</div>
    </div></Pop>;
  return <AbsoluteFill>
    <Backdrop />
    <div style={{position: 'absolute', top: 150, width: '100%', textAlign: 'center'}}>
      <Reveal delay={4}><div style={{fontFamily: FONT.serif, fontSize: 64, color: C.ink, letterSpacing: '-0.02em'}}>The new Mac makes a line.</div></Reveal>
      <Reveal delay={12}><div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 64, color: C.olive, letterSpacing: '-0.02em'}}>Your main machine accepts it.</div></Reveal>
    </div>
    <div style={{position: 'absolute', top: 480, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40}}>
      <Box title="MacBook Air" sub="New Mac · makes the line" at={26} tone={C.rust} />
      <div style={{position: 'relative', width: 300, height: 60}}>
        <div style={{position: 'absolute', top: 28, left: 0, width: 300, height: 4, background: C.line, borderRadius: 2}} />
        <div style={{position: 'absolute', top: 28, left: 0, width: 300 * t, height: 4, background: C.olive, borderRadius: 2}} />
        <div style={{position: 'absolute', top: 18, left: 300 * t - 12, width: 24, height: 24, borderRadius: 12, background: C.olive, opacity: t > 0 && t < 1 ? 1 : 0}} />
        <div style={{position: 'absolute', top: -14, width: 300, textAlign: 'center', fontFamily: FONT.mono, fontSize: 19, color: C.muted, opacity: t}}>private tailnet</div>
      </div>
      <Box title="Main machine" sub="Accepts · runs coordinators" at={36} tone={C.olive} />
    </div>
    <SourceNote>Diagram, not a screenshot</SourceNote>
  </AbsoluteFill>;
};

const Choice: React.FC = () =>
  <Split kind="screenshot" note={SHOT} copy={<Copy width={540} eyebrow="01 / On the new Mac" line1="Open SpecWithCode." line2="Choose Join." body="The first run asks how you will use this Mac. Pick Join my existing machines." />}>
    <InWindow title="SpecWithCode · first run">
      <Still src="01-machine-choice.png" keys={[{f: 0, r: FULL}, {f: 40, r: FULL}, {f: 85, r: [250, 240, 940]}]}>
        <Highlight x={361} y={478} w={718} h={44} from={95} color={C.olive} />
      </Still>
    </InWindow>
  </Split>;

const Ready: React.FC = () =>
  <Split kind="screenshot" note={SHOT} copy={<Copy width={540} eyebrow="02 / Tailscale check" line1="Tailscale is ready." line2="Name this Mac." body="The app checks Tailscale is installed and signed in. Give the Mac the name your main machine will show." />}>
    <InWindow title="SpecWithCode · Join">
      <Still src="02-join-tailscale-ready.png" keys={[{f: 0, r: FULL}, {f: 35, r: FULL}, {f: 80, r: [250, 230, 940]}]}>
        <Highlight x={362} y={486} w={716} h={30} from={88} to={150} color={C.olive} />
        <Highlight x={361} y={529} w={107} h={28} from={155} />
      </Still>
    </InWindow>
  </Split>;

const Line: React.FC = () =>
  <Split kind="screenshot" note={`${SHOT}. The line is masked; it was revoked right after capture.`} copy={<Copy width={540} eyebrow="03 / Make the line" line1="Copy the line." line2="Treat it like a password." body="Make the line publishes this Mac on its private Tailscale name. Copy it; Revoke this line cancels it anywhere." />}>
    <InWindow title="SpecWithCode · Join">
      <Still src="03-line-made-masked.png" keys={[{f: 0, r: FULL}, {f: 35, r: FULL}, {f: 80, r: [250, 230, 940]}]}>
        <MaskLabel x={362} y={452} w={636} h={26} />
        <Highlight x={1007} y={451} w={72} h={28} from={95} to={170} color={C.olive} />
        <Highlight x={361} y={544} w={106} h={24} from={175} />
      </Still>
    </InWindow>
  </Split>;

const Joined: React.FC = () =>
  <Split kind="screenshot" note={SHOT} copy={<Copy width={540} eyebrow="04 / Keep it running" line1="This Mac is done." line2="Leave the app open." body="Its next screen says what is left: paste the line on your main machine, then allow workers there." />}>
    <InWindow title="SpecWithCode · Join">
      <Still src="03b-joined-ready.png" keys={[{f: 0, r: FULL}, {f: 35, r: FULL}, {f: 80, r: [300, 260, 840]}]}>
        <Highlight x={361} y={401} w={718} h={32} from={90} color={C.olive} />
      </Still>
    </InWindow>
  </Split>;

const Add: React.FC = () =>
  <Split kind="screenshot" note={`${SHOT}. Shown empty; paste your own line here.`} copy={<Copy width={540} eyebrow="05 / On the main machine" line1="Settings › Connections." line2="Add a machine." body="Paste the line into Add a machine, then choose Add machine. The new Mac shows up in Your private machines." />}>
    <InWindow title="Settings · Connections">
      <Still src="04-connections-add-a-machine.png" keys={[{f: 0, r: FULL}, {f: 35, r: FULL}, {f: 85, r: [400, 110, 900]}]}>
        <Highlight x={418} y={200} w={860} h={73} from={92} to={160} color={C.olive} />
        <Highlight x={878} y={223} w={285} h={28} from={165} />
      </Still>
    </InWindow>
  </Split>;

/** A drawn machine card, in source px, laid over the real Connections screenshot. */
const WorkersCallout: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const btn = interpolate(frame, [at + 40, at + 52], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <>
    <div style={{position: 'absolute', inset: 0, background: 'rgba(246,244,238,.55)', opacity: p}} />
    <div style={{position: 'absolute', left: 430, top: 150, width: 836, padding: '14px 18px', background: C.card, border: `2px dashed ${C.rust}`, borderRadius: 10, opacity: p, transform: `translateY(${(1 - p) * 14}px)`, fontFamily: FONT.sans, boxShadow: '0 20px 40px -24px rgba(32,35,28,.45)'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <span style={{width: 9, height: 9, borderRadius: 5, background: C.olive}} />
        <span style={{fontSize: 15, fontWeight: 600, color: C.ink}}>MacBook Air</span>
        <span style={{fontSize: 12, color: C.muted}}>Connected</span>
        <span style={{marginLeft: 'auto', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: C.rust}}>ILLUSTRATION</span>
      </div>
      <div style={{marginTop: 8, paddingLeft: 19, fontSize: 12, color: C.muted}}>Coordinators here cannot start workers on this machine.</div>
      <div style={{marginTop: 8, paddingLeft: 19, display: 'flex', gap: 8, alignItems: 'center'}}>
        <span style={{fontSize: 12, padding: '4px 10px', border: `1px solid ${C.line}`, borderRadius: 6, color: C.ink}}>Supervised ▾</span>
        <span style={{fontSize: 12, fontWeight: 500, padding: '4px 10px', border: `1.5px solid ${btn > 0.5 ? C.olive : C.line}`, background: btn > 0.5 ? C.oliveSoft : C.card, borderRadius: 6, color: C.ink}}>Allow workers</span>
      </div>
    </div>
  </>;
};

const Allow: React.FC = () =>
  <Split kind="illustration" note="Illustration: the machine card is drawn over a real Connections screenshot. It appears once a machine is added." copy={<Copy width={540} eyebrow="06 / Allow workers" line1="Allow workers" line2="on its card." body="Once the Mac is added, its card offers Allow workers. Pick the most access a worker gets, and coordinators can start work there." />}>
    <InWindow title="Settings · Connections">
      <Still src="04-connections-add-a-machine.png" keys={[{f: 0, r: [400, 110, 900]}, {f: 20, r: [400, 110, 900]}]}>
        <WorkersCallout at={22} />
      </Still>
    </InWindow>
  </Split>;

const Invite: React.FC = () =>
  <Split kind="screenshot" note={SHOT} copy={<Copy width={540} eyebrow="Already set up?" line1="Settings › Connections." line2="Invite this machine." body="On a Mac that already finished setup, Invite this machine makes the same line from Settings." />}>
    <InWindow title="Settings · Connections">
      <Still src="05-invite-dialog.png" keys={[{f: 0, r: FULL}, {f: 35, r: FULL}, {f: 80, r: [380, 230, 680]}]}>
        <Highlight x={521} y={509} w={107} h={28} from={92} />
      </Still>
    </InWindow>
  </Split>;

const TermLine: React.FC<{at: number; text: string; prompt?: boolean; color?: string; speed?: number}> = ({at, text, prompt, color = '#e9e7dd', speed = 1.4}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const n = prompt ? Math.min(text.length, Math.floor((frame - at) * speed)) : text.length;
  const caret = prompt && n < text.length;
  return <div style={{fontFamily: FONT.mono, fontSize: 22, lineHeight: 1.55, color, whiteSpace: 'pre-wrap'}}>
    {prompt && <span style={{color: '#9fb57f'}}>$ </span>}{text.slice(0, n)}{caret && <span style={{background: '#e9e7dd', color: 'transparent'}}>_</span>}
  </div>;
};

const Masked: React.FC<{at: number; w: number}> = ({at, w}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  return <div style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: w, height: 26, borderRadius: 4, background: C.olive, color: '#fff', fontFamily: FONT.sans, fontSize: 15, verticalAlign: 'middle'}}>line hidden</div>;
};

const Cli: React.FC = () =>
  <Split kind="terminal" note="Styled terminal graphic of specwithcode 1.0.43 output, abridged. Address and line are placeholders." copy={<Copy width={540} eyebrow="Or from a terminal" line1="One command" line2="on the new Mac." body="With the app running, the CLI prints the same line, plus the command to paste on your main machine." />}>
    <div style={{position: 'absolute', left: WIN.left, top: 250}}>
      <Window w={WIN.w} h={520} title="MacBook Air · zsh" delay={4} dark>
        <div style={{padding: '30px 36px'}}>
          <TermLine at={18} prompt text={'specwithcode fleet invite --label "MacBook Air"'} />
          <div style={{height: 14}} />
          <TermLine at={90} color="#c9c7bb" text="MacBook Air is published at https://macbook-air.<tailnet>.ts.net (private to your tailnet)." />
          <div style={{height: 12}} />
          <TermLine at={104} color="#c9c7bb" text="On your primary machine, run:" />
          <div style={{fontFamily: FONT.mono, fontSize: 22, lineHeight: 1.7, color: '#e9e7dd', whiteSpace: 'pre', opacity: useCurrentFrame() >= 112 ? 1 : 0}}>
            {'  specwithcode fleet add '}<Masked at={112} w={360} />
          </div>
          <div style={{height: 12}} />
          <TermLine at={124} color="#c9c7bb" text="or paste the line below into Settings > Connections > Add a machine there." />
          <div style={{height: 8}} />
          <Masked at={132} w={740} />
          <div style={{height: 14}} />
          <TermLine at={144} color="#8a8d80" text="It works until … Treat it like a password. Revoke it with `specwithcode auth session revoke …`." />
        </div>
      </Window>
    </div>
  </Split>;

const Cta: React.FC = () =>
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Backdrop />
    <div style={{textAlign: 'center'}}>
      <Eyebrow delay={2} color={C.muted}>Recap</Eyebrow>
      <div style={{height: 34}} />
      <Reveal delay={8}><div style={{fontFamily: FONT.serif, fontSize: 104, lineHeight: 1.02, color: C.ink, letterSpacing: '-0.03em'}}>Join. Make the line.</div></Reveal>
      <Reveal delay={16}><div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 104, lineHeight: 1.14, color: C.olive, letterSpacing: '-0.03em'}}>Add it. Allow workers.</div></Reveal>
      <div style={{height: 50}} />
      <Pop at={34}><div style={{display: 'inline-block', background: C.ink, color: C.paper, fontFamily: FONT.sans, fontWeight: 500, fontSize: 30, padding: '20px 40px', borderRadius: 4}}>Keep SpecWithCode running on the joined Mac</div></Pop>
    </div>
  </AbsoluteFill>;

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return <div style={{position: 'absolute', left: 0, bottom: 0, height: 5, width: `${(frame / durationInFrames) * 100}%`, background: C.olive, opacity: 0.85}} />;
};

export const JOIN_SCENES: {c: React.FC; d: number; name: string}[] = [
  {c: Opening, d: 135, name: 'Opening'},
  {c: Roles, d: 200, name: 'Roles diagram'},
  {c: Choice, d: 260, name: 'First run: How will you use this Mac?'},
  {c: Ready, d: 290, name: 'Join step, Tailscale ready'},
  {c: Line, d: 290, name: 'Make the line (masked)'},
  {c: Joined, d: 230, name: 'This Mac is ready'},
  {c: Add, d: 290, name: 'Main machine: Add a machine'},
  {c: Allow, d: 250, name: 'Allow workers (illustration)'},
  {c: Invite, d: 240, name: 'Invite this machine dialog'},
  {c: Cli, d: 300, name: 'CLI terminal graphic'},
  {c: Cta, d: 160, name: 'Recap'},
];
const T = 15;
export const JOIN_TUTORIAL_FRAMES = JOIN_SCENES.reduce((n, s) => n + s.d, 0) - T * (JOIN_SCENES.length - 1);

export const JoinMachineTutorial: React.FC = () =>
  <AbsoluteFill style={{background: C.paper}}>
    <TransitionSeries>
      {JOIN_SCENES.flatMap(({c: Scene, d}, i) => [
        ...(i ? [<TransitionSeries.Transition key={`t${i}`} timing={linearTiming({durationInFrames: T})} presentation={i === 2 || i === 6 ? slide({direction: 'from-right'}) : fade()} />] : []),
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={d}><Scene /></TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
    <ProgressBar />
  </AbsoluteFill>;
