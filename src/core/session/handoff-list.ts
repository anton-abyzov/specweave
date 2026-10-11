/**
 * Pending handoffs: `specweave handoff list`, and which one `specweave pickup`
 * takes when several sessions handed off in the same project.
 *
 * Two kinds, newest first:
 *
 * - `increment`: an increment whose ledger ends in a `handoff` event with no
 *   `pickup` after it. Its id is the increment's four-digit number (the full
 *   id when two folders share the number).
 * - `session`: a session that hit the usage limit where an increment handoff
 *   would be wrong (several increments active, or it worked in a worktree or a
 *   nested repository). Its local checkpoint under `~/.specweave/checkpoints`
 *   carries a `handoff.json` mark and no `picked.json` after it. Its id is the
 *   checkout's folder name, such as a worktree's.
 *
 * Read-only and offline: no Git, no network, so the SessionStart hook can call it.
 *
 * @module core/session/handoff-list
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ledgerPath, readIncrementEvents } from '../tasks/ledger.js';
import { incrementsDir } from '../tasks/resolve-increment.js';
import { readTitle, ageMs } from './pickup.js';
import {
  checkpointsDirectory,
  SESSION_HANDOFF_FILE,
  SESSION_PICKED_FILE,
  summaryTitle,
  type CheckpointReceipt,
  type SessionHandoffMark,
} from './session-checkpoint.js';

export type PendingHandoffKind = 'increment' | 'session';

export interface PendingHandoff {
  /** What to type after "pick up": `0874`, or a worktree name such as `studio-routing`. */
  id: string;
  kind: PendingHandoffKind;
  title: string;
  /** ISO time of the handoff. */
  at: string;
  by?: string;
  reason?: string;
  /** Increment folder name, when the handoff belongs to one. */
  incrementId?: string;
  /** Absolute path of the handoff document. */
  docPath?: string;
  /** Session handoffs: the uncommitted edits, the checkout they live in, its branch. */
  diffPath?: string;
  checkout?: string;
  branch?: string;
  sessionId?: string;
  /** Session handoffs: the checkpoint folder that holds the mark. */
  checkpointDir?: string;
}

export interface ListHandoffsOptions {
  /** Home directory holding `.specweave/checkpoints` (tests). */
  home?: string;
}

const CLOSED_STATUSES = new Set(['completed', 'complete', 'done', 'abandoned', 'cancelled', 'canceled', 'archived', 'closed']);

const shortNumber = (id: string) => id.match(/^\d{4}/)?.[0];

function readJson<T>(file: string): T | undefined {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return undefined; }
}

function realpath(p: string): string {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

/** The pending handoffs of a project, newest first, each with a unique id. */
export function listPendingHandoffs(root: string, opts: ListHandoffsOptions = {}): PendingHandoff[] {
  const items = [...incrementHandoffs(root), ...sessionHandoffs(root, opts.home)];
  items.sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
  return uniqueIds(items);
}

// ── Increment handoffs ─────────────────────────────────────────────────────

function incrementHandoffs(root: string): PendingHandoff[] {
  const dir = incrementsDir(root);
  let names: string[];
  try { names = fs.readdirSync(dir).filter((n) => /^\d{4}/.test(n)).sort(); } catch { return []; }
  const perNumber = new Map<string, number>();
  for (const n of names) {
    const num = shortNumber(n)!;
    perNumber.set(num, (perNumber.get(num) ?? 0) + 1);
  }
  const out: PendingHandoff[] = [];
  for (const name of names) {
    const incDir = path.join(dir, name);
    const ledger = ledgerPath(incDir);
    if (!fs.existsSync(ledger)) continue;
    const status = readJson<{ status?: unknown }>(path.join(incDir, 'metadata.json'))?.status;
    if (typeof status === 'string' && CLOSED_STATUSES.has(status.trim().toLowerCase())) continue;
    const last = readIncrementEvents(ledger, ['handoff', 'pickup']).pop();
    if (last?.e !== 'handoff') continue;
    const num = shortNumber(name)!;
    const doc = ['handoff.md', 'handoff.auto.md'].map((f) => path.join(incDir, f)).find((p) => fs.existsSync(p));
    out.push({
      id: perNumber.get(num) === 1 ? num : name,
      kind: 'increment',
      title: readTitle(incDir).replace(new RegExp(`^${num}\\s*[—–:-]\\s*`), '') || name,
      at: last.at,
      by: last.by,
      ...(last.note ? { reason: last.note } : {}),
      incrementId: name,
      ...(doc ? { docPath: doc } : {}),
    });
  }
  return out;
}

// ── Session handoffs ───────────────────────────────────────────────────────

/** Is `child` the project root or inside it? */
function within(root: string, child: string): boolean {
  const rel = path.relative(root, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function sessionHandoffs(root: string, home?: string): PendingHandoff[] {
  const base = checkpointsDirectory(home);
  const projectRoot = realpath(root);
  let names: string[];
  try { names = fs.readdirSync(base); } catch { return []; }
  const out: PendingHandoff[] = [];
  for (const name of names) {
    if (name.startsWith('.') || name === 'studio') continue;
    const dir = path.join(base, name);
    const mark = readJson<SessionHandoffMark>(path.join(dir, SESSION_HANDOFF_FILE));
    if (mark?.version !== 1 || !Date.parse(mark.at)) continue;
    const picked = readJson<{ at?: string }>(path.join(dir, SESSION_PICKED_FILE));
    if (picked?.at && Date.parse(picked.at) >= Date.parse(mark.at)) continue;
    const receipt = readJson<CheckpointReceipt>(path.join(dir, 'current.json'));
    if (receipt?.version !== 1 || typeof receipt.cwd !== 'string' || !within(projectRoot, receipt.cwd)) continue;
    const branch = readBranch(receipt.cwd);
    const folder = receipt.cwd === projectRoot ? '' : path.basename(receipt.cwd);
    const title = receipt.title ?? docTitle(receipt.docPath) ?? (branch ? `work on ${branch}` : 'session work');
    out.push({
      id: slug(folder) || slug(branch ?? '') || `session-${receipt.sessionId.slice(0, 6)}`,
      kind: 'session',
      title,
      at: mark.at,
      ...(mark.by ? { by: mark.by } : {}),
      ...(mark.reason ? { reason: mark.reason } : {}),
      ...(receipt.incrementId ? { incrementId: receipt.incrementId } : {}),
      ...(fs.existsSync(receipt.docPath) ? { docPath: receipt.docPath } : {}),
      ...(fs.existsSync(receipt.diffPath) ? { diffPath: receipt.diffPath } : {}),
      checkout: receipt.cwd,
      ...(branch ? { branch } : {}),
      sessionId: receipt.sessionId,
      checkpointDir: dir,
    });
  }
  return out;
}

/** The branch checked out in `checkout`, read from `.git` without running Git (worktrees included). */
export function readBranch(checkout: string): string | undefined {
  try {
    let gitDir = path.join(checkout, '.git');
    if (fs.statSync(gitDir).isFile()) {
      const pointer = fs.readFileSync(gitDir, 'utf8').match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
      if (!pointer) return undefined;
      gitDir = path.resolve(checkout, pointer);
    }
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    return head.match(/^ref:\s*refs\/heads\/(.+)$/)?.[1];
  } catch { return undefined; }
}

/** First line under "Where I left off" in a checkpoint document (older receipts carry no title). */
function docTitle(docPath: string): string | undefined {
  let text = '';
  try { text = fs.readFileSync(docPath, 'utf8'); } catch { return undefined; }
  const section = text.split(/^## Where I left off\s*$/m)[1]?.split(/^## /m)[0];
  return summaryTitle(section);
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
}

/** Two sessions in folders of the same name: the older keeps the name, the newer gets a session suffix. */
function uniqueIds(items: PendingHandoff[]): PendingHandoff[] {
  const seen = new Set<string>();
  const oldestFirst = [...items].reverse();
  for (const item of oldestFirst) {
    if (seen.has(item.id.toLowerCase()) && item.sessionId) item.id = `${item.id}-${item.sessionId.slice(0, 4).toLowerCase()}`;
    let n = 2;
    const original = item.id;
    while (seen.has(item.id.toLowerCase())) item.id = `${original}-${n++}`;
    seen.add(item.id.toLowerCase());
  }
  return items;
}

// ── Choosing one ───────────────────────────────────────────────────────────

export type HandoffMatch =
  | { kind: 'one'; handoff: PendingHandoff }
  | { kind: 'several'; candidates: PendingHandoff[] }
  | { kind: 'none' };

/**
 * Which pending handoff "pick up <query>" means: an exact id, an increment's
 * number or folder name, then every word of the query found in the id, title,
 * branch or folder ("pick up the studio release").
 */
export function matchHandoff(pending: PendingHandoff[], query: string): HandoffMatch {
  const q = query.trim().toLowerCase().replace(/^["'`]+|["'`]+$/g, '').replace(/^(the|my)\s+/, '').trim();
  if (!q) return { kind: 'none' };
  const asNumber = /^\d{1,4}$/.test(q) ? q.padStart(4, '0') : undefined;
  const exact = pending.filter((h) => {
    const inc = h.incrementId?.toLowerCase();
    return h.id.toLowerCase() === q || inc === q || (asNumber !== undefined && shortNumber(inc ?? '') === asNumber && h.kind === 'increment');
  });
  if (exact.length) return exact.length === 1 ? { kind: 'one', handoff: exact[0] } : { kind: 'several', candidates: exact };
  const words = q.split(/[\s,]+/).filter((w) => w.length > 1 && !['the', 'and', 'of', 'on', 'my', 'one', 'handoff', 'session'].includes(w));
  if (!words.length) return { kind: 'none' };
  const hits = pending.filter((h) => {
    const hay = [h.id, h.title, h.branch, h.incrementId, h.checkout ? path.basename(h.checkout) : '', h.reason]
      .filter(Boolean).join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  if (hits.length === 1) return { kind: 'one', handoff: hits[0] };
  return hits.length ? { kind: 'several', candidates: hits } : { kind: 'none' };
}

/** Record that a session handoff was taken, so it leaves the list. */
export function markSessionPicked(handoff: PendingHandoff, by: string, now: Date = new Date()): void {
  if (handoff.kind !== 'session' || !handoff.checkpointDir) return;
  try {
    fs.writeFileSync(path.join(handoff.checkpointDir, SESSION_PICKED_FILE), JSON.stringify({ by, at: now.toISOString() }, null, 2) + '\n', { mode: 0o600 });
  } catch { /* best effort: it stays listed */ }
}

// ── Rendering ──────────────────────────────────────────────────────────────

function homeShort(p: string): string {
  const home = os.homedir();
  return home && (p === home || p.startsWith(home + path.sep)) ? '~' + p.slice(home.length) : p;
}

function oneLine(s: string, max: number): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat;
}

/** One line per handoff: id, title, who, when, why. */
export function handoffLine(h: PendingHandoff): string {
  const bits = [h.by, Date.parse(h.at) ? ageMs(Date.parse(h.at)) : '', h.reason ? oneLine(h.reason, 80) : ''].filter(Boolean);
  return `${h.id}  ${oneLine(h.title, 80)}${bits.length ? ` · ${bits.join(' · ')}` : ''}`;
}

/** Where a handoff's work is: the document for an increment, the checkout and branch for a session. */
export function handoffWhere(root: string, h: PendingHandoff): string {
  const rel = (p: string) => {
    const r = path.relative(root, p);
    return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : homeShort(p);
  };
  if (h.kind === 'session') return `${h.checkout ? rel(h.checkout) || '.' : '?'}${h.branch ? ` (branch ${h.branch})` : ''}`;
  return h.docPath ? rel(h.docPath) : `.specweave/increments/${h.incrementId}`;
}

/** What `specweave handoff list` prints. */
export function renderHandoffList(root: string, pending: PendingHandoff[]): string {
  if (!pending.length) return 'No pending handoffs here. `specweave pickup` still brings in one pushed from another machine.';
  const L = [`${pending.length} pending handoff${pending.length === 1 ? '' : 's'}, newest first:`];
  for (const h of pending) {
    L.push(`  ${handoffLine(h)}`);
    L.push(`      ${handoffWhere(root, h)}`);
  }
  L.push(pending.length > 1
    ? 'Take one with `specweave pickup <id>` (say "pick up <id>"); plain "pick up" takes the newest.'
    : 'Take it with `specweave pickup` (say "pick up").');
  return L.join('\n');
}

/** The short list shown when a pickup has to ask, or names the others it left. */
export function renderChoices(pending: PendingHandoff[], max = 6): string[] {
  const L = pending.slice(0, max).map((h) => `  ${handoffLine(h)}`);
  if (pending.length > max) L.push(`  (+${pending.length - max} more: \`specweave handoff list\`)`);
  return L;
}
