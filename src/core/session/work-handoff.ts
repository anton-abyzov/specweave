/**
 * Work Handoff Builder (2.0)
 *
 * Assembles a ≤1-page, secret-scrubbed handoff document (+ a full diff of
 * uncommitted edits) from durable on-disk state, so any agent from any vendor
 * can stop and another can resume. Single engine behind `specweave handoff`,
 * `/sw:handoff`, and the PreCompact hook.
 *
 * Workspace = SpecWeave when the resolved root carries `.specweave/config.json`.
 * The increment is the single `active` one (metadata.json), or the explicit id.
 * Task state comes from the ledger fold (one counter — no disagreeing numbers).
 * Single write location: `.specweave/increments/<id>/handoff.md` + `handoff.diff`,
 * with a pointer at `.specweave/state/handoff-latest.txt`.
 *
 * @module core/session/work-handoff
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { captureGitState } from './handoff-git-state.js';
import { scrubSecrets } from './handoff-secret-scrub.js';
import { appendEvent, getAgentId, ledgerPath, INCREMENT_EVENT_TASK } from '../tasks/ledger.js';
import { pushHandoff, wipRefFor } from './handoff-push.js';
import { loadTaskBoard, nextTask } from '../tasks/task-board.js';
import { resolveIncrement, listActiveIncrementIds, readLeaseHours, IncrementResolutionError } from '../tasks/resolve-increment.js';
import { parseSpecAcs } from '../tasks/verify-runner.js';
import { INTENT_BOARD_PATH, readIntentContext } from '../intent/portable-context.js';
import { serializeHandoffPointer } from './handoff-pointer.js';
import {
  renderHandoffDoc,
  renderPastePrompt,
  DOC_FORMAT_MARKER,
  LEGACY_DOC_FORMAT_MARKER,
  type HandoffDocInput,
  type HandoffIncrementInfo,
  type HandoffTaskRow,
  type HandoffPushInfo,
} from './handoff-doc-format.js';

export interface WorkHandoffOptions {
  incrementId?: string;
  reason?: string;
  summary?: string;
  next?: string;
  gotcha?: string;
  decisions?: string[];
  inline?: boolean;
  out?: string;
  nonSpecweave?: boolean;
  /** Push the branch and a WIP snapshot of uncommitted edits (`wip/<branch>`). */
  push?: boolean;
  /** Keep this agent's claims instead of releasing them for the next agent. */
  keepClaims?: boolean;
  /**
   * A checkpoint (PreCompact) rather than a handoff: the same session goes on
   * working, so claims stay and no `handoff` event is written.
   */
  checkpoint?: boolean;
  /** Override the agent id (tests). */
  agent?: string;
}

export interface WorkHandoffResult {
  docPath: string;
  diffPath: string;
  docMarkdown: string;
  pastePrompt: string;
  isSpecWeave: boolean;
  incrementId?: string;
  /** Task ids whose claims this handoff released. */
  released: string[];
  push?: HandoffPushInfo;
}

export class AmbiguousActiveIncrementError extends Error {
  constructor(public readonly candidates: string[]) {
    super(`Multiple active increments — pass an explicit id. Candidates: ${candidates.join(', ')}`);
    this.name = 'AmbiguousActiveIncrementError';
  }
}

export const HANDOFF_POINTER_FILE = 'handoff-latest.txt';

export async function buildWorkHandoff(repoRoot: string, opts: WorkHandoffOptions = {}): Promise<WorkHandoffResult> {
  const passedRoot = path.resolve(repoRoot);
  const resolved = resolveEffectiveRoot(passedRoot);
  const resolvedIsSpecWeave = fs.existsSync(path.join(resolved, '.specweave', 'config.json'));
  const isSpecWeave = !opts.nonSpecweave && resolvedIsSpecWeave;
  const effectiveRoot = isSpecWeave ? resolved : passedRoot;

  // ── Increment ──────────────────────────────────────────────────────────
  let incrementId: string | undefined;
  let incDir: string | undefined;
  if (isSpecWeave) {
    try {
      const r = resolveIncrement(effectiveRoot, opts.incrementId);
      incrementId = r.id;
      incDir = r.dir;
    } catch (e) {
      if (e instanceof IncrementResolutionError) {
        if (e.candidates.length > 1 && !opts.incrementId) throw new AmbiguousActiveIncrementError(e.candidates);
        if (opts.incrementId) throw e;
        // 0 active → git + notes handoff (no increment section)
      } else {
        throw e;
      }
    }
  }

  const agent = opts.agent ?? getAgentId();
  const leaseHours = isSpecWeave ? readLeaseHours(effectiveRoot) : undefined;

  // ── Ledger: release this agent's claims, record the handoff ─────────────
  // Both land before the Git capture so a pushed snapshot carries them.
  const released: string[] = [];
  if (!opts.checkpoint && incrementId && incDir && fs.existsSync(path.join(incDir, 'metadata.json'))) {
    const ledger = ledgerPath(incDir);
    const at = new Date().toISOString();
    if (!opts.keepClaims) {
      const board = loadTaskBoard(incDir, { leaseHours });
      for (const t of board.tasks) {
        if ((t.state.status === 'claimed' || t.state.status === 'stale') && t.state.by === agent) {
          appendEvent(ledger, { t: t.id, e: 'release', by: agent, at, note: 'handoff' });
          released.push(t.id);
        }
      }
    }
    const note = [opts.reason, opts.next ? `next: ${opts.next}` : undefined].filter(Boolean).join(' · ');
    appendEvent(ledger, { t: INCREMENT_EVENT_TASK, e: 'handoff', by: agent, at, ...(note ? { note: scrubSecrets(note).scrubbed } : {}) });
  }

  let increment: HandoffIncrementInfo | undefined;
  if (incrementId && incDir && fs.existsSync(path.join(incDir, 'metadata.json'))) {
    increment = assembleIncrementInfo(incDir, incrementId, agent, leaseHours);
  }

  // ── Paths ──────────────────────────────────────────────────────────────
  const { docPath, diffPath } = resolveWritePaths(effectiveRoot, isSpecWeave, incDir, opts.out);

  // ── Git + scrub ────────────────────────────────────────────────────────
  const git = captureGitState(effectiveRoot, diffPath);
  const intentRedactions: Record<string, number> = {};
  const intents = isSpecWeave ? readIntentContext(effectiveRoot, intentRedactions) : undefined;
  const intentLink = intents ? `[Open the intent board](${path.relative(path.dirname(docPath), path.join(effectiveRoot, INTENT_BOARD_PATH)).replace(/\\/g, '/')})` : undefined;
  const scrubbed = scrubFields({
    reason: opts.reason,
    summary: [opts.summary, intents, intentLink].filter(Boolean).join('\n\n') || undefined,
    next: opts.next,
    gotcha: opts.gotcha,
    // Decisions come from the agent; spec.md's Approach already holds the planned ones.
    decisions: opts.decisions ?? [],
  });
  for (const [kind, count] of Object.entries(intentRedactions)) scrubbed.counts[kind] = (scrubbed.counts[kind] ?? 0) + count;
  scrubDiffFileInPlace(diffPath, scrubbed.counts);

  const docInput: HandoffDocInput = {
    docPath,
    diffPath,
    repoRoot: effectiveRoot,
    generatedAt: new Date().toISOString(),
    isSpecWeave,
    agent,
    reason: scrubbed.reason,
    summary: scrubbed.summary,
    next: scrubbed.next,
    gotcha: scrubbed.gotcha,
    decisions: scrubbed.decisions,
    increment,
    git,
    redactionCounts: scrubbed.counts,
  };

  docInput.released = released;
  // With --push the doc names the WIP ref it is about to publish, so the
  // snapshot carries a doc that points at itself; a failed push rewrites it.
  if (opts.push && git.isGitRepo && git.branch && git.branch !== 'HEAD' && git.hasUncommittedChanges) {
    docInput.push = { wipRef: wipRefFor(git.branch), warnings: [] };
  }
  writeDoc(docPath, renderHandoffDoc(docInput));
  if (isSpecWeave) writePointer(effectiveRoot, docPath);
  if (opts.push) {
    const planned = docInput.push?.wipRef;
    docInput.push = pushHandoff(effectiveRoot);
    if (docInput.push.wipRef !== planned || docInput.push.warnings.length) writeDoc(docPath, renderHandoffDoc(docInput));
  }
  const docMarkdown = renderHandoffDoc(docInput);
  const pastePrompt = renderPastePrompt(docInput, { inline: opts.inline });

  return { docPath, diffPath, docMarkdown, pastePrompt, isSpecWeave, incrementId, released, push: docInput.push };
}

// ───────────────────────────────────────────────────────────────────────────
// Internals
// ───────────────────────────────────────────────────────────────────────────

/** Read-only export for callers that want the active ids (e.g. session-start context). */
export function activeIncrementIds(projectRoot: string): string[] {
  return listActiveIncrementIds(projectRoot);
}

function assembleIncrementInfo(incDir: string, incrementId: string, agent: string, leaseHours?: number): HandoffIncrementInfo {
  let status = 'unknown';
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8')) as { status?: string };
    if (meta.status) status = meta.status;
  } catch {
    // leave default
  }
  const specPath = path.join(incDir, 'spec.md');
  const title = readSpecTitle(specPath);
  const acs = fs.existsSync(specPath) ? parseSpecAcs(fs.readFileSync(specPath, 'utf-8')) : [];

  const board = loadTaskBoard(incDir, { leaseHours });
  const row = (t: (typeof board.tasks)[number]): HandoffTaskRow => ({
    id: t.id,
    title: t.title,
    status: t.state.status,
    by: t.state.by,
    evidence: t.state.status === 'done' ? t.state.evidence : t.state.note,
  });
  const next = nextTask(board, agent);

  return {
    id: incrementId,
    status,
    title,
    tasks: board.tasks.map(row),
    counts: board.counts,
    doneAcs: acs.filter((a) => a.done).length,
    totalAcs: acs.length,
    nextTask: next ? row(next) : undefined,
  };
}

/** `title:` from spec.md frontmatter, else the first H1. */
function readSpecTitle(specPath: string): string | undefined {
  if (!fs.existsSync(specPath)) return undefined;
  const content = fs.readFileSync(specPath, 'utf-8');
  const fm = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (fm) return fm[1];
  const h1 = content.match(/^#\s+(.+?)\s*$/m);
  return h1 ? h1[1] : undefined;
}

/**
 * Decision bullets from `## Approach`, `## Decisions`, `## Key decisions`,
 * `## Risks` sections of spec.md / plan.md. Whole bullets — continuation lines
 * (indented or unindented wrapped text) are joined onto their bullet.
 */
export function readDecisions(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  const wanted = new Set(['approach', 'risks', 'key decisions', 'decisions', 'decisions & gotchas']);
  const decisions: string[] = [];
  let capture = false;
  let current: string | null = null;
  const flush = () => {
    if (current && current.trim()) decisions.push(current.replace(/\s+/g, ' ').trim());
    current = null;
  };
  for (const line of lines) {
    const heading = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (heading) {
      flush();
      capture = heading[1] === '##' ? wanted.has(heading[2].trim().toLowerCase()) : capture;
      continue;
    }
    if (!capture) continue;
    const bullet = line.match(/^\s*[-*]\s+(.+)/);
    if (bullet) {
      flush();
      current = bullet[1];
    } else if (current !== null && line.trim() && !/^```/.test(line)) {
      current += ' ' + line.trim();
    } else if (!line.trim()) {
      flush();
    }
  }
  flush();
  return decisions.slice(0, 20);
}

/**
 * Decide doc + diff paths.
 *
 * - explicit `out`: use it (diff is a sibling `.diff`).
 * - SpecWeave + active increment: the increment's own `handoff.md`.
 * - SpecWeave, no active increment: `state/handoff-latest.md`.
 * - non-SpecWeave: `.handoff/HANDOFF.md`, unless a foreign root `./HANDOFF.md`
 *   without the marker exists (ownership sentinel still routes to `.handoff/`).
 */
function resolveWritePaths(
  effectiveRoot: string,
  isSpecWeave: boolean,
  incDir: string | undefined,
  out?: string,
): { docPath: string; diffPath: string } {
  if (out) {
    const abs = path.isAbsolute(out) ? out : path.join(effectiveRoot, out);
    return { docPath: abs, diffPath: siblingDiff(abs) };
  }
  if (isSpecWeave && incDir) {
    return { docPath: path.join(incDir, 'handoff.md'), diffPath: path.join(incDir, 'handoff.diff') };
  }
  // No increment (SpecWeave without an active one, or plain repo): root
  // ./HANDOFF.md if it is ours, else .handoff/ (gitignored).
  const rootHandoff = path.join(effectiveRoot, 'HANDOFF.md');
  if (fs.existsSync(rootHandoff) && !isForeignHandoffFile(rootHandoff)) {
    return { docPath: rootHandoff, diffPath: siblingDiff(rootHandoff) };
  }
  ensureHandoffDir(effectiveRoot);
  return { docPath: path.join(effectiveRoot, '.handoff', 'HANDOFF.md'), diffPath: path.join(effectiveRoot, '.handoff', 'handoff.diff') };
}

function siblingDiff(docPath: string): string {
  const ext = path.extname(docPath);
  return docPath.slice(0, docPath.length - ext.length) + '.diff';
}

function ensureHandoffDir(effectiveRoot: string): void {
  const dir = path.join(effectiveRoot, '.handoff');
  fs.mkdirSync(dir, { recursive: true });
  const gi = path.join(dir, '.gitignore');
  if (!fs.existsSync(gi)) fs.writeFileSync(gi, '*\n', 'utf-8');
}

/** A root `./HANDOFF.md` without our marker is a foreign file we must not clobber. */
export function isForeignHandoffFile(handoffPath: string): boolean {
  if (!fs.existsSync(handoffPath)) return false;
  const content = fs.readFileSync(handoffPath, 'utf-8');
  return !content.includes(DOC_FORMAT_MARKER) && !content.includes(LEGACY_DOC_FORMAT_MARKER);
}

function writeDoc(docPath: string, markdown: string): void {
  fs.mkdirSync(path.dirname(docPath), { recursive: true });
  fs.writeFileSync(docPath, markdown, 'utf-8');
}

/** Keep in-project destinations relative so copying the project preserves its handoff. */
function writePointer(effectiveRoot: string, docPath: string): void {
  try {
    const stateDir = path.join(effectiveRoot, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, HANDOFF_POINTER_FILE), serializeHandoffPointer(effectiveRoot, docPath) + '\n', 'utf-8');
  } catch {
    // best-effort
  }
}

function scrubFields(fields: { reason?: string; summary?: string; next?: string; gotcha?: string; decisions: string[] }) {
  const counts: Record<string, number> = {};
  const add = (c: Record<string, number>) => {
    for (const [k, v] of Object.entries(c)) counts[k] = (counts[k] ?? 0) + v;
  };
  const one = (s?: string): string | undefined => {
    if (s == null) return s;
    const r = scrubSecrets(s);
    add(r.counts);
    return r.scrubbed;
  };
  const decisions = fields.decisions.map((d) => {
    const r = scrubSecrets(d);
    add(r.counts);
    return r.scrubbed;
  });
  return { reason: one(fields.reason), summary: one(fields.summary), next: one(fields.next), gotcha: one(fields.gotcha), decisions, counts };
}

function scrubDiffFileInPlace(diffPath: string, counts: Record<string, number>): void {
  try {
    if (!fs.existsSync(diffPath)) return;
    const raw = fs.readFileSync(diffPath, 'utf-8');
    if (!raw) return;
    const { scrubbed, counts: diffCounts } = scrubSecrets(raw);
    fs.writeFileSync(diffPath, scrubbed, 'utf-8');
    for (const [k, v] of Object.entries(diffCounts)) counts[k] = (counts[k] ?? 0) + v;
  } catch {
    // best-effort
  }
}
