/**
 * Work Handoff Builder
 *
 * Assembles a portable, secret-scrubbed handoff document (+ a full diff of
 * uncommitted edits) from durable on-disk state, so a developer can stop work
 * in one AI tool and resume in another. This is the single deterministic engine
 * behind the `specweave handoff` CLI, the `/sw:handoff` command, and the
 * PreCompact hook — all of which call {@link buildWorkHandoff}.
 *
 * Workspace detection is intentionally NOT a raw `.specweave/` directory test:
 * a stale child-repo `.specweave/` (no real state) would misclassify. We resolve
 * the effective root then require an `active-increment.json` that actually
 * lists increments. Metadata reads are gated with `MetadataManager.exists()`
 * because `MetadataManager.read()` LAZILY CREATES default metadata — a side
 * effect a read-only handoff must never trigger.
 *
 * All increment/task/AC/workspace logic is REUSED from existing modules (DRY):
 * `parseTasksWithUSLinks`, `calculateProgressFromTasksFile`,
 * `ActiveIncrementManager.getActive()`, `MetadataManager`, `resolveEffectiveRoot`.
 *
 * Part of increment 0867: Cross-Tool Work Handoff
 * (AC-US1-03..07, AC-US3-01..05, AC-US4-*, AC-US6-01/02/05).
 *
 * @module core/session/work-handoff
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { ActiveIncrementManager } from '../increment/active-increment-manager.js';
import { MetadataManager } from '../increment/metadata-manager.js';
import { parseTasksWithUSLinks } from '../../generators/spec/task-parser.js';
import { calculateProgressFromTasksFile } from '../../progress/us-progress-tracker.js';
import { captureGitState } from './handoff-git-state.js';
import { scrubSecrets } from './handoff-secret-scrub.js';
import {
  renderHandoffDoc,
  renderPastePrompt,
  DOC_FORMAT_MARKER,
  type HandoffDocInput,
  type HandoffIncrementInfo,
  type HandoffAmbientRules,
} from './handoff-doc-format.js';

/**
 * Options controlling a handoff build. All fields are optional; the agent /
 * CLI supplies only the short free-text strings + flags.
 */
export interface WorkHandoffOptions {
  /** Required disambiguator when 2+ increments are active. */
  incrementId?: string;
  /** "Why I'm handing off" (e.g. "out of tokens"). */
  reason?: string;
  /** Where things stand. */
  summary?: string;
  /** The exact next step. */
  next?: string;
  /** A gotcha / warning for the next agent. */
  gotcha?: string;
  /** Agent-supplied decisions; merged OVER plan.md decisions. */
  decisions?: string[];
  /** Embed the full body in the paste-prompt (cross-machine). */
  inline?: boolean;
  /** Override the doc output path. */
  out?: string;
  /** Force the non-SpecWeave `.handoff/` fallback even in a workspace. */
  nonSpecweave?: boolean;
}

/**
 * Result of a handoff build.
 */
export interface WorkHandoffResult {
  /** Absolute path of the written doc (the CLI prints this FIRST). */
  docPath: string;
  /** Absolute path of the sibling full-diff file. */
  diffPath: string;
  /** The full rendered + scrubbed doc markdown. */
  docMarkdown: string;
  /** The copy-paste resume prompt. */
  pastePrompt: string;
  /** Whether the high-fidelity SpecWeave path was taken. */
  isSpecWeave: boolean;
}

/**
 * Thrown when 2+ increments are active and no explicit id was supplied.
 * Carries the candidate ids so the CLI can list them.
 */
export class AmbiguousActiveIncrementError extends Error {
  constructor(public readonly candidates: string[]) {
    super(
      `Multiple active increments — pass an explicit id. Candidates: ${candidates.join(', ')}`,
    );
    this.name = 'AmbiguousActiveIncrementError';
  }
}

/**
 * Build a handoff for `repoRoot`.
 *
 * @param repoRoot - Where to start workspace resolution from (usually cwd).
 * @param opts - {@link WorkHandoffOptions}.
 * @returns {@link WorkHandoffResult}.
 * @throws {AmbiguousActiveIncrementError} when 2+ active increments + no id.
 */
export async function buildWorkHandoff(
  repoRoot: string,
  opts: WorkHandoffOptions = {},
): Promise<WorkHandoffResult> {
  // Resolve the effective workspace root. `resolveEffectiveRoot` returns
  // process.cwd() as a last resort when the start dir is not inside any
  // SpecWeave/umbrella tree — which would wrongly anchor a plain repo to the
  // caller's cwd. So we only ACCEPT the resolved root when it actually carries
  // SpecWeave state; otherwise we anchor to the passed `repoRoot` itself.
  const resolved = resolveEffectiveRoot(repoRoot);
  const resolvedHasState =
    fs.existsSync(path.join(resolved, '.specweave', 'state', 'active-increment.json'));
  const passedRoot = path.resolve(repoRoot);
  const effectiveRoot = !opts.nonSpecweave && resolvedHasState ? resolved : passedRoot;

  // ── Workspace classification ──────────────────────────────────────────────
  // SpecWeave only if (a) not forced off and (b) a real active-increment.json
  // exists at the effective root. A stale .specweave/ with empty/missing
  // active-increment.json classifies as non-SpecWeave.
  const hasSpecweaveState = opts.nonSpecweave
    ? false
    : fs.existsSync(path.join(effectiveRoot, '.specweave', 'state', 'active-increment.json'));
  const activeIds = hasSpecweaveState ? readActiveIds(effectiveRoot) : [];

  // ── Resolve which increment (if any) ──────────────────────────────────────
  let incrementId: string | undefined;
  if (hasSpecweaveState && activeIds.length > 0) {
    if (activeIds.length === 1) {
      incrementId = activeIds[0];
    } else {
      // 2+ active.
      if (!opts.incrementId) throw new AmbiguousActiveIncrementError(activeIds);
      incrementId = opts.incrementId;
    }
  }

  // A workspace is "SpecWeave" for doc purposes when it has SpecWeave state.
  // (0 active still uses the SpecWeave write paths but with a git+config doc.)
  const isSpecWeave = hasSpecweaveState && !opts.nonSpecweave;

  // ── Assemble increment facts (gated, no side effects) ─────────────────────
  let increment: HandoffIncrementInfo | undefined;
  let planDecisions: string[] = [];
  if (incrementId && MetadataManager.exists(incrementId, effectiveRoot)) {
    const incDir = path.join(effectiveRoot, '.specweave', 'increments', incrementId);
    increment = await assembleIncrementInfo(incDir, incrementId, effectiveRoot);
    planDecisions = readPlanDecisions(path.join(incDir, 'plan.md'));
  }

  // ── Ambient rules from config.json ────────────────────────────────────────
  const ambient = isSpecWeave ? readAmbientRules(effectiveRoot) : undefined;

  // ── Decide write paths (ownership sentinel for non-SpecWeave) ─────────────
  const { docPath, diffPath } = resolveWritePaths(effectiveRoot, isSpecWeave, incrementId, opts.out);

  // ── Git state + full diff dump (free, no tokens) ──────────────────────────
  const git = captureGitState(effectiveRoot, diffPath);

  // ── Scrub free-text + the captured diff before any write ──────────────────
  const mergedDecisions = [...planDecisions, ...(opts.decisions ?? [])];
  const scrubbedText = scrubFields({
    reason: opts.reason,
    summary: opts.summary,
    next: opts.next,
    gotcha: opts.gotcha,
    decisions: mergedDecisions,
  });
  const redactionCounts = scrubbedText.counts;

  // Re-scrub the diff file in place (captureGitState wrote the raw diff).
  scrubDiffFileInPlace(diffPath, redactionCounts);

  // ── Render ────────────────────────────────────────────────────────────────
  const docInput: HandoffDocInput = {
    docPath,
    diffPath,
    repoRoot: effectiveRoot,
    generatedAt: new Date().toISOString(),
    isSpecWeave,
    reason: scrubbedText.reason,
    summary: scrubbedText.summary,
    next: scrubbedText.next,
    gotcha: scrubbedText.gotcha,
    decisions: scrubbedText.decisions,
    increment,
    ambient,
    git,
    redactionCounts,
  };

  const docMarkdown = renderHandoffDoc(docInput);
  const pastePrompt = renderPastePrompt(docInput, { inline: opts.inline });

  // ── Write doc(s) ──────────────────────────────────────────────────────────
  writeDoc(docPath, docMarkdown);
  // SpecWeave + active increment: also write the stable convenience copy.
  if (isSpecWeave && incrementId && !opts.out) {
    const latest = path.join(effectiveRoot, '.specweave', 'state', 'handoff-latest.md');
    writeDoc(latest, docMarkdown);
  }

  return { docPath, diffPath, docMarkdown, pastePrompt, isSpecWeave };
}

// ───────────────────────────────────────────────────────────────────────────
// Internals
// ───────────────────────────────────────────────────────────────────────────

/** Read active increment ids straight from the state file (no lazy create). */
function readActiveIds(effectiveRoot: string): string[] {
  try {
    const mgr = new ActiveIncrementManager(effectiveRoot);
    return mgr.getActive();
  } catch {
    return [];
  }
}

/**
 * Assemble per-increment facts: status, current/next task, task% and AC counts,
 * acSyncEvents drift. Reuses the shared parsers; never lazily creates metadata.
 */
async function assembleIncrementInfo(
  incDir: string,
  incrementId: string,
  effectiveRoot: string,
): Promise<HandoffIncrementInfo> {
  // Status comes from the already-existing metadata file (exists()-gated by caller).
  let status = 'unknown';
  let acSyncEvents: string[] = [];
  try {
    const metaRaw = JSON.parse(
      fs.readFileSync(path.join(incDir, 'metadata.json'), 'utf-8'),
    ) as { status?: string; acSyncEvents?: Array<{ timestamp: string; updated?: string[]; conflicts?: string[]; changesCount?: number }> };
    if (metaRaw.status) status = metaRaw.status;
    // acSyncEvents is stored dynamically (not in the typed interface) — read defensively.
    if (Array.isArray(metaRaw.acSyncEvents)) {
      acSyncEvents = metaRaw.acSyncEvents.slice(0, 5).map((ev) => {
        const updated = ev.updated?.length ?? ev.changesCount ?? 0;
        const conflicts = ev.conflicts?.length ?? 0;
        return `${ev.timestamp}: ${updated} ACs updated, ${conflicts} conflicts`;
      });
    }
  } catch {
    // Metadata unreadable — leave defaults.
  }

  const title = readSpecTitle(path.join(incDir, 'spec.md'));

  // Tasks: counts/% via the shared progress fn; current = first non-completed,
  // next = the one after it (from the same parser's status — fixed in 0867 to
  // read the canonical one-line `… | **Status**: [x] …` format correctly).
  const tasksPath = path.join(incDir, 'tasks.md');
  let currentTask: string | undefined;
  let nextTask: string | undefined;
  let doneTasks = 0;
  let totalTasks = 0;
  let taskPercentage = 0;
  if (fs.existsSync(tasksPath)) {
    const progress = await calculateProgressFromTasksFile(tasksPath);
    doneTasks = progress.completedTasks;
    totalTasks = progress.totalTasks;
    taskPercentage = progress.percentage;

    const allTasks = Object.values(parseTasksWithUSLinks(tasksPath)).flat();
    const pending = allTasks
      .filter((t) => t.status !== 'completed' && t.status !== 'canceled')
      // parseTasksWithUSLinks groups by user story, so the flattened order is
      // US-major, not T-id order. Sort by numeric T-id so "current"/"next"
      // reflect real task sequence even with interleaved per-US numbering.
      .sort((a, b) => taskIdNum(a.id) - taskIdNum(b.id));
    if (pending.length > 0) currentTask = `${pending[0].id}: ${pending[0].title}`;
    if (pending.length > 1) nextTask = `${pending[1].id}: ${pending[1].title}`;
  }

  // ACs from spec.md checkboxes.
  const { doneAcs, totalAcs } = countSpecAcs(path.join(incDir, 'spec.md'));

  return {
    id: incrementId,
    status,
    title,
    currentTask,
    nextTask,
    doneTasks,
    totalTasks,
    taskPercentage,
    doneAcs,
    totalAcs,
    acSyncEvents,
  };
}

/** Numeric portion of a `T-007` / `T-012E` task id, for ordering. */
function taskIdNum(id: string): number {
  const m = id.match(/T-(\d+)/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

/** Count `- [ ] AC-...` / `- [x] AC-...` checkboxes in spec.md. */
function countSpecAcs(specPath: string): { doneAcs: number; totalAcs: number } {
  if (!fs.existsSync(specPath)) return { doneAcs: 0, totalAcs: 0 };
  const acRegex = /^-\s+\[([ x])\]\s+\*{0,2}(AC-[A-Z0-9-]+)\*{0,2}/;
  let done = 0;
  let total = 0;
  for (const line of fs.readFileSync(specPath, 'utf-8').split('\n')) {
    const m = line.match(acRegex);
    if (m) {
      total += 1;
      if (m[1] === 'x') done += 1;
    }
  }
  return { doneAcs: done, totalAcs: total };
}

/** Read the `title:` from spec.md frontmatter, if present. */
function readSpecTitle(specPath: string): string | undefined {
  if (!fs.existsSync(specPath)) return undefined;
  const content = fs.readFileSync(specPath, 'utf-8');
  const m = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  return m ? m[1] : undefined;
}

/**
 * Extract decision-ish bullets from plan.md `## Approach`, `## Components`,
 * `## Risks` sections. Best-effort: each bullet line becomes a decision.
 */
function readPlanDecisions(planPath: string): string[] {
  if (!fs.existsSync(planPath)) return [];
  const lines = fs.readFileSync(planPath, 'utf-8').split('\n');
  const wanted = new Set(['approach', 'risks', 'key decisions', 'decisions']);
  const decisions: string[] = [];
  let capture = false;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      capture = wanted.has(heading[1].trim().toLowerCase());
      continue;
    }
    if (capture) {
      const bullet = line.match(/^[-*]\s+(.+)/);
      if (bullet) decisions.push(bullet[1].trim());
    }
  }
  return decisions.slice(0, 10);
}

/** Read ambient rules (test mode / coverage target / WIP limit) from config.json. */
function readAmbientRules(effectiveRoot: string): HandoffAmbientRules {
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(effectiveRoot, '.specweave', 'config.json'), 'utf-8'),
    ) as {
      testing?: { defaultTestMode?: string; defaultCoverageTarget?: number };
      limits?: { activeIncrements?: number };
    };
    return {
      testMode: cfg.testing?.defaultTestMode,
      coverageTarget: cfg.testing?.defaultCoverageTarget,
      wipLimit: cfg.limits?.activeIncrements,
    };
  } catch {
    return {};
  }
}

/**
 * Decide doc + diff paths.
 *
 * - explicit `out`: use it (diff is a sibling `.diff`).
 * - SpecWeave + active increment: `reports/handoff.md` (the stable copy is
 *   written separately by the caller).
 * - SpecWeave, no active increment: `state/handoff-latest.md`.
 * - non-SpecWeave: `.handoff/HANDOFF.md`, unless a foreign root `./HANDOFF.md`
 *   without the marker exists (ownership sentinel still routes to `.handoff/`).
 */
function resolveWritePaths(
  effectiveRoot: string,
  isSpecWeave: boolean,
  incrementId: string | undefined,
  out?: string,
): { docPath: string; diffPath: string } {
  if (out) {
    const abs = path.isAbsolute(out) ? out : path.join(effectiveRoot, out);
    return { docPath: abs, diffPath: siblingDiff(abs) };
  }

  if (isSpecWeave && incrementId) {
    const docPath = path.join(
      effectiveRoot, '.specweave', 'increments', incrementId, 'reports', 'handoff.md',
    );
    const diffPath = path.join(effectiveRoot, '.specweave', 'state', 'handoff-latest.diff');
    return { docPath, diffPath };
  }

  if (isSpecWeave) {
    const docPath = path.join(effectiveRoot, '.specweave', 'state', 'handoff-latest.md');
    const diffPath = path.join(effectiveRoot, '.specweave', 'state', 'handoff-latest.diff');
    return { docPath, diffPath };
  }

  // Non-SpecWeave. Default target is the repo-root ./HANDOFF.md, but only if it
  // is OURS: a root ./HANDOFF.md that already carries the Doc format v1 marker
  // is a prior handoff we may overwrite in-place. A root ./HANDOFF.md WITHOUT
  // the marker is a foreign file (a project's own HANDOFF) — the ownership
  // sentinel refuses to clobber it and routes to .handoff/ instead.
  const rootHandoff = path.join(effectiveRoot, 'HANDOFF.md');
  if (fs.existsSync(rootHandoff) && !isForeignHandoffFile(rootHandoff)) {
    return { docPath: rootHandoff, diffPath: siblingDiff(rootHandoff) };
  }
  // No (safe) root file → write under .handoff/ (also the foreign-file case).
  ensureHandoffDir(effectiveRoot);
  const docPath = path.join(effectiveRoot, '.handoff', 'HANDOFF.md');
  const diffPath = path.join(effectiveRoot, '.handoff', 'handoff.diff');
  return { docPath, diffPath };
}

/** Sibling `<name>.diff` for an arbitrary doc path. */
function siblingDiff(docPath: string): string {
  const ext = path.extname(docPath);
  return docPath.slice(0, docPath.length - ext.length) + '.diff';
}

/**
 * Create `.handoff/` + a `.gitignore` containing `*` so the doc, diff, and any
 * scrubbed-but-still-sensitive content never enter git by default.
 */
function ensureHandoffDir(effectiveRoot: string): void {
  const dir = path.join(effectiveRoot, '.handoff');
  fs.mkdirSync(dir, { recursive: true });
  const gi = path.join(dir, '.gitignore');
  if (!fs.existsSync(gi)) fs.writeFileSync(gi, '*\n', 'utf-8');
}

/**
 * Ownership sentinel: is a root `./HANDOFF.md` a foreign file (lacks the
 * `Doc format v1` marker)? Exposed for the builder + tests. When foreign, the
 * caller must NOT overwrite it.
 */
export function isForeignHandoffFile(handoffPath: string): boolean {
  if (!fs.existsSync(handoffPath)) return false;
  const content = fs.readFileSync(handoffPath, 'utf-8');
  return !content.includes(DOC_FORMAT_MARKER);
}

/** Write a doc, creating parent dirs. */
function writeDoc(docPath: string, markdown: string): void {
  fs.mkdirSync(path.dirname(docPath), { recursive: true });
  fs.writeFileSync(docPath, markdown, 'utf-8');
}

/** Scrub the free-text fields, accumulating per-pattern counts. */
function scrubFields(fields: {
  reason?: string;
  summary?: string;
  next?: string;
  gotcha?: string;
  decisions: string[];
}): {
  reason?: string;
  summary?: string;
  next?: string;
  gotcha?: string;
  decisions: string[];
  counts: Record<string, number>;
} {
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
  return {
    reason: one(fields.reason),
    summary: one(fields.summary),
    next: one(fields.next),
    gotcha: one(fields.gotcha),
    decisions,
    counts,
  };
}

/**
 * Re-read the raw diff file captureGitState wrote, scrub it, write it back, and
 * fold its redaction counts into the running totals.
 */
function scrubDiffFileInPlace(diffPath: string, counts: Record<string, number>): void {
  try {
    if (!fs.existsSync(diffPath)) return;
    const raw = fs.readFileSync(diffPath, 'utf-8');
    if (!raw) return;
    const { scrubbed, counts: diffCounts } = scrubSecrets(raw);
    fs.writeFileSync(diffPath, scrubbed, 'utf-8');
    for (const [k, v] of Object.entries(diffCounts)) counts[k] = (counts[k] ?? 0) + v;
  } catch {
    // Best-effort.
  }
}
