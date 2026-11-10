/** Small visual parts of the work board: bars, ring, pills, icons and the drawn artwork. */
import { useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { WorkItem, WorkState } from '../../../../work-types';
import { itemTools, percent, toolName } from './board-model';

export const STATE_LABEL: Record<WorkState, string> = {
  backlog: 'Backlog',
  active: 'In progress',
  blocked: 'Blocked',
  review: 'Review',
  done: 'Done',
};
export const SPRING = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const;

export function StateIcon({ state, size = 14 }: { state: WorkState; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true } as const;
  const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  if (state === 'backlog')
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6" {...stroke} strokeDasharray="2.4 2.6" />
      </svg>
    );
  if (state === 'active')
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6" {...stroke} />
        <path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" />
      </svg>
    );
  if (state === 'blocked')
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6" {...stroke} />
        <path d="M5 8h6" {...stroke} strokeWidth={2} />
      </svg>
    );
  if (state === 'review')
    return (
      <svg {...common}>
        <circle cx="7" cy="7" r="4.5" {...stroke} />
        <path d="M10.5 10.5 14 14" {...stroke} />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="m4.8 8.2 2.2 2.2 4.2-4.6" stroke="var(--sw-brand-card)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatePill({ state }: { state: WorkState }) {
  return (
    <span className={`wb-pill wb-tone-${state}`}>
      <StateIcon state={state} size={12} />
      {STATE_LABEL[state]}
    </span>
  );
}

/** A filled bar that springs to its value. `tone` is a state or `success`. */
export function ProgressBar({
  value,
  max,
  label,
  tone = 'success',
  size = 'md',
}: {
  value: number;
  max: number;
  label: string;
  tone?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const share = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div
      className={`wb-bar wb-bar-${size} wb-tone-${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <motion.div
        className="wb-bar-fill"
        initial={{ width: 0 }}
        animate={{ width: `${share * 100}%` }}
        transition={SPRING}
      />
    </div>
  );
}

export interface Segment {
  key: string;
  value: number;
  tone: string;
  label: string;
}
/** One bar split by share, for task states and the board's state mix. */
export function SegmentBar({ segments, label, size = 'md' }: { segments: Segment[]; label: string; size?: 'md' | 'lg' }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className={`wb-segments wb-bar-${size}`} role="img" aria-label={label}>
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <motion.span
            key={s.key}
            className={`wb-tone-${s.tone}`}
            title={`${s.label}: ${s.value}`}
            initial={{ flexGrow: 0 }}
            animate={{ flexGrow: total ? s.value / total : 0 }}
            transition={SPRING}
          />
        ))}
    </div>
  );
}

export function Ring({ value, size = 84, stroke = 8, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const share = Math.min(1, Math.max(0, value));
  return (
    <div className="wb-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--sw-brand-line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--sw-brand-success)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: length }}
          animate={{ strokeDashoffset: length * (1 - share) }}
          transition={{ ...SPRING, stiffness: 120 }}
        />
      </svg>
      <div className="wb-ring-label">{children}</div>
    </div>
  );
}

/** A number that counts to its value; with reduced motion it is simply the value. */
export function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const target = useMotionValue(reduce ? value : 0);
  const spring = useSpring(target, { stiffness: 110, damping: 24 });
  const text = useTransform(spring, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    target.set(value);
  }, [target, value]);
  if (reduce) return <span>{value.toLocaleString()}</span>;
  return <motion.span>{text}</motion.span>;
}

export function ToolAvatar({ tool }: { tool: string }) {
  return (
    <span className={`wb-avatar wb-tool-${tool.replace(/[^a-z]/g, '') || 'unknown'}`} title={toolName(tool)}>
      {toolName(tool).charAt(0)}
    </span>
  );
}
export function ToolAvatars({ item, max = 3 }: { item: WorkItem; max?: number }) {
  const tools = itemTools(item);
  if (!tools.length) return null;
  return (
    <span className="wb-avatars" aria-label={`Worked on by ${tools.map(toolName).join(', ')}`}>
      {tools.slice(0, max).map((tool) => (
        <ToolAvatar key={tool} tool={tool} />
      ))}
      {tools.length > max && <span className="wb-avatar wb-avatar-more">+{tools.length - max}</span>}
    </span>
  );
}

const VERIFY: Record<WorkItem['verification']['status'], [string, string]> = {
  passed: ['Verified', 'M3.5 8.3 6.6 11.4 12.6 4.8'],
  failed: ['Check failed', 'M4.5 4.5l7 7M11.5 4.5l-7 7'],
  stale: ['Recheck needed', 'M12.5 8a4.5 4.5 0 1 1-1.4-3.2M12.6 3v2.4h-2.4'],
  missing: ['Not verified', ''],
};
export function VerifyPill({ item }: { item: Pick<WorkItem, 'verification' | 'incrementId'> }) {
  const status = item.verification.status;
  const [label, path] = VERIFY[status];
  return (
    <span className={`wb-verify wb-verify-${status}`}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {path ? (
          <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.6" />
        )}
      </svg>
      {status === 'missing' && !item.incrementId ? 'No increment' : label}
    </span>
  );
}

export function PercentLabel({ value }: { value: number }) {
  return <span className="wb-percent">{percent(value)}%</span>;
}

/** Warp and weft threads behind the page title. Drawn, so it follows the theme and stays sharp. */
export function WeaveArt() {
  const warp = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg className="wb-weave" viewBox="0 0 560 150" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="wb-weave-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--sw-brand-paper)" stopOpacity="1" />
          <stop offset="0.45" stopColor="var(--sw-brand-paper)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {warp.map((i) => (
        <path
          key={`a${i}`}
          className={`wb-thread wb-thread-${i % 3}`}
          d={`M-20 ${18 + i * 19} C 120 ${-12 + i * 19}, 200 ${52 + i * 19}, 300 ${18 + i * 19} S 480 ${-10 + i * 19}, 600 ${24 + i * 19}`}
        />
      ))}
      {warp.slice(0, 5).map((i) => (
        <path
          key={`b${i}`}
          className={`wb-thread wb-thread-weft wb-thread-${(i + 1) % 3}`}
          d={`M${150 + i * 84} -10 C ${132 + i * 84} 40, ${172 + i * 84} 100, ${150 + i * 84} 160`}
        />
      ))}
      <rect width="560" height="150" fill="url(#wb-weave-fade)" />
    </svg>
  );
}

/** An empty loom frame for columns and searches with nothing in them. */
export function EmptyArt() {
  return (
    <svg className="wb-empty-art" width="72" height="56" viewBox="0 0 72 56" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="60" height="44" rx="6" stroke="var(--sw-brand-line-strong)" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d="M18 6v44M30 6v44M42 6v44M54 6v44" stroke="var(--sw-brand-line)" strokeWidth="1.5" />
      <path d="M6 20c8-5 16 5 24 0s16 5 24 0 8 2 12 0" stroke="var(--sw-brand-accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <path d="M6 34c8 5 16-5 24 0s16-5 24 0 8-2 12 0" stroke="var(--sw-brand-success)" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
