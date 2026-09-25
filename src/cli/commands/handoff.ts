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
 *     [--decision <d> ...] [--inline] [--non-specweave] [--out <path>] [--json] \
 *     [--push] [--keep-claims]
 *
 * Output is three or four lines: what was handed off, how to continue ("pick
 * up" in the other tool), and where the details are. `--inline` prints a
 * paste-able prompt for the rare case with no Git remote and another machine.
 *
 * With `--json`, the full {@link WorkHandoffResult} is printed as JSON instead
 * (for programmatic callers — e.g. the hook handler and tests).
 *
 * Part of increment 0867: Cross-Tool Work Handoff.
 *
 * @module cli/commands/handoff
 */

import * as path from 'path';
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
  /** `--no-push` → false: keep the handoff local. Default: push when there is a remote. */
  push?: boolean;
  /** `--keep-claims` → do not release this agent's task claims. */
  keepClaims?: boolean;
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
    push: opts.push,
    keepClaims: opts.keepClaims,
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

  // Short by design: the other side needs two words ("pick up"), not a prompt.
  const out: string[] = [];
  const rel = path.relative(startDir, result.docPath).split(path.sep).join('/') || result.docPath;
  const what: string[] = [];
  if (result.released.length) what.push(`released ${result.released.join(', ')}`);
  if (result.push?.branch) what.push(`pushed ${result.push.branch}`);
  if (result.push?.wipRef) what.push('pushed your uncommitted edits');
  else if (result.push?.handoffRef) what.push('pushed the handoff');
  out.push(`Handed off${result.incrementId ? ` ${result.incrementId}` : ''}${what.length ? ` (${what.join(', ')})` : ''}.`);
  for (const w of result.push?.warnings ?? []) out.push(`warning: ${w}`);
  if (result.push?.handoffRef) {
    out.push('To continue in any tool, machine or account, say "pick up" there (or run `specweave pickup`).');
  } else if (opts.inline) {
    out.push('Paste this into the other tool:');
    out.push('```');
    out.push(result.pastePrompt);
    out.push('```');
  } else {
    out.push('To continue in another tool on this machine, say "pick up" there (or run `specweave pickup`).');
    out.push('Nothing was pushed, so another machine or a cloud session will not see it; run `specweave handoff --inline` for a prompt you can paste instead.');
  }
  out.push(`Details: ${rel}`);

  process.stdout.write(out.join('\n') + '\n');
}
