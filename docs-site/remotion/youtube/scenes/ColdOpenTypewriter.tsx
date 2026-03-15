/**
 * B-Roll #1: Cold Open Typewriter Stats
 * Black background, white text appearing typewriter-style.
 * Duration: ~12 seconds (360 frames @ 30fps)
 *
 * Lines:
 *   "10 production apps. Built in weeks, not months."
 *   "Three live in the App Store. From baby sleep tech to enterprise sports leagues."
 *   "Nearly 4,000 commits across four repositories. 700 releases — roughly four every single day."
 *   "One developer. One system. Open source."
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {TypewriterText} from '../../components/TypewriterText';
import {COLORS} from '../constants';

const LINES = [
  {
    text: '10 production apps. Built in weeks, not months.',
    start: 15,
    charSpeed: 1.2,
  },
  {
    text: 'Three live in the App Store. From baby sleep tech to enterprise sports leagues.',
    start: 90,
    charSpeed: 1.0,
  },
  {
    text: 'Nearly 4,000 commits across four repositories. 700 releases — roughly four every single day.',
    start: 180,
    charSpeed: 0.9,
  },
  {
    text: 'One developer. One system. Open source.',
    start: 285,
    charSpeed: 1.2,
  },
];

export const COLD_OPEN_DURATION = 390; // 13 seconds

export const ColdOpenTypewriter: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 180px',
      }}
    >
      <div style={{maxWidth: 1400}}>
        {LINES.map((line, i) => {
          const lineOpacity = interpolate(
            frame,
            [line.start - 5, line.start],
            [0, 1],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          );

          // Fade out previous lines slightly as new ones appear
          const fadeOut =
            i < LINES.length - 1
              ? interpolate(
                  frame,
                  [LINES[i + 1].start, LINES[i + 1].start + 30],
                  [1, 0.4],
                  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                )
              : 1;

          return (
            <div
              key={i}
              style={{
                marginBottom: 36,
                opacity: lineOpacity * fadeOut,
              }}
            >
              <TypewriterText
                text={line.text}
                startFrame={line.start}
                charSpeed={line.charSpeed}
                fontSize={i === 2 ? 48 : 54}
                color={i === 2 ? COLORS.primary300 : '#ffffff'}
                fontWeight={i === 3 ? 900 : 700}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
