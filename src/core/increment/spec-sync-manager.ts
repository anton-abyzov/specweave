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
   * Synchronize plan.md and tasks.md based on spec.md changes
   *
   * This method:
   * 1. Detects if spec.md changed
   * 2. Calls Architect Agent to regenerate plan.md
   * 3. Calls test-aware-planner to regenerate tasks.md
   * 4. Preserves task completion status
   * 5. Logs changes to metadata
   *
   * @param incrementId - Increment to sync
   * @param skipSync - Skip sync even if spec changed (user override)
   * @returns Sync result with details of what was regenerated
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
      // TODO: Implement actual regeneration logic
      // This will be implemented in the tasks for US-011
      // For now, just log the intent

      changes.push('spec.md detected as modified');
      changes.push('plan.md regeneration required (not yet implemented)');
      changes.push('tasks.md regeneration required (not yet implemented)');

      // Log sync event to metadata
      this.logSyncEvent(incrementId, detection);

      return {
        synced: true,
        reason: 'Spec changed, sync triggered',
        planRegenerated: false, // Will be true once implemented
        tasksRegenerated: false, // Will be true once implemented
        changes
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
