/**
 * B-Roll #2: Commit Activity Visualization
 * Animated GitHub-style contribution graph showing intensity over 5 months.
 * Duration: ~8 seconds (240 frames @ 30fps)
 *
 * Used as cutaway during face-cam Boris Cherny quote.
 * Shows the velocity visually — dense green squares filling up.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {SectionTitle} from '../../components/SectionTitle';
import {COLORS} from '../constants';
import {INTER, JETBRAINS_MONO} from '../../lib/fonts';

// Generate ~22 weeks of commit data (Oct 25 → Mar 15)
const WEEKS = 21;
const DAYS_PER_WEEK = 7;

// Simulated commit intensity per day (0-4 levels, weighted toward high activity)
const generateGrid = (): number[][] => {
  const grid: number[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const week: number[] = [];
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      // Higher activity in later weeks, weekdays more active
      const weekWeight = 0.3 + (w / WEEKS) * 0.7;
      const dayWeight = d >= 1 && d <= 5 ? 1.0 : 0.5;
      const rand = Math.random() * weekWeight * dayWeight;
      week.push(rand < 0.1 ? 0 : rand < 0.3 ? 1 : rand < 0.55 ? 2 : rand < 0.8 ? 3 : 4);
    }
    grid.push(week);
  }
  return grid;
};

// Stable grid (seeded via module scope)
const GRID = generateGrid();

const LEVEL_COLORS = [
  '#161b22', // 0: none
  '#0e4429', // 1: low
  '#006d32', // 2: medium
  '#26a641', // 3: high
  '#39d353', // 4: very high
];

const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export const COMMIT_TIMELAPSE_DURATION = 240;

export const CommitTimelapse: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const CELL_SIZE = 48;
  const GAP = 6;

  // Reveal progress: cells fill in left to right
  const revealProgress = interpolate(frame, [20, 160], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const totalCells = WEEKS * DAYS_PER_WEEK;
  const visibleCells = Math.floor(revealProgress * totalCells);

  // Counter animation
  const commitCount = Math.round(
    interpolate(frame, [20, 180], [0, 3913], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // Label fade in
  const labelOpacity = interpolate(frame, [180, 200], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgDark,
        fontFamily: INTER,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Title */}
      <div style={{marginBottom: 32}}>
        <SectionTitle text="Contribution Activity — Oct 2025 to Mar 2026" />
      </div>

      {/* Contribution grid */}
      <div style={{display: 'flex', gap: GAP}}>
        {GRID.map((week, wIdx) => (
          <div key={wIdx} style={{display: 'flex', flexDirection: 'column', gap: GAP}}>
            {week.map((level, dIdx) => {
              const cellIndex = wIdx * DAYS_PER_WEEK + dIdx;
              const isVisible = cellIndex < visibleCells;

              return (
                <div
                  key={dIdx}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    borderRadius: 8,
                    backgroundColor: isVisible ? LEVEL_COLORS[level] : LEVEL_COLORS[0],
                    transition: 'background-color 0.1s',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Month labels */}
      <div
        style={{
          display: 'flex',
          width: WEEKS * (CELL_SIZE + GAP),
          marginTop: 12,
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        {MONTHS.map((m) => (
          <span key={m} style={{fontSize: 20, color: COLORS.textSecondary}}>
            {m}
          </span>
        ))}
      </div>

      {/* Commit counter */}
      <div
        style={{
          marginTop: 48,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 900,
            fontFamily: JETBRAINS_MONO,
            color: '#39d353',
          }}
        >
          {commitCount.toLocaleString('en-US')}
        </span>
        <span
          style={{
            fontSize: 32,
            color: COLORS.textSecondary,
            marginLeft: 16,
            opacity: labelOpacity,
          }}
        >
          commits across 4 repos
        </span>
      </div>
    </AbsoluteFill>
  );
};
