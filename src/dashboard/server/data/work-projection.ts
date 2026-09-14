import fs from 'node:fs';
import path from 'node:path';
import { loadTaskBoard } from '../../../core/tasks/task-board.js';
import { readLedger } from '../../../core/tasks/ledger.js';
import { parseSpecAcs } from '../../../core/tasks/verify-runner.js';
import type { ExecutionSegment, WorkItem, WorkState } from '../../work-types.js';

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
  const board = loadTaskBoard(dir);
  const acs = parseSpecAcs(spec);
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
  if (status !== 'completed' && status !== 'abandoned') {
    if (board.counts.blocked > 0 || board.counts.stale > 0) state = 'blocked';
    else if (terminal || status === 'ready_for_review') state = 'review';
    else if (board.counts.claimed > 0) state = 'active';
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
    if (executions[executions.length - 1]?.actor === event.by) continue;
    const tool = event.by.split('@')[0];
    executions.push({
      id: `ledger-${index}`,
      sessionId: null,
      harness: ['codex', 'claude', 'opencode', 'cursor'].includes(tool)
        ? tool === 'claude'
          ? 'Claude Code'
          : tool
        : null,
      model: null,
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
  };
}

/** The legacy detail route shares the exact ledger projection as the work board. */
export async function getIncrementDetail(root: string, id: string): Promise<Record<string, unknown> | null> {
  const dir = incrementDirectory(root, id);
  const projected = projectIncrement(root, id);
  if (!dir || !projected) return null;
  const board = loadTaskBoard(dir);
  const acs = parseSpecAcs(readText(path.join(dir, 'spec.md'))).map((a) => ({
    id: a.id,
    text: a.text,
    completed: a.done,
  }));
  return {
    id,
    dirName: path.basename(dir),
    metadata: readJson(path.join(dir, 'metadata.json')),
    tasks: board.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status:
        t.state.status === 'done' ? 'completed' : t.state.status === 'open' ? 'pending' : t.state.status,
      userStory: t.userStory,
      acs: t.satisfiesACs,
      actor: t.state.by,
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
    handoff: projected.handoff,
    spec: readText(path.join(dir, 'spec.md')),
    verify: readJson(path.join(dir, 'reports/verify.json')),
    warnings: board.warnings,
  };
}
