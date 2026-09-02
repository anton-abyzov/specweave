/**
 * CLI: `specweave verify [id]` — run the project's verification commands and
 * write reports/verify.{md,json}. Exit non-zero when any command fails.
 *
 * @module cli/commands/verify
 */

import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { resolveIncrement, readLeaseHours, IncrementResolutionError } from '../../core/tasks/resolve-increment.js';
import { runVerify } from '../../core/tasks/verify-runner.js';

export interface VerifyCommandOptions {
  json?: boolean;
  /** Override cwd (tests). */
  cwd?: string;
  /** Extra/override commands, repeatable `--cmd`. */
  cmd?: string[];
}

export async function verifyCommand(incrementId?: string, opts: VerifyCommandOptions = {}): Promise<number> {
  const out = (s: string) => process.stdout.write(s + '\n');
  const err = (s: string) => process.stderr.write(s + '\n');
  const projectRoot = resolveEffectiveRoot(opts.cwd ?? process.cwd());

  let inc;
  try {
    inc = resolveIncrement(projectRoot, incrementId);
  } catch (e) {
    if (e instanceof IncrementResolutionError) { err(e.message); return 1; }
    throw e;
  }

  const result = await runVerify(projectRoot, inc.id, inc.dir, {
    commands: opts.cmd && opts.cmd.length ? opts.cmd : undefined,
    leaseHours: readLeaseHours(projectRoot),
    onCommand: (cmd) => { if (!opts.json) out(`▶ ${cmd}`); },
  });

  if (opts.json) {
    out(JSON.stringify(result.report, null, 2));
  } else {
    for (const r of result.results) out(`${r.exit === 0 ? 'ok  ' : 'FAIL'} ${r.cmd} (exit ${r.exit})`);
    if (result.results.length === 0) out(`No verification commands (${result.source}). Set testing.commands in .specweave/config.json.`);
    const { report } = result;
    out(`ACs ${report.acs.done}/${report.acs.total} · tasks ${report.tasks.done}/${report.tasks.total} done (${report.tasks.skipped} skipped)`);
    for (const s of report.skipped) out(`  skipped ${s.id}: ${s.reason ?? '(no reason recorded)'}`);
    if (report.ledgerMalformed) out(`  ${report.ledgerMalformed} malformed ledger line(s) skipped`);
    out(`${report.ok ? 'PASS' : 'FAIL'} → ${result.mdPath}`);
    if (report.ok) out(`Next: specweave complete ${inc.id}`);
  }
  return result.report.ok ? 0 : 1;
}
