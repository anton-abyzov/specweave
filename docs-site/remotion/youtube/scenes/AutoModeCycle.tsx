/**
 * B-Roll #20: Auto Mode Cycle
 * Animated loop: IMPLEMENT → TEST → FAIL → FIX → PASS → NEXT
 * With a progress bar advancing through tasks.
 * Duration: ~8 seconds (240 frames @ 30fps)
 *
 * Used during /sw:auto explanation section.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {SectionTitle} from '../../components/SectionTitle';
import {COLORS} from '../constants';
import {INTER, JETBRAINS_MONO} from '../../lib/fonts';

const CYCLE_STEPS = [
  {label: 'IMPLEMENT', color: COLORS.accentBlue, icon: '⚡'},
  {label: 'TEST', color: COLORS.accentCyan, icon: '🧪'},
  {label: 'FAIL', color: COLORS.danger, icon: '✗'},
  {label: 'FIX', color: COLORS.gold, icon: '🔧'},
  {label: 'PASS', color: COLORS.success, icon: '✓'},
  {label: 'NEXT', color: COLORS.primary400, icon: '→'},
];

const TASK_LIST = [
  {name: 'T-001: JWT auth middleware', done: true},
  {name: 'T-002: Login endpoint', done: true},
  {name: 'T-003: Password reset flow', done: true},
  {name: 'T-004: Session management', done: false},
  {name: 'T-005: Rate limiting', done: false},
  {name: 'T-006: E2E auth tests', done: false},
];

export const AUTO_MODE_DURATION = 270;

export const AutoModeCycle: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Which cycle step is active (cycles through)
  const cycleFrame = Math.max(0, frame - 30);
  const stepDuration = 30; // frames per step
  const activeStep = Math.floor(cycleFrame / stepDuration) % CYCLE_STEPS.length;

  // Tasks completing over time
  const tasksCompleted = interpolate(
    frame,
    [30, 220],
    [0, 4.5],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgDark,
        fontFamily: INTER,
        display: 'flex',
        flexDirection: 'row',
        padding: '60px 80px',
        gap: 60,
      }}
    >
      {/* Left: Cycle visualization */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{marginBottom: 40}}>
          <SectionTitle text="/sw:auto — Autonomous Loop" fontSize={24} />
        </div>

        {/* Cycle steps in a circular-ish layout */}
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 600}}>
          {CYCLE_STEPS.map((step, i) => {
            const isActive = i === activeStep;
            const delay = 15 + i * 8;
            const s = spring({
              frame: Math.max(0, frame - delay),
              fps,
              config: {damping: 16, stiffness: 120},
            });

            const pulseScale = isActive
              ? interpolate(
                  (cycleFrame % stepDuration),
                  [0, stepDuration / 2, stepDuration],
                  [1, 1.15, 1],
                )
              : 1;

            return (
              <React.Fragment key={step.label}>
                <div
                  style={{
                    padding: '20px 28px',
                    borderRadius: 14,
                    backgroundColor: isActive ? `${step.color}25` : `${step.color}10`,
                    border: `2px solid ${isActive ? step.color : `${step.color}30`}`,
                    opacity: interpolate(s, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(s, [0, 1], [0.7, 1]) * pulseScale})`,
                    boxShadow: isActive ? `0 0 20px ${step.color}40` : 'none',
                    textAlign: 'center',
                    minWidth: 140,
                  }}
                >
                  <div style={{fontSize: 32, marginBottom: 4}}>{step.icon}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: isActive ? step.color : COLORS.textSecondary,
                      fontFamily: JETBRAINS_MONO,
                    }}
                  >
                    {step.label}
                  </div>
                </div>
                {i < CYCLE_STEPS.length - 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 24,
                      color: COLORS.textSecondary,
                      opacity: interpolate(s, [0, 1], [0, 0.5]),
                    }}
                  >
                    →
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Right: Task list with live progress */}
      <div style={{width: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: COLORS.textSecondary,
            marginBottom: 24,
            fontFamily: JETBRAINS_MONO,
            letterSpacing: 2,
            opacity: interpolate(frame, [20, 35], [0, 1], {extrapolateRight: 'clamp'}),
          }}
        >
          tasks.md
        </div>

        {TASK_LIST.map((task, i) => {
          const taskDelay = 40 + i * 12;
          const taskOpacity = interpolate(frame, [taskDelay, taskDelay + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const isCompleted = i < Math.floor(tasksCompleted);
          const isInProgress = i === Math.floor(tasksCompleted) && tasksCompleted % 1 > 0;

          return (
            <div
              key={task.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 14,
                opacity: taskOpacity,
                fontFamily: JETBRAINS_MONO,
                fontSize: 18,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: `2px solid ${isCompleted ? COLORS.success : isInProgress ? COLORS.gold : '#444'}`,
                  backgroundColor: isCompleted ? `${COLORS.success}30` : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: COLORS.success,
                }}
              >
                {isCompleted ? '✓' : isInProgress ? '…' : ''}
              </div>
              <span
                style={{
                  color: isCompleted
                    ? COLORS.textSecondary
                    : isInProgress
                      ? COLORS.gold
                      : '#666',
                  textDecoration: isCompleted ? 'line-through' : 'none',
                }}
              >
                {task.name}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
