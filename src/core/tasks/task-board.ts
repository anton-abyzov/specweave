/**
 * Task Board — tasks.md definitions + ledger.jsonl state, folded into one view.
 *
 * tasks.md holds task DEFINITIONS (`### T-01 Title` + `- AC: … | Files: … | Test: …`).
 * ledger.jsonl holds STATE (claim/done/release/block/skip events).
 * The board joins them: ledger wins; a task with no ledger events falls back to
 * its tasks.md checkbox/`**Status**` (legacy increments keep working).
 *
 * `renderTasksMd` writes the derived state back into tasks.md as
 * `- [x] done …` lines (one per task) + a `<!-- SW:BOARD -->` table, so the
 * file stays the human-readable view and legacy checkbox counters keep working.
 *
 * @module core/tasks/task-board
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseTasksWithUSLinks, getAllTasks, type Task } from '../../generators/spec/task-parser.js';
import { TASK_HEADER_RE } from './task-id.js';
import {
  foldLedgerFile,
  ledgerPath,
  type FoldOptions,
  type TaskLedgerState,
  type LedgerFold,
} from './ledger.js';

export interface BoardTask extends Task {
  state: TaskLedgerState;
  /** Where the state came from. */
  source: 'ledger' | 'tasks.md' | 'none';
}

export interface TaskBoard {
  incrementDir: string;
  tasks: BoardTask[];
  fold: LedgerFold;
  counts: { total: number; done: number; skipped: number; open: number; claimed: number; blocked: number; stale: number };
  /** Task headings in tasks.md the parser could not read (never silently dropped). */
  warnings: string[];
}

export const BOARD_BEGIN = '<!-- SW:BOARD -->';
export const BOARD_END = '<!-- /SW:BOARD -->';

/** Numeric part of a task id for ordering (`T-007` → 7, `T-007a` → 7). */
export function taskIdNum(id: string): number {
  const m = id.match(/T-(\d+)/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

/** Letter suffix of a task id, lowercased (`T-007a` → 'a', `T-007` → ''). */
export function taskIdSuffix(id: string): string {
  return (id.match(/T-\d+([A-Za-z])$/)?.[1] ?? '').toLowerCase();
}

/** Board order: by number, then by letter suffix (`T-001` < `T-001a` < `T-001b`). */
export function compareTaskIds(a: string, b: string): number {
  const byNum = taskIdNum(a) - taskIdNum(b);
  return byNum !== 0 ? byNum : taskIdSuffix(a).localeCompare(taskIdSuffix(b));
}

/**
 * Normalize a user-typed task id: `1`, `T1`, `t-01`, `t-1a` → the id in tasks.md.
 * Falls back to a case-insensitive exact match.
 */
export function normalizeTaskId(input: string, known: string[]): string | undefined {
  const typed = input.trim();
  const exact = known.find((k) => k.toUpperCase() === typed.toUpperCase());
  if (exact) return exact;
  const raw = typed.toUpperCase().replace(/^T-?/, '');
  const m = raw.match(/^(\d+)([A-Z]?)$/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  const suffix = m[2].toLowerCase();
  return known.find((k) => taskIdNum(k) === n && taskIdSuffix(k) === suffix) ?? undefined;
}

/** Load the board for an increment directory. */
export function loadTaskBoard(incrementDir: string, opts: FoldOptions = {}): TaskBoard {
  const tasksFile = path.join(incrementDir, 'tasks.md');
  const warnings: string[] = [];
  const defs = fs.existsSync(tasksFile)
    ? getAllTasks(parseTasksWithUSLinks(tasksFile, { onWarning: (w) => warnings.push(w) }))
    : [];
  defs.sort((a, b) => compareTaskIds(a.id, b.id));
  const fold = foldLedgerFile(ledgerPath(incrementDir), opts);

  const tasks: BoardTask[] = defs.map((t) => {
    const ledgerState = fold.tasks.get(t.id);
    if (ledgerState) return { ...t, state: ledgerState, source: 'ledger' };
    if (t.status === 'completed') {
      return { ...t, state: { status: 'done', by: 'tasks.md', evidence: 'checkbox in tasks.md' }, source: 'tasks.md' };
    }
    if (t.status === 'canceled') {
      return { ...t, state: { status: 'skipped', by: 'tasks.md', note: 'canceled in tasks.md' }, source: 'tasks.md' };
    }
    return { ...t, state: { status: 'open' }, source: 'none' };
  });

  const counts = { total: tasks.length, done: 0, skipped: 0, open: 0, claimed: 0, blocked: 0, stale: 0 };
  for (const t of tasks) {
    switch (t.state.status) {
      case 'done': counts.done++; break;
      case 'skipped': counts.skipped++; break;
      case 'claimed': counts.claimed++; break;
      case 'blocked': counts.blocked++; break;
      case 'stale': counts.stale++; break;
      default: counts.open++;
    }
  }
  return { incrementDir, tasks, fold, counts, warnings };
}

/** Files currently held by live claims (claimed or blocked, not stale). */
export function heldFiles(board: TaskBoard, exceptAgent?: string): Map<string, string> {
  const held = new Map<string, string>();
  for (const t of board.tasks) {
    if (t.state.status !== 'claimed' && t.state.status !== 'blocked') continue;
    if (exceptAgent && t.state.by === exceptAgent) continue;
    for (const f of t.filesAffected ?? []) held.set(normalizePath(f), t.id);
  }
  return held;
}

/** Task ids whose Files overlap with `task`'s Files among live claims of other agents. */
export function fileOverlaps(board: TaskBoard, task: BoardTask, agent?: string): string[] {
  const held = heldFiles(board, agent);
  const hits = new Set<string>();
  for (const f of task.filesAffected ?? []) {
    const owner = held.get(normalizePath(f));
    if (owner && owner !== task.id) hits.add(owner);
  }
  return [...hits];
}

/** Dependencies (legacy `**Dependencies**:`) not yet done/skipped. */
export function unmetDeps(board: TaskBoard, task: BoardTask): string[] {
  const byId = new Map(board.tasks.map((t) => [t.id, t]));
  return (task.dependencies ?? []).filter((d) => {
    const dep = byId.get(d);
    return dep && dep.state.status !== 'done' && dep.state.status !== 'skipped';
  });
}

/** First open task (T-id order) with all deps met and no Files overlap with live claims. */
export function nextTask(board: TaskBoard, agent?: string): BoardTask | undefined {
  return board.tasks.find(
    (t) =>
      (t.state.status === 'open' || t.state.status === 'stale') &&
      unmetDeps(board, t).length === 0 &&
      fileOverlaps(board, t, agent).length === 0,
  );
}

export function normalizePath(p: string): string {
  return p.trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

/** One-line rendered state for a task. */
export function stateLine(state: TaskLedgerState): string {
  const when = state.since ? ` ${state.since}` : '';
  switch (state.status) {
    case 'done': return `- [x] done by ${state.by}${when}${state.evidence ? ` — ${oneLine(state.evidence)}` : ''}`;
    case 'skipped': return `- [-] skipped by ${state.by}${when}${state.note ? ` — ${oneLine(state.note)}` : ''}`;
    case 'claimed': return `- [ ] claimed by ${state.by} since${when}`;
    case 'stale': return `- [ ] stale claim by ${state.by} since${when} (re-claimable)`;
    case 'blocked': return `- [ ] blocked by ${state.by}${when}${state.note ? ` — ${oneLine(state.note)}` : ''}`;
    default: return '- [ ] open';
  }
}

function oneLine(s: string, max = 120): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat;
}

/** Markdown table of the board (also embedded in tasks.md between the SW:BOARD markers). */
export function renderBoardTable(board: TaskBoard): string {
  const rows = board.tasks.map((t) => {
    const s = t.state;
    return `| ${t.id} | ${s.status} | ${s.by ?? ''} | ${cell(s.evidence)} | ${cell(s.note)} |`;
  });
  const c = board.counts;
  return [
    `| Task | State | By | Evidence | Note |`,
    `|---|---|---|---|---|`,
    ...rows,
    ``,
    `${c.done}/${c.total} done · ${c.skipped} skipped · ${c.claimed} claimed · ${c.blocked} blocked · ${c.stale} stale · ${c.open} open`,
  ].join('\n');
}

/** Table cell: single line, pipe-escaped, capped. */
function cell(value: string | undefined, max = 60): string {
  return oneLine((value ?? '').replace(/\|/g, '\\|'), max);
}

// Same grammar as the task parser — a mismatch here silently drops tasks from
// the rendered board while `task list` still shows them (or vice versa).
const HEADER_RE = TASK_HEADER_RE;
const FIELD_LINE_RE = /^-?\s*\*{0,2}(?:AC|Files|Test)\*{0,2}:/;
const STATE_LINE_RE = /^- \[([ x-])\](?:\s+(?:done|open|pending|claimed|stale|blocked|skipped)\b.*)?$/i;
const LEGACY_STATUS_RE = /\*\*Status\*\*:\s*\[ \]\s*\w*/;

/**
 * Rewrite tasks.md from the board: one derived state line per task (inserted
 * after the field line, or replaced in place), legacy `**Status**: [ ]`
 * flipped to `[x] completed` for done tasks, and the SW:BOARD table refreshed.
 * Idempotent. Returns the new content (caller writes it).
 */
export function renderTasksMd(content: string, board: TaskBoard): string {
  const byId = new Map(board.tasks.map((t) => [t.id, t]));
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const header = lines[i].match(HEADER_RE);
    if (!header) { out.push(lines[i]); i++; continue; }
    const task = byId.get(header[1]);
    out.push(lines[i]);
    i++;
    if (!task) continue;

    // Collect the block up to the next task header / top-level heading.
    const block: string[] = [];
    while (i < lines.length && !HEADER_RE.test(lines[i]) && !/^##?\s/.test(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    const isDone = task.state.status === 'done' || task.state.status === 'skipped';
    const rendered = stateLine(task.state);
    let replaced = false;
    const newBlock = block.map((l) => {
      if (STATE_LINE_RE.test(l)) {
        if (replaced) return null; // collapse duplicates
        replaced = true;
        return rendered;
      }
      if (isDone && LEGACY_STATUS_RE.test(l)) return l.replace(/\*\*Status\*\*:\s*\[ \]\s*\w*/, '**Status**: [x] completed');
      return l;
    }).filter((l): l is string => l !== null);

    if (!replaced) {
      // Insert after the leading field line(s) (2.0 format) or directly after the header.
      let insertAt = 0;
      while (insertAt < newBlock.length && FIELD_LINE_RE.test(newBlock[insertAt])) insertAt++;
      newBlock.splice(insertAt, 0, rendered);
    }
    out.push(...newBlock);
  }

  return upsertBoardBlock(out.join('\n'), board);
}

function upsertBoardBlock(content: string, board: TaskBoard): string {
  const block = `${BOARD_BEGIN}\n${renderBoardTable(board)}\n${BOARD_END}`;
  const start = content.indexOf(BOARD_BEGIN);
  const end = content.indexOf(BOARD_END);
  if (start !== -1 && end !== -1 && end > start) {
    return content.slice(0, start) + block + content.slice(end + BOARD_END.length);
  }
  // Insert after the first H1 (and its trailing blank line), else prepend.
  const lines = content.split('\n');
  const h1 = lines.findIndex((l) => /^#\s/.test(l));
  if (h1 === -1) return `${block}\n\n${content}`;
  lines.splice(h1 + 1, 0, '', block);
  return lines.join('\n');
}

/** Render + write tasks.md for an increment; no-op when tasks.md is absent. */
export function writeRenderedTasksMd(board: TaskBoard): boolean {
  const tasksFile = path.join(board.incrementDir, 'tasks.md');
  if (!fs.existsSync(tasksFile)) return false;
  const before = fs.readFileSync(tasksFile, 'utf-8');
  const after = renderTasksMd(before, board);
  if (after !== before) fs.writeFileSync(tasksFile, after, 'utf-8');
  return after !== before;
}
