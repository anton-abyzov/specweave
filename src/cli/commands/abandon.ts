import { abandonIncrement, AbandonOptions } from '../../core/increment/status-commands.js';

interface AbandonCommandOptions {
  reason?: string;
  force?: boolean;
}

/**
 * CLI command to abandon an increment
 *
 * @param incrementId - The increment ID to abandon (e.g., "0007")
 * @param options - Command options (reason, force)
 */
export async function abandonCommand(incrementId: string, options: AbandonCommandOptions = {}): Promise<void> {
  await abandonIncrement({
    incrementId,
    reason: options.reason,
    force: options.force
  });
}
