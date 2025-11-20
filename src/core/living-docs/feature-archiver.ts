/**
 * Feature & Epic Archiver - Smart archiving system for features and epics
 *
 * Works in tandem with IncrementArchiver to maintain consistency between
 * increments, features, and epics. When an increment is archived, its
 * associated feature is automatically archived if all increments for
 * that feature are archived.
 */

import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { IncrementArchiver } from '../increment/increment-archiver.js';
import { HierarchyMapper } from './hierarchy-mapper.js';
import { FeatureIDManager } from './feature-id-manager.js';

interface ArchiveOperation {
  type: 'feature' | 'epic';
  id: string;
  sourcePath: string;
  targetPath: string;
  reason: string;
  linkedIncrements?: string[];
}

interface LinkUpdate {
  file: string;
  oldLink: string;
  newLink: string;
  lineNumber: number;
}

export interface FeatureArchiveOptions {
  dryRun?: boolean;
  updateLinks?: boolean;
  preserveActiveFeatures?: boolean;
  archiveOrphanedFeatures?: boolean; // Features with no active increments
  archiveOrphanedEpics?: boolean;    // Epics with no active features
  forceArchiveWhenAllIncrementsArchived?: boolean; // Override preserveActiveFeatures when all increments archived
  customReason?: string;             // Custom reason for archiving (AC-US13-07)
}

export interface FeatureArchiveResult {
  archivedFeatures: string[];
  archivedEpics: string[];
  updatedLinks: LinkUpdate[];
  errors: string[];
}

export class FeatureArchiver {
  private rootDir: string;
  private specsDir: string;
  private featuresDir: string;
  private epicsDir: string;
  private incrementArchiver: IncrementArchiver;
  private hierarchyMapper: HierarchyMapper;
  private featureIdManager: FeatureIDManager;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.specsDir = path.join(rootDir, '.specweave', 'docs', 'internal', 'specs');
    this.featuresDir = path.join(this.specsDir, '_features');
    this.epicsDir = path.join(this.specsDir, '_epics');
    this.incrementArchiver = new IncrementArchiver(rootDir);
    this.hierarchyMapper = new HierarchyMapper(rootDir);
    this.featureIdManager = new FeatureIDManager(rootDir);
  }

  /**
   * Archive features and epics based on increment archive status
   */
  async archiveFeatures(options: FeatureArchiveOptions = {}): Promise<FeatureArchiveResult> {
    const result: FeatureArchiveResult = {
      archivedFeatures: [],
      archivedEpics: [],
      updatedLinks: [],
      errors: []
    };

    try {
      // Ensure archive directories exist
      if (!options.dryRun) {
        await this.ensureArchiveDirectories();
      }

      // Get all archived increments
      const archivedIncrements = await this.incrementArchiver.listArchived();
      console.log(`📋 Checking ${archivedIncrements.length} archived increments for feature reorganization...`);

      // Get all active features
      const allFeatures = await this.getAllFeatures();
      console.log(`📂 Scanning ${allFeatures.length} active features...`);

      // Process features
      const featuresToArchive = await this.identifyFeaturesToArchive(archivedIncrements, options);
      console.log(`📦 Identified ${featuresToArchive.length} features to archive`);

      for (const operation of featuresToArchive) {
        await this.executeArchiveOperation(operation, result, options);
      }

      // Process epics (separate logic, not tied to features)
      const epicsToArchive = await this.identifyEpicsToArchive(options);
      if (epicsToArchive.length > 0) {
        console.log(`📦 Identified ${epicsToArchive.length} epics to archive`);
        for (const operation of epicsToArchive) {
          await this.executeArchiveOperation(operation, result, options);
        }
      }

      // Update all links if requested
      if (options.updateLinks && !options.dryRun) {
        await this.updateAllLinks(result);
      }

    } catch (error) {
      result.errors.push(`Archive operation failed: ${error}`);
      console.error('❌ Archive operation failed:', error);
    }

    return result;
  }

  /**
   * Identify features that should be archived
   */
  private async identifyFeaturesToArchive(
    archivedIncrements: string[],
    options: FeatureArchiveOptions
  ): Promise<ArchiveOperation[]> {
    const operations: ArchiveOperation[] = [];
    const features = await this.getAllFeatures();

    for (const featureId of features) {
      const featurePath = path.join(this.featuresDir, featureId);
      const archivePath = path.join(this.featuresDir, '_archive', featureId);

      // Skip if already archived AND source doesn't exist (no duplicate)
      // Allow operation to proceed if both source and target exist (duplicate cleanup)
      const sourceExists = await fs.pathExists(featurePath);
      const targetExists = await fs.pathExists(archivePath);

      if (targetExists && !sourceExists) {
        // Already archived, no duplicate - skip
        continue;
      }

      // Get all increments linked to this feature
      const linkedIncrements = await this.getLinkedIncrements(featureId);

      // CRITICAL: Prevent vacuous truth bug!
      // Empty array .every() returns true, so we must explicitly check length
      // Archive orphaned features ONLY if option is set
      const isOrphaned = linkedIncrements.length === 0 && options.archiveOrphanedFeatures;

      // Check if all linked increments are archived (EXACT MATCH, not partial)
      // CRITICAL: Use exact match (===) not .includes() to avoid false positives
      // SAFETY: If no linked increments and archiveOrphanedFeatures is false, skip
      const allIncrementsArchived = linkedIncrements.length > 0 &&
                                    linkedIncrements.every(inc =>
                                      archivedIncrements.some(archived => archived === inc)
                                    );

      if (allIncrementsArchived || isOrphaned) {
        // Check if feature is still active in any project
        // UNLESS forceArchiveWhenAllIncrementsArchived is true and all increments are archived
        const shouldCheckActiveProjects =
          options.preserveActiveFeatures &&
          !(options.forceArchiveWhenAllIncrementsArchived && allIncrementsArchived);

        if (shouldCheckActiveProjects) {
          const hasActiveProjects = await this.hasActiveProjects(featureId);
          if (hasActiveProjects) {
            console.log(`⏭️  Skipping ${featureId}: has active user stories (${linkedIncrements.length} increments)`);
            continue;
          }
        }

        // Log reason for archiving (use customReason if provided, AC-US13-07)
        const defaultReason = isOrphaned ? 'orphaned' : 'all-increments-archived';
        const reason = options.customReason || defaultReason;
        const override = options.forceArchiveWhenAllIncrementsArchived && allIncrementsArchived ? ' [FORCE]' : '';
        console.log(`✓ ${featureId}: ${reason} (${linkedIncrements.length} increments)${override}`);

        operations.push({
          type: 'feature',
          id: featureId,
          sourcePath: featurePath,
          targetPath: archivePath,
          reason: reason,
          linkedIncrements
        });
      } else if (linkedIncrements.length > 0) {
        // Feature has some active increments (EXACT MATCH, not partial)
        const activeIncrements = linkedIncrements.filter(inc =>
          !archivedIncrements.some(archived => archived === inc)
        );
        console.log(`⏭️  Skipping ${featureId}: ${activeIncrements.length}/${linkedIncrements.length} increments still active`);
      } else if (linkedIncrements.length === 0 && !options.archiveOrphanedFeatures) {
        // Feature has NO linked increments AND archiveOrphanedFeatures is false
        // SAFETY: Don't archive due to vacuous truth bug (empty array .every() = true)
        console.log(`⏭️  Skipping ${featureId}: no linked increments found (orphan check disabled)`);
      }
    }

    return operations;
  }

  /**
   * Identify epics that should be archived
   */
  private async identifyEpicsToArchive(
    options: FeatureArchiveOptions
  ): Promise<ArchiveOperation[]> {
    const operations: ArchiveOperation[] = [];

    // Ensure epics directory exists
    if (!await fs.pathExists(this.epicsDir)) {
      return operations;
    }

    const epics = await this.getAllEpics();

    for (const epicId of epics) {
      const epicPath = path.join(this.epicsDir, epicId);
      const archivePath = path.join(this.epicsDir, '_archive', epicId);

      // Skip if already archived
      if (await fs.pathExists(archivePath)) {
        continue;
      }

      // Get all features linked to this epic
      const linkedFeatures = await this.getLinkedFeatures(epicId);

      // Check if all linked features are archived
      const allFeaturesArchived = await this.areAllFeaturesArchived(linkedFeatures);

      // Archive orphaned epics if option is set
      const isOrphaned = linkedFeatures.length === 0 && options.archiveOrphanedEpics;

      if (allFeaturesArchived || isOrphaned) {
        const defaultReason = isOrphaned ? 'orphaned' : 'all-features-archived';
        const reason = options.customReason || defaultReason;

        operations.push({
          type: 'epic',
          id: epicId,
          sourcePath: epicPath,
          targetPath: archivePath,
          reason: reason
        });
      }
    }

    return operations;
  }

  /**
   * Execute an archive operation
   */
  private async executeArchiveOperation(
    operation: ArchiveOperation,
    result: FeatureArchiveResult,
    options: FeatureArchiveOptions
  ): Promise<void> {
    try {
      if (options.dryRun) {
        console.log(`[DRY RUN] Would archive ${operation.type}: ${operation.id}`);
        console.log(`  Source: ${operation.sourcePath}`);
        console.log(`  Target: ${operation.targetPath}`);
        console.log(`  Reason: ${operation.reason}`);

        if (operation.type === 'feature') {
          result.archivedFeatures.push(operation.id);
        } else {
          result.archivedEpics.push(operation.id);
        }
      } else {
        // ================================================================
        // PRE-FLIGHT CHECKS (Critical for preventing duplicates)
        // ================================================================

        // Check 1: Source must exist
        const sourceExists = await fs.pathExists(operation.sourcePath);
        if (!sourceExists) {
          console.log(`⏭️  Skip ${operation.type} ${operation.id}: source already removed`);
          return; // Source was already moved/deleted - skip silently
        }

        // Check 2: If target exists, remove source WITHOUT moving
        // This handles the case where target was archived in previous run
        // but source was restored by git or living docs sync
        const targetExists = await fs.pathExists(operation.targetPath);
        if (targetExists) {
          console.log(`⚠️  Target exists for ${operation.type} ${operation.id}`);
          console.log(`   Removing duplicate source: ${operation.sourcePath}`);
          await fs.remove(operation.sourcePath);

          // Archive project-specific folders if applicable
          if (operation.type === 'feature') {
            await this.archiveProjectSpecificFolders(operation.id);
            result.archivedFeatures.push(operation.id);
          } else {
            result.archivedEpics.push(operation.id);
          }

          console.log(`✅ Cleaned duplicate ${operation.type}: ${operation.id} (target already in archive)`);
          return;
        }

        // ================================================================
        // NORMAL ARCHIVING: Move source to archive
        // ================================================================
        await fs.ensureDir(path.dirname(operation.targetPath));
        await fs.move(operation.sourcePath, operation.targetPath, { overwrite: false });

        // Write archive metadata (AC-US13-06, AC-US13-07)
        await this.writeArchiveMetadata(operation);

        // Also archive project-specific folders
        if (operation.type === 'feature') {
          await this.archiveProjectSpecificFolders(operation.id);
          result.archivedFeatures.push(operation.id);
        } else {
          result.archivedEpics.push(operation.id);
        }

        console.log(`✅ Archived ${operation.type}: ${operation.id} (${operation.reason})`);
      }
    } catch (error) {
      result.errors.push(`Failed to archive ${operation.type} ${operation.id}: ${error}`);
      console.error(`❌ Failed to archive ${operation.type} ${operation.id}:`, error);
    }
  }

  /**
   * Archive project-specific folders for a feature
   */
  private async archiveProjectSpecificFolders(featureId: string): Promise<void> {
    // Get all project folders
    const projectPattern = path.join(this.specsDir, '*', featureId);
    const projectFolders = await glob(projectPattern, {
      ignore: ['**/node_modules/**', '**/_features/**', '**/_epics/**', '**/_archive/**']
    });

    for (const folder of projectFolders) {
      const projectId = path.basename(path.dirname(folder));
      const archivePath = path.join(this.specsDir, projectId, '_archive', featureId);

      // Handle duplicates: if target exists, remove source instead of moving
      const targetExists = await fs.pathExists(archivePath);
      if (targetExists) {
        console.log(`  ⚠️  Target exists for ${projectId}/${featureId}, removing duplicate`);
        await fs.remove(folder);
        console.log(`  ✅ Cleaned duplicate ${projectId}/${featureId}`);
      } else {
        // Normal archiving: move to archive
        await fs.ensureDir(path.dirname(archivePath));
        await fs.move(folder, archivePath, { overwrite: false });
        console.log(`  ✅ Archived ${projectId}/${featureId}`);
      }
    }
  }

  /**
   * Update all links to archived items
   */
  private async updateAllLinks(result: FeatureArchiveResult): Promise<void> {
    console.log('🔄 Updating links to archived items...');

    // Find all markdown files in the repository
    const pattern = path.join(this.rootDir, '**/*.md');
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    for (const file of files) {
      const updates = await this.updateLinksInFile(
        file,
        result.archivedFeatures,
        result.archivedEpics
      );

      if (updates.length > 0) {
        result.updatedLinks.push(...updates);
      }
    }

    console.log(`✅ Updated ${result.updatedLinks.length} links in ${new Set(result.updatedLinks.map(u => u.file)).size} files`);
  }

  /**
   * Update links in a single file
   */
  private async updateLinksInFile(
    filePath: string,
    archivedFeatures: string[],
    archivedEpics: string[]
  ): Promise<LinkUpdate[]> {
    const updates: LinkUpdate[] = [];
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for feature links
      for (const featureId of archivedFeatures) {
        const patterns = [
          new RegExp(`(\\[.*?\\]\\()([^)]*\/_features\/${featureId}\/[^)]*)\\)`, 'g'),
          new RegExp(`(\\[.*?\\]\\()([^)]*\/specs\/[^/]+\/${featureId}\/[^)]*)\\)`, 'g')
        ];

        for (const pattern of patterns) {
          const matches = [...line.matchAll(pattern)];
          for (const match of matches) {
            const oldPath = match[2];
            const newPath = oldPath.replace(
              new RegExp(`(\/_features|\/specs\/[^/]+)\/${featureId}\/`),
              `$1/_archive/${featureId}/`
            );

            lines[i] = lines[i].replace(oldPath, newPath);
            modified = true;

            updates.push({
              file: filePath,
              oldLink: oldPath,
              newLink: newPath,
              lineNumber: i + 1
            });
          }
        }
      }

      // Check for epic links
      for (const epicId of archivedEpics) {
        const pattern = new RegExp(`(\\[.*?\\]\\()([^)]*\/_epics\/${epicId}\/[^)]*)\\)`, 'g');
        const matches = [...line.matchAll(pattern)];

        for (const match of matches) {
          const oldPath = match[2];
          const newPath = oldPath.replace(`/_epics/${epicId}/`, `/_epics/_archive/${epicId}/`);

          lines[i] = lines[i].replace(oldPath, newPath);
          modified = true;

          updates.push({
            file: filePath,
            oldLink: oldPath,
            newLink: newPath,
            lineNumber: i + 1
          });
        }
      }
    }

    // Save the file if modified
    if (modified) {
      await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    }

    return updates;
  }

  /**
   * Get all features
   */
  private async getAllFeatures(): Promise<string[]> {
    if (!await fs.pathExists(this.featuresDir)) {
      return [];
    }

    const pattern = path.join(this.featuresDir, 'FS-*');
    const folders = await glob(pattern);

    const features = [];
    for (const folder of folders) {
      const stats = await fs.stat(folder);
      if (stats.isDirectory() && !folder.includes('_archive')) {
        features.push(path.basename(folder));
      }
    }

    return features;
  }

  /**
   * Get all epics
   */
  private async getAllEpics(): Promise<string[]> {
    if (!await fs.pathExists(this.epicsDir)) {
      return [];
    }

    const pattern = path.join(this.epicsDir, 'EPIC-*');
    const folders = await glob(pattern);

    const epics = [];
    for (const folder of folders) {
      const stats = await fs.stat(folder);
      if (stats.isDirectory() && !folder.includes('_archive')) {
        epics.push(path.basename(folder));
      }
    }

    return epics;
  }

  /**
   * Get increments linked to a feature
   * CRITICAL: Parses frontmatter feature_id OR epic field for exact match (not string search)
   * Supports both new format (feature_id: FS-XXX) and legacy format (epic: FS-XXX)
   */
  private async getLinkedIncrements(featureId: string): Promise<string[]> {
    const increments: string[] = [];

    // Check active increments
    const activePattern = path.join(this.rootDir, '.specweave', 'increments', '[0-9]*-*', 'spec.md');
    const activeFiles = await glob(activePattern);

    for (const file of activeFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Parse frontmatter to get feature_id OR epic (EXACT MATCH, not string search)
      // Support both new format (feature_id: FS-XXX) and legacy format (epic: FS-XXX)
      const featureIdMatch = content.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m);
      const epicMatch = content.match(/^epic:\s*["']?([^"'\n]+)["']?$/m);

      const linkedFeature = featureIdMatch ? featureIdMatch[1].trim() :
                           epicMatch ? epicMatch[1].trim() : null;

      if (linkedFeature === featureId) {
        const incrementDir = path.basename(path.dirname(file));
        increments.push(incrementDir);
      }
    }

    // Check archived increments
    const archivedPattern = path.join(this.rootDir, '.specweave', 'increments', '_archive', '[0-9]*-*', 'spec.md');
    const archivedFiles = await glob(archivedPattern);

    for (const file of archivedFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // Parse frontmatter to get feature_id OR epic (EXACT MATCH, not string search)
      const featureIdMatch = content.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m);
      const epicMatch = content.match(/^epic:\s*["']?([^"'\n]+)["']?$/m);

      const linkedFeature = featureIdMatch ? featureIdMatch[1].trim() :
                           epicMatch ? epicMatch[1].trim() : null;

      if (linkedFeature === featureId) {
        const incrementDir = path.basename(path.dirname(file));
        increments.push(incrementDir);
      }
    }

    return increments;
  }

  /**
   * Get features linked to an epic
   */
  private async getLinkedFeatures(epicId: string): Promise<string[]> {
    const features: string[] = [];
    const allFeatures = await this.getAllFeatures();

    for (const featureId of allFeatures) {
      const featurePath = path.join(this.featuresDir, featureId, 'FEATURE.md');
      if (await fs.pathExists(featurePath)) {
        const content = await fs.readFile(featurePath, 'utf-8');

        // Check if feature references the epic
        if (content.includes(epicId)) {
          features.push(featureId);
        }
      }
    }

    // Also check archived features
    const archivedPattern = path.join(this.featuresDir, '_archive', 'FS-*', 'FEATURE.md');
    const archivedFiles = await glob(archivedPattern);

    for (const file of archivedFiles) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes(epicId)) {
        const featureId = path.basename(path.dirname(file));
        features.push(featureId);
      }
    }

    return features;
  }

  /**
   * Check if all features are archived
   */
  private async areAllFeaturesArchived(featureIds: string[]): Promise<boolean> {
    if (featureIds.length === 0) {
      return false;
    }

    for (const featureId of featureIds) {
      const archivePath = path.join(this.featuresDir, '_archive', featureId);
      const activePath = path.join(this.featuresDir, featureId);

      // If feature exists in active location, it's not archived
      if (await fs.pathExists(activePath) && !await fs.pathExists(archivePath)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if feature has active projects
   */
  private async hasActiveProjects(featureId: string): Promise<boolean> {
    // Check all project folders for this feature
    const projectPattern = path.join(this.specsDir, '*', featureId);
    const projectFolders = await glob(projectPattern, {
      ignore: ['**/node_modules/**', '**/_features/**', '**/_epics/**', '**/_archive/**']
    });

    for (const folder of projectFolders) {
      // Check if any user stories have active status
      const usPattern = path.join(folder, 'us-*.md');
      const usFiles = await glob(usPattern);

      for (const file of usFiles) {
        const content = await fs.readFile(file, 'utf-8');
        // Simple check for active status indicators
        if (!content.includes('status: completed') && !content.includes('status: cancelled')) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Ensure archive directories exist
   */
  private async ensureArchiveDirectories(): Promise<void> {
    await fs.ensureDir(path.join(this.featuresDir, '_archive'));
    await fs.ensureDir(path.join(this.epicsDir, '_archive'));

    // Ensure project-specific archive directories
    const projectDirs = await glob(path.join(this.specsDir, '*'));
    for (const dir of projectDirs) {
      const stats = await fs.stat(dir);
      if (stats.isDirectory()) {
        const dirName = path.basename(dir);
        if (!dirName.startsWith('_')) {
          await fs.ensureDir(path.join(dir, '_archive'));
        }
      }
    }
  }

  /**
   * Write archive metadata to track when/why item was archived (AC-US13-06, AC-US13-07)
   */
  private async writeArchiveMetadata(operation: ArchiveOperation): Promise<void> {
    const metadataPath = path.join(operation.targetPath, '.archive-metadata.json');

    const metadata = {
      id: operation.id,
      type: operation.type,
      archivedAt: new Date().toISOString(),
      archivedBy: process.env.USER || process.env.USERNAME || 'unknown',
      reason: operation.reason,
      sourcePath: operation.sourcePath,
      linkedIncrements: operation.linkedIncrements || []
    };

    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
  }

  /**
   * Restore an epic from archive
   */
  async restoreEpic(epicId: string): Promise<void> {
    const archivePath = path.join(this.epicsDir, '_archive', epicId);
    const targetPath = path.join(this.epicsDir, epicId);

    if (!await fs.pathExists(archivePath)) {
      throw new Error(`Epic ${epicId} not found in archive`);
    }

    if (await fs.pathExists(targetPath)) {
      throw new Error(`Epic ${epicId} already exists in active location`);
    }

    // Restore epic
    await fs.move(archivePath, targetPath);
    console.log(`✅ Restored epic ${epicId} from archive`);

    // Update links
    await this.updateLinksForRestoredEpic(epicId);
  }

  /**
   * Update links for restored epic
   */
  private async updateLinksForRestoredEpic(epicId: string): Promise<void> {
    const pattern = path.join(this.rootDir, '**/*.md');
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    let updatedFiles = 0;
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // Update archive links back to active
      const updatedContent = content
        .replace(new RegExp(`(\/_epics\/_archive\/${epicId}\/)`, 'g'), `/_epics/${epicId}/`);

      if (content !== updatedContent) {
        await fs.writeFile(file, updatedContent, 'utf-8');
        updatedFiles++;
      }
    }

    if (updatedFiles > 0) {
      console.log(`✅ Updated links in ${updatedFiles} files`);
    }
  }

  /**
   * Restore a feature from archive
   */
  async restoreFeature(featureId: string): Promise<void> {
    const archivePath = path.join(this.featuresDir, '_archive', featureId);
    const targetPath = path.join(this.featuresDir, featureId);

    if (!await fs.pathExists(archivePath)) {
      throw new Error(`Feature ${featureId} not found in archive`);
    }

    if (await fs.pathExists(targetPath)) {
      throw new Error(`Feature ${featureId} already exists in active location`);
    }

    // Restore feature
    await fs.move(archivePath, targetPath);

    // Restore project-specific folders
    const projectPattern = path.join(this.specsDir, '*', '_archive', featureId);
    const archivedFolders = await glob(projectPattern);

    for (const folder of archivedFolders) {
      const projectId = path.basename(path.dirname(path.dirname(folder)));
      const targetProjectPath = path.join(this.specsDir, projectId, featureId);

      await fs.move(folder, targetProjectPath);
      console.log(`  ✅ Restored ${projectId}/${featureId}`);
    }

    console.log(`✅ Restored feature ${featureId} from archive`);

    // Update links
    await this.updateLinksForRestoredFeature(featureId);
  }

  /**
   * Update links for restored feature
   */
  private async updateLinksForRestoredFeature(featureId: string): Promise<void> {
    const pattern = path.join(this.rootDir, '**/*.md');
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    let updatedFiles = 0;
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // Update archive links back to active
      const updatedContent = content
        .replace(new RegExp(`(\/_features\/_archive\/${featureId}\/)`, 'g'), `/_features/${featureId}/`)
        .replace(new RegExp(`(\/specs\/[^/]+\/_archive\/${featureId}\/)`, 'g'), (match, p1) => {
          return match.replace('/_archive/', '/');
        });

      if (content !== updatedContent) {
        await fs.writeFile(file, updatedContent, 'utf-8');
        updatedFiles++;
      }
    }

    if (updatedFiles > 0) {
      console.log(`✅ Updated links in ${updatedFiles} files`);
    }
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(): Promise<{
    features: {
      active: number;
      archived: number;
    };
    epics: {
      active: number;
      archived: number;
    };
    projects: {
      [key: string]: {
        active: number;
        archived: number;
      };
    };
  }> {
    const stats: any = {
      features: { active: 0, archived: 0 },
      epics: { active: 0, archived: 0 },
      projects: {}
    };

    // Count features
    const activeFeatures = await this.getAllFeatures();
    stats.features.active = activeFeatures.length;

    if (await fs.pathExists(path.join(this.featuresDir, '_archive'))) {
      const archivedFeatures = await glob(path.join(this.featuresDir, '_archive', 'FS-*'));
      stats.features.archived = archivedFeatures.length;
    }

    // Count epics
    const activeEpics = await this.getAllEpics();
    stats.epics.active = activeEpics.length;

    if (await fs.pathExists(path.join(this.epicsDir, '_archive'))) {
      const archivedEpics = await glob(path.join(this.epicsDir, '_archive', 'EPIC-*'));
      stats.epics.archived = archivedEpics.length;
    }

    // Count per project
    const projectDirs = await glob(path.join(this.specsDir, '*'));
    for (const dir of projectDirs) {
      const dirStats = await fs.stat(dir);
      if (!dirStats.isDirectory()) continue;

      const projectId = path.basename(dir);
      if (!projectId.startsWith('_')) {
        const activePattern = path.join(dir, 'FS-*');
        const archivedPattern = path.join(dir, '_archive', 'FS-*');

        const active = (await glob(activePattern)).length;
        const archived = (await glob(archivedPattern)).length;

        stats.projects[projectId] = { active, archived };
      }
    }

    return stats;
  }

  /**
   * Clean up feature folder duplicates
   *
   * Removes active folders that are ALSO in archive (keeps archive version as source of truth)
   * CRITICAL: Fixes bug where living docs sync recreates archived feature folders
   *
   * See: ULTRATHINK-ARCHIVE-REORGANIZATION-BUG.md for root cause analysis
   */
  async cleanupDuplicates(): Promise<{
    cleaned: string[];
    errors: string[];
  }> {
    const result = {
      cleaned: [] as string[],
      errors: [] as string[]
    };

    console.log('🧹 Scanning for duplicate feature folders (active + archive)...');

    try {
      // Get all archived features
      const archivePattern = path.join(this.featuresDir, '_archive', 'FS-*');
      const archivedPaths = await glob(archivePattern);

      console.log(`   Found ${archivedPaths.length} archived features`);

      for (const archivedPath of archivedPaths) {
        const featureId = path.basename(archivedPath);
        const activePath = path.join(this.featuresDir, featureId);

        // Check if active folder exists (duplicate in _features/)
        const activeExists = await fs.pathExists(activePath);
        const archiveExists = await fs.pathExists(archivedPath);

        let hasDuplicates = false;

        if (activeExists && archiveExists) {
          console.log(`   ⚠️  Duplicate detected: ${featureId} (_features/)`);
          console.log(`      → Active: ${activePath}`);
          console.log(`      → Archive: ${archivedPath}`);

          try {
            // Remove active folder (keep archive as source of truth)
            await fs.remove(activePath);
            console.log(`      ✅ Removed active duplicate (keeping archive)`);
            result.cleaned.push(`_features/${featureId}`);
            hasDuplicates = true;
          } catch (error) {
            const errMsg = `Failed to clean ${featureId}: ${error}`;
            console.error(`      ❌ ${errMsg}`);
            result.errors.push(errMsg);
          }
        }

        // ALWAYS check project-specific duplicates (even if _features/ has no duplicate)
        // This fixes the case where specweave/FS-XXX exists but _features/FS-XXX doesn't
        const projectDuplicatesFound = await this.cleanupProjectSpecificDuplicates(featureId, result);
        if (projectDuplicatesFound && !hasDuplicates) {
          console.log(`   ⚠️  Duplicate detected: ${featureId} (project folders only)`);
        }
      }

      console.log(`\n✅ Cleanup complete:`);
      console.log(`   Cleaned: ${result.cleaned.length} duplicates`);
      console.log(`   Errors: ${result.errors.length} failures`);

      if (result.cleaned.length > 0) {
        console.log(`\n📋 Cleaned folders:`);
        result.cleaned.forEach(folder => console.log(`   - ${folder}`));
      }

      if (result.errors.length > 0) {
        console.log(`\n⚠️  Errors:`);
        result.errors.forEach(err => console.log(`   - ${err}`));
      }

    } catch (error) {
      const errMsg = `Cleanup failed: ${error}`;
      console.error(`❌ ${errMsg}`);
      result.errors.push(errMsg);
    }

    return result;
  }

  /**
   * Clean up project-specific folder duplicates for a feature
   *
   * @returns true if duplicates were found, false otherwise
   */
  private async cleanupProjectSpecificDuplicates(
    featureId: string,
    result: { cleaned: string[]; errors: string[] }
  ): Promise<boolean> {
    let foundDuplicates = false;

    // Get all project folders
    const projectPattern = path.join(this.specsDir, '*', featureId);
    const projectActiveFolders = await glob(projectPattern, {
      ignore: ['**/node_modules/**', '**/_features/**', '**/_epics/**', '**/_archive/**']
    });

    for (const activeFolder of projectActiveFolders) {
      const projectId = path.basename(path.dirname(activeFolder));
      const archiveFolder = path.join(this.specsDir, projectId, '_archive', featureId);

      // If both active and archive exist → remove active (duplicate)
      const activeExists = await fs.pathExists(activeFolder);
      const archiveExists = await fs.pathExists(archiveFolder);

      if (activeExists && archiveExists) {
        try {
          await fs.remove(activeFolder);
          console.log(`      ✅ Removed project duplicate: ${projectId}/${featureId}`);
          result.cleaned.push(`${projectId}/${featureId}`);
          foundDuplicates = true;
        } catch (error) {
          const errMsg = `Failed to clean ${projectId}/${featureId}: ${error}`;
          console.error(`      ❌ ${errMsg}`);
          result.errors.push(errMsg);
        }
      }
    }

    return foundDuplicates;
  }
}