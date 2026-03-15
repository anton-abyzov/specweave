/**
 * B-Roll #14: Animated Layer Stack
 * Layers build from bottom up: Model → Claude Code → SpecWeave → Specs → Codebase
 * Duration: ~8 seconds (240 frames @ 30fps)
 *
 * Used during "WHAT IS SPECWEAVE" section to explain the architecture.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {COLORS} from '../constants';
import {INTER} from '../../lib/fonts';

const LAYERS = [
  {
    label: 'YOUR CODEBASE',
    sublabel: 'React, Swift, .NET — whatever you build',
    color: COLORS.accentBlue,
    bg: `${COLORS.accentBlue}18`,
  },
  {
    label: 'spec.md + plan.md + tasks.md',
    sublabel: 'permanent — version controlled — portable',
    color: COLORS.gold,
    bg: `${COLORS.gold}18`,
  },
  {
    label: 'SPECWEAVE SKILL FABRIC',
    sublabel: 'Skills · Agents · Hooks · Commands (removable)',
    color: COLORS.primary400,
    bg: `${COLORS.primary400}18`,
  },
  {
    label: 'CLAUDE CODE',
    sublabel: 'foundation — AI coding agent',
    color: COLORS.success,
    bg: `${COLORS.success}18`,
  },
  {
    label: 'CLAUDE OPUS 4.6 / SONNET 4.6',
    sublabel: 'model layer',
    color: COLORS.textSecondary,
    bg: `${COLORS.textSecondary}12`,
  },
];

export const LAYER_DIAGRAM_DURATION = 270;

export const LayerDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgDark,
        fontFamily: INTER,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 200px',
      }}
    >
      <div style={{width: '100%', maxWidth: 1200}}>
        {/* Build from bottom (reverse order) */}
        {[...LAYERS].reverse().map((layer, reverseIdx) => {
          const i = LAYERS.length - 1 - reverseIdx;
          // Bottom layers appear first
          const delay = (LAYERS.length - 1 - i) * 30 + 15;

          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: {damping: 16, stiffness: 100},
          });
          const slideX = interpolate(s, [0, 1], [-80, 0]);
          const opacity = interpolate(s, [0, 1], [0, 1]);

          // Highlight the SpecWeave layer after all appear
          const isSpecweave = i === 2;
          const highlightPulse = isSpecweave
            ? interpolate(
                frame,
                [180, 200, 220, 240],
                [1, 1.3, 1, 1.1],
                {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
              )
            : 1;

          return (
            <div
              key={i}
              style={{
                backgroundColor: layer.bg,
                border: `2px solid ${layer.color}50`,
                borderRadius: 12,
                padding: '24px 40px',
                marginBottom: 8,
                opacity,
                transform: `translateX(${slideX}px) scale(${highlightPulse})`,
                boxShadow: isSpecweave && frame > 180
                  ? `0 0 30px ${layer.color}40`
                  : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: layer.color,
                  letterSpacing: 1,
                }}
              >
                {layer.label}
              </div>
              <div
                style={{
                  fontSize: 18,
                  color: COLORS.textSecondary,
                  marginTop: 4,
                }}
              >
                {layer.sublabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrow annotation */}
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: interpolate(frame, [180, 200], [0, 1], {
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div
          style={{
            fontSize: 20,
            color: COLORS.primary300,
            textAlign: 'center',
            writingMode: 'vertical-rl',
            letterSpacing: 3,
          }}
        >
          REMOVABLE LAYER
        </div>
      </div>
    </AbsoluteFill>
  );
};
