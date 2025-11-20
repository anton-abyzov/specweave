import * as fs from 'fs';
import * as path from 'path';
/**
 * ACStatusManager: Automatically sync spec.md AC checkboxes with tasks.md completion status
 */
export class ACStatusManager {
    constructor(rootPath) {
        this.rootPath = rootPath;
    }
    /**
     * Parse tasks.md and extract AC completion status
     *
     * @param tasksContent - Content of tasks.md file
     * @returns Map of AC-ID to ACCompletionStatus
     */
    parseTasksForACStatus(tasksContent) {
        const acMap = new Map();
        // Regex to match task headers: ### T-###: Task name
        const taskHeaderRegex = /###\s+(T-\d+):/g;
        // Split content by task headers
        const lines = tasksContent.split('\n');
        let currentTaskId = null;
        let currentTaskACs = [];
        let hasCheckedBoxes = false;
        let hasUncheckedBoxes = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check if this is a task header
            const taskMatch = line.match(/###\s+(T-\d+):/);
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
                }
                else if (line.includes('- [x]')) {
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
    addTaskToACMap(acMap, taskId, acIds, isComplete) {
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
            const status = acMap.get(acId);
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
    parseSpecForACs(specContent) {
        const acMap = new Map();
        const lines = specContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Match AC checkbox pattern: - [ ] AC-ID: Description
            // or: - [x] AC-ID: Description
            // Also handles bold format: - [ ] **AC-ID**: Description
            const acMatch = line.match(/^-\s+\[([ x])\]\s+\*{0,2}(AC-[A-Z0-9-]+)\*{0,2}:\s*(.+)/);
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
    async syncACStatus(incrementId) {
        const result = {
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
            }
            else if (!shouldBeChecked && currentlyChecked) {
                // Conflict: AC is [x] but tasks incomplete
                result.conflicts.push(`${acId}: [x] but only ${taskStatus.completedTasks}/${taskStatus.totalTasks} tasks complete (${taskStatus.percentage}%)`);
            }
        }
        // Check for ACs with no tasks
        for (const [acId, specAC] of specACs.entries()) {
            if (!taskACStatuses.has(acId)) {
                if (specAC.checked) {
                    result.warnings.push(`${acId}: [x] but no tasks found (manual verification?)`);
                }
                else {
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
        // Log sync event to metadata.json
        if (result.synced || result.conflicts.length > 0 || result.warnings.length > 0) {
            this.logSyncEvent(incrementId, result);
        }
        return result;
    }
    /**
     * Log AC sync event to metadata.json
     * Keeps last 20 events for audit trail
     *
     * @param incrementId - Increment ID
     * @param result - Sync result to log
     */
    logSyncEvent(incrementId, result) {
        const metadataPath = path.join(this.rootPath, '.specweave', 'increments', incrementId, 'metadata.json');
        try {
            // Read existing metadata
            let metadata = {};
            if (fs.existsSync(metadataPath)) {
                const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
                metadata = JSON.parse(metadataContent);
            }
            // Initialize acSyncEvents array if doesn't exist
            if (!metadata.acSyncEvents) {
                metadata.acSyncEvents = [];
            }
            // Create new event
            const event = {
                timestamp: new Date().toISOString(),
                updated: result.updated,
                conflicts: result.conflicts,
                warnings: result.warnings,
                changesCount: result.updated.length
            };
            // Add event to beginning (newest first)
            metadata.acSyncEvents.unshift(event);
            // Keep only last 20 events (rolling history)
            if (metadata.acSyncEvents.length > 20) {
                metadata.acSyncEvents = metadata.acSyncEvents.slice(0, 20);
            }
            // Update lastActivity timestamp
            metadata.lastActivity = new Date().toISOString();
            // Write updated metadata
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        }
        catch (error) {
            // Non-blocking: Log error but don't fail sync
            console.error('Warning: Failed to log AC sync event to metadata.json', error);
        }
    }
    /**
     * Validate AC-task mapping
     *
     * @param incrementId - Increment ID
     * @returns Validation result
     */
    validateACMapping(incrementId) {
        const result = {
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
    getACCompletionSummary(incrementId) {
        const incrementPath = path.join(this.rootPath, '.specweave', 'increments', incrementId);
        const tasksPath = path.join(incrementPath, 'tasks.md');
        const summary = {
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
            }
            else {
                summary.incompleteACs++;
            }
        }
        summary.percentage = summary.totalACs > 0
            ? Math.round((summary.completeACs / summary.totalACs) * 100)
            : 0;
        return summary;
    }
}
//# sourceMappingURL=ac-status-manager.js.map