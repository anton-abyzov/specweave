import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {C, FONT} from './theme';
import {Backdrop, Chip, Copy, Eyebrow, Highlight, Pop, Reveal, Shot, SourceNote, Window} from './primitives';

// Product scenes: copy on the left, a Studio screen recording on the right.
// The recordings are 1920x1080, so the window keeps 16:9.
const WIN = {left: 740, top: 200, w: 1060, h: 596};
const REC = 'Screen recordings of SpecWeave Studio on a Mac, 10 October 2026';

const Split: React.FC<{copy: React.ReactNode; children: React.ReactNode; note?: string}> = ({copy, children, note}) =>
  <AbsoluteFill>
    <Backdrop />
    <div style={{position: 'absolute', left: 120, top: 0, bottom: 0, display: 'flex', alignItems: 'center'}}>{copy}</div>
    {children}
    {note && <SourceNote>{note}</SourceNote>}
  </AbsoluteFill>;

const InWindow: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) =>
  <div style={{position: 'absolute', left: WIN.left, top: WIN.top}}>
    <Window w={WIN.w} h={WIN.h} title={title} delay={4}>{children}</Window>
  </div>;

const AGENTS = ['Claude Code', 'Codex', 'Grok Build', 'Cursor', 'Copilot', 'OpenCode'];

const Opening: React.FC = () =>
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Backdrop />
    <div style={{textAlign: 'center'}}>
      <Eyebrow delay={2} color={C.muted}>SpecWeave Studio</Eyebrow>
      <div style={{height: 36}} />
      <Reveal delay={8}><div style={{fontFamily: FONT.serif, fontSize: 140, lineHeight: 1, color: C.ink, letterSpacing: '-0.03em'}}>Every AI agent.</div></Reveal>
      <Reveal delay={16}><div style={{fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 140, lineHeight: 1.12, color: C.olive, letterSpacing: '-0.03em'}}>One workspace you own.</div></Reveal>
      <div style={{height: 56}} />
      <div style={{display: 'flex', gap: 14, justifyContent: 'center'}}>
        {AGENTS.map((a, i) => <Pop key={a} at={34 + i * 6}><Chip tone="soft" size={22}>{a}</Chip></Pop>)}
      </div>
    </div>
  </AbsoluteFill>;

// Clip A: the request is typed and sent, then a cut past the wait to the moment
// both workers land in the Threads rail.
const CUT = 180;
const Projects: React.FC = () => {
  const frame = useCurrentFrame();
  const cut = interpolate(frame, [CUT, CUT + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <Split note={REC} copy={<Copy eyebrow="01 / Projects" line1="Like Claude Code," line2="workers on any model." body="Give the coordinator a goal. It starts a worker for each part and lists them in the Threads rail." />}>
    <InWindow title="tip-calculator · project">
      <Shot src="footage-a.mp4" trimBefore={30} rate={1.8} w={WIN.w} h={WIN.h} opacity={1 - cut} keys={[
        {f: 0, r: [0, 0, 1920]}, {f: 45, r: [0, 0, 1920]},
        {f: 75, r: [250, 440, 1100]}, {f: 150, r: [250, 440, 1100]},
        {f: 178, r: [100, 40, 1240]},
      ]} />
      <Sequence from={CUT} layout="none">
        <Shot src="footage-a.mp4" trimBefore={465} rate={0.8} w={WIN.w} h={WIN.h} opacity={cut} keys={[
          {f: 0, r: [100, 40, 1240]}, {f: 12, r: [100, 40, 1240]},
          {f: 45, r: [1060, 200, 860]},
        ]}>
          <Highlight x={1262} y={372} w={645} h={284} from={60} color={C.olive} />
        </Shot>
      </Sequence>
    </InWindow>
  </Split>;
};

const Workers: React.FC = () => {
  const frame = useCurrentFrame();
  const claude = frame >= 268;
  return <Split note={REC} copy={<div>
    <Copy eyebrow="02 / Every lab" line1="Each job gets" line2="the model that fits." body="Claude Code, Codex, Grok Build, Cursor, Copilot. Here Codex writes tip.py while Claude writes the README." />
    <div style={{marginTop: 40, display: 'flex', gap: 14}}>
      <Pop at={30}><Chip size={21} style={{opacity: claude ? 0.45 : 1}}>Codex · GPT-6-Luna</Chip></Pop>
      <Pop at={262}><Chip tone="olive" size={21}>Claude Code · Haiku 5.5</Chip></Pop>
    </div>
  </div>}>
    <InWindow title="tip-calculator · worker threads">
      <Shot src="footage-b.mp4" rate={1.5} w={WIN.w} h={WIN.h} keys={[
        {f: 0, r: [0, 0, 1920]}, {f: 30, r: [0, 0, 1920]}, {f: 65, r: [820, 120, 1100]},
      ]} />
    </InWindow>
  </Split>;
};

const Results: React.FC = () =>
  <Split note={REC} copy={<Copy eyebrow="03 / Results" line1="Results come back" line2="to one conversation." body="The coordinator checks each worker’s output against the goal and reports when both are done." />}>
    <InWindow title="tip-calculator · coordinator">
      <Shot src="footage-c.mp4" rate={1.25} w={WIN.w} h={WIN.h} keys={[
        {f: 0, r: [0, 0, 1920]}, {f: 25, r: [0, 0, 1920]}, {f: 70, r: [330, 380, 1080]},
      ]}>
        <Highlight x={405} y={760} w={480} h={36} from={95} />
      </Shot>
    </InWindow>
  </Split>;

const HandoffFlow: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at + 12, at + 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 40}}>
    <Pop at={at}><Chip tone="soft" size={21}><span style={{color: C.rust}}>✱</span> Claude Haiku 5.5</Chip></Pop>
    <div style={{position: 'relative', width: 110, height: 4, background: C.line, borderRadius: 2, opacity: interpolate(frame, [at + 4, at + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
      <div style={{position: 'absolute', left: 0, top: 0, height: 4, width: `${t * 100}%`, background: C.olive, borderRadius: 2}} />
      <div style={{position: 'absolute', left: `calc(${t * 100}% - 9px)`, top: -7, width: 18, height: 18, borderRadius: 9, background: C.olive, opacity: t > 0 && t < 1 ? 1 : 0}} />
    </div>
    <Pop at={at + 46}><Chip size={21}>Codex · GPT-6.1-Sol</Chip></Pop>
  </div>;
};

// Limits page (clip F, from 3 s), then the handoff (clip D) in the same window.
const SWAP = 150;
const Handoff: React.FC = () => {
  const frame = useCurrentFrame();
  const swap = interpolate(frame, [SWAP - 12, SWAP + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <Split note="Screen recordings on a Mac, 10 October 2026. The usage limit in the handoff clip is simulated." copy={<div>
    <Copy eyebrow="04 / Limits" line1="Hit a limit?" line2="Switch and keep going." body="Studio shows every account’s limits. When Claude runs out, Continue with Codex carries the conversation over, so Codex knows the word only Claude was told." />
    <HandoffFlow at={SWAP + 210} />
  </div>}>
    <InWindow title={frame < SWAP ? 'Usage · Limits' : 'handoff-demo · Code Word Acknowledgment'}>
      <Shot src="footage-f.mp4" trimBefore={90} w={WIN.w} h={WIN.h} opacity={1 - swap} keys={[
        {f: 0, r: [0, 0, 1920]}, {f: 20, r: [0, 0, 1920]}, {f: 60, r: [380, 60, 1500]},
      ]}>
        <Highlight x={480} y={355} w={1300} h={125} from={75} color={C.rust} />
      </Shot>
      <Sequence from={SWAP - 12} layout="none">
        <Shot src="footage-d.mp4" rate={1.2} w={WIN.w} h={WIN.h} opacity={swap} keys={[
          {f: 0, r: [420, 40, 1160]}, {f: 105, r: [420, 40, 1160]},
          {f: 135, r: [420, 300, 1160]}, {f: 192, r: [420, 300, 1160]},
          {f: 222, r: [420, 360, 1160]},
        ]}>
          <Highlight x={950} y={826} w={172} h={28} from={140} to={186} />
          <Highlight x={772} y={550} w={456} h={34} from={200} color={C.olive} />
          <Highlight x={498} y={732} w={124} h={32} from={296} />
        </Shot>
      </Sequence>
    </InWindow>
  </Split>;
};

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
  <Split note="Output of specweave 3.0.7" copy={<Copy eyebrow="05 / In git" line1="One record in git." line2="Any agent picks it up." body="Outside Studio, the open-source CLI hands off at 90% of a usage window, from Claude Code, Codex or Grok Build." />}>
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
  {c: Opening, d: 135},
  {c: Projects, d: 325},
  {c: Workers, d: 326},
  {c: Results, d: 200},
  {c: Handoff, d: SWAP + 380},
  {c: Git, d: 240},
  {c: Cta, d: 165},
];
const T = 15;
export const STUDIO_TUTORIAL_FRAMES = SCENES.reduce((n, s) => n + s.d, 0) - T * (SCENES.length - 1);

export const StudioTutorial: React.FC = () =>
  <AbsoluteFill style={{background: C.paper}}>
    <TransitionSeries>
      {SCENES.flatMap(({c: Scene, d}, i) => [
        ...(i ? [<TransitionSeries.Transition key={`t${i}`} timing={linearTiming({durationInFrames: T})} presentation={i === 1 || i === 4 ? slide({direction: 'from-right'}) : fade()} />] : []),
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={d}><Scene /></TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
    <ProgressBar />
  </AbsoluteFill>;
