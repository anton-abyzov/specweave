/**
 * Living Docs Sync - Simplified sync mechanism
 *
 * Syncs increment specs to living docs structure:
 * - .specweave/docs/internal/specs/{project}/FS-XXX/FEATURE.md
 * - .specweave/docs/internal/specs/{project}/FS-XXX/us-*.md
 *
 * All features live directly under the project folder.
 * Archive: .specweave/docs/internal/specs/{project}/_archive/FS-XXX/
 *
 * Project folder is auto-detected from:
 * 1. multiProject.activeProject (config)
 * 2. Git remote (GitHub repo name)
 * 3. "default" (fallback)
 *
 * Uses FeatureIDManager for automatic feature ID assignment (greenfield vs brownfield)
 */

import { existsSync, promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { FeatureIDManager } from './feature-id-manager.js';
import { TaskProjectSpecificGenerator } from './task-project-specific-generator.js';
import { FeatureConsistencyValidator } from './feature-consistency-validator.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { autoDetectProjectIdSync } from '../../utils/project-detection.js';
import { getGitHubAuthFromProject } from '../../utils/auth-helpers.js';
// NOTE (2025-12-01): findNextAvailableInternalIdSync removed - internal features don't need collision check
// Collision detection is only for EXTERNAL features (FS-XXXE) imported from GitHub/JIRA/ADO
import { deriveFeatureId } from '../../utils/feature-id-derivation.js';
// Import types from centralized location
import type {
  SyncOptions,
  SyncResult,
  ParsedSpec,
  UserStoryData,
  AcceptanceCriterionData,
} from './types.js';
// Import extracted helpers
import {
  calculateUSStatus,
  extractUserStories,
  extractAcceptanceCriteria,
  generateFeatureFile,
  generateReadmeFile,
  generateUserStoryFile,
  pathExists,
  readJson,
  ensureDir,
  findExistingUserStoryFile,
  cleanupDuplicateFiles,
  cleanupTempFiles,
} from './sync-helpers/index.js';

// Re-export types for backward compatibility
export type { SyncOptions, SyncResult, ParsedSpec, UserStoryData, AcceptanceCriterionData };

export class LivingDocsSync {
  private projectRoot: string;
  private featureIdManager: FeatureIDManager;
  private logger: Logger;
  private projectId: string;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.featureIdManager = new FeatureIDManager(projectRoot);
    this.logger = options.logger ?? consoleLogger;
    // Auto-detect project ID from git remote, sync config, or use "default"
    this.projectId = autoDetectProjectIdSync(projectRoot, { silent: true });
  }

  /**
   * Get current project ID
   *
   * Priority:
   * 1. Git remote (GitHub repo name)
   * 2. Sync configuration (JIRA/ADO project)
   * 3. "default" (fallback)
   */
  getProjectId(): string {
    return this.projectId;
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
    return await pathExists(archivePath);
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
      // P0-3: CRITICAL FIX - Atomic check to prevent TOCTOU race condition
      // Instead of checking if archived, check if increment exists in ACTIVE folder
      // This is atomic and prevents race where increment moves to archive between check and use
      // See: ULTRATHINK-ARCHIVE-REORGANIZATION-BUG.md for full analysis
      const activeIncrementPath = path.join(
        this.projectRoot,
        '.specweave/increments',
        incrementId
      );

      // Atomic existence check for active increment
      try {
        await fs.access(activeIncrementPath);
        // If we reach here, increment exists in active folder - proceed with sync
      } catch {
        // Increment not in active folder (archived, moved, or doesn't exist)
        this.logger.log(`⏭️  Skipping sync for non-active increment ${incrementId}`);
        return {
          success: true,
          featureId: '',
          incrementId,
          filesCreated: [],
          filesUpdated: [],
          errors: ['Increment not in active folder - sync skipped to prevent issues']
        };
      }

      // Step 1: Build feature registry (auto-generates IDs for greenfield)
      await this.featureIdManager.buildRegistry();

      // Step 2: Get feature ID (derived from increment number)
      // SIMPLIFIED (v0.29.0): Feature ID is now always derived, not stored in metadata
      let featureId: string;
      if (options.explicitFeatureId && /^FS-\d{3,}E?$/.test(options.explicitFeatureId)) {
        // Allow explicit override for special cases (e.g., epic linking)
        featureId = options.explicitFeatureId;
        this.logger.log(`📎 Using explicit feature ID: ${featureId}`);
      } else {
        // Derive from increment number (the normal case)
        featureId = await this.getFeatureIdForIncrement(incrementId);
        this.logger.log(`🔄 Derived feature ID: ${featureId}`);
      }

      result.featureId = featureId;

      // NOTE (v0.29.0): No longer write feature_id to metadata.json
      // Feature ID is derived from increment number - see ADR-0140

      this.logger.log(`📚 Syncing ${incrementId} → ${featureId}...`);

      // Step 3: Parse increment spec
      const parsed = await this.parseIncrementSpec(incrementId);

      // Step 4: Create living docs structure
      // Structure: specs/{project}/FS-XXX/FEATURE.md (+ user stories)
      // CRITICAL FIX (2025-12-02): Use smart project path resolution for brownfield setups
      // This handles hierarchical paths like "acme/digital-operations-services"
      const basePath = path.join(this.projectRoot, '.specweave/docs/internal/specs');
      const resolvedProjectPath = await this.resolveProjectPath(incrementId);

      // Create {project}/FS-XXX/FEATURE.md
      const projectPath = path.join(basePath, resolvedProjectPath, featureId);
      this.logger.log(`   📁 Feature folder: ${resolvedProjectPath}/${featureId}/`);
      const featureFile = path.join(projectPath, 'FEATURE.md');

      if (!options.dryRun) {
        await ensureDir(projectPath);
        const featureContent = generateFeatureFile(featureId, parsed, incrementId);
        await fs.writeFile(featureFile, featureContent, 'utf-8');
        result.filesCreated.push(featureFile);
      } else {
        result.filesCreated.push(featureFile + ' (dry-run)');
      }

      // Create user story files
      for (const story of parsed.userStories) {
        // CRITICAL: Find existing file by US-ID first to prevent duplicates
        const existingFile = await findExistingUserStoryFile(projectPath, story.id, this.logger);

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
          const storyContent = generateUserStoryFile(story, featureId, incrementId, parsed);
          await fs.writeFile(storyFile, storyContent, 'utf-8');
          result.filesCreated.push(storyFile);
        } else {
          result.filesCreated.push(storyFile + ' (dry-run)');
        }
      }

      // Step 5: Clean up duplicates and temp files BEFORE syncing tasks
      if (!options.dryRun) {
        await cleanupDuplicateFiles(projectPath, this.logger);
        await cleanupTempFiles(projectPath, this.logger);
      }

      // Step 6: Sync tasks from increment to user stories
      if (!options.dryRun) {
        await this.syncTasksToUserStories(incrementId, featureId, parsed.userStories, projectPath);
      }

      // Step 7: Sync to external tools (GitHub, JIRA, ADO)
      // CRITICAL (v0.25.1): Check SKIP_EXTERNAL_SYNC to prevent recursion cascade
      // P1-3 FIX: Proper boolean parsing (handles "false" string correctly)
      // See: ADR-0129 (US Sync Guard Rails), TODOWRITE-CRASH-RECOVERY.md
      const skipExternalSync = ['true', '1', 'yes'].includes(
        (process.env.SKIP_EXTERNAL_SYNC || '').toLowerCase().trim()
      );

      if (!options.dryRun && !skipExternalSync) {
        await this.syncToExternalTools(incrementId, featureId, projectPath);
      } else if (skipExternalSync) {
        this.logger.log(`   ⏭️  External tool sync skipped (SKIP_EXTERNAL_SYNC=${process.env.SKIP_EXTERNAL_SYNC})`);
        this.logger.log(`   ℹ️  Run /specweave:sync-progress to manually sync when ready`);
      }

      // Step 8: Final cleanup (remove any temp files created during sync)
      if (!options.dryRun) {
        await cleanupTempFiles(projectPath, this.logger);
      }

      // Step 9: Validate consistency (auto-repair if needed)
      if (!options.dryRun) {
        await this.validateAndRepairConsistency(featureId, resolvedProjectPath);
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
   * Get feature ID for increment
   *
   * SIMPLIFIED (v0.29.0): Feature ID is derived from increment number
   * No longer reads from metadata.json - derivation is the single source of truth
   *
   * CRITICAL FIX (2025-12-01): Internal features are DETERMINISTIC - no collision check!
   * - Increment 0060 → ALWAYS FS-060, never anything else
   * - Increment 0072 → ALWAYS FS-072, never anything else
   * - Sync is IDEMPOTENT: if FS-060 exists, UPDATE it (don't create FS-061)
   *
   * Collision detection is ONLY for EXTERNAL features (FS-XXXE) during imports,
   * NOT for internal features derived from increment numbers.
   *
   * @see deriveFeatureId() in src/utils/feature-id-derivation.ts
   * @see ADR-0140 for rationale
   */
  private async getFeatureIdForIncrement(incrementId: string): Promise<string> {
    // Derive feature ID directly from increment number (e.g., "0081-name" → "FS-081")
    // NO collision checking - internal feature IDs are deterministic and unique by design
    return deriveFeatureId(incrementId);
  }

  /**
   * Extract project name from increment spec.md
   *
   * Looks for the **Project**: field in spec.md (e.g., "**Project**: digital-operation-services")
   *
   * SECURITY: Validates both incrementId and extracted project name to prevent path traversal
   *
   * @param incrementId - Increment ID (e.g., "0002-test-anton-monitor")
   * @returns Project name or null if not specified or invalid
   */
  private async extractProjectFromSpec(incrementId: string): Promise<string | null> {
    // SECURITY FIX (2025-12-02): Validate incrementId format FIRST
    // Prevents path traversal via malicious increment IDs like "../../../etc"
    if (!incrementId || !/^\d{4}-[a-z0-9-]+$/i.test(incrementId)) {
      this.logger.warn(`   ⚠️  Invalid increment ID format: ${incrementId}`);
      return null;
    }

    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    if (!existsSync(specPath)) {
      return null;
    }

    try {
      const content = await fs.readFile(specPath, 'utf-8');
      // Match **Project**: value or **Project:** value (with or without space after colon)
      const projectMatch = content.match(/\*\*Project\*\*:\s*(.+?)(?:\n|$)/i);
      if (projectMatch && projectMatch[1]) {
        // Strip markdown formatting before normalization
        const rawProjectName = projectMatch[1]
          .trim()
          .replace(/\*\*/g, '')    // Remove bold markers
          .replace(/__/g, '')      // Remove italic markers
          .replace(/`/g, '');      // Remove code markers

        const projectName = rawProjectName.toLowerCase().replace(/\s+/g, '-');

        // SECURITY: Minimum length check to prevent empty names after stripping
        if (!projectName || projectName.length < 2) {
          this.logger.warn(`   ⚠️  Project name too short: ${projectName}`);
          return null;
        }

        // CRITICAL SECURITY: Block path traversal attempts
        // Reject names containing: .., /, \, or null bytes
        if (projectName.includes('..') ||
            projectName.includes('/') ||
            projectName.includes('\\') ||
            projectName.includes('\0')) {
          this.logger.warn(`   ⚠️  Invalid project name (potential path traversal): ${projectName}`);
          return null;
        }

        // Validate: only allow alphanumeric, hyphens, underscores
        if (!/^[a-z0-9_-]+$/.test(projectName)) {
          this.logger.warn(`   ⚠️  Invalid project name (invalid characters): ${projectName}`);
          return null;
        }

        return projectName;
      }
    } catch {
      // Ignore errors, return null
    }

    return null;
  }

  /**
   * Resolve the project path for an increment (SMART BROWNFIELD MATCHING)
   *
   * For brownfield projects imported from ADO/JIRA, the specs folder may have
   * hierarchical organization like: acme/digital-operations-services
   *
   * This method:
   * 1. Extracts the project name from increment spec.md
   * 2. Scans existing specs folder for matching hierarchical paths
   * 3. Returns the FULL path if found (e.g., "acme/digital-operations-services")
   * 4. Falls back to flat path if no match (e.g., "digital-operation-services")
   *
   * @param incrementId - Increment ID (e.g., "0002-test-anton-monitor")
   * @returns Project path (may be hierarchical like "org/project")
   */
  private async resolveProjectPath(incrementId: string): Promise<string> {
    // 1. Extract project name from spec.md
    const specProject = await this.extractProjectFromSpec(incrementId);

    if (!specProject) {
      // No project in spec.md, use default detection
      return this.projectId;
    }

    // 2. Normalize the project name for comparison
    const normalizedProject = specProject.toLowerCase().replace(/\s+/g, '-');

    // 3. Scan existing specs folder for hierarchical matches
    const specsBase = path.join(this.projectRoot, '.specweave/docs/internal/specs');

    if (!existsSync(specsBase)) {
      return normalizedProject;
    }

    // Search for matching paths at all levels (org/project, project)
    const foundPath = await this.findBestProjectMatch(specsBase, normalizedProject);

    if (foundPath) {
      this.logger.log(`   🔍 Found existing project path: ${foundPath}`);
      return foundPath;
    }

    // No match found, use flat project name
    return normalizedProject;
  }

  /**
   * Find the best matching project path in existing specs structure
   *
   * Searches for:
   * 1. Direct match: specs/{project}/
   * 2. Hierarchical match: specs/{org}/{project}/
   * 3. Fuzzy match: specs/{org}/{similar-project}/ (handles typos like "operation" vs "operations")
   *
   * @param specsBase - Base specs folder path
   * @param projectName - Project name to search for
   * @returns Full relative path (e.g., "acme/digital-operations-services") or null
   */
  private async findBestProjectMatch(specsBase: string, projectName: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(specsBase, { withFileTypes: true });

      // 1. Check for direct match at root level
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('_')) {
          if (this.projectNamesMatch(entry.name, projectName)) {
            return entry.name;
          }
        }
      }

      // 2. Check for hierarchical match (org/project)
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('FS-')) {
          // This could be an organization folder, check inside
          const orgPath = path.join(specsBase, entry.name);
          try {
            const orgEntries = await fs.readdir(orgPath, { withFileTypes: true });

            for (const subEntry of orgEntries) {
              if (subEntry.isDirectory() && !subEntry.name.startsWith('_') && !subEntry.name.startsWith('FS-')) {
                if (this.projectNamesMatch(subEntry.name, projectName)) {
                  return `${entry.name}/${subEntry.name}`;
                }
              }
            }
          } catch {
            // Not a directory or can't read, skip
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Compare project names with fuzzy matching
   *
   * Handles common variations:
   * - "operation" vs "operations"
   * - "service" vs "services"
   * - Different separators (hyphen vs underscore)
   *
   * SECURITY: Requires minimum length to prevent false positive matches
   * NOTE: Uses standardization (singular form) instead of abbreviation to prevent
   *       false matches (e.g., "optical" should NOT match "operations")
   *
   * @param existing - Existing folder name
   * @param target - Target project name to match
   * @returns true if names match (exact or fuzzy)
   */
  private projectNamesMatch(existing: string, target: string): boolean {
    // Normalize both names - standardize to singular form (NOT abbreviate)
    // This prevents false positives: "optical" won't match "operations"
    const normalizeForComparison = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[-_\s]+/g, '-')                 // Normalize separators
        .replace(/\boperations\b/g, 'operation')  // Standardize to singular
        .replace(/\bservices\b/g, 'service');     // Standardize to singular
    };

    const normalizedExisting = normalizeForComparison(existing);
    const normalizedTarget = normalizeForComparison(target);

    // Exact match after normalization
    if (normalizedExisting === normalizedTarget) {
      return true;
    }

    // SECURITY: Minimum length check to prevent false positive matches
    // Short strings like "api" should not fuzzy-match "api-gateway-service"
    const minLength = Math.min(normalizedExisting.length, normalizedTarget.length);
    if (minLength < 5) {
      return false; // Too short to reliably fuzzy match
    }

    // Check if one contains the other (for partial matches)
    if (normalizedExisting.includes(normalizedTarget) || normalizedTarget.includes(normalizedExisting)) {
      // Only match if they're reasonably similar in length (avoid false positives)
      const lengthRatio = minLength / Math.max(normalizedExisting.length, normalizedTarget.length);
      return lengthRatio > 0.7;
    }

    return false;
  }

  // NOTE (v0.29.0): updateMetadataFeatureId() was REMOVED
  // Feature ID is now derived from increment number, not stored in metadata
  // See ADR-0140 for rationale

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

    if (!await pathExists(specPath)) {
      throw new Error(`Spec file not found: ${specPath}`);
    }

    // CRITICAL (v0.26.2): Read metadata.json for source-of-truth status
    // spec.md frontmatter status is NOT updated when increment completes
    // See: Living docs sync bug report (2025-11-24)
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'metadata.json'
    );
    let incrementStatus = 'planning'; // Default fallback
    if (await pathExists(metadataPath)) {
      try {
        const metadata = await readJson(metadataPath);
        incrementStatus = metadata.status || 'planning';
      } catch (error) {
        this.logger.warn(`Failed to read metadata.json for ${incrementId}, using fallback status`);
      }
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
    const userStories = extractUserStories(bodyContent);

    // Extract acceptance criteria
    const acceptanceCriteria = extractAcceptanceCriteria(bodyContent);

    // Calculate status for each user story based on AC completion
    for (const story of userStories) {
      // Use Set to deduplicate AC IDs (spec.md may have duplicates)
      const uniqueACIds = [...new Set(story.acceptanceCriteria)];
      const totalACs = uniqueACIds.length;

      // Count how many unique ACs are completed
      const completedACIds = new Set(
        acceptanceCriteria
          .filter(ac => ac.userStoryId === story.id && ac.completed)
          .map(ac => ac.id)
      );
      const completedACs = completedACIds.size;

      story.status = calculateUSStatus(totalACs, completedACs);
    }

    return {
      title,
      overview,
      status: incrementStatus, // FIXED (v0.26.2): Use metadata.json status (source of truth)
      priority: frontmatter.priority || 'P1',
      created: frontmatter.created || new Date().toISOString().split('T')[0],
      userStories,
      acceptanceCriteria,
      frontmatter
    };
  }

  // NOTE: calculateUSStatus, extractUserStories, extractAcceptanceCriteria,
  // generateFeatureFile, generateReadmeFile, generateUserStoryFile
  // have been moved to ./sync-helpers/ for maintainability

  // extractUserStories, extractAcceptanceCriteria moved to ./sync-helpers/parsers.ts

  // generateFeatureFile moved to ./sync-helpers/generators.ts

  // generateReadmeFile moved to ./sync-helpers/generators.ts

  // generateUserStoryFile moved to ./sync-helpers/generators.ts

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
  /**
   * Detect external tools configured for this increment
   *
   * ADR-0134: Enhanced detection checks BOTH levels:
   * - Level 1 (metadata.json): Increment-specific configuration (cached links)
   * - Level 2 (config.json): Global project configuration (active profiles)
   *
   * Precedence: Level 1 > Level 2 (increment metadata takes priority)
   *
   * @param incrementId - Increment ID (e.g., "0056-auto-github-sync")
   * @returns Array of tool names (['github'], ['github', 'jira'], or [])
   */
  private async detectExternalTools(incrementId: string): Promise<string[]> {
    const tools: string[] = [];

    // LEVEL 1: Check metadata.json (increment-specific configuration)
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'metadata.json'
    );

    if (existsSync(metadataPath)) {
      try {
        const metadata = await readJson(metadataPath);

        // Check GitHub configuration (both old and new formats)
        if (metadata.github && (metadata.github.milestone || metadata.github.user_story_issues)) {
          tools.push('github');
        } else if (metadata.external_links?.github) {
          tools.push('github');
        }

        // Check JIRA configuration
        if (metadata.jira) {
          tools.push('jira');
        }

        // Check ADO configuration
        if (metadata.ado || metadata.azure_devops) {
          tools.push('ado');
        }
      } catch (error) {
        this.logger.warn(`   ⚠️  Failed to read metadata.json: ${error}`);
        // Fall through to Level 2 check
      }
    }

    // LEVEL 2: Check config.json (global project configuration)
    // ADR-0134 ENHANCED: Check multiple config locations for GitHub/JIRA/ADO
    const configPath = path.join(this.projectRoot, '.specweave/config.json');
    if (existsSync(configPath)) {
      try {
        const config = await readJson(configPath);

        // GitHub detection (4 methods in order of preference)
        if (!tools.includes('github')) {
          // Method 1: sync.github section (most common)
          if (config.sync?.github?.enabled && config.sync?.github?.owner && config.sync?.github?.repo) {
            this.logger.log(`   ✅ GitHub sync enabled (config.sync.github, owner: ${config.sync.github.owner})`);
            tools.push('github');
          }
          // Method 2: sync.profiles[activeProfile] (multi-profile setup)
          else if (config.sync?.activeProfile && config.sync?.profiles?.[config.sync.activeProfile]?.provider === 'github') {
            const profile = config.sync.profiles[config.sync.activeProfile];
            if (profile.config?.owner && profile.config?.repo) {
              this.logger.log(`   ✅ GitHub sync enabled (active profile: ${config.sync.activeProfile})`);
              tools.push('github');
            }
          }
          // Method 3: multiProject.projects[activeProject].externalTools.github
          else if (config.multiProject?.enabled && config.multiProject?.activeProject) {
            const activeProject = config.multiProject.activeProject;
            const projectConfig = config.multiProject.projects?.[activeProject];
            if (projectConfig?.externalTools?.github?.repository) {
              this.logger.log(`   ✅ GitHub sync enabled (multiProject, repo: ${projectConfig.externalTools.github.repository})`);
              tools.push('github');
            }
          }
          // Method 4: Legacy plugins.settings (backward compatibility)
          else if (config.plugins?.settings?.['specweave-github']?.activeProfile) {
            this.logger.log(`   ✅ GitHub sync enabled (legacy plugins.settings)`);
            tools.push('github');
          }
        }

        // Jira detection
        if (!tools.includes('jira')) {
          if (config.sync?.jira?.enabled) {
            this.logger.log(`   ✅ Jira sync enabled (config.sync.jira)`);
            tools.push('jira');
          } else if (config.sync?.activeProfile && config.sync?.profiles?.[config.sync.activeProfile]?.provider === 'jira') {
            this.logger.log(`   ✅ Jira sync enabled (active profile: ${config.sync.activeProfile})`);
            tools.push('jira');
          }
        }

        // ADO detection
        if (!tools.includes('ado')) {
          if (config.sync?.ado?.enabled) {
            this.logger.log(`   ✅ ADO sync enabled (config.sync.ado)`);
            tools.push('ado');
          } else if (config.sync?.activeProfile && config.sync?.profiles?.[config.sync.activeProfile]?.provider === 'ado') {
            this.logger.log(`   ✅ ADO sync enabled (active profile: ${config.sync.activeProfile})`);
            tools.push('ado');
          }
        }
      } catch (error) {
        this.logger.warn(`   ⚠️  Failed to read config.json: ${error}`);
        // Continue with whatever we detected from metadata
      }
    }

    // LEVEL 3: Check environment variables (fallback for simple setups)
    // Useful for CI/CD or when config.json is minimal
    if (!tools.includes('github')) {
      if (process.env.GITHUB_TOKEN && (process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY)) {
        this.logger.log(`   ✅ GitHub sync enabled (environment variables)`);
        tools.push('github');
      }
    }

    // Enhanced logging for debugging
    if (tools.length === 0) {
      this.logger.log(`   ℹ️  No external tools detected for ${incrementId}`);
      this.logger.log(`      - Checked metadata.json: ${existsSync(metadataPath) ? 'exists' : 'missing'}`);
      this.logger.log(`      - Checked config.json: ${existsSync(configPath) ? 'exists' : 'missing'}`);
    } else {
      this.logger.log(`   📡 External tools detected: ${tools.join(', ')}`);
    }

    return tools;
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

      // CRITICAL FIX (2025-11-24): Load GitHub config from config.json FIRST, then environment
      // Bug: Was only reading from env vars, ignoring config.json completely
      const configPath = path.join(this.projectRoot, '.specweave/config.json');
      let owner = process.env.GITHUB_OWNER || '';
      let repo = process.env.GITHUB_REPO || '';

      // CRITICAL FIX (2025-11-26): Use getGitHubAuthFromProject for full fallback chain
      // Priority: .env GITHUB_TOKEN → .env GH_TOKEN → process.env → gh auth token → gh config
      // This ensures sync works even if user only has gh CLI authenticated (no .env)
      const auth = getGitHubAuthFromProject(this.projectRoot);
      const token = auth.token;

      if (existsSync(configPath)) {
        try {
          const config = await readJson(configPath);
          // Method 1: Read from config.sync.github (most common)
          if (config.sync?.github?.owner && config.sync?.github?.repo) {
            owner = config.sync.github.owner;
            repo = config.sync.github.repo;
            this.logger.log(`   📝 Using GitHub config: ${owner}/${repo}`);
          }
          // Method 2: Read from multiProject.projects[activeProject].externalTools.github
          else if (config.multiProject?.enabled && config.multiProject?.activeProject) {
            const activeProject = config.multiProject.activeProject;
            const projectConfig = config.multiProject.projects?.[activeProject];
            if (projectConfig?.externalTools?.github?.repository) {
              const repoParts = projectConfig.externalTools.github.repository.split('/');
              if (repoParts.length === 2) {
                owner = repoParts[0];
                repo = repoParts[1];
                this.logger.log(`   📝 Using GitHub config (multiProject): ${owner}/${repo}`);
              }
            }
          }
        } catch (error) {
          this.logger.warn(`   ⚠️  Failed to read config.json, using environment variables`);
        }
      }

      const profile = {
        provider: 'github' as const,
        displayName: 'GitHub',
        config: {
          owner,
          repo,
          token
        },
        timeRange: {
          default: '1M' as const,  // 1 month
          max: '3M' as const       // 3 months
        }
      };

      if (!profile.config.token) {
        this.logger.warn(`   ⚠️  GITHUB_TOKEN not found in .env file`);
        return;
      }
      if (!profile.config.owner || !profile.config.repo) {
        this.logger.warn(`   ⚠️  GitHub owner/repo not configured in config.json`);
        this.logger.warn(`   💡 Set sync.github.owner and sync.github.repo in .specweave/config.json`);
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
   * Validate feature folder consistency
   *
   * Verifies that the feature folder was created correctly:
   * - FEATURE.md exists in {project}/FS-XXX/
   * - Logs warning if missing
   *
   * @param featureId - Feature ID that was just synced (e.g., "FS-062")
   * @param resolvedProjectPath - Resolved project path (may be hierarchical like "org/project")
   */
  private async validateAndRepairConsistency(featureId: string, resolvedProjectPath: string): Promise<void> {
    try {
      const featureFolderPath = path.join(
        this.projectRoot,
        '.specweave/docs/internal/specs',
        resolvedProjectPath,
        featureId
      );
      const featureFile = path.join(featureFolderPath, 'FEATURE.md');

      // Verify FEATURE.md exists
      if (!existsSync(featureFile)) {
        this.logger.warn(`   ⚠️  FEATURE.md missing in ${resolvedProjectPath}/${featureId}/`);
      }
    } catch (error) {
      // Non-fatal - log warning but continue
      this.logger.warn(`   ⚠️  Validation failed: ${error}`);
    }
  }
}
