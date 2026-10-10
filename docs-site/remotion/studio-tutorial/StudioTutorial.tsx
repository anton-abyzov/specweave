import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {C, FONT} from './theme';
import {Backdrop, Chip, Copy, Cursor, Eyebrow, Highlight, Pop, Reveal, Shot, SourceNote, Window} from './primitives';

// Product scenes: copy on the left, a Studio window on the right.
const WIN = {left: 740, top: 170, w: 1060, h: 662};

const Split: React.FC<{copy: React.ReactNode; children: React.ReactNode; note?: string}> = ({copy, children, note}) =>
  <AbsoluteFill>
    <Backdrop />
    <div style={{position: 'absolute', left: 120, top: 0, bottom: 0, display: 'flex', alignItems: 'center'}}>{copy}</div>
    {children}
    {note && <SourceNote>{note}</SourceNote>}
  </AbsoluteFill>;

const REAL = 'Real SpecWeave Studio captures, October 2026';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = interpolate(frame, [40, 120], [58, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const over = pct >= 90;
  return <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Backdrop />
    <div style={{width: 1100}}>
      <Reveal delay={4}><div style={{fontFamily: FONT.serif, fontSize: 112, lineHeight: 1.02, color: C.ink, letterSpacing: '-0.025em'}}>You’re mid-feature.</div></Reveal>
      <Reveal delay={22}><div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 112, lineHeight: 1.1, color: C.rust, letterSpacing: '-0.025em'}}>Then the limit hits.</div></Reveal>
      <div style={{height: 70}} />
      <Reveal delay={34}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONT.sans, fontSize: 24, color: C.muted, marginBottom: 14}}>
          <span>Claude Code · session usage</span>
          <span style={{fontFamily: FONT.mono, color: over ? C.rust : C.ink}}>{Math.round(pct)}%</span>
        </div>
        <div style={{position: 'relative', height: 16, borderRadius: 8, background: C.oliveSoft}}>
          <div style={{position: 'absolute', inset: 0, width: `${pct}%`, borderRadius: 8, background: over ? C.rust : C.olive}} />
          <div style={{position: 'absolute', left: '90%', top: -10, bottom: -10, width: 2, background: C.ink, opacity: 0.5}} />
          <div style={{position: 'absolute', left: '90%', top: 30, transform: 'translateX(-50%)', fontFamily: FONT.mono, fontSize: 18, color: C.muted}}>90%</div>
        </div>
      </Reveal>
      <div style={{height: 56}} />
      <Pop at={122}><Chip tone="rust" size={24}>● Usage limit reached</Chip></Pop>
    </div>
  </AbsoluteFill>;
};

const Title: React.FC = () =>
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Backdrop />
    <div style={{textAlign: 'center'}}>
      <Pop at={2}><div style={{display: 'inline-flex', alignItems: 'center', gap: 14, padding: '8px 22px 8px 8px', border: `1.5px solid ${C.line}`, borderRadius: 999, background: C.card, fontFamily: FONT.sans, fontSize: 22, color: C.ink}}>
        <span style={{background: C.ink, color: C.paper, borderRadius: 999, padding: '5px 16px'}}>SpecWeave Studio</span>Projects for every coding agent, on your machines
      </div></Pop>
      <div style={{height: 44}} />
      <Reveal delay={8}><div style={{fontFamily: FONT.serif, fontSize: 150, lineHeight: 1, color: C.ink, letterSpacing: '-0.03em'}}>Every coding agent.</div></Reveal>
      <Reveal delay={16}><div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 150, lineHeight: 1.1, color: C.olive, letterSpacing: '-0.03em'}}>One project.</div></Reveal>
    </div>
  </AbsoluteFill>;

const Coordinator: React.FC = () =>
  <Split note={REAL} copy={<Copy eyebrow="01 / A project" line1="Give it one goal." line2="It splits the work." body="Ask once. The project’s coordinator starts workers, lists them in the Threads rail and reports back when they finish." />}>
    <div style={{position: 'absolute', left: WIN.left, top: WIN.top}}>
      <Window w={WIN.w} h={WIN.h} title="tip-calculator · project" delay={4}>
        <Shot src="live-coordinator-done.webp" w={WIN.w} h={WIN.h} keys={[
          {f: 0, r: [0, 0, 1600]}, {f: 50, r: [0, 0, 1600]},
          {f: 95, r: [270, 110, 760]}, {f: 185, r: [270, 110, 760]},
          {f: 230, r: [1000, 130, 620]},
        ]}>
          <Highlight x={300} y={142} w={690} h={110} from={100} to={190} />
          <Highlight x={1045} y={335} w={545} h={190} from={236} color={C.olive} />
        </Shot>
      </Window>
    </div>
  </Split>;

const WorkerPanel: React.FC<{src: string; delay: number; scrollFrom: number; scrollTo: number; done: number}> = ({src, delay, scrollFrom, scrollTo, done}) =>
  <div style={{position: 'relative'}}>
    <Window w={500} h={600} delay={delay} tilt={0.5}>
      <Shot src={src} w={500} h={600} keys={[{f: 0, r: [1040, scrollFrom, 550]}, {f: 60, r: [1040, scrollFrom, 550]}, {f: 280, r: [1040, scrollTo, 550]}]} />
    </Window>
    <Pop at={done} style={{position: 'absolute', right: -18, top: 22}}>
      <div style={{width: 58, height: 58, borderRadius: 29, background: C.olive, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 10px 20px -8px rgba(32,35,28,.5)'}}>✓</div>
    </Pop>
  </div>;

const Workers: React.FC = () =>
  <Split note={REAL} copy={<Copy eyebrow="02 / Workers" line1="Every worker" line2="on its own model." body="Codex writes tip.py while Claude documents it: same project, same memory, side by side." />}>
    <div style={{position: 'absolute', left: 740, top: 150, display: 'flex', gap: 60}}>
      <div>
        <Pop at={20}><Chip size={21}>Codex · GPT-6-Luna</Chip></Pop>
        <div style={{height: 18}} />
        <WorkerPanel src="live-codex-worker-after.webp" delay={8} scrollFrom={120} scrollTo={360} done={230} />
      </div>
      <div style={{marginTop: 50}}>
        <Pop at={30}><Chip tone="olive" size={21}>Claude Code · Haiku 5.5</Chip></Pop>
        <div style={{height: 18}} />
        <WorkerPanel src="live-claude-worker-open.webp" delay={16} scrollFrom={120} scrollTo={340} done={244} />
      </div>
    </div>
    <div style={{position: 'absolute', left: 120, bottom: 140}}>
      <Pop at={262}><Chip tone="soft" size={23}><span style={{color: C.olive}}>●</span> Coordinator: both changes are done and verified</Chip></Pop>
    </div>
  </Split>;

const Limits: React.FC = () =>
  <Split note={REAL} copy={<Copy eyebrow="03 / Limits" line1="All your limits," line2="in one place." body="Studio reads the usage windows of the Claude and Codex accounts it runs." />}>
    <div style={{position: 'absolute', left: WIN.left, top: WIN.top}}>
      <Window w={WIN.w} h={WIN.h} title="Usage · Limits" delay={4}>
        <Shot src="r3-usage-limits.webp" srcH={1100} w={WIN.w} h={WIN.h} keys={[{f: 0, r: [300, 20, 1240]}, {f: 30, r: [300, 20, 1240]}, {f: 110, r: [400, 60, 1060]}]}>
          <Highlight x={440} y={370} w={1000} h={110} from={70} />
        </Shot>
      </Window>
    </div>
  </Split>;

const HandoffFlow: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at + 12, at + 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 44}}>
    <Pop at={at}><Chip tone="soft" size={21}><span style={{color: C.rust}}>✱</span> Claude Haiku 5.5</Chip></Pop>
    <div style={{position: 'relative', width: 110, height: 4, background: C.line, borderRadius: 2, opacity: interpolate(frame, [at + 4, at + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
      <div style={{position: 'absolute', left: 0, top: 0, height: 4, width: `${t * 100}%`, background: C.olive, borderRadius: 2}} />
      <div style={{position: 'absolute', left: `calc(${t * 100}% - 9px)`, top: -7, width: 18, height: 18, borderRadius: 9, background: C.olive, opacity: t > 0 && t < 1 ? 1 : 0}} />
    </div>
    <Pop at={at + 46}><Chip size={21}>Codex · GPT-6.1-Sol</Chip></Pop>
  </div>;
};

const Handoff: React.FC = () => {
  const frame = useCurrentFrame();
  const swap = interpolate(frame, [200, 222], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <Split note={REAL} copy={<div>
    <Copy eyebrow="04 / Handoff" line1="Limit reached?" line2="Continue with Codex." body="One click hands the thread to Codex with its conversation. Or set a rule and Studio switches at 90%, between turns." />
    <HandoffFlow at={226} />
  </div>}>
    <div style={{position: 'absolute', left: WIN.left, top: WIN.top}}>
      <Window w={WIN.w} h={WIN.h} title="limit-demo-2 · Multiply Six by Seven" delay={4}>
        <Shot src="pr6b-first-turn-banner.webp" w={WIN.w} h={WIN.h} opacity={1 - swap} keys={[
          {f: 0, r: [420, 50, 1000]}, {f: 70, r: [420, 50, 1000]}, {f: 108, r: [560, 640, 760]},
        ]}>
          <Highlight x={538} y={168} w={312} h={26} from={26} to={72} />
          <Highlight x={870} y={806} w={132} h={25} from={110} to={190} color={C.olive} />
          <Cursor path={[{f: 120, x: 1180, y: 960}, {f: 165, x: 940, y: 820}]} clickAt={176} />
        </Shot>
        <Shot src="pr6b-first-turn-continued.webp" w={WIN.w} h={WIN.h} opacity={swap} keys={[
          {f: 200, r: [420, 50, 1000]}, {f: 240, r: [420, 50, 1000]}, {f: 290, r: [500, 150, 820]},
        ]}>
          <Highlight x={740} y={208} w={340} h={28} from={250} color={C.olive} />
          <Highlight x={530} y={340} w={120} h={28} from={300} />
        </Shot>
      </Window>
    </div>
  </Split>;
};

const Proof: React.FC = () =>
  <Split note="Real run on a Mac, 9 October 2026: the code word was told only to Claude" copy={<Copy eyebrow="05 / Context" line1="Told Claude a word." line2="Codex remembered it." body="Claude hit its limit mid-task. Codex picked up the thread and wrote ORCHID-58 into notes.txt." />}>
    <div style={{position: 'absolute', left: WIN.left, top: WIN.top}}>
      <Window w={WIN.w} h={WIN.h} title="limit-demo · Remember Code Word ORCHID-58" delay={4}>
        <Shot src="handoff-codex-continued.webp" w={WIN.w} h={WIN.h} keys={[
          {f: 0, r: [440, 30, 900]}, {f: 120, r: [440, 30, 900]}, {f: 175, r: [520, 250, 960]},
        ]}>
          <Highlight x={880} y={84} w={390} h={32} from={30} />
          <Highlight x={740} y={412} w={340} h={30} from={95} color={C.olive} />
          <Highlight x={548} y={630} w={890} h={84} from={190} />
        </Shot>
      </Window>
    </div>
  </Split>;

const TermLine: React.FC<{at: number; text: string; prompt?: boolean; color?: string; speed?: number}> = ({at, text, prompt, color = '#e9e7dd', speed = 1.6}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const n = prompt ? Math.min(text.length, Math.floor((frame - at) * speed)) : text.length;
  const caret = prompt && n < text.length;
  return <div style={{fontFamily: FONT.mono, fontSize: 25, lineHeight: 1.55, color, whiteSpace: 'pre-wrap'}}>
    {prompt && <span style={{color: '#9fb57f'}}>$ </span>}{text.slice(0, n)}{caret && <span style={{background: '#e9e7dd', color: 'transparent'}}>_</span>}
  </div>;
};

const Git: React.FC = () =>
  <Split note="Output of specweave 3.0.7" copy={<Copy eyebrow="06 / In git" line1="Not only in Studio." line2="Any tool picks up." body="The open-source CLI writes a handoff into your repository at 90%, from Claude Code, Codex or Grok Build." />}>
    <div style={{position: 'absolute', left: WIN.left, top: 330}}>
      <Window w={WIN.w} h={380} title="~/projects/checkout" delay={4} dark>
        <div style={{padding: '34px 40px'}}>
          <TermLine at={20} prompt text="specweave auto-handoff on" />
          <TermLine at={42} color="#c9c7bb" text={'Auto-handoff is on at 90%: the first time a session reaches 90% of any usage window, it runs `specweave handoff` and tells you to say "pick up" in another tool or account.'} />
          <div style={{height: 26}} />
          <TermLine at={95} color="#8a8d80" text="# later, in Codex or another account" />
          <TermLine at={115} prompt text="specweave pickup" />
          <div style={{display: 'flex', gap: 16, marginTop: 34}}>
            <Pop at={150}><Chip tone="olive" size={21}>handoff note</Chip></Pop>
            <Pop at={160}><Chip tone="olive" size={21}>next task</Chip></Pop>
            <Pop at={170}><Chip tone="olive" size={21}>saved diff</Chip></Pop>
          </div>
        </div>
      </Window>
    </div>
  </Split>;

const Cta: React.FC = () =>
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Backdrop />
    <div style={{textAlign: 'center'}}>
      <Eyebrow delay={2} color={C.muted}>SpecWeave Studio · private pilot</Eyebrow>
      <div style={{height: 34}} />
      <Reveal delay={8}><div style={{fontFamily: FONT.serif, fontSize: 130, lineHeight: 1, color: C.ink, letterSpacing: '-0.03em'}}>Bring your agents.</div></Reveal>
      <Reveal delay={16}><div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 130, lineHeight: 1.12, color: C.olive, letterSpacing: '-0.03em'}}>Keep your machines.</div></Reveal>
      <div style={{height: 54}} />
      <Pop at={34}><div style={{display: 'inline-block', background: C.ink, color: C.paper, fontFamily: FONT.sans, fontWeight: 500, fontSize: 34, padding: '22px 44px', borderRadius: 4}}>spec-weave.com/studio ↗</div></Pop>
      <div style={{height: 30}} />
      <Reveal delay={44}><div style={{fontFamily: FONT.mono, fontSize: 24, color: C.muted}}>open-source CLI: npm install -g specweave</div></Reveal>
    </div>
  </AbsoluteFill>;

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return <div style={{position: 'absolute', left: 0, bottom: 0, height: 5, width: `${(frame / durationInFrames) * 100}%`, background: C.olive, opacity: 0.85}} />;
};

const SCENES: {c: React.FC; d: number}[] = [
  {c: Hook, d: 165},
  {c: Title, d: 115},
  {c: Coordinator, d: 330},
  {c: Workers, d: 330},
  {c: Limits, d: 165},
  {c: Handoff, d: 420},
  {c: Proof, d: 300},
  {c: Git, d: 270},
  {c: Cta, d: 180},
];
const T = 15;
export const STUDIO_TUTORIAL_FRAMES = SCENES.reduce((n, s) => n + s.d, 0) - T * (SCENES.length - 1);

export const StudioTutorial: React.FC = () =>
  <AbsoluteFill style={{background: C.paper}}>
    <TransitionSeries>
      {SCENES.flatMap(({c: Scene, d}, i) => [
        ...(i ? [<TransitionSeries.Transition key={`t${i}`} timing={linearTiming({durationInFrames: T})} presentation={i === 2 || i === 5 ? slide({direction: 'from-right'}) : fade()} />] : []),
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={d}><Scene /></TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
    <ProgressBar />
  </AbsoluteFill>;
