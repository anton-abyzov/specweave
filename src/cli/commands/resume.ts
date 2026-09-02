import { resumeIncrement } from '../../core/increment/status-commands.js';

/**
 * CLI command to resume a paused or abandoned increment
 *
 * @param incrementId - The increment ID to resume (e.g., "0007")
 */
export async function resumeCommand(incrementId: string): Promise<void> {
  await resumeIncrement({ incrementId });
}
