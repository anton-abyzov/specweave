import * as path from 'path';
import { spawnSync } from 'child_process';
import { detectSessionId } from '../../core/tasks/ledger.js';
import { recordIncrementWork } from '../../core/tasks/work-session.js';
import { completeIncrement } from '../../core/increment/status-commands.js';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { listTaskCompleteIncrementIds, readLeaseHours } from '../../core/tasks/resolve-increment.js';

interface CompleteCommandOptions {
  silent?: boolean;
  skipValidation?: boolean;
  yes?: boolean;
  /** Close without a passing reports/verify.json (stored as metadata.closeReason). */
  reason?: string;
  /** Batch-close every active increment whose tasks are all done or skipped. */
  all?: boolean;
}

/**
 * CLI command to complete one or more active increments
 *
 * This is used by:
 * 1. Manual user invocation: specweave complete <id> [more-ids...]
 * 2. Auto mode stop hook: specweave complete <id> --silent --yes
 *
 * Features:
 * - Short-ID resolution: "0589" → "0589-cli-complete-improvements"
 * - Batch mode: "specweave complete 0573 0562 0571"
 * - Per-ID error isolation: one failure doesn't stop others
 *
 * @param incrementId - First increment ID (required)
 * @param moreIds - Additional increment IDs (variadic)
 * @param options - Command options (silent, skipValidation, yes)
 * @since v4.0 - Auto mode stop hook integration
 * @since v4.1 - Short-ID resolution and batch mode
 */
export async function completeCommand(
  incrementId: string | undefined,
  moreIds: string[] = [],
  options: CompleteCommandOptions = {}
): Promise<void> {
  const projectRoot = resolveEffectiveRoot();

  let allIds: string[];
  if (options.all) {
    if (!options.reason?.trim()) {
      console.error('Error: --all requires --reason "<why these are being closed in bulk>"');
      process.exit(1);
    }
    allIds = listTaskCompleteIncrementIds(projectRoot, readLeaseHours(projectRoot));
    if (allIds.length === 0) {
      console.log('Nothing to close: no active increment has every task done or skipped.');
      return;
    }
    console.log(`Closing ${allIds.length} task-complete increment(s): ${allIds.join(', ')}`);
  } else {
    if (!incrementId) {
      console.error('Error: specweave complete <increment-id> [more-ids...] | --all --reason "<why>"');
      process.exit(1);
    }
    allIds = [incrementId, ...moreIds];
  }

  const results: Array<{ id: string; resolved: string; success: boolean }> = [];
  const isBatch = allIds.length > 1;

  for (const id of allIds) {
    // Resolve short ID to full slug
    const resolved = resolveIncrementId(id, projectRoot);

    if (resolved === null) {
      console.error(`Error: No increment found matching "${id}"`);
      results.push({ id, resolved: id, success: false });
      continue;
    }

    if (Array.isArray(resolved)) {
      console.error(`Error: Ambiguous increment ID "${id}" matches multiple increments:`);
      for (const match of resolved) {
        console.error(`  - ${match}`);
      }
      results.push({ id, resolved: id, success: false });
      continue;
    }

    // Complete the resolved increment (try/catch for batch error isolation)
    let success = false;
    try {
      success = await completeIncrement({
        incrementId: resolved,
        silent: options.silent || options.yes,
        skipValidation: options.skipValidation,
        reason: options.reason,
      });
    } catch (err) {
      console.error(`Error completing "${resolved}": ${err instanceof Error ? err.message : String(err)}`);
    }

    if (success) {
      recordIncrementWork(path.join(projectRoot, '.specweave', 'increments', resolved), { e: 'complete' }, { sessionId: detectSessionId() });
      const hint = options.silent || options.yes ? undefined : commitHint(projectRoot, resolved, process.cwd());
      if (hint) console.log(hint);
    }
    results.push({ id, resolved, success });
  }

  // Print summary for batch mode
  if (isBatch) {
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`\nBatch complete: ${succeeded} succeeded, ${failed} failed`);
    if (failed > 0) {
      for (const r of results.filter(r => !r.success)) {
        console.log(`  ✗ ${r.id} (${r.resolved})`);
      }
    }
  }

  // Exit with error code if any completion failed
  const anyFailed = results.some(r => !r.success);
  if (anyFailed) {
    process.exit(1);
  }
}

/**
 * `complete` never commits, so say how when the closed increment has
 * uncommitted changes. Only inside a git work tree. The pathspec keeps other
 * staged work out of the commit; the path is relative to where the user is.
 */
export function commitHint(projectRoot: string, incrementId: string, cwd = projectRoot): string | undefined {
  const folder = path.join(projectRoot, '.specweave', 'increments', incrementId);
  const status = spawnSync('git', ['status', '--porcelain', '--', folder], { cwd: projectRoot, encoding: 'utf-8' });
  if (status.status !== 0 || !status.stdout.trim()) return undefined;
  const rel = path.relative(cwd, folder).split(path.sep).join('/') || '.';
  const num = incrementId.match(/^\d{3,}[A-Za-z]?(?=-)/)?.[0] ?? incrementId;
  return `Commit it: git add ${rel} && git commit -m "${num}: close" -- ${rel}`;
}
