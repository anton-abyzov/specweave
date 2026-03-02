/**
 * CLI Command: sync-task
 *
 * Lightweight command called by the task-ac-sync-guard shell hook
 * after a task is marked complete. Invokes LifecycleHookDispatcher.onTaskCompleted()
 * which triggers living docs sync and external tool sync based on config.
 *
 * Designed to be called non-blocking (backgrounded with &) from shell hooks.
 *
 * Usage: specweave sync-task <increment-id>
 *
 * @see LifecycleHookDispatcher.onTaskCompleted
 * @see task-ac-sync-guard.sh
 */

import { LifecycleHookDispatcher } from '../../core/hooks/LifecycleHookDispatcher.js';

export async function syncTask(args: string[]): Promise<void> {
  const incrementId = args.find(a => !a.startsWith('-'));

  if (!incrementId) {
    process.stderr.write('sync-task: increment-id required\n');
    process.exit(1);
    return;
  }

  const projectRoot = process.cwd();

  try {
    await LifecycleHookDispatcher.onTaskCompleted(projectRoot, incrementId);
  } catch (error) {
    // Non-blocking command — log to stderr and exit cleanly
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`sync-task: ${msg}\n`);
    process.exit(1);
  }
}

// Main entry point when run directly
if (process.argv[1]?.endsWith('sync-task.js') || process.argv[1]?.endsWith('sync-task.ts')) {
  const args = process.argv.slice(2);
  syncTask(args).catch(err => {
    process.stderr.write(`sync-task: ${err}\n`);
    process.exit(1);
  });
}
