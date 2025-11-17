/**
 * Increment Detector
 *
 * Auto-detects active increment when not explicitly specified.
 * Prefers PLANNING status, falls back to ACTIVE if WIP=1.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import { MetadataManager } from '../../../core/increment/metadata-manager.js';
import { IncrementStatus } from '../../../core/types/increment-metadata.js';
import { IncrementDetectionResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export class IncrementDetector {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Auto-detect increment to plan
   * Priority: PLANNING status > single ACTIVE increment
   */
  async detect(): Promise<IncrementDetectionResult> {
    const incrementsDir = path.join(this.projectRoot, '.specweave/increments');

    // Check if increments directory exists
    if (!fs.existsSync(incrementsDir)) {
      return {
        success: false,
        reason: 'No .specweave/increments directory found. Run `specweave init` first.',
        candidates: []
      };
    }

    // Get all increment directories
    const allIncrements = fs.readdirSync(incrementsDir)
      .filter(dir => {
        const fullPath = path.join(incrementsDir, dir);
        return fs.statSync(fullPath).isDirectory() && /^\d{4}-/.test(dir);
      });

    if (allIncrements.length === 0) {
      return {
        success: false,
        reason: 'No increments found. Create an increment with `/specweave:increment` first.',
        candidates: []
      };
    }

    // Filter to PLANNING and ACTIVE increments
    const planningIncrements: string[] = [];
    const activeIncrements: string[] = [];

    for (const incrementId of allIncrements) {
      try {
        const metadata = MetadataManager.read(incrementId);

        if (metadata.status === IncrementStatus.PLANNING) {
          planningIncrements.push(incrementId);
        } else if (metadata.status === IncrementStatus.ACTIVE) {
          activeIncrements.push(incrementId);
        }
      } catch (error) {
        // Skip increments with invalid metadata
        continue;
      }
    }

    // Priority 1: Single PLANNING increment
    if (planningIncrements.length === 1) {
      return {
        success: true,
        incrementId: planningIncrements[0],
        reason: `Auto-detected increment in PLANNING status: ${planningIncrements[0]}`,
        candidates: planningIncrements
      };
    }

    // Priority 2: Multiple PLANNING increments (error - user must specify)
    if (planningIncrements.length > 1) {
      return {
        success: false,
        reason: `Multiple increments in PLANNING status found. Please specify which one to plan:\n${planningIncrements.map(id => `  - ${id}`).join('\n')}`,
        candidates: planningIncrements
      };
    }

    // Priority 3: Single ACTIVE increment (if WIP=1)
    if (activeIncrements.length === 1) {
      return {
        success: true,
        incrementId: activeIncrements[0],
        reason: `Auto-detected single ACTIVE increment: ${activeIncrements[0]}`,
        candidates: activeIncrements
      };
    }

    // Priority 4: Multiple ACTIVE increments (error - user must specify)
    if (activeIncrements.length > 1) {
      return {
        success: false,
        reason: `Multiple ACTIVE increments found. Please specify which one to plan:\n${activeIncrements.map(id => `  - ${id}`).join('\n')}`,
        candidates: activeIncrements
      };
    }

    // No suitable increments found
    return {
      success: false,
      reason: 'No PLANNING or ACTIVE increments found. Create an increment with `/specweave:increment` first.',
      candidates: []
    };
  }

  /**
   * Validate that specified increment exists and is in suitable state
   */
  async validate(incrementId: string): Promise<IncrementDetectionResult> {
    const incrementPath = path.join(this.projectRoot, '.specweave/increments', incrementId);

    // Check if increment exists
    if (!fs.existsSync(incrementPath)) {
      return {
        success: false,
        reason: `Increment '${incrementId}' not found. Available increments:\n${this.listAvailableIncrements().map(id => `  - ${id}`).join('\n')}`,
        candidates: this.listAvailableIncrements()
      };
    }

    // Read metadata
    try {
      const metadata = MetadataManager.read(incrementId);

      // Check if increment is in suitable state
      if (metadata.status === IncrementStatus.COMPLETED ||
          metadata.status === IncrementStatus.ABANDONED) {
        return {
          success: false,
          reason: `Increment '${incrementId}' is ${metadata.status}. Cannot generate plan for closed increments.`,
          candidates: []
        };
      }

      return {
        success: true,
        incrementId,
        reason: `Validated increment '${incrementId}' (status: ${metadata.status})`,
        candidates: [incrementId]
      };
    } catch (error) {
      return {
        success: false,
        reason: `Failed to read metadata for increment '${incrementId}': ${error instanceof Error ? error.message : String(error)}`,
        candidates: []
      };
    }
  }

  /**
   * List all available increments
   */
  private listAvailableIncrements(): string[] {
    const incrementsDir = path.join(this.projectRoot, '.specweave/increments');

    if (!fs.existsSync(incrementsDir)) {
      return [];
    }

    return fs.readdirSync(incrementsDir)
      .filter(dir => {
        const fullPath = path.join(incrementsDir, dir);
        return fs.statSync(fullPath).isDirectory() && /^\d{4}-/.test(dir);
      })
      .sort();
  }
}
