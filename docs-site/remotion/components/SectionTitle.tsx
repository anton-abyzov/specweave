/**
 * Consistent section title used across all B-Roll compositions.
 * Uppercase, letter-spaced, fades in.
 */
import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {COLORS} from '../lib/theme';
import {INTER} from '../lib/fonts';

type SectionTitleProps = {
  text: string;
  color?: string;
  fontSize?: number;
};

export const SectionTitle: React.FC<SectionTitleProps> = ({
  text,
  color = COLORS.textSecondary,
  fontSize = 28,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        fontSize,
        fontWeight: 500,
        color,
        textAlign: 'center',
        letterSpacing: 4,
        textTransform: 'uppercase',
        fontFamily: INTER,
        opacity,
      }}
    >
      {text}
    </div>
  );
};
