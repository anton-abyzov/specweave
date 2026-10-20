/**
 * Retention for `~/.specweave/checkpoints`. Every session leaves a folder there
 * and the worker only prunes old generations inside one, so whole folders are
 * removed here once nothing reads them: newest file older than 7 days and no
 * pending handoff (`handoff.json` without a later `picked.json`). Studio
 * pointers (`studio/<thread>.json`) go when the checkpoint they name is gone.
 *
 * The checkpoint supervisor runs it at most once a day, after its capture, in
 * a detached process; `specweave gc` reports it and `gc --yes` applies it.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SESSION_HANDOFF_FILE, SESSION_PICKED_FILE, type CheckpointReceipt, type SessionHandoffMark } from './session-checkpoint.js';

/**
 * Seven days: a checkpoint only matters until the next session picks the work
 * up, and pending handoffs are kept regardless. At October 2026 rates (about
 * 230 sessions and 140 MB a day on one Mac) 14 days would hold about 2 GB.
 */
export const CHECKPOINT_RETENTION_DAYS = 7;
export const CHECKPOINT_RETENTION_MS = CHECKPOINT_RETENTION_DAYS * 24 * 60 * 60_000;
export const CHECKPOINT_PRUNE_INTERVAL_MS = 24 * 60 * 60_000;
/** Wall-clock cap for one background run; the rest waits for the next day. */
export const CHECKPOINT_PRUNE_BUDGET_MS = 20_000;
/** Records the last background run. Readers skip dot-names in the root. */
export const CHECKPOINT_PRUNE_MARKER = '.retention';
/** Session folders are sha256(cwd, session id); nothing else in the root is touched. */
const SESSION_FOLDER = /^[0-9a-f]{64}$/;

export interface CheckpointPruneOptions {
  now?: number;
  maxAgeMs?: number;
  /** Delete; otherwise only report what would go. */
  apply?: boolean;
  /** Stop deleting after this many milliseconds. */
  budgetMs?: number;
}

export interface CheckpointPruneResult {
  applied: boolean;
  /** Session folders removed (or that would be). */
  sessions: number;
  /** Their size in bytes. */
  bytes: number;
  /** Studio pointers removed (or that would be). */
  pointers: number;
  /** Session folders kept: recent, or holding a pending handoff. */
  kept: number;
  /** Folders kept only because they hold a pending handoff. */
  pendingHandoffs: number;
  /** The time budget ran out before every candidate was removed. */
  partial: boolean;
}

function readJson<T>(file: string): T | undefined {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return undefined; }
}

/** Newest mtime and total size under a session folder, without following symlinks. */
function scan(dir: string): { newest: number; bytes: number } {
  let newest = 0;
  let bytes = 0;
  const walk = (p: string) => {
    let st: fs.Stats;
    try { st = fs.lstatSync(p); } catch { return; }
    newest = Math.max(newest, st.mtimeMs);
    if (!st.isDirectory()) { bytes += st.size; return; }
    let names: string[];
    try { names = fs.readdirSync(p); } catch { return; }
    for (const name of names) walk(path.join(p, name));
  };
  walk(dir);
  return { newest, bytes };
}

/** Same rule as `specweave handoff list`, but an unreadable mark counts as pending. */
function hasPendingHandoff(dir: string): boolean {
  if (!fs.existsSync(path.join(dir, SESSION_HANDOFF_FILE))) return false;
  const mark = readJson<SessionHandoffMark>(path.join(dir, SESSION_HANDOFF_FILE));
  const picked = readJson<{ at?: string }>(path.join(dir, SESSION_PICKED_FILE));
  const markAt = mark?.at ? Date.parse(mark.at) : NaN;
  const pickedAt = picked?.at ? Date.parse(picked.at) : NaN;
  return !(Number.isFinite(markAt) && Number.isFinite(pickedAt) && pickedAt >= markAt);
}

/** Remove (or count) expired session folders and the Studio pointers left without a checkpoint. */
export function pruneCheckpoints(root: string, opts: CheckpointPruneOptions = {}): CheckpointPruneResult {
  const now = opts.now ?? Date.now();
  const cutoff = now - (opts.maxAgeMs ?? CHECKPOINT_RETENTION_MS);
  const deadline = opts.budgetMs === undefined ? Infinity : Date.now() + opts.budgetMs;
  const result: CheckpointPruneResult = { applied: !!opts.apply, sessions: 0, bytes: 0, pointers: 0, kept: 0, pendingHandoffs: 0, partial: false };
  let names: string[];
  try { names = fs.readdirSync(root); } catch { return result; }
  const removed = new Set<string>();
  for (const name of names) {
    if (!SESSION_FOLDER.test(name)) continue;
    const dir = path.join(root, name);
    if (Date.now() > deadline) { result.partial = true; break; }
    if (hasPendingHandoff(dir)) { result.kept++; result.pendingHandoffs++; continue; }
    const { newest, bytes } = scan(dir);
    if (!newest || newest >= cutoff) { result.kept++; continue; }
    if (opts.apply) {
      // A session that came back since the scan touches the folder first.
      try { if (fs.statSync(dir).mtimeMs >= cutoff || hasPendingHandoff(dir)) { result.kept++; continue; } } catch { continue; }
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { result.kept++; continue; }
    }
    removed.add(dir);
    result.sessions++;
    result.bytes += bytes;
  }
  result.pointers = prunePointers(root, removed, cutoff, !!opts.apply);
  return result;
}

/** Pointers older than the cutoff whose checkpoint document is gone (or about to be). */
function prunePointers(root: string, removed: Set<string>, cutoff: number, apply: boolean): number {
  const studio = path.join(root, 'studio');
  let names: string[];
  try { names = fs.readdirSync(studio); } catch { return 0; }
  let count = 0;
  for (const name of names) {
    const file = path.join(studio, name);
    try {
      const st = fs.lstatSync(file);
      if (!st.isFile() || st.mtimeMs >= cutoff) continue;
      // Leftover `<thread>.json.<token>` temp files carry no receipt and also go.
      const docPath = name.endsWith('.json') ? readJson<CheckpointReceipt>(file)?.docPath : undefined;
      if (typeof docPath === 'string' && fs.existsSync(docPath)
        && !removed.has(path.dirname(path.dirname(docPath)))) continue;
      if (apply) fs.unlinkSync(file);
      count++;
    } catch { /* raced with a writer or another prune */ }
  }
  return count;
}

/**
 * At most once a day, prune with a time budget. Called from the detached
 * checkpoint supervisor, never from a hook; every error is swallowed.
 */
export function maybePruneCheckpoints(root: string, opts: { now?: number } = {}): CheckpointPruneResult | undefined {
  try {
    const now = opts.now ?? Date.now();
    const marker = path.join(root, CHECKPOINT_PRUNE_MARKER);
    try {
      const last = fs.statSync(marker).mtimeMs;
      if (now >= last && now - last < CHECKPOINT_PRUNE_INTERVAL_MS) return undefined;
    } catch { /* first run */ }
    // Claim the day before the work, so concurrent supervisors skip it.
    fs.writeFileSync(marker, JSON.stringify({ at: new Date(now).toISOString() }) + '\n', { mode: 0o600 });
    fs.utimesSync(marker, now / 1000, now / 1000);
    return pruneCheckpoints(root, { now, apply: true, budgetMs: CHECKPOINT_PRUNE_BUDGET_MS });
  } catch { return undefined; }
}
