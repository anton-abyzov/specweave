/**
 * Durable, number-only reservations. Exclusive files coordinate processes and
 * linked Git worktrees; separate clones/machines intentionally remain independent.
 * A crash may leave a gap, never a stale lock or a number available for reuse.
 */
import fs from 'node:fs';
import * as path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { formatIncrementNumber, parseIncrementId } from '../../utils/increment-id-validator.js';

const LIFECYCLES = ['', '_archive', '_abandoned', '_paused', '_backlog'];
export interface ReservationScope { directory: string; roots: string[] }
export interface IncrementReservation { id: string; uuid: string; path: string }

function git(root: string, args: string[]): string {
  // Hooks may inherit Git's checkout variables; the requested planning root is
  // authoritative, otherwise a foreign GIT_DIR can split or misdirect allocation.
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_COMMON_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_PREFIX']) delete env[key];
  return execFileSync('git', ['-C', root, ...args], {
    env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000,
  }).trim();
}

export function reservationScope(projectRoot: string): ReservationScope {
  const root = fs.realpathSync(projectRoot);
  let top: string;
  try { top = fs.realpathSync(git(root, ['rev-parse', '--show-toplevel'])); }
  catch (error) {
    for (let dir = root; ; dir = path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, '.git'))) throw error;
      if (path.dirname(dir) === dir) break;
    }
    return { directory: path.join(root, '.specweave/state/increment-reservations'), roots: [root] };
  }
  // Once Git identifies a repository, failing to enumerate it must not silently
  // switch to a separate allocator (which could issue the same number).
  const common = fs.realpathSync(path.resolve(root, git(root, ['rev-parse', '--git-common-dir'])));
  const relativeRoot = path.relative(top, root);
  const key = createHash('sha256').update(relativeRoot || '.').digest('hex').slice(0, 24);
  const worktrees = git(root, ['worktree', 'list', '--porcelain', '-z']).split('\0')
    .filter((line) => line.startsWith('worktree ')).map((line) => line.slice(9));
  const roots = [...new Set([root, ...worktrees.map((worktree) => path.resolve(worktree, relativeRoot))])];
  return { directory: path.join(common, 'specweave/increment-reservations', key), roots };
}

function existingNumbers(scope: ReservationScope): Set<number> {
  const numbers = new Set<number>();
  for (const root of scope.roots) {
    for (const lifecycle of LIFECYCLES) {
      const dir = path.join(root, '.specweave/increments', lifecycle);
      let entries: fs.Dirent[];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
      catch (error: any) { if (error.code === 'ENOENT') continue; throw error; }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const parsed = parseIncrementId(entry.name, { allowLegacy: true });
        if (parsed) numbers.add(parsed.number);
      }
    }
  }
  // Empty/partial files still reserve their number after interruption.
  for (const entry of fs.readdirSync(scope.directory)) {
    if (!/^\d+\.json$/.test(entry)) continue;
    const number = Number(entry.slice(0, -5));
    if (Number.isSafeInteger(number) && number > 0) numbers.add(number);
  }
  return numbers;
}

/** Reserve before creating any increment files. Tickets are intentionally permanent. */
export function reserveIncrement(projectRoot: string, options: { name?: string; id?: string }): IncrementReservation {
  if ((options.id === undefined) === (options.name === undefined)) throw new Error('Pass either increment id or name');
  const explicit = options.id === undefined ? null : parseIncrementId(options.id, { allowLegacy: true });
  if (options.id !== undefined && !explicit) throw new Error(`Invalid increment ID format: ${options.id}`);
  if (options.name !== undefined && !parseIncrementId(`0001-${options.name}`)) throw new Error(`Invalid increment name: ${options.name}`);
  const scope = reservationScope(projectRoot);
  fs.mkdirSync(scope.directory, { recursive: true, mode: 0o700 });
  const existing = existingNumbers(scope);
  let maximum = 0;
  for (const number of existing) maximum = Math.max(maximum, number);
  let candidate = explicit?.number ?? maximum + 1;
  if (explicit && existing.has(candidate)) throw new Error(`DUPLICATE INCREMENT ID: number ${candidate} already exists or is reserved in this workspace`);
  for (;;) {
    const number = formatIncrementNumber(candidate);
    const id = options.id ?? `${number}-${options.name}`;
    const uuid = randomUUID();
    const ticket = path.join(scope.directory, `${number}.json`);
    let fd: number;
    try { fd = fs.openSync(ticket, 'wx', 0o600); }
    catch (error: any) {
      if (error.code !== 'EEXIST') throw error;
      if (explicit) throw new Error(`DUPLICATE INCREMENT ID: number ${number} is already reserved in this workspace`);
      candidate++;
      continue;
    }
    try {
      fs.writeFileSync(fd, JSON.stringify({ version: 1, id, uuid, number: candidate, created: new Date().toISOString() }) + '\n');
      fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
    return { id, uuid, path: ticket };
  }
}
