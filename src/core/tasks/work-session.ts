/**
 * Work-session markers — which increment (or declared small fix) an agent
 * session is working on.
 *
 * `~/.specweave/sessions/<session>.json` is written whenever a session touches
 * an increment (any ledger append, `create-increment`, `verify`, `complete`) or
 * declares `specweave small-fix`. The required-increment guard reads it to
 * decide whether an edit is planned work. Like the Studio thread binding it
 * holds no task state and every write is best-effort.
 *
 * @module core/tasks/work-session
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { recordStudioThreadBinding } from './studio-thread-binding.js';

export interface WorkSessionMarker {
  version: 1;
  sessionId: string;
  kind: 'increment' | 'small-fix';
  /** Increment folder name; null for a small fix. */
  incrementId: string | null;
  /** Project root whose `.specweave` holds the increment or the small-fix log. */
  root: string;
  /** What wrote the marker: a ledger event type, `create`, `verify`, `complete` or `small-fix`. */
  event: string;
  reason?: string;
  at: string;
}

/** Where the marker of `sessionId` lives. */
export function workSessionFile(sessionId: string, home = os.homedir()): string {
  return path.join(home, '.specweave', 'sessions', `${sessionId.replace(/[^\w.-]/g, '_')}.json`);
}

export function readWorkSession(sessionId: string | undefined, home = os.homedir()): WorkSessionMarker | null {
  if (!sessionId?.trim()) return null;
  try {
    const marker = JSON.parse(fs.readFileSync(workSessionFile(sessionId.trim(), home), 'utf8'));
    return marker && marker.version === 1 ? (marker as WorkSessionMarker) : null;
  } catch {
    return null;
  }
}

export function recordWorkSession(
  marker: Omit<WorkSessionMarker, 'version'>,
  opts: { home?: string } = {},
): void {
  if (!marker.sessionId?.trim()) return;
  try {
    const file = workSessionFile(marker.sessionId.trim(), opts.home);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporary = `${file}.${process.pid}.${Date.now()}`;
    fs.writeFileSync(temporary, JSON.stringify({ version: 1, ...marker }, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(temporary, file);
  } catch {
    // A convenience record; the command that triggered it already succeeded.
  }
}

/**
 * The current session and SpecWithCode thread now work on the increment in
 * `incrementDir`. Used by every command that touches an increment, whether or
 * not it appends to the ledger.
 */
export function recordIncrementWork(
  incrementDir: string,
  event: { t?: string; e: string; at?: string },
  opts: { sessionId?: string; env?: NodeJS.ProcessEnv; home?: string } = {},
): void {
  const at = event.at ?? new Date().toISOString();
  const dir = path.resolve(incrementDir);
  recordStudioThreadBinding(path.join(dir, 'ledger.jsonl'), { t: event.t ?? '*', e: event.e, at }, opts);
  const incrementsDir = path.dirname(dir);
  if (path.basename(incrementsDir) !== 'increments') return;
  const marker = { kind: 'increment' as const, incrementId: path.basename(dir), root: path.dirname(path.dirname(incrementsDir)), event: event.e, at };
  if (opts.sessionId) recordWorkSession({ sessionId: opts.sessionId, ...marker }, opts);
  // A thread's earlier small fix (`studio-<thread>`, written without a session id)
  // gives way to its increment work, so it stops exempting once that increment closes.
  const thread = (opts.env ?? process.env).SPECWEAVE_STUDIO_THREAD_ID?.trim();
  if (thread && readWorkSession(`studio-${thread}`, opts.home)) recordWorkSession({ sessionId: `studio-${thread}`, ...marker }, opts);
}

/** Log of `specweave small-fix` exemptions, relative to the project root. */
export const SMALL_FIX_LOG = path.join('.specweave', 'state', 'small-fixes.jsonl');

export interface SmallFixEntry {
  at: string;
  by: string;
  reason: string;
  session?: string;
  /** SpecWithCode thread id (`SPECWEAVE_STUDIO_THREAD_ID`). */
  thread?: string;
  model?: string;
}

export function readSmallFixes(projectRoot: string): SmallFixEntry[] {
  try {
    return fs
      .readFileSync(path.join(projectRoot, SMALL_FIX_LOG), 'utf8')
      .split('\n')
      .flatMap((line) => {
        try {
          const entry = JSON.parse(line);
          return entry && typeof entry.at === 'string' && typeof entry.reason === 'string' ? [entry as SmallFixEntry] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}
