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
import { BoardMatcher, type MatchDecision } from './board-matcher.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { autoDetectProjectIdSync } from '../../utils/project-detection.js';
import { getGitHubAuthFromProject } from '../../utils/auth-helpers.js';
// CRITICAL FIX (2025-12-04): Re-enabled collision detection for internal features
// Bug: When external features (FS-001E) exist, internal features (FS-001) must NOT collide
// IDs are scoped per project/board - each board has its own FS-XXX sequence
import { findNextAvailableInternalIdSync } from '../../utils/feature-id-collision.js';
import { deriveFeatureId, extractIncrementNumber } from '../../utils/feature-id-derivation.js';
// Import types from centralized location
import type {
  SyncOptions,
  SyncResult,
  ParsedSpec,
  UserStoryData,
  AcceptanceCriterionData,
} from './types.js';
// Import sync profile helpers for provider detection (v0.31.0+)
import { getProfilesByProvider } from '../types/sync-profile.js';
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
  private boardMatcher: BoardMatcher;
  private logger: Logger;
  private projectId: string;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.featureIdManager = new FeatureIDManager(projectRoot);
    this.logger = options.logger ?? consoleLogger;
    this.boardMatcher = new BoardMatcher(projectRoot, { logger: this.logger });
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

      // Step 2: Resolve project path FIRST (needed for collision detection)
      // CRITICAL FIX (2025-12-04): Moved before feature ID derivation
      // Collision detection is scoped per project/board
      const basePath = path.join(this.projectRoot, '.specweave/docs/internal/specs');
      const resolvedProjectPath = await this.resolveProjectPath(incrementId);

      // Step 3: Get feature ID (derived from increment number WITH collision detection)
      // CRITICAL FIX (2025-12-04): Now checks for FS-XXXE collisions
      let featureId: string;
      if (options.explicitFeatureId && /^FS-\d{3,}E?$/.test(options.explicitFeatureId)) {
        // Allow explicit override for special cases (e.g., epic linking)
        featureId = options.explicitFeatureId;
        this.logger.log(`📎 Using explicit feature ID: ${featureId}`);
      } else {
        // Derive from increment number with collision detection
        featureId = await this.getFeatureIdForIncrement(incrementId, resolvedProjectPath);
        this.logger.log(`🔄 Derived feature ID: ${featureId}`);
      }

      result.featureId = featureId;

      // NOTE (v0.29.0): No longer write feature_id to metadata.json
      // Feature ID is derived from increment number - see ADR-0140

      this.logger.log(`📚 Syncing ${incrementId} → ${featureId}...`);

      // Step 4: Parse increment spec
      const parsed = await this.parseIncrementSpec(incrementId);

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
   * Get feature ID for increment with collision detection
   *
   * SIMPLIFIED (v0.29.0): Feature ID is derived from increment number
   * No longer reads from metadata.json - derivation is the single source of truth
   *
   * CRITICAL FIX (2025-12-04): Re-enabled collision detection!
   * The previous assumption that "internal features are deterministic" was WRONG
   * when external imports exist. If FS-001E exists, internal increment 0001
   * must use FS-002 to avoid collision.
   *
   * Collision detection is SCOPED per project/board:
   * - Each project has its own FS-XXX sequence
   * - Scans both FS-XXX and FS-XXXE folders
   * - Also scans _orphans folder for US-XXX files
   *
   * @param incrementId - Increment ID (e.g., "0081-ado-repo-cloning")
   * @param resolvedProjectPath - Resolved project path (e.g., "acme/backend" or "my-project")
   * @returns Feature ID with collision avoidance (e.g., "FS-081" or "FS-082" if 081 exists)
   * @see deriveFeatureId() in src/utils/feature-id-derivation.ts
   */
  private async getFeatureIdForIncrement(
    incrementId: string,
    resolvedProjectPath: string
  ): Promise<string> {
    // Extract increment number (e.g., "0081-name" → 81)
    const incrementNumber = extractIncrementNumber(incrementId);

    // Build path to project's specs folder for collision detection
    const specsPath = path.join(this.projectRoot, '.specweave/docs/internal/specs');

    // CRITICAL: Use collision detection to avoid FS-XXX vs FS-XXXE conflicts
    // This is scoped to the specific project/board folder
    const safeNumber = findNextAvailableInternalIdSync(
      incrementNumber,
      specsPath,
      resolvedProjectPath,
      { logger: this.logger }
    );

    // Generate feature ID from safe number
    const featureId = `FS-${String(safeNumber).padStart(3, '0')}`;

    // Log if collision was avoided
    if (safeNumber !== incrementNumber) {
      this.logger.warn(
        `   ⚠️ Feature ID collision avoided: FS-${String(incrementNumber).padStart(3, '0')} exists, ` +
        `using ${featureId} instead`
      );
    }

    return featureId;
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
   * Resolve the project path for an increment (SMART BOARD MATCHING - v0.31.0+)
   *
   * For brownfield projects imported from ADO/JIRA, uses intelligent board matching
   * based on increment title, description, and configured keywords.
   *
   * Priority:
   * 1. Explicit **Project**: field in spec.md (always wins)
   * 2. Intelligent board matching using BoardMatcher (ADR-0178)
   *    - High confidence (>80%): auto-assign
   *    - Medium/Low confidence: ask user
   * 3. Existing folder match (hierarchical search)
   * 4. Default project ID (single-project fallback)
   *
   * @param incrementId - Increment ID (e.g., "0002-test-anton-monitor")
   * @returns Project path (may be hierarchical like "org/project")
   */
  private async resolveProjectPath(incrementId: string): Promise<string> {
    // 1. Extract project name from spec.md **Project**: field (explicit - always wins)
    const specProject = await this.extractProjectFromSpec(incrementId);

    if (specProject) {
      // Explicit project specified - use it directly
      const normalizedProject = specProject.toLowerCase().replace(/\s+/g, '-');
      this.logger.log(`   📎 Using explicit project from spec.md: ${normalizedProject}`);

      // Try to find existing hierarchical path
      const specsBase = path.join(this.projectRoot, '.specweave/docs/internal/specs');
      if (existsSync(specsBase)) {
        const foundPath = await this.findBestProjectMatch(specsBase, normalizedProject);
        if (foundPath) {
          this.logger.log(`   🔍 Found existing project path: ${foundPath}`);
          return foundPath;
        }
      }
      return normalizedProject;
    }

    // 2. No explicit project - use intelligent board matching
    const availableBoards = await this.boardMatcher.getAvailableBoards();

    if (availableBoards.length === 0) {
      // No boards configured - use default project detection
      return this.projectId;
    }

    if (availableBoards.length === 1) {
      // Single board - use it directly
      // CRITICAL FIX (v0.30.13): For ADO with 2-level structure, construct {project}/{board}
      const board = availableBoards[0];
      if (board.adoProject) {
        const fullPath = `${board.adoProject}/${board.id}`;
        this.logger.log(`   📁 Single ADO board: ${board.name} → ${fullPath}`);
        return fullPath;
      }
      this.logger.log(`   📁 Single board configured: ${board.name}`);
      return board.id;
    }

    // Multiple boards - run intelligent matching
    const specContent = await this.getIncrementSpecContent(incrementId);
    const matchDecision = await this.boardMatcher.matchIncrement(incrementId, specContent);

    // Check if this is a utility/cross-cutting increment
    if (this.boardMatcher.isUtilityIncrement(specContent)) {
      this.logger.log(`   🔧 Utility increment detected - asking user for board selection`);
      return await this.askUserForBoardSelection(incrementId, matchDecision);
    }

    // Handle match decision
    if (!matchDecision.needsUserInput && matchDecision.bestMatch) {
      // High confidence match - auto-assign
      const match = matchDecision.bestMatch;
      this.logger.log(`   ✅ Auto-matched to board: ${match.boardName} (${match.confidence}% confidence)`);
      if (match.matchedTerms.length > 0) {
        this.logger.log(`      Matched terms: ${match.matchedTerms.slice(0, 5).join(', ')}`);
      }
      // CRITICAL FIX (v0.30.13): For ADO with 2-level structure, construct {project}/{board}
      if (match.adoProject) {
        return `${match.adoProject}/${match.boardId}`;
      }
      return match.boardId;
    }

    // Need user input - show match results and ask
    return await this.askUserForBoardSelection(incrementId, matchDecision);
  }

  /**
   * Get the raw spec.md content for an increment
   */
  private async getIncrementSpecContent(incrementId: string): Promise<string> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );
    try {
      return await fs.readFile(specPath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Ask user to select a board with intelligent match suggestions
   */
  private async askUserForBoardSelection(
    incrementId: string,
    decision: MatchDecision
  ): Promise<string> {
    try {
      const { select, input } = await import('@inquirer/prompts');

      this.logger.log('');
      this.logger.log(`   🤔 Which board/area path should increment ${incrementId} sync to?`);

      if (decision.bestMatch && decision.bestMatch.confidence > 0) {
        this.logger.log(`   💡 Best match: ${decision.bestMatch.boardName} (${decision.bestMatch.confidence}% confidence)`);
        if (decision.reason === 'medium-confidence-needs-confirmation') {
          this.logger.log(`      Reason: ${decision.bestMatch.matchedTerms.slice(0, 3).join(', ')}`);
        }
      }

      // Build choices - put best matches first
      // CRITICAL FIX (v0.30.13): Include adoProject in value for 2-level folder structure
      const choices: Array<{ name: string; value: string }> = [];

      // Add matched boards first (sorted by confidence)
      for (const match of decision.allMatches.slice(0, 5)) {
        // For ADO boards with project, construct full path
        const fullPath = match.adoProject
          ? `${match.adoProject}/${match.boardId}`
          : match.boardId;
        choices.push({
          name: `${match.boardName} (${match.confidence}% match)`,
          value: fullPath
        });
      }

      // Add remaining boards that weren't in matches
      const matchedIds = new Set(decision.allMatches.map(m => m.boardId));
      for (const board of decision.availableBoards) {
        if (!matchedIds.has(board.id)) {
          // For ADO boards with project, construct full path
          const fullPath = board.adoProject
            ? `${board.adoProject}/${board.id}`
            : board.id;
          choices.push({
            name: board.name,
            value: fullPath
          });
        }
      }

      // Add option to create new
      choices.push({
        name: '📁 Create new project folder...',
        value: '__new__'
      });

      const selected = await select({
        message: 'Select board/area path:',
        choices
      });

      if (selected === '__new__') {
        const newProject = await input({
          message: 'Enter new project folder name:',
          validate: (v: string) => /^[a-z0-9-]+$/.test(v) || 'Must be lowercase kebab-case (e.g., my-project)'
        });
        return newProject;
      }

      return selected;
    } catch {
      // inquirer not available or user cancelled
      if (decision.bestMatch && decision.bestMatch.confidence >= 50) {
        // CRITICAL FIX (v0.30.13): Use full path for ADO boards
        const fullPath = decision.bestMatch.adoProject
          ? `${decision.bestMatch.adoProject}/${decision.bestMatch.boardId}`
          : decision.bestMatch.boardId;
        this.logger.log(`   ⚠️  Could not prompt - using best match: ${fullPath}`);
        return fullPath;
      }
      this.logger.log(`   ⚠️  Could not prompt - using default project: ${this.projectId}`);
      return this.projectId;
    }
  }

  /**
   * Detect if multi-project mode is enabled
   * Checks config.json for: umbrella.enabled, multiProject.enabled, or multiple board/area mappings
   */
  private async detectMultiProjectMode(): Promise<{
    isMultiProject: boolean;
    projects: Array<{ id: string; name: string; source: string }>;
    detectionReason: string;
  }> {
    const configPath = path.join(this.projectRoot, '.specweave/config.json');

    if (!existsSync(configPath)) {
      return { isMultiProject: false, projects: [], detectionReason: 'no-config' };
    }

    try {
      const config = await readJson(configPath);
      const projects: Array<{ id: string; name: string; source: string }> = [];

      // Check umbrella.enabled (multi-repo setup)
      if (config.umbrella?.enabled && config.umbrella?.childRepos?.length > 0) {
        for (const repo of config.umbrella.childRepos) {
          if (typeof repo === 'string') {
            projects.push({ id: repo, name: repo, source: 'umbrella' });
          } else if (repo.name) {
            projects.push({ id: repo.name, name: repo.name, source: 'umbrella' });
          }
        }
        if (projects.length > 0) {
          return { isMultiProject: true, projects, detectionReason: 'umbrella' };
        }
      }

      // Check multiProject.enabled
      if (config.multiProject?.enabled && config.multiProject?.projects) {
        const configProjects = config.multiProject.projects;
        for (const [id, project] of Object.entries(configProjects)) {
          const p = project as { name?: string };
          projects.push({ id, name: p.name || id, source: 'multiProject' });
        }
        if (projects.length > 0) {
          return { isMultiProject: true, projects, detectionReason: 'multiProject' };
        }
      }

      // Check ADO area path mapping
      if (config.sync?.profiles) {
        for (const [_profileName, profile] of Object.entries(config.sync.profiles)) {
          const p = profile as { provider?: string; config?: { areaPathMapping?: { mappings?: Array<{ specweaveProject: string }> }; boardMapping?: { boards?: Array<{ specweaveProject: string }> } } };
          if (p.provider === 'ado' && p.config?.areaPathMapping?.mappings?.length) {
            for (const mapping of p.config.areaPathMapping.mappings) {
              if (!projects.find(proj => proj.id === mapping.specweaveProject)) {
                projects.push({
                  id: mapping.specweaveProject,
                  name: mapping.specweaveProject,
                  source: 'ado-area-path'
                });
              }
            }
          }
          // Check JIRA board mapping
          if (p.provider === 'jira' && p.config?.boardMapping?.boards?.length) {
            for (const board of p.config.boardMapping.boards) {
              if (!projects.find(proj => proj.id === board.specweaveProject)) {
                projects.push({
                  id: board.specweaveProject,
                  name: board.specweaveProject,
                  source: 'jira-board'
                });
              }
            }
          }
        }
        if (projects.length > 1) {
          return { isMultiProject: true, projects, detectionReason: 'sync-profiles' };
        }
      }

      // Check existing folders in specs/
      const specsBase = path.join(this.projectRoot, '.specweave/docs/internal/specs');
      if (existsSync(specsBase)) {
        try {
          const entries = await fs.readdir(specsBase, { withFileTypes: true });
          const folders = entries
            .filter(e => e.isDirectory() && !e.name.startsWith('_'))
            .map(e => e.name);
          if (folders.length > 1) {
            for (const folder of folders) {
              if (!projects.find(p => p.id === folder)) {
                projects.push({ id: folder, name: folder, source: 'existing-folder' });
              }
            }
            return { isMultiProject: true, projects, detectionReason: 'multiple-folders' };
          }
        } catch {
          // Ignore read errors
        }
      }

      return { isMultiProject: false, projects, detectionReason: 'single-project' };
    } catch {
      return { isMultiProject: false, projects: [], detectionReason: 'config-error' };
    }
  }

  /**
   * Ask user to select a project when sync is unsure
   */
  private async askUserForProject(
    incrementId: string,
    candidates: Array<{ id: string; name: string; source: string }>
  ): Promise<string> {
    // Try to import inquirer for interactive prompts
    try {
      const { select, input } = await import('@inquirer/prompts');

      const choices = candidates.map(c => ({
        name: `${c.name} (${c.source})`,
        value: c.id
      }));

      choices.push({
        name: 'Create new project folder...',
        value: '__new__'
      });

      this.logger.log('');
      this.logger.log(`   🤔 Which project should increment ${incrementId} sync to?`);

      const selected = await select({
        message: 'Select project:',
        choices
      });

      if (selected === '__new__') {
        const newProject = await input({
          message: 'Enter new project folder name:',
          validate: (v: string) => /^[a-z0-9-]+$/.test(v) || 'Must be lowercase kebab-case (e.g., my-project)'
        });
        return newProject;
      }

      return selected;
    } catch {
      // inquirer not available or user cancelled - use first candidate or default
      this.logger.log(`   ⚠️  Could not prompt for project selection, using first candidate: ${candidates[0]?.id || this.projectId}`);
      return candidates[0]?.id || this.projectId;
    }
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

        // GitHub detection (5 methods in order of preference)
        if (!tools.includes('github')) {
          // Method 1: sync.github section (most common)
          if (config.sync?.github?.enabled && config.sync?.github?.owner && config.sync?.github?.repo) {
            this.logger.log(`   ✅ GitHub sync enabled (config.sync.github, owner: ${config.sync.github.owner})`);
            tools.push('github');
          }
          // Method 2: ANY profile with provider='github' (v0.31.0+ - uses helper function)
          else {
            const githubProfiles = getProfilesByProvider(config.sync, 'github')
              .filter(([_, p]) => {
                const cfg = p.config as { owner?: string; repo?: string } | undefined;
                return cfg?.owner && cfg?.repo;
              });
            if (githubProfiles.length > 0) {
              const profileNames = githubProfiles.map(([name]) => name).join(', ');
              this.logger.log(`   ✅ GitHub sync enabled (${githubProfiles.length} profile(s): ${profileNames})`);
              tools.push('github');
            }
          }
          // Method 3: multiProject.projects[activeProject].externalTools.github
          if (!tools.includes('github') && config.multiProject?.enabled && config.multiProject?.activeProject) {
            const activeProject = config.multiProject.activeProject;
            const projectConfig = config.multiProject.projects?.[activeProject];
            if (projectConfig?.externalTools?.github?.repository) {
              this.logger.log(`   ✅ GitHub sync enabled (multiProject, repo: ${projectConfig.externalTools.github.repository})`);
              tools.push('github');
            }
          }
          // Method 4: Legacy plugins.settings (backward compatibility)
          if (!tools.includes('github') && config.plugins?.settings?.['specweave-github']?.activeProfile) {
            this.logger.log(`   ✅ GitHub sync enabled (legacy plugins.settings)`);
            tools.push('github');
          }
        }

        // Jira detection (v0.31.0+ - uses helper function)
        if (!tools.includes('jira')) {
          if (config.sync?.jira?.enabled) {
            this.logger.log(`   ✅ Jira sync enabled (config.sync.jira)`);
            tools.push('jira');
          } else {
            const jiraProfiles = getProfilesByProvider(config.sync, 'jira');
            if (jiraProfiles.length > 0) {
              const profileNames = jiraProfiles.map(([name]) => name).join(', ');
              this.logger.log(`   ✅ Jira sync enabled (${jiraProfiles.length} profile(s): ${profileNames})`);
              tools.push('jira');
            }
          }
        }

        // ADO detection (v0.31.0+ - uses helper function)
        if (!tools.includes('ado')) {
          if (config.sync?.ado?.enabled) {
            this.logger.log(`   ✅ ADO sync enabled (config.sync.ado)`);
            tools.push('ado');
          } else {
            const adoProfiles = getProfilesByProvider(config.sync, 'ado');
            if (adoProfiles.length > 0) {
              const profileNames = adoProfiles.map(([name]) => name).join(', ');
              this.logger.log(`   ✅ ADO sync enabled (${adoProfiles.length} profile(s): ${profileNames})`);
              tools.push('ado');
            }
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
   * Sync to JIRA Epics
   *
   * Uses JiraSpecSync.syncSpecToJira() which is idempotent:
   * - Uses existing epic if it exists
   * - Updates existing stories
   * - Only creates new stories if they don't exist
   *
   * Configuration priority:
   * 1. config.sync.jira (most common)
   * 2. config.sync.profiles[*] with provider='jira'
   * 3. Environment variables (JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN)
   */
  private async syncToJira(featureId: string, projectPath: string): Promise<void> {
    try {
      this.logger.log(`   🔄 Syncing to JIRA...`);

      // Dynamic import to avoid circular dependencies
      const { JiraSpecSync } = await import('../../../plugins/specweave-jira/lib/jira-spec-sync.js');

      // Load JIRA config from config.json FIRST, then environment
      const configPath = path.join(this.projectRoot, '.specweave/config.json');
      let domain = process.env.JIRA_DOMAIN || '';
      let email = process.env.JIRA_EMAIL || '';
      let apiToken = process.env.JIRA_API_TOKEN || '';
      let projectKey = '';

      if (existsSync(configPath)) {
        try {
          const config = await readJson(configPath);
          // Method 1: Read from config.sync.jira (most common)
          if (config.sync?.jira?.domain) {
            domain = config.sync.jira.domain;
            projectKey = config.sync.jira.projectKey || '';
            this.logger.log(`   📝 Using JIRA config: ${domain}`);
          }
          // Method 2: Check profiles
          else {
            const jiraProfiles = getProfilesByProvider(config.sync, 'jira');
            if (jiraProfiles.length > 0) {
              const [profileName, profile] = jiraProfiles[0];
              const cfg = profile.config as { domain?: string; projectKey?: string };
              domain = cfg?.domain || domain;
              projectKey = cfg?.projectKey || projectKey;
              this.logger.log(`   📝 Using JIRA profile: ${profileName}`);
            }
          }
        } catch (error) {
          this.logger.warn(`   ⚠️  Failed to read config.json for JIRA, using environment variables`);
        }
      }

      // Load secrets from .env if not already set
      if (!apiToken) {
        const envPath = path.join(this.projectRoot, '.env');
        if (existsSync(envPath)) {
          try {
            const envContent = await fs.readFile(envPath, 'utf-8');
            for (const line of envContent.split('\n')) {
              if (line.startsWith('JIRA_API_TOKEN=')) {
                apiToken = line.split('=')[1]?.trim().replace(/^["']|["']$/g, '') || '';
              }
              if (!email && line.startsWith('JIRA_EMAIL=')) {
                email = line.split('=')[1]?.trim().replace(/^["']|["']$/g, '') || '';
              }
            }
          } catch {
            // Ignore .env read errors
          }
        }
      }

      if (!domain || !email || !apiToken) {
        this.logger.warn(`   ⚠️  JIRA credentials not configured`);
        this.logger.warn(`   💡 Set JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN in .env`);
        return;
      }

      // Initialize JIRA sync
      const jiraSync = new JiraSpecSync(
        { domain, email, apiToken, projectKey },
        this.projectRoot
      );

      // Sync feature to JIRA
      const result = await jiraSync.syncSpecToJira(featureId);

      if (result.success) {
        this.logger.log(`   ✅ Synced to JIRA: ${result.externalId || 'updated'}`);
      } else {
        this.logger.warn(`   ⚠️  JIRA sync had issues: ${result.error || 'unknown'}`);
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        this.logger.warn(`   ⚠️  JIRA plugin not installed - skipping JIRA sync`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Sync to Azure DevOps Features
   *
   * Uses AdoSpecSync.syncSpecToAdo() which is idempotent:
   * - Uses existing feature if it exists
   * - Updates existing user stories
   * - Only creates new user stories if they don't exist
   *
   * Configuration priority:
   * 1. config.sync.ado (most common)
   * 2. config.sync.profiles[*] with provider='ado'
   * 3. Environment variables (AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, AZURE_DEVOPS_PAT)
   */
  private async syncToADO(featureId: string, projectPath: string): Promise<void> {
    try {
      this.logger.log(`   🔄 Syncing to Azure DevOps...`);

      // Dynamic import to avoid circular dependencies
      const { AdoSpecSync } = await import('../../../plugins/specweave-ado/lib/ado-spec-sync.js');

      // Load ADO config from config.json FIRST, then environment
      const configPath = path.join(this.projectRoot, '.specweave/config.json');
      let organization = process.env.AZURE_DEVOPS_ORG || '';
      let project = process.env.AZURE_DEVOPS_PROJECT || '';
      let personalAccessToken = '';

      if (existsSync(configPath)) {
        try {
          const config = await readJson(configPath);
          // Method 1: Read from config.sync.ado (most common)
          if (config.sync?.ado?.organization) {
            organization = config.sync.ado.organization;
            project = config.sync.ado.project || project;
            this.logger.log(`   📝 Using ADO config: ${organization}/${project}`);
          }
          // Method 2: Check profiles
          else {
            const adoProfiles = getProfilesByProvider(config.sync, 'ado');
            if (adoProfiles.length > 0) {
              const [profileName, profile] = adoProfiles[0];
              const cfg = profile.config as { organization?: string; project?: string };
              organization = cfg?.organization || organization;
              project = cfg?.project || project;
              this.logger.log(`   📝 Using ADO profile: ${profileName}`);
            }
          }
        } catch (error) {
          this.logger.warn(`   ⚠️  Failed to read config.json for ADO, using environment variables`);
        }
      }

      // Load PAT from .env if not already set
      const envPath = path.join(this.projectRoot, '.env');
      if (existsSync(envPath)) {
        try {
          const envContent = await fs.readFile(envPath, 'utf-8');
          for (const line of envContent.split('\n')) {
            if (line.startsWith('AZURE_DEVOPS_PAT=')) {
              personalAccessToken = line.split('=')[1]?.trim().replace(/^["']|["']$/g, '') || '';
            }
            if (!organization && line.startsWith('AZURE_DEVOPS_ORG=')) {
              organization = line.split('=')[1]?.trim().replace(/^["']|["']$/g, '') || '';
            }
            if (!project && line.startsWith('AZURE_DEVOPS_PROJECT=')) {
              project = line.split('=')[1]?.trim().replace(/^["']|["']$/g, '') || '';
            }
          }
        } catch {
          // Ignore .env read errors
        }
      }

      if (!organization || !project || !personalAccessToken) {
        this.logger.warn(`   ⚠️  ADO credentials not configured`);
        this.logger.warn(`   💡 Set AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, AZURE_DEVOPS_PAT in .env`);
        return;
      }

      // Initialize ADO sync
      const adoSync = new AdoSpecSync(
        { organization, project, personalAccessToken },
        this.projectRoot
      );

      // Sync feature to ADO
      const result = await adoSync.syncSpecToAdo(featureId);

      if (result.success) {
        this.logger.log(`   ✅ Synced to ADO: ${result.externalId || 'updated'}`);
      } else {
        this.logger.warn(`   ⚠️  ADO sync had issues: ${result.error || 'unknown'}`);
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        this.logger.warn(`   ⚠️  ADO plugin not installed - skipping ADO sync`);
      } else {
        throw error;
      }
    }
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
