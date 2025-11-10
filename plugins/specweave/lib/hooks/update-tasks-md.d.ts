#!/usr/bin/env node
/**
 * SpecWeave Tasks.md Auto-Updater
 *
 * Automatically updates tasks.md completion status after TodoWrite completes tasks.
 *
 * Usage:
 *   node dist/hooks/lib/update-tasks-md.js <incrementId>
 *
 * Example:
 *   node dist/hooks/lib/update-tasks-md.js 0006-llm-native-i18n
 *
 * What it does:
 * 1. Reads tasks.md for the given increment
 * 2. Finds recently completed tasks from TodoWrite
 * 3. Updates "[ ]" to "[x]" for completed tasks
 * 4. Updates "Status: ⏳ Pending" to "Status: [x] Completed"
 * 5. Recalculates progress percentage
 * 6. Writes back to tasks.md
 *
 * @author SpecWeave Team
 * @version 1.0.0
 */
/**
 * Main function - update tasks.md for given increment
 */
declare function updateTasksMd(incrementId: string): Promise<void>;
export { updateTasksMd };
//# sourceMappingURL=update-tasks-md.d.ts.map