/**
 * CLI Command: handoff
 *
 * Assembles a portable, secret-scrubbed work-handoff document (+ a full diff of
 * uncommitted edits) so a developer can stop work in one AI coding tool and
 * resume in another. Thin wrapper over {@link buildWorkHandoff} — all the
 * expensive, deterministic assembly lives in the core builder; this command
 * only maps flags → options and prints the result in the contractual order.
 *
 * Usage:
 *   specweave handoff [incrementId] \
 *     [--reason <r>] [--summary <s>] [--next <n>] [--gotcha <g>] \
 *     [--decision <d> ...] [--inline] [--non-specweave] [--out <path>] [--json]
 *
 * Output order (AC-US1-02 / US-005 — STRICT):
 *   1. The absolute doc path as PLAIN TEXT (first line — for shell capture).
 *   2. A clickable markdown link to the doc.
 *   3. The `.diff` path.
 *   4. The fenced copy-paste resume prompt.
 *   5. A note that per-tool "find your source session" tips live inside the doc.
 *
 * With `--json`, the full {@link WorkHandoffResult} is printed as JSON instead
 * (for programmatic callers — e.g. the hook handler and tests).
 *
 * Part of increment 0867: Cross-Tool Work Handoff.
 *
 * @module cli/commands/handoff
 */

import {
  buildWorkHandoff,
  AmbiguousActiveIncrementError,
  type WorkHandoffOptions,
} from '../../core/session/work-handoff.js';

/**
 * Options as parsed by commander. The positional `[incrementId]` is passed
 * through `incrementId`; `--decision` is repeatable and collected into an array.
 */
export interface HandoffCommandOptions {
  /** Positional disambiguator when 2+ increments are active. */
  incrementId?: string;
  reason?: string;
  summary?: string;
  next?: string;
  gotcha?: string;
  /** Repeatable `--decision` flag → string[]. */
  decision?: string[];
  /** `--inline` / `--clipboard` → embed the full body in the paste-prompt. */
  inline?: boolean;
  /** `--non-specweave` → force the `.handoff/` fallback. */
  nonSpecweave?: boolean;
  /** `--out <path>` → override the doc output path. */
  out?: string;
  /** `--json` → print the full result as JSON. */
  json?: boolean;
  /** Override the starting directory for workspace resolution (tests). */
  cwd?: string;
}

export async function handoffCommand(opts: HandoffCommandOptions = {}): Promise<void> {
  const startDir = opts.cwd ?? process.cwd();

  const builderOpts: WorkHandoffOptions = {
    incrementId: opts.incrementId,
    reason: opts.reason,
    summary: opts.summary,
    next: opts.next,
    gotcha: opts.gotcha,
    decisions: opts.decision,
    inline: opts.inline,
    out: opts.out,
    nonSpecweave: opts.nonSpecweave,
  };

  let result;
  try {
    result = await buildWorkHandoff(startDir, builderOpts);
  } catch (err) {
    if (err instanceof AmbiguousActiveIncrementError) {
      // 2+ active increments and no explicit id — list candidates and tell the
      // user exactly how to disambiguate. Non-zero exit so scripts can detect it.
      process.stderr.write(
        `Multiple active increments — pass one explicitly:\n` +
          err.candidates.map((id) => `  - ${id}`).join('\n') +
          `\n\nRe-run with the id, e.g.:  specweave handoff ${err.candidates[0]}\n`,
      );
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }

  // ── Contractual output order (AC-US1-02) ──────────────────────────────────
  const out: string[] = [];
  // 1. Absolute doc path as PLAIN TEXT, first.
  out.push(result.docPath);
  // 2. Clickable markdown link.
  out.push(`[handoff doc](${result.docPath})`);
  // 3. The .diff path.
  out.push(`Uncommitted diff: ${result.diffPath}`);
  // 4. Fenced copy-paste resume prompt.
  out.push('');
  out.push('Copy-paste this prompt into the other tool:');
  out.push('```');
  out.push(result.pastePrompt);
  out.push('```');
  // 5. Note that per-tool tips live inside the doc.
  out.push('');
  out.push(
    `Per-tool "find your source session" tips are inside the doc (How To Resume section): ${result.docPath}`,
  );

  process.stdout.write(out.join('\n') + '\n');
}
