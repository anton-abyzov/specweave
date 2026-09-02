/**
 * Discipline Checker - advisory WIP note
 *
 * 2.0: there is NO hard cap. When more increments are active than
 * `limits.activeIncrements` (default 3, 0 = off) exactly one info-level
 * note is emitted. `compliant` only turns false on error-severity violations.
 */

import { ConfigManager } from '../config-manager.js';
import {
  ValidationResult,
  ValidationViolation,
  DisciplineLimits,
  DisciplineCheckOptions,
} from './types.js';
import { MetadataManager } from './metadata-manager.js';
import { IncrementStatus, countsTowardWipLimit } from '../types/increment-metadata.js';

export const DEFAULT_ACTIVE_INCREMENTS = 3;

/**
 * Resolve the advisory limit from a raw config `limits` block.
 * Legacy `maxActiveIncrements` is honoured until the config migration rewrites it.
 */
export function resolveDisciplineLimits(limits: unknown): DisciplineLimits {
  const raw = (limits && typeof limits === 'object' ? limits : {}) as Record<string, unknown>;
  const value = typeof raw.activeIncrements === 'number'
    ? raw.activeIncrements
    : typeof raw.maxActiveIncrements === 'number'
      ? raw.maxActiveIncrements
      : DEFAULT_ACTIVE_INCREMENTS;
  return { activeIncrements: Math.max(0, Math.floor(value)) };
}

/**
 * Build the single advisory note (or null when within the limit / disabled).
 */
export function buildWipNote(activeCount: number, activeIncrements: number): ValidationViolation | null {
  if (activeIncrements <= 0 || activeCount <= activeIncrements) {
    return null;
  }
  return {
    type: 'wip_limit_exceeded',
    message: `${activeCount} active increments (recommended: ${activeIncrements}). Prefer finishing before starting.`,
    suggestion: `Set limits.activeIncrements in .specweave/config.json to change or 0 to silence this note.`,
    severity: 'info',
    context: { activeCount, recommended: activeIncrements },
  };
}

/**
 * Checks increment discipline compliance
 */
export class DisciplineChecker {
  private limits: DisciplineLimits;

  constructor(projectRoot: string = process.cwd(), customLimits?: DisciplineLimits) {
    if (customLimits) {
      this.limits = resolveDisciplineLimits(customLimits);
    } else {
      const configManager = new ConfigManager(projectRoot);
      const config = configManager.load();
      this.limits = resolveDisciplineLimits(config.limits);
    }
  }

  getLimits(): DisciplineLimits {
    return { ...this.limits };
  }

  /**
   * Validate increment discipline
   */
  async validate(_options?: DisciplineCheckOptions): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];

    try {
      const allIncrements = MetadataManager.getAll();

      // Single definition of "active": the WIP-counted statuses.
      const active = allIncrements.filter(m => countsTowardWipLimit(m.status));
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

      const note = buildWipNote(statusCounts.active, this.limits.activeIncrements);
      if (note) violations.push(note);

      return {
        compliant: !violations.some(v => v.severity === 'error'),
        violations,
        increments: statusCounts,
        config: { activeIncrements: this.limits.activeIncrements },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      violations.push({
        type: 'metadata_inconsistency',
        message: `Error during validation: ${errorMessage}`,
        suggestion: 'Check .specweave/increments/ directory structure',
        severity: 'error',
      });

      return {
        compliant: false,
        violations,
        increments: { total: 0, active: 0, backlog: 0, paused: 0, completed: 0, abandoned: 0 },
        config: { activeIncrements: this.limits.activeIncrements },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
