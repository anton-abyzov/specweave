/**
 * SpecSyncManager - Automatic synchronization of plan.md and tasks.md when spec.md changes
 *
 * Purpose: Maintain consistency in spec-driven development by automatically regenerating
 * downstream artifacts (plan.md, tasks.md) when the source of truth (spec.md) is modified.
 *
 * This enforces the SpecWeave principle: spec.md is the source of truth, all other files derive from it.
 *
 * @module spec-sync-manager
 */

import * as fs from 'fs';
import * as path from 'path';
import { MetadataManager } from './metadata-manager.js';

export interface SpecSyncResult {
  synced: boolean;
  reason: string;
  planRegenerated: boolean;
  tasksRegenerated: boolean;
  changes: string[];
  error?: string;
  regenerationContext?: RegenerationContext;
}

export interface RegenerationContext {
  incrementId: string;
  specPath: string;
  planPath: string;
  tasksPath: string;
  specContent: string;
  oldPlanContent?: string;
  oldTasksContent?: string;
  manualAnnotations: ManualAnnotation[];
}

export interface ManualAnnotation {
  type: 'comment' | 'note' | 'todo';
  line: number;
  content: string;
  context: string; // Surrounding context for re-insertion
}

export interface TaskCompletion {
  taskId: string;
  completed: boolean;
  subtasks: SubtaskCompletion[];
}

export interface SubtaskCompletion {
  text: string;
  completed: boolean;
  line: number;
}

export interface SpecChangeDetectionResult {
  specChanged: boolean;
  specModTime: number;
  planModTime: number;
  tasksModTime: number;
  incrementId: string;
  reason: string;
}

export class SpecSyncManager {
  private readonly incrementsDir: string;

  constructor(private readonly projectRoot: string) {
    this.incrementsDir = path.join(projectRoot, '.specweave', 'increments');
  }

  /**
   * Detect if spec.md was modified after plan.md or tasks.md
   *
   * @param incrementId - Increment to check (e.g., "0039-ultra-smart-next-command")
   * @returns Detection result with modification times and reasoning
   */
  detectSpecChange(incrementId: string): SpecChangeDetectionResult {
    const incrementDir = path.join(this.incrementsDir, incrementId);
    const specPath = path.join(incrementDir, 'spec.md');
    const planPath = path.join(incrementDir, 'plan.md');
    const tasksPath = path.join(incrementDir, 'tasks.md');

    // Check if spec.md exists
    if (!fs.existsSync(specPath)) {
      return {
        specChanged: false,
        specModTime: 0,
        planModTime: 0,
        tasksModTime: 0,
        incrementId,
        reason: 'spec.md does not exist'
      };
    }

    // Get modification times
    const specStat = fs.statSync(specPath);
    const specModTime = specStat.mtimeMs;

    // If plan.md doesn't exist, no sync needed (planning phase)
    if (!fs.existsSync(planPath)) {
      return {
        specChanged: false,
        specModTime,
        planModTime: 0,
        tasksModTime: 0,
        incrementId,
        reason: 'plan.md does not exist yet (planning phase)'
      };
    }

    const planStat = fs.statSync(planPath);
    const planModTime = planStat.mtimeMs;

    // Check if tasks.md exists
    const tasksModTime = fs.existsSync(tasksPath)
      ? fs.statSync(tasksPath).mtimeMs
      : 0;

    // Spec changed if it's newer than plan.md
    const specChanged = specModTime > planModTime;

    return {
      specChanged,
      specModTime,
      planModTime,
      tasksModTime,
      incrementId,
      reason: specChanged
        ? `spec.md modified after plan.md (spec: ${new Date(specModTime).toISOString()}, plan: ${new Date(planModTime).toISOString()})`
        : 'spec.md has not changed since plan.md was created'
    };
  }

  /**
   * Get the currently active increment ID
   *
   * @returns Active increment ID or null if none active
   */
  getActiveIncrementId(): string | null {
    try {
      const activeIncrements = MetadataManager.getActive();
      if (activeIncrements.length === 0) {
        return null;
      }

      // Return the first active increment (should only be 1 due to WIP limits)
      return activeIncrements[0].id;
    } catch (error) {
      console.error('Error getting active increment:', error);
      return null;
    }
  }

  /**
   * Extract manual annotations from markdown content
   *
   * Detects HTML comments with keywords: MANUAL NOTE, TODO, NOTE
   *
   * @param content - Markdown content to analyze
   * @param filePath - File path for context
   * @returns Array of manual annotations
   */
  extractManualAnnotations(content: string, filePath: string): ManualAnnotation[] {
    const annotations: ManualAnnotation[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Match HTML comments with manual keywords
      const commentMatch = line.match(/<!--\s*(MANUAL NOTE|TODO|NOTE):\s*([^>]+)\s*-->/);

      if (commentMatch) {
        const keyword = commentMatch[1];
        const text = commentMatch[2].trim();

        annotations.push({
          type: keyword === 'MANUAL NOTE' ? 'note' : keyword.toLowerCase() as 'todo' | 'note',
          line: index + 1,
          content: text,
          context: this.getLineContext(lines, index)
        });
      }
    });

    return annotations;
  }

  /**
   * Get surrounding context for a line (3 lines before and after)
   *
   * @param lines - All file lines
   * @param lineIndex - Index of target line
   * @returns Context string
   */
  private getLineContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 3);
    const end = Math.min(lines.length, lineIndex + 4);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Prepare regeneration context for plan.md and tasks.md
   *
   * @param incrementId - Increment ID
   * @returns Regeneration context with all necessary information
   */
  prepareRegenerationContext(incrementId: string): RegenerationContext | null {
    const incrementDir = path.join(this.incrementsDir, incrementId);
    const specPath = path.join(incrementDir, 'spec.md');
    const planPath = path.join(incrementDir, 'plan.md');
    const tasksPath = path.join(incrementDir, 'tasks.md');

    // Verify spec.md exists
    if (!fs.existsSync(specPath)) {
      return null;
    }

    // Read spec content
    const specContent = fs.readFileSync(specPath, 'utf-8');

    // Read old plan and tasks if they exist
    const oldPlanContent = fs.existsSync(planPath)
      ? fs.readFileSync(planPath, 'utf-8')
      : undefined;

    const oldTasksContent = fs.existsSync(tasksPath)
      ? fs.readFileSync(tasksPath, 'utf-8')
      : undefined;

    // Extract manual annotations from plan.md
    const manualAnnotations = oldPlanContent
      ? this.extractManualAnnotations(oldPlanContent, planPath)
      : [];

    return {
      incrementId,
      specPath,
      planPath,
      tasksPath,
      specContent,
      oldPlanContent,
      oldTasksContent,
      manualAnnotations
    };
  }

  /**
   * Generate diff between old and new plan.md
   *
   * @param oldContent - Original plan.md content
   * @param newContent - Regenerated plan.md content
   * @returns Diff summary with line changes
   */
  generatePlanDiff(oldContent: string, newContent: string): string[] {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const changes: string[] = [];

    // Simple line-based diff
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';

      if (oldLine !== newLine) {
        if (!oldLine) {
          changes.push(`+ Line ${i + 1}: ${newLine}`);
        } else if (!newLine) {
          changes.push(`- Line ${i + 1}: ${oldLine}`);
        } else {
          changes.push(`~ Line ${i + 1}: ${oldLine} → ${newLine}`);
        }
      }
    }

    return changes;
  }

  /**
   * Parse task completion status from tasks.md
   *
   * Extracts which tasks and subtasks are completed
   *
   * @param tasksContent - tasks.md content
   * @returns Array of task completion records
   */
  parseTaskCompletion(tasksContent: string): TaskCompletion[] {
    const completions: TaskCompletion[] = [];
    const lines = tasksContent.split('\n');

    let currentTask: TaskCompletion | null = null;

    lines.forEach((line, index) => {
      // Match task headers: ## T-001: Task name
      const taskHeaderMatch = line.match(/^##\s+(T-\d+):/);

      if (taskHeaderMatch) {
        // Save previous task if exists
        if (currentTask) {
          completions.push(currentTask);
        }

        // Start new task
        currentTask = {
          taskId: taskHeaderMatch[1],
          completed: false,
          subtasks: []
        };
      }

      // Match subtasks: - [x] or - [ ]
      const subtaskMatch = line.match(/^-\s+\[(x| )\]\s+(.+)$/);

      if (subtaskMatch && currentTask) {
        const isCompleted = subtaskMatch[1] === 'x';
        const text = subtaskMatch[2].trim();

        currentTask.subtasks.push({
          text,
          completed: isCompleted,
          line: index + 1
        });

        // Mark task as completed if all subtasks are completed
        if (currentTask.subtasks.every(s => s.completed)) {
          currentTask.completed = true;
        }
      }
    });

    // Add last task
    if (currentTask) {
      completions.push(currentTask);
    }

    return completions;
  }

  /**
   * Generate diff between old and new tasks.md
   *
   * @param oldContent - Original tasks.md content
   * @param newContent - Regenerated tasks.md content
   * @returns Diff summary with task changes
   */
  generateTasksDiff(oldContent: string, newContent: string): string[] {
    const changes: string[] = [];

    // Extract task IDs from both versions
    const oldTaskIds = (oldContent.match(/^## (T-\d+):/gm) || []).map(h =>
      h.replace(/^## (T-\d+):/, '$1')
    );

    const newTaskIds = (newContent.match(/^## (T-\d+):/gm) || []).map(h =>
      h.replace(/^## (T-\d+):/, '$1')
    );

    // Find added tasks
    const addedTasks = newTaskIds.filter(id => !oldTaskIds.includes(id));
    if (addedTasks.length > 0) {
      changes.push(`+ Added ${addedTasks.length} tasks: ${addedTasks.join(', ')}`);
    }

    // Find removed tasks
    const removedTasks = oldTaskIds.filter(id => !newTaskIds.includes(id));
    if (removedTasks.length > 0) {
      changes.push(`- Removed ${removedTasks.length} tasks: ${removedTasks.join(', ')}`);
    }

    // Find preserved tasks
    const preservedTasks = oldTaskIds.filter(id => newTaskIds.includes(id));
    if (preservedTasks.length > 0) {
      changes.push(`~ Preserved ${preservedTasks.length} tasks: ${preservedTasks.join(', ')}`);
    }

    return changes;
  }

  /**
   * Apply completion status from old tasks to new tasks
   *
   * Matches tasks by ID and text similarity, preserves completed checkboxes
   *
   * @param newTasksContent - Regenerated tasks.md content
   * @param oldCompletions - Completion status from old tasks.md
   * @returns Updated tasks.md content with completion status preserved
   */
  applyTaskCompletion(
    newTasksContent: string,
    oldCompletions: TaskCompletion[]
  ): string {
    const lines = newTasksContent.split('\n');
    let currentTaskId: string | null = null;

    const updatedLines = lines.map(line => {
      // Track current task
      const taskHeaderMatch = line.match(/^##\s+(T-\d+):/);
      if (taskHeaderMatch) {
        currentTaskId = taskHeaderMatch[1];
        return line;
      }

      // Update subtask completion status
      const subtaskMatch = line.match(/^(-\s+)\[(x| )\]\s+(.+)$/);

      if (subtaskMatch && currentTaskId) {
        const prefix = subtaskMatch[1];
        const text = subtaskMatch[3].trim();

        // Find old completion for this task
        const oldTask = oldCompletions.find(t => t.taskId === currentTaskId);

        if (oldTask) {
          // Find matching subtask by text similarity
          const matchingSubtask = oldTask.subtasks.find(s =>
            this.isTextSimilar(s.text, text)
          );

          if (matchingSubtask && matchingSubtask.completed) {
            // Preserve completion status
            return `${prefix}[x] ${text}`;
          }
        }
      }

      return line;
    });

    return updatedLines.join('\n');
  }

  /**
   * Check if two text strings are similar (for matching subtasks)
   *
   * Uses simple comparison: exact match or contains
   *
   * @param text1 - First text
   * @param text2 - Second text
   * @returns True if texts are similar
   */
  private isTextSimilar(text1: string, text2: string): boolean {
    const normalized1 = text1.toLowerCase().trim();
    const normalized2 = text2.toLowerCase().trim();

    // Exact match
    if (normalized1 === normalized2) {
      return true;
    }

    // Check if one contains the other (for renamed but similar tasks)
    if (
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Synchronize plan.md and tasks.md based on spec.md changes
   *
   * This method:
   * 1. Detects if spec.md changed
   * 2. Prepares regeneration context
   * 3. Returns context for Claude Code to invoke Architect Agent
   * 4. Preserves manual annotations
   * 5. Logs changes to metadata
   *
   * @param incrementId - Increment to sync
   * @param skipSync - Skip sync even if spec changed (user override)
   * @returns Sync result with regeneration context
   */
  async syncIncrement(
    incrementId: string,
    skipSync: boolean = false
  ): Promise<SpecSyncResult> {
    const detection = this.detectSpecChange(incrementId);

    // No sync needed if spec hasn't changed
    if (!detection.specChanged) {
      return {
        synced: false,
        reason: detection.reason,
        planRegenerated: false,
        tasksRegenerated: false,
        changes: []
      };
    }

    // User requested skip
    if (skipSync) {
      return {
        synced: false,
        reason: 'Sync skipped by user (--skip-sync flag)',
        planRegenerated: false,
        tasksRegenerated: false,
        changes: []
      };
    }

    // Perform sync
    const changes: string[] = [];

    try {
      changes.push('spec.md detected as modified');

      // Prepare regeneration context
      const context = this.prepareRegenerationContext(incrementId);

      if (!context) {
        return {
          synced: false,
          reason: 'Failed to prepare regeneration context',
          planRegenerated: false,
          tasksRegenerated: false,
          changes
        };
      }

      changes.push('Regeneration context prepared');

      if (context.manualAnnotations.length > 0) {
        changes.push(`Found ${context.manualAnnotations.length} manual annotations to preserve`);
      }

      // Log sync event to metadata
      this.logSyncEvent(incrementId, detection);

      return {
        synced: true,
        reason: 'Spec changed, regeneration context prepared',
        planRegenerated: false, // Will be set by command after agent invocation
        tasksRegenerated: false, // Will be set by command after agent invocation
        changes,
        regenerationContext: context
      };
    } catch (error) {
      return {
        synced: false,
        reason: 'Sync failed',
        planRegenerated: false,
        tasksRegenerated: false,
        changes,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Log sync event to increment metadata
   *
   * @param incrementId - Increment ID
   * @param detection - Detection result
   */
  private logSyncEvent(
    incrementId: string,
    detection: SpecChangeDetectionResult
  ): void {
    try {
      const metadataPath = path.join(
        this.incrementsDir,
        incrementId,
        'metadata.json'
      );

      if (!fs.existsSync(metadataPath)) {
        return;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      // Add sync log entry
      if (!metadata.syncEvents) {
        metadata.syncEvents = [];
      }

      metadata.syncEvents.push({
        timestamp: new Date().toISOString(),
        type: 'spec-change-detected',
        specModTime: detection.specModTime,
        planModTime: detection.planModTime,
        tasksModTime: detection.tasksModTime,
        reason: detection.reason
      });

      // Keep only last 10 sync events
      if (metadata.syncEvents.length > 10) {
        metadata.syncEvents = metadata.syncEvents.slice(-10);
      }

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Failed to log sync event:', error);
    }
  }

  /**
   * Check if spec sync is needed for the active increment
   *
   * @returns Detection result or null if no active increment
   */
  checkActiveIncrement(): SpecChangeDetectionResult | null {
    const activeId = this.getActiveIncrementId();
    if (!activeId) {
      return null;
    }

    return this.detectSpecChange(activeId);
  }

  /**
   * Get human-readable sync status message
   *
   * @param detection - Detection result
   * @returns Formatted message for user
   */
  formatSyncMessage(detection: SpecChangeDetectionResult): string {
    if (!detection.specChanged) {
      return ''; // No message needed
    }

    const specTime = new Date(detection.specModTime).toLocaleString();
    const planTime = new Date(detection.planModTime).toLocaleString();

    return `⚠️  SPEC CHANGED - SYNC REQUIRED

Increment: ${detection.incrementId}

📝 spec.md was modified AFTER plan.md was created:
  - spec.md: ${specTime}
  - plan.md: ${planTime}

🔄 Automatic sync will regenerate:
  1. plan.md (using Architect Agent)
  2. tasks.md (using test-aware-planner)

⚡ Task completion status will be preserved

💡 To skip sync: Add --skip-sync flag to your command
📖 Learn more: /specweave:help sync`;
  }
}
