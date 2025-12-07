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
// NOTE: findNextAvailableInternalIdSync no longer used - collision detection moved inline
// to fix chain shift bug (2025-12-04). See getFeatureIdForIncrement() for details.
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
   * Get feature ID for increment with EXTERNAL-ONLY collision detection
   *
   * SIMPLIFIED (v0.29.0): Feature ID is derived from increment number
   * No longer reads from metadata.json - derivation is the single source of truth
   *
   * CRITICAL FIX (2025-12-04): Collision detection was causing chain shifts!
   *
   * BUG: Old code checked for BOTH FS-XXX and FS-XXXE collisions.
   * This caused: increment 0103 sync → FS-103 exists → use FS-104 (WRONG!)
   * Result: FS-104 would contain 0103 content, FS-105 would contain 0104, etc.
   *
   * FIX: Internal features (FS-XXX) are DETERMINISTIC:
   * - Increment 0104 → ALWAYS FS-104 (derived, no collision check for internal)
   * - Only check for EXTERNAL collisions (FS-XXXE)
   * - If FS-XXXE exists → then use next available internal ID
   * - If FS-XXX already exists → REUSE (same increment re-syncing)
   *
   * @param incrementId - Increment ID (e.g., "0081-ado-repo-cloning")
   * @param resolvedProjectPath - Resolved project path (e.g., "acme/backend" or "my-project")
   * @returns Feature ID (e.g., "FS-081", or "FS-082" if FS-081E exists)
   * @see deriveFeatureId() in src/utils/feature-id-derivation.ts
   */
  private async getFeatureIdForIncrement(
    incrementId: string,
    resolvedProjectPath: string
  ): Promise<string> {
    // Extract increment number (e.g., "0081-name" → 81)
    const incrementNumber = extractIncrementNumber(incrementId);

    // Derive feature ID directly from increment number (DETERMINISTIC)
    const derivedFeatureId = `FS-${String(incrementNumber).padStart(3, '0')}`;

    // Build path to project's specs folder
    const specsPath = path.join(this.projectRoot, '.specweave/docs/internal/specs');
    const projectSpecsPath = path.join(specsPath, resolvedProjectPath);

    // Check if EXTERNAL feature (FS-XXXE) exists with same number
    const externalId = `${derivedFeatureId}E`;
    const externalPath = path.join(projectSpecsPath, externalId);
    const externalExists = existsSync(externalPath);

    // Check if INTERNAL feature (FS-XXX) already exists
    const internalPath = path.join(projectSpecsPath, derivedFeatureId);
    const internalExists = existsSync(internalPath);

    // CASE 1: External exists (FS-XXXE) - need collision avoidance
    if (externalExists) {
      // Find next available ID that doesn't collide with any FS-XXX or FS-XXXE
      // This is the ONLY case where we increment
      const safeNumber = this.findNextAvailableIdForExternal(
        incrementNumber,
        projectSpecsPath
      );
      const safeFeatureId = `FS-${String(safeNumber).padStart(3, '0')}`;

      this.logger.warn(
        `   ⚠️ External collision avoided: ${externalId} exists, ` +
        `using ${safeFeatureId} for increment ${incrementId}`
      );
      return safeFeatureId;
    }

    // CASE 2: Internal exists (FS-XXX) - this is a RE-SYNC, reuse the folder
    if (internalExists) {
      this.logger.log(`   ♻️  Reusing existing feature folder: ${derivedFeatureId}`);
      return derivedFeatureId;
    }

    // CASE 3: Neither exists - use derived ID (normal case)
    return derivedFeatureId;
  }

  /**
   * Find next available internal ID when external collision exists
   *
   * This is called ONLY when FS-XXXE (external) exists and we need to
   * find a non-colliding internal ID.
   *
   * @param baseNumber - Starting number (from increment ID)
   * @param projectSpecsPath - Path to project's specs folder
   * @returns Next available number that doesn't conflict
   */
  private findNextAvailableIdForExternal(
    baseNumber: number,
    projectSpecsPath: string
  ): number {
    const maxIterations = 1000;
    let currentNumber = baseNumber;

    for (let i = 0; i < maxIterations; i++) {
      const internalId = `FS-${currentNumber.toString().padStart(3, '0')}`;
      const externalId = `${internalId}E`;

      const internalPath = path.join(projectSpecsPath, internalId);
      const externalPath = path.join(projectSpecsPath, externalId);

      // Only check external collisions - internal folders are allowed to exist
      // (they would be re-syncs of the same increment)
      const externalExists = existsSync(externalPath);

      if (!externalExists) {
        return currentNumber;
      }

      currentNumber++;
    }

    throw new Error(
      `Unable to find available feature ID after ${maxIterations} iterations. ` +
      `This indicates too many external features.`
    );
  }

  /**
   * Extract project and board from increment spec.md YAML frontmatter
   *
   * Priority:
   * 1. YAML frontmatter `project:` field (v0.31.0+ - preferred)
   * 2. Legacy **Project**: field in body (backward compatibility)
   *
   * For 2-level structures, also extracts `board:` field.
   *
   * SECURITY: Validates both incrementId and extracted names to prevent path traversal
   *
   * @param incrementId - Increment ID (e.g., "0002-test-anton-monitor")
   * @returns Object with project and board (null if not specified or invalid)
   */
  private async extractProjectBoardFromSpec(incrementId: string): Promise<{
    project: string | null;
    board: string | null;
  }> {
    // SECURITY FIX (2025-12-02): Validate incrementId format FIRST
    if (!incrementId || !/^\d{4}-[a-z0-9-]+$/i.test(incrementId)) {
      this.logger.warn(`   ⚠️  Invalid increment ID format: ${incrementId}`);
      return { project: null, board: null };
    }

    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    if (!existsSync(specPath)) {
      return { project: null, board: null };
    }

    try {
      const content = await fs.readFile(specPath, 'utf-8');
      let project: string | null = null;
      let board: string | null = null;

      // 1. Try YAML frontmatter first (preferred - v0.31.0+)
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];

        // Extract project from YAML
        const yamlProjectMatch = frontmatter.match(/^project:\s*["']?([^"'\n]+)["']?$/m);
        if (yamlProjectMatch && yamlProjectMatch[1]) {
          project = this.validateAndNormalizeName(yamlProjectMatch[1].trim(), 'project');
        }

        // Extract board from YAML
        const yamlBoardMatch = frontmatter.match(/^board:\s*["']?([^"'\n]+)["']?$/m);
        if (yamlBoardMatch && yamlBoardMatch[1]) {
          board = this.validateAndNormalizeName(yamlBoardMatch[1].trim(), 'board');
        }
      }

      // 2. Fallback to legacy **Project**: field in body
      if (!project) {
        const bodyProjectMatch = content.match(/\*\*Project\*\*:\s*(.+?)(?:\n|$)/i);
        if (bodyProjectMatch && bodyProjectMatch[1]) {
          const rawName = bodyProjectMatch[1]
            .trim()
            .replace(/\*\*/g, '')
            .replace(/__/g, '')
            .replace(/`/g, '');
          project = this.validateAndNormalizeName(rawName, 'project');
          if (project) {
            this.logger.log(`   ℹ️  Using legacy **Project**: field - consider migrating to YAML frontmatter`);
          }
        }
      }

      return { project, board };
    } catch {
      return { project: null, board: null };
    }
  }

  /**
   * Validate and normalize a project/board name
   *
   * SECURITY: Prevents path traversal and validates format
   */
  private validateAndNormalizeName(rawName: string, fieldType: 'project' | 'board'): string | null {
    if (!rawName) return null;

    const normalized = rawName.toLowerCase().replace(/\s+/g, '-');

    // Minimum length check
    if (normalized.length < 2) {
      this.logger.warn(`   ⚠️  ${fieldType} name too short: ${normalized}`);
      return null;
    }

    // Block path traversal attempts
    if (normalized.includes('..') ||
        normalized.includes('/') ||
        normalized.includes('\\') ||
        normalized.includes('\0')) {
      this.logger.warn(`   ⚠️  Invalid ${fieldType} name (potential path traversal): ${normalized}`);
      return null;
    }

    // Validate characters
    if (!/^[a-z0-9_-]+$/.test(normalized)) {
      this.logger.warn(`   ⚠️  Invalid ${fieldType} name (invalid characters): ${normalized}`);
      return null;
    }

    return normalized;
  }

  /**
   * Extract project name from increment spec.md (legacy method - delegates to new method)
   */
  private async extractProjectFromSpec(incrementId: string): Promise<string | null> {
    const { project } = await this.extractProjectBoardFromSpec(incrementId);
    return project;
  }

  /**
   * Resolve the project path for an increment (v0.31.0+ - SPEC.MD FRONTMATTER REQUIRED)
   *
   * For new increments (v0.31.0+), spec.md MUST have `project:` field in YAML frontmatter.
   * For 2-level structures, spec.md MUST have BOTH `project:` and `board:` fields.
   *
   * Priority:
   * 1. YAML frontmatter `project:` and `board:` fields (REQUIRED for v0.31.0+)
   * 2. Legacy **Project**: field in body (backward compatibility only)
   * 3. Fallback: intelligent board matching (deprecated - will warn)
   *
   * @param incrementId - Increment ID (e.g., "0002-test-anton-monitor")
   * @returns Project path (e.g., "my-project" or "acme-corp/digital-ops")
   * @throws Error if required fields are missing in spec.md
   */
  private async resolveProjectPath(incrementId: string): Promise<string> {
    // Import structure level detector
    const { detectStructureLevel } = await import('../../utils/structure-level-detector.js');
    const structureConfig = detectStructureLevel(this.projectRoot);

    // 1. Extract project and board from spec.md
    const { project, board } = await this.extractProjectBoardFromSpec(incrementId);

    // 2. For 2-level structures, REQUIRE both project AND board
    if (structureConfig.level === 2) {
      if (!project) {
        this.logger.error(`❌ Missing 'project:' field in spec.md YAML frontmatter`);
        this.logger.error(`   This is a 2-level structure - spec.md MUST have both 'project:' and 'board:' fields.`);
        this.logger.error(`   Detection reason: ${structureConfig.detectionReason}`);
        this.logger.error(`   Available projects: ${structureConfig.projects.map(p => p.id).join(', ')}`);
        throw new Error(
          `spec.md missing required 'project:' field. ` +
          `This is a 2-level structure (${structureConfig.detectionReason}). ` +
          `Add 'project: <project_name>' to YAML frontmatter.`
        );
      }

      if (!board) {
        const boardOptions = structureConfig.boardsByProject?.[project]
          ? structureConfig.boardsByProject[project].map(b => b.id).join(', ')
          : 'N/A';

        this.logger.error(`❌ Missing 'board:' field in spec.md YAML frontmatter`);
        this.logger.error(`   This is a 2-level structure - spec.md MUST have both 'project:' and 'board:' fields.`);
        this.logger.error(`   Detection reason: ${structureConfig.detectionReason}`);
        this.logger.error(`   Project: ${project}`);
        this.logger.error(`   Available boards: ${boardOptions}`);
        throw new Error(
          `spec.md missing required 'board:' field. ` +
          `This is a 2-level structure (${structureConfig.detectionReason}). ` +
          `Add 'board: <board_name>' to YAML frontmatter. ` +
          `Available boards for ${project}: ${boardOptions}`
        );
      }

      // Construct 2-level path: {project}/{board}
      const fullPath = `${project}/${board}`;
      this.logger.log(`   📁 2-level path from spec.md: ${fullPath}`);
      return fullPath;
    }

    // 3. For 1-level structures, project is REQUIRED (but not board)
    if (project) {
      this.logger.log(`   📎 Using project from spec.md: ${project}`);

      // Try to find existing hierarchical path (for backward compatibility)
      const specsBase = path.join(this.projectRoot, '.specweave/docs/internal/specs');
      if (existsSync(specsBase)) {
        const foundPath = await this.findBestProjectMatch(specsBase, project);
        if (foundPath) {
          this.logger.log(`   🔍 Found existing project path: ${foundPath}`);
          return foundPath;
        }
      }
      return project;
    }

    // 4. No project in spec.md - WARN and fallback to auto-detection (deprecated behavior)
    this.logger.warn(`   ⚠️  No 'project:' field in spec.md YAML frontmatter`);
    this.logger.warn(`   💡 Add 'project: <project_name>' to spec.md frontmatter for explicit sync target`);
    this.logger.warn(`   ⚠️  Using auto-detection (deprecated - will be required in future versions)`);

    // Fallback: intelligent board matching (deprecated)
    const availableBoards = await this.boardMatcher.getAvailableBoards();

    if (availableBoards.length === 0) {
      return this.projectId;
    }

    if (availableBoards.length === 1) {
      const singleBoard = availableBoards[0];
      if (singleBoard.adoProject) {
        const fullPath = `${singleBoard.adoProject}/${singleBoard.id}`;
        this.logger.log(`   📁 Single ADO board (auto-detected): ${singleBoard.name} → ${fullPath}`);
        return fullPath;
      }
      this.logger.log(`   📁 Single board (auto-detected): ${singleBoard.name}`);
      return singleBoard.id;
    }

    // Multiple boards - run intelligent matching
    const specContent = await this.getIncrementSpecContent(incrementId);
    const matchDecision = await this.boardMatcher.matchIncrement(incrementId, specContent);

    if (this.boardMatcher.isUtilityIncrement(specContent)) {
      this.logger.log(`   🔧 Utility increment detected - asking user for board selection`);
      return await this.askUserForBoardSelection(incrementId, matchDecision);
    }

    if (!matchDecision.needsUserInput && matchDecision.bestMatch) {
      const match = matchDecision.bestMatch;
      this.logger.log(`   ✅ Auto-matched to board: ${match.boardName} (${match.confidence}% confidence)`);
      if (match.matchedTerms.length > 0) {
        this.logger.log(`      Matched terms: ${match.matchedTerms.slice(0, 5).join(', ')}`);
      }
      if (match.adoProject) {
        return `${match.adoProject}/${match.boardId}`;
      }
      return match.boardId;
    }

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
      // Handle both regular (0111-name) and external (0111E-name) increment IDs
      title = incrementId.replace(/^\d+E?-/, '').split('-').map(w =>
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
   *
   * v0.32.2+ (AC-US3-01 to AC-US3-05): Permission checks before syncing
   * - canUpsertInternalItems: Required for creating issues from SpecWeave increments
   * - canUpdateExternalItems: Required for updating externally-imported items
   * - canUpdateStatus: Required for updating issue status (open/closed)
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

      // 2. Load sync settings and check permissions (v0.32.2+ AC-US3-01 to AC-US3-05)
      const configPath = path.join(this.projectRoot, '.specweave/config.json');
      let syncSettings = {
        canUpsertInternalItems: false,
        canUpdateExternalItems: false,
        canUpdateStatus: false,
      };

      if (existsSync(configPath)) {
        try {
          const config = await readJson(configPath);
          syncSettings = {
            canUpsertInternalItems: config.sync?.settings?.canUpsertInternalItems ?? false,
            canUpdateExternalItems: config.sync?.settings?.canUpdateExternalItems ?? false,
            canUpdateStatus: config.sync?.settings?.canUpdateStatus ?? false,
          };
        } catch (error) {
          this.logger.warn('   ⚠️  Failed to load sync settings, using defaults (disabled)');
        }
      }

      // 3. AC-US3-01: Check canUpsertInternalItems permission for creating issues
      if (!syncSettings.canUpsertInternalItems) {
        this.logger.log('   ⚠️  Skipping external sync - canUpsertInternalItems is disabled in config');
        this.logger.log('   💡 Enable in .specweave/config.json: sync.settings.canUpsertInternalItems: true');
        return;
      }

      this.logger.log(`\n📡 Syncing to external tools: ${externalTools.join(', ')}`);
      this.logger.log(
        `   📋 Permissions: upsert=${syncSettings.canUpsertInternalItems}, ` +
          `update=${syncSettings.canUpdateExternalItems}, status=${syncSettings.canUpdateStatus}`
      );

      // 4. Sync to each configured external tool (passing permissions for granular control)
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
