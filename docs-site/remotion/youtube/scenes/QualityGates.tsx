/**
 * B-Roll #21: Quality Gates Animation
 * Three gates animating sequentially: Grill → Judge → PM Validation
 * Each gate shows a pass/fail indicator.
 * Duration: ~10 seconds (300 frames @ 30fps)
 *
 * Used during "/sw:done" quality gates explanation.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {SectionTitle} from '../../components/SectionTitle';
import {COLORS} from '../constants';
import {INTER, JETBRAINS_MONO} from '../../lib/fonts';

const GATES = [
  {
    number: 1,
    name: 'GRILL',
    description: 'Adversarial review agent verifies every AC independently',
    icon: '🔍',
    result: 'PASS — 12/12 acceptance criteria verified',
    color: COLORS.danger,
    passColor: COLORS.success,
    startFrame: 30,
  },
  {
    number: 2,
    name: 'JUDGE',
    description: 'LLM evaluates code quality, architecture, test coverage',
    icon: '⚖️',
    result: 'PASS — Score: 94/100',
    color: COLORS.gold,
    passColor: COLORS.success,
    startFrame: 110,
  },
  {
    number: 3,
    name: 'PM VALIDATION',
    description: 'Does the implementation match the original spec?',
    icon: '✅',
    result: 'PASS — All user stories satisfied',
    color: COLORS.primary400,
    passColor: COLORS.success,
    startFrame: 190,
  },
];

export const QUALITY_GATES_DURATION = 300;

export const QualityGates: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgDark,
        fontFamily: INTER,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 120px',
      }}
    >
      {/* Title */}
      <div style={{marginBottom: 60}}>
        <SectionTitle text="/sw:done — Quality Gates" fontSize={32} />
      </div>

      <div style={{display: 'flex', gap: 40, justifyContent: 'center'}}>
        {GATES.map((gate) => {
          const s = spring({
            frame: Math.max(0, frame - gate.startFrame),
            fps,
            config: {damping: 14, stiffness: 100},
          });
          const scale = interpolate(s, [0, 1], [0.7, 1]);
          const opacity = interpolate(s, [0, 1], [0, 1]);

          // Result appears after gate card
          const resultDelay = gate.startFrame + 40;
          const resultOpacity = interpolate(
            frame,
            [resultDelay, resultDelay + 15],
            [0, 1],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          );

          // Checkmark spring
          const checkSpring = spring({
            frame: Math.max(0, frame - resultDelay),
            fps,
            config: {damping: 10, stiffness: 200},
          });

          return (
            <div
              key={gate.number}
              style={{
                width: 480,
                borderRadius: 20,
                backgroundColor: `${gate.color}12`,
                border: `2px solid ${gate.color}40`,
                padding: '40px 36px',
                opacity,
                transform: `scale(${scale})`,
                textAlign: 'center',
              }}
            >
              {/* Gate number */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: gate.color,
                  letterSpacing: 3,
                  marginBottom: 16,
                }}
              >
                GATE {gate.number}
              </div>

              {/* Icon */}
              <div style={{fontSize: 56, marginBottom: 16}}>{gate.icon}</div>

              {/* Name */}
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: '#ffffff',
                  marginBottom: 12,
                }}
              >
                {gate.name}
              </div>

              {/* Description */}
              <div
                style={{
                  fontSize: 18,
                  color: COLORS.textSecondary,
                  lineHeight: 1.4,
                  marginBottom: 24,
                  minHeight: 50,
                }}
              >
                {gate.description}
              </div>

              {/* Result */}
              <div
                style={{
                  opacity: resultOpacity,
                  transform: `scale(${checkSpring})`,
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: gate.passColor,
                    fontFamily: JETBRAINS_MONO,
                    backgroundColor: `${gate.passColor}15`,
                    borderRadius: 8,
                    padding: '12px 20px',
                  }}
                >
                  {gate.result}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
