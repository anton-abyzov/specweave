/** Portable intent contract. Unknown execution facts stay null. */
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
