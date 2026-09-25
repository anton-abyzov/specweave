/**
 * Pickup: everything a fresh session needs to continue, in one read.
 *
 * `specweave pickup` prints the full form (the next task with its acceptance
 * criteria, claims held by others, branch and upstream state, the last
 * handoff, recent notes and the memory index). The SessionStart hook prints
 * the compact form, which skips Git so the hook stays fast.
 *
 * Read-only: nothing here writes the ledger or any file. A session is recorded
 * when it claims a task, not when it looks.
 *
 * @module core/session/pickup
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getAgentId, ledgerPath, readIncrementEvents, type LedgerEvent } from '../tasks/ledger.js';
import { loadTaskBoard, nextTask, type TaskBoard } from '../tasks/task-board.js';
import { hasTasksFile } from '../tasks/tasks-source.js';
import { incrementsDir, listActiveIncrementIds, listStartableIncrementIds, readLeaseHours } from '../tasks/resolve-increment.js';
import { readSpecAcs, deriveAcStatus } from '../tasks/verify-runner.js';
import { readIntentContext } from '../intent/portable-context.js';
import { resolveHandoffPointer } from './handoff-pointer.js';

export const MEMORY_INDEX_PATH = '.specweave/memory/MEMORY.md';

const MAX_INCREMENTS_LISTED = 3;
const MAX_NOTES = 5;
const MAX_MEMORY_LINES = 20;

export interface PickupOptions {
  /** Increment to focus on; default: the single active (or planned) one. */
  incrementId?: string;
  /** Compact form for the SessionStart hook: no Git, no per-task detail. */
  compact?: boolean;
  /** Override the agent id (tests). */
  agent?: string;
  /** Explicit increment ids in priority order (the hook's active-increment state). */
  activeIds?: string[];
}

export interface PickupResult {
  text: string;
  /** Increment the full form focused on, if any. */
  incrementId?: string;
}

/** Build the pickup text. Returns empty text when there is nothing to say. */
export function buildPickup(projectRoot: string, opts: PickupOptions = {}): PickupResult {
  const agent = opts.agent ?? getAgentId();
  const leaseHours = readLeaseHours(projectRoot);
  const incRoot = incrementsDir(projectRoot);
  const active = opts.activeIds ?? listActiveIncrementIds(projectRoot);
  const ids = opts.incrementId ? [opts.incrementId] : active.length ? active : listStartableIncrementIds(projectRoot);
  const focus = ids.length === 1 ? ids[0] : undefined;
  const L: string[] = [];

  const intents = readIntentContext(projectRoot);
  if (intents) L.push(intents);

  if (!opts.compact) L.push(`SpecWeave pickup · you are ${agent}`);

  if (focus && !opts.compact) {
    L.push(...describeFocus(projectRoot, path.join(incRoot, focus), focus, agent, leaseHours));
  } else {
    for (const id of ids.slice(0, MAX_INCREMENTS_LISTED)) L.push(summaryLine(path.join(incRoot, id), id, leaseHours));
    if (ids.length > MAX_INCREMENTS_LISTED) L.push(`(+${ids.length - MAX_INCREMENTS_LISTED} more active increments)`);
    if (ids.length > 1 && !opts.compact) L.push('Several increments are open: run `specweave pickup <id>` for one of them.');
  }

  if (!opts.compact) {
    const git = gitLine(projectRoot);
    if (git) L.push(git);
  }

  const handoff = lastHandoff(projectRoot, ids.map((id) => path.join(incRoot, id)));
  if (handoff) L.push(handoff);

  if (focus) {
    const notes = readIncrementEvents(ledgerPath(path.join(incRoot, focus)), ['note']).slice(-MAX_NOTES);
    if (notes.length) {
      L.push('Notes:');
      for (const n of notes) L.push(`- ${n.by} ${age(n.at)}: ${oneLine(n.note ?? '', 200)}`);
    }
  }

  const memory = memoryIndex(projectRoot, opts.compact);
  if (memory.length) L.push(...memory);

  if (opts.compact && L.length && ids.length) {
    L.push('Run `specweave pickup` for the next task\'s acceptance criteria, claims and branch state.');
  }
  if (!opts.compact && ids.length === 0 && !intents) {
    L.push('No open increment. Start one with `specweave create-increment "<title>"`.');
  }
  return { text: L.join('\n'), incrementId: focus };
}

// ── Increment detail ───────────────────────────────────────────────────────

function describeFocus(projectRoot: string, dir: string, id: string, agent: string, leaseHours: number): string[] {
  const L: string[] = [];
  const title = readTitle(dir);
  const status = readStatus(dir);
  const board = safeBoard(dir, leaseHours);
  const acs = board ? deriveAcStatus(readSpecAcs(dir), board) : readSpecAcs(dir);
  const metAcs = acs.filter((a) => a.done).length;
  const counts = board?.counts;
  const taskBit = counts ? ` · tasks ${counts.done + counts.skipped}/${counts.total} done` : '';
  const acBit = acs.length ? ` · ACs ${metAcs}/${acs.length} met` : '';
  L.push(`Increment ${id}${title ? ` "${title}"` : ''} (${status})${taskBit}${acBit}`);

  if (board) {
    const mine = board.tasks.filter((t) => (t.state.status === 'claimed' || t.state.status === 'blocked') && t.state.by === agent);
    for (const t of mine) L.push(`Yours: ${t.id} ${t.title} (${t.state.status} ${age(t.state.since)})`);
    const next = nextTask(board, agent);
    if (next && !mine.some((t) => t.id === next.id)) {
      L.push(`Next: ${next.id} ${next.title}`);
      const byId = new Map(acs.map((a) => [a.id, a]));
      for (const acId of next.acs ?? []) L.push(`  ${acId}: ${byId.get(acId)?.text || '(text not found in spec.md)'}`);
      L.push(`  Files: ${(next.filesAffected ?? []).join(', ') || '-'} | Test: ${next.test ?? '-'}`);
      L.push(`  claim: specweave task claim ${next.id} ${id}`);
    } else if (!next && counts && counts.total > 0 && counts.done + counts.skipped === counts.total) {
      L.push(`All tasks done. Next: specweave verify ${id}, then specweave complete ${id}`);
    }
    const others = board.tasks.filter((t) =>
      (t.state.status === 'claimed' || t.state.status === 'blocked' || t.state.status === 'stale') && t.state.by !== agent);
    if (others.length) {
      L.push('Held by others:');
      for (const t of others) {
        const hint = t.state.status === 'stale' ? ' (lease expired, claimable)' : '';
        L.push(`  ${t.id} ${t.state.status} by ${t.state.by} ${age(t.state.since)}${hint}${t.state.note ? `: ${oneLine(t.state.note, 120)}` : ''}`);
      }
    }
  }
  const unmet = acs.filter((a) => !a.done);
  if (!board && unmet.length) L.push(`Open ACs: ${unmet.map((a) => a.id).join(', ')}`);
  L.push(`Spec: ${rel(projectRoot, path.join(dir, 'spec.md'))}`);
  return L;
}

function summaryLine(dir: string, id: string, leaseHours: number): string {
  const title = readTitle(dir);
  let line = `Active increment: ${id}${title ? ` — ${title}` : ''}`;
  const board = safeBoard(dir, leaseHours);
  if (board && board.counts.total > 0) {
    const c = board.counts;
    const pending = Math.max(0, c.total - c.done - c.skipped);
    if (pending === 0) {
      line += ` (all ${c.total} tasks done — run /sw:done ${id})`;
    } else {
      const next = nextTask(board);
      line += ` (${pending}/${c.total} tasks pending${next ? `; next: ${next.id}${next.title ? ' ' + next.title : ''}` : ''})`;
    }
  }
  return `${line}. Spec: .specweave/increments/${id}/spec.md`;
}

/** Task board from the same fold every other counter uses; null when there are no tasks to read. */
function safeBoard(dir: string, leaseHours: number): TaskBoard | null {
  if (!hasTasksFile(dir)) return null;
  try {
    const board = loadTaskBoard(dir, { leaseHours });
    return board.counts.total > 0 ? board : null;
  } catch {
    return null; // unparseable — say nothing rather than lie
  }
}

function readText(p: string): string {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function readJson<T>(p: string): T | undefined {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as T; } catch { return undefined; }
}

/** Title: metadata.title → spec.md frontmatter `title:` → first `# ` heading. */
export function readTitle(incDir: string): string {
  const meta = readJson<{ title?: unknown }>(path.join(incDir, 'metadata.json'));
  if (typeof meta?.title === 'string' && meta.title.trim()) return meta.title.trim();
  const spec = readText(path.join(incDir, 'spec.md'));
  const fm = spec.match(/^---[\s\S]*?\ntitle:\s*["']?(.+?)["']?\s*\n[\s\S]*?---/);
  if (fm) return fm[1].trim();
  const h1 = spec.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].replace(/^(Increment|Spec(ification)?)\s*:\s*/i, '').trim() : '';
}

function readStatus(incDir: string): string {
  const status = readJson<{ status?: unknown }>(path.join(incDir, 'metadata.json'))?.status;
  return typeof status === 'string' ? status : 'unknown';
}

// ── Handoff, Git, memory ───────────────────────────────────────────────────

/**
 * The newest handoff: a `handoff` ledger event (who, when, why) wins, since it
 * travels with the branch and a checkout resets file times; otherwise the
 * newest handoff document on disk.
 */
function lastHandoff(projectRoot: string, incDirs: string[]): string {
  let event: { e: LedgerEvent; dir: string } | undefined;
  for (const dir of incDirs) {
    const last = readIncrementEvents(ledgerPath(dir), ['handoff']).pop();
    if (last && (!event || Date.parse(last.at) > Date.parse(event.e.at))) event = { e: last, dir };
  }
  if (event) {
    const docPath = path.join(event.dir, 'handoff.md');
    const where = fs.existsSync(docPath) ? ` → ${rel(projectRoot, docPath)}` : '';
    return `Last handoff: ${event.e.by} ${age(event.e.at)}${event.e.note ? `: ${oneLine(event.e.note, 200)}` : ''}${where}`;
  }
  const doc = newestHandoffDoc(projectRoot, incDirs);
  if (doc) return `Last handoff: ${rel(projectRoot, doc.p)} (${ageMs(doc.mtime)})`;
  return '';
}

function newestHandoffDoc(projectRoot: string, incDirs: string[]): { p: string; mtime: number } | undefined {
  const candidates = [
    ...incDirs.map((d) => path.join(d, 'handoff.md')),
    path.join(projectRoot, '.specweave', 'state', 'handoff-latest.md'),
  ];
  // Canonical owned docs recover older absolute pointers after a project move.
  for (const relative of ['.handoff/HANDOFF.md', 'HANDOFF.md']) {
    const owned = resolveHandoffPointer(projectRoot, relative);
    if (owned) candidates.push(owned);
  }
  try {
    const pointer = fs.readFileSync(path.join(projectRoot, '.specweave/state/handoff-latest.txt'), 'utf8').trim();
    const resolved = resolveHandoffPointer(projectRoot, pointer);
    if (resolved) candidates.push(resolved);
  } catch { /* no explicit handoff */ }
  let best: { p: string; mtime: number } | undefined;
  for (const p of candidates) {
    try {
      const mtime = fs.statSync(p).mtimeMs;
      if (!best || mtime > best.mtime) best = { p, mtime };
    } catch { /* absent */ }
  }
  return best;
}

/** One line of branch state: branch @ sha, upstream distance, uncommitted work. */
function gitLine(projectRoot: string): string {
  const git = (args: string[]): string | null => {
    try {
      return execFileSync('git', args, {
        cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 1500,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      }).trim();
    } catch { return null; }
  };
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch === null) return '';
  const sha = git(['rev-parse', '--short', 'HEAD']) ?? '';
  const parts = [`Branch: ${branch}${sha ? ` @ ${sha}` : ''}`];
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (upstream) {
    const counts = git(['rev-list', '--left-right', '--count', `${upstream}...HEAD`])?.split(/\s+/).map(Number);
    if (counts && counts.length === 2) {
      const [behind, ahead] = counts;
      parts.push(ahead || behind ? `${ahead} ahead, ${behind} behind ${upstream}` : `in sync with ${upstream}`);
    }
  } else if (branch !== 'HEAD') {
    parts.push('not pushed');
  }
  const status = git(['status', '--porcelain', '--', '.', ':(exclude,glob).specweave/increments/*/ledger.jsonl', ':(exclude,glob).specweave/increments/*/metadata.json', ':(exclude,glob).specweave/increments/*/reports/**', ':(exclude,glob).specweave/state/**', ':(exclude,glob).specweave/logs/**']);
  const dirty = status ? status.split('\n').filter(Boolean).length : 0;
  if (dirty) parts.push(`${dirty} uncommitted file${dirty === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

/** The memory index: a pointer in compact form, the first lines in full form. */
function memoryIndex(projectRoot: string, compact?: boolean): string[] {
  const file = path.join(projectRoot, MEMORY_INDEX_PATH);
  const content = readText(file);
  if (!content.trim()) return [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim() && !/^<!--/.test(l.trim()));
  if (compact) return [`Memory: ${MEMORY_INDEX_PATH} (${lines.length} lines; read it before deciding anything already decided)`];
  const shown = lines.slice(0, MAX_MEMORY_LINES).map((l) => `  ${oneLine(l, 200)}`);
  if (lines.length > MAX_MEMORY_LINES) shown.push(`  (+${lines.length - MAX_MEMORY_LINES} more lines in ${MEMORY_INDEX_PATH})`);
  return [`Memory (${MEMORY_INDEX_PATH}):`, ...shown];
}

// ── Formatting ─────────────────────────────────────────────────────────────

function rel(root: string, p: string): string {
  return path.relative(root, p).split(path.sep).join('/');
}

function oneLine(s: string, max: number): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat;
}

function age(iso?: string): string {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? '' : ageMs(t);
}

function ageMs(ms: number): string {
  const min = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
