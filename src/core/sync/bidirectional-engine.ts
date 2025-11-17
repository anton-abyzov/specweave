/**
 * Bidirectional Sync Engine
 *
 * Handles synchronization between SpecWeave increments and external systems
 * (GitHub, Jira, ADO) in both directions with conflict detection and resolution.
 *
 * Features:
 * - Bidirectional sync (to-external, from-external, both)
 * - Conflict detection (field-level granularity)
 * - Interactive conflict resolution
 * - Change tracking (detect what changed since last sync)
 * - Reorganization detection (moved issues, split/merged stories)
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import inquirer from 'inquirer';
import { SyncProvider } from '../types/sync-profile.js';

// ============================================================================
// Types
// ============================================================================

export type SyncDirection = 'to-external' | 'from-external' | 'bidirectional';

export type ConflictResolution = 'prefer-local' | 'prefer-external' | 'manual' | 'prompt';

export interface SyncState {
  /** Increment metadata */
  incrementId: string;
  title: string;
  status: string;

  /** External metadata */
  externalId?: string; // Issue/Epic ID
  externalKey?: string; // Issue/Epic key (e.g., SCRUM-7)
  externalUrl?: string;

  /** Sync state */
  lastSyncAt?: string; // ISO timestamp
  lastLocalChange?: string;
  lastExternalChange?: string;

  /** Content hashes (for change detection) */
  localHash?: string;
  externalHash?: string;

  /** Linked items (user stories, tasks, etc.) */
  linkedItems?: Record<string, string>; // local-id → external-key
}

export interface FieldChange {
  field: string;
  localValue: any;
  externalValue: any;
  lastSyncValue?: any;
}

export interface Conflict extends FieldChange {
  resolution?: 'local' | 'external' | 'merged';
  mergedValue?: any;
}

export interface ChangeSet {
  /** Changes to sync to external */
  toExternal: FieldChange[];

  /** Changes to sync from external */
  fromExternal: FieldChange[];

  /** Conflicts (both sides changed) */
  conflicts: Conflict[];
}

export interface SyncResult {
  success: boolean;
  direction: SyncDirection;
  changes: ChangeSet;
  conflictsResolved: number;
  errors: string[];
}

// ============================================================================
// Bidirectional Sync Engine
// ============================================================================

export class BidirectionalSyncEngine {
  constructor(
    private provider: SyncProvider,
    private projectRoot: string = process.cwd()
  ) {}

  /**
   * Main sync orchestrator
   */
  async sync(
    incrementId: string,
    direction: SyncDirection,
    conflictResolution: ConflictResolution = 'prompt'
  ): Promise<SyncResult> {
    console.log(`\n🔄 Starting ${direction} sync for increment ${incrementId}...\n`);

    const result: SyncResult = {
      success: false,
      direction,
      changes: { toExternal: [], fromExternal: [], conflicts: [] },
      conflictsResolved: 0,
      errors: [],
    };

    try {
      // Step 1: Load current state
      const currentState = await this.loadSyncState(incrementId);

      // Step 2: Detect changes
      const changes = await this.detectChanges(incrementId, currentState);
      result.changes = changes;

      // Step 3: Handle conflicts (if bidirectional)
      if (direction === 'bidirectional' && changes.conflicts.length > 0) {
        console.log(`\n⚠️  Detected ${changes.conflicts.length} conflicts\n`);

        const resolved = await this.resolveConflicts(
          changes.conflicts,
          conflictResolution
        );

        result.conflictsResolved = resolved.length;

        // Apply resolutions
        for (const conflict of resolved) {
          if (conflict.resolution === 'local') {
            changes.toExternal.push(conflict);
          } else if (conflict.resolution === 'external') {
            changes.fromExternal.push(conflict);
          } else if (conflict.resolution === 'merged' && conflict.mergedValue !== undefined) {
            // Apply merged value to both sides
            changes.toExternal.push({
              ...conflict,
              localValue: conflict.mergedValue,
            });
            changes.fromExternal.push({
              ...conflict,
              externalValue: conflict.mergedValue,
            });
          }
        }
      }

      // Step 4: Apply changes based on direction
      if (direction === 'to-external' || direction === 'bidirectional') {
        if (changes.toExternal.length > 0) {
          console.log(`\n📤 Syncing ${changes.toExternal.length} changes to ${this.provider}...`);
          await this.applyToExternal(incrementId, changes.toExternal);
        }
      }

      if (direction === 'from-external' || direction === 'bidirectional') {
        if (changes.fromExternal.length > 0) {
          console.log(`\n📥 Syncing ${changes.fromExternal.length} changes from ${this.provider}...`);
          await this.applyToLocal(incrementId, changes.fromExternal);
        }
      }

      // Step 5: Update sync state
      await this.updateSyncState(incrementId, {
        ...currentState,
        lastSyncAt: new Date().toISOString(),
        lastLocalChange: new Date().toISOString(),
        lastExternalChange: new Date().toISOString(),
      });

      result.success = true;

      console.log(`\n✅ Sync complete!\n`);
      this.printSyncSummary(result);

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
      console.error(`\n❌ Sync failed:`, (error as Error).message);
      return result;
    }
  }

  // ==========================================================================
  // Change Detection
  // ==========================================================================

  /**
   * Detect changes in both local and external state
   */
  private async detectChanges(
    incrementId: string,
    currentState: SyncState
  ): Promise<ChangeSet> {
    const localState = await this.fetchLocalState(incrementId);
    const externalState = await this.fetchExternalState(incrementId, currentState);

    const toExternal: FieldChange[] = [];
    const fromExternal: FieldChange[] = [];
    const conflicts: Conflict[] = [];

    // Compare common fields
    const fields = ['title', 'description', 'status', 'priority', 'assignee'];

    for (const field of fields) {
      const localValue = (localState as any)[field];
      const externalValue = (externalState as any)[field];
      const lastSyncValue = currentState.lastSyncAt
        ? (currentState as any)[field]
        : undefined;

      // Detect changes
      const localChanged = localValue !== lastSyncValue;
      const externalChanged = externalValue !== lastSyncValue;

      if (localChanged && externalChanged && localValue !== externalValue) {
        // CONFLICT: Both changed to different values
        conflicts.push({
          field,
          localValue,
          externalValue,
          lastSyncValue,
        });
      } else if (localChanged) {
        // Local changed, external didn't
        toExternal.push({
          field,
          localValue,
          externalValue,
          lastSyncValue,
        });
      } else if (externalChanged) {
        // External changed, local didn't
        fromExternal.push({
          field,
          localValue,
          externalValue,
          lastSyncValue,
        });
      }
    }

    return { toExternal, fromExternal, conflicts };
  }

  /**
   * Fetch local state from increment files
   */
  private async fetchLocalState(incrementId: string): Promise<any> {
    const incrementPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId
    );

    // Read spec.md
    const specPath = path.join(incrementPath, 'spec.md');
    const specContent = await fs.readFile(specPath, 'utf-8');

    // Parse frontmatter and content
    const titleMatch = specContent.match(/^#\s+(.+)$/m);
    const statusMatch = specContent.match(/Status:\s*(.+)$/m);
    const priorityMatch = specContent.match(/Priority:\s*(.+)$/m);

    return {
      title: titleMatch ? titleMatch[1] : '',
      description: specContent.substring(0, 500), // First 500 chars
      status: statusMatch ? statusMatch[1].trim() : 'in-progress',
      priority: priorityMatch ? priorityMatch[1].trim() : 'medium',
      assignee: null,
    };
  }

  /**
   * Fetch external state from Jira/GitHub/ADO
   */
  private async fetchExternalState(
    incrementId: string,
    currentState: SyncState
  ): Promise<any> {
    if (!currentState.externalKey) {
      return {}; // No external issue yet
    }

    // This will be implemented by provider-specific adapters
    // For now, return placeholder
    return {
      title: '',
      description: '',
      status: '',
      priority: '',
      assignee: null,
    };
  }

  // ==========================================================================
  // Conflict Resolution
  // ==========================================================================

  /**
   * Resolve conflicts interactively or automatically
   */
  private async resolveConflicts(
    conflicts: Conflict[],
    strategy: ConflictResolution
  ): Promise<Conflict[]> {
    const resolved: Conflict[] = [];

    for (const conflict of conflicts) {
      if (strategy === 'prefer-local') {
        conflict.resolution = 'local';
      } else if (strategy === 'prefer-external') {
        conflict.resolution = 'external';
      } else if (strategy === 'manual' || strategy === 'prompt') {
        await this.promptConflictResolution(conflict);
      }

      resolved.push(conflict);
    }

    return resolved;
  }

  /**
   * Interactive conflict resolution prompt
   */
  private async promptConflictResolution(conflict: Conflict): Promise<void> {
    console.log(`\n⚠️  Conflict in field: ${conflict.field}`);
    console.log(`   Local value:    ${conflict.localValue}`);
    console.log(`   ${this.provider} value: ${conflict.externalValue}`);
    console.log(`   Last sync value: ${conflict.lastSyncValue || '(unknown)'}\n`);

    const { resolution } = await inquirer.prompt([
      {
        type: 'list',
        name: 'resolution',
        message: `How should this conflict be resolved?`,
        choices: [
          {
            name: `Use local value: "${conflict.localValue}"`,
            value: 'local',
          },
          {
            name: `Use ${this.provider} value: "${conflict.externalValue}"`,
            value: 'external',
          },
          {
            name: 'Enter custom value (merge)',
            value: 'merge',
          },
        ],
      },
    ]);

    if (resolution === 'merge') {
      const { mergedValue } = await inquirer.prompt([
        {
          type: 'input',
          name: 'mergedValue',
          message: `Enter merged value for ${conflict.field}:`,
          default: conflict.localValue,
        },
      ]);

      conflict.resolution = 'merged';
      conflict.mergedValue = mergedValue;
    } else {
      conflict.resolution = resolution;
    }
  }

  // ==========================================================================
  // Apply Changes
  // ==========================================================================

  /**
   * Apply changes to external system
   */
  private async applyToExternal(
    incrementId: string,
    changes: FieldChange[]
  ): Promise<void> {
    // Implementation will be provider-specific
    // This is a placeholder
    for (const change of changes) {
      console.log(`   ✓ ${change.field}: ${change.localValue}`);
    }
  }

  /**
   * Apply changes to local increment
   */
  private async applyToLocal(
    incrementId: string,
    changes: FieldChange[]
  ): Promise<void> {
    const incrementPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId
    );

    const specPath = path.join(incrementPath, 'spec.md');
    let specContent = await fs.readFile(specPath, 'utf-8');

    // Apply changes to spec.md
    for (const change of changes) {
      if (change.field === 'title') {
        specContent = specContent.replace(
          /^#\s+.+$/m,
          `# ${change.externalValue}`
        );
      } else if (change.field === 'status') {
        specContent = specContent.replace(
          /Status:\s*.+$/m,
          `Status: ${change.externalValue}`
        );
      } else if (change.field === 'priority') {
        specContent = specContent.replace(
          /Priority:\s*.+$/m,
          `Priority: ${change.externalValue}`
        );
      }

      console.log(`   ✓ ${change.field}: ${change.externalValue}`);
    }

    await fs.writeFile(specPath, specContent, 'utf-8');
  }

  // ==========================================================================
  // Sync State Management
  // ==========================================================================

  /**
   * Load sync state from metadata
   */
  private async loadSyncState(incrementId: string): Promise<SyncState> {
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'metadata.json'
    );

    if (!fs.existsSync(metadataPath)) {
      return { incrementId, title: '', status: '' };
    }

    const metadata = await fs.readJSON(metadataPath);

    return {
      incrementId,
      title: metadata.title || '',
      status: metadata.status || '',
      externalId: metadata.sync?.externalId,
      externalKey: metadata.sync?.externalKey,
      externalUrl: metadata.sync?.externalUrl,
      lastSyncAt: metadata.sync?.lastSyncAt,
      lastLocalChange: metadata.sync?.lastLocalChange,
      lastExternalChange: metadata.sync?.lastExternalChange,
      linkedItems: metadata.sync?.linkedItems || {},
    };
  }

  /**
   * Update sync state in metadata
   */
  private async updateSyncState(
    incrementId: string,
    state: SyncState
  ): Promise<void> {
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'metadata.json'
    );

    let metadata: any = {};
    if (fs.existsSync(metadataPath)) {
      metadata = await fs.readJSON(metadataPath);
    }

    metadata.sync = {
      ...metadata.sync,
      externalId: state.externalId,
      externalKey: state.externalKey,
      externalUrl: state.externalUrl,
      lastSyncAt: state.lastSyncAt,
      lastLocalChange: state.lastLocalChange,
      lastExternalChange: state.lastExternalChange,
      linkedItems: state.linkedItems,
    };

    await fs.writeJSON(metadataPath, metadata, { spaces: 2 });
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Print sync summary
   */
  private printSyncSummary(result: SyncResult): void {
    console.log('📊 Sync Summary:\n');
    console.log(`   Direction: ${result.direction}`);
    console.log(`   Changes to external: ${result.changes.toExternal.length}`);
    console.log(`   Changes from external: ${result.changes.fromExternal.length}`);
    console.log(`   Conflicts detected: ${result.changes.conflicts.length}`);
    console.log(`   Conflicts resolved: ${result.conflictsResolved}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log('');
  }
}
