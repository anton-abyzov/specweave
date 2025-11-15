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

      // Process features
      const featuresToArchive = await this.identifyFeaturesToArchive(archivedIncrements, options);
      for (const operation of featuresToArchive) {
        await this.executeArchiveOperation(operation, result, options);
      }

      // Process epics (separate logic, not tied to features)
      const epicsToArchive = await this.identifyEpicsToArchive(options);
      for (const operation of epicsToArchive) {
        await this.executeArchiveOperation(operation, result, options);
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

      // Skip if already archived
      if (await fs.pathExists(archivePath)) {
        continue;
      }

      // Get all increments linked to this feature
      const linkedIncrements = await this.getLinkedIncrements(featureId);

      // Check if all linked increments are archived
      const allIncrementsArchived = linkedIncrements.every(inc =>
        archivedIncrements.some(archived => archived.includes(inc))
      );

      // Archive orphaned features if option is set
      const isOrphaned = linkedIncrements.length === 0 && options.archiveOrphanedFeatures;

      if (allIncrementsArchived || isOrphaned) {
        // Check if feature is still active in any project
        if (options.preserveActiveFeatures) {
          const hasActiveProjects = await this.hasActiveProjects(featureId);
          if (hasActiveProjects) {
            continue;
          }
        }

        operations.push({
          type: 'feature',
          id: featureId,
          sourcePath: featurePath,
          targetPath: archivePath,
          reason: isOrphaned ? 'orphaned' : 'all-increments-archived',
          linkedIncrements
        });
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
        operations.push({
          type: 'epic',
          id: epicId,
          sourcePath: epicPath,
          targetPath: archivePath,
          reason: isOrphaned ? 'orphaned' : 'all-features-archived'
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
        // Move to archive
        await fs.ensureDir(path.dirname(operation.targetPath));
        await fs.move(operation.sourcePath, operation.targetPath, { overwrite: false });

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

      await fs.ensureDir(path.dirname(archivePath));
      await fs.move(folder, archivePath, { overwrite: false });

      console.log(`  ✅ Archived ${projectId}/${featureId}`);
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
   */
  private async getLinkedIncrements(featureId: string): Promise<string[]> {
    const increments: string[] = [];

    // Check active increments
    const activePattern = path.join(this.rootDir, '.specweave', 'increments', '[0-9]*-*', 'spec.md');
    const activeFiles = await glob(activePattern);

    for (const file of activeFiles) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes(featureId)) {
        const incrementDir = path.basename(path.dirname(file));
        increments.push(incrementDir);
      }
    }

    // Check archived increments
    const archivedPattern = path.join(this.rootDir, '.specweave', 'increments', '_archive', '[0-9]*-*', 'spec.md');
    const archivedFiles = await glob(archivedPattern);

    for (const file of archivedFiles) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes(featureId)) {
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
}