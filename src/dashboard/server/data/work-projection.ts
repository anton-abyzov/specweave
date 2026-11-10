import fs from 'node:fs';
import path from 'node:path';
import { loadDashboardTaskBoard } from './dashboard-task-board.js';
import { readLedger } from '../../../core/tasks/ledger.js';
import { deriveAcStatus, parseSpecAcs } from '../../../core/tasks/verify-runner.js';
import type { ExecutionSegment, WorkDetail, WorkItem, WorkState } from '../../work-types.js';

export function readText(file: string): string {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}
export function readJson(file: string): Record<string, any> {
  try {
    return JSON.parse(readText(file));
  } catch {
    return {};
  }
}
export function incrementDirectory(root: string, id: string): string | null {
  if (!/^\d{4,}[-\w]*$/.test(id)) return null;
  const base = path.join(root, '.specweave/increments');
  try {
    const names = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    const exact = names.find((name) => name === id);
    const candidates = exact ? [exact] : names.filter((name) => name.startsWith(`${id}-`));
    return candidates.length === 1 ? path.join(base, candidates[0]) : null;
  } catch {
    return null;
  }
}
function mtime(file: string): number {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}
export function projectIncrement(root: string, id: string): WorkItem | null {
  const dir = incrementDirectory(root, id);
  if (!dir) return null;
  const metadata = readJson(path.join(dir, 'metadata.json'));
  const spec = readText(path.join(dir, 'spec.md'));
  const board = loadDashboardTaskBoard(dir);
  const acs = deriveAcStatus(parseSpecAcs(spec), board);
  const reportPath = path.join(dir, 'reports/verify.json');
  const report = readJson(reportPath);
  const sourceTime = Math.max(
    ...['metadata.json', 'ledger.jsonl', 'tasks.md', 'spec.md'].map((f) => mtime(path.join(dir, f))),
  );
  const evidenceTime = Math.max(
    ...['ledger.jsonl', 'tasks.md', 'spec.md'].map((f) => mtime(path.join(dir, f))),
  );
  const status = String(metadata.status || 'planned');
  const terminal = board.counts.total > 0 && board.counts.done + board.counts.skipped === board.counts.total;
  let state: WorkState =
    status === 'completed'
      ? 'done'
      : status === 'paused'
        ? 'blocked'
        : ['active', 'in-progress'].includes(status)
          ? 'active'
          : 'backlog';
  let stateReason = `metadata.json status: ${status}`;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (status !== 'completed' && status !== 'abandoned') {
    if (board.counts.blocked > 0 || board.counts.stale > 0) {
      state = 'blocked';
      stateReason = [
        board.counts.blocked > 0 && plural(board.counts.blocked, 'blocked task'),
        board.counts.stale > 0 && plural(board.counts.stale, 'stale claim'),
      ]
        .filter(Boolean)
        .join(', ');
    } else if (terminal || status === 'ready_for_review') {
      state = 'review';
      stateReason = terminal ? 'Every task is done or skipped; not closed yet' : stateReason;
    } else if (board.counts.claimed > 0) {
      state = 'active';
      stateReason = plural(board.counts.claimed, 'claimed task');
    } else if (status === 'paused') stateReason = 'Paused';
  }
  const verification: WorkItem['verification'] = {
    status:
      typeof report.ok !== 'boolean'
        ? 'missing'
        : report.ok === false
          ? 'failed'
          : evidenceTime > mtime(reportPath) + 1
            ? 'stale'
            : 'passed',
    ranAt: typeof report.ranAt === 'string' ? report.ranAt : null,
  };
  const events = readLedger(path.join(dir, 'ledger.jsonl')).events.sort((a, b) => a.at.localeCompare(b.at));
  const executions: ExecutionSegment[] = [];
  for (const [index, event] of events.entries()) {
    const last = executions[executions.length - 1];
    if (last?.actor === event.by && (!event.model || last.model === event.model)) continue;
    if (last?.actor === event.by && !last.model) {
      last.model = event.model ?? null;
      continue;
    }
    const tool = event.by.split('@')[0];
    executions.push({
      id: `ledger-${index}`,
      sessionId: null,
      harness: ['codex', 'claude', 'opencode', 'cursor'].includes(tool)
        ? tool === 'claude'
          ? 'Claude Code'
          : tool
        : null,
      model: event.model ?? null,
      effort: null,
      provider: null,
      surface: null,
      actor: event.by,
      startedAt: event.at,
      source: 'ledger',
      note: `${event.e} ${event.t}`,
    });
  }
  const problem = spec.match(/^##\s+Problem[^\n]*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/m)?.[1] || '';
  const summary = problem.replace(/\s+/g, ' ').trim().slice(0, 400);
  return {
    id: `increment:${path.basename(dir)}`,
    title: metadata.title || spec.match(/^#\s+(.+)$/m)?.[1] || path.basename(dir),
    summary,
    state,
    incrementId: path.basename(dir),
    incrementStatus: status,
    source: 'increment',
    revision: 0,
    updatedAt: new Date(sourceTime || Date.now()).toISOString(),
    tasks: board.counts,
    acs: { total: acs.length, done: acs.filter((a) => a.done).length },
    verification,
    evidenceCount: board.tasks.filter(
      (t) => t.state.status === 'done' && t.source === 'ledger' && t.state.evidence,
    ).length,
    handoff: readText(path.join(dir, 'handoff.md')) || null,
    executions,
    type: typeof metadata.type === 'string' ? metadata.type : null,
    priority: typeof metadata.priority === 'string' ? metadata.priority : null,
    project: typeof metadata.project === 'string' ? metadata.project : null,
    createdAt: typeof metadata.created === 'string' ? metadata.created : typeof metadata.createdAt === 'string' ? metadata.createdAt : null,
    path: path.relative(root, dir).split(path.sep).join('/'),
    stateReason,
  };
}

/** The newest ledger events the detail panel receives; older ones stay in ledger.jsonl. */
const TIMELINE_LIMIT = 400;

/** The legacy detail route shares the exact ledger projection as the work board. */
export async function getIncrementDetail(root: string, id: string): Promise<WorkDetail | null> {
  const dir = incrementDirectory(root, id);
  const projected = projectIncrement(root, id);
  if (!dir || !projected) return null;
  const board = loadDashboardTaskBoard(dir);
  const spec = readText(path.join(dir, 'spec.md'));
  const acs = deriveAcStatus(parseSpecAcs(spec), board).map((a) => ({
    id: a.id,
    text: a.text,
    completed: a.done,
    via: a.via ?? null,
    tasks: a.tasks ?? [],
  }));
  const timeline = readLedger(path.join(dir, 'ledger.jsonl'))
    .events.sort((a, b) => a.at.localeCompare(b.at))
    .slice(-TIMELINE_LIMIT)
    .map((event) => ({
      at: event.at,
      task: event.t,
      event: event.e,
      by: event.by,
      model: event.model ?? null,
      text: event.evidence ?? event.note ?? event.line ?? event.reason ?? null,
      link: event.link ?? null,
    }));
  return {
    id,
    dirName: path.basename(dir),
    path: projected.path ?? '',
    metadata: readJson(path.join(dir, 'metadata.json')),
    tasks: board.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status:
        t.state.status === 'done' ? 'completed' : t.state.status === 'open' ? 'pending' : t.state.status,
      userStory: t.userStory,
      acs: t.satisfiesACs?.length ? t.satisfiesACs : t.acs,
      files: t.filesAffected,
      actor: t.state.by,
      since: t.state.since,
      evidence: t.state.evidence,
      note: t.state.note,
      source: t.source,
    })),
    taskSummary: {
      total: board.counts.total,
      completed: board.counts.done,
      skipped: board.counts.skipped,
      pending: board.counts.open + board.counts.stale,
      inProgress: board.counts.claimed,
      blocked: board.counts.blocked,
    },
    acs,
    acSummary: { total: acs.length, completed: acs.filter((a) => a.completed).length },
    verification: projected.verification,
    executions: projected.executions,
    timeline,
    handoff: projected.handoff,
    spec,
    verify: readJson(path.join(dir, 'reports/verify.json')),
    warnings: board.warnings,
  };
}
