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

const TRUST_BADGES = [
  {text: 'Verified Skills Only', color: COLORS.green},
  {text: '41-Pattern Scan', color: COLORS.purple},
  {text: 'verifiedskill.com', color: COLORS.amber},
];

export const Scene5ShipSafely: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Radial glow intensifies
  const glowIntensity = interpolate(frame, [0, fps * 3], [0.05, 0.25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // "SpecWeave" wordmark slides up with spring
  const wordmarkSpring = spring({
    frame,
    fps,
    config: {damping: 200},
  });
  const wordmarkY = interpolate(wordmarkSpring, [0, 1], [80, 0]);

  // Tagline fades in at 1.5s
  const taglineOpacity = interpolate(frame, [fps * 1.5, fps * 2.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineY = interpolate(frame, [fps * 1.5, fps * 2.5], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Install command at 4s
  const cmdOpacity = interpolate(frame, [fps * 4, fps * 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Trust badges at 5.5s
  const badgeBaseDelay = fps * 5.5;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.purpleDark,
        fontFamily: INTER,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Purple radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(124,58,237,${glowIntensity}), transparent 70%)`,
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
            fontSize: 80,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff, #c4b5fd)',
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
            marginTop: 24,
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            Ship features while you sleep.{' '}
          </span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.green,
            }}
          >
            Safely.
          </span>
        </div>

        {/* Install command */}
        <div
          style={{
            marginTop: 40,
            opacity: cmdOpacity,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: '12px 28px',
            display: 'inline-block',
          }}
        >
          <span
            style={{
              fontFamily: JETBRAINS_MONO,
              fontSize: 16,
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
            gap: 16,
            marginTop: 36,
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
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: badge.color,
                  opacity: badgeOpacity,
                }}
              >
                {badge.text}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
