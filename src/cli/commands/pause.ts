import { pauseIncrement, PauseOptions } from '../../core/increment/status-commands.js';

interface PauseCommandOptions {
  reason?: string;
  force?: boolean;
}

/**
 * CLI command to pause an active increment
 *
 * @param incrementId - The increment ID to pause (e.g., "0007")
 * @param options - Command options (reason, force)
 */
export async function pauseCommand(incrementId: string, options: PauseCommandOptions = {}): Promise<void> {
  await pauseIncrement({
    incrementId,
    reason: options.reason,
    force: options.force
  });
}
