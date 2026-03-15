/**
 * Animated number counter with spring physics.
 * Rolls up from 0 to target value.
 */
import React from 'react';
import {useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import {COLORS} from '../lib/theme';
import {INTER} from '../lib/fonts';

type NumberTickerProps = {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  startFrame: number;
  color?: string;
  fontSize?: number;
  labelSize?: number;
};

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  label,
  suffix = '',
  prefix = '',
  startFrame,
  color = COLORS.primary400,
  fontSize = 120,
  labelSize = 32,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const progress = spring({
    frame: localFrame,
    fps,
    config: {damping: 40, stiffness: 80, mass: 0.8},
  });

  const displayValue = Math.round(value * progress);
  const opacity = interpolate(localFrame, [0, 8], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const y = interpolate(localFrame, [0, 12], [30, 0], {
    extrapolateRight: 'clamp',
  });

  const formatted =
    displayValue >= 1000
      ? displayValue.toLocaleString('en-US')
      : String(displayValue);

  return (
    <div
      style={{
        textAlign: 'center',
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: INTER,
      }}
    >
      <div style={{fontSize, fontWeight: 900, color, lineHeight: 1.1}}>
        {prefix}
        {formatted}
        {suffix}
      </div>
      <div
        style={{
          fontSize: labelSize,
          fontWeight: 500,
          color: COLORS.textSecondary,
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
};
