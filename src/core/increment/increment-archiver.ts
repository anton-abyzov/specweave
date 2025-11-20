/**
 * Increment Archiver - Smart archiving system for completed increments
 *
 * Keeps the increments folder clean by archiving old/completed increments
 * while preserving active work and maintaining full history.
 */

import fs from 'fs-extra';
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

    // Get all increments
    const increments = await this.getIncrements();

    // Filter increments based on options
    const toArchive = await this.filterIncrements(increments, options);

    // Process each increment
    for (const increment of toArchive) {
      try {
        const shouldArchive = await this.shouldArchive(increment, options);

        if (shouldArchive) {
          if (options.dryRun) {
            this.logger.info(`[DRY RUN] Would archive: ${increment}`);
            result.archived.push(increment);
          } else {
            await this.archiveIncrement(increment);
            result.archived.push(increment);
            this.logger.success(`Archived: ${increment}`);
          }
        } else {
          result.skipped.push(increment);
          this.logger.debug(`Skipped: ${increment}`);
        }
      } catch (error) {
        result.errors.push(increment);
        this.logger.error(`Failed to archive ${increment}: ${error}`);
      }
    }

    // Calculate total size
    if (!options.dryRun) {
      result.totalSize = await this.calculateSize(result.archived);
    }

    return result;
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
   * Filter increments based on archive options
   */
  private async filterIncrements(
    increments: string[],
    options: ArchiveOptions
  ): Promise<string[]> {
    let filtered = [...increments];

    // If specific increments provided, use only those
    if (options.increments && options.increments.length > 0) {
      filtered = filtered.filter(inc => {
        const incNumber = inc.split('-')[0];
        return options.increments!.some(target => {
          return inc === target || incNumber === target.padStart(4, '0');
        });
      });
      return filtered;
    }

    // Apply pattern filter
    if (options.pattern) {
      const regex = new RegExp(options.pattern, 'i');
      filtered = filtered.filter(inc => regex.test(inc));
    }

    // Keep last N increments
    if (options.keepLast !== undefined) {
      const toKeep = increments.slice(-options.keepLast);
      filtered = filtered.filter(inc => !toKeep.includes(inc));
    }

    // Filter by age
    if (options.olderThanDays !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays);

      filtered = await Promise.all(filtered.map(async inc => {
        const metadata = await this.getMetadata(inc);
        if (metadata?.lastActivity) {
          const lastActivity = new Date(metadata.lastActivity);
          return lastActivity < cutoffDate ? inc : null;
        }
        // Check directory modification time as fallback
        const incPath = path.join(this.incrementsDir, inc);
        const stats = await fs.stat(incPath);
        return stats.mtime < cutoffDate ? inc : null;
      })).then(results => results.filter(Boolean) as string[]);
    }

    return filtered;
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
        this.logger.info(`   Features moved to _features/_archive/ and project-specific _archive/ folders`);
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

      // 2. Check if feature is in archive
      const archivePath = path.join(this.rootDir, '.specweave', 'docs', 'internal', 'specs', '_features', '_archive', featureId);
      const activePath = path.join(this.rootDir, '.specweave', 'docs', 'internal', 'specs', '_features', featureId);

      const featureInArchive = await fs.pathExists(archivePath);
      const featureAlreadyActive = await fs.pathExists(activePath);

      if (!featureInArchive) {
        if (featureAlreadyActive) {
          this.logger.info(`   ✅ Feature ${featureId} already in active location (no action needed)`);
        } else {
          this.logger.debug(`   Feature ${featureId} not found in archive or active (may not exist yet)`);
        }
        return;
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
      this.logger.info(`   Feature moved: _features/_archive/${featureId}/ → _features/${featureId}/`);
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