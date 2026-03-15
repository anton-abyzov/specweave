/**
 * B-Roll #4: Animated Stats Counter
 * Rolling number tickers for key metrics.
 * Duration: ~10 seconds (300 frames @ 30fps)
 *
 * Used during "THE PROOF" section when narrating real metrics.
 * Each stat rolls up sequentially with a slight overlap.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {NumberTicker} from '../../components/NumberTicker';
import {SectionTitle} from '../../components/SectionTitle';
import {COLORS, STATS} from '../constants';
import {INTER} from '../../lib/fonts';

const METRIC_ROWS = [
  [
    {value: STATS.totalCommits, label: 'commits', suffix: '', startOffset: 0},
    {value: STATS.totalReleases, label: 'releases', suffix: '', startOffset: 20},
    {value: STATS.repos, label: 'repositories', suffix: '', startOffset: 40},
  ],
  [
    {value: 888, label: 'lines of TypeScript', suffix: 'K', startOffset: 70},
    {value: STATS.testFiles, label: 'test files', suffix: '', startOffset: 90},
    {value: STATS.sourceFiles, label: 'source files', suffix: '', startOffset: 110},
  ],
  [
    {value: STATS.plugins, label: 'plugins', suffix: '', startOffset: 140},
    {value: STATS.skills, label: 'skills', suffix: '', startOffset: 155},
    {value: STATS.hooks, label: 'hooks', suffix: '', startOffset: 170},
  ],
];

export const STATS_COUNTER_DURATION = 300;

export const StatsCounter: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Subtitle: "5 months. 1 developer."
  const subtitleOpacity = interpolate(frame, [200, 220], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const subtitleY = interpolate(frame, [200, 220], [20, 0], {
    extrapolateRight: 'clamp',
  });

  // "~4 releases per day" highlight
  const highlightOpacity = interpolate(frame, [240, 260], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const highlightScale = spring({
    frame: Math.max(0, frame - 240),
    fps,
    config: {damping: 12, stiffness: 100},
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${COLORS.primary500}18, ${COLORS.bgDark} 70%)`,
        fontFamily: INTER,
        padding: '60px 120px',
      }}
    >
      {/* Title */}
      <div style={{marginBottom: 48}}>
        <SectionTitle text="The Numbers" fontSize={36} />
      </div>

      {/* Metrics grid */}
      {METRIC_ROWS.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 120,
            marginBottom: 48,
          }}
        >
          {row.map((metric, colIdx) => (
            <NumberTicker
              key={colIdx}
              value={metric.value}
              label={metric.label}
              suffix={metric.suffix}
              startFrame={metric.startOffset}
              color={
                rowIdx === 0
                  ? COLORS.primary400
                  : rowIdx === 1
                    ? COLORS.success
                    : COLORS.accentCyan
              }
              fontSize={rowIdx === 0 ? 96 : 72}
              labelSize={rowIdx === 0 ? 28 : 24}
            />
          ))}
        </div>
      ))}

      {/* Bottom highlight: velocity */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 24,
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: COLORS.textSecondary,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          5 months &middot; 1 developer &middot; full-time job + family
        </div>

        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: COLORS.gold,
            marginTop: 24,
            opacity: highlightOpacity,
            transform: `scale(${highlightScale})`,
          }}
        >
          ~4 releases every single day
        </div>
      </div>
    </AbsoluteFill>
  );
};
