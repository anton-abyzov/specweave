/**
 * Hook CLI Command — entry point for Claude Code hook delegation.
 *
 * Usage: specweave hook <event-type>
 *
 * Reads JSON from stdin, dispatches to the correct handler via hook-router,
 * writes JSON to stdout. Always exits 0 — never crashes Claude Code.
 *
 * @module cli/commands/hook
 */

import { hookRouter } from '../../core/hooks/handlers/hook-router.js';
import { getSafeDefault } from '../../core/hooks/handlers/types.js';

/**
 * Read all of stdin as a string.
 */
async function readStdin(): Promise<string> {
  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      process.stdin.removeAllListeners();
      resolve(Buffer.concat(chunks).toString('utf-8'));
    }, 5000);

    process.stdin.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    process.stdin.on('error', () => {
      clearTimeout(timeout);
      resolve('');
    });

    // If stdin is already ended (no pipe), resolve immediately
    if (process.stdin.readableEnded) {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks).toString('utf-8'));
    }
  });
}

/**
 * Main hook handler entry point.
 */
export async function handleHook(eventType: string): Promise<void> {
  // Crash prevention
  process.on('unhandledRejection', () => {
    const fallback = getSafeDefault(eventType);
    process.stdout.write(JSON.stringify(fallback));
    process.exit(0);
  });

  try {
    const rawStdin = await readStdin();
    const result = await hookRouter(eventType, rawStdin);
    process.stdout.write(JSON.stringify(result));
  } catch {
    const fallback = getSafeDefault(eventType);
    process.stdout.write(JSON.stringify(fallback));
  }
}
