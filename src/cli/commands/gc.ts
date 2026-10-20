/**
 * CLI command: gc
 *
 * Purges known junk from .specweave/state/ (dry-run by default, --yes to delete),
 * reports .worktrees size and nested .specweave/ directories, and expires
 * session checkpoints under ~/.specweave/checkpoints (same rule as the daily
 * background prune; also only with --yes).
 */

import * as path from 'path';
import chalk from 'chalk';
import { findEffectiveRoot } from '../../utils/find-project-root.js';
import {
  purgeState,
  findNestedSpecweaveDirs,
  worktreesSize,
  formatBytes,
} from '../../core/state/state-gc.js';
import { checkpointsDirectory } from '../../core/session/session-checkpoint.js';
import { CHECKPOINT_RETENTION_DAYS, pruneCheckpoints } from '../../core/session/checkpoint-retention.js';

export interface GcCommandOptions {
  yes?: boolean;
  json?: boolean;
  projectRoot?: string;
  /** Home holding `.specweave/checkpoints` (tests). */
  home?: string;
}

// NOTE: user-facing command output; console.* is intentional here.
export async function gcCommand(options: GcCommandOptions = {}): Promise<void> {
  // An explicit --project-root is the caller's responsibility. Otherwise resolve
  // the effective root with no process.cwd() fallback: the nested-.specweave
  // scan below walks the tree under this root, which outside a project would
  // be $HOME or / (0879).
  const projectRoot = options.projectRoot || findEffectiveRoot();
  if (!projectRoot) {
    const msg = `No SpecWeave project found: no .specweave/config.json in ${process.cwd()} or any parent directory`;
    if (options.json) {
      console.log(JSON.stringify({ error: msg }, null, 2));
    } else {
      console.log(chalk.yellow(`\n${msg}`));
      console.log(chalk.gray('Run this command from inside a SpecWeave project, or run `specweave init` first.\n'));
    }
    process.exitCode = 1;
    return;
  }
  const stateDir = path.join(projectRoot, '.specweave', 'state');

  const result = purgeState(stateDir, { apply: !!options.yes });
  const worktrees = worktreesSize(projectRoot);
  const nested = findNestedSpecweaveDirs(projectRoot);
  const checkpointsDir = checkpointsDirectory(options.home);
  const checkpoints = pruneCheckpoints(checkpointsDir, { apply: !!options.yes });

  if (options.json) {
    console.log(JSON.stringify({ ...result, worktreesBytes: worktrees, nestedSpecweaveDirs: nested, checkpoints: { dir: checkpointsDir, ...checkpoints } }, null, 2));
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

  const pending = checkpoints.pendingHandoffs ? `, ${checkpoints.pendingHandoffs} with a pending handoff` : '';
  const kept = chalk.dim(`(${checkpoints.kept} kept${pending})`);
  if (checkpoints.sessions === 0 && checkpoints.pointers === 0) {
    console.log(`Session checkpoints: nothing older than ${CHECKPOINT_RETENTION_DAYS} days ${kept}`);
  } else {
    const ptrs = checkpoints.pointers ? ` and ${checkpoints.pointers} Studio pointer${checkpoints.pointers === 1 ? '' : 's'}` : '';
    const verbC = checkpoints.applied ? 'deleted' : 'reclaimable';
    console.log(`Session checkpoints: ${checkpoints.sessions} older than ${CHECKPOINT_RETENTION_DAYS} days${ptrs}, ${formatBytes(checkpoints.bytes)} ${verbC} ${kept}`);
  }
  console.log(chalk.dim(`  ${checkpointsDir}`));

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
