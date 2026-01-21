/**
 * Spec to Living Docs Sync
 *
 * Synchronizes AC checkbox states and task completion from increment spec.md
 * to all corresponding living docs US files.
 *
 * This is the CRITICAL MISSING LINK in the sync chain:
 * tasks.md → spec.md → living docs → external tools (GitHub/JIRA/ADO)
 *
 * @module sync/spec-to-living-docs-sync
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { glob } from 'glob';
import { Logger, consoleLogger } from '../utils/logger.js';

/**
 * AC state from spec.md
 */
export interface ACState {
  acId: string;
  checked: boolean;
  description: string;
}

/**
 * Task state from tasks.md
 */
export interface TaskState {
  taskId: string;
  completed: boolean;
  userStory?: string; // US-XXX
}

/**
 * Result of syncing a single US file
 */
export interface USFileSyncResult {
  filePath: string;
  updated: boolean;
  acsUpdated: number;
  tasksUpdated: number;
  statusChanged: boolean;
  error?: string;
}

/**
 * Overall sync result
 */
export interface SpecToLivingDocsSyncResult {
  success: boolean;
  filesProcessed: number;
  filesUpdated: number;
  totalACsUpdated: number;
  totalTasksUpdated: number;
  results: USFileSyncResult[];
  errors: string[];
}

/**
 * Options for spec-to-living-docs sync
 */
export interface SpecToLivingDocsSyncOptions {
  projectRoot: string;
  incrementId: string;
  logger?: Logger;
  dryRun?: boolean;
}

/**
 * SpecToLivingDocsSync - Syncs AC/task completion from spec.md to living docs
 */
export class SpecToLivingDocsSync {
  private readonly projectRoot: string;
  private readonly incrementId: string;
  private readonly logger: Logger;
  private readonly dryRun: boolean;

  constructor(options: SpecToLivingDocsSyncOptions) {
    this.projectRoot = options.projectRoot;
    this.incrementId = options.incrementId;
    this.logger = options.logger ?? consoleLogger;
    this.dryRun = options.dryRun ?? false;
  }

  /**
   * Main sync method - orchestrates the entire sync process
   */
  async sync(): Promise<SpecToLivingDocsSyncResult> {
    const result: SpecToLivingDocsSyncResult = {
      success: false,
      filesProcessed: 0,
      filesUpdated: 0,
      totalACsUpdated: 0,
      totalTasksUpdated: 0,
      results: [],
      errors: [],
    };

    try {
      // Step 1: Read spec.md and parse ACs
      const specACs = await this.parseSpecACs();
      if (specACs.length === 0) {
        this.logger.warn('No ACs found in spec.md');
        result.success = true;
        return result;
      }

      // Step 2: Read tasks.md and parse task completion
      const taskStates = await this.parseTaskStates();

      // Step 3: Find all living docs US files for this increment
      const usFiles = await this.findLivingDocsUSFiles();
      if (usFiles.length === 0) {
        this.logger.warn('No living docs US files found for this increment');
        result.success = true;
        return result;
      }

      this.logger.log(`\n🔄 Syncing spec.md → ${usFiles.length} living docs US files...\n`);

      // Step 4: Update each US file
      for (const filePath of usFiles) {
        const fileResult = await this.syncUSFile(filePath, specACs, taskStates);
        result.results.push(fileResult);
        result.filesProcessed++;

        if (fileResult.updated) {
          result.filesUpdated++;
          result.totalACsUpdated += fileResult.acsUpdated;
          result.totalTasksUpdated += fileResult.tasksUpdated;
        }

        if (fileResult.error) {
          result.errors.push(`${path.basename(filePath)}: ${fileResult.error}`);
        }
      }

      result.success = result.errors.length === 0;

      // Summary
      this.logger.log(`\n✅ Spec → Living Docs Sync Complete`);
      this.logger.log(`   Files processed: ${result.filesProcessed}`);
      this.logger.log(`   Files updated: ${result.filesUpdated}`);
      this.logger.log(`   Total ACs updated: ${result.totalACsUpdated}`);
      this.logger.log(`   Total tasks updated: ${result.totalTasksUpdated}`);

      if (result.errors.length > 0) {
        this.logger.warn(`\n⚠️  Errors encountered: ${result.errors.length}`);
        result.errors.forEach(err => this.logger.warn(`   ${err}`));
      }

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      this.logger.error(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Parse ACs from spec.md
   */
  private async parseSpecACs(): Promise<ACState[]> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      this.incrementId,
      'spec.md'
    );

    if (!existsSync(specPath)) {
      throw new Error(`spec.md not found: ${specPath}`);
    }

    const content = await readFile(specPath, 'utf-8');
    const lines = content.split('\n');
    const acs: ACState[] = [];

    for (const line of lines) {
      // Match: - [ ] **AC-US1-01**: Description
      // or: - [x] **AC-US1-01**: Description
      const match = line.match(/^-\s+\[([ x])\]\s+\*{0,2}(AC-[A-Z0-9-]+)\*{0,2}:\s*(.+)/);

      if (match) {
        acs.push({
          acId: match[2],
          checked: match[1] === 'x',
          description: match[3].trim(),
        });
      }
    }

    this.logger.debug(`Parsed ${acs.length} ACs from spec.md`);
    return acs;
  }

  /**
   * Parse task states from tasks.md
   */
  private async parseTaskStates(): Promise<TaskState[]> {
    const tasksPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      this.incrementId,
      'tasks.md'
    );

    if (!existsSync(tasksPath)) {
      this.logger.warn('tasks.md not found, skipping task sync');
      return [];
    }

    const content = await readFile(tasksPath, 'utf-8');
    const lines = content.split('\n');
    const tasks: TaskState[] = [];

    let currentTaskId: string | null = null;
    let currentUserStory: string | null = null;
    let hasChecked = false;
    let hasUnchecked = false;

    for (const line of lines) {
      // Task header: ### T-001: Task name
      const taskMatch = line.match(/###\s+(T-\d+):/);
      if (taskMatch) {
        // Save previous task
        if (currentTaskId) {
          tasks.push({
            taskId: currentTaskId,
            completed: hasChecked && !hasUnchecked,
            userStory: currentUserStory ?? undefined,
          });
        }

        // Reset for new task
        currentTaskId = taskMatch[1];
        currentUserStory = null;
        hasChecked = false;
        hasUnchecked = false;
        continue;
      }

      if (!currentTaskId) continue;

      // User Story: **User Story**: US-001
      const usMatch = line.match(/\*\*User Story\*\*:\s+(US-\d+)/);
      if (usMatch) {
        currentUserStory = usMatch[1];
        continue;
      }

      // Checkbox status
      if (line.includes('- [x]') || line.match(/\*\*Status\*\*:\s*\[x\]/i)) {
        hasChecked = true;
      } else if (line.includes('- [ ]') || line.match(/\*\*Status\*\*:\s*\[\s\]/i)) {
        hasUnchecked = true;
      }
    }

    // Save last task
    if (currentTaskId) {
      tasks.push({
        taskId: currentTaskId,
        completed: hasChecked && !hasUnchecked,
        userStory: currentUserStory ?? undefined,
      });
    }

    this.logger.debug(`Parsed ${tasks.length} tasks from tasks.md`);
    return tasks;
  }

  /**
   * Find all living docs US files for this increment
   */
  private async findLivingDocsUSFiles(): Promise<string[]> {
    // Get feature ID from increment metadata
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      this.incrementId,
      'metadata.json'
    );

    if (!existsSync(metadataPath)) {
      throw new Error(`metadata.json not found: ${metadataPath}`);
    }

    const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
    const featureId = metadata.featureId;

    if (!featureId) {
      this.logger.warn('No featureId in metadata, cannot find living docs');
      return [];
    }

    // Extract feature number from featureId (e.g., "FS-156" → "156")
    const featureMatch = featureId.match(/FS-(\d+)/);
    if (!featureMatch) {
      this.logger.warn(`Invalid featureId format: ${featureId}`);
      return [];
    }

    const featureNum = featureMatch[1];

    // Find US files matching pattern
    const pattern = path.join(
      this.projectRoot,
      `.specweave/docs/internal/specs/**/FS-${featureNum}/us-*.md`
    );

    const files = await glob(pattern);
    this.logger.debug(`Found ${files.length} US files for feature FS-${featureNum}`);

    return files;
  }

  /**
   * Sync a single US file
   */
  private async syncUSFile(
    filePath: string,
    specACs: ACState[],
    taskStates: TaskState[]
  ): Promise<USFileSyncResult> {
    const result: USFileSyncResult = {
      filePath,
      updated: false,
      acsUpdated: 0,
      tasksUpdated: 0,
      statusChanged: false,
    };

    try {
      // Read US file
      const content = await readFile(filePath, 'utf-8');

      // Parse frontmatter to get US-ID
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        result.error = 'No frontmatter found';
        return result;
      }

      const frontmatter = yaml.parse(frontmatterMatch[1]);
      const usId = frontmatter.id; // e.g., "US-001"

      if (!usId) {
        result.error = 'No US ID in frontmatter';
        return result;
      }

      // Filter ACs and tasks for this US
      // Handle both formats: US-001 → AC-US1-01 or AC-US-001-01
      // Extract US number without leading zeros
      const usNum = usId.replace(/^US-0*/, ''); // US-001 → 1, US-023 → 23
      const usACs = specACs.filter(ac =>
        ac.acId.startsWith(`AC-US${usNum}-`) || ac.acId.startsWith(`AC-${usId}-`)
      );
      const usTasks = taskStates.filter(task => task.userStory === usId);

      if (usACs.length === 0) {
        this.logger.debug(`No ACs found for ${usId} in ${path.basename(filePath)}`);
        return result;
      }

      // Update content
      let updatedContent = content;
      let changed = false;

      // Update AC checkboxes
      for (const ac of usACs) {
        const oldPattern = new RegExp(
          `^-\\s+\\[([ x])\\]\\s+\\*{0,2}${escapeRegex(ac.acId)}\\*{0,2}:`,
          'gm'
        );

        const newCheckbox = ac.checked ? '[x]' : '[ ]';

        const beforeUpdate = updatedContent;
        let lastCurrentCheck = ' ';
        updatedContent = updatedContent.replace(oldPattern, (match, currentCheck) => {
          lastCurrentCheck = currentCheck;
          if (currentCheck !== (ac.checked ? 'x' : ' ')) {
            result.acsUpdated++;
            changed = true;
            return match.replace(`[${currentCheck}]`, newCheckbox);
          }
          return match;
        });

        if (updatedContent !== beforeUpdate) {
          this.logger.debug(`  ${ac.acId}: [${lastCurrentCheck}] → ${newCheckbox}`);
        }
      }

      // Update task checkboxes
      for (const task of usTasks) {
        const oldPattern = new RegExp(
          `^-\\s+\\[([ x])\\]\\s+\\*{0,2}${escapeRegex(task.taskId)}\\*{0,2}:`,
          'gm'
        );

        const newCheckbox = task.completed ? '[x]' : '[ ]';

        updatedContent = updatedContent.replace(oldPattern, (match, currentCheck) => {
          if (currentCheck !== (task.completed ? 'x' : ' ')) {
            result.tasksUpdated++;
            changed = true;
            return match.replace(`[${currentCheck}]`, newCheckbox);
          }
          return match;
        });
      }

      // Update status in frontmatter if all ACs complete
      const allACsComplete = usACs.every(ac => ac.checked);
      if (allACsComplete && frontmatter.status !== 'completed') {
        frontmatter.status = 'completed';
        frontmatter.lastModified = new Date().toISOString();

        const newFrontmatter = yaml.stringify(frontmatter);
        updatedContent = updatedContent.replace(
          /^---\n[\s\S]*?\n---/,
          `---\n${newFrontmatter.trim()}\n---`
        );

        result.statusChanged = true;
        changed = true;

        this.logger.log(`  ✅ ${usId}: status → completed`);
      }

      // Write back if changed
      if (changed) {
        result.updated = true;

        if (!this.dryRun) {
          await writeFile(filePath, updatedContent, 'utf-8');
          this.logger.log(
            `  📝 Updated ${path.basename(filePath)}: ${result.acsUpdated} ACs, ${result.tasksUpdated} tasks`
          );
        } else {
          this.logger.log(
            `  📝 [DRY RUN] Would update ${path.basename(filePath)}: ${result.acsUpdated} ACs, ${result.tasksUpdated} tasks`
          );
        }
      }

      return result;
    } catch (error: any) {
      result.error = error.message;
      this.logger.error(`Failed to sync ${path.basename(filePath)}: ${error.message}`);
      return result;
    }
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
