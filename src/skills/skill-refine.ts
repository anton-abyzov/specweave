/**
 * `sw:skill-refine` CLI entry point.
 *
 * Orchestrates:
 *   1. Flag parsing (--dry-run, --show-signals, --scope project|user)
 *   2. Session-lock guard (ADR-0671-01 — never mutate during /sw:do or /sw:done)
 *   3. Resolve skill file path based on scope
 *   4. Aggregate refinement signals (aggregator.ts)
 *   5. --show-signals: print + exit
 *   6. Haiku diff proposal (haiku-diff.ts)
 *   7. --dry-run: print diff + exit
 *   8. Interactive approve/reject/edit (approval.ts)
 *   9. On approve: write + git commit + ledger (apply.ts)
 *      On reject: ledger rejection entry only
 *
 * This module is exported as a library function `runSkillRefine` so it is
 * testable in isolation. CLI wiring happens in `bin/specweave.js` separately.
 *
 * @module skills/skill-refine
 */

import { existsSync, promises as fs } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { aggregate, type AggregateResult } from '../core/skill-refine/aggregator';
import { proposeDiff, type HaikuClientLike } from '../core/skill-refine/haiku-diff';
import {
  runApprovalFlow,
  defaultPromptFns,
  type PromptFns,
} from '../core/skill-refine/approval';
import { applyRefinement } from '../core/skill-refine/apply';
import { appendRejected } from '../core/skill-refine/ledger';

export type Scope = 'project' | 'user';

export interface ParsedArgs {
  skillSlug: string;
  dryRun: boolean;
  showSignals: boolean;
  scope: Scope;
  lastN?: number;
}

export interface RunOptions {
  /** CWD used as the project root (for `scope=project` and signals/ledger paths). */
  projectRoot: string;
  /** Raw CLI argv (after the subcommand name). */
  argv: string[];
  /** Anthropic client for Haiku calls. Omit to skip network in tests. */
  client?: HaikuClientLike;
  /** Stream to write user-facing text to. Defaults to stdout. */
  stdout?: { write: (s: string) => void };
  /** Prompt stubs for tests. Omit to use terminal prompts. */
  prompts?: PromptFns;
  /** Override env for session-lock detection (tests). */
  env?: NodeJS.ProcessEnv;
}

export interface RunResult {
  status: 'shown-signals' | 'dry-run' | 'applied' | 'rejected' | 'no-signals' | 'no-diff';
  message: string;
  commitSha?: string;
}

/**
 * Parse `argv` into structured flags. Throws on invalid usage so the CLI
 * can surface a single helpful error line.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const flags = {
    dryRun: false,
    showSignals: false,
    scope: 'project' as Scope,
    lastN: undefined as number | undefined,
  };
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--show-signals') flags.showSignals = true;
    else if (a === '--scope') {
      const v = argv[++i];
      if (v !== 'project' && v !== 'user') {
        throw new Error(`--scope must be 'project' or 'user' (got: ${v ?? '<missing>'})`);
      }
      flags.scope = v;
    } else if (a === '--last-n') {
      const v = argv[++i];
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`--last-n must be a positive integer (got: ${v ?? '<missing>'})`);
      }
      flags.lastN = n;
    } else if (a.startsWith('--')) {
      throw new Error(`unknown flag: ${a}`);
    } else {
      positionals.push(a);
    }
  }

  if (positionals.length === 0) {
    throw new Error('missing required argument: <skill-slug>');
  }
  if (positionals.length > 1) {
    throw new Error(
      `sw:skill-refine accepts exactly one skill (got: ${positionals.join(', ')}) — refine one skill per invocation.`,
    );
  }

  return {
    skillSlug: positionals[0],
    dryRun: flags.dryRun,
    showSignals: flags.showSignals,
    scope: flags.scope,
    lastN: flags.lastN,
  };
}

/**
 * Returns a human-readable reason string when the current process is inside
 * an active /sw:do or /sw:done session (ADR-0671-01 red line). Null means
 * safe to proceed.
 */
export function detectSessionLock(
  projectRoot: string,
  env: NodeJS.ProcessEnv,
): string | null {
  if (env.SPECWEAVE_SESSION_ACTIVE && env.SPECWEAVE_SESSION_ACTIVE !== '0') {
    return `SPECWEAVE_SESSION_ACTIVE=${env.SPECWEAVE_SESSION_ACTIVE} — refinements are forbidden inside a /sw:do or /sw:done session (ADR-0671-01).`;
  }
  const lockPath = join(projectRoot, '.specweave/state/active-session.lock');
  if (existsSync(lockPath)) {
    return `active session lock present at ${lockPath} — refinements are forbidden inside a /sw:do or /sw:done session (ADR-0671-01).`;
  }
  return null;
}

/**
 * Resolve the SKILL.md path to refine. `project` scope targets
 * `<projectRoot>/.claude/skills/<slugDir>/SKILL.md`; `user` scope targets
 * `~/.claude/skills/<slugDir>/SKILL.md`. The slug's leading namespace
 * (e.g. `sw:` → `sw-`) is mapped to a flat directory name, matching the
 * existing flat-dir convention (see feedback_skill_naming_flat_dirs).
 */
export function resolveSkillPath(slug: string, scope: Scope, projectRoot: string): string {
  const dir = slug.replace(/:/g, '-');
  const base = scope === 'user' ? join(homedir(), '.claude/skills') : join(projectRoot, '.claude/skills');
  return join(base, dir, 'SKILL.md');
}

/**
 * Main entry. Returns a structured result instead of throwing for known
 * non-error outcomes (no signals, dry-run, rejected). Unknown errors propagate.
 */
export async function runSkillRefine(opts: RunOptions): Promise<RunResult> {
  const out = opts.stdout ?? process.stdout;
  const env = opts.env ?? process.env;

  const args = parseArgs(opts.argv);

  // ── Session-lock guard (ADR-0671-01) ───────────────────────────────
  const lockReason = detectSessionLock(opts.projectRoot, env);
  if (lockReason) {
    out.write(`sw:skill-refine: refusing to run — ${lockReason}\n`);
    return { status: 'rejected', message: lockReason };
  }

  // ── Resolve SKILL.md path ──────────────────────────────────────────
  const skillPath = resolveSkillPath(args.skillSlug, args.scope, opts.projectRoot);
  if (!existsSync(skillPath)) {
    const msg = `SKILL.md not found at ${skillPath} (scope=${args.scope}). Nothing to refine.`;
    out.write(msg + '\n');
    return { status: 'no-diff', message: msg };
  }

  // ── Aggregate signals ──────────────────────────────────────────────
  const signalsPath = join(opts.projectRoot, '.specweave/state/skill-signals.json');
  const agg = await aggregate(signalsPath, args.skillSlug, {
    lastNIncrements: args.lastN,
  });

  // --show-signals short-circuits before any LLM call.
  if (args.showSignals) {
    out.write(renderSignalReport(agg) + '\n');
    return { status: 'shown-signals', message: `rendered ${agg.totalSignals} signals` };
  }

  if (agg.totalSignals === 0) {
    const msg = `No refinement signals found for ${args.skillSlug} in the last ${agg.window.lastNIncrements} increments.`;
    out.write(msg + '\n');
    return { status: 'no-signals', message: msg };
  }

  // ── Haiku diff proposal ────────────────────────────────────────────
  if (!opts.client) {
    throw new Error(
      'sw:skill-refine requires an Anthropic client. Set ANTHROPIC_API_KEY and retry.',
    );
  }
  const skillMd = await fs.readFile(skillPath, 'utf-8');
  const proposal = await proposeDiff({
    client: opts.client,
    skillMd,
    aggregate: agg,
  });

  if (!proposal.diff.trim()) {
    const msg = `Haiku: ${proposal.rationale} (empty diff — nothing to apply).`;
    out.write(msg + '\n');
    return { status: 'no-diff', message: msg };
  }

  // --dry-run short-circuits before approval/writes.
  if (args.dryRun) {
    out.write(`Rationale: ${proposal.rationale}\n`);
    out.write(proposal.diff + '\n');
    return { status: 'dry-run', message: 'diff printed; no writes performed.' };
  }

  // ── Interactive approval ───────────────────────────────────────────
  const prompts = opts.prompts ?? (await defaultPromptFns());
  const decision = await runApprovalFlow(
    {
      targetSkill: args.skillSlug,
      rationale: proposal.rationale,
      diff: proposal.diff,
    },
    prompts,
  );

  const ledgerPath = join(opts.projectRoot, '.specweave/state/skill-refinements.json');
  const signalIds = agg.signals.map((s) => s.id);

  if (decision.action === 'reject') {
    await appendRejected(ledgerPath, {
      targetSkill: args.skillSlug,
      author: 'user',
      signalIds,
      rationale: proposal.rationale,
      rejectionReason: decision.reason,
    });
    const msg = `Rejected: ${decision.reason}`;
    out.write(msg + '\n');
    return { status: 'rejected', message: msg };
  }

  // ── Apply + commit + ledger ────────────────────────────────────────
  const result = await applyRefinement({
    skillPath,
    diff: decision.diff,
    rationale: proposal.rationale,
    signalIds,
    targetSkill: args.skillSlug,
    ledgerPath,
    repoRoot: opts.projectRoot,
  });
  const msg = `Applied: ${result.commitSha} — ${proposal.rationale}`;
  out.write(msg + '\n');
  return { status: 'applied', message: msg, commitSha: result.commitSha };
}

/**
 * Pretty-print an aggregate for `--show-signals`. Deterministic output shape.
 */
export function renderSignalReport(agg: AggregateResult): string {
  const lines: string[] = [
    `## sw:skill-refine — signals for ${agg.targetSkill}`,
    `Window: last ${agg.window.lastNIncrements} increments`,
    `Total: ${agg.totalSignals}`,
    `By source: judge-llm=${agg.bySource['judge-llm']} rubric=${agg.bySource.rubric} code-reviewer=${agg.bySource['code-reviewer']}`,
    `By severity: high=${agg.bySeverity.high} medium=${agg.bySeverity.medium} low=${agg.bySeverity.low}`,
    `Increments: ${agg.incrementIds.join(', ') || '(none)'}`,
    '',
    'Evidence:',
  ];
  if (agg.signals.length === 0) {
    lines.push('  (none)');
  } else {
    for (const s of agg.signals) {
      lines.push(`  - [${s.severity}/${s.source}/${s.incrementId}] ${s.evidence}`);
    }
  }
  return lines.join('\n');
}
