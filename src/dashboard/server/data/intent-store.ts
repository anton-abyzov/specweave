import { isValidWorkIntent, getIntentRecordId } from '../../../core/intent/validation.js';
import { readLocalSessions } from './local-sessions.js';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  WORK_STATES,
  type ExecutionSegment,
  type WorkBoardPayload,
  type WorkIntent,
  type WorkItem,
  type WorkState,
} from '../../work-types.js';
import { projectIncrement } from './work-projection.js';

export class WorkError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const EMPTY_TASKS = { total: 0, done: 0, skipped: 0, claimed: 0, blocked: 0, stale: 0, open: 0 };
function field(value: unknown, name: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new WorkError(`${name} is required`);
    return '';
  }
  if (typeof value !== 'string' || value.length > max)
    throw new WorkError(`${name} must be text, at most ${max} characters`);
  const text = value.trim();
  if (required && !text) throw new WorkError(`${name} is required`);
  return text;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkError('Expected an object');
  return value as Record<string, unknown>;
}
function state(value: unknown): WorkState {
  if (!WORK_STATES.includes(value as WorkState)) throw new WorkError('Invalid work state');
  return value as WorkState;
}

interface IntentHistory {
  intents: Map<string, WorkIntent>;
  warnings: string[];
  corruptIds: Set<string>;
  unreadable: boolean;
}

/** Portable append-only intent snapshots. Synchronous compare-and-append prevents lost browser updates. */
export class IntentStore {
  private file: string;
  constructor(private root: string) {
    this.file = path.join(root, '.specweave/intents/board.jsonl');
  }

  private read(): IntentHistory {
    const intents = new Map<string, WorkIntent>();
    const warnings: string[] = [];
    const corruptIds = new Set<string>();
    const history = { intents, warnings, corruptIds, unreadable: false };
    if (!fs.existsSync(this.file)) return history;
    let contents: string;
    try { contents = fs.readFileSync(this.file, 'utf8'); }
    catch {
      warnings.push('Intent history could not be read. Changes are blocked until it is readable.');
      return { ...history, unreadable: true };
    }
    for (const [index, line] of contents
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .entries()) {
      if (!line.trim()) continue;
      try {
        const value: unknown = JSON.parse(line);
        if (!isValidWorkIntent(value)) {
          const corruptId = getIntentRecordId(value);
          if (corruptId) corruptIds.add(corruptId);
          throw new Error('invalid record');
        }
        if (value.revision > (intents.get(value.id)?.revision ?? 0)) intents.set(value.id, value);
      } catch {
        warnings.push(`Intent history line ${index + 1} could not be read.`);
      }
    }
    return history;
  }

  private assertWritable(history: IntentHistory, id?: string): void {
    if (history.unreadable || (id && history.corruptIds.has(id))) {
      throw new WorkError('Intent history is corrupt or unreadable. Inspect board.jsonl before changing this work.', 409);
    }
  }

  board(): WorkBoardPayload {
    const { intents, warnings } = this.read();
    const items: WorkItem[] = [];
    const linked = new Set([...intents.values()].map((i) => i.incrementId).filter(Boolean));
    const base = path.join(this.root, '.specweave/increments');
    if (fs.existsSync(base)) {
      for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
        if (
          !entry.isDirectory() ||
          !/^\d/.test(entry.name) ||
          linked.has(entry.name) ||
          intents.has(`increment:${entry.name}`)
        )
          continue;
        try {
          const item = projectIncrement(this.root, entry.name);
          if (item && item.incrementStatus !== 'abandoned') items.push(item);
        } catch {
          warnings.push(`Increment ${entry.name} could not be read.`);
        }
      }
    }
    const observed = [...intents.values()].some((i) => i.sessionRefs?.length)
      ? readLocalSessions(this.root)
      : [];
    for (const intent of intents.values()) {
      const increment = intent.incrementId ? projectIncrement(this.root, intent.incrementId) : null;
      if (intent.incrementId && !increment)
        warnings.push(`${intent.title}: linked increment is unavailable.`);
      items.push({
        ...(increment || {
          tasks: { ...EMPTY_TASKS },
          acs: { total: 0, done: 0 },
          verification: { status: 'missing', ranAt: null },
          evidenceCount: 0,
          handoff: null,
          incrementStatus: null,
        }),
        ...intent,
        source: 'intent',
        executions: [
          ...(increment?.executions || []),
          ...intent.executions,
          ...observed
            .filter((session) => intent.sessionRefs?.includes(session.key))
            .flatMap((session) => session.segments),
        ].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
      });
    }
    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const counts = Object.fromEntries(
      WORK_STATES.map((s) => [s, items.filter((i) => i.state === s).length]),
    ) as Record<WorkState, number>;
    // Several intents may link one increment; engineering totals count it once.
    const unique = [...new Map(items.filter((i) => i.incrementId).map((i) => [i.incrementId, i])).values()];
    return {
      items,
      counts,
      totals: {
        tasks: unique.reduce((sum, i) => sum + i.tasks.total, 0),
        done: unique.reduce((sum, i) => sum + i.tasks.done, 0),
        verified: unique.filter((i) => i.verification.status === 'passed').length,
        handoffs: items.reduce((sum, i) => sum + Math.max(0, i.executions.length - 1), 0),
      },
      generatedAt: new Date().toISOString(),
      warnings,
    };
  }

  create(input: unknown): WorkIntent {
    return this.withWriteLock(() => this.createUnlocked(input));
  }

  private createUnlocked(input: unknown): WorkIntent {
    const data = object(input);
    this.assertWritable(this.read());
    const incrementId = field(data.incrementId, 'Increment', 180) || null;
    const increment = incrementId ? projectIncrement(this.root, incrementId) : null;
    if (incrementId && !increment) throw new WorkError('Linked increment does not exist');
    return this.append({
      id: randomUUID(),
      title: field(data.title, 'Title', 180, true),
      summary: field(data.summary, 'Summary', 2000),
      state: data.state === undefined ? 'backlog' : state(data.state),
      incrementId: increment?.incrementId ?? null,
      updatedAt: new Date().toISOString(),
      revision: 1,
      executions: [],
    });
  }

  update(id: string, input: unknown): WorkIntent {
    return this.withWriteLock(() => this.updateUnlocked(id, input));
  }

  private updateUnlocked(id: string, input: unknown): WorkIntent {
    const data = object(input);
    const history = this.read();
    this.assertWritable(history, id);
    const stored = history.intents.get(id);
    const projected =
      stored ??
      (id.startsWith('increment:') ? projectIncrement(this.root, id.slice('increment:'.length)) : null);
    if (!projected) throw new WorkError('Intent not found', 404);
    if (data.revision !== projected.revision)
      throw new WorkError('Work changed in another window. Refresh and try again.', 409);
    const next: WorkIntent = {
      id: projected.id,
      title: projected.title,
      summary: projected.summary,
      state: projected.state,
      incrementId: projected.incrementId,
      updatedAt: new Date().toISOString(),
      revision: projected.revision + 1,
      executions: stored?.executions ?? [],
      sessionRefs: stored?.sessionRefs ?? [],
    };
    if ('title' in data) next.title = field(data.title, 'Title', 180, true);
    if ('summary' in data) next.summary = field(data.summary, 'Summary', 2000);
    if ('state' in data) next.state = state(data.state);
    if ('incrementId' in data) {
      const incrementId = field(data.incrementId, 'Increment', 180);
      const increment = incrementId ? projectIncrement(this.root, incrementId) : null;
      if (incrementId && !increment) throw new WorkError('Linked increment does not exist');
      next.incrementId = increment?.incrementId ?? null;
    }
    if ('sessionRef' in data) {
      const ref = field(data.sessionRef, 'Session reference', 300, true);
      if (!readLocalSessions(this.root).some((session) => session.key === ref))
        throw new WorkError('Session is unavailable in this project');
      next.sessionRefs = [...new Set([...(next.sessionRefs ?? []), ref])];
    }
    // Board workflow does not change increment metadata or fabricate verification.
    return this.append(next);
  }

  addExecution(id: string, input: unknown): WorkIntent {
    return this.withWriteLock(() => this.addExecutionUnlocked(id, input));
  }

  private addExecutionUnlocked(id: string, input: unknown): WorkIntent {
    const data = object(input);
    const history = this.read();
    this.assertWritable(history, id);
    const stored = history.intents.get(id);
    const current = stored ?? this.board().items.find((i) => i.id === id);
    if (!current) throw new WorkError('Intent not found', 404);
    if (data.revision !== current.revision)
      throw new WorkError('Work changed in another window. Refresh and try again.', 409);
    const segment: ExecutionSegment = {
      id: randomUUID(),
      sessionId: field(data.sessionId, 'Session', 200) || null,
      harness: field(data.harness, 'Harness', 120, true),
      model: field(data.model, 'Model', 120) || null,
      effort: field(data.effort, 'Effort', 80) || null,
      provider: field(data.provider, 'Provider', 120) || null,
      surface: field(data.surface, 'Surface', 120) || null,
      actor: field(data.actor, 'Actor', 120) || 'user',
      source: 'declared',
      startedAt: new Date().toISOString(),
      note: field(data.note, 'Note', 500),
    };
    return this.append({
      id: current.id,
      title: current.title,
      summary: current.summary,
      state: current.state,
      incrementId: current.incrementId,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      executions: [...(stored?.executions ?? []), segment],
      sessionRefs: stored?.sessionRefs ?? [],
    });
  }

  /** CLI and dashboard are separate writers; revision checks must be inside the same lock. */
  private withWriteLock<T>(operation: () => T): T {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const lock = `${this.file}.lock`;
    let fd: number;
    try { fd = fs.openSync(lock, 'wx', 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST')
        throw new WorkError('Work is being edited. Retry; inspect board.jsonl.lock if a writer was interrupted.', 409);
      throw error;
    }
    try {
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      return operation();
    } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }

  private append(intent: WorkIntent): WorkIntent {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    // An interrupted append or a text editor may leave the final record unterminated.
    // Preserve it verbatim, but keep the next acknowledged snapshot on its own line.
    const fd = fs.openSync(this.file, 'a+');
    try {
      const size = fs.fstatSync(fd).size;
      const last = Buffer.alloc(1);
      const separator = size > 0 && fs.readSync(fd, last, 0, 1, size - 1) === 1 && last[0] !== 10
        ? '\n' : '';
      fs.appendFileSync(fd, separator + JSON.stringify(intent) + '\n', 'utf8');
    } finally {
      fs.closeSync(fd);
    }
    return intent;
  }
}
