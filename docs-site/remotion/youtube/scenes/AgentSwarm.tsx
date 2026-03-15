/**
 * B-Roll #25: Agent Swarm — Multi-Agent Coordination
 * Three terminal panes with progress bars advancing in parallel.
 * File ownership zones highlighted. "ZERO CONFLICTS" text.
 * Duration: ~10 seconds (300 frames @ 30fps)
 *
 * Used during "AGENT SWARMS" section.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {SectionTitle} from '../../components/SectionTitle';
import {COLORS} from '../constants';
import {INTER, JETBRAINS_MONO} from '../../lib/fonts';

const AGENTS = [
  {
    name: 'Claude Code',
    increment: '0005-auth',
    scope: 'src/auth/*',
    color: '#D97757',
    jira: 'JIRA-448',
    github: 'Issue #12',
    startProgress: 0.2,
    endProgress: 0.95,
  },
  {
    name: 'Terminal 2',
    increment: '0006-payments',
    scope: 'src/payments/*',
    color: '#22c55e',
    jira: 'JIRA-449',
    github: 'Issue #13',
    startProgress: 0.1,
    endProgress: 0.78,
  },
  {
    name: 'Terminal 3',
    increment: '0007-search',
    scope: 'src/search/*',
    color: '#3b82f6',
    jira: 'JIRA-450',
    github: 'Issue #14',
    startProgress: 0.0,
    endProgress: 0.55,
  },
];

export const AGENT_SWARM_DURATION = 300;

export const AgentSwarm: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // "ZERO CONFLICTS" flash
  const zeroConflictsOpacity = interpolate(
    frame,
    [220, 240],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const zeroConflictsScale = spring({
    frame: Math.max(0, frame - 220),
    fps,
    config: {damping: 10, stiffness: 150},
  });

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
        <SectionTitle text="Agent Swarm — Parallel Execution" fontSize={32} />
      </div>

      {/* Three agent panels */}
      <div style={{display: 'flex', gap: 32, justifyContent: 'center'}}>
        {AGENTS.map((agent, i) => {
          const delay = 15 + i * 25;
          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: {damping: 16, stiffness: 100},
          });
          const opacity = interpolate(s, [0, 1], [0, 1]);
          const slideY = interpolate(s, [0, 1], [40, 0]);

          // Progress bar animation
          const progress = interpolate(
            frame,
            [delay + 30, 250],
            [agent.startProgress, agent.endProgress],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          );
          const pct = Math.round(progress * 100);

          return (
            <div
              key={agent.name}
              style={{
                width: 520,
                borderRadius: 16,
                backgroundColor: '#1a1a1a',
                border: `1px solid ${agent.color}40`,
                overflow: 'hidden',
                opacity,
                transform: `translateY(${slideY}px)`,
              }}
            >
              {/* Terminal header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 20px',
                  backgroundColor: '#252525',
                  borderBottom: '1px solid #333',
                }}
              >
                <div style={{display: 'flex', gap: 6}}>
                  <div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.dotRed}} />
                  <div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.dotYellow}} />
                  <div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.dotGreen}} />
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 16,
                    color: agent.color,
                    fontWeight: 700,
                  }}
                >
                  {agent.name}
                </div>
              </div>

              {/* Content */}
              <div style={{padding: '20px 24px', fontFamily: JETBRAINS_MONO, fontSize: 18}}>
                <div style={{color: COLORS.textSecondary, marginBottom: 8}}>
                  <span style={{color: agent.color}}>/sw:auto</span> {agent.increment}
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: 24,
                    backgroundColor: '#252525',
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: agent.color,
                      borderRadius: 12,
                      transition: 'width 0.1s',
                    }}
                  />
                </div>

                <div style={{color: '#ffffff', fontSize: 20, fontWeight: 700, marginBottom: 12}}>
                  {pct}%
                </div>

                {/* Scope */}
                <div style={{color: COLORS.textSecondary, fontSize: 15, marginBottom: 6}}>
                  scope: <span style={{color: agent.color}}>{agent.scope}</span>
                </div>
                <div style={{color: COLORS.textSecondary, fontSize: 15}}>
                  {agent.github} · {agent.jira}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ZERO CONFLICTS banner */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 48,
          opacity: zeroConflictsOpacity,
          transform: `scale(${zeroConflictsScale})`,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: COLORS.success,
            letterSpacing: 6,
          }}
        >
          NO OVERLAP. NO CONFLICTS. ZERO.
        </div>
      </div>
    </AbsoluteFill>
  );
};
