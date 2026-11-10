/** Small visual parts of the work board: bars, ring, pills, icons and the drawn artwork. */
import { useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { WorkItem, WorkState } from '../../../../work-types';
import { itemTools, percent, toolName } from './board-model';
import weaveUrl from '../../assets/work-board-weave.webp';
import emptyUrl from '../../assets/work-board-empty.webp';

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
          strokeOpacity={share > 0 ? 1 : 0}
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
  const spring = useSpring(target, { stiffness: 190, damping: 28 });
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

/** Woven threads behind the page title: a generated plate (see assets/README.md), blended into the paper. */
export function WeaveArt() {
  return <div className="wb-weave" style={{ backgroundImage: `url(${weaveUrl})` }} aria-hidden="true" />;
}

/** The empty loom shown when no work matches the filters. */
export function EmptyLoom() {
  return <img className="wb-empty-loom" src={emptyUrl} width={168} height={168} alt="" />;
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
