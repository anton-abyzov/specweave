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
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
/**
 * Main function - sync living docs for given increment
 */
async function syncLivingDocs(incrementId) {
    try {
        console.log(`\n📚 Checking living docs sync for increment: ${incrementId}`);
        // 1. Load config
        const configPath = path.join(process.cwd(), '.specweave', 'config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        }
        // 2. Check if sync enabled
        const syncEnabled = config.hooks?.post_task_completion?.sync_living_docs ?? false;
        if (!syncEnabled) {
            console.log('ℹ️  Living docs sync disabled in config');
            console.log('   To enable: Set hooks.post_task_completion.sync_living_docs = true');
            return;
        }
        console.log('✅ Living docs sync enabled');
        // 3. Detect changed docs via git diff
        const changedDocs = detectChangedDocs();
        if (changedDocs.length === 0) {
            console.log('ℹ️  No living docs changed (no git diff in .specweave/docs/)');
            return;
        }
        console.log(`📄 Detected ${changedDocs.length} changed doc(s):`);
        changedDocs.forEach((doc) => console.log(`   - ${doc}`));
        // 4. Sync to GitHub if configured
        await syncToGitHub(incrementId, changedDocs);
        console.log('✅ Living docs sync complete\n');
    }
    catch (error) {
        console.error('❌ Error syncing living docs:', error);
        // Don't exit with error - this is best-effort
    }
}
/**
 * Detect changed documentation files via git diff
 */
function detectChangedDocs() {
    try {
        // Get changed files in .specweave/docs/
        const output = execSync('git diff --name-only .specweave/docs/ 2>/dev/null || true', {
            encoding: 'utf-8',
            cwd: process.cwd(),
        }).trim();
        if (!output) {
            return [];
        }
        // Filter to only .md files
        const files = output
            .split('\n')
            .filter((f) => f.endsWith('.md'))
            .filter((f) => f.length > 0);
        return files;
    }
    catch (error) {
        console.warn('⚠️  Could not detect git changes:', error);
        return [];
    }
}
/**
 * Sync changed docs to GitHub
 */
async function syncToGitHub(incrementId, changedDocs) {
    try {
        console.log('\n🔄 Syncing to GitHub...');
        // Dynamic import to avoid circular dependencies
        const { loadIncrementMetadata, detectRepo, collectLivingDocs, updateIssueLivingDocs, postArchitectureComment } = await import('../../../specweave-github/lib/github-issue-updater.js');
        // 1. Load metadata
        const metadata = await loadIncrementMetadata(incrementId);
        if (!metadata?.github?.issue) {
            console.log('ℹ️  No GitHub issue linked, skipping GitHub sync');
            return;
        }
        // 2. Detect repository
        const repoInfo = await detectRepo();
        if (!repoInfo) {
            console.log('⚠️  Could not detect GitHub repository, skipping GitHub sync');
            return;
        }
        const { owner, repo } = repoInfo;
        const issueNumber = metadata.github.issue;
        console.log(`   Syncing to ${owner}/${repo}#${issueNumber}`);
        // 3. Collect all living docs
        const livingDocs = await collectLivingDocs(incrementId);
        // 4. Update issue with living docs section
        if (livingDocs.specs.length > 0 || livingDocs.architecture.length > 0 || livingDocs.diagrams.length > 0) {
            await updateIssueLivingDocs(issueNumber, livingDocs, owner, repo);
        }
        // 5. Post comments for newly created architecture docs
        for (const docPath of changedDocs) {
            if (docPath.includes('/architecture/')) {
                await postArchitectureComment(issueNumber, docPath, owner, repo);
            }
        }
        console.log('✅ GitHub sync complete');
    }
    catch (error) {
        console.error('❌ Error syncing to GitHub:', error);
        console.error('   (Non-blocking - continuing...)');
    }
}
// CLI entry point
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    const incrementId = process.argv[2];
    if (!incrementId) {
        console.error('❌ Usage: sync-living-docs <incrementId>');
        console.error('   Example: sync-living-docs 0006-llm-native-i18n');
        process.exit(1);
    }
    syncLivingDocs(incrementId).catch((error) => {
        console.error('❌ Fatal error:', error);
        // Don't exit with error code - best-effort sync
    });
}
export { syncLivingDocs };
//# sourceMappingURL=sync-living-docs.js.map