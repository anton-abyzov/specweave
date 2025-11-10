#!/usr/bin/env node
/**
 * CLI wrapper for syncing increment changes to GitHub
 *
 * Usage:
 *   node dist/plugins/specweave-github/lib/cli-sync-increment-changes.js <incrementId> <changedFile>
 *
 * Example:
 *   node dist/plugins/specweave-github/lib/cli-sync-increment-changes.js 0015-hierarchical-sync spec.md
 */
import { syncIncrementChanges } from './github-sync-increment-changes.js';
const incrementId = process.argv[2];
const changedFile = process.argv[3];
if (!incrementId || !changedFile) {
    console.error('❌ Usage: cli-sync-increment-changes <incrementId> <changedFile>');
    console.error('   Example: cli-sync-increment-changes 0015-hierarchical-sync spec.md');
    process.exit(1);
}
if (!['spec.md', 'plan.md', 'tasks.md'].includes(changedFile)) {
    console.error(`❌ Invalid file: ${changedFile}`);
    console.error('   Must be one of: spec.md, plan.md, tasks.md');
    process.exit(1);
}
syncIncrementChanges(incrementId, changedFile).catch((error) => {
    console.error('❌ Fatal error:', error);
    // Don't exit with error code - best-effort sync
});
//# sourceMappingURL=cli-sync-increment-changes.js.map