/**
 * Smart Default Completion Conditions
 * Project-type-aware defaults for auto mode quality gates
 *
 * Each project type has opinionated mandatory conditions that cannot be removed
 */

import { CompletionCondition } from './types.js';
import { ProjectType } from './project-detector.js';

/**
 * Mandatory completion conditions by project type
 * These CANNOT be removed by users (only thresholds can be adjusted)
 */
export const MANDATORY_CONDITIONS: Record<ProjectType, CompletionCondition[]> = {
  'web-frontend': [
    { type: 'build', mandatory: true, autoHeal: true, maxRetries: 3 },
    { type: 'tests', mandatory: true },
    { type: 'e2e', mandatory: true, autoHeal: false },
    { type: 'e2e-coverage', threshold: 70, mandatory: true },
    { type: 'types', mandatory: true, autoHeal: true, maxRetries: 2 },
  ],

  'web-fullstack': [
    { type: 'build', mandatory: true, autoHeal: true, maxRetries: 3 },
    { type: 'tests', mandatory: true },
    { type: 'e2e', mandatory: true, autoHeal: false },
    { type: 'e2e-coverage', threshold: 70, mandatory: true },
    { type: 'integration', mandatory: true },
    { type: 'types', mandatory: true, autoHeal: true, maxRetries: 2 },
  ],

  'mobile-native': [
    { type: 'build', mandatory: true, autoHeal: true, maxRetries: 3 },
    { type: 'tests', mandatory: true },
    { type: 'e2e', mandatory: true, autoHeal: false }, // Detox/Maestro
    { type: 'e2e-coverage', threshold: 60, mandatory: true }, // Lower threshold for mobile
  ],

  'backend-api': [
    { type: 'build', mandatory: true, autoHeal: true, maxRetries: 3 },
    { type: 'tests', mandatory: true },
    { type: 'integration', mandatory: true }, // API endpoint tests
    { type: 'coverage', threshold: 80, mandatory: true },
    { type: 'types', mandatory: true, autoHeal: true, maxRetries: 2 },
  ],

  'desktop-app': [
    { type: 'build', mandatory: true, autoHeal: true, maxRetries: 3 },
    { type: 'tests', mandatory: true },
    { type: 'e2e', mandatory: true }, // Electron/Tauri UI tests
    { type: 'types', mandatory: true, autoHeal: true, maxRetries: 2 },
  ],

  library: [
    { type: 'build', mandatory: true, autoHeal: true, maxRetries: 3 },
    { type: 'tests', mandatory: true },
    { type: 'coverage', threshold: 80, mandatory: true },
    { type: 'types', mandatory: true, autoHeal: true, maxRetries: 2 },
  ],

  'cli-tool': [
    { type: 'build', mandatory: true, autoHeal: true, maxRetries: 3 },
    { type: 'tests', mandatory: true },
    { type: 'types', mandatory: true, autoHeal: true, maxRetries: 2 },
  ],

  generic: [{ type: 'tests', mandatory: true }],
};

/**
 * Get default completion conditions for a project type
 *
 * @param projectType - Detected project type
 * @param userOverrides - Optional user-specified conditions (will be merged)
 * @returns Array of completion conditions with mandatory ones preserved
 */
export function getDefaultConditions(
  projectType: ProjectType,
  userOverrides?: CompletionCondition[]
): CompletionCondition[] {
  const defaults = MANDATORY_CONDITIONS[projectType] || MANDATORY_CONDITIONS.generic;

  if (!userOverrides || userOverrides.length === 0) {
    return [...defaults]; // Return copy
  }

  return mergeConditions(defaults, userOverrides);
}

/**
 * Merge user conditions with mandatory defaults
 * Rules:
 * - User can add new conditions
 * - User can INCREASE thresholds above mandatory minimum
 * - User CANNOT DECREASE thresholds below mandatory minimum
 * - User CANNOT remove mandatory conditions
 * - User CANNOT change mandatory=true to mandatory=false
 *
 * @param mandatory - Mandatory default conditions
 * @param user - User-specified conditions
 * @returns Merged conditions with mandatory ones preserved
 */
export function mergeConditions(
  mandatory: CompletionCondition[],
  user: CompletionCondition[]
): CompletionCondition[] {
  const result: CompletionCondition[] = [];
  const mandatoryTypes = new Set(mandatory.map((c) => c.type));
  const userMap = new Map(user.map((c) => [c.type, c]));

  // Phase 1: Add all mandatory conditions (with optional user threshold adjustments)
  for (const mandatoryCondition of mandatory) {
    const userCondition = userMap.get(mandatoryCondition.type);

    if (userCondition) {
      // User specified this mandatory condition - merge
      const mergedThreshold =
        userCondition.threshold !== undefined && mandatoryCondition.threshold !== undefined
          ? // User can increase but not decrease below mandatory minimum
            Math.max(mandatoryCondition.threshold, userCondition.threshold)
          : userCondition.threshold ?? mandatoryCondition.threshold;

      result.push({
        ...mandatoryCondition,
        threshold: mergedThreshold,
        // Preserve mandatory flag
        mandatory: true,
        // Allow user to override autoHeal
        autoHeal: userCondition.autoHeal ?? mandatoryCondition.autoHeal,
        maxRetries: userCondition.maxRetries ?? mandatoryCondition.maxRetries,
      });
    } else {
      // User didn't specify - use default
      result.push({ ...mandatoryCondition });
    }
  }

  // Phase 2: Add user's additional conditions (not in mandatory list)
  for (const userCondition of user) {
    if (!mandatoryTypes.has(userCondition.type)) {
      result.push({ ...userCondition });
    }
  }

  return result;
}

/**
 * Validate user-specified conditions and return warnings
 * Used for CLI validation and help messages
 *
 * @param projectType - Detected project type
 * @param user - User-specified conditions
 * @returns Validation result with warnings
 */
export function validateUserConditions(
  projectType: ProjectType,
  user: CompletionCondition[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const mandatory = MANDATORY_CONDITIONS[projectType] || MANDATORY_CONDITIONS.generic;
  const mandatoryTypes = new Set(mandatory.map((c) => c.type));

  // Check if user tried to remove mandatory conditions
  for (const mandatoryCondition of mandatory) {
    const userCondition = user.find((c) => c.type === mandatoryCondition.type);

    if (!userCondition) {
      warnings.push(
        `Mandatory condition '${mandatoryCondition.type}' cannot be removed (project type requirement)`
      );
    } else if (userCondition.mandatory === false) {
      warnings.push(
        `Cannot disable mandatory condition '${mandatoryCondition.type}' for ${projectType} projects`
      );
    }
  }

  // Check for unreasonably low thresholds (below mandatory minimum)
  for (const mandatoryCondition of mandatory) {
    if (
      (mandatoryCondition.type === 'coverage' || mandatoryCondition.type === 'e2e-coverage') &&
      mandatoryCondition.threshold !== undefined
    ) {
      const userCondition = user.find((c) => c.type === mandatoryCondition.type);
      if (
        userCondition?.threshold !== undefined &&
        userCondition.threshold < mandatoryCondition.threshold
      ) {
        warnings.push(
          `${mandatoryCondition.type} threshold too low (${userCondition.threshold}% < ${mandatoryCondition.threshold}% mandatory minimum)`
        );
      }
    }
  }

  return { valid: warnings.length === 0, warnings };
}

/** Condition display metadata: [icon, description template] */
const CONDITION_DISPLAY: Record<string, [string, string]> = {
  build: ['🔨', 'Build must pass'],
  tests: ['✅', 'Tests must pass (unit + integration)'],
  e2e: ['🎭', 'E2E tests must pass'],
  'e2e-coverage': ['📊', 'E2E coverage must be ≥{threshold}%'],
  coverage: ['📊', 'Test coverage must be ≥{threshold}%'],
  types: ['🔍', 'Type-check must pass'],
  integration: ['🔗', 'Integration tests must pass'],
  lint: ['📋', 'Linting must pass'],
  command: ['📋', 'Custom command must pass'],
};

/**
 * Generate human-readable description of conditions
 * Used for CLI output when auto mode starts
 *
 * @param conditions - Completion conditions
 * @returns Array of human-readable descriptions (one per condition)
 */
export function describeConditions(conditions: CompletionCondition[]): string[] {
  return conditions.map((condition) => {
    const [icon, template] = CONDITION_DISPLAY[condition.type] || ['📋', `${condition.type} check`];
    const description = template.replace('{threshold}', String(condition.threshold ?? ''));

    const modifiers: string[] = [];
    if (condition.mandatory) modifiers.push('MANDATORY');
    if (condition.autoHeal) modifiers.push(`auto-heal: ${condition.maxRetries || 3} retries`);

    const suffix = modifiers.length > 0 ? ` (${modifiers.join(', ')})` : '';
    return `  • ${icon} ${description}${suffix}`;
  });
}
