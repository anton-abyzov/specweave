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
import {ShieldCheck, Scan, Globe} from 'lucide-react';

const TRUST_BADGES = [
  {text: 'Verified Skills Only', color: COLORS.success, Icon: ShieldCheck},
  {text: '41-Pattern Scan', color: COLORS.primary400, Icon: Scan},
  {text: 'verifiedskill.com', color: COLORS.warning, Icon: Globe},
];

export const Scene5ShipSafely: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const glowIntensity = interpolate(frame, [0, fps * 3], [0.05, 0.25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wordmarkSpring = spring({
    frame,
    fps,
    config: {damping: 200},
  });
  const wordmarkY = interpolate(wordmarkSpring, [0, 1], [80, 0]);

  const taglineOpacity = interpolate(frame, [fps * 1.5, fps * 2.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineY = interpolate(frame, [fps * 1.5, fps * 2.5], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cmdOpacity = interpolate(frame, [fps * 4, fps * 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const badgeBaseDelay = fps * 5.5;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${COLORS.primary500}18, ${COLORS.surfaceDark} 65%)`,
        fontFamily: INTER,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(107,88,184,${glowIntensity}), transparent 70%)`,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
        }}
      >
        {/* SpecWeave wordmark */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            background: `linear-gradient(135deg, #ffffff, ${COLORS.primary200})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            transform: `translateY(${wordmarkY}px)`,
            opacity: wordmarkSpring,
            lineHeight: 1,
          }}
        >
          SpecWeave
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 36,
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          <span
            style={{
              fontSize: 42,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            Ship features while you sleep.{' '}
          </span>
          <span
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: COLORS.success,
            }}
          >
            Safely.
          </span>
        </div>

        {/* Install command */}
        <div
          style={{
            marginTop: 60,
            opacity: cmdOpacity,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 18,
            padding: '18px 42px',
            display: 'inline-block',
          }}
        >
          <span
            style={{
              fontFamily: JETBRAINS_MONO,
              fontSize: 24,
              color: '#f0fdf4',
              fontWeight: 600,
            }}
          >
            npm install -g specweave && specweave init .
          </span>
        </div>

        {/* Trust badges */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 54,
          }}
        >
          {TRUST_BADGES.map((badge, i) => {
            const badgeOpacity = interpolate(
              frame,
              [badgeBaseDelay + i * 12, badgeBaseDelay + i * 12 + 20],
              [0, 1],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
            );
            return (
              <div
                key={badge.text}
                style={{
                  background: `${badge.color}15`,
                  border: `1px solid ${badge.color}40`,
                  borderRadius: 50,
                  padding: '12px 30px',
                  fontSize: 20,
                  fontWeight: 600,
                  color: badge.color,
                  opacity: badgeOpacity,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <badge.Icon size={20} />
                {badge.text}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
