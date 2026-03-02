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
import { resolvePermissions } from './config.js';
import { isProviderEnabled } from './status-mapper.js';
import { deriveFeatureId } from '../utils/feature-id-derivation.js';
function hasAnyGitHubSyncData(metadata) {
    if (metadata.github?.issue || metadata.github?.milestone)
        return true;
    if (Array.isArray(metadata.github?.issues) && metadata.github.issues.length > 0)
        return true;
    const ext = metadata.externalLinks?.github;
    if (!ext)
        return false;
    if (ext.milestone || ext.issueNumber)
        return true;
    if (ext.issues && typeof ext.issues === 'object' && Object.keys(ext.issues).length > 0)
        return true;
    return false;
}
export class GitHubReconciler {
    constructor(options) {
        this.client = null;
        this.configCache = null;
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
            // v1.0.240 FIX: Honor preset when explicit settings absent
            const syncAny = config.sync;
            const permissions = resolvePermissions(syncAny?.preset, undefined, config.sync?.settings);
            const canUpdate = config.sync?.settings?.canUpdateExternalItems ?? permissions.canUpsert;
            const githubEnabled = isProviderEnabled(config, 'github');
            if (!canUpdate || !githubEnabled) {
                this.logger.log('ℹ️  GitHub sync is disabled - skipping reconciliation');
                this.logger.log('   Enable with: canUpdateExternalItems=true AND sync.github.enabled=true');
                return result;
            }
            // 2. Initialize GitHub client
            await this.initClient(config);
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
        const shouldBeOpen = status === 'active' || status === 'planning' || status === 'backlog' || status === 'ready_for_review' || status === 'paused';
        if (!shouldBeClosed && !shouldBeOpen) {
            this.logger.log(`  ⚠️ Unknown increment status '${status}' for ${inc.incrementId} — skipping`);
            return;
        }
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
     * Scan all increments (active + archived + abandoned) and extract GitHub state.
     * Archived/abandoned increments are included so the reconciler can close their
     * stale open issues.
     */
    async scanIncrements() {
        const incrementsDir = path.join(this.projectRoot, '.specweave/increments');
        const results = [];
        if (!existsSync(incrementsDir)) {
            return results;
        }
        // Collect all directories to scan: active + archive + abandoned
        const dirsToScan = [incrementsDir];
        for (const sub of ['_archive', '_abandoned']) {
            const subPath = path.join(incrementsDir, sub);
            if (existsSync(subPath))
                dirsToScan.push(subPath);
        }
        for (const dir of dirsToScan) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const isArchiveDir = dir !== incrementsDir;
            for (const entry of entries) {
                if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) {
                    continue;
                }
                const incrementPath = path.join(dir, entry.name);
                const metadataPath = path.join(incrementPath, 'metadata.json');
                if (!existsSync(metadataPath)) {
                    continue;
                }
                try {
                    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                    const state = this.extractGitHubState(entry.name, incrementPath, metadata);
                    // For archived increments, skip the expensive GitHub API search fallback —
                    // only use metadata-based issue references (they're already stored)
                    if (!isArchiveDir && state.userStoryIssues.length === 0 && state.featureId && this.client) {
                        await this.searchGitHubForIssues(state);
                    }
                    if (state.mainIssue || state.userStoryIssues.length > 0) {
                        results.push(state);
                    }
                }
                catch (error) {
                    this.logger.log(`  ⚠️  Skipping ${entry.name}: Invalid metadata.json`);
                }
            }
        }
        return results;
    }
    /**
     * Extract GitHub state from increment metadata (both old and new formats)
     */
    extractGitHubState(incrementId, incrementPath, metadata) {
        const state = {
            incrementId,
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
        // OLD format: metadata.github.issues[]
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
        // NEW format: externalLinks.github.issues{} (keyed by US-ID)
        if (state.userStoryIssues.length === 0 && metadata.externalLinks?.github?.issues) {
            const newFormatIssues = metadata.externalLinks.github.issues;
            for (const [usId, issueData] of Object.entries(newFormatIssues)) {
                if (issueData && typeof issueData === 'object' && 'issueNumber' in issueData) {
                    state.userStoryIssues.push({
                        userStoryId: usId,
                        issueNumber: issueData.issueNumber,
                    });
                }
            }
        }
        // Auto-derive featureId when metadata.feature_id is null
        if (!state.featureId) {
            try {
                state.featureId = deriveFeatureId(incrementId) || undefined;
            }
            catch {
                // Non-critical
            }
        }
        return state;
    }
    /**
     * Fallback: search GitHub API for issues when metadata has no references.
     * Only used for active (non-archived) increments to avoid excessive API calls.
     */
    async searchGitHubForIssues(state) {
        if (!state.featureId || !this.client)
            return;
        this.logger.log(`  🔍 Searching GitHub for ${state.featureId} issues (not in metadata)...`);
        try {
            const foundIssues = await this.client.searchIssuesByFeature(state.featureId);
            for (const issue of foundIssues) {
                const match = issue.title.match(/\[([A-Z]+-\d+)\]\[([A-Z]+-\d+)\]/);
                if (match && match[1] === state.featureId) {
                    state.userStoryIssues.push({
                        userStoryId: match[2],
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
    /**
     * Initialize GitHub client
     *
     * Prefers sync.github.owner/repo from config (critical for umbrella repos
     * where git remote points to a different repo than where issues live).
     * Falls back to git remote detection.
     */
    async initClient(config) {
        const cfg = config ?? await this.loadConfig();
        const ghConfig = cfg.sync?.github;
        if (ghConfig?.owner && ghConfig?.repo) {
            this.client = GitHubClientV2.fromRepo(ghConfig.owner, ghConfig.repo);
            this.logger.log(`🔗 GitHub repository: ${ghConfig.owner}/${ghConfig.repo} (from config)`);
        }
        else {
            const repoInfo = await GitHubClientV2.detectRepo(this.projectRoot);
            if (!repoInfo) {
                throw new Error('Could not detect GitHub repository. Ensure sync.github.owner/repo is configured or a git remote exists.');
            }
            this.client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
            this.logger.log(`🔗 GitHub repository: ${repoInfo.owner}/${repoInfo.repo} (from git remote)`);
        }
    }
    /**
     * Load config (cached after first read)
     */
    async loadConfig() {
        if (this.configCache !== null) {
            return this.configCache;
        }
        const configPath = path.join(this.projectRoot, '.specweave/config.json');
        if (!existsSync(configPath)) {
            this.configCache = {};
            return this.configCache;
        }
        const content = await fs.readFile(configPath, 'utf-8');
        this.configCache = JSON.parse(content);
        return this.configCache;
    }
    /**
     * Resolve GitHub owner/repo from config, falling back to git remote.
     * Critical for umbrella repos where git remote != issue target repo.
     */
    static async resolveRepoInfo(projectRoot) {
        try {
            const configPath = path.join(projectRoot, '.specweave/config.json');
            if (existsSync(configPath)) {
                const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
                const ghConfig = config.sync?.github;
                if (ghConfig?.owner && ghConfig?.repo) {
                    return { owner: ghConfig.owner, repo: ghConfig.repo };
                }
            }
        }
        catch {
            // Fall through to git detection
        }
        return GitHubClientV2.detectRepo(projectRoot);
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
            // Initialize client (prefer config over git remote for umbrella repos)
            const repoInfo = await GitHubReconciler.resolveRepoInfo(projectRoot);
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
            // Initialize client (prefer config over git remote for umbrella repos)
            const repoInfo = await GitHubReconciler.resolveRepoInfo(projectRoot);
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
    /**
     * Close all GitHub issues for a completed increment.
     *
     * Fallback path that reads issue numbers directly from metadata.json
     * (does NOT depend on living docs files existing).
     *
     * Reads from BOTH metadata formats:
     *   - metadata.externalLinks.github.issues (keyed by US-ID, has issueNumber)
     *   - metadata.github.issues (array, has number)
     *
     * Idempotent: skips already-closed issues.
     * Also closes the milestone if present in metadata.
     */
    static async closeCompletedIncrementIssues(projectRoot, incrementId, logger) {
        const log = typeof logger === 'function'
            ? { log: logger }
            : (logger ?? consoleLogger);
        const result = { closed: 0, milestoneClose: false, errors: [] };
        const closedNumbers = new Set();
        try {
            const metadataPath = path.join(projectRoot, '.specweave/increments', incrementId, 'metadata.json');
            if (!existsSync(metadataPath)) {
                return result; // No metadata = nothing to close
            }
            let metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
            // Auto-recovery: if no sync data at all, run full sync before closure
            if (!hasAnyGitHubSyncData(metadata)) {
                try {
                    const { LivingDocsSync } = await import('../core/living-docs/living-docs-sync.js');
                    const sync = new LivingDocsSync(projectRoot);
                    await sync.syncIncrement(incrementId);
                    // Re-read metadata after sync
                    metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                }
                catch {
                    // Non-critical: sync may fail if no living docs exist yet
                }
            }
            // Collect unique issue numbers from both metadata formats
            const issueNumbers = new Set();
            // Format 1: externalLinks.github.issues (keyed by US-ID)
            const extIssues = metadata.externalLinks?.github?.issues;
            if (extIssues && typeof extIssues === 'object') {
                for (const usId of Object.keys(extIssues)) {
                    const num = extIssues[usId]?.issueNumber;
                    if (typeof num === 'number')
                        issueNumbers.add(num);
                }
            }
            // Format 2: github.issues (array with number field)
            if (Array.isArray(metadata.github?.issues)) {
                for (const entry of metadata.github.issues) {
                    if (typeof entry.number === 'number')
                        issueNumbers.add(entry.number);
                }
            }
            if (issueNumbers.size === 0)
                return result;
            const repoInfo = await GitHubReconciler.resolveRepoInfo(projectRoot);
            if (!repoInfo) {
                result.errors.push('Could not detect GitHub repository');
                return result;
            }
            const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);
            const comment = `## Increment Completed

All tasks for increment \`${incrementId}\` have been completed.

---
Auto-closed by SpecWeave`;
            // Close each open issue
            for (const num of issueNumbers) {
                try {
                    const issue = await client.getIssue(num);
                    if (issue.state === 'open') {
                        await client.closeIssue(num, comment);
                        closedNumbers.add(num);
                        result.closed++;
                        log.log(`   Closed GitHub issue #${num}`);
                    }
                    else {
                        log.log(`   Issue #${num} already closed`);
                    }
                }
                catch (error) {
                    result.errors.push(`Issue #${num}: ${error.message}`);
                }
            }
            // Close milestone if present
            const milestoneNum = metadata.externalLinks?.github?.milestone ?? metadata.github?.milestone;
            if (typeof milestoneNum === 'number') {
                try {
                    const { execFileNoThrow } = await import('../utils/execFileNoThrow.js');
                    const msResult = await execFileNoThrow('gh', [
                        'api',
                        '-X',
                        'PATCH',
                        `repos/${repoInfo.owner}/${repoInfo.repo}/milestones/${milestoneNum}`,
                        '-f',
                        'state=closed',
                    ]);
                    if (msResult.exitCode === 0) {
                        result.milestoneClose = true;
                    }
                }
                catch (error) {
                    result.errors.push(`Milestone #${milestoneNum}: ${error.message}`);
                }
            }
            // Update metadata externalLinks status (only for actually-closed issues)
            if (closedNumbers.size > 0 && extIssues) {
                let changed = false;
                for (const usId of Object.keys(extIssues)) {
                    const num = extIssues[usId]?.issueNumber;
                    if (typeof num === 'number' && closedNumbers.has(num) && extIssues[usId]?.status !== 'closed') {
                        extIssues[usId].status = 'closed';
                        changed = true;
                    }
                }
                if (changed) {
                    metadata.externalLinks.github.syncedAt = new Date().toISOString();
                    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
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
     * Reconcile stale and duplicate milestones on GitHub.
     *
     * - Closes open milestones with 0 open issues and 1+ closed issues (stale)
     * - Closes open milestones matching completed local increments
     * - Detects duplicate milestones (same FS-XXX prefix) and closes the
     *   smaller/empty one, keeping the one with the most issues
     *
     * @param projectRoot - Project root directory
     * @param dryRun - If true, only report what would happen
     * @param logger - Logger instance
     */
    static async reconcileMilestones(projectRoot, dryRun = false, logger) {
        const log = logger ?? consoleLogger;
        const result = { staleClosed: 0, duplicatesClosed: 0, errors: [] };
        try {
            // Resolve repo info
            const repoInfo = await GitHubReconciler.resolveRepoInfo(projectRoot);
            if (!repoInfo) {
                result.errors.push('Could not detect GitHub repository');
                return result;
            }
            const { execFileNoThrow } = await import('../utils/execFileNoThrow.js');
            const repoSlug = `${repoInfo.owner}/${repoInfo.repo}`;
            // 1. Fetch all open milestones from GitHub
            log.log('   Fetching open milestones from GitHub...');
            const msResult = await execFileNoThrow('gh', [
                'api',
                `repos/${repoSlug}/milestones`,
                '--paginate',
                '-q',
                '.[] | {number, title, open_issues, closed_issues, state}',
            ]);
            if (!msResult.success) {
                result.errors.push(`Failed to list milestones: ${msResult.stderr}`);
                return result;
            }
            const milestones = [];
            for (const line of msResult.stdout.trim().split('\n')) {
                if (!line.trim())
                    continue;
                try {
                    milestones.push(JSON.parse(line));
                }
                catch {
                    // Skip unparseable lines
                }
            }
            if (milestones.length === 0) {
                log.log('   No open milestones found on GitHub');
                return result;
            }
            log.log(`   Found ${milestones.length} open milestone(s)`);
            // 2. Collect completed local increment FS-IDs for cross-reference
            const completedFsIds = await GitHubReconciler.collectCompletedIncrementFsIds(projectRoot);
            // 3. T-014: Close stale milestones
            // A milestone is stale if:
            //   (a) it has 0 open issues AND 1+ closed issues, OR
            //   (b) it matches a completed local increment (FS-XXX prefix)
            const closedNumbers = new Set();
            for (const ms of milestones) {
                const fsMatch = ms.title.match(/^(FS-\d+)/);
                const fsId = fsMatch ? fsMatch[1] : null;
                const isAllIssuesClosed = ms.open_issues === 0 && ms.closed_issues > 0;
                const matchesCompletedIncrement = fsId ? completedFsIds.has(fsId) : false;
                if (isAllIssuesClosed || matchesCompletedIncrement) {
                    const reason = isAllIssuesClosed
                        ? `0 open / ${ms.closed_issues} closed issues`
                        : `matches completed increment ${fsId}`;
                    if (!dryRun) {
                        const closeResult = await execFileNoThrow('gh', [
                            'api',
                            '-X', 'PATCH',
                            `repos/${repoSlug}/milestones/${ms.number}`,
                            '-f', 'state=closed',
                        ]);
                        if (closeResult.success) {
                            result.staleClosed++;
                            closedNumbers.add(ms.number);
                            log.log(`   Closed stale milestone #${ms.number} "${ms.title}" (${reason})`);
                        }
                        else {
                            result.errors.push(`Failed to close milestone #${ms.number}: ${closeResult.stderr}`);
                        }
                    }
                    else {
                        result.staleClosed++;
                        closedNumbers.add(ms.number);
                        log.log(`   [DRY-RUN] Would close stale milestone #${ms.number} "${ms.title}" (${reason})`);
                    }
                }
            }
            // 4. T-015: Detect and close duplicate milestones
            // Group remaining open milestones by FS-XXX prefix
            const fsPrefixGroups = new Map();
            for (const ms of milestones) {
                // Skip milestones we already closed in step 3
                if (closedNumbers.has(ms.number))
                    continue;
                const fsMatch = ms.title.match(/^(FS-\d+)/);
                if (!fsMatch)
                    continue;
                const prefix = fsMatch[1];
                const group = fsPrefixGroups.get(prefix) || [];
                group.push(ms);
                fsPrefixGroups.set(prefix, group);
            }
            for (const [prefix, group] of fsPrefixGroups) {
                if (group.length < 2)
                    continue;
                // Sort by total issue count descending — keep the one with most issues
                const sorted = [...group].sort((a, b) => {
                    const totalA = a.open_issues + a.closed_issues;
                    const totalB = b.open_issues + b.closed_issues;
                    return totalB - totalA;
                });
                const keep = sorted[0];
                const toClose = sorted.slice(1);
                for (const dup of toClose) {
                    if (!dryRun) {
                        const closeResult = await execFileNoThrow('gh', [
                            'api',
                            '-X', 'PATCH',
                            `repos/${repoSlug}/milestones/${dup.number}`,
                            '-f', 'state=closed',
                        ]);
                        if (closeResult.success) {
                            result.duplicatesClosed++;
                            log.log(`   Closed duplicate milestone #${dup.number} "${dup.title}" (keeping #${keep.number} with ${keep.open_issues + keep.closed_issues} issues)`);
                        }
                        else {
                            result.errors.push(`Failed to close duplicate milestone #${dup.number}: ${closeResult.stderr}`);
                        }
                    }
                    else {
                        result.duplicatesClosed++;
                        log.log(`   [DRY-RUN] Would close duplicate milestone #${dup.number} "${dup.title}" (keeping #${keep.number})`);
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
     * Collect FS-IDs of all completed/archived/abandoned increments.
     * Returns a Set of strings like "FS-400", "FS-391", etc.
     */
    static async collectCompletedIncrementFsIds(projectRoot) {
        const fsIds = new Set();
        const incrementsDir = path.join(projectRoot, '.specweave/increments');
        if (!existsSync(incrementsDir))
            return fsIds;
        // Check archive and abandoned dirs for completed increments
        for (const sub of ['_archive', '_abandoned']) {
            const subDir = path.join(incrementsDir, sub);
            if (!existsSync(subDir))
                continue;
            const entries = await fs.readdir(subDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory() || entry.name.startsWith('.'))
                    continue;
                const match = entry.name.match(/^(\d{4})/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    fsIds.add(`FS-${String(num).padStart(3, '0')}`);
                }
            }
        }
        // Also check active increments with completed/abandoned status
        const entries = await fs.readdir(incrementsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.'))
                continue;
            const metadataPath = path.join(incrementsDir, entry.name, 'metadata.json');
            if (!existsSync(metadataPath))
                continue;
            try {
                const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                if (metadata.status === 'completed' || metadata.status === 'abandoned') {
                    const match = entry.name.match(/^(\d{4})/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        fsIds.add(`FS-${String(num).padStart(3, '0')}`);
                    }
                }
            }
            catch {
                // Skip invalid metadata
            }
        }
        return fsIds;
    }
}
// ==========================================================================
// Milestone reconciliation (T-014, T-015)
// ==========================================================================
/**
 * Result from milestone reconciliation
 */
GitHubReconciler.MILESTONE_RECONCILE_RESULT_TEMPLATE = {
    staleClosed: 0,
    duplicatesClosed: 0,
    errors: [],
};
//# sourceMappingURL=github-reconciler.js.map