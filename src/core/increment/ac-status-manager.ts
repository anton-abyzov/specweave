import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents the completion status of an Acceptance Criteria
 */
export interface ACCompletionStatus {
  acId: string;           // e.g., "AC-US11-01"
  totalTasks: number;     // Total number of tasks referencing this AC
  completedTasks: number; // Number of completed tasks
  percentage: number;     // Completion percentage (0-100)
  isComplete: boolean;    // true if percentage === 100
  tasks: string[];        // Array of task IDs (e.g., ["T-001", "T-002"])
}

/**
 * Represents an Acceptance Criteria definition in spec.md
 */
export interface ACDefinition {
  acId: string;           // e.g., "AC-US11-01"
  description: string;    // AC description text
  checked: boolean;       // Current checkbox state (true = [x], false = [ ])
  lineNumber: number;     // Line number in spec.md (for updates)
  fullLine: string;       // Complete line content
}

/**
 * Result of syncing AC status
 */
export interface ACSyncResult {
  synced: boolean;
  updated: string[];      // Array of AC-IDs that were updated
  conflicts: string[];    // Array of conflict messages
  warnings: string[];     // Array of warning messages
  changes: string[];      // Array of change descriptions
}

/**
 * Validation result for AC-task mapping
 */
export interface ValidationResult {
  valid: boolean;
  orphanedACs: string[];      // ACs with no tasks
  invalidReferences: string[]; // Task AC references not in spec.md
  errors: string[];
}

/**
 * AC completion summary
 */
export interface ACCompletionSummary {
  totalACs: number;
  completeACs: number;
  incompleteACs: number;
  percentage: number;
  acStatuses: Map<string, ACCompletionStatus>;
}

/**
 * ACStatusManager: Automatically sync spec.md AC checkboxes with tasks.md completion status
 */
export class ACStatusManager {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Parse tasks.md and extract AC completion status
   *
   * @param tasksContent - Content of tasks.md file
   * @returns Map of AC-ID to ACCompletionStatus
   */
  parseTasksForACStatus(tasksContent: string): Map<string, ACCompletionStatus> {
    const acMap = new Map<string, ACCompletionStatus>();

    // Regex to match task headers: #### T-###: Task name
    const taskHeaderRegex = /####\s+(T-\d+):/g;

    // Split content by task headers
    const lines = tasksContent.split('\n');
    let currentTaskId: string | null = null;
    let currentTaskACs: string[] = [];
    let hasCheckedBoxes = false;
    let hasUncheckedBoxes = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this is a task header
      const taskMatch = line.match(/####\s+(T-\d+):/);
      if (taskMatch) {
        // Process previous task if exists
        if (currentTaskId && currentTaskACs.length > 0) {
          // Task is complete if it has at least one [x] and no [ ]
          const currentTaskComplete = hasCheckedBoxes && !hasUncheckedBoxes;
          this.addTaskToACMap(acMap, currentTaskId, currentTaskACs, currentTaskComplete);
        }

        // Start new task
        currentTaskId = taskMatch[1];
        currentTaskACs = [];
        hasCheckedBoxes = false;
        hasUncheckedBoxes = false;
        continue;
      }

      // Check if this line contains AC tags
      const acMatch = line.match(/\*\*AC\*\*:\s*(.+)/);
      if (acMatch && currentTaskId) {
        // Extract AC-IDs (can be comma or space separated)
        const acText = acMatch[1].trim();
        const acIds = acText
          .split(/[,\s]+/)
          .map(id => id.trim())
          .filter(id => id.startsWith('AC-'));

        currentTaskACs.push(...acIds);
        continue;
      }

      // Check task completion status
      if (currentTaskId && line.includes('- [')) {
        if (line.includes('- [ ]')) {
          hasUncheckedBoxes = true;
        } else if (line.includes('- [x]')) {
          hasCheckedBoxes = true;
        }
      }
    }

    // Process last task
    if (currentTaskId && currentTaskACs.length > 0) {
      const currentTaskComplete = hasCheckedBoxes && !hasUncheckedBoxes;
      this.addTaskToACMap(acMap, currentTaskId, currentTaskACs, currentTaskComplete);
    }

    return acMap;
  }

  /**
   * Helper method to add a task to the AC map
   */
  private addTaskToACMap(
    acMap: Map<string, ACCompletionStatus>,
    taskId: string,
    acIds: string[],
    isComplete: boolean
  ): void {
    for (const acId of acIds) {
      if (!acMap.has(acId)) {
        acMap.set(acId, {
          acId,
          totalTasks: 0,
          completedTasks: 0,
          percentage: 0,
          isComplete: false,
          tasks: []
        });
      }

      const status = acMap.get(acId)!;
      status.totalTasks++;
      if (isComplete) {
        status.completedTasks++;
      }
      status.tasks.push(taskId);

      // Calculate percentage
      status.percentage = status.totalTasks > 0
        ? Math.round((status.completedTasks / status.totalTasks) * 100 * 100) / 100
        : 0;

      // Update isComplete flag
      status.isComplete = status.percentage === 100;
    }
  }

  /**
   * Parse spec.md and extract AC checkboxes
   *
   * @param specContent - Content of spec.md file
   * @returns Map of AC-ID to ACDefinition
   */
  parseSpecForACs(specContent: string): Map<string, ACDefinition> {
    const acMap = new Map<string, ACDefinition>();

    const lines = specContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match AC checkbox pattern: - [ ] AC-ID: Description
      // or: - [x] AC-ID: Description
      const acMatch = line.match(/^-\s+\[([ x])\]\s+(AC-[A-Z0-9-]+):\s*(.+)/);

      if (acMatch) {
        const checked = acMatch[1] === 'x';
        const acId = acMatch[2];
        const description = acMatch[3].trim();

        acMap.set(acId, {
          acId,
          description,
          checked,
          lineNumber: i + 1, // 1-indexed
          fullLine: line
        });
      }
    }

    return acMap;
  }

  /**
   * Sync AC status from tasks.md to spec.md
   *
   * @param incrementId - Increment ID (e.g., "0039")
   * @returns Result of sync operation
   */
  async syncACStatus(incrementId: string): Promise<ACSyncResult> {
    const result: ACSyncResult = {
      synced: false,
      updated: [],
      conflicts: [],
      warnings: [],
      changes: []
    };

    // Paths
    const incrementPath = path.join(this.rootPath, '.specweave', 'increments', incrementId);
    const specPath = path.join(incrementPath, 'spec.md');
    const tasksPath = path.join(incrementPath, 'tasks.md');

    // Check files exist
    if (!fs.existsSync(specPath)) {
      result.warnings.push('spec.md does not exist');
      return result;
    }

    if (!fs.existsSync(tasksPath)) {
      result.warnings.push('tasks.md does not exist');
      return result;
    }

    // Read files
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');

    // Parse both files
    const taskACStatuses = this.parseTasksForACStatus(tasksContent);
    const specACs = this.parseSpecForACs(specContent);

    // Sync logic
    const specLines = specContent.split('\n');
    let updated = false;

    for (const [acId, taskStatus] of taskACStatuses.entries()) {
      const specAC = specACs.get(acId);

      if (!specAC) {
        result.warnings.push(`${acId} referenced in tasks.md but not found in spec.md`);
        continue;
      }

      // Check if status should change
      const shouldBeChecked = taskStatus.isComplete;
      const currentlyChecked = specAC.checked;

      if (shouldBeChecked && !currentlyChecked) {
        // Update from [ ] to [x]
        const oldLine = specLines[specAC.lineNumber - 1];
        const newLine = oldLine.replace('- [ ]', '- [x]');
        specLines[specAC.lineNumber - 1] = newLine;

        result.updated.push(acId);
        result.changes.push(`${acId}: [ ] → [x] (${taskStatus.completedTasks}/${taskStatus.totalTasks} tasks complete)`);
        updated = true;
      } else if (!shouldBeChecked && currentlyChecked) {
        // Conflict: AC is [x] but tasks incomplete
        result.conflicts.push(
          `${acId}: [x] but only ${taskStatus.completedTasks}/${taskStatus.totalTasks} tasks complete (${taskStatus.percentage}%)`
        );
      }
    }

    // Check for ACs with no tasks
    for (const [acId, specAC] of specACs.entries()) {
      if (!taskACStatuses.has(acId)) {
        if (specAC.checked) {
          result.warnings.push(`${acId}: [x] but no tasks found (manual verification?)`);
        } else {
          result.warnings.push(`${acId}: has no tasks mapped`);
        }
      }
    }

    // Write updated spec.md
    if (updated) {
      const newSpecContent = specLines.join('\n');
      fs.writeFileSync(specPath, newSpecContent, 'utf-8');
      result.synced = true;
    }

    return result;
  }

  /**
   * Validate AC-task mapping
   *
   * @param incrementId - Increment ID
   * @returns Validation result
   */
  validateACMapping(incrementId: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      orphanedACs: [],
      invalidReferences: [],
      errors: []
    };

    const incrementPath = path.join(this.rootPath, '.specweave', 'increments', incrementId);
    const specPath = path.join(incrementPath, 'spec.md');
    const tasksPath = path.join(incrementPath, 'tasks.md');

    // Check files exist
    if (!fs.existsSync(specPath)) {
      result.errors.push('spec.md does not exist');
      result.valid = false;
      return result;
    }

    if (!fs.existsSync(tasksPath)) {
      result.errors.push('tasks.md does not exist');
      result.valid = false;
      return result;
    }

    // Read and parse
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');

    const taskACStatuses = this.parseTasksForACStatus(tasksContent);
    const specACs = this.parseSpecForACs(specContent);

    // Find orphaned ACs (in spec but no tasks)
    for (const acId of specACs.keys()) {
      if (!taskACStatuses.has(acId)) {
        result.orphanedACs.push(acId);
        result.valid = false;
      }
    }

    // Find invalid references (in tasks but not in spec)
    for (const acId of taskACStatuses.keys()) {
      if (!specACs.has(acId)) {
        result.invalidReferences.push(acId);
        result.valid = false;
      }
    }

    return result;
  }

  /**
   * Get AC completion summary
   *
   * @param incrementId - Increment ID
   * @returns Summary of AC completion status
   */
  getACCompletionSummary(incrementId: string): ACCompletionSummary {
    const incrementPath = path.join(this.rootPath, '.specweave', 'increments', incrementId);
    const tasksPath = path.join(incrementPath, 'tasks.md');

    const summary: ACCompletionSummary = {
      totalACs: 0,
      completeACs: 0,
      incompleteACs: 0,
      percentage: 0,
      acStatuses: new Map()
    };

    if (!fs.existsSync(tasksPath)) {
      return summary;
    }

    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    const acStatuses = this.parseTasksForACStatus(tasksContent);

    summary.acStatuses = acStatuses;
    summary.totalACs = acStatuses.size;

    for (const status of acStatuses.values()) {
      if (status.isComplete) {
        summary.completeACs++;
      } else {
        summary.incompleteACs++;
      }
    }

    summary.percentage = summary.totalACs > 0
      ? Math.round((summary.completeACs / summary.totalACs) * 100)
      : 0;

    return summary;
  }
}
