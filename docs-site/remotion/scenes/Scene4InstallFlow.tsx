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

const COMMAND = '$ npx vskill add @specweave/react-frontend';
const CHAR_FRAMES = 2;

const OUTPUT_LINES = [
  {text: 'Fetching SKILL.md...', color: 'rgba(255,255,255,0.7)', delay: 0},
  {text: 'Running 41-pattern scan...', color: 'rgba(255,255,255,0.7)', delay: 20},
  {text: 'Pattern check: PASS (0 findings)', color: COLORS.green, delay: 50},
  {text: 'LLM intent analysis: PASS (96/100)', color: COLORS.green, delay: 80},
  {text: 'Verified \u2014 Installing...', color: COLORS.green, delay: 110, bold: true},
];

export const Scene4InstallFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Phase 1: Typewriter for command (0-2s)
  const typedChars = Math.min(COMMAND.length, Math.floor(frame / CHAR_FRAMES));
  const typedText = COMMAND.slice(0, typedChars);
  const isTyping = typedChars < COMMAND.length;

  // Cursor blink
  const cursorOpacity = interpolate(
    frame % 16,
    [0, 8, 16],
    [1, 0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  // Phase 2: Output lines (after typing finishes)
  const typeEndFrame = COMMAND.length * CHAR_FRAMES + 15;

  // Phase 3: Verified badge bounces in
  const lastOutputDelay = OUTPUT_LINES[OUTPUT_LINES.length - 1].delay;
  const badgeSpring = spring({
    frame: Math.max(0, frame - (typeEndFrame + lastOutputDelay + 30)),
    fps,
    config: {damping: 8},
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.purpleDark,
        fontFamily: INTER,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      {/* Terminal window */}
      <div
        style={{
          width: 700,
          background: '#1a1a2e',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 100px rgba(124,58,237,0.1)',
        }}
      >
        {/* Traffic light header */}
        <div
          style={{
            padding: '12px 16px',
            background: '#252540',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{display: 'flex', gap: 6}}>
            <div style={{width: 10, height: 10, borderRadius: '50%', background: '#ff5f57'}} />
            <div style={{width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e'}} />
            <div style={{width: 10, height: 10, borderRadius: '50%', background: '#28c840'}} />
          </div>
          <span style={{color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: JETBRAINS_MONO}}>
            Terminal
          </span>
        </div>

        {/* Terminal content */}
        <div style={{padding: 20}}>
          {/* Command line with typewriter */}
          <div
            style={{
              fontFamily: JETBRAINS_MONO,
              fontSize: 15,
              color: COLORS.white,
              marginBottom: 16,
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
                    fontSize: 14,
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

      {/* Verified badge */}
      {badgeSpring > 0 && (
        <div
          style={{
            marginTop: 32,
            transform: `scale(${badgeSpring})`,
            opacity: badgeSpring,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: `${COLORS.green}20`,
            border: `2px solid ${COLORS.green}`,
            borderRadius: 50,
            padding: '10px 24px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.green} strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: COLORS.green,
            }}
          >
            Verified by vSkill
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
