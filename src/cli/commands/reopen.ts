/**
 * CLI: `specweave --workspace <root> reopen <id> --reason <text>` — correct a
 * completed increment back to planned. Never activates; see core/increment/reopen.
 *
 * Exit 0: reopened, or already reopened. 1: refused or failed (nothing written).
 *
 * @module cli/commands/reopen
 */

import chalk from 'chalk';
import { reopenIncrement, ReopenRefused } from '../../core/increment/reopen.js';

export interface ReopenCommandOptions {
  reason?: string;
  json?: boolean;
  /** Workspace root (tests); the CLI passes it through SPECWEAVE_WORKSPACE. */
  workspace?: string;
  env?: NodeJS.ProcessEnv;
}

export async function reopenCommand(incrementId: string, opts: ReopenCommandOptions = {}): Promise<number> {
  const out = (s: string) => process.stdout.write(s + '\n');
  let result;
  try {
    result = reopenIncrement({ incrementId, reason: opts.reason, workspace: opts.workspace, env: opts.env });
  } catch (e) {
    const refused = e instanceof ReopenRefused;
    const message = e instanceof Error ? e.message : String(e);
    if (opts.json) out(JSON.stringify({ error: refused ? e.code : 'failed', message, ...(refused && e.owners.length ? { owners: e.owners } : {}) }, null, 2));
    else process.stderr.write(chalk.red(`Not reopened: ${message}`) + '\n');
    return 1;
  }

  if (opts.json) {
    out(JSON.stringify(result, null, 2));
    return 0;
  }
  if (result.unchanged) {
    out(`${result.id} is already reopened (planned since ${result.at}, by ${result.by}). Nothing changed.`);
  } else {
    out(chalk.green(`Reopened ${result.id}: completed → planned.`) + ` Reason: ${result.reason}`);
    const closed = result.previous.approvedAt ? `closed ${result.previous.approvedAt}` : 'closure';
    out(chalk.gray(`  The ${closed} is kept in metadata.reopened; the ledger and reports are unchanged.`));
  }
  if (result.unfinished.length) {
    out(`  Unfinished: ${result.unfinished.map((t) => `${t.task} ${t.status}${t.by ? ` (${t.by})` : ''}`).join(', ')}`);
  }
  const { count, limit } = result.active;
  out(`  Not active. Start it separately when there is capacity: specweave start ${result.id}` +
    chalk.gray(` (${count} active${limit ? ` of ${limit}` : ''})`));
  return 0;
}
