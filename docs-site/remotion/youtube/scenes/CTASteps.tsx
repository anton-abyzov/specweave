/**
 * B-Roll #28: CTA Steps
 * Five steps appearing one at a time with icons.
 * Duration: ~8 seconds (240 frames @ 30fps)
 *
 * Used during the closing "what to do next" section.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {COLORS} from '../constants';
import {INTER, JETBRAINS_MONO} from '../../lib/fonts';

const STEPS = [
  {
    number: 1,
    title: 'Install SpecWeave',
    command: 'npm install -g specweave && specweave init .',
    icon: '📦',
    color: COLORS.primary400,
  },
  {
    number: 2,
    title: 'Run your first increment',
    command: "/sw:increment 'describe your next feature'",
    icon: '🚀',
    color: COLORS.accentBlue,
  },
  {
    number: 3,
    title: 'Let it run overnight',
    command: '/sw:auto',
    icon: '🌙',
    color: COLORS.accentCyan,
  },
  {
    number: 4,
    title: 'Try vSkill Studio',
    command: 'npx vskill studio',
    icon: '🔬',
    color: COLORS.success,
  },
  {
    number: 5,
    title: 'Star the GitHub repo',
    command: 'github.com/anton-abyzov/specweave',
    icon: '⭐',
    color: COLORS.gold,
  },
];

export const CTA_STEPS_DURATION = 270;

export const CTASteps: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, ${COLORS.primary500}15, ${COLORS.bgDark} 70%)`,
        fontFamily: INTER,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 200px',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 42,
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: 60,
          opacity: interpolate(frame, [0, 15], [0, 1], {extrapolateRight: 'clamp'}),
        }}
      >
        What to do next
      </div>

      {/* Steps */}
      <div style={{width: '100%', maxWidth: 1000}}>
        {STEPS.map((step, i) => {
          const delay = 25 + i * 35;
          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: {damping: 14, stiffness: 100},
          });
          const opacity = interpolate(s, [0, 1], [0, 1]);
          const slideX = interpolate(s, [0, 1], [-60, 0]);

          return (
            <div
              key={step.number}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                marginBottom: 28,
                opacity,
                transform: `translateX(${slideX}px)`,
              }}
            >
              {/* Number circle */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: `${step.color}25`,
                  border: `2px solid ${step.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 900,
                  color: step.color,
                  flexShrink: 0,
                }}
              >
                {step.number}
              </div>

              {/* Content */}
              <div style={{flex: 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                  <span style={{fontSize: 28}}>{step.icon}</span>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {step.title}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: step.color,
                    fontFamily: JETBRAINS_MONO,
                    marginTop: 6,
                    backgroundColor: `${step.color}10`,
                    padding: '6px 14px',
                    borderRadius: 6,
                    display: 'inline-block',
                  }}
                >
                  {step.command}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
