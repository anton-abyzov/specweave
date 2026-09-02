import { startIncrement } from '../../core/increment/status-commands.js';

/**
 * CLI command to start a planned/backlog/paused increment (→ active).
 *
 * The 2.0 loop (`task`, `verify`, `handoff`) resolves the single ACTIVE
 * increment; this is the explicit transition into that state.
 *
 * @param incrementId - Increment ID, bare (`0007`) or full (`0007-name`)
 */
export async function startCommand(incrementId: string): Promise<void> {
  await startIncrement({ incrementId });
}
