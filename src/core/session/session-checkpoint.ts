/** Local, session-owned recovery snapshots. Scheduling never waits for Git or a model. */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scrubSecrets } from './handoff-secret-scrub.js';
import { studioThreadId } from './usage-guard.js';

export const CHECKPOINT_INTERVAL_MS = 5 * 60_000;
export const CHECKPOINT_WORKER_TIMEOUT_MS = 8_000;
export const CHECKPOINT_LOCK_STALE_MS = 15_000;
export const CHECKPOINT_MAX_WORKERS = 4;

export interface CheckpointInput {
  session_id?: string;
  sessionId?: string;
  cwd?: string;
  workspaceRoot?: string;
  last_assistant_message?: string;
}

export interface CheckpointOptions { home?: string; now?: number }

export interface CheckpointReceipt {
  version: 1;
  sessionId: string;
  cwd: string;
  savedAt: string;
  docPath: string;
  diffPath: string;
  incrementId?: string;
  /** Set when SpecWeave Studio ran the session; Studio reads `studio/<thread>.json`. */
  studioThreadId?: string;
}

interface Lease { token: string; at: number; ticket?: number }
export interface CheckpointRequest {
  version: 1;
  sessionId: string;
  cwd: string;
  directory: string;
  generation: string;
  token: string;
  slot: string;
  summary?: string;
  studioThreadId?: string;
}

/** Resolve symlinks and the nearest Git worktree without invoking Git in the hook. */
function checkpointIdentity(input: CheckpointInput): { sessionId: string; cwd: string } | undefined {
  const sessionId = input.session_id ?? input.sessionId;
  if (typeof sessionId !== 'string' || !/^[\w.-]{1,128}$/.test(sessionId) || sessionId.includes('..')) return undefined;
  const start = input.cwd ?? input.workspaceRoot ?? process.cwd();
  if (typeof start !== 'string' || !path.isAbsolute(start)) return undefined;
  try {
    const original = fs.realpathSync(start);
    if (!fs.statSync(original).isDirectory()) return undefined;
    let current = original;
    while (true) {
      if (fs.existsSync(path.join(current, '.git'))) return { sessionId, cwd: current };
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    // Plain folders can still preserve a summary; no recursive project scan.
    return { sessionId, cwd: original };
  } catch { return undefined; }
}

export function checkpointsDirectory(home = os.homedir()): string {
  return path.join(home, '.specweave', 'checkpoints');
}

export function checkpointDirectory(input: CheckpointInput, opts: CheckpointOptions = {}): string | undefined {
  const identity = checkpointIdentity(input);
  if (!identity) return undefined;
  const key = createHash('sha256').update(identity.cwd).update('\0').update(identity.sessionId).digest('hex');
  return path.join(checkpointsDirectory(opts.home), key);
}

function readJson<T>(file: string): T | undefined {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return undefined; }
}

/** Where Studio finds the newest checkpoint of one of its threads, whichever provider wrote it. */
export function studioCheckpointFile(threadId: string, home = os.homedir()): string {
  return studioPointer(checkpointsDirectory(home), threadId);
}

function studioPointer(checkpoints: string, threadId: string): string {
  return path.join(checkpoints, 'studio', `${threadId.replace(/[^\w.-]/g, '_')}.json`);
}

export function readSessionCheckpoint(input: CheckpointInput, opts: CheckpointOptions = {}): CheckpointReceipt | undefined {
  const directory = checkpointDirectory(input, opts);
  if (!directory) return undefined;
  const receipt = readJson<CheckpointReceipt>(path.join(directory, 'current.json'));
  return receipt?.version === 1 && typeof receipt.savedAt === 'string' && typeof receipt.docPath === 'string'
    && typeof receipt.diffPath === 'string' && fs.existsSync(receipt.docPath) && fs.existsSync(receipt.diffPath) ? receipt : undefined;
}

/**
 * The newest checkpoint any session saved for `cwd` (resolved like the hooks
 * resolve it), so `pickup` can offer it after a session died at the limit.
 */
export function latestCheckpointFor(cwd: string, opts: CheckpointOptions = {}): CheckpointReceipt | undefined {
  const identity = checkpointIdentity({ sessionId: 'any', cwd });
  if (!identity) return undefined;
  const root = checkpointsDirectory(opts.home);
  let best: CheckpointReceipt | undefined;
  let names: string[];
  try { names = fs.readdirSync(root); } catch { return undefined; }
  for (const name of names) {
    if (name.startsWith('.') || name === 'studio') continue;
    const receipt = readJson<CheckpointReceipt>(path.join(root, name, 'current.json'));
    if (receipt?.version !== 1 || receipt.cwd !== identity.cwd || typeof receipt.savedAt !== 'string') continue;
    if (!fs.existsSync(receipt.docPath)) continue;
    if (!best || Date.parse(receipt.savedAt) > Date.parse(best.savedAt)) best = receipt;
  }
  return best;
}

function leaseMatches(file: string, token: string): boolean {
  const lease = readJson<Lease>(path.join(file, `${token}.json`));
  return lease?.token === token && typeof lease.ticket === 'number';
}

function releaseLease(file: string, token: string): void {
  // Every contender owns a distinct filename, including after stale recovery.
  for (const suffix of ['json', 'ready']) {
    try { fs.unlinkSync(path.join(file, `${token}.${suffix}`)); } catch { /* already gone */ }
  }
  try { fs.rmdirSync(file); } catch { /* another contender still owns this directory */ }
}

function acquireLease(file: string, token: string, now: number): boolean {
  try {
    // A short bakery election: announce choosing first, then select one greater
    // than every existing ticket. Concurrent choosers cause a safe retry; the
    // stable lowest (ticket, token) wins. No shared filename is ever unlinked.
    fs.mkdirSync(file, { recursive: true, mode: 0o700 });
    const own = path.join(file, `${token}.json`);
    fs.writeFileSync(own, JSON.stringify({ token, at: now }), { flag: 'wx', mode: 0o600 });
    const candidates = (): Lease[] => {
      const leases: Lease[] = [];
      for (const name of fs.readdirSync(file)) {
        if (!name.endsWith('.json')) continue;
        const candidate = path.join(file, name);
        try {
          if (Date.now() - fs.statSync(candidate).mtimeMs > CHECKPOINT_LOCK_STALE_MS) {
            fs.unlinkSync(candidate);
            continue;
          }
          // A half-written contender must also prevent concurrent ownership.
          leases.push(readJson<Lease>(candidate) ?? { token: name, at: now });
        } catch { /* a contender finished between readdir and read */ }
      }
      return leases;
    };
    const ticket = 1 + Math.max(0, ...candidates().map((lease) => lease.ticket ?? 0));
    const ready = path.join(file, `${token}.ready`);
    fs.writeFileSync(ready, JSON.stringify({ token, at: now, ticket }), { flag: 'wx', mode: 0o600 });
    fs.renameSync(ready, own);
    if (candidates().some((lease) => lease.token !== token &&
      (lease.ticket === undefined || lease.ticket < ticket || (lease.ticket === ticket && lease.token < token)))) {
      releaseLease(file, token);
      return false;
    }
    return true;
  } catch { releaseLease(file, token); return false; }
}

/** @internal Reserve a bounded worker slot and persist only scrubbed worker input. */
export function prepareSessionCheckpoint(input: CheckpointInput, opts: CheckpointOptions = {}): string | undefined {
  const identity = checkpointIdentity(input);
  const directory = checkpointDirectory(input, opts);
  if (!identity || !directory) return;
  const now = opts.now ?? Date.now();
  const previous = readSessionCheckpoint(input, opts);
  const savedAt = previous ? Date.parse(previous.savedAt) : NaN;
  if (Number.isFinite(savedAt) && now >= savedAt && now - savedAt < CHECKPOINT_INTERVAL_MS) return;
  const token = randomUUID();
  const lock = path.join(directory, 'pending.lock');
  if (!acquireLease(lock, token, now)) return;
  let slot: string | undefined;
  let requestPath: string | undefined;
  try {
    // A worker can have finished between our initial receipt read and election.
    const latest = readSessionCheckpoint(input, opts);
    const latestAt = latest ? Date.parse(latest.savedAt) : NaN;
    const afterLease = opts.now ?? Date.now();
    if (Number.isFinite(latestAt) && afterLease >= latestAt && afterLease - latestAt < CHECKPOINT_INTERVAL_MS) {
      releaseLease(lock, token);
      return;
    }
    const slots = path.join(checkpointsDirectory(opts.home), '.workers');
    for (let i = 0; i < CHECKPOINT_MAX_WORKERS; i++) {
      const candidate = path.join(slots, `${i}.lock`);
      if (acquireLease(candidate, token, now)) { slot = candidate; break; }
    }
    if (!slot) { releaseLease(lock, token); return; }
    const generation = `snapshot-${now}-${token}`;
    const summary = typeof input.last_assistant_message === 'string'
      ? scrubSecrets(input.last_assistant_message.slice(0, 32_000)).scrubbed : undefined;
    const studio = studioThreadId();
    const request: CheckpointRequest = {
      version: 1, ...identity, directory, generation, token, slot, ...(summary ? { summary } : {}), ...(studio ? { studioThreadId: studio } : {}),
    };
    requestPath = path.join(directory, `request-${token}.json`);
    fs.writeFileSync(requestPath, JSON.stringify(request), { flag: 'wx', mode: 0o600 });
    return requestPath;
  } catch {
    if (requestPath) cleanupCheckpointRequest(requestPath);
    else {
      releaseLease(lock, token);
      if (slot) releaseLease(slot, token);
    }
  }
}

/** Queue at most one capture per session/worktree and four per user. All errors fail open. */
export function queueSessionCheckpoint(input: CheckpointInput, opts: CheckpointOptions = {}): void {
  const requestPath = prepareSessionCheckpoint(input, opts);
  if (!requestPath) return;
  try {
    const worker = fileURLToPath(new URL('./checkpoint-worker.js', import.meta.url));
    if (!fs.existsSync(worker)) throw new Error('checkpoint worker is not built');
    const child = spawn(process.execPath, [worker, requestPath], { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', () => cleanupCheckpointRequest(requestPath));
    child.unref();
  } catch { cleanupCheckpointRequest(requestPath); }
}

/** Called by the supervisor on success, failure, or its hard deadline. */
export function cleanupCheckpointRequest(requestPath: string): void {
  const request = readJson<CheckpointRequest>(requestPath);
  if (!request || request.version !== 1) return;
  releaseLease(path.join(request.directory, 'pending.lock'), request.token);
  releaseLease(request.slot, request.token);
  const generationDir = path.join(request.directory, request.generation);
  const receipt = readJson<CheckpointReceipt>(path.join(request.directory, 'current.json'));
  if (!receipt || path.dirname(receipt.docPath) !== generationDir) {
    try { fs.rmSync(generationDir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  try { fs.unlinkSync(requestPath); } catch { /* already removed */ }
}

/** Worker entry: publish the receipt last, so interruption leaves the previous snapshot usable. */
export async function runSessionCheckpoint(requestPath: string): Promise<void> {
  const request = readJson<CheckpointRequest>(requestPath);
  if (!request || request.version !== 1 || !leaseMatches(path.join(request.directory, 'pending.lock'), request.token)) return;
  const generationDir = path.join(request.directory, request.generation);
  const previous = readJson<CheckpointReceipt>(path.join(request.directory, 'current.json'));
  let published = false;
  try {
    fs.mkdirSync(generationDir, { mode: 0o700 });
    const { buildWorkHandoff } = await import('./work-handoff.js');
    const result = await buildWorkHandoff(request.cwd, {
      checkpoint: true, checkpointRoot: request.cwd, push: false, keepClaims: true,
      out: path.join(generationDir, 'handoff.md'), reason: 'automatic local session checkpoint', summary: request.summary,
    });
    if (!fs.statSync(result.docPath).size || !fs.existsSync(result.diffPath)) throw new Error('incomplete checkpoint');
    if (!leaseMatches(path.join(request.directory, 'pending.lock'), request.token)) return;
    const receipt: CheckpointReceipt = {
      version: 1, sessionId: request.sessionId, cwd: request.cwd, savedAt: new Date().toISOString(),
      docPath: result.docPath, diffPath: result.diffPath, ...(result.incrementId ? { incrementId: result.incrementId } : {}),
      ...(request.studioThreadId ? { studioThreadId: request.studioThreadId } : {}),
    };
    const temporary = path.join(request.directory, `current-${request.token}.json`);
    fs.writeFileSync(temporary, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, path.join(request.directory, 'current.json'));
    published = true;
    if (request.studioThreadId) {
      // One pointer per Studio thread: a Claude turn and the Codex turn after it share it.
      const pointer = studioPointer(path.dirname(request.directory), request.studioThreadId);
      try {
        fs.mkdirSync(path.dirname(pointer), { recursive: true, mode: 0o700 });
        const next = `${pointer}.${request.token}`;
        fs.writeFileSync(next, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        fs.renameSync(next, pointer);
      } catch { /* the per-session receipt is already published */ }
    }
    // Retain the preceding generation for recovery; prune only our old snapshot directories.
    const keep = new Set([generationDir, previous && path.dirname(previous.docPath)]);
    for (const name of fs.readdirSync(request.directory)) {
      const file = path.join(request.directory, name);
      if (name.startsWith('snapshot-') && !keep.has(file)) fs.rmSync(file, { recursive: true, force: true });
    }
  } catch {
    if (!published) try { fs.rmSync(generationDir, { recursive: true, force: true }); } catch { /* preserve existing receipt */ }
  }
}
