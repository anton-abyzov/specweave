/**
 * GitHub AC Checkbox Sync
 *
 * Extracted from SyncCoordinator (0348) — efficient regex-based AC checkbox
 * updates on existing GitHub issues without full body regeneration.
 *
 * Uses the same approach as the original SyncCoordinator.syncACCheckboxesToGitHub()
 * but lives in the GitHub plugin where GitHub-specific code belongs.
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { GitHubClientV2 } from './github-client-v2.js';
import { Logger, consoleLogger } from '../../../src/utils/logger.js';
import { autoDetectProjectIdSync } from '../../../src/utils/project-detection.js';
import { deriveFeatureId } from '../../../src/utils/feature-id-derivation.js';
import {
  ProviderRouter,
  GitHubRepoConfig,
} from '../../../src/sync/provider-router.js';
import {
  isProviderEnabled,
} from '../../../src/sync/status-mapper.js';
import { resolvePermissions, SyncPreset } from '../../../src/sync/config.js';
import type { SpecWeaveConfig } from '../../../src/core/config/types.js';
import type { LivingDocsUSFile } from '../../../src/types/living-docs-us-file.js';

export interface ACCheckboxSyncResult {
  success: boolean;
  updated: number;
  issues: number[];
}

export class GitHubACCheckboxSync {
  private projectRoot: string;
  private incrementId: string;
  private projectId: string;
  private logger: Logger;
  private providerRouter: ProviderRouter;

  constructor(options: {
    projectRoot: string;
    incrementId: string;
    logger?: Logger;
  }) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
    this.projectId = autoDetectProjectIdSync(this.projectRoot) || 'default';
    this.providerRouter = new ProviderRouter({ projectRoot: this.projectRoot, logger: this.logger });
  }

  /**
   * Sync AC checkbox state from spec.md to GitHub issue bodies.
   *
   * Uses efficient regex replacement to flip checkboxes without rebuilding
   * the entire issue body.
   */
  async syncACCheckboxesToGitHub(
    config: SpecWeaveConfig,
    options: { addComment?: boolean } = {}
  ): Promise<ACCheckboxSyncResult> {
    const result: ACCheckboxSyncResult = { success: true, updated: 0, issues: [] };

    try {
      // Check if GitHub sync is enabled
      const githubEnabled = isProviderEnabled(config, 'github');
      if (!githubEnabled) {
        this.logger.log('ℹ️  GitHub sync disabled - skipping AC checkbox sync');
        return result;
      }

      // Honor preset when explicit settings absent
      const syncAny = config.sync as Record<string, unknown> | undefined;
      const perms = resolvePermissions(syncAny?.preset as SyncPreset | undefined, undefined, config.sync?.settings);
      const canUpdateExternal = config.sync?.settings?.canUpdateExternalItems ?? perms.canUpsert;
      if (!canUpdateExternal) {
        this.logger.log('ℹ️  External update disabled (canUpdateExternalItems=false)');
        return result;
      }

      // Load user stories
      const userStories = await this.loadUserStoriesForIncrement();
      if (userStories.length === 0) {
        this.logger.log('ℹ️  No user stories found for this increment');
        return result;
      }

      // Get GitHub repo info
      const githubConfig = config.sync?.github || {};
      const repoInfo = await this.providerRouter.detectGitHubRepo(githubConfig as GitHubRepoConfig);
      if (!repoInfo) {
        this.logger.log('⚠️  GitHub repository not configured');
        return result;
      }

      const client = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);

      this.logger.log(`\n📊 Syncing AC checkboxes to GitHub issues...`);
      this.logger.log(`   Repository: ${repoInfo.owner}/${repoInfo.repo}`);

      // Load spec.md to get current AC status
      const specPath = path.join(
        this.projectRoot,
        '.specweave/increments',
        this.incrementId,
        'spec.md'
      );

      if (!existsSync(specPath)) {
        this.logger.log('⚠️  spec.md not found');
        return result;
      }

      const specContent = await fs.readFile(specPath, 'utf-8');

      // Parse AC status from spec.md
      const acStatus = GitHubACCheckboxSync.parseACStatusFromSpec(specContent);
      this.logger.log(`   Found ${acStatus.size} ACs in spec.md`);

      // Process each user story with a GitHub issue
      for (const usFile of userStories) {
        // Find GitHub issue number from frontmatter
        const issueNumber = usFile.external_tools?.github?.number ||
                            usFile.external_id ||
                            (usFile.external_tools?.github as any)?.issue_number;

        if (!issueNumber) {
          this.logger.log(`   ⏭️  ${usFile.id} - No GitHub issue linked`);
          continue;
        }

        // Filter ACs that belong to this user story
        const usAcStatus = new Map<string, boolean>();
        for (const [acId, completed] of acStatus) {
          const acUsMatch = acId.match(/AC-US?(\d+)-\d+/i);
          if (acUsMatch) {
            const acUsNum = acUsMatch[1];
            const usNum = usFile.id.match(/US-?(\d+)/i)?.[1] || '';
            if (parseInt(acUsNum) === parseInt(usNum)) {
              usAcStatus.set(acId, completed);
            }
          }
        }

        if (usAcStatus.size === 0) {
          this.logger.log(`   ⏭️  ${usFile.id} - No ACs to sync`);
          continue;
        }

        try {
          // Fetch and update issue
          const issue = await client.getIssue(Number(issueNumber));
          if (!issue) {
            this.logger.log(`   ⚠️  ${usFile.id} - Issue #${issueNumber} not found`);
            continue;
          }

          let body = issue.body || '';
          const originalBody = body;
          let updatedCount = 0;

          // Update each AC checkbox
          for (const [acId, completed] of usAcStatus) {
            const checkboxState = completed ? 'x' : ' ';
            const escapedAcId = acId.replace(/-/g, '\\-');

            // Pattern 1: Bold format `- [ ] **AC-US5-01**: Description`
            const boldRegex = new RegExp(`(- \\[)[ x](\\] \\*\\*${escapedAcId}\\*\\*:)`, 'g');

            // Pattern 2: Plain format `- [ ] AC-US5-01: Description`
            const plainRegex = new RegExp(`(- \\[)[ x](\\] ${escapedAcId}:)`, 'g');

            const beforeUpdate = body;
            body = body.replace(boldRegex, `$1${checkboxState}$2`);
            body = body.replace(plainRegex, `$1${checkboxState}$2`);

            if (body !== beforeUpdate) {
              updatedCount++;
            }
          }

          if (body === originalBody) {
            this.logger.log(`   ⏭️  ${usFile.id} #${issueNumber} - No checkbox changes`);
            continue;
          }

          // Update issue body
          await client.updateIssueBody(Number(issueNumber), body);
          result.updated += updatedCount;
          result.issues.push(Number(issueNumber));
          this.logger.log(`   ✅ ${usFile.id} #${issueNumber} - Updated ${updatedCount} AC checkbox(es)`);

          // Optionally add progress comment
          if (options.addComment) {
            const completedCount = [...usAcStatus.values()].filter(v => v).length;
            const totalCount = usAcStatus.size;
            const percentage = Math.round((completedCount / totalCount) * 100);

            const commentBody = `## 📊 Progress Update

**Acceptance Criteria**: ${completedCount}/${totalCount} (${percentage}%)

${[...usAcStatus.entries()].map(([id, done]) =>
  `- ${done ? '✅' : '⬜'} ${id}`
).join('\n')}

---
🤖 Auto-updated by SpecWeave AC Completion Gate`;

            await client.addComment(Number(issueNumber), commentBody);
            this.logger.log(`   💬 Added progress comment`);
          }
        } catch (error) {
          this.logger.log(`   ⚠️  ${usFile.id} - Failed to update #${issueNumber}: ${error}`);
          result.success = false;
        }
      }

      this.logger.log(`\n📊 AC Checkbox Sync Complete`);
      this.logger.log(`   Updated: ${result.updated} checkbox(es) across ${result.issues.length} issue(s)`);

      return result;
    } catch (error) {
      this.logger.error('❌ AC checkbox sync failed:', error);
      result.success = false;
      return result;
    }
  }

  /**
   * Parse AC checkbox status from spec.md content
   *
   * Handles both formats:
   * - `- [x] **AC-US5-01**: Description` (SpecWeave standard)
   * - `- [x] AC-US5-01: Description` (legacy)
   */
  static parseACStatusFromSpec(specContent: string): Map<string, boolean> {
    const acStatus = new Map<string, boolean>();
    const lines = specContent.split('\n');

    const boldRegex = /^- \[([ x])\] \*\*(AC-[A-Z0-9]+-\d+)\*\*:/;
    const plainRegex = /^- \[([ x])\] (AC-[A-Z0-9]+-\d+):/;

    for (const line of lines) {
      let match = line.match(boldRegex);
      if (!match) {
        match = line.match(plainRegex);
      }

      if (match) {
        const completed = match[1] === 'x';
        const acId = match[2];
        acStatus.set(acId, completed);
      }
    }

    return acStatus;
  }

  /**
   * Load user stories from living docs for the increment
   */
  private async loadUserStoriesForIncrement(): Promise<LivingDocsUSFile[]> {
    const specFile = path.join(
      this.projectRoot,
      '.specweave/increments',
      this.incrementId,
      'spec.md'
    );

    if (!existsSync(specFile)) {
      return [];
    }

    const content = await fs.readFile(specFile, 'utf-8');

    // Parse frontmatter to get feature ID
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return [];
    }

    const frontmatter = yaml.parse(frontmatterMatch[1]);
    let featureId = frontmatter.feature_id || frontmatter.epic || frontmatter.feature;

    if (!featureId) {
      const metadataFile = path.join(
        this.projectRoot,
        '.specweave/increments',
        this.incrementId,
        'metadata.json'
      );
      if (existsSync(metadataFile)) {
        try {
          const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf-8'));
          featureId = metadata.feature_id || metadata.epic_id;
        } catch {
          // Ignore parse errors
        }
      }
    }

    if (!featureId) {
      try {
        featureId = deriveFeatureId(this.incrementId);
      } catch {
        return [];
      }
    }

    // Find living docs for this feature
    const featurePath = path.join(
      this.projectRoot,
      '.specweave/docs/internal/specs',
      this.projectId,
      featureId
    );

    if (!existsSync(featurePath)) {
      return [];
    }

    // Load all US files
    const files = await fs.readdir(featurePath);
    const usFiles: LivingDocsUSFile[] = [];

    for (const file of files) {
      if (file.startsWith('us-') && file.endsWith('.md')) {
        const filePath = path.join(featurePath, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');

        const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const fm = yaml.parse(match[1]);
          usFiles.push({
            id: fm.id,
            title: fm.title,
            format_preservation: fm.format_preservation,
            external_title: fm.external_title,
            external_source: fm.external_source,
            external_id: fm.external_id,
            external_url: fm.external_url,
            imported_at: fm.imported_at,
            origin: fm.origin,
            external_tools: fm.external_tools,
          });
        }
      }
    }

    return usFiles;
  }
}
