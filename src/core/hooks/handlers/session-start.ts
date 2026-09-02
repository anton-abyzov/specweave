/**
 * SessionStart hook handler — the single context-injection point.
 *
 * Emits one `additionalContext` string: the active increment (id + title),
 * the next claimable task (from the shared tasks.md + ledger.jsonl fold) and
 * the latest handoff pointer. No banner, no doctor, no network — a few small
 * file reads, well under 300 ms. Returns `{}` when there is nothing to say.
 *
 * Side effects: clears auto-mode session files older than 24 h so a crashed
 * `/sw:auto` run cannot trap the next session, resets per-session pressure
 * alerts, and purges junk state at most once per 24 h.
 *
 * @module core/hooks/handlers/session-start
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn } from './types.js';
import { pass, sessionContext } from './types.js';
import { readActiveIncrements, readJsonSafe } from './utils.js';
import { isGcDue, purgeState, formatBytes } from '../../state/state-gc.js';
import { loadTaskBoard, nextTask } from '../../tasks/task-board.js';

const STALE_AUTO_MS = 24 * 60 * 60 * 1000;
const MAX_INCREMENTS_LISTED = 3;

function safeRemove(p: string): void {
  try { fs.unlinkSync(p); } catch { /* absent */ }
}

function clearStaleAutoSession(stateDir: string): void {
  const autoFile = path.join(stateDir, 'auto-mode.json');
  try {
    if (Date.now() - fs.statSync(autoFile).mtimeMs <= STALE_AUTO_MS) return;
  } catch {
    return;
  }
  safeRemove(autoFile);
  safeRemove(path.join(stateDir, '.stop-auto-turns'));
}

/** Silent purge of known junk state, at most once per 24 h. Best-effort. */
function runStateGc(stateDir: string, logsDir: string, timestamp: string): void {
  try {
    if (!isGcDue(stateDir)) return;
    const gc = purgeState(stateDir, { apply: true });
    if (gc.deleted.length === 0) return;
    fs.mkdirSync(logsDir, { recursive: true });
    fs.appendFileSync(
      path.join(logsDir, 'session.log'),
      `[${timestamp}] SessionStart: gc removed ${gc.deleted.length} state entries (${formatBytes(gc.bytes)})\n`,
    );
  } catch {
    // GC is best-effort — never fail the hook
  }
}

function readText(p: string): string {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

/** Title: metadata.title → spec.md frontmatter `title:` → first `# ` heading. */
function readTitle(incDir: string): string {
  const meta = readJsonSafe<{ title?: string }>(path.join(incDir, 'metadata.json'));
  if (meta?.title && typeof meta.title === 'string') return meta.title.trim();
  const spec = readText(path.join(incDir, 'spec.md'));
  const fm = spec.match(/^---[\s\S]*?\ntitle:\s*["']?(.+?)["']?\s*\n[\s\S]*?---/);
  if (fm) return fm[1].trim();
  const h1 = spec.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].replace(/^(Increment|Spec(ification)?)\s*:\s*/i, '').trim() : '';
}

/**
 * Task summary for an increment, from the SAME fold every other 2.0 counter
 * uses (`specweave task list`, verify.json, the closure gate): ledger state per
 * task, falling back to the tasks.md checkbox for tasks with no ledger events.
 *
 * Hand-rolling this here was a bug: an all-or-nothing `ledger.jsonl exists?`
 * switch made every legacy `**Status**: [x] completed` task read as pending the
 * moment one ledger line was appended, and it ignored `skip` (terminal) events.
 */
function taskSummary(incDir: string): { pending: number; total: number; next: string } | null {
  if (!fs.existsSync(path.join(incDir, 'tasks.md'))) return null;
  let board;
  try {
    board = loadTaskBoard(incDir);
  } catch {
    return null; // unparseable tasks.md — say nothing rather than lie
  }
  if (board.counts.total === 0) return null;
  const pending = Math.max(0, board.counts.total - board.counts.done - board.counts.skipped);
  const next = nextTask(board);
  return {
    pending,
    total: board.counts.total,
    next: next ? `${next.id}${next.title ? ' ' + next.title : ''}` : '',
  };
}

function ageLabel(mtimeMs: number): string {
  const min = Math.max(0, Math.round((Date.now() - mtimeMs) / 60000));
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function handoffPointer(projectRoot: string, incDirs: string[]): string {
  const candidates = [
    ...incDirs.map((d) => path.join(d, 'handoff.md')),
    path.join(projectRoot, '.specweave', 'state', 'handoff-latest.md'),
  ];
  let best: { p: string; mtime: number } | null = null;
  for (const p of candidates) {
    try {
      const mtime = fs.statSync(p).mtimeMs;
      if (!best || mtime > best.mtime) best = { p, mtime };
    } catch { /* absent */ }
  }
  if (!best) return '';
  return `Last handoff: ${path.relative(projectRoot, best.p).replace(/\\/g, '/')} (${ageLabel(best.mtime)})`;
}

export const handle: HandlerFn = async (_input, context) => {
  const { projectRoot, stateDir, logsDir, timestamp } = context;
  clearStaleAutoSession(stateDir);
  runStateGc(stateDir, logsDir, timestamp);
  // A pressure/health alert belongs to the session that raised it.
  safeRemove(path.join(stateDir, 'context-pressure.json'));
  safeRemove(path.join(stateDir, 'prompt-health-alert.json'));

  const ids = readActiveIncrements(projectRoot);
  const incDirs = ids.map((id) => path.join(projectRoot, '.specweave', 'increments', id));
  const lines: string[] = [];

  ids.slice(0, MAX_INCREMENTS_LISTED).forEach((id, i) => {
    const title = readTitle(incDirs[i]);
    const tasks = taskSummary(incDirs[i]);
    let line = `Active increment: ${id}${title ? ` — ${title}` : ''}`;
    if (tasks) {
      if (tasks.pending === 0) {
        line += ` (all ${tasks.total} tasks done — run /sw:done ${id})`;
      } else {
        line += ` (${tasks.pending}/${tasks.total} tasks pending${tasks.next ? `; next: ${tasks.next}` : ''})`;
      }
    }
    line += `. Spec: .specweave/increments/${id}/spec.md`;
    lines.push(line);
  });
  if (ids.length > MAX_INCREMENTS_LISTED) lines.push(`(+${ids.length - MAX_INCREMENTS_LISTED} more active increments)`);

  const handoff = handoffPointer(projectRoot, incDirs);
  if (handoff) lines.push(handoff);

  if (lines.length === 0) return pass();
  return sessionContext(`SpecWeave: ${lines.join('\n')}`);
};
