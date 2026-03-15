/**
 * B-Roll #19: Increment Loop — Three Files
 * spec.md → plan.md → tasks.md appearing with content filling in.
 * Duration: ~10 seconds (300 frames @ 30fps)
 *
 * Used during "THE CORE WORKFLOW" section.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {SectionTitle} from '../../components/SectionTitle';
import {COLORS} from '../constants';
import {INTER, JETBRAINS_MONO} from '../../lib/fonts';

const FILES = [
  {
    name: 'spec.md',
    icon: '📋',
    color: COLORS.primary400,
    subtitle: 'WHAT to build',
    content: [
      '## US-001: User Authentication',
      '',
      '**AC-US1-01**: Users can log in with email/password',
      '**AC-US1-02**: JWT tokens expire after 24h',
      '**AC-US1-03**: Password reset via email link',
    ],
    startFrame: 20,
  },
  {
    name: 'plan.md',
    icon: '🏗️',
    color: COLORS.accentBlue,
    subtitle: 'HOW to build it',
    content: [
      '## Architecture',
      '',
      'Express middleware → JWT validation',
      'bcrypt password hashing (12 rounds)',
      'Redis session store for revocation',
    ],
    startFrame: 110,
  },
  {
    name: 'tasks.md',
    icon: '✅',
    color: COLORS.success,
    subtitle: "WHAT'S DONE",
    content: [
      '### T-001: JWT middleware',
      '**AC**: AC-US1-01, AC-US1-02',
      '**Test**: Given valid token → 200',
      '',
      '### T-002: Login endpoint',
      '**AC**: AC-US1-01',
    ],
    startFrame: 200,
  },
];

export const INCREMENT_FLOW_DURATION = 330;

export const IncrementFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgDark,
        fontFamily: INTER,
        padding: '50px 80px',
      }}
    >
      {/* Title */}
      <div style={{marginBottom: 40}}>
        <SectionTitle text="/sw:increment — Three Files, Every Decision Captured" />
      </div>

      {/* Three file cards */}
      <div style={{display: 'flex', gap: 36, justifyContent: 'center'}}>
        {FILES.map((file, i) => {
          const s = spring({
            frame: Math.max(0, frame - file.startFrame),
            fps,
            config: {damping: 14, stiffness: 100},
          });
          const opacity = interpolate(s, [0, 1], [0, 1]);
          const slideY = interpolate(s, [0, 1], [60, 0]);

          return (
            <div
              key={file.name}
              style={{
                width: 520,
                borderRadius: 16,
                backgroundColor: '#1a1a1a',
                border: `2px solid ${file.color}40`,
                overflow: 'hidden',
                opacity,
                transform: `translateY(${slideY}px)`,
              }}
            >
              {/* File header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '16px 24px',
                  backgroundColor: `${file.color}12`,
                  borderBottom: `1px solid ${file.color}30`,
                }}
              >
                <span style={{fontSize: 28}}>{file.icon}</span>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: file.color,
                    fontFamily: JETBRAINS_MONO,
                  }}
                >
                  {file.name}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    color: COLORS.textSecondary,
                    marginLeft: 'auto',
                  }}
                >
                  {file.subtitle}
                </span>
              </div>

              {/* File content typing in */}
              <div
                style={{
                  padding: '20px 24px',
                  fontFamily: JETBRAINS_MONO,
                  fontSize: 16,
                  lineHeight: 1.6,
                  minHeight: 280,
                }}
              >
                {file.content.map((line, lineIdx) => {
                  const lineDelay = file.startFrame + 20 + lineIdx * 12;
                  const lineOpacity = interpolate(
                    frame,
                    [lineDelay, lineDelay + 8],
                    [0, 1],
                    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                  );

                  const isHeading = line.startsWith('##');
                  const isAC = line.startsWith('**AC');

                  return (
                    <div
                      key={lineIdx}
                      style={{
                        opacity: lineOpacity,
                        color: isHeading
                          ? file.color
                          : isAC
                            ? COLORS.gold
                            : line === ''
                              ? 'transparent'
                              : COLORS.textSecondary,
                        fontWeight: isHeading ? 700 : 400,
                        fontSize: isHeading ? 20 : 16,
                        marginBottom: line === '' ? 8 : 4,
                      }}
                    >
                      {line || '\u00A0'}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connecting arrows */}
      {frame > 110 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 490,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 36,
              color: COLORS.textSecondary,
              opacity: interpolate(frame, [110, 125], [0, 0.6], {
                extrapolateRight: 'clamp',
              }),
            }}
          >
            →
          </div>
          {frame > 200 && (
            <div
              style={{
                fontSize: 36,
                color: COLORS.textSecondary,
                opacity: interpolate(frame, [200, 215], [0, 0.6], {
                  extrapolateRight: 'clamp',
                }),
              }}
            >
              →
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
