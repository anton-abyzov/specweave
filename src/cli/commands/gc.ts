/**
 * CLI command: gc
 *
 * Purges known junk from .specweave/state/ (dry-run by default, --yes to delete),
 * and reports .worktrees size and nested .specweave/ directories.
 */

import * as path from 'path';
import chalk from 'chalk';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import {
  purgeState,
  findNestedSpecweaveDirs,
  worktreesSize,
  formatBytes,
} from '../../core/state/state-gc.js';

export interface GcCommandOptions {
  yes?: boolean;
  json?: boolean;
  projectRoot?: string;
}

// NOTE: user-facing command output; console.* is intentional here.
export async function gcCommand(options: GcCommandOptions = {}): Promise<void> {
  const projectRoot = options.projectRoot || resolveEffectiveRoot();
  const stateDir = path.join(projectRoot, '.specweave', 'state');

  const result = purgeState(stateDir, { apply: !!options.yes });
  const worktrees = worktreesSize(projectRoot);
  const nested = findNestedSpecweaveDirs(projectRoot);

  if (options.json) {
    console.log(JSON.stringify({ ...result, worktreesBytes: worktrees, nestedSpecweaveDirs: nested }, null, 2));
    return;
  }

  const entries = result.applied ? result.deleted : result.candidates;
  const verb = result.applied ? 'Deleted' : 'Would delete';

  console.log(chalk.bold(`\n🧹 specweave gc ${result.applied ? '' : chalk.dim('(dry run — pass --yes to delete)')}\n`));
  console.log(chalk.dim(`State dir: ${stateDir}`));

  if (entries.length === 0) {
    console.log(chalk.green('✓ No junk in .specweave/state/'));
  } else {
    console.log(`${verb} ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} (${formatBytes(result.bytes)}):`);
    for (const e of entries) {
      console.log(`  ${chalk.dim('-')} ${e.path}${e.kind === 'dir' ? '/' : ''} ${chalk.dim(formatBytes(e.bytes))}`);
    }
  }

  console.log('');
  console.log(`.worktrees/: ${worktrees === 0 ? chalk.dim('absent') : formatBytes(worktrees)}`);

  if (nested.length > 0) {
    console.log('');
    console.log(chalk.yellow(`Nested .specweave/ directories (${nested.length}) — reported only, never deleted:`));
    for (const n of nested) {
      const tag = n.stale ? chalk.red('stale, no config.json') : chalk.dim('initialized');
      console.log(`  ${chalk.dim('-')} ${n.path} ${chalk.dim(formatBytes(n.bytes))} ${tag}`);
    }
  }
  console.log('');
}
