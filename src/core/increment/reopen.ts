/**
 * `specweave reopen`: correct a completed increment back to `planned`.
 *
 * For an increment closed too early (source shipped, release or scope still
 * open). It never activates: `specweave start` stays the separate step, so a
 * workspace at capacity can still record the correction. Every check runs
 * before anything is written, and a refusal changes nothing:
 *
 * 1. a reason (stored in the audit record);
 * 2. an explicit workspace (`--workspace` or `SPECWEAVE_WORKSPACE`); the
 *    increment folder must really live inside it, and its metadata.json,
 *    spec.md and ledger.jsonl must be regular files, never symlinks;
 * 3. status `completed`;
 * 4. no task claimed, stale or blocked by another agent. Ownership moves only
 *    through `specweave task release`, never through this command.
 *
 * Nothing here goes through MetadataManager.read/write or ConfigManager: those
 * persist schema and config repairs, which a refusal must not do. Reopens of
 * one increment are serialized by an exclusive lock file. Ledger writers take
 * no lock, so both new files are staged and flushed first, then the ledger,
 * metadata and spec bytes are compared with the ones checked, and only renames
 * follow. Any difference aborts with nothing changed. What remains is the gap
 * between that compare and the renames; closing it needs every ledger writer
 * to take the same lock.
 *
 * The ledger, reports/ and the spec body are left byte-identical; only the
 * frontmatter `status:` line changes, and the closure moves into
 * `metadata.reopened[]`.
 *
 * @module core/increment/reopen
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { resolveDisciplineLimits } from './discipline-checker.js';
import {
  IncrementStatus,
  LEGACY_STATUS_MAP,
  countsTowardWipLimit,
  type ReopenRecord,
} from '../types/increment-metadata.js';
import { canonicalPath, isWithin } from '../workspace/context.js';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';
import { foldLedgerFile, getAgentId, ledgerPath, type TaskLedgerStatus } from '../tasks/ledger.js';
import { loadTaskBoard } from '../tasks/task-board.js';

export type ReopenRefusal =
  | 'no-reason'
  | 'no-workspace'
  | 'not-found'
  | 'outside-workspace'
  | 'not-completed'
  | 'foreign-owner'
  | 'busy'
  | 'changed';

export class ReopenRefused extends Error {
  constructor(readonly code: ReopenRefusal, message: string, readonly owners: UnfinishedTask[] = []) {
    super(message);
    this.name = 'ReopenRefused';
  }
}

export interface UnfinishedTask {
  task: string;
  status: TaskLedgerStatus;
  by?: string;
}

export interface ReopenResult {
  id: string;
  root: string;
  from: IncrementStatus;
  to: IncrementStatus.PLANNED;
  at: string;
  by: string;
  reason: string;
  /** The closure this reopen moved into `metadata.reopened[]`. */
  previous: Pick<ReopenRecord, 'approvedAt' | 'closeReason' | 'readyForReviewAt'>;
  unfinished: UnfinishedTask[];
  /** True when the increment was already reopened and nothing was written. */
  unchanged: boolean;
  /** Active increments in the workspace and the advisory limit (0 = off). */
  active: { count: number; limit: number };
}

export interface ReopenOptions {
  incrementId: string;
  reason?: string;
  /** Workspace root; defaults to SPECWEAVE_WORKSPACE (bin/specweave.js sets it from --workspace). */
  workspace?: string;
  env?: NodeJS.ProcessEnv;
  now?: Date;
  /** Tests only: fault and race injection points in the commit. */
  hooks?: {
    /** After both temp files are staged, before the final re-check and the renames. */
    beforeCommit?: () => void;
    /** After spec.md is renamed into place, before metadata.json is. */
    afterSpecCommit?: () => void;
    /** During a rollback, after the restored spec.md is staged, before its compare and rename. */
    beforeRestore?: () => void;
  };
}

const HELD: ReadonlySet<TaskLedgerStatus> = new Set(['claimed', 'stale', 'blocked']);
const LOCK_FILE = '.reopen.lock';
const CLOSURE_FIELDS = ['approvedAt', 'closeReason', 'readyForReviewAt'] as const;

function normalStatus(raw: unknown): string {
  const status = typeof raw === 'string' ? raw : '';
  return LEGACY_STATUS_MAP[status.toLowerCase()] ?? status;
}

function activeCount(root: string): number {
  const dir = path.join(root, '.specweave', 'increments');
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, entry.name, 'metadata.json'), 'utf8'));
      if (countsTowardWipLimit(normalStatus(raw?.status) as IncrementStatus)) count++;
    } catch { /* no or unreadable metadata: not active */ }
  }
  return count;
}

/** The advisory limit, read without ConfigManager (whose load migrates and rewrites config.json). */
function activeLimit(root: string): number {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf8'));
    return resolveDisciplineLimits(config?.limits).activeIncrements;
  } catch {
    return resolveDisciplineLimits(undefined).activeIncrements;
  }
}

/** Every task not done or skipped: spec tasks first, then ledger-only ids. */
function unfinishedTasks(incrementDir: string): UnfinishedTask[] {
  const fold = foldLedgerFile(ledgerPath(incrementDir));
  const out: UnfinishedTask[] = [];
  const seen = new Set<string>();
  try {
    for (const t of loadTaskBoard(incrementDir).tasks) {
      seen.add(t.id);
      if (t.state.status !== 'done' && t.state.status !== 'skipped') out.push({ task: t.id, status: t.state.status, by: t.state.by });
    }
  } catch { /* unparsable tasks: the ledger alone still names the holders */ }
  for (const [task, state] of fold.tasks) {
    if (seen.has(task) || state.status === 'done' || state.status === 'skipped') continue;
    out.push({ task, status: state.status, by: state.by });
  }
  return out;
}

function workspaceRoot(selected: string | undefined): string {
  if (!selected?.trim()) {
    throw new ReopenRefused('no-workspace', 'Reopening rewrites a closed increment: name its workspace with --workspace <root>.');
  }
  let root: string;
  try {
    root = canonicalPath(selected);
  } catch {
    throw new ReopenRefused('not-found', `Workspace does not exist: ${selected}`);
  }
  if (!fs.existsSync(path.join(root, '.specweave', 'increments'))) {
    throw new ReopenRefused('not-found', `No .specweave/increments in workspace ${root}`);
  }
  return root;
}

/** 'missing', 'file', or 'other' (a symlink, folder or device), without following links. */
function entryKind(file: string): 'missing' | 'file' | 'other' {
  try {
    return fs.lstatSync(file).isFile() ? 'file' : 'other';
  } catch {
    return 'missing';
  }
}

function readOr(file: string, fallback: string): string {
  return entryKind(file) === 'file' ? fs.readFileSync(file, 'utf8') : fallback;
}

/**
 * Write `content` to a fresh, flushed temp file next to `file`, ready to be
 * renamed over it. The temp is created exclusively (O_CREAT|O_EXCL), so a
 * planted file or symlink at that name makes the write fail instead of being
 * followed.
 */
function stageFile(file: string, content: string): string {
  const tmp = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  const mode = fs.statSync(file).mode & 0o777;
  const fd = fs.openSync(tmp, 'wx', mode);
  try {
    fs.writeFileSync(fd, content, 'utf8');
    fs.fsyncSync(fd);
  } catch (e) {
    fs.closeSync(fd);
    fs.rmSync(tmp, { force: true });
    throw e;
  }
  fs.closeSync(fd);
  return tmp;
}

function replaceFile(file: string, content: string): void {
  fs.renameSync(stageFile(file, content), file);
}

/**
 * Undo the spec.md status line after metadata.json could not be written, but
 * only if spec.md still holds exactly what this reopen wrote: another writer's
 * edit is never overwritten, it is reported instead.
 */
function restoreSpec(specFile: string, specBefore: string, specAfter: string, cause: unknown, beforeRestore?: () => void): void {
  const why = cause instanceof Error ? cause.message : String(cause);
  let tmp: string;
  try {
    tmp = stageFile(specFile, specBefore);
  } catch (stageError) {
    throw new Error(`${why}; restoring ${specFile} also failed: ${stageError instanceof Error ? stageError.message : String(stageError)}`);
  }
  try {
    beforeRestore?.();
    if (readOr(specFile, '') !== specAfter) {
      throw new Error(`${why}; ${specFile} was edited by another writer meanwhile and is left as it is. Its frontmatter says status: planned while metadata.json still says completed: run specweave reopen again, or set the line back to completed.`);
    }
    fs.renameSync(tmp, specFile);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/**
 * Set the frontmatter `status:` line, leaving every other byte as it was. A spec
 * with no frontmatter, or no top-level status line in it, is returned unchanged:
 * 3.0 specs keep their status in metadata.json only.
 */
export function withFrontmatterStatus(content: string, status: string): string {
  const open = content.match(/^---(\r?\n)/);
  if (!open) return content;
  const start = open[0].length;
  const close = /(^|\r?\n)---[ \t]*(\r?\n|$)/g;
  close.lastIndex = start - open[1].length;
  const end = close.exec(content);
  if (!end) return content;
  const frontmatter = content.slice(start, end.index);
  const updated = frontmatter.replace(/^status:[^\r\n]*/m, `status: ${status}`);
  return updated === frontmatter ? content : content.slice(0, start) + updated + content.slice(end.index);
}

function acquireLock(dir: string, id: string): () => void {
  const lock = path.join(dir, LOCK_FILE);
  let fd: number;
  try {
    fd = fs.openSync(lock, 'wx');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new ReopenRefused('busy', `Another reopen of ${id} is running (${lock}). If none is, delete that file and run again.`);
    }
    throw e;
  }
  fs.writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
  fs.closeSync(fd);
  return () => fs.rmSync(lock, { force: true });
}

export function reopenIncrement(opts: ReopenOptions): ReopenResult {
  const env = opts.env ?? process.env;
  const reason = opts.reason?.trim() ?? '';
  if (!reason) throw new ReopenRefused('no-reason', 'Say why with --reason "<text>"; it is kept in metadata.reopened.');

  const root = workspaceRoot(opts.workspace ?? env.SPECWEAVE_WORKSPACE);
  const resolved = resolveIncrementId(opts.incrementId, root);
  if (Array.isArray(resolved)) {
    throw new ReopenRefused('not-found', `"${opts.incrementId}" matches ${resolved.join(', ')} in ${root}; use the full id.`);
  }
  if (!resolved) throw new ReopenRefused('not-found', `No increment "${opts.incrementId}" in workspace ${root}.`);
  const id = resolved;
  const dir = canonicalPath(path.join(root, '.specweave', 'increments', id));
  if (!isWithin(root, dir)) {
    throw new ReopenRefused('outside-workspace', `${id} resolves outside workspace ${root} (${dir}); reopen it from the workspace that owns it.`);
  }
  const metadataFile = path.join(dir, 'metadata.json');
  const specFile = path.join(dir, 'spec.md');
  const ledgerFile = ledgerPath(dir);
  for (const file of [metadataFile, specFile, ledgerFile]) {
    if (entryKind(file) === 'other') {
      throw new ReopenRefused('outside-workspace', `${file} is a symlink or not a regular file; reopen only rewrites real files inside the workspace.`);
    }
  }
  if (entryKind(metadataFile) === 'missing') {
    throw new ReopenRefused('not-completed', `${id} has no metadata.json, so it was never completed.`);
  }

  const release = acquireLock(dir, id);
  try {
    const metadataBefore = fs.readFileSync(metadataFile, 'utf8');
    const raw = JSON.parse(metadataBefore) as Record<string, any>;
    const status = normalStatus(raw.status);
    const limit = activeLimit(root);

    if (status === IncrementStatus.PLANNED && Array.isArray(raw.reopened) && raw.reopened.length) {
      const last = raw.reopened[raw.reopened.length - 1] as ReopenRecord;
      return {
        id, root, from: IncrementStatus.COMPLETED, to: IncrementStatus.PLANNED, at: last.at, by: last.by, reason: last.reason,
        previous: { approvedAt: last.approvedAt, closeReason: last.closeReason, readyForReviewAt: last.readyForReviewAt },
        unfinished: unfinishedTasks(dir), unchanged: true, active: { count: activeCount(root), limit },
      };
    }
    if (status !== IncrementStatus.COMPLETED) {
      const hint = status === IncrementStatus.ABANDONED ? ' An abandoned increment comes back with specweave resume.' : '';
      throw new ReopenRefused('not-completed', `${id} is ${status || 'unknown'}; only a completed increment can be reopened.${hint}`);
    }

    const by = getAgentId(env);
    const ledgerBefore = readOr(ledgerFile, '');
    const unfinished = unfinishedTasks(dir);
    const foreign = unfinished.filter((t) => HELD.has(t.status) && t.by && t.by !== by);
    if (foreign.length) {
      throw new ReopenRefused(
        'foreign-owner',
        `${id} has tasks held by another agent: ${foreign.map((t) => `${t.task} ${t.status} by ${t.by}`).join(', ')}. ` +
          `Only that agent can reopen it (you are ${by}); ownership moves with specweave task release, not here.`,
        foreign,
      );
    }

    const at = (opts.now ?? new Date()).toISOString();
    const previous: ReopenResult['previous'] = {};
    for (const key of CLOSURE_FIELDS) if (raw[key]) previous[key] = raw[key];
    const record: ReopenRecord = { from: IncrementStatus.COMPLETED, to: IncrementStatus.PLANNED, at, by, reason, ...previous };
    const next: Record<string, any> = {
      ...raw,
      status: IncrementStatus.PLANNED,
      lastActivity: at,
      updated: at,
      reopened: [...(Array.isArray(raw.reopened) ? raw.reopened : []), record],
    };
    for (const key of CLOSURE_FIELDS) delete next[key];
    const metadataAfter = JSON.stringify(next, null, 2) + (metadataBefore.endsWith('\n') ? '\n' : '');

    const specBefore = entryKind(specFile) === 'file' ? fs.readFileSync(specFile, 'utf8') : undefined;
    const specAfter = specBefore === undefined ? undefined : withFrontmatterStatus(specBefore, IncrementStatus.PLANNED);
    const specChanged = specBefore !== undefined && specAfter !== specBefore;

    // Stage and flush both files first, so the re-check below is followed only by renames.
    const staged: string[] = [];
    let specCommitted = false;
    try {
      const metadataTmp = stageFile(metadataFile, metadataAfter);
      staged.push(metadataTmp);
      const specTmp = specChanged ? stageFile(specFile, specAfter!) : undefined;
      if (specTmp) staged.push(specTmp);
      opts.hooks?.beforeCommit?.();
      if (readOr(ledgerFile, '') !== ledgerBefore || fs.readFileSync(metadataFile, 'utf8') !== metadataBefore
        || (specBefore !== undefined && readOr(specFile, '') !== specBefore)) {
        throw new ReopenRefused('changed', `${id} changed while it was being reopened (a ledger, metadata or spec write); nothing was changed. Run it again.`);
      }
      if (specTmp) {
        fs.renameSync(specTmp, specFile);
        specCommitted = true;
        opts.hooks?.afterSpecCommit?.();
      }
      fs.renameSync(metadataTmp, metadataFile);
    } catch (e) {
      for (const tmp of staged) fs.rmSync(tmp, { force: true });
      if (specCommitted) restoreSpec(specFile, specBefore!, specAfter!, e, opts.hooks?.beforeRestore);
      throw e;
    }

    return { id, root, from: IncrementStatus.COMPLETED, to: IncrementStatus.PLANNED, at, by, reason, previous, unfinished, unchanged: false, active: { count: activeCount(root), limit } };
  } finally {
    release();
  }
}
