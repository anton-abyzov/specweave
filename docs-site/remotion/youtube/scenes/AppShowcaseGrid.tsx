/**
 * B-Roll #8: Ten App Grid
 * 2x5 grid where each app card fades in with name and tagline.
 * Duration: ~10 seconds (300 frames @ 30fps)
 *
 * Used during "THE PORTFOLIO" section overview.
 * Each card animates in sequentially with a spring bounce.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate} from 'remotion';
import {SectionTitle} from '../../components/SectionTitle';
import {COLORS} from '../constants';
import {INTER} from '../../lib/fonts';

const APPS = [
  {name: 'SkillUp Football', tagline: 'Coach monetization', icon: '🎯', color: '#06b6d4'},
  {name: 'WC26', tagline: 'World Cup 2026 companion', icon: '⚽', color: '#22c55e'},
  {name: 'Lulla', tagline: 'Baby sleep + ML cry detection', icon: '🍼', color: '#8b5cf6'},
  {name: 'EasyChamp', tagline: 'Enterprise sports platform', icon: '🏆', color: '#ef4444'},
  {name: 'BizZone', tagline: 'Student & business events', icon: '🏢', color: '#3b82f6'},
  {name: 'Sketchmate', tagline: 'AI drawing game', icon: '🎨', color: '#f59e0b'},
  {name: 'JobWeave', tagline: 'AI job search platform', icon: '💼', color: '#d97706'},
  {name: 'Verified Skill', tagline: 'Skill registry & Studio', icon: '✅', color: '#10b981'},
  {name: 'SpecWeave', tagline: 'Spec-first AI layer', icon: '🔮', color: '#6b58b8'},
  {name: 'EduFeed', tagline: 'NotebookLM meets Zoom', icon: '📚', color: '#a855f7'},
];

export const APP_SHOWCASE_DURATION = 300;

export const AppShowcaseGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${COLORS.primary500}12, ${COLORS.bgDark} 70%)`,
        fontFamily: INTER,
        padding: '80px 100px',
      }}
    >
      {/* Title */}
      <div style={{marginBottom: 48}}>
        <SectionTitle text="10 Production Projects" fontSize={36} />
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          justifyContent: 'center',
        }}
      >
        {APPS.map((app, i) => {
          const delay = 20 + i * 15;
          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: {damping: 14, stiffness: 120},
          });
          const scale = interpolate(s, [0, 1], [0.5, 1]);
          const opacity = interpolate(s, [0, 1], [0, 1]);

          return (
            <div
              key={app.name}
              style={{
                width: 320,
                padding: '28px 24px',
                borderRadius: 16,
                backgroundColor: `${app.color}15`,
                border: `1px solid ${app.color}40`,
                opacity,
                transform: `scale(${scale})`,
                textAlign: 'center',
              }}
            >
              <div style={{fontSize: 48, marginBottom: 12}}>{app.icon}</div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: app.color,
                }}
              >
                {app.name}
              </div>
              <div
                style={{
                  fontSize: 18,
                  color: COLORS.textSecondary,
                  marginTop: 6,
                }}
              >
                {app.tagline}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
