import { completeIncrement, CompleteOptions } from '../../core/increment/status-commands.js';

interface CompleteCommandOptions {
  silent?: boolean;
  skipValidation?: boolean;
  yes?: boolean;
}

/**
 * CLI command to complete an active increment
 *
 * This is used by:
 * 1. Manual user invocation: specweave complete <id>
 * 2. Auto mode stop hook: specweave complete <id> --silent --yes
 *
 * The completion triggers:
 * - StatusChangeSyncTrigger → External tool sync (GitHub/JIRA/ADO)
 * - Living docs update
 *
 * @param incrementId - The increment ID to complete (e.g., "0007")
 * @param options - Command options (silent, skipValidation, yes)
 * @since v4.0 - Auto mode stop hook integration
 */
export async function completeCommand(incrementId: string, options: CompleteCommandOptions = {}): Promise<void> {
  const success = await completeIncrement({
    incrementId,
    silent: options.silent || options.yes,  // --yes implies silent
    skipValidation: options.skipValidation
  });

  // Exit with error code if completion failed (for shell scripts)
  if (!success) {
    process.exit(1);
  }
}
