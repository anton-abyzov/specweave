/**
 * Task Ledger — append-only per-increment event log (SpecWeave 2.0).
 *
 * `.specweave/increments/<id>/ledger.jsonl` is the ONLY mutable task state.
 * One JSON object per line:
 *
 *   {"t":"T-01","e":"claim","by":"claude@mbp","at":"2026-09-02T10:00:00Z","note":"…","evidence":"…"}
 *
 * Any agent from any vendor participates by appending a line — via
 * `specweave task …` or a plain `echo '…' >> ledger.jsonl`. Lines are never
 * edited or deleted; state is DERIVED by {@link foldLedger}.
 *
 * Increment-level events use the task id `*` and never change task state:
 *
 *   note     a message for whoever works on this increment next (another
 *            thread, tool or account). `specweave note` writes it.
 *   session  a tool session picked the increment up (`specweave pickup`).
 *   handoff  a session handed the increment off (`specweave handoff`).
 *   pickup   a session picked up a handoff (`specweave pickup`).
 *   wait     the increment waits on a person (`note` says on whom and for
 *            what). A `wait` whose note is empty, `none`, `cleared` or
 *            `resolved` clears the earlier ones. `handoff --all` lists them.
 *
 * Writes are single-line O_APPEND appends (same rationale as
 * core/sync/event-queue.ts): atomic for short lines on every major OS, so two
 * agents in one working tree never tear each other's lines. Across worktrees or
 * clones, `.gitattributes` `merge=union` concatenates both sides and the fold is
 * order-independent (events are sorted by timestamp before folding).
 *
 * @module core/tasks/ledger
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { touchIncrementUpdated } from './increment-updated.js';
import { recordIncrementWork } from './work-session.js';

export type TaskEventType = 'claim' | 'done' | 'release' | 'block' | 'skip';
export type IncrementEventType = 'note' | 'session' | 'handoff' | 'pickup' | 'wait';
export type LedgerEventType = TaskEventType | IncrementEventType;

/** Task id used by increment-level events (notes, sessions, handoffs). */
export const INCREMENT_EVENT_TASK = '*';

export interface LedgerEvent {
  /** Task id, e.g. `T-01`. */
  t: string;
  /** Event type. */
  e: LedgerEventType;
  /** Agent id (see {@link getAgentId}). */
  by: string;
  /** ISO-8601 timestamp (UTC). */
  at: string;
  /** Free-text note (block reason, release reason, …). */
  note?: string;
  /** Evidence for `done`: commit sha, test command + tail, … Required for `done`. */
  evidence?: string;
  /** Card text: one line, at most {@link MAX_CARD_LINE} chars (longer text is truncated). */
  line?: string;
  /** Card link: PR URL, report path, artifact URL … */
  link?: string;
  /** Model the writing agent ran on, when its environment names one (see {@link detectModel}). */
  model?: string;
}

/** Longest card line kept in the ledger; longer text is truncated with `…`. */
export const MAX_CARD_LINE = 100;

/** One-line card text capped at {@link MAX_CARD_LINE}. `truncated` lets callers warn. */
export function clampCardLine(text: string): { line: string; truncated: boolean } {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= MAX_CARD_LINE) return { line: flat, truncated: false };
  return { line: flat.slice(0, MAX_CARD_LINE - 1).trimEnd() + '…', truncated: true };
}

export type TaskLedgerStatus = 'open' | 'claimed' | 'stale' | 'blocked' | 'done' | 'skipped';

export interface TaskLedgerState {
  status: TaskLedgerStatus;
  /** Owner (claimed/stale/blocked) or completer (done). */
  by?: string;
  /** ISO timestamp of the claim/block/done that produced this state. */
  since?: string;
  /** Evidence attached to `done`. */
  evidence?: string;
  /** Last note (block reason etc.). */
  note?: string;
}

export interface LedgerFold {
  /** Task id → derived state. Only tasks that have at least one event appear. */
  tasks: Map<string, TaskLedgerState>;
  /** Lines that were not valid events (skipped, never fatal). */
  malformed: number;
  /** Events the fold ignored (lost races, done without evidence, …). */
  ignored: Array<{ event: LedgerEvent; reason: string }>;
  /**
   * Card text and link per id: the latest `line` / `link` carried by an
   * accepted event (ignored events change nothing). Ids appear in the order
   * they first show up in the sorted ledger; see core/tasks/cards.ts.
   */
  cards: Map<string, { line?: string; link?: string }>;
}

export const LEDGER_FILE = 'ledger.jsonl';
export const DEFAULT_LEASE_HOURS = 2;

const VALID_EVENTS: ReadonlySet<string> = new Set(['claim', 'done', 'release', 'block', 'skip', 'note', 'session', 'handoff', 'pickup', 'wait']);
const INCREMENT_EVENTS: ReadonlySet<string> = new Set(['note', 'session', 'handoff', 'pickup', 'wait']);

/** Resolve the ledger path for an increment directory. */
export function ledgerPath(incrementDir: string): string {
  return path.join(incrementDir, LEDGER_FILE);
}

/**
 * Agent identity: `SPECWEAVE_AGENT` env, else `<tool>@<host>` where the tool
 * is inferred from the host AI tool's environment and the host is the short
 * hostname, or `cloud` inside a cloud session (whose hostname is random per
 * session, which would make every cloud session a stranger to its own claims).
 */
export function getAgentId(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.SPECWEAVE_AGENT?.trim();
  if (explicit) return explicit;
  return `${detectTool(env)}@${detectHost(env)}`;
}

/**
 * The AI tool this process runs under. `SPECWEAVE_TOOL` wins; then the
 * cross-tool `AI_AGENT` variable (e.g. `claude-code_2-1-282_agent`); then
 * each tool's own environment markers.
 */
export function detectTool(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.SPECWEAVE_TOOL?.trim().toLowerCase();
  if (explicit) return explicit.replace(/[^a-z0-9-]/g, '') || 'cli';
  const aiAgent = env.AI_AGENT?.trim().toLowerCase() ?? '';
  const keys = Object.keys(env);
  if (aiAgent.startsWith('claude') || env.CLAUDECODE || env.CLAUDE_CODE) return 'claude';
  if (aiAgent.startsWith('codex') || keys.some((k) => k.startsWith('CODEX_'))) return 'codex';
  if (aiAgent.startsWith('grok') || keys.some((k) => k.startsWith('GROK_'))) return 'grok';
  if (aiAgent.startsWith('cursor') || env.CURSOR_AGENT || env.CURSOR_TRACE_ID) return 'cursor';
  if (aiAgent.startsWith('gemini') || env.GEMINI_CLI) return 'gemini';
  if (aiAgent.startsWith('copilot') || env.COPILOT_AGENT) return 'copilot';
  if (aiAgent.startsWith('opencode') || keys.some((k) => k.startsWith('OPENCODE'))) return 'opencode';
  if (aiAgent) return aiAgent.split(/[_\s]/)[0].replace(/[^a-z0-9-]/g, '') || 'cli';
  return 'cli';
}

/** `cloud` inside a cloud session, else the short hostname. */
export function detectHost(env: NodeJS.ProcessEnv = process.env): string {
  if (env.SPECWEAVE_HOST?.trim()) return env.SPECWEAVE_HOST.trim().toLowerCase();
  if (env.CLAUDE_CODE_REMOTE === 'true' || env.CODEX_CLOUD) return 'cloud';
  const h = os.hostname() || 'host';
  return h.split('.')[0].toLowerCase();
}

/** The tool's own session id, when it exposes one (for `session` events). */
export function detectSessionId(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const own: Record<string, string | undefined> = { claude: env.CLAUDE_CODE_SESSION_ID, codex: env.CODEX_SESSION_ID };
  return (env.SPECWEAVE_SESSION_ID || own[detectTool(env)] || env.CLAUDE_CODE_SESSION_ID || env.CODEX_SESSION_ID)?.trim() || undefined;
}

/**
 * The model this process runs on: `SPECWEAVE_MODEL` (set by SpecWithCode or the
 * user), else Claude Code's `ANTHROPIC_MODEL`. Unknown → undefined.
 */
export function detectModel(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const explicit = env.SPECWEAVE_MODEL?.trim();
  if (explicit) return explicit;
  if (detectTool(env) === 'claude' && env.ANTHROPIC_MODEL?.trim()) return env.ANTHROPIC_MODEL.trim();
  return undefined;
}

/** Serialize one event as a single ledger line (with trailing newline). */
export function formatLedgerLine(event: LedgerEvent): string {
  // Fixed key order keeps lines diff-friendly and grep-able.
  const ordered: Record<string, string> = { t: event.t, e: event.e, by: event.by, at: event.at };
  if (event.note) ordered.note = event.note;
  if (event.evidence) ordered.evidence = event.evidence;
  if (event.line) {
    const { line } = clampCardLine(event.line);
    if (line) ordered.line = line;
  }
  if (event.link?.trim()) ordered.link = event.link.trim();
  if (event.model?.trim()) ordered.model = event.model.trim();
  return JSON.stringify(ordered) + '\n';
}

/**
 * Append one event. Single-line O_APPEND write; creates the file on first use.
 *
 * Also stamps `metadata.updated` for the increment (best-effort, never fatal)
 * so "when did this increment last move" reflects ledger activity and not just
 * status transitions.
 */
export function appendEvent(ledgerFile: string, event: LedgerEvent): void {
  fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
  const model = event.model ?? (event.by === getAgentId() ? detectModel() : undefined);
  fs.appendFileSync(ledgerFile, formatLedgerLine(model ? { ...event, model } : event), { encoding: 'utf-8', flag: 'a' });
  touchIncrementUpdated(path.dirname(ledgerFile), event.at);
  // The SpecWithCode thread and the agent session now work on this increment.
  recordIncrementWork(path.dirname(ledgerFile), event, { sessionId: detectSessionId() });
}

/** Parse a ledger file. Missing file → no events. Malformed lines are counted, never fatal. */
export function readLedger(ledgerFile: string): { events: LedgerEvent[]; malformed: number } {
  if (!fs.existsSync(ledgerFile)) return { events: [], malformed: 0 };
  return parseLedger(fs.readFileSync(ledgerFile, 'utf-8'));
}

export function parseLedger(content: string): { events: LedgerEvent[]; malformed: number } {
  const events: LedgerEvent[] = [];
  let malformed = 0;
  // Tolerate BOM (PowerShell `>>` writes UTF-16/BOM by default), CRLF, blank lines.
  for (const raw of content.replace(/^\uFEFF/, '').split('\n')) {
    const line = raw.replace(/\uFEFF/g, '').trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line) as Partial<LedgerEvent>;
      if (
        typeof obj.t === 'string' && obj.t &&
        typeof obj.e === 'string' && VALID_EVENTS.has(obj.e) &&
        typeof obj.by === 'string' && obj.by &&
        typeof obj.at === 'string' && !Number.isNaN(Date.parse(obj.at))
      ) {
        events.push({
          t: obj.t,
          e: obj.e as LedgerEventType,
          by: obj.by,
          at: obj.at,
          ...(typeof obj.note === 'string' ? { note: obj.note } : {}),
          ...(typeof obj.evidence === 'string' ? { evidence: obj.evidence } : {}),
          ...(typeof obj.line === 'string' && obj.line.trim() ? { line: clampCardLine(obj.line).line } : {}),
          ...(typeof obj.link === 'string' && obj.link.trim() ? { link: obj.link.trim() } : {}),
          ...(typeof obj.model === 'string' && obj.model.trim() ? { model: obj.model.trim() } : {}),
        });
      } else {
        malformed++;
      }
    } catch {
      malformed++;
    }
  }
  return { events, malformed };
}

export interface FoldOptions {
  /** "Now" for staleness computation (default: current time). */
  now?: Date;
  /** Lease length in hours (default {@link DEFAULT_LEASE_HOURS}). */
  leaseHours?: number;
}

/**
 * Deterministic fold: events sorted by (at, by, file order); per task:
 *
 * - `claim` on open → claimed(by). On a task claimed by ANOTHER agent whose
 *   claim is still within the lease at the time of the new claim → ignored
 *   (lost the race; earliest claim wins, equal timestamps → smaller `by` wins).
 *   A claim older than the lease is stale and may be taken over. Re-claim by
 *   the owner renews the lease. Claim on done → ignored.
 * - `done` requires non-empty evidence. Accepted on open, by the owner, or when
 *   the current claim is stale. Otherwise ignored.
 * - `release` by the owner → open. Non-owner → ignored.
 * - `block` on open or by the owner → blocked(by). Non-owner → ignored.
 * - `skip` requires a note (reason) and is terminal (`skipped`); accepted on
 *   open, by the owner, or when the current claim is stale.
 * - Final pass: claimed older than the lease → `stale`.
 */
export function foldLedger(events: LedgerEvent[], opts: FoldOptions = {}): LedgerFold {
  const leaseMs = (opts.leaseHours ?? DEFAULT_LEASE_HOURS) * 3600 * 1000;
  const nowMs = (opts.now ?? new Date()).getTime();

  const sorted = events
    .map((ev, i) => ({ ev, i }))
    .sort((a, b) => {
      const ta = Date.parse(a.ev.at);
      const tb = Date.parse(b.ev.at);
      if (ta !== tb) return ta - tb;
      if (a.ev.by !== b.ev.by) return a.ev.by < b.ev.by ? -1 : 1;
      return a.i - b.i;
    })
    .map((x) => x.ev);

  const tasks = new Map<string, TaskLedgerState>();
  const ignored: LedgerFold['ignored'] = [];
  const cards: LedgerFold['cards'] = new Map();
  const recordCard = (ev: LedgerEvent) => {
    if (ev.t === INCREMENT_EVENT_TASK) return;
    const card = cards.get(ev.t) ?? {};
    if (ev.line) card.line = ev.line;
    if (ev.link) card.link = ev.link;
    cards.set(ev.t, card);
  };

  const isStaleAt = (state: TaskLedgerState, atMs: number): boolean =>
    state.since !== undefined && atMs - Date.parse(state.since) > leaseMs;

  for (const ev of sorted) {
    // Increment-level events (notes, sessions, handoffs) never touch task state.
    // A note on a card id (`C-01`) still declares the card and carries its line.
    if (INCREMENT_EVENTS.has(ev.e)) {
      if (ev.e === 'note') recordCard(ev);
      continue;
    }
    const ignoredBefore = ignored.length;
    const cur = tasks.get(ev.t) ?? { status: 'open' as TaskLedgerStatus };
    const atMs = Date.parse(ev.at);
    const heldByOther =
      (cur.status === 'claimed' || cur.status === 'blocked') && cur.by !== ev.by && !isStaleAt(cur, atMs);

    switch (ev.e) {
      case 'claim': {
        if (cur.status === 'done' || cur.status === 'skipped') { ignored.push({ event: ev, reason: `already ${cur.status}` }); break; }
        if (heldByOther) { ignored.push({ event: ev, reason: `claimed by ${cur.by}` }); break; }
        tasks.set(ev.t, { status: 'claimed', by: ev.by, since: ev.at, note: ev.note });
        break;
      }
      case 'done': {
        if (!ev.evidence || !ev.evidence.trim()) { ignored.push({ event: ev, reason: 'done without evidence' }); break; }
        if (cur.status === 'skipped') { ignored.push({ event: ev, reason: 'already skipped' }); break; }
        if (heldByOther) { ignored.push({ event: ev, reason: `claimed by ${cur.by}` }); break; }
        tasks.set(ev.t, { status: 'done', by: ev.by, since: ev.at, evidence: ev.evidence, note: ev.note });
        break;
      }
      case 'release': {
        if (cur.status === 'done' || cur.status === 'open' || cur.status === 'skipped') { ignored.push({ event: ev, reason: `task is ${cur.status}` }); break; }
        if (cur.by !== ev.by) { ignored.push({ event: ev, reason: `not owner (${cur.by})` }); break; }
        tasks.set(ev.t, { status: 'open', note: ev.note });
        break;
      }
      case 'block': {
        if (cur.status === 'done' || cur.status === 'skipped') { ignored.push({ event: ev, reason: `already ${cur.status}` }); break; }
        if (heldByOther) { ignored.push({ event: ev, reason: `claimed by ${cur.by}` }); break; }
        tasks.set(ev.t, { status: 'blocked', by: ev.by, since: ev.at, note: ev.note });
        break;
      }
      case 'skip': {
        if (!ev.note || !ev.note.trim()) { ignored.push({ event: ev, reason: 'skip without reason' }); break; }
        if (cur.status === 'done' || cur.status === 'skipped') { ignored.push({ event: ev, reason: `already ${cur.status}` }); break; }
        if (heldByOther) { ignored.push({ event: ev, reason: `claimed by ${cur.by}` }); break; }
        tasks.set(ev.t, { status: 'skipped', by: ev.by, since: ev.at, note: ev.note });
        break;
      }
    }
    if (ignored.length === ignoredBefore) recordCard(ev);
  }

  for (const [t, state] of tasks) {
    if (state.status === 'claimed' && isStaleAt(state, nowMs)) {
      tasks.set(t, { ...state, status: 'stale' });
    }
  }

  return { tasks, malformed: 0, ignored, cards };
}

/** Read + fold a ledger file in one call. */
export function foldLedgerFile(ledgerFile: string, opts: FoldOptions = {}): LedgerFold {
  const { events, malformed } = readLedger(ledgerFile);
  const fold = foldLedger(events, opts);
  return { ...fold, malformed };
}

/** Increment-level events (notes, sessions, handoffs), oldest first. */
export function readIncrementEvents(ledgerFile: string, types?: IncrementEventType[]): LedgerEvent[] {
  const wanted = new Set<string>(types ?? [...INCREMENT_EVENTS]);
  return readLedger(ledgerFile).events
    .filter((e) => wanted.has(e.e))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/**
 * Record which tool session works on this increment, once per session id, so
 * the ledger shows the chain of sessions (and accounts) that touched it. Only
 * runs when the tool exposes a session id.
 */
export function recordSessionOnce(ledgerFile: string, by: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const id = detectSessionId(env);
  if (!id) return false;
  const note = `session ${id}`;
  if (readIncrementEvents(ledgerFile, ['session']).some((e) => e.note === note)) return false;
  appendEvent(ledgerFile, { t: INCREMENT_EVENT_TASK, e: 'session', by, at: new Date().toISOString(), note });
  return true;
}

/** Human-readable one-liner for a task state (used by `task list`, handoff, verify). */
export function describeState(state: TaskLedgerState | undefined): string {
  if (!state || state.status === 'open') return 'open';
  switch (state.status) {
    case 'done': return `done by ${state.by}`;
    case 'claimed': return `claimed by ${state.by} since ${state.since}`;
    case 'stale': return `STALE claim by ${state.by} since ${state.since}`;
    case 'blocked': return `blocked by ${state.by}${state.note ? `: ${state.note}` : ''}`;
    case 'skipped': return `skipped by ${state.by}${state.note ? `: ${state.note}` : ''}`;
  }
}
