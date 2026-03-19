import { completeIncrement } from '../../core/increment/status-commands.js';
import { resolveIncrementId } from '../../utils/resolve-increment-id.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';

interface CompleteCommandOptions {
  silent?: boolean;
  skipValidation?: boolean;
  yes?: boolean;
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
  incrementId: string,
  moreIds: string[] = [],
  options: CompleteCommandOptions = {}
): Promise<void> {
  const projectRoot = resolveEffectiveRoot();
  const allIds = [incrementId, ...moreIds];
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
      });
    } catch (err) {
      console.error(`Error completing "${resolved}": ${err instanceof Error ? err.message : String(err)}`);
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
