import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import {COLORS} from '../lib/theme';
import {INTER} from '../lib/fonts';

const TIERS = [
  {
    label: 'Scanned',
    color: COLORS.green,
    icon: '\u26A1', // lightning
    detail: '41 patterns \u00B7 <500ms \u00B7 Free',
    delay: 0,
  },
  {
    label: 'Verified',
    color: COLORS.purple,
    icon: '\uD83D\uDD0D', // magnifier
    detail: 'LLM intent analysis \u00B7 5-15s \u00B7 $0.03',
    delay: 40,
  },
  {
    label: 'Certified',
    color: COLORS.amber,
    icon: '\uD83D\uDEE1\uFE0F', // shield
    detail: 'Human review + sandbox \u00B7 1-5 days',
    delay: 80,
  },
];

export const Scene3ThreeTiers: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Title animations
  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [0, fps * 0.5], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Badges start appearing at 1.5s
  const badgeBaseDelay = fps * 1.5;

  // Footer fades in at 7s
  const footerOpacity = interpolate(frame, [fps * 7, fps * 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
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
      {/* Subtitle */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: COLORS.purple,
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 12,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Verified Skills Standard
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: COLORS.white,
          marginBottom: 60,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Three Tiers of Trust
      </div>

      {/* Tier badges with arrows */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {TIERS.map((tier, i) => {
          const badgeSpring = spring({
            frame: Math.max(0, frame - (badgeBaseDelay + tier.delay)),
            fps,
            config: {damping: 12, stiffness: 180},
          });

          const arrowOpacity =
            i < TIERS.length - 1
              ? interpolate(
                  frame,
                  [
                    badgeBaseDelay + tier.delay + 25,
                    badgeBaseDelay + tier.delay + 40,
                  ],
                  [0, 1],
                  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                )
              : 0;

          return (
            <React.Fragment key={tier.label}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  transform: `scale(${badgeSpring})`,
                  opacity: badgeSpring,
                }}
              >
                {/* Circle badge */}
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    border: `3px solid ${tier.color}`,
                    background: `${tier.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 36,
                  }}
                >
                  {tier.icon}
                </div>

                {/* Label */}
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: tier.color,
                  }}
                >
                  {tier.label}
                </div>

                {/* Detail */}
                <div
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'center',
                    maxWidth: 180,
                    lineHeight: 1.4,
                  }}
                >
                  {tier.detail}
                </div>
              </div>

              {/* Arrow between badges */}
              {i < TIERS.length - 1 && (
                <div
                  style={{
                    fontSize: 28,
                    color: 'rgba(255,255,255,0.3)',
                    margin: '0 32px',
                    marginBottom: 60,
                    opacity: arrowOpacity,
                  }}
                >
                  \u2192
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          fontSize: 16,
          fontWeight: 600,
          color: COLORS.amber,
          opacity: footerOpacity,
          letterSpacing: 1,
        }}
      >
        verifiedskill.com
      </div>
    </AbsoluteFill>
  );
};
