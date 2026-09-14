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
}
export interface WorkBoardPayload {
  items: WorkItem[];
  counts: Record<WorkState, number>;
  totals: { tasks: number; done: number; verified: number; handoffs: number };
  generatedAt: string;
  warnings: string[];
}
