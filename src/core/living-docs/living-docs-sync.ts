/**
 * Living Docs Sync - Simplified sync mechanism
 *
 * Syncs increment specs to living docs structure:
 * - .specweave/docs/internal/specs/_features/FS-XXX/FEATURE.md
 * - .specweave/docs/internal/specs/specweave/FS-XXX/README.md
 * - .specweave/docs/internal/specs/specweave/FS-XXX/us-*.md
 *
 * Uses FeatureIDManager for automatic feature ID assignment (greenfield vs brownfield)
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { FeatureIDManager } from './feature-id-manager.js';
import { TaskProjectSpecificGenerator } from './task-project-specific-generator.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  /** Explicit feature ID from spec.md epic field (v0.23.0+) */
  explicitFeatureId?: string;
}

export interface SyncResult {
  success: boolean;
  featureId: string;
  incrementId: string;
  filesCreated: string[];
  filesUpdated: string[];
  errors: string[];
}

export interface ParsedSpec {
  title: string;
  overview: string;
  status: string;
  priority: string;
  created: string;
  userStories: UserStoryData[];
  acceptanceCriteria: AcceptanceCriterionData[];
  frontmatter: Record<string, any>;
}

export interface UserStoryData {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  phase?: string;
  // Format preservation metadata (T-034A)
  format_preservation?: boolean;
  external_title?: string;
  external_source?: 'github' | 'jira' | 'ado';
  external_id?: string;
  external_url?: string;
  imported_at?: string;
  origin?: 'internal' | 'external';
}

export interface AcceptanceCriterionData {
  id: string;
  userStoryId: string;
  description: string;
  completed: boolean;
  priority?: string;
}

export class LivingDocsSync {
  private projectRoot: string;
  private featureIdManager: FeatureIDManager;
  private logger: Logger;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.featureIdManager = new FeatureIDManager(projectRoot);
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Check if increment is archived
   *
   * @param incrementId - Increment ID (e.g., "0039-ultra-smart-next-command")
   * @returns true if increment is in _archive/ folder, false otherwise
   */
  private async isIncrementArchived(incrementId: string): Promise<boolean> {
    const archivePath = path.join(
      this.projectRoot,
      '.specweave/increments/_archive',
      incrementId
    );
    return await fs.pathExists(archivePath);
  }

  /**
   * Sync an increment to living docs
   */
  async syncIncrement(incrementId: string, options: SyncOptions = {}): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      featureId: '',
      incrementId,
      filesCreated: [],
      filesUpdated: [],
      errors: []
    };

    try {
      // CRITICAL: Skip sync for archived increments (prevents recreating archived folders)
      // See: ULTRATHINK-ARCHIVE-REORGANIZATION-BUG.md for full analysis
      const isArchived = await this.isIncrementArchived(incrementId);
      if (isArchived) {
        this.logger.log(`⏭️  Skipping sync for archived increment ${incrementId}`);
        return {
          success: true,
          featureId: '',
          incrementId,
          filesCreated: [],
          filesUpdated: [],
          errors: ['Increment is archived - sync skipped to prevent folder recreation']
        };
      }

      // Step 1: Build feature registry (auto-generates IDs for greenfield)
      await this.featureIdManager.buildRegistry();

      // Step 2: Get/assign feature ID
      // NEW (v0.23.0): Use explicitFeatureId from spec.md epic field if provided
      let featureId: string;
      if (options.explicitFeatureId) {
        featureId = options.explicitFeatureId;
        this.logger.log(`📎 Using explicit feature ID from spec.md: ${featureId}`);
      } else {
        featureId = await this.getFeatureIdForIncrement(incrementId);
        this.logger.log(`🔄 Auto-generated feature ID: ${featureId}`);
      }
      result.featureId = featureId;

      this.logger.log(`📚 Syncing ${incrementId} → ${featureId}...`);

      // Step 3: Parse increment spec
      const parsed = await this.parseIncrementSpec(incrementId);

      // Step 4: Create living docs structure
      const basePath = path.join(this.projectRoot, '.specweave/docs/internal/specs');

      // Create _features/FS-XXX/FEATURE.md
      const featurePath = path.join(basePath, '_features', featureId);
      const featureFile = path.join(featurePath, 'FEATURE.md');

      if (!options.dryRun) {
        await fs.ensureDir(featurePath);
        const featureContent = this.generateFeatureFile(featureId, parsed, incrementId);
        await fs.writeFile(featureFile, featureContent, 'utf-8');
        result.filesCreated.push(featureFile);
      } else {
        result.filesCreated.push(featureFile + ' (dry-run)');
      }

      // Create specweave/FS-XXX/README.md
      const projectPath = path.join(basePath, 'specweave', featureId);
      const readmePath = path.join(projectPath, 'README.md');

      if (!options.dryRun) {
        await fs.ensureDir(projectPath);
        const readmeContent = this.generateReadmeFile(featureId, parsed, incrementId);
        await fs.writeFile(readmePath, readmeContent, 'utf-8');
        result.filesCreated.push(readmePath);
      } else {
        result.filesCreated.push(readmePath + ' (dry-run)');
      }

      // Create user story files
      for (const story of parsed.userStories) {
        // CRITICAL: Find existing file by US-ID first to prevent duplicates
        const existingFile = await this.findExistingUserStoryFile(projectPath, story.id);

        let storyFile: string;
        if (existingFile) {
          // Reuse existing file (prevent duplicate creation)
          storyFile = path.join(projectPath, existingFile);
          this.logger.log(`   ♻️  Reusing existing file: ${existingFile}`);
        } else {
          // Create new file with standardized naming
          const storySlug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          storyFile = path.join(projectPath, `${story.id.toLowerCase()}-${storySlug}.md`);
        }

        if (!options.dryRun) {
          const storyContent = this.generateUserStoryFile(story, featureId, incrementId, parsed);
          await fs.writeFile(storyFile, storyContent, 'utf-8');
          result.filesCreated.push(storyFile);
        } else {
          result.filesCreated.push(storyFile + ' (dry-run)');
        }
      }

      // Step 5: Clean up duplicates and temp files BEFORE syncing tasks
      if (!options.dryRun) {
        await this.cleanupDuplicateFiles(featureId, projectPath);
        await this.cleanupTempFiles(projectPath);
      }

      // Step 6: Sync tasks from increment to user stories
      if (!options.dryRun) {
        await this.syncTasksToUserStories(incrementId, featureId, parsed.userStories, projectPath);
      }

      // Step 7: Sync to external tools (GitHub, JIRA, ADO)
      if (!options.dryRun) {
        await this.syncToExternalTools(incrementId, featureId, projectPath);
      }

      // Step 8: Final cleanup (remove any temp files created during sync)
      if (!options.dryRun) {
        await this.cleanupTempFiles(projectPath);
      }

      result.success = true;
      this.logger.log(`✅ Synced ${incrementId} → ${featureId}`);
      this.logger.log(`   Created: ${result.filesCreated.length} files`);

      return result;

    } catch (error) {
      result.errors.push(`Sync failed: ${error}`);
      this.logger.error(`❌ Sync failed for ${incrementId}:`, error);
      return result;
    }
  }

  /**
   * Get feature ID for increment (auto-generates for greenfield)
   *
   * CRITICAL: Validates feature ID format matches increment type (greenfield vs brownfield)
   * - Greenfield (SpecWeave-native): FS-XXX (e.g., FS-031, FS-043)
   * - Brownfield (imported): FS-YY-MM-DD-name (e.g., FS-25-11-14-jira-epic)
   */
  private async getFeatureIdForIncrement(incrementId: string): Promise<string> {
    // Extract increment number (e.g., "0040-name" → 40)
    const match = incrementId.match(/^(\d{4})-/);
    if (!match) {
      throw new Error(`Invalid increment ID format: ${incrementId}`);
    }

    const num = parseInt(match[1], 10);

    // Check if increment has explicit feature ID
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'metadata.json'
    );

    if (await fs.pathExists(metadataPath)) {
      const metadata = await fs.readJson(metadataPath);

      // Check if brownfield (imported from external tool)
      const isBrownfield = metadata.imported === true || metadata.source === 'external';

      if (metadata.feature) {
        // Validate format matches increment type
        const isDateFormat = /^FS-\d{2}-\d{2}-\d{2}/.test(metadata.feature);
        const isIncrementFormat = /^FS-\d{3}$/.test(metadata.feature);

        if (isBrownfield && isDateFormat) {
          // ✅ Brownfield with correct date format
          return metadata.feature;
        } else if (!isBrownfield && isIncrementFormat) {
          // ✅ Greenfield with correct increment format
          return metadata.feature;
        } else {
          // ⚠️ Format mismatch - log warning and auto-generate correct format
          this.logger.warn(`⚠️ Feature ID format mismatch for ${incrementId}:`);
          this.logger.warn(`   Found: ${metadata.feature}`);
          this.logger.warn(`   Expected: ${isBrownfield ? 'FS-YY-MM-DD-name (brownfield)' : 'FS-XXX (greenfield)'}`);
          this.logger.warn(`   Auto-generating correct format...`);

          // Fall through to auto-generation
        }
      }
    }

    // Auto-generate for greenfield: FS-040, FS-041, etc.
    const autoGenId = `FS-${String(num).padStart(3, '0')}`;
    this.logger.log(`   📝 Generated feature ID: ${autoGenId}`);
    return autoGenId;
  }

  /**
   * Parse increment spec.md
   */
  private async parseIncrementSpec(incrementId: string): Promise<ParsedSpec> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    if (!await fs.pathExists(specPath)) {
      throw new Error(`Spec file not found: ${specPath}`);
    }

    const content = await fs.readFile(specPath, 'utf-8');

    // Extract frontmatter
    let frontmatter: Record<string, any> = {};
    let bodyContent = content;

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        frontmatter = yaml.parse(frontmatterMatch[1]) || {};
        bodyContent = content.slice(frontmatterMatch[0].length).trim();
      } catch (error) {
        this.logger.warn(`Failed to parse frontmatter for ${incrementId}`);
      }
    }

    // Extract title
    let title = frontmatter.title || '';
    if (!title) {
      const headingMatch = bodyContent.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        title = headingMatch[1].replace(/^(SPEC-\d+:|Increment\s+\d+:)\s*/, '').trim();
      }
    }
    if (!title) {
      title = incrementId.replace(/^\d+-/, '').split('-').map(w =>
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
    }

    // Extract overview
    let overview = '';
    const overviewMatch = bodyContent.match(/##\s+(?:Overview|Problem Statement|Quick Overview)\s*\n+([\s\S]*?)(?=\n##|\Z)/i);
    if (overviewMatch) {
      overview = overviewMatch[1].trim().split('\n\n')[0];
    }

    // Extract user stories
    const userStories = this.extractUserStories(bodyContent);

    // Extract acceptance criteria
    const acceptanceCriteria = this.extractAcceptanceCriteria(bodyContent);

    return {
      title,
      overview,
      status: frontmatter.status || 'planning',
      priority: frontmatter.priority || 'P1',
      created: frontmatter.created || new Date().toISOString().split('T')[0],
      userStories,
      acceptanceCriteria,
      frontmatter
    };
  }

  /**
   * Extract user stories from spec content
   */
  private extractUserStories(content: string): UserStoryData[] {
    const stories: UserStoryData[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const headingMatch = lines[i].match(/^###+\s+(US-\d+):\s+(.+)/);
      if (!headingMatch) continue;

      const id = headingMatch[1];
      const title = headingMatch[2];

      // Collect all lines until next US heading or end
      const storyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].match(/^###+\s+US-\d+:/)) {
          break; // Found next US heading
        }
        storyLines.push(lines[j]);
      }

      const storyContent = storyLines.join('\n');

      // Extract description
      let description = '';
      const descMatch = storyContent.match(/\*\*As a\*\*\s*([^\n]+)\s*\n\*\*I want\*\*\s*([^\n]+)\s*\n\*\*So that\*\*\s*([^\n]+)/i);
      if (descMatch) {
        description = `**As a** ${descMatch[1].trim()}\n**I want** ${descMatch[2].trim()}\n**So that** ${descMatch[3].trim()}`;
      }

      // Extract acceptance criteria IDs
      const acIds: string[] = [];
      const acPattern = /AC-US\d+-\d+/g;
      let acMatch;
      while ((acMatch = acPattern.exec(storyContent)) !== null) {
        if (!acIds.includes(acMatch[0])) {
          acIds.push(acMatch[0]);
        }
      }

      stories.push({
        id,
        title,
        description,
        acceptanceCriteria: acIds
      });
    }

    return stories;
  }

  /**
   * Extract acceptance criteria from spec content
   */
  private extractAcceptanceCriteria(content: string): AcceptanceCriterionData[] {
    const criteria: AcceptanceCriterionData[] = [];

    // Pattern: - [x] AC-US1-01: Description
    // Supports both plain text and bold formatting: AC-US1-01 or **AC-US1-01**
    const acPattern = /^[-*]\s+\[([ x])\]\s+\*{0,2}(AC-US\d+-\d+)\*{0,2}:\s+(.+?)$/gm;

    let match;
    while ((match = acPattern.exec(content)) !== null) {
      const completed = match[1] === 'x';
      const id = match[2];
      const description = match[3];

      // Extract user story ID (AC-US1-01 → US-001)
      const usMatch = id.match(/AC-US(\d+)-\d+/);
      const userStoryId = usMatch ? `US-${usMatch[1].padStart(3, '0')}` : '';

      criteria.push({
        id,
        userStoryId,
        description,
        completed
      });
    }

    return criteria;
  }

  /**
   * Generate FEATURE.md content
   */
  private generateFeatureFile(
    featureId: string,
    parsed: ParsedSpec,
    incrementId: string
  ): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`id: ${featureId}`);
    lines.push(`title: "${parsed.title}"`);
    lines.push(`type: feature`);
    lines.push(`status: ${parsed.status}`);
    lines.push(`priority: ${parsed.priority}`);
    lines.push(`created: ${parsed.created}`);
    lines.push(`lastUpdated: ${new Date().toISOString().split('T')[0]}`);
    lines.push('---');
    lines.push('');

    // Title
    lines.push(`# ${parsed.title}`);
    lines.push('');

    // Overview
    if (parsed.overview) {
      lines.push('## Overview');
      lines.push('');
      lines.push(parsed.overview);
      lines.push('');
    }

    // Implementation History
    lines.push('## Implementation History');
    lines.push('');
    lines.push('| Increment | Status | Completion Date |');
    lines.push('|-----------|--------|----------------|');
    const statusEmoji = parsed.status === 'completed' ? '✅' : '⏳';
    lines.push(`| [${incrementId}](../../../../increments/${incrementId}/spec.md) | ${statusEmoji} ${parsed.status} | ${parsed.created} |`);
    lines.push('');

    // User Stories
    if (parsed.userStories.length > 0) {
      lines.push('## User Stories');
      lines.push('');
      for (const story of parsed.userStories) {
        const storySlug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const storyFile = `../../specweave/${featureId}/${story.id.toLowerCase()}-${storySlug}.md`;
        lines.push(`- [${story.id}: ${story.title}](${storyFile})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate README.md content
   */
  private generateReadmeFile(
    featureId: string,
    parsed: ParsedSpec,
    incrementId: string
  ): string {
    const lines: string[] = [];

    lines.push('---');
    lines.push(`id: ${featureId}-specweave`);
    lines.push(`title: "${parsed.title} - SpecWeave Implementation"`);
    lines.push(`feature: ${featureId}`);
    lines.push(`project: specweave`);
    lines.push(`type: feature-context`);
    lines.push(`status: ${parsed.status}`);
    lines.push('---');
    lines.push('');

    lines.push(`# ${parsed.title}`);
    lines.push('');
    lines.push(`**Feature**: [${featureId}](../../_features/${featureId}/FEATURE.md)`);
    lines.push('');

    if (parsed.overview) {
      lines.push('## Overview');
      lines.push('');
      lines.push(parsed.overview);
      lines.push('');
    }

    lines.push('## User Stories');
    lines.push('');
    lines.push('See user story files in this directory.');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate user story file content
   */
  private generateUserStoryFile(
    story: UserStoryData,
    featureId: string,
    incrementId: string,
    parsed: ParsedSpec
  ): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`id: ${story.id}`);
    lines.push(`feature: ${featureId}`);
    lines.push(`title: "${story.title}"`);
    lines.push(`status: ${parsed.status}`);
    lines.push(`priority: ${parsed.priority}`);
    lines.push(`created: ${parsed.created}`);

    // Format preservation metadata (T-034A)
    if (story.format_preservation !== undefined) {
      lines.push(`format_preservation: ${story.format_preservation}`);
    }
    if (story.external_title) {
      lines.push(`external_title: "${story.external_title}"`);
    }
    if (story.external_source) {
      lines.push(`external_source: ${story.external_source}`);
    }
    if (story.external_id) {
      lines.push(`external_id: "${story.external_id}"`);
    }
    if (story.external_url) {
      lines.push(`external_url: "${story.external_url}"`);
    }
    if (story.imported_at) {
      lines.push(`imported_at: "${story.imported_at}"`);
    }
    if (story.origin) {
      lines.push(`origin: ${story.origin}`);
    }

    lines.push('---');
    lines.push('');

    // Title
    lines.push(`# ${story.id}: ${story.title}`);
    lines.push('');

    // Feature link
    lines.push(`**Feature**: [${featureId}](../../_features/${featureId}/FEATURE.md)`);
    lines.push('');

    // Description
    if (story.description) {
      lines.push(story.description);
      lines.push('');
    }

    lines.push('---');
    lines.push('');

    // Acceptance Criteria
    lines.push('## Acceptance Criteria');
    lines.push('');

    const storyCriteria = parsed.acceptanceCriteria.filter(
      ac => ac.userStoryId === story.id
    );

    if (storyCriteria.length > 0) {
      for (const ac of storyCriteria) {
        const checkbox = ac.completed ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} **${ac.id}**: ${ac.description}`);
      }
    } else {
      lines.push('No acceptance criteria defined.');
    }
    lines.push('');

    lines.push('---');
    lines.push('');

    // Implementation
    lines.push('## Implementation');
    lines.push('');
    lines.push(`**Increment**: [${incrementId}](../../../../increments/${incrementId}/spec.md)`);
    lines.push('');
    lines.push('**Tasks**: See increment tasks.md for implementation details.');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Sync tasks from increment to user story files
   *
   * Populates the ## Tasks section in each user story file with tasks from increment tasks.md
   */
  private async syncTasksToUserStories(
    incrementId: string,
    featureId: string,
    userStories: UserStoryData[],
    projectPath: string
  ): Promise<void> {
    const taskGenerator = new TaskProjectSpecificGenerator(this.projectRoot);

    for (const story of userStories) {
      try {
        // Generate project-specific tasks for this user story
        const tasks = await taskGenerator.generateProjectSpecificTasks(
          incrementId,
          story.id,  // e.g., "US-001"
          undefined  // No project filter (use all tasks mapped to this user story)
        );

        // Format tasks as markdown
        const tasksMarkdown = taskGenerator.formatTasksAsMarkdown(tasks);

        // Update user story file
        const storySlug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const storyFile = path.join(projectPath, `${story.id.toLowerCase()}-${storySlug}.md`);

        await this.updateTasksSection(storyFile, tasksMarkdown);

        this.logger.log(`   ✅ Synced ${tasks.length} tasks to ${story.id}`);
      } catch (error) {
        this.logger.error(`   ⚠️  Failed to sync tasks for ${story.id}:`, error);
        // Continue with other user stories even if one fails
      }
    }
  }

  /**
   * Update ## Tasks section in user story file
   */
  private async updateTasksSection(
    userStoryFile: string,
    tasksMarkdown: string
  ): Promise<void> {
    const content = await fs.readFile(userStoryFile, 'utf-8');

    // Replace existing ## Tasks section
    const tasksRegex = /##\s+Tasks\s+([\s\S]*?)(?=\n##|$)/;

    if (tasksRegex.test(content)) {
      // Replace existing section
      const updatedContent = content.replace(
        tasksRegex,
        `## Tasks\n\n${tasksMarkdown}\n`
      );
      await fs.writeFile(userStoryFile, updatedContent, 'utf-8');
    } else {
      // Add new section before "Related" section or at the end
      const relatedRegex = /\n---\n\n\*\*Related\*\*:/;

      if (relatedRegex.test(content)) {
        // Insert before "Related" section
        const updatedContent = content.replace(
          relatedRegex,
          `\n\n## Tasks\n\n${tasksMarkdown}\n\n---\n\n**Related**:`
        );
        await fs.writeFile(userStoryFile, updatedContent, 'utf-8');
      } else {
        // Append at the end
        const updatedContent = content + `\n\n## Tasks\n\n${tasksMarkdown}\n`;
        await fs.writeFile(userStoryFile, updatedContent, 'utf-8');
      }
    }
  }

  /**
   * Sync to external tools (GitHub, JIRA, ADO)
   *
   * AC-US5-01: Detect external tool configuration from metadata.json
   * AC-US5-02: When GitHub configured, trigger GitHub sync
   * AC-US5-03: When no external tools configured, skip
   * AC-US5-05: External tool failures don't break living docs sync
   */
  private async syncToExternalTools(
    incrementId: string,
    featureId: string,
    projectPath: string
  ): Promise<void> {
    try {
      // 1. Detect external tool configuration from metadata.json
      const externalTools = await this.detectExternalTools(incrementId);

      if (externalTools.length === 0) {
        // AC-US5-03: No external tools configured, skip
        return;
      }

      this.logger.log(`\n📡 Syncing to external tools: ${externalTools.join(', ')}`);

      // 2. Sync to each configured external tool
      for (const tool of externalTools) {
        try {
          switch (tool) {
            case 'github':
              await this.syncToGitHub(featureId, projectPath);
              break;
            case 'jira':
              await this.syncToJira(featureId, projectPath);
              break;
            case 'ado':
              await this.syncToADO(featureId, projectPath);
              break;
            default:
              this.logger.warn(`   ⚠️  Unknown external tool: ${tool}`);
          }
        } catch (error) {
          // AC-US5-05: External tool failures are logged but don't break living docs sync
          this.logger.error(`   ⚠️  Failed to sync to ${tool}:`, error);
          this.logger.error(`      Living docs sync will continue...`);
        }
      }

    } catch (error) {
      // AC-US5-05: External tool failures don't break living docs sync
      this.logger.error(`   ⚠️  External tool sync failed:`, error);
      this.logger.error(`      Living docs sync completed successfully despite external tool errors`);
    }
  }

  /**
   * Detect external tool configuration from increment metadata.json
   *
   * AC-US5-01: Detect external tool configuration from metadata.json
   *
   * Returns: Array of tool names (['github'], ['github', 'jira'], or [])
   */
  private async detectExternalTools(incrementId: string): Promise<string[]> {
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'metadata.json'
    );

    if (!fs.existsSync(metadataPath)) {
      return [];
    }

    try {
      const metadata = await fs.readJson(metadataPath);
      const tools: string[] = [];

      // Check for GitHub configuration
      if (metadata.github && (metadata.github.milestone || metadata.github.user_story_issues)) {
        tools.push('github');
      }

      // Check for JIRA configuration
      if (metadata.jira) {
        tools.push('jira');
      }

      // Check for ADO configuration
      if (metadata.ado || metadata.azure_devops) {
        tools.push('ado');
      }

      return tools;

    } catch (error) {
      this.logger.warn(`   ⚠️  Failed to read metadata.json: ${error}`);
      return [];
    }
  }

  /**
   * Sync to GitHub Issues
   *
   * AC-US5-02: When GitHub configured, trigger GitHub sync
   *
   * Uses GitHubFeatureSync.syncFeatureToGitHub() which is idempotent:
   * - Uses existing milestone if it exists
   * - Updates existing issues (triple idempotency check)
   * - Only creates new issues if they don't exist
   */
  private async syncToGitHub(featureId: string, projectPath: string): Promise<void> {
    try {
      this.logger.log(`   🔄 Syncing to GitHub...`);

      // Dynamic import to avoid circular dependencies
      const { GitHubClientV2 } = await import('../../../plugins/specweave-github/lib/github-client-v2.js');
      const { GitHubFeatureSync } = await import('../../../plugins/specweave-github/lib/github-feature-sync.js');

      // Load GitHub config from environment
      const profile = {
        provider: 'github' as const,
        displayName: 'GitHub',
        config: {
          owner: process.env.GITHUB_OWNER || '',
          repo: process.env.GITHUB_REPO || '',
          token: process.env.GITHUB_TOKEN || ''
        },
        timeRange: {
          default: '1M' as const,  // 1 month
          max: '3M' as const       // 3 months
        }
      };

      if (!profile.config.token || !profile.config.owner || !profile.config.repo) {
        this.logger.warn(`   ⚠️  GitHub credentials not configured (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)`);
        return;
      }

      // Initialize GitHub client and sync
      const client = new GitHubClientV2(profile);
      const specsDir = path.join(this.projectRoot, '.specweave/docs/internal/specs');
      const sync = new GitHubFeatureSync(client, specsDir, this.projectRoot);

      // Sync feature to GitHub (idempotent - safe to run multiple times)
      const result = await sync.syncFeatureToGitHub(featureId);

      this.logger.log(`   ✅ Synced to GitHub: ${result.issuesUpdated} updated, ${result.issuesCreated} created`);

    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        this.logger.warn(`   ⚠️  GitHub plugin not installed - skipping GitHub sync`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Sync to JIRA (placeholder for future implementation)
   */
  private async syncToJira(featureId: string, projectPath: string): Promise<void> {
    this.logger.log(`   ⚠️  JIRA sync not yet implemented - skipping`);
    // TODO: Implement JIRA sync when specweave-jira plugin is available
  }

  /**
   * Sync to Azure DevOps (placeholder for future implementation)
   */
  private async syncToADO(featureId: string, projectPath: string): Promise<void> {
    this.logger.log(`   ⚠️  ADO sync not yet implemented - skipping`);
    // TODO: Implement ADO sync when specweave-ado plugin is available
  }

  /**
   * Find existing user story file by US-ID
   *
   * Searches for any file matching pattern: us-{id}-*.md
   * Example: US-001 matches us-001-status-line.md or us-001-status-line-priority-p1.md
   *
   * @param projectPath - Path to feature folder (e.g., .specweave/docs/internal/specs/specweave/FS-043)
   * @param userStoryId - User story ID (e.g., "US-001")
   * @returns Filename if found, null otherwise
   */
  private async findExistingUserStoryFile(
    projectPath: string,
    userStoryId: string
  ): Promise<string | null> {
    try {
      const files = await fs.readdir(projectPath);

      // Look for file matching: us-001-*.md (case insensitive)
      const usIdLower = userStoryId.toLowerCase(); // us-001
      const matchingFiles = files.filter(f => {
        const match = f.match(/^(us-\d+)-/);
        return match && match[1] === usIdLower;
      });

      if (matchingFiles.length === 0) {
        return null; // No existing file found
      }

      if (matchingFiles.length === 1) {
        return matchingFiles[0]; // Exactly one file found ✅
      }

      // Multiple files found - return most recent
      this.logger.warn(`   ⚠️  Found ${matchingFiles.length} files for ${userStoryId}, using most recent`);
      const fileTimes = await Promise.all(
        matchingFiles.map(async (f) => ({
          file: f,
          mtime: (await fs.stat(path.join(projectPath, f))).mtime.getTime()
        }))
      );
      fileTimes.sort((a, b) => b.mtime - a.mtime); // Newest first
      return fileTimes[0].file;

    } catch (error) {
      // Directory doesn't exist yet (first sync)
      return null;
    }
  }

  /**
   * Clean up duplicate user story files
   *
   * Strategy:
   * 1. List all user story files in feature folder
   * 2. Group by user story ID (US-001, US-002, etc.)
   * 3. If multiple files found for same US:
   *    - Keep the file WITH most recent modification time
   *    - Delete older files
   *    - Log warning
   */
  private async cleanupDuplicateFiles(
    featureId: string,
    projectPath: string
  ): Promise<void> {
    const files = await fs.readdir(projectPath);

    // Group files by user story ID
    const filesByStory = new Map<string, string[]>();

    for (const file of files) {
      // Match pattern: us-001-*, us-002-*, etc.
      const match = file.match(/^(us-\d+)-/);
      if (match) {
        const storyId = match[1].toUpperCase(); // US-001
        if (!filesByStory.has(storyId)) {
          filesByStory.set(storyId, []);
        }
        filesByStory.get(storyId)!.push(file);
      }
    }

    // Check for duplicates
    for (const [storyId, storyFiles] of filesByStory.entries()) {
      if (storyFiles.length > 1) {
        this.logger.warn(`   ⚠️  Found ${storyFiles.length} duplicate files for ${storyId}`);

        // Find the most recent file
        const fileTimes = await Promise.all(
          storyFiles.map(async (f) => ({
            file: f,
            mtime: (await fs.stat(path.join(projectPath, f))).mtime.getTime()
          }))
        );

        fileTimes.sort((a, b) => b.mtime - a.mtime); // Newest first
        const keepFile = fileTimes[0].file;
        const deleteFiles = fileTimes.slice(1).map(f => f.file);

        this.logger.warn(`      → Keeping: ${keepFile} (most recent)`);

        // Delete older files
        for (const file of deleteFiles) {
          const filePath = path.join(projectPath, file);
          await fs.remove(filePath);
          this.logger.warn(`      ✅ Deleted: ${file}`);
        }
      }
    }
  }

  /**
   * Clean up temporary files left behind by sync operations
   *
   * Removes:
   * - .tmp files (temporary update files)
   * - .backup files (backup files from updates)
   * - Any other temporary files
   */
  private async cleanupTempFiles(projectPath: string): Promise<void> {
    const files = await fs.readdir(projectPath);

    for (const file of files) {
      if (file.endsWith('.tmp') || file.endsWith('.backup')) {
        const filePath = path.join(projectPath, file);
        await fs.remove(filePath);
        this.logger.log(`   🧹 Cleaned up: ${file}`);
      }
    }
  }
}
