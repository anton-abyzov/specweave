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
import {Zap, Search, Shield} from 'lucide-react';

const TIERS = [
  {
    label: 'Scanned',
    color: COLORS.success,
    Icon: Zap,
    detail: '52 patterns \u00B7 <500ms \u00B7 Free',
    delay: 0,
  },
  {
    label: 'Verified',
    color: COLORS.primary500,
    Icon: Search,
    detail: 'LLM intent analysis \u00B7 5-15s \u00B7 $0.03',
    delay: 40,
  },
  {
    label: 'Certified',
    color: COLORS.warning,
    Icon: Shield,
    detail: 'Human review + sandbox \u00B7 1-5 days',
    delay: 80,
  },
];

export const Scene3ThreeTiers: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [0, fps * 0.5], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const badgeBaseDelay = fps * 1.5;

  const footerOpacity = interpolate(frame, [fps * 7, fps * 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, ${COLORS.primary500}12, ${COLORS.surfaceDark} 70%)`,
        fontFamily: INTER,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 90,
      }}
    >
      {/* Subtitle */}
      <div
        style={{
          fontSize: 21,
          fontWeight: 700,
          color: COLORS.primary400,
          letterSpacing: 4,
          textTransform: 'uppercase',
          marginBottom: 18,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Verified Skills Standard
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.white,
          marginBottom: 90,
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
                  gap: 24,
                  transform: `scale(${badgeSpring})`,
                  opacity: badgeSpring,
                }}
              >
                {/* Circle badge with Lucide icon */}
                <div
                  style={{
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    border: `4px solid ${tier.color}`,
                    background: `${tier.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <tier.Icon size={54} color={tier.color} strokeWidth={2} />
                </div>

                {/* Label */}
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: tier.color,
                  }}
                >
                  {tier.label}
                </div>

                {/* Detail */}
                <div
                  style={{
                    fontSize: 20,
                    color: COLORS.textSecondary,
                    textAlign: 'center',
                    maxWidth: 270,
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
                    fontSize: 42,
                    color: 'rgba(255,255,255,0.3)',
                    margin: '0 48px',
                    marginBottom: 90,
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
          bottom: 72,
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.warning,
          opacity: footerOpacity,
          letterSpacing: 1,
        }}
      >
        verifiedskill.com
      </div>
    </AbsoluteFill>
  );
};
