/**
 * `specweave reopen`: correct a completed increment back to `planned`.
 *
 * For an increment closed too early (source shipped, release or scope still
 * open). It never activates: `specweave start` stays the separate step, so a
 * workspace at capacity can still record the correction. Every check runs
 * before anything is written, and a refusal changes nothing:
 *
 * 1. a reason (stored in the audit record);
 * 2. an explicit workspace (`--workspace` or `SPECWEAVE_WORKSPACE`), and the
 *    increment folder must really live inside it;
 * 3. status `completed`;
 * 4. no task claimed, stale or blocked by another agent. Ownership moves only
 *    through `specweave task release`, never through this command.
 *
 * The ledger, reports/ and the spec body are left as they are; the closure
 * moves into `metadata.reopened[]`.
 *
 * @module core/increment/reopen
 */

import * as fs from 'fs';
import * as path from 'path';
import { MetadataManager } from './metadata-manager.js';
import { DisciplineChecker } from './discipline-checker.js';
import {
  IncrementStatus,
  LEGACY_STATUS_MAP,
  countsTowardWipLimit,
  type ReopenRecord,
} from '../types/increment-metadata.js';
import { canonicalPath, isWithin } from '../workspace/context.js';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';
import { foldLedgerFile, getAgentId, ledgerPath, type TaskLedgerStatus } from '../tasks/ledger.js';
import { loadTaskBoard } from '../tasks/task-board.js';

export type ReopenRefusal =
  | 'no-reason'
  | 'no-workspace'
  | 'not-found'
  | 'outside-workspace'
  | 'not-completed'
  | 'foreign-owner';

export class ReopenRefused extends Error {
  constructor(readonly code: ReopenRefusal, message: string, readonly owners: UnfinishedTask[] = []) {
    super(message);
    this.name = 'ReopenRefused';
  }
}

export interface UnfinishedTask {
  task: string;
  status: TaskLedgerStatus;
  by?: string;
}

export interface ReopenResult {
  id: string;
  root: string;
  from: IncrementStatus;
  to: IncrementStatus.PLANNED;
  at: string;
  by: string;
  reason: string;
  /** The closure this reopen moved into `metadata.reopened[]`. */
  previous: Pick<ReopenRecord, 'approvedAt' | 'closeReason' | 'readyForReviewAt'>;
  unfinished: UnfinishedTask[];
  /** True when the increment was already reopened and nothing was written. */
  unchanged: boolean;
  /** Active increments in the workspace and the advisory limit (0 = off). */
  active: { count: number; limit: number };
}

export interface ReopenOptions {
  incrementId: string;
  reason?: string;
  /** Workspace root; defaults to SPECWEAVE_WORKSPACE (bin/specweave.js sets it from --workspace). */
  workspace?: string;
  env?: NodeJS.ProcessEnv;
  now?: Date;
}

const HELD: ReadonlySet<TaskLedgerStatus> = new Set(['claimed', 'stale', 'blocked']);

function readStatus(metadataFile: string): { status: string; raw: Record<string, any> } {
  const raw = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
  const status = typeof raw?.status === 'string' ? raw.status : '';
  return { status: LEGACY_STATUS_MAP[status.toLowerCase()] ?? status, raw };
}

function activeCount(root: string): number {
  const dir = path.join(root, '.specweave', 'increments');
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const { status } = readStatus(path.join(dir, entry.name, 'metadata.json'));
      if (countsTowardWipLimit(status as IncrementStatus)) count++;
    } catch { /* no or unreadable metadata: not active */ }
  }
  return count;
}

function activeLimit(root: string): number {
  try {
    return new DisciplineChecker(root).getLimits().activeIncrements;
  } catch {
    return 0;
  }
}

/** Every task not done or skipped: spec tasks first, then ledger-only ids. */
function unfinishedTasks(incrementDir: string): UnfinishedTask[] {
  const fold = foldLedgerFile(ledgerPath(incrementDir));
  const out: UnfinishedTask[] = [];
  const seen = new Set<string>();
  try {
    for (const t of loadTaskBoard(incrementDir).tasks) {
      seen.add(t.id);
      if (t.state.status !== 'done' && t.state.status !== 'skipped') out.push({ task: t.id, status: t.state.status, by: t.state.by });
    }
  } catch { /* unparsable tasks: the ledger alone still names the holders */ }
  for (const [task, state] of fold.tasks) {
    if (seen.has(task) || state.status === 'done' || state.status === 'skipped') continue;
    out.push({ task, status: state.status, by: state.by });
  }
  return out;
}

function workspaceRoot(selected: string | undefined): string {
  if (!selected?.trim()) {
    throw new ReopenRefused('no-workspace', 'Reopening rewrites a closed increment: name its workspace with --workspace <root>.');
  }
  let root: string;
  try {
    root = canonicalPath(selected);
  } catch {
    throw new ReopenRefused('not-found', `Workspace does not exist: ${selected}`);
  }
  if (!fs.existsSync(path.join(root, '.specweave', 'increments'))) {
    throw new ReopenRefused('not-found', `No .specweave/increments in workspace ${root}`);
  }
  return root;
}

export function reopenIncrement(opts: ReopenOptions): ReopenResult {
  const env = opts.env ?? process.env;
  const reason = opts.reason?.trim() ?? '';
  if (!reason) throw new ReopenRefused('no-reason', 'Say why with --reason "<text>"; it is kept in metadata.reopened.');

  const root = workspaceRoot(opts.workspace ?? env.SPECWEAVE_WORKSPACE);
  const resolved = resolveIncrementId(opts.incrementId, root);
  if (Array.isArray(resolved)) {
    throw new ReopenRefused('not-found', `"${opts.incrementId}" matches ${resolved.join(', ')} in ${root}; use the full id.`);
  }
  if (!resolved) throw new ReopenRefused('not-found', `No increment "${opts.incrementId}" in workspace ${root}.`);
  const id = resolved;
  const dir = path.join(root, '.specweave', 'increments', id);
  const metadataFile = path.join(dir, 'metadata.json');
  let realDir: string;
  let realMetadata: string;
  try {
    realDir = canonicalPath(dir);
    realMetadata = canonicalPath(metadataFile);
  } catch {
    throw new ReopenRefused('not-completed', `${id} has no metadata.json, so it was never completed.`);
  }
  if (!isWithin(root, realDir) || !isWithin(realDir, realMetadata)) {
    throw new ReopenRefused('outside-workspace', `${id} resolves outside workspace ${root} (${realMetadata}); reopen it from the workspace that owns it.`);
  }

  const { status, raw } = readStatus(realMetadata);
  const limit = activeLimit(root);
  if (status === IncrementStatus.PLANNED && Array.isArray(raw.reopened) && raw.reopened.length) {
    const last = raw.reopened[raw.reopened.length - 1] as ReopenRecord;
    return {
      id, root, from: IncrementStatus.COMPLETED, to: IncrementStatus.PLANNED, at: last.at, by: last.by, reason: last.reason,
      previous: { approvedAt: last.approvedAt, closeReason: last.closeReason, readyForReviewAt: last.readyForReviewAt },
      unfinished: unfinishedTasks(realDir), unchanged: true, active: { count: activeCount(root), limit },
    };
  }
  if (status !== IncrementStatus.COMPLETED) {
    const hint = status === IncrementStatus.ABANDONED ? ' An abandoned increment comes back with specweave resume.' : '';
    throw new ReopenRefused('not-completed', `${id} is ${status || 'unknown'}; only a completed increment can be reopened.${hint}`);
  }

  const by = getAgentId(env);
  const unfinished = unfinishedTasks(realDir);
  const foreign = unfinished.filter((t) => HELD.has(t.status) && t.by && t.by !== by);
  if (foreign.length) {
    throw new ReopenRefused(
      'foreign-owner',
      `${id} has tasks held by another agent: ${foreign.map((t) => `${t.task} ${t.status} by ${t.by}`).join(', ')}. ` +
        `Only that agent can reopen it (you are ${by}); ownership moves with specweave task release, not here.`,
      foreign,
    );
  }

  const at = (opts.now ?? new Date()).toISOString();
  MetadataManager.reopenToPlanned(id, { at, by, reason }, root);
  return {
    id, root, from: IncrementStatus.COMPLETED, to: IncrementStatus.PLANNED, at, by, reason,
    previous: {
      ...(raw.approvedAt ? { approvedAt: raw.approvedAt } : {}),
      ...(raw.closeReason ? { closeReason: raw.closeReason } : {}),
      ...(raw.readyForReviewAt ? { readyForReviewAt: raw.readyForReviewAt } : {}),
    },
    unfinished, unchanged: false, active: { count: activeCount(root), limit },
  };
}
