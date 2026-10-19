/**
 * Close-pending markers: increments whose last task a Claude Code session
 * finished through the CLI, and that are not closed yet.
 *
 * `specweave task done` / `task skip` writes one when the board turns
 * all-terminal, into a file of the session it ran in
 * (`~/.specweave/close-pending/<CLAUDE_CODE_SESSION_ID>.json`; Claude Code sets
 * that variable for every shell command and passes the same id to hooks as
 * `session_id`). The file lives under the user's home, not the project, so a
 * session that ran the command in a sibling worktree is still found, and no
 * two sessions ever write the same file. The Stop hook reminds that session
 * once to verify and close, then drops the entry. Entries also go once the
 * increment is closed, gets open tasks again, or is older than
 * CLOSE_PENDING_MAX_AGE_MS (pickup's "/sw:done" hint covers it from then on).
 * Without a session id (Codex, a plain terminal) nothing is written: those
 * tools get the close instruction from the command output and AGENTS.md.
 *
 * The hook supervisor (plugins/specweave/hooks/run.mjs) checks only whether
 * this session's file exists, so it is deleted once empty.
 * Every function here is best-effort: bookkeeping must never fail a command.
 *
 * @module core/increment/close-pending
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IncrementStatus, LEGACY_STATUS_MAP } from '../types/increment-metadata.js';

/** Folder under `~/.specweave/`; run.mjs checks the same path. */
export const CLOSE_PENDING_DIR = 'close-pending';

/** After a day the finishing session is gone; pickup takes over. */
export const CLOSE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ClosePendingEntry {
  /** Project root whose `.specweave/increments/<id>` this is. */
  root: string;
  /** Increment folder name. */
  id: string;
  /** When the last task turned done or skipped. */
  at: string;
}

/** Entries keyed by `<root>\n<id>`. */
export type ClosePending = Record<string, ClosePendingEntry>;

const SAFE_SESSION = /^[A-Za-z0-9._-]{1,128}$/;

/** This session's marker file, or null when the id is not path-safe. */
export function closePendingFile(session: string, home: string = os.homedir()): string | null {
  if (!SAFE_SESSION.test(session) || session === '.' || session === '..') return null;
  return path.join(home, '.specweave', CLOSE_PENDING_DIR, `${session}.json`);
}

/** The steps that close an increment, in the order the loop runs them. */
export function closeChain(id: string): string {
  return `specweave verify ${id}, a fresh-context review (sw-review in a subagent or new session), then specweave complete ${id}`;
}

/** The Claude Code session a CLI command runs in, if any. */
export function currentSessionId(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const id = (env.CLAUDE_CODE_SESSION_ID || env.CLAUDE_SESSION_ID || '').trim();
  return id || undefined;
}

/** Closed for good, including the legacy spellings metadata reads normalize. */
export function isClosedStatus(status: unknown): boolean {
  if (typeof status !== 'string') return false;
  const s = status.trim().toLowerCase();
  if (s === 'archived') return true;
  const normalized: string = LEGACY_STATUS_MAP[s] ?? s;
  return normalized === IncrementStatus.COMPLETED || normalized === IncrementStatus.ABANDONED;
}

export function readClosePending(session: string): ClosePending {
  const file = closePendingFile(session);
  if (!file) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: ClosePending = {};
    for (const [key, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const { root, id, at } = entry as Record<string, unknown>;
      if (typeof root === 'string' && typeof id === 'string' && typeof at === 'string') out[key] = { root, id, at };
    }
    return out;
  } catch {
    return {};
  }
}

/** Write the markers atomically; no entries removes the file. Returns false when the write failed. */
function writeClosePending(session: string, data: ClosePending): boolean {
  const file = closePendingFile(session);
  if (!file) return false;
  try {
    if (Object.keys(data).length === 0) {
      fs.rmSync(file, { force: true });
      return true;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

/** Record that `session` finished every task of `id` under `root`, so its Stop reminds it to close. */
export function markClosePending(root: string, id: string, session: string | undefined, now: Date = new Date()): void {
  if (!session) return;
  const data = readClosePending(session);
  data[`${root}\n${id}`] = { root, id, at: now.toISOString() };
  writeClosePending(session, data);
}

/**
 * Drop entries, re-reading first and keeping any entry re-marked since it was
 * read (a different `at`). Returns false when the file could not be updated.
 */
export function removeClosePending(session: string, read: ClosePending, keys: string[]): boolean {
  if (keys.length === 0) return true;
  const data = readClosePending(session);
  let changed = false;
  for (const key of keys) {
    if (data[key] && data[key].at === read[key]?.at) {
      delete data[key];
      changed = true;
    }
  }
  return changed ? writeClosePending(session, data) : true;
}
