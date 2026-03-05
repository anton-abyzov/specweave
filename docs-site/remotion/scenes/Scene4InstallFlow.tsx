import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import {COLORS} from '../lib/theme';
import {INTER, JETBRAINS_MONO} from '../lib/fonts';
import {ShieldCheck} from 'lucide-react';

const COMMAND = '$ npx vskill add @specweave/react-frontend';
const CHAR_FRAMES = 2;

const OUTPUT_LINES = [
  {text: 'Fetching SKILL.md...', color: 'rgba(255,255,255,0.7)', delay: 0},
  {text: 'Running 41-pattern scan...', color: 'rgba(255,255,255,0.7)', delay: 20},
  {text: 'Pattern check: PASS (0 findings)', color: COLORS.success, delay: 50},
  {text: 'LLM intent analysis: PASS (96/100)', color: COLORS.success, delay: 80},
  {text: 'Verified \u2014 Installing...', color: COLORS.success, delay: 110, bold: true},
];

export const Scene4InstallFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const typedChars = Math.min(COMMAND.length, Math.floor(frame / CHAR_FRAMES));
  const typedText = COMMAND.slice(0, typedChars);
  const isTyping = typedChars < COMMAND.length;

  const cursorOpacity = interpolate(
    frame % 16,
    [0, 8, 16],
    [1, 0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  const typeEndFrame = COMMAND.length * CHAR_FRAMES + 15;

  const lastOutputDelay = OUTPUT_LINES[OUTPUT_LINES.length - 1].delay;
  const badgeSpring = spring({
    frame: Math.max(0, frame - (typeEndFrame + lastOutputDelay + 30)),
    fps,
    config: {damping: 8},
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 70%, ${COLORS.primary500}10, ${COLORS.surfaceDark} 70%)`,
        fontFamily: INTER,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 90,
      }}
    >
      {/* Terminal window */}
      <div
        style={{
          width: 1050,
          background: '#1a1a2e',
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: `0 30px 90px rgba(0,0,0,0.5), 0 0 150px ${COLORS.primary500}10`,
        }}
      >
        {/* Traffic light header */}
        <div
          style={{
            padding: '18px 24px',
            background: '#252540',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{display: 'flex', gap: 9}}>
            <div style={{width: 15, height: 15, borderRadius: '50%', background: '#ff5f57'}} />
            <div style={{width: 15, height: 15, borderRadius: '50%', background: '#ffbd2e'}} />
            <div style={{width: 15, height: 15, borderRadius: '50%', background: '#28c840'}} />
          </div>
          <span style={{color: COLORS.textSecondary, fontSize: 18, fontFamily: JETBRAINS_MONO}}>
            Terminal
          </span>
        </div>

        {/* Terminal content */}
        <div style={{padding: 30}}>
          {/* Command line with typewriter */}
          <div
            style={{
              fontFamily: JETBRAINS_MONO,
              fontSize: 22,
              color: COLORS.white,
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            <span>{typedText}</span>
            <span style={{opacity: cursorOpacity}}>{'\u258C'}</span>
          </div>

          {/* Output lines */}
          {!isTyping &&
            OUTPUT_LINES.map((line, i) => {
              const lineOpacity = interpolate(
                frame,
                [typeEndFrame + line.delay, typeEndFrame + line.delay + 12],
                [0, 1],
                {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
              );
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: JETBRAINS_MONO,
                    fontSize: 21,
                    color: line.color,
                    fontWeight: (line as {bold?: boolean}).bold ? 700 : 400,
                    opacity: lineOpacity,
                    lineHeight: 2,
                  }}
                >
                  {line.text}
                </div>
              );
            })}
        </div>
      </div>

      {/* Verified badge with Lucide icon */}
      {badgeSpring > 0 && (
        <div
          style={{
            marginTop: 48,
            transform: `scale(${badgeSpring})`,
            opacity: badgeSpring,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: `${COLORS.success}20`,
            border: `2px solid ${COLORS.success}`,
            borderRadius: 50,
            padding: '15px 36px',
          }}
        >
          <ShieldCheck size={30} color={COLORS.success} strokeWidth={2.5} />
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.success,
            }}
          >
            Verified by vSkill
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
