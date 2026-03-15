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
import { Logger, consoleLogger } from '../../specweave/lib/vendor/utils/logger.js';
import { deriveFeatureId } from '../../specweave/lib/vendor/utils/feature-id-derivation.js';
import {
  ProviderRouter,
  GitHubRepoConfig,
} from '../../specweave/lib/vendor/sync/provider-router.js';
import {
  isProviderEnabled,
} from '../../specweave/lib/vendor/sync/status-mapper.js';
import { resolvePermissions, SyncPreset } from '../../specweave/lib/vendor/sync/config.js';
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

      // Get default GitHub repo info (used when US doesn't have per-repo URL)
      const githubConfig = config.sync?.github || {};
      const repoInfo = await this.providerRouter.detectGitHubRepo(githubConfig as GitHubRepoConfig);
      if (!repoInfo) {
        this.logger.log('⚠️  GitHub repository not configured');
        return result;
      }

      const defaultClient = GitHubClientV2.fromRepo(repoInfo.owner, repoInfo.repo);

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
        // Supports: external_tools.github.number, external.github.issue, external_id
        const ghInfo = usFile.external_tools?.github as Record<string, any> | undefined;
        const issueNumber = ghInfo?.number || ghInfo?.issue || ghInfo?.issue_number ||
                            usFile.external_id;

        if (!issueNumber) {
          this.logger.log(`   ⏭️  ${usFile.id} - No GitHub issue linked`);
          continue;
        }

        // Filter ACs that belong to this user story
        // Supports both simple (US-001 → AC-US1-XX) and compound (US-SPE-001 → AC-SPE-US1-XX)
        const usAcStatus = new Map<string, boolean>();
        const acPrefix = GitHubACCheckboxSync.buildACPrefix(usFile.id);
        for (const [acId, completed] of acStatus) {
          if (acId.startsWith(acPrefix)) {
            usAcStatus.set(acId, completed);
          }
        }

        if (usAcStatus.size === 0) {
          this.logger.log(`   ⏭️  ${usFile.id} - No ACs to sync`);
          continue;
        }

        try {
          // Use per-repo client if URL points to a different repo (cross-project support)
          let client = defaultClient;
          const ghUrl = ghInfo?.url as string | undefined;
          if (ghUrl) {
            const repoMatch = ghUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\//);
            if (repoMatch && `${repoMatch[1]}/${repoMatch[2]}` !== `${repoInfo.owner}/${repoInfo.repo}`) {
              client = GitHubClientV2.fromRepo(repoMatch[1], repoMatch[2]);
            }
          }

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

    // Support both simple (AC-US1-01) and compound (AC-SPE-US1-01) AC ID formats
    const boldRegex = /^- \[([ x])\] \*\*(AC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+)\*\*:/;
    const plainRegex = /^- \[([ x])\] (AC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+):/;

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
   * Build the AC ID prefix for a given US ID.
   * US-001 → "AC-US1-", US-SPE-001 → "AC-SPE-US1-"
   */
  static buildACPrefix(usId: string): string {
    const compoundMatch = usId.match(/^US-([A-Z]+)-(\d+)$/);
    if (compoundMatch) {
      return `AC-${compoundMatch[1]}-US${parseInt(compoundMatch[2], 10)}-`;
    }
    const simpleMatch = usId.match(/^US-(\d+)$/);
    if (simpleMatch) {
      return `AC-US${parseInt(simpleMatch[1], 10)}-`;
    }
    // Fallback: extract trailing number
    const fallback = usId.match(/(\d+)$/);
    const num = fallback ? parseInt(fallback[1], 10) : 0;
    return `AC-US${num}-`;
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

    // Find living docs for this feature — scan all project folders for cross-project support
    const specsRoot = path.join(this.projectRoot, '.specweave/docs/internal/specs');
    const usFiles: LivingDocsUSFile[] = [];

    // Scan all project folders for this feature
    const projectDirs: string[] = [];
    if (existsSync(specsRoot)) {
      try {
        for (const proj of await fs.readdir(specsRoot)) {
          const projFeaturePath = path.join(specsRoot, proj, featureId);
          if (existsSync(projFeaturePath)) projectDirs.push(projFeaturePath);
        }
      } catch {
        // Ignore readdir errors
      }
    }

    if (projectDirs.length === 0) {
      return [];
    }

    // Load all US files from all matching project/feature folders
    for (const featurePath of projectDirs) {
      const files = await fs.readdir(featurePath);
      for (const file of files) {
        if (file.startsWith('us-') && file.endsWith('.md')) {
          const filePath = path.join(featurePath, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');

          const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
          if (match) {
            const fm = yaml.parse(match[1]);
            // Support both external_tools (legacy) and external (living docs) formats
            const externalTools = fm.external_tools || fm.external;
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
              external_tools: externalTools,
            });
          }
        }
      }
    }

    return usFiles;
  }
}
