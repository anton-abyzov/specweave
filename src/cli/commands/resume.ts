import { resumeIncrement, ResumeOptions } from '../../core/increment/status-commands.js';

interface ResumeCommandOptions {
  force?: boolean;
}

/**
 * CLI command to resume a paused or abandoned increment
 *
 * @param incrementId - The increment ID to resume (e.g., "0007")
 * @param options - Command options (force)
 */
export async function resumeCommand(incrementId: string, options: ResumeCommandOptions = {}): Promise<void> {
  await resumeIncrement({
    incrementId,
    force: options.force
  });
}
