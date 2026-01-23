/**
 * GitHub Reconciler (NEW in v0.28.33)
 *
 * Reconciles GitHub issue states with increment metadata.json statuses.
 * Fixes drift between local SpecWeave state and GitHub:
 * - Closes issues for completed increments that are still open
 * - Reopens issues for in-progress increments that are closed
 *
 * Triggered by:
 * - /specweave-github:reconcile command (manual)
 * - SessionStart hook (automatic, if configured)
 * - post-increment-status-change.sh (on resume/abandon)
 */
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
import { consoleLogger } from '../utils/logger.js';
export class GitHubReconciler {
    constructor(options) {
        this.client = null;
        this.projectRoot = options.projectRoot;
        this.dryRun = options.dryRun ?? false;
        this.logger = options.logger ?? consoleLogger;
    }
    /**
     * Main reconciliation entry point
     */
    async reconcile() {
        const result = {
            scanned: 0,
            mismatches: 0,
            closed: 0,
            reopened: 0,
            errors: [],
            details: [],
        };
        try {
            // 1. Check if GitHub sync is enabled
            const config = await this.loadConfig();
            const canUpdate = config.sync?.settings?.canUpdateExternalItems ?? false;
            const githubEnabled = config.sync?.github?.enabled ?? false;
            if (!canUpdate || !githubEnabled) {
                this.logger.log('ℹ️  GitHub sync is disabled - skipping reconciliation');
                this.logger.log('   Enable with: canUpdateExternalItems=true AND sync.github.enabled=true');
                return result;
            }
            // 2. Initialize GitHub client
            await this.initClient();
            if (!this.client) {
                result.errors.push('Failed to initialize GitHub client');
                return result;
            }
            // 3. Scan all non-archived increments
            const increments = await this.scanIncrements();
            result.scanned = increments.length;
            this.logger.log(`\n📊 Scanning ${increments.length} increment(s) for GitHub state drift...\n`);
            // 4. Check and fix each increment
            for (const inc of increments) {
                await this.reconcileIncrement(inc, result);
            }
            // 5. Report summary
            this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            this.logger.log('📊 RECONCILIATION SUMMARY');
            this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            this.logger.log(`   Increments scanned: ${result.scanned}`);
            this.logger.log(`   Mismatches found:   ${result.mismatches}`);
            this.logger.log(`   Issues closed:      ${result.closed}`);
            this.logger.log(`   Issues reopened:    ${result.reopened}`);
            this.logger.log(`   Errors:             ${result.errors.length}`);
            if (this.dryRun) {
                this.logger.log('\n   ⚠️  DRY RUN - No changes were made');
            }
            this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            return result;
        }
        catch (error) {
            result.errors.push(`Reconciliation error: ${error.message}`);
            this.logger.error('❌ Reconciliation failed:', error.message);
            return result;
        }
    }
    /**
     * Reconcile a single increment
     */
    async reconcileIncrement(inc, result) {
        const status = inc.metadataStatus;
        // Determine expected GitHub state
        const shouldBeClosed = status === 'completed' || status === 'abandoned';
        const shouldBeOpen = status === 'active' || status === 'planning' || status === 'backlog' || status === 'ready_for_review';
        // Check main issue
        if (inc.mainIssue) {
            await this.reconcileIssue(inc.incrementId, inc.mainIssue.number, shouldBeClosed, shouldBeOpen, status, result);
        }
        // Check User Story issues
        for (const us of inc.userStoryIssues) {
            await this.reconcileIssue(`${inc.incrementId}/${us.userStoryId}`, us.issueNumber, shouldBeClosed, shouldBeOpen, status, result);
        }
    }
    /**
     * Reconcile a single issue
     */
    async reconcileIssue(context, issueNumber, shouldBeClosed, shouldBeOpen, metadataStatus, result) {
        try {
            // Get current GitHub state
            const issue = await this.client.getIssue(issueNumber);
            const isCurrentlyClosed = issue.state === 'closed';
            // Check for mismatch
            if (shouldBeClosed && !isCurrentlyClosed) {
                // Should be closed but is open
                result.mismatches++;
                this.logger.log(`  ❌ Issue #${issueNumber} (${context}): OPEN but should be CLOSED (status=${metadataStatus})`);
                if (!this.dryRun) {
                    const comment = `## 🔄 Auto-Reconciled

This issue was closed by SpecWeave reconciliation.

**Reason**: Increment status is \`${metadataStatus}\` but GitHub issue was still open.

---
🤖 Auto-reconciled by SpecWeave`;
                    await this.client.closeIssue(issueNumber, comment);
                    result.closed++;
                    this.logger.log(`     ✅ Closed issue #${issueNumber}`);
                }
                else {
                    this.logger.log(`     [DRY RUN] Would close issue #${issueNumber}`);
                }
                result.details.push({
                    incrementId: context,
                    action: this.dryRun ? 'skip' : 'close',
                    issueNumber,
                    reason: `Status=${metadataStatus}, GH=open`,
                });
            }
            else if (shouldBeOpen && isCurrentlyClosed) {
                // Should be open but is closed
                result.mismatches++;
                this.logger.log(`  ❌ Issue #${issueNumber} (${context}): CLOSED but should be OPEN (status=${metadataStatus})`);
                if (!this.dryRun) {
                    const comment = `## 🔄 Auto-Reopened

This issue was reopened by SpecWeave reconciliation.

**Reason**: Increment status is \`${metadataStatus}\` but GitHub issue was closed.

This typically happens when:
- Increment was resumed after being paused/completed
- Manual status change in metadata.json

---
🤖 Auto-reconciled by SpecWeave`;
                    await this.client.reopenIssue(issueNumber, comment);
                    result.reopened++;
                    this.logger.log(`     ✅ Reopened issue #${issueNumber}`);
                }
                else {
                    this.logger.log(`     [DRY RUN] Would reopen issue #${issueNumber}`);
                }
                result.details.push({
                    incrementId: context,
                    action: this.dryRun ? 'skip' : 'reopen',
                    issueNumber,
                    reason: `Status=${metadataStatus}, GH=closed`,
                });
            }
            else {
                // State matches - no action needed
                this.logger.log(`  ✅ Issue #${issueNumber} (${context}): State matches (${isCurrentlyClosed ? 'closed' : 'open'})`);
            }
        }
        catch (error) {
            result.errors.push(`Issue #${issueNumber}: ${error.message}`);
            result.details.push({
                incrementId: context,
                action: 'error',
                issueNumber,
                reason: error.message,
            });
            this.logger.error(`  ⚠️  Error checking issue #${issueNumber}: ${error.message}`);
        }
    }
    /**
     * Scan all non-archived increments and extract GitHub state
     */
    async scanIncrements() {
        const incrementsDir = path.join(this.projectRoot, '.specweave/increments');
        const results = [];
        if (!existsSync(incrementsDir)) {
            return results;
        }
        const entries = await fs.readdir(incrementsDir, { withFileTypes: true });
        for (const entry of entries) {
            // Skip non-directories and archive
            if (!entry.isDirectory() || entry.name === '_archive' || entry.name.startsWith('.')) {
                continue;
            }
            const incrementPath = path.join(incrementsDir, entry.name);
            const metadataPath = path.join(incrementPath, 'metadata.json');
            if (!existsSync(metadataPath)) {
                continue;
            }
            try {
                const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                const state = {
                    incrementId: entry.name,
                    incrementPath,
                    metadataStatus: metadata.status || 'unknown',
                    featureId: metadata.feature_id,
                    userStoryIssues: [],
                };
                // Extract main issue
                if (metadata.github?.issue) {
                    state.mainIssue = {
                        number: metadata.github.issue,
                        url: metadata.github.url,
                    };
                }
                // Extract User Story issues from metadata
                if (metadata.github?.issues && Array.isArray(metadata.github.issues)) {
                    for (const issue of metadata.github.issues) {
                        if (issue.userStory && issue.number) {
                            state.userStoryIssues.push({
                                userStoryId: issue.userStory,
                                issueNumber: issue.number,
                            });
                        }
                    }
                }
                // FALLBACK: Search GitHub if metadata doesn't have issues stored
                // This handles cases where issues were created but not recorded in metadata.json
                if (state.userStoryIssues.length === 0 && state.featureId) {
                    // Check if we have user_stories array (indicates issues might exist)
                    const userStories = metadata.user_stories || [];
                    if (userStories.length > 0 && this.client) {
                        this.logger.log(`  🔍 Searching GitHub for ${state.featureId} issues (not in metadata)...`);
                        try {
                            // Search for all issues matching the feature pattern
                            const foundIssues = await this.client.searchIssuesByFeature(state.featureId);
                            for (const issue of foundIssues) {
                                // Extract user story ID from title: [FS-063][US-001] Title
                                const match = issue.title.match(/\[([A-Z]+-\d+)\]\[([A-Z]+-\d+)\]/);
                                if (match && match[1] === state.featureId) {
                                    const usId = match[2];
                                    state.userStoryIssues.push({
                                        userStoryId: usId,
                                        issueNumber: issue.number,
                                    });
                                }
                            }
                            if (state.userStoryIssues.length > 0) {
                                this.logger.log(`     Found ${state.userStoryIssues.length} issue(s) via GitHub search`);
                            }
                        }
                        catch (error) {
                            this.logger.log(`  ⚠️  GitHub search failed: ${error.message}`);
                        }
                    }
                }
                // Only include if has GitHub links
                if (state.mainIssue || state.userStoryIssues.length > 0) {
                    results.push(state);
                }
            }
            catch (error) {
                // Skip invalid metadata
                this.logger.log(`  ⚠️  Skipping ${entry.name}: Invalid metadata.json`);
            }
        }
        return results;
    }
    /**
     * Initialize GitHub client
     */
    async initClient() {
        const repoInfo = await GitHubClientV2.detectRepo(this.projectRoot);
        if (!repoInfo) {
            throw new Error('Could not detect GitHub repository. Ensure you have a git remote configured.');
        }
        this.client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
        this.logger.log(`🔗 GitHub repository: ${repoInfo.owner}/${repoInfo.repo}`);
    }
    /**
     * Load config
     */
    async loadConfig() {
        const configPath = path.join(this.projectRoot, '.specweave/config.json');
        if (!existsSync(configPath)) {
            return {};
        }
        const content = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(content);
    }
    // ==========================================================================
    // Static helpers for single-increment operations (used by hooks)
    // ==========================================================================
    /**
     * Reopen all GitHub issues for an increment
     * Called by post-increment-status-change.sh when resuming
     */
    static async reopenIncrementIssues(projectRoot, incrementId, reason, logger) {
        const log = logger ?? consoleLogger;
        const result = { reopened: 0, errors: [] };
        try {
            // Load metadata
            const metadataPath = path.join(projectRoot, '.specweave/increments', incrementId, 'metadata.json');
            if (!existsSync(metadataPath)) {
                result.errors.push('metadata.json not found');
                return result;
            }
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
            // Initialize client
            const repoInfo = await GitHubClientV2.detectRepo(projectRoot);
            if (!repoInfo) {
                result.errors.push('Could not detect GitHub repository');
                return result;
            }
            const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
            const comment = `## ▶️ Increment Resumed

This issue was reopened because increment \`${incrementId}\` was resumed.

**Reason**: ${reason}

---
🤖 Auto-reopened by SpecWeave`;
            // Reopen main issue
            if (metadata.github?.issue) {
                try {
                    const issue = await client.getIssue(metadata.github.issue);
                    if (issue.state === 'closed') {
                        await client.reopenIssue(metadata.github.issue, comment);
                        result.reopened++;
                        log.log(`  ✅ Reopened main issue #${metadata.github.issue}`);
                    }
                }
                catch (error) {
                    result.errors.push(`Main issue: ${error.message}`);
                }
            }
            // Reopen User Story issues
            if (metadata.github?.issues && Array.isArray(metadata.github.issues)) {
                for (const usIssue of metadata.github.issues) {
                    if (usIssue.number) {
                        try {
                            const issue = await client.getIssue(usIssue.number);
                            if (issue.state === 'closed') {
                                await client.reopenIssue(usIssue.number, comment);
                                result.reopened++;
                                log.log(`  ✅ Reopened User Story issue #${usIssue.number}`);
                            }
                        }
                        catch (error) {
                            result.errors.push(`Issue #${usIssue.number}: ${error.message}`);
                        }
                    }
                }
            }
            return result;
        }
        catch (error) {
            result.errors.push(error.message);
            return result;
        }
    }
    /**
     * Close all GitHub issues for an abandoned increment
     * Called by post-increment-status-change.sh when abandoning
     */
    static async closeAbandonedIncrementIssues(projectRoot, incrementId, reason, logger) {
        const log = logger ?? consoleLogger;
        const result = { closed: 0, errors: [] };
        try {
            // Load metadata
            const metadataPath = path.join(projectRoot, '.specweave/increments', incrementId, 'metadata.json');
            if (!existsSync(metadataPath)) {
                result.errors.push('metadata.json not found');
                return result;
            }
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
            // Initialize client
            const repoInfo = await GitHubClientV2.detectRepo(projectRoot);
            if (!repoInfo) {
                result.errors.push('Could not detect GitHub repository');
                return result;
            }
            const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
            const comment = `## 🗑️ Increment Abandoned

This issue was closed because increment \`${incrementId}\` was abandoned.

**Reason**: ${reason}

---
🤖 Auto-closed by SpecWeave`;
            // Close main issue
            if (metadata.github?.issue) {
                try {
                    const issue = await client.getIssue(metadata.github.issue);
                    if (issue.state === 'open') {
                        await client.closeIssue(metadata.github.issue, comment);
                        result.closed++;
                        log.log(`  ✅ Closed main issue #${metadata.github.issue}`);
                    }
                }
                catch (error) {
                    result.errors.push(`Main issue: ${error.message}`);
                }
            }
            // Close User Story issues
            if (metadata.github?.issues && Array.isArray(metadata.github.issues)) {
                for (const usIssue of metadata.github.issues) {
                    if (usIssue.number) {
                        try {
                            const issue = await client.getIssue(usIssue.number);
                            if (issue.state === 'open') {
                                await client.closeIssue(usIssue.number, comment);
                                result.closed++;
                                log.log(`  ✅ Closed User Story issue #${usIssue.number}`);
                            }
                        }
                        catch (error) {
                            result.errors.push(`Issue #${usIssue.number}: ${error.message}`);
                        }
                    }
                }
            }
            return result;
        }
        catch (error) {
            result.errors.push(error.message);
            return result;
        }
    }
}
//# sourceMappingURL=github-reconciler.js.map