/**
 * Frontmatter Updater (Layer 1 Idempotency Backfill)
 *
 * Updates user story frontmatter with GitHub issue information
 * after issues are created. This provides the fastest idempotency
 * check (<1ms) for future syncs.
 *
 * Part of 3-layer idempotency strategy:
 * - Layer 1: User story frontmatter (fastest, <1ms)
 * - Layer 2: Increment metadata.json (fast, <5ms)
 * - Layer 3: GitHub API query (slow, 500-2000ms)
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Logger, consoleLogger } from '../utils/logger.js';
import { autoDetectProjectIdSync } from '../utils/project-detection.js';

export interface GitHubIssueInfo {
  number: number;
  url: string;
  createdAt: string;
}

export interface FrontmatterUpdateOptions {
  projectRoot: string;
  featureId: string;
  userStoryId: string;
  githubIssue: GitHubIssueInfo;
  logger?: Logger;
}

export class FrontmatterUpdater {
  private logger: Logger;
  private projectRoot: string | null = null;
  private cachedProjectId: string | null = null;

  constructor(options: { logger?: Logger; projectRoot?: string } = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.projectRoot = options.projectRoot ?? null;
    // Cache project ID if projectRoot is provided
    if (this.projectRoot) {
      this.cachedProjectId = autoDetectProjectIdSync(this.projectRoot, { silent: true });
    }
  }

  /**
   * Get project ID for a given project root
   * Uses cached value if available, otherwise auto-detects
   */
  private getProjectId(projectRoot: string): string {
    // Return cached value if available and roots match
    if (this.cachedProjectId && this.projectRoot === projectRoot) {
      return this.cachedProjectId;
    }
    // Auto-detect and cache for this project root
    const projectId = autoDetectProjectIdSync(projectRoot, { silent: true });
    this.projectRoot = projectRoot;
    this.cachedProjectId = projectId;
    return projectId;
  }

  /**
   * Update user story frontmatter with GitHub issue information
   *
   * CRITICAL: This is Layer 1 backfill for 3-layer idempotency
   * Must be called after GitHub issue creation to cache issue number
   */
  async updateUserStoryFrontmatter(options: FrontmatterUpdateOptions): Promise<boolean> {
    try {
      const { projectRoot, featureId, userStoryId, githubIssue } = options;

      // Construct user story file path
      const userStoryPath = await this.getUserStoryPath(projectRoot, featureId, userStoryId);

      if (!existsSync(userStoryPath)) {
        this.logger.log(`⚠️  User story file not found: ${userStoryPath}`);
        return false;
      }

      // Read current content
      const content = await readFile(userStoryPath, 'utf-8');

      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        this.logger.log(`⚠️  No frontmatter found in ${userStoryPath}`);
        return false;
      }

      const frontmatterText = frontmatterMatch[1];
      const frontmatter = yaml.parse(frontmatterText);

      // Check if already has GitHub info (avoid overwriting)
      if (frontmatter.external_tools?.github?.number) {
        this.logger.log(
          `  ℹ️  ${userStoryId} frontmatter already has GitHub issue #${frontmatter.external_tools.github.number}`
        );
        return true; // Already backfilled
      }

      // Add external_tools.github section
      if (!frontmatter.external_tools) {
        frontmatter.external_tools = {};
      }

      frontmatter.external_tools.github = {
        number: githubIssue.number,
        url: githubIssue.url,
        created_at: githubIssue.createdAt,
      };

      // Serialize updated frontmatter
      const newFrontmatter = yaml.stringify(frontmatter);

      // Replace frontmatter in content
      const newContent = content.replace(
        /^---\n[\s\S]*?\n---/,
        `---\n${newFrontmatter.trim()}\n---`
      );

      // Write back to file
      await writeFile(userStoryPath, newContent, 'utf-8');

      this.logger.log(`  ✅ Updated ${userStoryId} frontmatter with issue #${githubIssue.number}`);
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Failed to update frontmatter for ${options.userStoryId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Batch update multiple user story frontmatters
   */
  async batchUpdateFrontmatters(
    projectRoot: string,
    featureId: string,
    updates: Array<{ userStoryId: string; githubIssue: GitHubIssueInfo }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const update of updates) {
      const result = await this.updateUserStoryFrontmatter({
        projectRoot,
        featureId,
        userStoryId: update.userStoryId,
        githubIssue: update.githubIssue,
      });

      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Get user story file path from project root, feature ID, and user story ID
   */
  private async getUserStoryPath(
    projectRoot: string,
    featureId: string,
    userStoryId: string
  ): Promise<string> {
    // Convert user story ID to file name (US-001 → us-001-*.md)
    const usPrefix = userStoryId.toLowerCase();

    // Get auto-detected project ID (from git remote, sync config, or "default")
    const projectId = this.getProjectId(projectRoot);

    // Search in .specweave/docs/internal/specs/{project}/{featureId}/
    const featurePath = path.join(
      projectRoot,
      '.specweave/docs/internal/specs',
      projectId,
      featureId
    );

    if (!existsSync(featurePath)) {
      throw new Error(`Feature directory not found: ${featurePath}`);
    }

    // Find file matching us-* pattern (use async readdir)
    const files = await readdir(featurePath);
    const matchingFile = files.find(
      (file: string) => file.startsWith(usPrefix) && file.endsWith('.md')
    );

    if (!matchingFile) {
      throw new Error(
        `User story file not found for ${userStoryId} in ${featurePath}`
      );
    }

    return path.join(featurePath, matchingFile);
  }

  /**
   * Read GitHub issue info from user story frontmatter (Layer 1 check)
   */
  async getGitHubIssueFromFrontmatter(
    projectRoot: string,
    featureId: string,
    userStoryId: string
  ): Promise<GitHubIssueInfo | null> {
    try {
      const userStoryPath = await this.getUserStoryPath(projectRoot, featureId, userStoryId);

      if (!existsSync(userStoryPath)) {
        return null;
      }

      const content = await readFile(userStoryPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!frontmatterMatch) {
        return null;
      }

      const frontmatter = yaml.parse(frontmatterMatch[1]);
      const githubInfo = frontmatter.external_tools?.github;

      if (!githubInfo || !githubInfo.number) {
        return null;
      }

      return {
        number: githubInfo.number,
        url: githubInfo.url,
        createdAt: githubInfo.created_at || new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to read GitHub info from ${userStoryId} frontmatter:`,
        error
      );
      return null;
    }
  }
}
