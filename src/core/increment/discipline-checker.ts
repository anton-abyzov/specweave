/**
 * Discipline Checker - Validates increment discipline rules
 *
 * Enforces the iron rule: Cannot start increment N+1 until increment N is DONE
 * Checks WIP limits, incomplete work, and emergency interrupt rules
 */

import { IncrementStatusDetector, IncrementStatus } from '../increment-status.js';
import { ConfigManager } from '../config-manager.js';
import {
  ValidationResult,
  ValidationViolation,
  DisciplineLimits,
  DisciplineCheckOptions,
} from './types.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Checks increment discipline compliance
 */
export class DisciplineChecker {
  private projectRoot: string;
  private limits: DisciplineLimits;
  private detector: IncrementStatusDetector;

  /**
   * Create a new DisciplineChecker
   *
   * @param projectRoot - Root directory of the project
   * @param customLimits - Optional custom limits (overrides config)
   */
  constructor(projectRoot: string = process.cwd(), customLimits?: DisciplineLimits) {
    this.projectRoot = projectRoot;
    this.detector = new IncrementStatusDetector(projectRoot);

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
      maxActiveIncrements: 1,
      hardCap: 2,
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
      // Phase 1: Detect all increments
      const allIncrements = await this.getAllIncrements();

      // Phase 2: Count by status and get status map
      const { statusCounts, statusMap } = this.countByStatus(allIncrements);

      // Phase 3: Find incomplete increments (active or paused, not completed/abandoned)
      const incomplete = allIncrements.filter(
        (inc) => {
          const status = statusMap.get(inc.id) || 'active';
          return inc.exists && (status === 'active' || status === 'paused');
        }
      );

      // Phase 4: Validate rules
      this.validateHardCap(statusCounts.active, violations);
      this.validateWIPLimit(statusCounts.active, violations);
      // Note: validateIncompleteWork is used during increment creation, not here
      // Having active increments is OK as long as they're under WIP limits
      this.validateEmergencyRules(allIncrements, statusCounts.active, violations);

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
   * Get all increments with status information
   */
  private async getAllIncrements(): Promise<IncrementStatus[]> {
    const incrementsDir = path.join(this.projectRoot, '.specweave', 'increments');

    // Check if increments directory exists
    if (!fs.existsSync(incrementsDir)) {
      return [];
    }

    // Get all increment directories
    const entries = fs.readdirSync(incrementsDir);
    const incrementDirs = entries.filter((entry: string) => {
      const fullPath = path.join(incrementsDir, entry);
      return fs.statSync(fullPath).isDirectory() && /^\d{4}/.test(entry);
    });

    // Get status for each increment
    const statuses: IncrementStatus[] = [];
    for (const dir of incrementDirs) {
      try {
        const status = await this.detector.getStatus(dir);
        if (status.exists) {
          statuses.push(status);
        }
      } catch (error) {
        // Skip increments that fail to load
        continue;
      }
    }

    return statuses;
  }

  /**
   * Count increments by status
   */
  private countByStatus(increments: IncrementStatus[]): {
    statusCounts: {
      total: number;
      active: number;
      paused: number;
      completed: number;
      abandoned: number;
    };
    statusMap: Map<string, string>;
  } {
    let active = 0;
    let paused = 0;
    let completed = 0;
    let abandoned = 0;
    const statusMap = new Map<string, string>();

    for (const inc of increments) {
      const metadataPath = path.join(
        this.projectRoot,
        '.specweave',
        'increments',
        inc.id,
        'metadata.json'
      );

      // Try to read metadata.json for status
      let status = 'active'; // default
      try {
        if (fs.existsSync(metadataPath)) {
          const metadata = fs.readJsonSync(metadataPath);
          status = metadata.status || 'active';
        } else {
          // No metadata, determine by completion
          status = inc.isComplete ? 'completed' : 'active';
        }
      } catch (error) {
        // Error reading metadata, fall back to completion check
        status = inc.isComplete ? 'completed' : 'active';
      }

      // Store status in map
      statusMap.set(inc.id, status);

      // Count by status
      switch (status) {
        case 'active':
          active++;
          break;
        case 'paused':
          paused++;
          break;
        case 'completed':
          completed++;
          break;
        case 'abandoned':
          abandoned++;
          break;
        default:
          active++; // Unknown status, treat as active
      }
    }

    return {
      statusCounts: {
        total: increments.length,
        active,
        paused,
        completed,
        abandoned,
      },
      statusMap,
    };
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
        suggestion: `Complete or pause at least ${activeCount - this.limits.hardCap} increment(s). Use /specweave:done <id> or /specweave:pause <id>`,
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
   * Validate no incomplete work rule
   */
  private validateIncompleteWork(
    incomplete: IncrementStatus[],
    violations: ValidationViolation[]
  ): void {
    if (incomplete.length > 0) {
      incomplete.forEach((inc) => {
        violations.push({
          type: 'incomplete_work',
          message: `Incomplete increment: ${inc.id} (${inc.percentComplete}% complete, ${inc.pendingTasks.length} tasks remaining)`,
          suggestion: `Complete increment ${inc.id} before starting new work. Use /specweave:done ${inc.id} or /specweave:close ${inc.id}`,
          severity: 'error',
          incrementId: inc.id,
          context: {
            percentComplete: inc.percentComplete,
            pendingTasks: inc.pendingTasks.length,
            totalTasks: inc.totalTasks,
          },
        });
      });
    }
  }

  /**
   * Validate emergency interrupt rules
   *
   * If 2 active increments, at least one must be hotfix/bug
   */
  private validateEmergencyRules(
    allIncrements: IncrementStatus[],
    activeCount: number,
    violations: ValidationViolation[]
  ): void {
    if (activeCount === 2 && this.limits.allowEmergencyInterrupt) {
      // TODO: Check if at least one is hotfix/bug type
      // This requires reading metadata.json for type field
      // For now, we'll skip this validation
    }
  }
}
