/**
 * Increment Archiver - Smart archiving system for completed increments
 *
 * Keeps the increments folder clean by archiving old/completed increments
 * while preserving active work and maintaining full history.
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { glob } from 'glob';
import { ConfigManager } from '../config-manager.js';
import { MetadataManager } from './metadata-manager.js';
import { detectDuplicatesByNumber } from './duplicate-detector.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

// Archiver-specific logger with emoji formatting
class ArchiverLogger implements Logger {
  constructor(private baseLogger: Logger) {}

  info(message: string) { this.baseLogger.log(`ℹ️  ${message}`); }
  success(message: string) { this.baseLogger.log(`✅ ${message}`); }
  warn(message: string) { this.baseLogger.warn(`⚠️  ${message}`); }
  error(message: string, error?: any) { this.baseLogger.error(`❌ ${message}`, error); }
  debug(message: string) { if (process.env.DEBUG) this.baseLogger.log(`🔍 ${message}`); }

  // Logger interface implementation
  log(message: string) { this.baseLogger.log(message); }
}

export interface ArchiveOptions {
  keepLast?: number;           // Keep last N increments (default: 10)
  olderThanDays?: number;       // Archive increments older than N days
  archiveCompleted?: boolean;  // Archive all completed increments
  preserveActive?: boolean;    // Never archive active/paused increments (default: true)
  dryRun?: boolean;            // Show what would be archived without moving
  increments?: string[];       // Specific increments to archive
  pattern?: string;            // Pattern to match increment names
}

export interface ArchiveResult {
  archived: string[];          // Successfully archived increments
  skipped: string[];          // Increments skipped (active, errors, etc.)
  errors: string[];           // Increments with errors
  totalSize: number;          // Total size of archived increments in bytes
}

export class IncrementArchiver {
  private logger: ArchiverLogger;
  private config: ConfigManager;
  private rootDir: string;
  private incrementsDir: string;
  private archiveDir: string;
  private abandonedDir: string;

  constructor(rootDir: string, options: { logger?: Logger } = {}) {
    this.rootDir = rootDir;
    this.logger = new ArchiverLogger(options.logger ?? consoleLogger);
    this.config = new ConfigManager(rootDir);
    this.incrementsDir = path.join(rootDir, '.specweave', 'increments');
    this.archiveDir = path.join(this.incrementsDir, '_archive');
    this.abandonedDir = path.join(this.incrementsDir, '_abandoned');
  }

  /**
   * Archive increments based on options
   *
   * CRITICAL FIX (2025-11-26): --keep-last N now means "exactly N increments remain"
   *
   * Previous bug: External sync protection would ADD exceptions on top of keepLast,
   * resulting in more than N increments remaining. Now we use a "greedy archive"
   * algorithm that archives from oldest until exactly N remain.
   *
   * Algorithm:
   * 1. Sort all increments by number (oldest first)
   * 2. Calculate how many need to remain: keepLast (or apply other filters)
   * 3. Walk from oldest, archiving each eligible increment
   * 4. Protected increments (external sync, active) count toward the "remaining" quota
   * 5. Stop when exactly keepLast increments remain
   */
  async archive(options: ArchiveOptions = {}): Promise<ArchiveResult> {
    const result: ArchiveResult = {
      archived: [],
      skipped: [],
      errors: [],
      totalSize: 0
    };

    // Ensure archive directory exists
    if (!options.dryRun) {
      await fs.ensureDir(this.archiveDir);
    }

    // Get all increments sorted by number (oldest first)
    const allIncrements = await this.getIncrements();

    // Handle specific increments mode (explicit list)
    if (options.increments && options.increments.length > 0) {
      return this.archiveSpecificIncrements(options.increments, options, result);
    }

    // Handle pattern mode
    if (options.pattern) {
      return this.archiveByPattern(allIncrements, options, result);
    }

    // Handle olderThanDays mode
    if (options.olderThanDays !== undefined) {
      return this.archiveByAge(allIncrements, options, result);
    }

    // Handle keepLast mode (default behavior)
    // CRITICAL SAFETY: Default to 3 if no criteria provided
    const effectiveKeepLast = options.keepLast ?? 3;

    if (options.keepLast === undefined) {
      this.logger.warn(`No filtering criteria provided - defaulting to --keep-last 3 for safety`);
      this.logger.info(`Use --keep-last N to explicitly set how many increments to keep`);
    }

    return this.archiveWithKeepLast(allIncrements, effectiveKeepLast, options, result);
  }

  /**
   * Archive specific increments by ID
   */
  private async archiveSpecificIncrements(
    incrementIds: string[],
    options: ArchiveOptions,
    result: ArchiveResult
  ): Promise<ArchiveResult> {
    const allIncrements = await this.getIncrements();

    for (const target of incrementIds) {
      const increment = allIncrements.find(inc => {
        const incNumber = inc.split('-')[0];
        return inc === target || incNumber === target.padStart(4, '0');
      });

      if (!increment) {
        this.logger.warn(`Increment not found: ${target}`);
        result.errors.push(target);
        continue;
      }

      await this.tryArchiveIncrement(increment, options, result);
    }

    if (!options.dryRun) {
      result.totalSize = await this.calculateSize(result.archived);
    }

    return result;
  }

  /**
   * Archive increments matching a pattern
   */
  private async archiveByPattern(
    allIncrements: string[],
    options: ArchiveOptions,
    result: ArchiveResult
  ): Promise<ArchiveResult> {
    const regex = new RegExp(options.pattern!, 'i');
    const matching = allIncrements.filter(inc => regex.test(inc));

    for (const increment of matching) {
      await this.tryArchiveIncrement(increment, options, result);
    }

    if (!options.dryRun) {
      result.totalSize = await this.calculateSize(result.archived);
    }

    return result;
  }

  /**
   * Archive increments older than N days
   */
  private async archiveByAge(
    allIncrements: string[],
    options: ArchiveOptions,
    result: ArchiveResult
  ): Promise<ArchiveResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays!);

    for (const increment of allIncrements) {
      const metadata = await this.getMetadata(increment);
      let isOldEnough = false;

      if (metadata?.lastActivity) {
        const lastActivity = new Date(metadata.lastActivity);
        isOldEnough = lastActivity < cutoffDate;
      } else {
        const incPath = path.join(this.incrementsDir, increment);
        const stats = await fs.stat(incPath);
        isOldEnough = stats.mtime < cutoffDate;
      }

      if (isOldEnough) {
        await this.tryArchiveIncrement(increment, options, result);
      }
    }

    if (!options.dryRun) {
      result.totalSize = await this.calculateSize(result.archived);
    }

    return result;
  }

  /**
   * Archive with --keep-last N semantics
   *
   * CRITICAL: This ensures EXACTLY N increments remain after archiving.
   * Protected increments (external sync, active) count toward the N remaining.
   *
   * Algorithm:
   * 1. Start from oldest increment
   * 2. Try to archive each one
   * 3. Count remaining = (total - archived)
   * 4. Stop when remaining == keepLast
   * 5. Protected increments naturally stay and count toward keepLast
   */
  private async archiveWithKeepLast(
    allIncrements: string[],
    keepLast: number,
    options: ArchiveOptions,
    result: ArchiveResult
  ): Promise<ArchiveResult> {
    const total = allIncrements.length;

    if (total <= keepLast) {
      this.logger.info(`Only ${total} increments exist, nothing to archive (keeping ${keepLast})`);
      return result;
    }

    // How many we need to archive to reach exactly keepLast
    let targetArchiveCount = total - keepLast;

    this.logger.debug(`Total: ${total}, Keep: ${keepLast}, Target to archive: ${targetArchiveCount}`);

    // Process from oldest to newest
    for (const increment of allIncrements) {
      // Check if we've archived enough
      if (result.archived.length >= targetArchiveCount) {
        this.logger.debug(`Reached target archive count (${targetArchiveCount}), stopping`);
        break;
      }

      // Calculate current remaining
      const currentRemaining = total - result.archived.length;

      // Safety check: never go below keepLast
      if (currentRemaining <= keepLast) {
        this.logger.debug(`Would go below keepLast (${keepLast}), stopping`);
        break;
      }

      // Try to archive this increment
      const archiveAttempt = await this.tryArchiveIncrement(increment, options, result);

      // If increment was protected (skipped), it counts toward remaining
      // So we need to archive one MORE to compensate
      if (!archiveAttempt.archived && !archiveAttempt.error) {
        // Increment was skipped (protected) - it will remain active
        // We need to archive more to compensate
        targetArchiveCount++;
        this.logger.debug(`${increment} is protected, adjusted target to ${targetArchiveCount}`);
      }
    }

    // Final verification
    const finalRemaining = total - result.archived.length;
    if (finalRemaining !== keepLast && result.skipped.length > 0) {
      this.logger.info(`Note: ${finalRemaining} increments remain (requested ${keepLast})`);
      this.logger.info(`${result.skipped.length} increments have active external sync and cannot be archived`);
    }

    if (!options.dryRun) {
      result.totalSize = await this.calculateSize(result.archived);
    }

    return result;
  }

  /**
   * Try to archive a single increment, handling all checks
   * Returns { archived: boolean, error: boolean }
   */
  private async tryArchiveIncrement(
    increment: string,
    options: ArchiveOptions,
    result: ArchiveResult
  ): Promise<{ archived: boolean; error: boolean }> {
    try {
      const canArchive = await this.shouldArchive(increment, options);

      if (canArchive) {
        if (options.dryRun) {
          this.logger.info(`[DRY RUN] Would archive: ${increment}`);
          result.archived.push(increment);
        } else {
          await this.archiveIncrement(increment);
          result.archived.push(increment);
          this.logger.success(`Archived: ${increment}`);
        }
        return { archived: true, error: false };
      } else {
        result.skipped.push(increment);
        return { archived: false, error: false };
      }
    } catch (error) {
      result.errors.push(increment);
      this.logger.error(`Failed to archive ${increment}: ${error}`);
      return { archived: false, error: true };
    }
  }

  /**
   * Get all increment directories (excluding _archive and _abandoned)
   */
  private async getIncrements(): Promise<string[]> {
    const pattern = path.join(this.incrementsDir, '[0-9]*-*');
    const allPaths = await glob(pattern);

    // Filter to only directories
    const increments = [];
    for (const p of allPaths) {
      const stats = await fs.stat(p);
      if (stats.isDirectory()) {
        increments.push(p);
      }
    }

    return increments
      .map(p => path.basename(p))
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[0]);
        const numB = parseInt(b.split('-')[0]);
        return numA - numB;
      });
  }

  /**
   * Determine if an increment should be archived
   */
  private async shouldArchive(
    increment: string,
    options: ArchiveOptions
  ): Promise<boolean> {
    // Check if already in archive
    const archivePath = path.join(this.archiveDir, increment);
    if (await fs.pathExists(archivePath)) {
      this.logger.debug(`${increment} already archived`);
      return false;
    }

    // Get metadata
    const metadata = await this.getMetadata(increment);

    // Preserve active/paused increments by default
    if (options.preserveActive !== false && metadata?.status) {
      if (['active', 'paused'].includes(metadata.status)) {
        this.logger.debug(`${increment} is ${metadata.status}, preserving`);
        return false;
      }
    }

    // Check for active external sync (GitHub, JIRA, ADO) - MUST check before archiveCompleted
    if (metadata) {
      const hasActiveSync =
        (metadata.github && !metadata.github.closed) ||
        (metadata.jira && metadata.jira.status !== 'Done') ||
        (metadata.ado && metadata.ado.state !== 'Closed');

      if (hasActiveSync) {
        this.logger.warn(`${increment} has active external sync, skipping`);
        return false;
      }
    }

    // Archive completed increments if requested
    if (options.archiveCompleted && metadata?.status === 'completed') {
      return true;
    }

    // Check for uncommitted changes
    const hasUncommittedChanges = await this.hasUncommittedChanges(increment);
    if (hasUncommittedChanges) {
      this.logger.warn(`${increment} has uncommitted changes, skipping`);
      return false;
    }

    return true;
  }

  /**
   * Archive a single increment
   */
  private async archiveIncrement(increment: string): Promise<void> {
    const sourcePath = path.join(this.incrementsDir, increment);
    const targetPath = path.join(this.archiveDir, increment);

    // CRITICAL: Check for duplicates before archiving
    const numberMatch = increment.match(/^(\d+)/);
    if (numberMatch) {
      const incrementNumber = numberMatch[1];
      const duplicates = await detectDuplicatesByNumber(incrementNumber, this.rootDir);

      // Check if any duplicates exist in archive or abandoned
      const archiveDuplicates = duplicates.filter(d =>
        d.path.includes('_archive') || d.path.includes('_abandoned')
      );

      if (archiveDuplicates.length > 0) {
        const locations = archiveDuplicates.map(d => d.path).join('\n  - ');
        throw new Error(
          `Cannot archive ${increment}: Increment number ${incrementNumber} already exists in:\n  - ${locations}\n\n` +
          `Resolution options:\n` +
          `  1. Delete the existing archive/abandoned version first\n` +
          `  2. Use --force to overwrite (not recommended)\n` +
          `  3. Run /specweave:fix-duplicates to resolve conflicts`
        );
      }
    }

    // Move the directory
    await fs.move(sourcePath, targetPath, { overwrite: false });

    // Clear increment number cache (numbers changed after archiving)
    const { IncrementNumberManager } = await import('../increment-utils.js');
    IncrementNumberManager.clearCache();

    // Update any references in config or living docs
    await this.updateReferences(increment);
  }

  /**
   * Get metadata for an increment
   */
  private async getMetadata(increment: string): Promise<any | null> {
    const metadataPath = path.join(this.incrementsDir, increment, 'metadata.json');

    if (await fs.pathExists(metadataPath)) {
      try {
        return await fs.readJson(metadataPath);
      } catch (error) {
        this.logger.debug(`Failed to read metadata for ${increment}: ${error}`);
      }
    }

    return null;
  }

  /**
   * Check if increment has uncommitted changes
   */
  private async hasUncommittedChanges(increment: string): Promise<boolean> {
    // This would integrate with git to check for uncommitted changes
    // For now, return false to allow archiving
    return false;
  }

  /**
   * Update references after archiving
   */
  private async updateReferences(increment: string): Promise<void> {
    // Import and run feature archiving to maintain consistency
    try {
      this.logger.info(`🔄 Reorganizing living docs after archiving ${increment}...`);

      const { FeatureArchiver } = await import('../living-docs/feature-archiver.js');
      const featureArchiver = new FeatureArchiver(this.rootDir);

      // Archive features that have all their increments archived
      // CRITICAL: Use forceArchiveWhenAllIncrementsArchived to ensure comprehensive reorganization
      const result = await featureArchiver.archiveFeatures({
        dryRun: false,
        updateLinks: true,
        preserveActiveFeatures: true,
        archiveOrphanedFeatures: false,
        archiveOrphanedEpics: false,
        forceArchiveWhenAllIncrementsArchived: true  // Override active projects check when all increments archived
      });

      if (result.archivedFeatures.length > 0) {
        this.logger.success(`✅ Archived ${result.archivedFeatures.length} features: ${result.archivedFeatures.join(', ')}`);
        this.logger.info(`   Features moved to {project}/_archive/ folders`);
      } else {
        this.logger.info(`ℹ️  No features to archive (all active or already archived)`);
      }

      if (result.archivedEpics.length > 0) {
        this.logger.success(`✅ Archived ${result.archivedEpics.length} epics: ${result.archivedEpics.join(', ')}`);
      }

      if (result.updatedLinks.length > 0) {
        const filesUpdated = new Set(result.updatedLinks.map(u => u.file)).size;
        this.logger.success(`✅ Updated ${result.updatedLinks.length} links in ${filesUpdated} files`);
      }

      if (result.errors.length > 0) {
        this.logger.warn(`⚠️  Encountered ${result.errors.length} errors during reorganization:`);
        result.errors.forEach(err => this.logger.warn(`   - ${err}`));
      }

      this.logger.success(`✅ Living docs reorganization complete`);
    } catch (error) {
      this.logger.warn(`Could not update feature archives: ${error}`);
    }
  }

  /**
   * Update references after restoring (mirror of archiving behavior)
   *
   * When an increment is restored from archive, check if its linked feature
   * is also in the archive. If so, restore the feature to maintain consistency
   * between increments and living docs.
   */
  private async updateReferencesOnRestore(increment: string): Promise<void> {
    try {
      this.logger.info(`🔄 Checking living docs sync after restoring ${increment}...`);

      // 1. Parse spec.md to get feature_id (explicit or inferred)
      const specPath = path.join(this.incrementsDir, increment, 'spec.md');

      if (!await fs.pathExists(specPath)) {
        this.logger.debug(`No spec.md found for ${increment}, skipping living docs sync`);
        return;
      }

      const content = await fs.readFile(specPath, 'utf-8');

      // Get feature ID (explicit or auto-inferred from increment number)
      const featureId = await this.getFeatureIdForIncrement(increment, content);

      if (!featureId) {
        this.logger.debug(`No feature linkage for ${increment}, skipping living docs sync`);
        return;
      }

      this.logger.info(`   Feature linkage: ${featureId}`);

      // 2. Check if feature is in archive (v5.0.0: check project folders, not _features)
      // Get the default/first project to check
      const specsDir = path.join(this.rootDir, '.specweave', 'docs', 'internal', 'specs');
      const projectFolders = await fs.readdir(specsDir, { withFileTypes: true });
      const projects = projectFolders
        .filter(d => d.isDirectory() && !d.name.startsWith('_'))
        .map(d => d.name);

      const defaultProject = projects[0] || 'default';
      const archivePath = path.join(specsDir, defaultProject, '_archive', featureId);
      const activePath = path.join(specsDir, defaultProject, featureId);

      const featureInArchive = await fs.pathExists(archivePath);
      const featureAlreadyActive = await fs.pathExists(activePath);

      if (!featureInArchive) {
        if (featureAlreadyActive) {
          this.logger.info(`   ✅ Feature ${featureId} already in active location (no action needed)`);
          return;
        } else {
          // Feature doesn't exist - CREATE it by syncing from increment
          this.logger.info(`   📝 Feature ${featureId} doesn't exist - creating from increment spec...`);

          try {
            const { LivingDocsSync } = await import('../living-docs/living-docs-sync.js');
            const sync = new LivingDocsSync(this.rootDir);
            const result = await sync.syncIncrement(increment);

            if (result.success) {
              this.logger.success(`   ✅ Created feature ${featureId} with ${result.filesCreated.length} files`);
            } else {
              this.logger.warn(`   ⚠️  Failed to create feature: ${result.errors.join(', ')}`);
            }
          } catch (syncError) {
            this.logger.warn(`   ⚠️  Could not create feature: ${syncError}`);
          }
          return;
        }
      }

      if (featureAlreadyActive) {
        // Duplicate detected - archive has feature but active also has it
        // This can happen if living docs sync created the folder after a previous restore
        this.logger.warn(`   ⚠️  Feature ${featureId} exists in BOTH archive and active locations`);
        this.logger.info(`   Running duplicate cleanup...`);

        const { FeatureArchiver } = await import('../living-docs/feature-archiver.js');
        const featureArchiver = new FeatureArchiver(this.rootDir);
        const cleanupResult = await featureArchiver.cleanupDuplicates();

        if (cleanupResult.cleaned.length > 0) {
          this.logger.success(`   ✅ Cleaned ${cleanupResult.cleaned.length} duplicate folders`);
        }
        return;
      }

      // 3. Restore feature from archive
      this.logger.info(`   📦 Restoring feature ${featureId} from archive...`);

      const { FeatureArchiver } = await import('../living-docs/feature-archiver.js');
      const featureArchiver = new FeatureArchiver(this.rootDir);

      await featureArchiver.restoreFeature(featureId);

      this.logger.success(`✅ Restored feature ${featureId} from archive (linked to ${increment})`);
      this.logger.info(`   Feature moved: {project}/_archive/${featureId}/ → {project}/${featureId}/`);
      this.logger.info(`   Links updated throughout codebase`);

    } catch (error) {
      this.logger.warn(`Could not sync living docs on restore: ${error}`);
      this.logger.info(`You may need to manually restore the feature with: /specweave:restore-feature <feature-id>`);
    }
  }

  /**
   * Calculate total size of archived increments
   */
  private async calculateSize(increments: string[]): Promise<number> {
    let totalSize = 0;

    for (const increment of increments) {
      const incPath = path.join(this.archiveDir, increment);
      if (await fs.pathExists(incPath)) {
        totalSize += await this.getDirectorySize(incPath);
      }
    }

    return totalSize;
  }

  /**
   * Get directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    const files = await glob(path.join(dirPath, '**/*'));

    for (const file of files) {
      const stats = await fs.stat(file);
      if (stats.isFile()) {
        size += stats.size;
      }
    }

    return size;
  }

  /**
   * Restore an increment from archive
   */
  async restore(increment: string): Promise<void> {
    const sourcePath = path.join(this.archiveDir, increment);
    const targetPath = path.join(this.incrementsDir, increment);

    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`Increment ${increment} not found in archive`);
    }

    if (await fs.pathExists(targetPath)) {
      throw new Error(`Increment ${increment} already exists in main folder`);
    }

    // CRITICAL: Check for duplicates before restoring
    const numberMatch = increment.match(/^(\d+)/);
    if (numberMatch) {
      const incrementNumber = numberMatch[1];
      const duplicates = await detectDuplicatesByNumber(incrementNumber, this.rootDir);

      // Check if any duplicates exist in active increments
      const activeDuplicates = duplicates.filter(d =>
        !d.path.includes('_archive') && !d.path.includes('_abandoned')
      );

      if (activeDuplicates.length > 0) {
        const locations = activeDuplicates.map(d => d.path).join('\n  - ');
        throw new Error(
          `Cannot restore ${increment}: Increment number ${incrementNumber} already exists in active folder:\n  - ${locations}\n\n` +
          `Resolution options:\n` +
          `  1. Delete/archive the existing active version first\n` +
          `  2. Run /specweave:fix-duplicates to resolve conflicts`
        );
      }
    }

    await fs.move(sourcePath, targetPath);

    // Clear increment number cache (numbers changed after restoring)
    const { IncrementNumberManager } = await import('../increment-utils.js');
    IncrementNumberManager.clearCache();

    this.logger.success(`Restored ${increment} from archive`);

    // Sync living docs on restore (mirror of archiving behavior)
    await this.updateReferencesOnRestore(increment);
  }

  /**
   * List archived increments
   */
  async listArchived(): Promise<string[]> {
    if (!await fs.pathExists(this.archiveDir)) {
      return [];
    }

    const pattern = path.join(this.archiveDir, '[0-9]*-*');
    const allPaths = await glob(pattern);

    // Filter to only directories
    const archived = [];
    for (const p of allPaths) {
      const stats = await fs.stat(p);
      if (stats.isDirectory()) {
        archived.push(p);
      }
    }

    return archived
      .map(p => path.basename(p))
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[0]);
        const numB = parseInt(b.split('-')[0]);
        return numA - numB;
      });
  }

  /**
   * Get feature ID for an increment (explicit or inferred)
   *
   * Priority:
   * 1. Explicit linkage (feature_id or epic in frontmatter)
   * 2. Auto-inferred from increment number (0041 → FS-041)
   */
  private async getFeatureIdForIncrement(increment: string, specContent: string): Promise<string | null> {
    // 1. Try explicit linkage first
    const featureIdMatch = specContent.match(/^feature_id:\s*["']?([^"'\n]+)["']?$/m);
    const epicMatch = specContent.match(/^epic:\s*["']?([^"'\n]+)["']?$/m);

    const explicitFeatureId = featureIdMatch ? featureIdMatch[1].trim() :
                             epicMatch ? epicMatch[1].trim() : null;

    if (explicitFeatureId) {
      this.logger.debug(`Found explicit feature linkage: ${explicitFeatureId}`);
      return explicitFeatureId;
    }

    // 2. Auto-infer from increment number
    const inferredFeatureId = this.inferFeatureIdFromIncrement(increment);

    if (inferredFeatureId) {
      this.logger.info(`   Auto-inferred feature ID from increment: ${increment} → ${inferredFeatureId}`);
      return inferredFeatureId;
    }

    // 3. No linkage possible
    return null;
  }

  /**
   * Infer feature ID from increment number
   *
   * Examples:
   * - "0041-living-docs-test-fixes" → "FS-041"
   * - "0123-my-feature" → "FS-123"
   * - "temp-experiment" → null (no number)
   */
  private inferFeatureIdFromIncrement(increment: string): string | null {
    // Extract 4-digit number prefix
    const match = increment.match(/^(\d{4})/);
    if (!match) {
      return null; // Can't infer (no number prefix)
    }

    const number = parseInt(match[1], 10);

    // Convert to feature ID format: 41 → "FS-041"
    return `FS-${number.toString().padStart(3, '0')}`;
  }

  /**
   * Get archive statistics
   */
  async getStats(): Promise<{
    active: number;
    archived: number;
    abandoned: number;
    totalSize: number;
    oldestActive: string | null;
    newestArchived: string | null;
  }> {
    const active = await this.getIncrements();
    const archived = await this.listArchived();

    // Count abandoned
    let abandoned = 0;
    if (await fs.pathExists(this.abandonedDir)) {
      const abandonedDirs = await glob(path.join(this.abandonedDir, '[0-9]*-*'));
      abandoned = abandonedDirs.length;
    }

    // Calculate total archive size
    const totalSize = await this.calculateSize(archived);

    return {
      active: active.length,
      archived: archived.length,
      abandoned,
      totalSize,
      oldestActive: active[0] || null,
      newestArchived: archived[archived.length - 1] || null
    };
  }
}