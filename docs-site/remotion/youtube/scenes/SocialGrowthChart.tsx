/**
 * B-Roll #7: Social Growth Chart
 * Animated line chart showing follower/view growth over time.
 * Duration: ~8 seconds (240 frames @ 30fps)
 *
 * Used during "THE PROOF" section on social media metrics.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {SectionTitle} from '../../components/SectionTitle';
import {COLORS} from '../constants';
import {INTER, JETBRAINS_MONO} from '../../lib/fonts';

const CHART_WIDTH = 1200;
const CHART_HEIGHT = 500;
const PADDING = {top: 40, right: 60, bottom: 60, left: 80};
const INNER_W = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

// Data points over ~30 days
const VIEWS_DATA = [0, 2100, 5400, 9200, 15000, 22000, 31000, 42000, 55000, 68000, 82000, 95000, 108000, 121000, 130000, 138000, 145000, 150000, 155000, 159000, 162000, 165000, 166500, 167500, 168200, 168800, 169000];
const FOLLOWERS_DATA = [40, 45, 52, 58, 68, 78, 90, 102, 112, 122, 132, 142, 150, 158, 163, 168, 172, 176, 180, 183, 186, 188, 190, 191, 192, 193, 194];

const MAX_VIEWS = 180000;
const MAX_FOLLOWERS = 200;

export const SOCIAL_GROWTH_DURATION = 270;

const toPath = (data: number[], maxVal: number, progress: number): string => {
  const visiblePoints = Math.ceil(data.length * progress);
  const points = data.slice(0, visiblePoints);
  return points
    .map((val, i) => {
      const x = PADDING.left + (i / (data.length - 1)) * INNER_W;
      const y = PADDING.top + INNER_H - (val / maxVal) * INNER_H;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

export const SocialGrowthChart: React.FC = () => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [20, 200], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Stat callouts
  const calloutOpacity = interpolate(frame, [210, 230], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bgDark,
        fontFamily: INTER,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 100px',
      }}
    >
      {/* Title */}
      <div style={{marginBottom: 32}}>
        <SectionTitle text="Organic Growth — 30 Days, Zero Ad Spend" />
      </div>

      {/* SVG Chart */}
      <svg width={CHART_WIDTH} height={CHART_HEIGHT} style={{overflow: 'visible'}}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={PADDING.left}
            x2={PADDING.left + INNER_W}
            y1={PADDING.top + INNER_H * (1 - ratio)}
            y2={PADDING.top + INNER_H * (1 - ratio)}
            stroke="#ffffff10"
            strokeWidth={1}
          />
        ))}

        {/* Views line (primary) */}
        <path
          d={toPath(VIEWS_DATA, MAX_VIEWS, progress)}
          fill="none"
          stroke={COLORS.primary400}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Followers line (secondary, scaled) */}
        <path
          d={toPath(FOLLOWERS_DATA, MAX_FOLLOWERS, progress)}
          fill="none"
          stroke={COLORS.success}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 4"
        />

        {/* Axes */}
        <line
          x1={PADDING.left}
          x2={PADDING.left + INNER_W}
          y1={PADDING.top + INNER_H}
          y2={PADDING.top + INNER_H}
          stroke="#ffffff30"
          strokeWidth={1}
        />
        <line
          x1={PADDING.left}
          x2={PADDING.left}
          y1={PADDING.top}
          y2={PADDING.top + INNER_H}
          stroke="#ffffff30"
          strokeWidth={1}
        />
      </svg>

      {/* Legend & Stats */}
      <div
        style={{
          display: 'flex',
          gap: 80,
          marginTop: 40,
          opacity: calloutOpacity,
        }}
      >
        <div style={{textAlign: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
            <div style={{width: 32, height: 4, backgroundColor: COLORS.primary400, borderRadius: 2}} />
            <span style={{fontSize: 18, color: COLORS.textSecondary}}>Threads Views</span>
          </div>
          <div style={{fontSize: 48, fontWeight: 900, color: COLORS.primary400, fontFamily: JETBRAINS_MONO}}>
            169K
          </div>
        </div>

        <div style={{textAlign: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
            <div style={{width: 32, height: 4, backgroundColor: COLORS.success, borderRadius: 2}} />
            <span style={{fontSize: 18, color: COLORS.textSecondary}}>Threads Followers</span>
          </div>
          <div style={{fontSize: 48, fontWeight: 900, color: COLORS.success, fontFamily: JETBRAINS_MONO}}>
            194
          </div>
        </div>

        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: 18, color: COLORS.textSecondary, marginBottom: 8}}>X Impressions</div>
          <div style={{fontSize: 48, fontWeight: 900, color: COLORS.accentCyan, fontFamily: JETBRAINS_MONO}}>
            35.5K
          </div>
        </div>

        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: 18, color: COLORS.textSecondary, marginBottom: 8}}>Interactions</div>
          <div style={{fontSize: 48, fontWeight: 900, color: COLORS.gold, fontFamily: JETBRAINS_MONO}}>
            12.4K
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
