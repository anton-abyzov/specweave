/**
 * Close-pending markers: increments whose last task a known session finished
 * through the CLI, and that are not closed yet.
 *
 * `specweave task done` / `task skip` writes one when the board turns
 * all-terminal, naming the Claude Code session it ran in
 * (CLAUDE_CODE_SESSION_ID, which Claude Code sets for every shell command and
 * which matches the hooks' `session_id`). The Stop hook reminds only that
 * session, once, to verify and close; then the entry is gone. Other sessions
 * in the same folder are never touched. Entries also go once the increment
 * is closed, gets open tasks again, or is older than CLOSE_PENDING_MAX_AGE_MS
 * (pickup's "/sw:done" hint covers it from then on). Without a session id
 * (Codex, a plain terminal) nothing is written: those tools get the close
 * instruction from the command output and AGENTS.md instead.
 *
 * The hook supervisor (plugins/specweave/hooks/run.mjs) reads this file to
 * decide whether a Stop needs the worker at all, so keep the shape flat.
 * Every function here is best-effort: bookkeeping must never fail a command.
 *
 * @module core/increment/close-pending
 */

import * as fs from 'fs';
import * as path from 'path';
import { IncrementStatus, LEGACY_STATUS_MAP } from '../types/increment-metadata.js';

/** File name under `.specweave/state/`; run.mjs checks the same name. */
export const CLOSE_PENDING_FILE = 'close-pending.json';

/** After a day the finishing session is gone; pickup takes over. */
export const CLOSE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ClosePendingEntry {
  /** When the last task turned done or skipped. */
  at: string;
  /** The session that finished it; only this one is reminded. */
  session: string;
}

export type ClosePending = Record<string, ClosePendingEntry>;

export function closePendingPath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'state', CLOSE_PENDING_FILE);
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

export function readClosePending(projectRoot: string): ClosePending {
  try {
    const parsed = JSON.parse(fs.readFileSync(closePendingPath(projectRoot), 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: ClosePending = {};
    for (const [id, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const { at, session } = entry as Record<string, unknown>;
      if (typeof at === 'string' && typeof session === 'string' && session) out[id] = { at, session };
    }
    return out;
  } catch {
    return {};
  }
}

/** Write the markers atomically; no entries removes the file. Returns false when the write failed. */
function writeClosePending(projectRoot: string, data: ClosePending): boolean {
  const file = closePendingPath(projectRoot);
  try {
    if (Object.keys(data).length === 0) {
      fs.rmSync(file, { force: true });
      return true;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

/** Record that `session` finished every task of `id`, so its Stop reminds it to close. */
export function markClosePending(projectRoot: string, id: string, session: string | undefined, now: Date = new Date()): void {
  if (!session) return;
  const data = readClosePending(projectRoot);
  data[id] = { at: now.toISOString(), session };
  writeClosePending(projectRoot, data);
}

/**
 * Drop entries, re-reading just before the write so a marker another session
 * added meanwhile survives. Returns false when the file could not be updated.
 */
export function removeClosePending(projectRoot: string, ids: string[]): boolean {
  if (ids.length === 0) return true;
  const data = readClosePending(projectRoot);
  let changed = false;
  for (const id of ids) {
    if (id in data) {
      delete data[id];
      changed = true;
    }
  }
  return changed ? writeClosePending(projectRoot, data) : true;
}
