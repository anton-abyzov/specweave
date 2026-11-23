import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {C, FONT} from '../studio-tutorial/theme';
import {Backdrop, Chip, Copy, Eyebrow, Pop, Reveal, SourceNote, Window} from '../studio-tutorial/primitives';

const ease = Easing.bezier(0.65, 0, 0.35, 1);
const WIN = {left: 716, top: 158, w: 1094, h: 700};

const Split: React.FC<{
  copy: React.ReactNode;
  children: React.ReactNode;
  note: string;
  badge?: string;
}> = ({copy, children, note, badge = 'SpecWithCode 1.0.407'}) => (
  <AbsoluteFill>
    <Backdrop />
    <div style={{position: 'absolute', left: 104, top: 0, bottom: 0, display: 'flex', alignItems: 'center'}}>
      {copy}
    </div>
    {children}
    <div style={{position: 'absolute', left: WIN.left + WIN.w - 18, top: WIN.top - 22, transform: 'translateX(-100%)'}}>
      <Pop at={14}>
        <Chip tone="olive" size={16}>
          {badge}
        </Chip>
      </Pop>
    </div>
    <SourceNote>{note}</SourceNote>
  </AbsoluteFill>
);

const InWindow: React.FC<{title: string; dark?: boolean; children: React.ReactNode}> = ({title, dark, children}) => (
  <div style={{position: 'absolute', left: WIN.left, top: WIN.top}}>
    <Window w={WIN.w} h={WIN.h} title={title} delay={4} dark={dark} tilt={0.7}>
      {children}
    </Window>
  </div>
);

const UiRow: React.FC<{
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  active?: boolean;
  delay?: number;
}> = ({title, subtitle, right, active, delay = 14}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 24, stiffness: 120}});
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 18,
        padding: '18px 22px',
        borderRadius: 12,
        background: active ? C.oliveSoft : '#ffffff',
        border: `1.5px solid ${active ? C.olive : C.line}`,
        transform: `translateY(${(1 - p) * 18}px)`,
        opacity: interpolate(p, [0, 0.5], [0, 1], {extrapolateRight: 'clamp'}),
      }}
    >
      <div>
        <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 21, color: C.ink}}>{title}</div>
        <div style={{fontFamily: FONT.sans, fontSize: 17, color: C.muted, marginTop: 4}}>{subtitle}</div>
      </div>
      {right}
    </div>
  );
};

const Pill: React.FC<{children: React.ReactNode; tone?: 'olive' | 'rust' | 'muted' | 'solid'}> = ({
  children,
  tone = 'olive',
}) => {
  const styles: Record<string, React.CSSProperties> = {
    olive: {background: C.oliveSoft, color: C.olive, border: `1px solid ${C.olive}44`},
    rust: {background: C.rustSoft, color: C.rust, border: `1px solid ${C.rust}44`},
    muted: {background: '#eceee6', color: C.muted, border: `1px solid ${C.line}`},
    solid: {background: C.olive, color: '#ffffff', border: `1px solid ${C.olive}`},
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '7px 14px',
        borderRadius: 999,
        fontFamily: FONT.sans,
        fontWeight: 600,
        fontSize: 16,
        whiteSpace: 'nowrap',
        ...styles[tone],
      }}
    >
      {children}
    </span>
  );
};

const PulseRing: React.FC<{children: React.ReactNode; at: number}> = ({children, at}) => {
  const frame = useCurrentFrame();
  const active = frame >= at;
  const pulse = active ? 0.5 + 0.5 * Math.sin((frame - at) * 0.2) : 0;
  return (
    <div
      style={{
        display: 'inline-block',
        borderRadius: 12,
        boxShadow: active ? `0 0 0 ${4 + pulse * 4}px rgba(89, 107, 69, ${0.22 + pulse * 0.16})` : 'none',
      }}
    >
      {children}
    </div>
  );
};

const TitleCard: React.FC<{
  eyebrow: string;
  line1: string;
  line2: string;
  chips: string[];
}> = ({eyebrow, line1, line2, chips}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Backdrop />
    <div style={{textAlign: 'center', maxWidth: 1480, padding: '0 80px'}}>
      <Eyebrow delay={-20} color={C.muted}>
        {eyebrow}
      </Eyebrow>
      <div style={{height: 30}} />
      <Reveal delay={-20}>
        <div style={{fontFamily: FONT.serif, fontSize: 108, lineHeight: 1.02, color: C.ink, letterSpacing: '-0.03em'}}>
          {line1}
        </div>
      </Reveal>
      <Reveal delay={-14}>
        <div
          style={{
            fontFamily: FONT.serif,
            fontStyle: 'italic',
            fontSize: 108,
            lineHeight: 1.1,
            color: C.olive,
            letterSpacing: '-0.03em',
          }}
        >
          {line2}
        </div>
      </Reveal>
      <div style={{height: 46}} />
      <div style={{display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap'}}>
        {chips.map((c, i) => (
          <Pop key={c} at={12 + i * 6}>
            <Chip tone="soft" size={21}>
              {c}
            </Chip>
          </Pop>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

const ClosingCard: React.FC<{
  eyebrow: string;
  line1: string;
  line2: string;
  chips: string[];
}> = ({eyebrow, line1, line2, chips}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <Backdrop />
    <div style={{textAlign: 'center', maxWidth: 1440, padding: '0 80px'}}>
      <Eyebrow delay={4} color={C.olive}>
        {eyebrow}
      </Eyebrow>
      <div style={{height: 24}} />
      <Reveal delay={8}>
        <div style={{fontFamily: FONT.serif, fontSize: 88, lineHeight: 1.05, color: C.ink, letterSpacing: '-0.025em'}}>
          {line1}
        </div>
      </Reveal>
      <Reveal delay={14}>
        <div
          style={{
            fontFamily: FONT.serif,
            fontStyle: 'italic',
            fontSize: 88,
            lineHeight: 1.12,
            color: C.olive,
            letterSpacing: '-0.025em',
          }}
        >
          {line2}
        </div>
      </Reveal>
      <div style={{height: 42}} />
      <div style={{display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap'}}>
        {chips.map((c, i) => (
          <Pop key={c} at={20 + i * 6}>
            <Chip tone={i === 0 ? 'olive' : 'soft'} size={20}>
              {c}
            </Chip>
          </Pop>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

/* =========================================================================
 * 1. connect-devices (60.0s = 1800 frames @ 30fps)
 * ========================================================================= */

const ConnectSignInScene: React.FC = () => (
  <Split
    note="UI walkthrough based on SpecWithCode 1.0.407. Example email and machine names are redacted."
    copy={
      <Copy
        width={540}
        eyebrow="01 / Sign in once"
        line1="Sign in to Connect."
        line2="The link is automatic."
        body="Open Settings, then Account, and sign in to SpecWithCode Connect. Your machine registers and goes online automatically with no IP addresses or port forwarding."
      />
    }
  >
    <InWindow title="SpecWithCode · Settings · Account">
      <div style={{padding: 36, display: 'flex', flexDirection: 'column', gap: 22}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted}}>
              SpecWithCode Connect
            </div>
            <div style={{fontFamily: FONT.serif, fontSize: 36, color: C.ink, marginTop: 4}}>One account across every device</div>
          </div>
          <Pill tone="olive">Signed in</Pill>
        </div>
        <UiRow
          delay={16}
          active
          title="you@example.com"
          subtitle="SpecWithCode Connect account · automatic relay active"
          right={<Pill tone="olive">Connected</Pill>}
        />
        <UiRow
          delay={34}
          title="Workstation Mac"
          subtitle="This machine · reachable from your other signed-in devices"
          right={<Pill tone="olive">Online</Pill>}
        />
        <div
          style={{
            marginTop: 8,
            padding: '18px 22px',
            borderRadius: 12,
            background: '#f2f0e8',
            border: `1px solid ${C.line}`,
            fontFamily: FONT.sans,
            fontSize: 18,
            color: C.muted,
            lineHeight: 1.5,
          }}
        >
          SpecWithCode Connect links your machines over an encrypted relay. No join lines, no pasted environment IDs, and no VPN required.
        </div>
      </div>
    </InWindow>
  </Split>
);

const ConnectJoinMachineScene: React.FC = () => (
  <Split
    note="Same Connect account: pick your main machine here. Main machine on another account or signed out? Link Connect on the worker, then use Join one of your machines > Make a join line."
    copy={
      <Copy
        width={540}
        eyebrow="02 / Pick your main machine"
        line1="Pick your main machine"
        line2="to connect."
        body="On a second computer with the same Connect account, open Settings, Machines, and Let another of your machines run work here, then pick your main machine. On a fresh desktop, approve the device code next so Allow unlocks."
      />
    }
  >
    <InWindow title="SpecWithCode · Settings · Machines (Studio Mini)">
      <div style={{padding: 36, display: 'flex', flexDirection: 'column', gap: 20}}>
        <div style={{fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.olive}}>
          Same Connect account · No join line needed
        </div>
        <div style={{fontFamily: FONT.serif, fontSize: 34, color: C.ink}}>
          Let another of your machines run work here
        </div>
        <UiRow
          delay={18}
          active
          title="Workstation Mac"
          subtitle="macOS · Online via SpecWithCode Connect"
          right={<Pill tone="solid">Selected</Pill>}
        />
        <UiRow
          delay={32}
          title="Build Server"
          subtitle="Linux · Online via SpecWithCode Connect"
          right={<Pill tone="muted">Available</Pill>}
        />
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12}}>
          <span style={{fontFamily: FONT.sans, fontSize: 15, color: C.muted}}>
            Approve device code on Workstation Mac to unlock Allow
          </span>
          <PulseRing at={70}>
            <Pill tone="muted">Allow Workstation Mac</Pill>
          </PulseRing>
        </div>
      </div>
    </InWindow>
  </Split>
);

const ConnectCodeApproveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const codeChars = 'K7M-4QP';
  const typedCount = Math.floor(interpolate(frame, [40, 115], [0, codeChars.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const typed = codeChars.slice(0, typedCount);
  const approved = frame >= 145;
  const confirmed = frame >= 235;

  return (
    <Split
      note="Codes shown are example placeholders. Each 6-character device code is one-time and expires after 30 minutes."
      copy={
        <Copy
          width={540}
          eyebrow="03 / Approve code, then Allow"
          line1="Type the 6-char code,"
          line2="then press Allow."
          body="Type the one-time 6-character code on your main machine to approve this new desktop, unlocking Allow. Click Allow and confirm in Settings to finish."
        />
      }
    >
      <InWindow title="SpecWithCode · Device approval">
        <div style={{padding: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, height: '100%', alignItems: 'center'}}>
          <div style={{padding: 26, borderRadius: 14, background: '#ffffff', border: `1.5px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 16}}>
            <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.rust}}>
              New desktop app
            </div>
            <div style={{fontFamily: FONT.sans, fontSize: 19, color: C.ink, fontWeight: 600}}>
              Type this code on Workstation Mac
            </div>
            <div
              style={{
                padding: '20px 16px',
                borderRadius: 12,
                background: C.paper,
                border: `1.5px dashed ${C.olive}`,
                textAlign: 'center',
                fontFamily: FONT.mono,
                fontSize: 44,
                fontWeight: 600,
                letterSpacing: '0.16em',
                color: C.ink,
              }}
            >
              K7M-4QP
            </div>
            <div style={{fontFamily: FONT.sans, fontSize: 15, color: C.muted}}>
              Valid for 30 minutes · unlocks Allow once approved
            </div>
            <div style={{marginTop: 8}}>
              <PulseRing at={155}>
                <Pill tone={approved ? 'solid' : 'muted'}>
                  {confirmed ? 'Confirmed · Connected' : approved ? 'Allow Workstation Mac' : 'Allow (locked until approved)'}
                </Pill>
              </PulseRing>
            </div>
          </div>

          <div style={{padding: 26, borderRadius: 14, background: '#ffffff', border: `1.5px solid ${approved ? C.olive : C.line}`, display: 'flex', flexDirection: 'column', gap: 16}}>
            <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.olive}}>
              Main machine · Workstation Mac
            </div>
            <div style={{fontFamily: FONT.sans, fontSize: 19, color: C.ink, fontWeight: 600}}>
              Approve new device
            </div>
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 12,
                background: '#f8f7f3',
                border: `1.5px solid ${C.olive}`,
                fontFamily: FONT.mono,
                fontSize: 34,
                letterSpacing: '0.14em',
                color: C.ink,
                minHeight: 74,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {typed || <span style={{color: '#b4b7ab'}}>XXX-XXX</span>}
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6}}>
              <span style={{fontFamily: FONT.sans, fontSize: 15, color: C.muted}}>
                {approved ? 'Device approved' : 'Enter 6-character code'}
              </span>
              <Pill tone={approved ? 'olive' : 'solid'}>{approved ? 'Approved' : 'Approve'}</Pill>
            </div>
          </div>
        </div>
      </InWindow>
    </Split>
  );
};

const ConnectPhoneScene: React.FC = () => (
  <Split
    note="Device approval is per machine. Approving your iPhone on Workstation Mac approves only Workstation Mac."
    copy={
      <Copy
        width={540}
        eyebrow="04 / Your phone"
        line1="Reach your machines"
        line2="from your iPhone."
        body="Open Settings, Machines, Your phone. Sign in on iPhone with the same Connect account and approve the one-time code on each machine you want to reach."
      />
    }
  >
    <InWindow title="SpecWithCode · Settings · Machines · Your phone">
      <div style={{padding: 32, display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 26, height: '100%', alignItems: 'center'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
          <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.olive}}>
            Your phone
          </div>
          <UiRow delay={14} title="1. SpecWithCode Connect is on" subtitle="Signed in as you@example.com" right={<Pill tone="olive">Done</Pill>} />
          <UiRow delay={28} title="2. Open SpecWithCode on iPhone" subtitle="Sign in with the same account" right={<Pill tone="olive">Done</Pill>} />
          <UiRow delay={42} active title="3. Approve your iPhone once" subtitle="Type the code shown on iPhone to link Workstation Mac" right={<Pill tone="solid">Approved</Pill>} />
        </div>

        <div
          style={{
            height: 560,
            borderRadius: 34,
            background: C.ink,
            padding: 14,
            boxShadow: '0 24px 50px -24px rgba(32,35,28,.55)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{flex: 1, borderRadius: 24, background: C.paper, padding: 20, display: 'flex', flexDirection: 'column', gap: 14}}>
            <div style={{width: 68, height: 6, borderRadius: 99, background: C.line, margin: '0 auto 6px'}} />
            <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em'}}>
              iPhone · Machines
            </div>
            <div style={{padding: 14, borderRadius: 12, background: '#ffffff', border: `1.5px solid ${C.olive}`}}>
              <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 17, color: C.ink}}>Workstation Mac</div>
              <div style={{fontFamily: FONT.sans, fontSize: 14, color: C.olive, marginTop: 3}}>Online · SpecWithCode Connect</div>
            </div>
            <div style={{padding: 14, borderRadius: 12, background: '#ffffff', border: `1px solid ${C.line}`}}>
              <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 17, color: C.ink}}>Studio Mini</div>
              <div style={{fontFamily: FONT.sans, fontSize: 14, color: C.olive, marginTop: 3}}>Online · SpecWithCode Connect</div>
            </div>
            <div style={{marginTop: 'auto', fontFamily: FONT.sans, fontSize: 13, color: C.muted, lineHeight: 1.45}}>
              Tap a machine to read threads, answer cards, or start work.
            </div>
          </div>
        </div>
      </div>
    </InWindow>
  </Split>
);

export const CONNECT_DEVICES_FRAMES = 2130; // 71.0s @ 30fps

export const ConnectDevicesTutorial: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={345}>
      <TitleCard
        eyebrow="SpecWithCode · Connect"
        line1="Connect your devices"
        line2="in under two minutes."
        chips={['One Connect account', '6-char device approval', 'Mac, Linux, Windows, iPhone', 'No VPN required']}
      />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={420}>
      <ConnectSignInScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={480}>
      <ConnectJoinMachineScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={390}>
      <ConnectCodeApproveScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={270}>
      <ConnectPhoneScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={300}>
      <ClosingCard
        eyebrow="Next in Connect your devices"
        line1="Set machine permissions"
        line2="and keep routes healthy."
        chips={['spec-weave.com/tutorials', 'Distinct from MCP', 'Tailscale stays optional']}
      />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);

export const ConnectDevicesPoster: React.FC = () => (
  <TitleCard
    eyebrow="SpecWithCode · Connect"
    line1="Connect your devices"
    line2="in under two minutes."
    chips={['One Connect account', '6-char device approval', 'Mac, Linux, Windows, iPhone']}
  />
);

/* =========================================================================
 * 2. machine-permissions (48.0s = 1440 frames @ 30fps)
 * ========================================================================= */

const TwoLinesScene: React.FC = () => (
  <Split
    note="Each direction is named separately on every machine card in Settings > Machines."
    copy={
      <Copy
        width={540}
        eyebrow="01 / Two named lines"
        line1="Every machine card"
        line2="shows both directions."
        body="Joining a machine is one-way. Open Settings, Machines to see exactly which direction is allowed and turn on the reverse direction only if you want it."
      />
    }
  >
    <InWindow title="SpecWithCode · Settings · Machines">
      <div style={{padding: 36, display: 'flex', flexDirection: 'column', gap: 22}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{fontFamily: FONT.serif, fontSize: 36, color: C.ink}}>Studio Mini</div>
            <div style={{fontFamily: FONT.sans, fontSize: 17, color: C.olive}}>Online · SpecWithCode Connect</div>
          </div>
          <Pill tone="olive">Joined</Pill>
        </div>
        <UiRow
          delay={18}
          active
          title="Agents on Workstation Mac can start work on Studio Mini"
          subtitle="Allowed · Full access · All linked projects"
          right={<Pill tone="olive">Allowed</Pill>}
        />
        <UiRow
          delay={40}
          title="Agents on Studio Mini can start work on Workstation Mac"
          subtitle="Not allowed yet · click Allow on Workstation Mac to enable"
          right={
            <PulseRing at={85}>
              <Pill tone="solid">Allow</Pill>
            </PulseRing>
          }
        />
        <div style={{padding: '16px 20px', borderRadius: 12, background: '#f2f0e8', border: `1px solid ${C.line}`, fontFamily: FONT.sans, fontSize: 17, color: C.muted}}>
          Each line names the sender and target machine clearly so you always know which side can start workers.
        </div>
      </div>
    </InWindow>
  </Split>
);

const WhoCanRunScene: React.FC = () => (
  <Split
    note="Settings > Machines > Who can run work here controls what remote agents can reach on this machine."
    copy={
      <Copy
        width={540}
        eyebrow="02 / Who can run work here"
        line1="Cap projects, sign-ins,"
        line2="and access level."
        body="Open Who can run work here on the receiving machine to limit which projects, provider accounts, and permission level remote agents may use."
      />
    }
  >
    <InWindow title="SpecWithCode · Settings · Who can run work here">
      <div style={{padding: 36, display: 'flex', flexDirection: 'column', gap: 18}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{fontFamily: FONT.serif, fontSize: 34, color: C.ink}}>Workstation Mac</div>
          <Pill tone="muted">My machine</Pill>
        </div>
        <UiRow
          delay={16}
          active
          title="Projects scope"
          subtitle="Linked projects only · or choose specific listed projects"
          right={<Pill tone="olive">Linked</Pill>}
        />
        <UiRow
          delay={32}
          title="Access cap"
          subtitle="Read-only, Supervised, or Full access · lower anytime"
          right={<Pill tone="olive">Supervised</Pill>}
        />
        <UiRow
          delay={48}
          title="Provider sign-ins"
          subtitle="Choose which local accounts remote workers may run with"
          right={<Pill tone="muted">2 selected</Pill>}
        />
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6}}>
          <span style={{fontFamily: FONT.sans, fontSize: 16, color: C.muted}}>Revoking stops new remote work immediately.</span>
          <Pill tone="rust">Revoke</Pill>
        </div>
      </div>
    </InWindow>
  </Split>
);

const ThreeBoundariesScene: React.FC = () => (
  <Split
    note="SpecWithCode Connect, machine worker grants, and MCP servers are configured independently."
    copy={
      <Copy
        width={540}
        eyebrow="03 / Clear boundaries"
        line1="Connect, grants, and MCP"
        line2="are three separate layers."
        body="Signing in lets you see your machines. Machine grants let agents run across them. MCP connects external tool servers per project."
      />
    }
  >
    <InWindow title="SpecWithCode · Permission boundaries">
      <div style={{padding: 36, display: 'flex', flexDirection: 'column', gap: 18}}>
        <UiRow
          delay={14}
          active
          title="1. SpecWithCode Connect"
          subtitle="Account sign-in plus 6-character device approval · opens your threads from another computer or phone"
          right={<Pill tone="olive">Device</Pill>}
        />
        <UiRow
          delay={34}
          title="2. Machine worker grants"
          subtitle="Settings > Machines · lets agents on one machine start workers on another"
          right={<Pill tone="olive">Agents</Pill>}
        />
        <UiRow
          delay={54}
          title="3. MCP connections"
          subtitle="Settings > Integrations · connects external tool servers, never replaces Connect"
          right={<Pill tone="muted">Tools</Pill>}
        />
      </div>
    </InWindow>
  </Split>
);

export const MACHINE_PERMISSIONS_FRAMES = 1920; // 64.0s @ 30fps

export const MachinePermissionsTutorial: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={315}>
      <TitleCard
        eyebrow="SpecWithCode · Permissions"
        line1="Machine permissions"
        line2="and worker access."
        chips={['Two named lines', 'One-way by default', 'Project and sign-in caps', 'Revoke anytime']}
      />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={510}>
      <TwoLinesScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={465}>
      <WhoCanRunScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={435}>
      <ThreeBoundariesScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={255}>
      <ClosingCard
        eyebrow="Next in Connect your devices"
        line1="Troubleshoot offline machines"
        line2="and dismissed codes."
        chips={['spec-weave.com/tutorials', 'Settings > Machines', 'Who can run work here']}
      />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);

export const MachinePermissionsPoster: React.FC = () => (
  <TitleCard
    eyebrow="SpecWithCode · Permissions"
    line1="Machine permissions"
    line2="and worker access."
    chips={['Two named lines', 'One-way by default', 'Project and sign-in caps']}
  />
);

/* =========================================================================
 * 3. connect-troubleshooting (48.0s = 1440 frames @ 30fps)
 * ========================================================================= */

const DismissedCodeScene: React.FC = () => (
  <Split
    note="Dismissing a code prompt keeps it quiet for that request. Show code or Settings > Machines reopens it."
    copy={
      <Copy
        width={540}
        eyebrow="01 / Missing code prompt"
        line1="Dismissed the code?"
        line2="Reopen it anytime."
        body="Choosing Later keeps the floating prompt quiet for that request. Open Settings, Machines and click Show code to view or generate a fresh 6-character code."
      />
    }
  >
    <InWindow title="SpecWithCode · Settings · Machines">
      <div style={{padding: 36, display: 'flex', flexDirection: 'column', gap: 20}}>
        <UiRow
          delay={16}
          active
          title="Studio Mini is waiting for approval"
          subtitle="Request pending · prompt was dismissed with Later"
          right={
            <PulseRing at={55}>
              <Pill tone="solid">Show code</Pill>
            </PulseRing>
          }
        />
        <div
          style={{
            padding: 24,
            borderRadius: 14,
            background: '#ffffff',
            border: `1.5px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 18, color: C.ink}}>Fresh approval code (example)</div>
            <div style={{fontFamily: FONT.sans, fontSize: 15, color: C.muted, marginTop: 4}}>Codes expire after 30 minutes · approve on each machine separately</div>
          </div>
          <div style={{fontFamily: FONT.mono, fontSize: 34, fontWeight: 600, letterSpacing: '0.14em', color: C.olive}}>
            R4N-8TX
          </div>
        </div>
        <div style={{fontFamily: FONT.sans, fontSize: 17, color: C.muted, lineHeight: 1.5}}>
          Approving on one computer never approves a second computer. Repeat the 6-character code on each machine you want to reach.
        </div>
      </div>
    </InWindow>
  </Split>
);

const OfflineMachineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = [
    {at: 18, text: '$ specwithcode service status', color: '#e8eddf'},
    {at: 48, text: 'running  port=3773  pid=41820', color: '#9ec47c'},
    {at: 86, text: '$ specwithcode connect status', color: '#e8eddf'},
    {at: 118, text: 'connected  machine=workstation-mac  relay=healthy', color: '#9ec47c'},
    {at: 162, text: '# If offline: restart service, check sign-in, update to latest release', color: '#a5aa9a'},
  ];

  return (
    <Split
      note="Example terminal output with host identifiers redacted."
      copy={
        <Copy
          width={540}
          eyebrow="02 / Machine shows offline"
          line1="Check the service"
          line2="and Connect tunnel."
          body="Run service status and connect status on the offline machine. If the relay returned an auth error, sign out and back in to renew your Connect session."
        />
      }
    >
      <InWindow title="Terminal · Workstation Mac" dark>
        <div style={{padding: 36, fontFamily: FONT.mono, fontSize: 22, lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 10}}>
          {lines.map((line) => {
            const op = interpolate(frame, [line.at, line.at + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
            return (
              <div key={line.text} style={{color: line.color, opacity: op}}>
                {line.text}
              </div>
            );
          })}
        </div>
      </InWindow>
    </Split>
  );
};

const RouteFallbackScene: React.FC = () => (
  <Split
    note="Use SpecWithCode Connect first. Tailscale and private QR pairing remain optional direct fallbacks."
    copy={
      <Copy
        width={540}
        eyebrow="03 / Connect vs Tailscale"
        line1="Use Connect by default."
        line2="Tailscale stays optional."
        body="SpecWithCode Connect works across any network with zero VPN setup. Keep Tailscale or private QR pairing only when you specifically want a direct private route."
      />
    }
  >
    <InWindow title="SpecWithCode · Choosing a route">
      <div style={{padding: 36, display: 'flex', flexDirection: 'column', gap: 18}}>
        <UiRow
          delay={16}
          active
          title="SpecWithCode Connect (default)"
          subtitle="Encrypted hosted relay · automatic discovery · works on home Wi-Fi, office, and cellular"
          right={<Pill tone="olive">Default</Pill>}
        />
        <UiRow
          delay={36}
          title="Tailscale or private QR (optional fallback)"
          subtitle="Direct peer route over your own tailnet or LAN · never required for Connect"
          right={<Pill tone="muted">Fallback</Pill>}
        />
        <UiRow
          delay={56}
          title="MCP servers (separate)"
          subtitle="External tools and APIs in Settings > Integrations · not for device pairing"
          right={<Pill tone="muted">Separate</Pill>}
        />
      </div>
    </InWindow>
  </Split>
);

export const CONNECT_TROUBLESHOOTING_FRAMES = 1890; // 63.0s @ 30fps

export const ConnectTroubleshootingTutorial: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={345}>
      <TitleCard
        eyebrow="SpecWithCode · Troubleshooting"
        line1="Fix offline machines,"
        line2="codes and routes."
        chips={['Quiet code prompts', 'Service and tunnel check', 'Connect vs Tailscale', 'Safe device removal']}
      />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={465}>
      <DismissedCodeScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={450}>
      <OfflineMachineScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={450}>
      <RouteFallbackScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
    <TransitionSeries.Sequence durationInFrames={240}>
      <ClosingCard
        eyebrow="All Connect tutorials in one place"
        line1="Watch the full hub"
        line2="at spec-weave.com/tutorials"
        chips={['spec-weave.com/tutorials', 'Connect your devices', 'Always current']}
      />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);

export const ConnectTroubleshootingPoster: React.FC = () => (
  <TitleCard
    eyebrow="SpecWithCode · Troubleshooting"
    line1="Fix offline machines,"
    line2="codes and routes."
    chips={['Quiet code prompts', 'Service and tunnel check', 'Connect vs Tailscale']}
  />
);
