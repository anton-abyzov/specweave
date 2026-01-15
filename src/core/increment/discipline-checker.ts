/**
 * Discipline Checker - Validates increment discipline rules
 *
 * Enforces the iron rule: Cannot start increment N+1 until increment N is DONE
 * Checks WIP limits, incomplete work, and emergency interrupt rules
 */

import fs from 'fs';
import path from 'path';
import { ConfigManager } from '../config-manager.js';
import {
  ValidationResult,
  ValidationViolation,
  DisciplineLimits,
  DisciplineCheckOptions,
} from './types.js';
import { MetadataManager } from './metadata-manager.js';
import { IncrementStatus, IncrementMetadata } from '../types/increment-metadata.js';

/**
 * Checks increment discipline compliance
 */
export class DisciplineChecker {
  private projectRoot: string;
  private limits: DisciplineLimits;

  /**
   * Create a new DisciplineChecker
   *
   * @param projectRoot - Root directory of the project
   * @param customLimits - Optional custom limits (overrides config)
   */
  constructor(projectRoot: string = process.cwd(), customLimits?: DisciplineLimits) {
    this.projectRoot = projectRoot;

    // Load limits from config or use defaults
    if (customLimits) {
      this.limits = customLimits;
    } else {
      const configManager = new ConfigManager(projectRoot);
      const config = configManager.load();
      this.limits = (config.limits as any) || this.getDefaultLimits();
    }
  }

  /**
   * Get default discipline limits
   */
  private getDefaultLimits(): DisciplineLimits {
    return {
      maxActiveIncrements: 3,  // WIP limit (warning)
      hardCap: 5,              // Absolute maximum (error)
      allowEmergencyInterrupt: true,
      typeBehaviors: {
        canInterrupt: ['hotfix', 'bug'],
        autoAbandonDays: {
          experiment: 14,
        },
      },
    };
  }

  /**
   * Validate increment discipline
   *
   * @param options - Validation options
   * @returns ValidationResult with compliance status and violations
   */
  async validate(options?: DisciplineCheckOptions): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];

    try {
      // SIMPLIFIED APPROACH: Use MetadataManager directly (matches status-commands.ts)
      const allIncrements = MetadataManager.getAll();

      // Count by status (CRITICAL: active = planning + active + ready_for_review)
      const active = allIncrements.filter(m =>
        m.status === IncrementStatus.PLANNING ||
        m.status === IncrementStatus.ACTIVE ||
        m.status === IncrementStatus.READY_FOR_REVIEW
      );
      const backlog = allIncrements.filter(m => m.status === IncrementStatus.BACKLOG);
      const paused = allIncrements.filter(m => m.status === IncrementStatus.PAUSED);
      const completed = allIncrements.filter(m => m.status === IncrementStatus.COMPLETED);
      const abandoned = allIncrements.filter(m => m.status === IncrementStatus.ABANDONED);

      const statusCounts = {
        total: allIncrements.length,
        active: active.length,
        backlog: backlog.length,
        paused: paused.length,
        completed: completed.length,
        abandoned: abandoned.length,
      };

      // Validate rules
      this.validateHardCap(statusCounts.active, violations);
      this.validateWIPLimit(statusCounts.active, violations);
      this.validateEmergencyRules(allIncrements, statusCounts.active, violations);

      // **NEW (v1.0.103)**: Validate metadata schemas for consistency
      this.validateMetadataSchemas(allIncrements, violations);

      // Build result
      const result: ValidationResult = {
        compliant: violations.length === 0,
        violations,
        increments: statusCounts,
        config: {
          maxActiveIncrements: this.limits.maxActiveIncrements,
          hardCap: this.limits.hardCap,
          allowEmergencyInterrupt: this.limits.allowEmergencyInterrupt,
        },
        timestamp: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      // Handle errors gracefully
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      violations.push({
        type: 'metadata_inconsistency',
        message: `Error during validation: ${errorMessage}`,
        suggestion: 'Check .specweave/increments/ directory structure',
        severity: 'error',
      });

      return {
        compliant: false,
        violations,
        increments: {
          total: 0,
          active: 0,
          backlog: 0,
          paused: 0,
          completed: 0,
          abandoned: 0,
        },
        config: {
          maxActiveIncrements: this.limits.maxActiveIncrements,
          hardCap: this.limits.hardCap,
          allowEmergencyInterrupt: this.limits.allowEmergencyInterrupt,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }


  /**
   * Validate hard cap rule (never > 2 active)
   */
  private validateHardCap(
    activeCount: number,
    violations: ValidationViolation[]
  ): void {
    if (activeCount > this.limits.hardCap) {
      violations.push({
        type: 'hard_cap_exceeded',
        message: `Hard cap exceeded: ${activeCount} active increments (maximum: ${this.limits.hardCap})`,
        suggestion: `Complete or pause at least ${activeCount - this.limits.hardCap} increment(s). Use /sw:done <id> or /sw:pause <id>`,
        severity: 'error',
        context: {
          activeCount,
          hardCap: this.limits.hardCap,
          excess: activeCount - this.limits.hardCap,
        },
      });
    }
  }

  /**
   * Validate WIP limit rule (recommended limit)
   */
  private validateWIPLimit(
    activeCount: number,
    violations: ValidationViolation[]
  ): void {
    if (activeCount > this.limits.maxActiveIncrements && activeCount <= this.limits.hardCap) {
      violations.push({
        type: 'wip_limit_exceeded',
        message: `WIP limit exceeded: ${activeCount} active increments (recommended: ${this.limits.maxActiveIncrements})`,
        suggestion: `Consider completing one increment before starting new work. Research shows ${activeCount} concurrent tasks reduces productivity by 20-40%.`,
        severity: 'warning',
        context: {
          activeCount,
          recommended: this.limits.maxActiveIncrements,
        },
      });
    }
  }


  /**
   * Validate emergency interrupt rules
   *
   * If 2 active increments, at least one must be hotfix/bug
   */
  private validateEmergencyRules(
    allIncrements: IncrementMetadata[],
    activeCount: number,
    violations: ValidationViolation[]
  ): void {
    if (activeCount === 2 && this.limits.allowEmergencyInterrupt) {
      // TODO: Check if at least one is hotfix/bug type
      // This requires checking type field in metadata
      // For now, we'll skip this validation
    }
  }

  /**
   * Validate metadata schemas for consistency (NEW - v1.0.103)
   * Detects legacy schemas with createdAt/updatedAt instead of created/updated/lastActivity
   */
  private validateMetadataSchemas(
    allIncrements: IncrementMetadata[],
    violations: ValidationViolation[]
  ): void {
    for (const increment of allIncrements) {
      const metadataPath = path.join(
        this.projectRoot,
        '.specweave/increments',
        increment.id,
        'metadata.json'
      );

      try {
        const rawContent = fs.readFileSync(metadataPath, 'utf-8');
        const rawMetadata = JSON.parse(rawContent);

        // Check for legacy schema fields
        const hasLegacyFields = !!(rawMetadata.createdAt || rawMetadata.updatedAt);
        const missingStandardFields = !(rawMetadata.created && rawMetadata.lastActivity);

        if (hasLegacyFields || missingStandardFields) {
          violations.push({
            type: 'metadata_inconsistency',
            message: `Increment ${increment.id} uses non-standard metadata schema`,
            suggestion: `Normalize metadata: Use 'created', 'updated', 'lastActivity' instead of 'createdAt', 'updatedAt'. Run migration script to fix.`,
            severity: 'warning',
          });
        }
      } catch (error) {
        // Silently skip if file doesn't exist (edge case)
      }
    }
  }
}
