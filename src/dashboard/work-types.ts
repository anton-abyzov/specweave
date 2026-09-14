/** Public dashboard contract. Unknown execution facts stay null. */
export const WORK_STATES = ['backlog', 'active', 'blocked', 'review', 'done'] as const;
export type WorkState = (typeof WORK_STATES)[number];
export interface ExecutionSegment {
  id: string;
  sessionId: string | null;
  harness: string | null;
  model: string | null;
  effort: string | null;
  provider: string | null;
  surface: string | null;
  actor: string;
  startedAt: string;
  source: 'ledger' | 'declared' | 'session';
  note: string;
}
export interface WorkIntent {
  id: string;
  title: string;
  summary: string;
  state: WorkState;
  incrementId: string | null;
  updatedAt: string;
  revision: number;
  executions: ExecutionSegment[];
  sessionRefs?: string[];
}
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
}
export interface WorkBoardPayload {
  items: WorkItem[];
  counts: Record<WorkState, number>;
  totals: { tasks: number; done: number; verified: number; handoffs: number };
  generatedAt: string;
  warnings: string[];
}
