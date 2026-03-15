/**
 * Reusable animated headline with spring physics.
 * Ported from vskill-platform, adapted to SpecWeave brand theme.
 */
import React from 'react';
import {useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import {COLORS} from '../lib/theme';
import {INTER} from '../lib/fonts';

type BigTextProps = {
  text: string;
  subtitle?: string;
  fontSize?: number;
  subtitleSize?: number;
  color?: string;
  subtitleColor?: string;
  startFrame?: number;
  gradient?: boolean;
};

export const BigText: React.FC<BigTextProps> = ({
  text,
  subtitle,
  fontSize = 72,
  subtitleSize = 28,
  color = COLORS.textPrimary,
  subtitleColor = COLORS.textSecondary,
  startFrame = 0,
  gradient = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);
  const s = spring({frame: localFrame, fps, config: {damping: 14, stiffness: 100}});
  const scale = interpolate(s, [0, 1], [0.8, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [30, 0]);

  const subtitleOpacity = interpolate(localFrame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textStyle: React.CSSProperties = {
    fontSize,
    fontWeight: 900,
    fontFamily: INTER,
    lineHeight: 1.1,
    ...(gradient
      ? {
          background: `linear-gradient(135deg, ${COLORS.primary400}, ${COLORS.accentCyan})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }
      : {color}),
  };

  return (
    <div
      style={{
        textAlign: 'center',
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
      }}
    >
      <div style={textStyle}>{text}</div>
      {subtitle && (
        <div
          style={{
            fontSize: subtitleSize,
            fontWeight: 500,
            color: subtitleColor,
            marginTop: 16,
            fontFamily: INTER,
            opacity: subtitleOpacity,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
