#!/usr/bin/env node
/**
 * SpecWeave Living Docs Auto-Sync
 *
 * Automatically syncs living documentation after task completion.
 *
 * Usage:
 *   node dist/hooks/lib/sync-living-docs.js <incrementId>
 *
 * Example:
 *   node dist/hooks/lib/sync-living-docs.js 0006-llm-native-i18n
 *
 * What it does:
 * 1. Checks if sync_living_docs enabled in config
 * 2. Detects changed docs via git diff
 * 3. Invokes /sync-docs update command (future implementation)
 * 4. Logs sync actions
 *
 * @author SpecWeave Team
 * @version 1.0.0
 */
/**
 * Main function - sync living docs for given increment
 */
declare function syncLivingDocs(incrementId: string): Promise<void>;
export { syncLivingDocs };
//# sourceMappingURL=sync-living-docs.d.ts.map