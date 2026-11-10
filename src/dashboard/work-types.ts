/** Dashboard projections extend the portable core intent contract. */
export * from '../core/intent/types.js';
import type { WorkIntent, WorkState } from '../core/intent/types.js';
export interface WorkItem extends WorkIntent {
  source: 'increment' | 'intent';
  incrementStatus: string | null;
  tasks: {
    total: number;
    done: number;
    skipped: number;
    claimed: number;
    blocked: number;
    stale: number;
    open: number;
  };
  acs: { total: number; done: number };
  verification: { status: 'passed' | 'failed' | 'stale' | 'missing'; ranAt: string | null };
  evidenceCount: number;
  handoff: string | null;
  /** metadata.json facts for filters; null on an intent with no increment. */
  type: string | null;
  priority: string | null;
  project: string | null;
  createdAt: string | null;
  /** Increment folder relative to the project root. */
  path: string | null;
  /** Why the item is in its column, in words a reader can check against the files. */
  stateReason: string;
}
/** One ledger event on the detail panel's timeline. */
export interface WorkTimelineEvent {
  at: string;
  task: string;
  event: string;
  by: string;
  model: string | null;
  text: string | null;
  link: string | null;
}
export interface WorkDetailTask {
  id: string;
  title: string;
  status: string;
  userStory?: string;
  acs?: string[];
  files?: string[];
  actor?: string;
  since?: string;
  evidence?: string;
  note?: string;
  source: string;
}
export interface WorkDetailAc {
  id: string;
  text: string;
  completed: boolean;
  via: string | null;
  tasks: Array<{ id: string; status: string }>;
}
/** `GET /api/increments/:id`: everything the detail panel shows, read from the increment folder. */
export interface WorkDetail {
  id: string;
  dirName: string;
  path: string;
  metadata: Record<string, unknown>;
  tasks: WorkDetailTask[];
  taskSummary: { total: number; completed: number; skipped: number; pending: number; inProgress: number; blocked: number };
  acs: WorkDetailAc[];
  acSummary: { total: number; completed: number };
  verification: WorkItem['verification'];
  executions: WorkItem['executions'];
  timeline: WorkTimelineEvent[];
  handoff: string | null;
  spec: string;
  verify: Record<string, unknown>;
  warnings: string[];
}
export interface WorkBoardPayload {
  items: WorkItem[];
  counts: Record<WorkState, number>;
  totals: { tasks: number; done: number; verified: number; handoffs: number };
  generatedAt: string;
  warnings: string[];
}

/** One increment on the Timeline page (`GET /api/plan`). */
export interface PlanRow {
  incrementId: string;
  title: string;
  status: string;
  state: WorkState;
  /** Created, or the first ledger event when earlier. */
  start: string;
  /** Last ledger event or metadata update; null while nothing happened. */
  end: string | null;
  tasks: { total: number; done: number; skipped: number; open: number; claimed: number; blocked: number };
  acs: { total: number; done: number };
  tools: string[];
  models: string[];
  /** Most tasks were closed with no live claim-to-done span: the plan was written after the work. */
  recordedAfter: boolean;
  /** Open work only: remaining weight, minutes at the p50 and p80 rates and finish times, uninterrupted from now. */
  remaining: { tasks: number; weight: number; p50Minutes: number; p80Minutes: number; finishP50: string; finishP80: string } | null;
  lastEvent: { at: string; e: string; t: string; by: string } | null;
  specPath: string;
}
export interface PlanActivity {
  at: string;
  incrementId: string;
  title: string;
  task: string;
  event: string;
  by: string;
  tool: string;
  model: string | null;
  note: string | null;
}
export interface PlanRate {
  key: string;
  samples: number;
  /** Minutes per weight unit of task work. */
  p50: number;
  p80: number;
}
export interface PlanTimelinePayload {
  generatedAt: string;
  rows: PlanRow[];
  activity: PlanActivity[];
  /** Every done or skipped task of the last 30 days, oldest first (throughput is computed from the filtered set). */
  closes: Array<{ at: string; incrementId: string; tool: string }>;
  rates: { overall: PlanRate; byTool: PlanRate[]; byModel: PlanRate[]; fallback: boolean };
  /** Median agents finishing tasks per active day over the last week (at least 1): parallel lanes for the forecast. */
  lanes: number;
  smallFixes: number;
}
