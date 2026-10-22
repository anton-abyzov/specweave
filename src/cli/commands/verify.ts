/**
 * CLI: `specweave verify [id]` — run the project's verification commands and
 * write reports/verify.{md,json}. Exit non-zero when any command fails.
 *
 * @module cli/commands/verify
 */

import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { resolveIncrement, readLeaseHours, IncrementResolutionError } from '../../core/tasks/resolve-increment.js';
import { detectSessionId } from '../../core/tasks/ledger.js';
import { recordIncrementWork } from '../../core/tasks/work-session.js';
import { runVerify, describeUncheckedAcs, NO_COMMANDS_MESSAGE } from '../../core/tasks/verify-runner.js';

export interface VerifyCommandOptions {
  json?: boolean;
  /** Override cwd (tests). */
  cwd?: string;
  /** Extra/override commands, repeatable `--cmd`. */
  cmd?: string[];
  /** Accept an empty command list (recorded in verify.json). */
  reason?: string;
}

export async function verifyCommand(incrementId?: string, opts: VerifyCommandOptions = {}): Promise<number> {
  const out = (s: string) => process.stdout.write(s + '\n');
  const err = (s: string) => process.stderr.write(s + '\n');
  const cwd = opts.cwd ?? process.cwd();
  const projectRoot = resolveEffectiveRoot(cwd);

  let inc;
  try {
    inc = resolveIncrement(projectRoot, incrementId);
  } catch (e) {
    if (e instanceof IncrementResolutionError) { err(e.message); return 1; }
    throw e;
  }

  recordIncrementWork(inc.dir, { e: 'verify' }, { sessionId: detectSessionId() });
  const result = await runVerify(projectRoot, inc.id, inc.dir, {
    commands: opts.cmd && opts.cmd.length ? opts.cmd : undefined,
    leaseHours: readLeaseHours(projectRoot),
    onCommand: (cmd) => { if (!opts.json) out(`▶ ${cmd}`); },
    reason: opts.reason,
  });
  if (result.results.length === 0 && !result.report.reason) {
    err(`${NO_COMMANDS_MESSAGE} (${result.source}). Set testing.commands in .specweave/config.json, pass --cmd "<command>", or --reason "<why nothing runs>".`);
  }

  if (opts.json) {
    out(JSON.stringify(result.report, null, 2));
  } else {
    for (const r of result.results) out(`${r.exit === 0 ? 'ok  ' : 'FAIL'} ${r.cmd} (exit ${r.exit})`);
    if (result.results.length === 0 && result.report.reason) out(`No verification commands (${result.source}); accepted — reason: ${result.report.reason}`);
    const { report } = result;
    out(`ACs ${report.acs.done}/${report.acs.total} · tasks ${report.tasks.done}/${report.tasks.total} done (${report.tasks.skipped} skipped)`);
    const unchecked = describeUncheckedAcs(report.acs);
    if (unchecked) {
      out(`  ${unchecked} — tick them in spec.md (\`- [x] AC-01 …\`) or close with \`specweave complete ${inc.id} --reason "<why>"\``);
      for (const a of result.acs.filter((x) => !x.done)) out(`    [ ] ${a.id} ${a.text}`.trimEnd());
    }
    for (const s of report.skipped) out(`  skipped ${s.id}: ${s.reason ?? '(no reason recorded)'}`);
    if (report.ledgerMalformed) out(`  ${report.ledgerMalformed} malformed ledger line(s) skipped`);
    out(`${report.ok ? 'PASS' : 'FAIL'} → ${path.relative(cwd, result.mdPath).split(path.sep).join('/')}`);
    if (report.ok) out(`Next: specweave complete ${inc.id}`);
  }
  return result.report.ok ? 0 : 1;
}
