/**
 * Smart Defaults System for Completion Conditions
 * Returns mandatory completion conditions based on detected project type
 */

import { ProjectType } from './project-detector.js';
import { CompletionCondition } from './types.js';

/**
 * Mandatory completion conditions by project type
 */
export const MANDATORY_CONDITIONS: Record<ProjectType, CompletionCondition[]> =
  {
    'web-frontend': [
      {
        type: 'build',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
      {
        type: 'tests',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'e2e',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'e2e-coverage',
        threshold: 70,
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'types',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
    ],

    'web-fullstack': [
      {
        type: 'build',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
      {
        type: 'tests',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'e2e',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'e2e-coverage',
        threshold: 70,
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'integration',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'types',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
    ],

    'mobile-native': [
      {
        type: 'build',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
      {
        type: 'tests',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'e2e',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'e2e-coverage',
        threshold: 60,
        mandatory: true,
        autoHeal: false,
      },
    ],

    'backend-api': [
      {
        type: 'build',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
      {
        type: 'tests',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'integration',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'coverage',
        threshold: 80,
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'types',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
    ],

    'desktop-app': [
      {
        type: 'build',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
      {
        type: 'tests',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'e2e',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'types',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
    ],

    library: [
      {
        type: 'build',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
      {
        type: 'tests',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'coverage',
        threshold: 80,
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'types',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
    ],

    'cli-tool': [
      {
        type: 'build',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
      {
        type: 'tests',
        mandatory: true,
        autoHeal: false,
      },
      {
        type: 'types',
        mandatory: true,
        autoHeal: true,
        maxRetries: 3,
      },
    ],

    generic: [
      {
        type: 'tests',
        mandatory: true,
        autoHeal: false,
      },
    ],
  };

/**
 * Get default completion conditions for a project type
 */
export function getDefaultConditions(
  projectType: ProjectType,
  userOverrides?: CompletionCondition[]
): CompletionCondition[] {
  const defaults = MANDATORY_CONDITIONS[projectType] || MANDATORY_CONDITIONS.generic;

  // If no user overrides, return defaults
  if (!userOverrides || userOverrides.length === 0) {
    return [...defaults];
  }

  // Merge user overrides with mandatory preservation
  return mergeConditions(defaults, userOverrides);
}

/**
 * Merge user-provided conditions with mandatory defaults
 * Rules:
 * - User can add new conditions
 * - User can adjust thresholds (within reasonable limits)
 * - User CANNOT remove conditions with mandatory=true
 * - User CANNOT change mandatory=true to false
 */
export function mergeConditions(
  mandatory: CompletionCondition[],
  userProvided: CompletionCondition[]
): CompletionCondition[] {
  const result: CompletionCondition[] = [];
  const processed = new Set<string>();

  // First, add all mandatory conditions (user cannot remove)
  for (const mandatoryCondition of mandatory) {
    const userOverride = userProvided.find(
      (u) => u.type === mandatoryCondition.type
    );

    if (userOverride) {
      // User provided override for this mandatory condition
      result.push(mergeSingleCondition(mandatoryCondition, userOverride));
    } else {
      // No user override, use mandatory as-is
      result.push({ ...mandatoryCondition });
    }

    processed.add(mandatoryCondition.type);
  }

  // Then, add any NEW conditions the user wants to add
  for (const userCondition of userProvided) {
    if (!processed.has(userCondition.type)) {
      result.push({ ...userCondition });
      processed.add(userCondition.type);
    }
  }

  return result;
}

/**
 * Merge a single user override with mandatory condition
 */
function mergeSingleCondition(
  mandatory: CompletionCondition,
  userOverride: CompletionCondition
): CompletionCondition {
  const merged: CompletionCondition = {
    type: mandatory.type,
    mandatory: mandatory.mandatory, // CANNOT be changed by user
    autoHeal: userOverride.autoHeal ?? mandatory.autoHeal,
    maxRetries: userOverride.maxRetries ?? mandatory.maxRetries,
  };

  // Handle threshold merging
  if ('threshold' in mandatory || 'threshold' in userOverride) {
    const mandatoryThreshold = mandatory.threshold ?? 0;
    const userThreshold = userOverride.threshold ?? mandatoryThreshold;

    // User can increase threshold, but not decrease below mandatory minimum
    merged.threshold = Math.max(mandatoryThreshold, userThreshold);

    // Log warning if user tried to decrease threshold
    if (
      userThreshold < mandatoryThreshold &&
      mandatory.threshold !== undefined
    ) {
      console.warn(
        `⚠️  Cannot decrease ${mandatory.type} threshold below ${mandatoryThreshold}% (user requested: ${userThreshold}%)`
      );
    }
  }

  return merged;
}

/**
 * Validate user-provided conditions against mandatory requirements
 * Returns warnings for invalid overrides
 */
export function validateUserConditions(
  projectType: ProjectType,
  userConditions: CompletionCondition[]
): { valid: boolean; warnings: string[] } {
  const mandatory = MANDATORY_CONDITIONS[projectType] || MANDATORY_CONDITIONS.generic;
  const warnings: string[] = [];

  // Check if all mandatory conditions are present
  for (const mandatoryCondition of mandatory) {
    const found = userConditions.find((u) => u.type === mandatoryCondition.type);

    if (!found) {
      warnings.push(
        `Missing mandatory condition: ${mandatoryCondition.type} (will be added automatically)`
      );
    } else if (found.mandatory === false && mandatoryCondition.mandatory === true) {
      warnings.push(
        `Cannot disable mandatory condition: ${mandatoryCondition.type}`
      );
    }

    // Check threshold violations
    if (mandatoryCondition.threshold !== undefined && found?.threshold !== undefined) {
      if (found.threshold < mandatoryCondition.threshold) {
        warnings.push(
          `${mandatoryCondition.type} threshold too low: ${found.threshold}% (minimum: ${mandatoryCondition.threshold}%)`
        );
      }
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Get human-readable description of condition requirements
 */
export function describeConditions(conditions: CompletionCondition[]): string[] {
  return conditions.map((condition) => {
    let description = `• ${getConditionIcon(condition.type)} ${getConditionName(condition.type)}`;

    if (condition.threshold !== undefined) {
      description += ` (≥${condition.threshold}%)`;
    }

    if (condition.mandatory) {
      description += ' [MANDATORY]';
    }

    if (condition.autoHeal) {
      description += ` (auto-heal: ${condition.maxRetries ?? 3} retries)`;
    }

    return description;
  });
}

/**
 * Get emoji icon for condition type
 */
function getConditionIcon(type: string): string {
  const icons: Record<string, string> = {
    build: '🔨',
    tests: '✅',
    e2e: '🎭',
    'e2e-coverage': '📊',
    integration: '🔗',
    coverage: '📈',
    types: '🔍',
    lint: '🧹',
    security: '🔒',
  };

  return icons[type] || '⚙️';
}

/**
 * Get human-readable name for condition type
 */
function getConditionName(type: string): string {
  const names: Record<string, string> = {
    build: 'Build must pass',
    tests: 'Unit tests must pass',
    e2e: 'E2E tests must pass',
    'e2e-coverage': 'E2E route coverage',
    integration: 'Integration tests must pass',
    coverage: 'Code coverage',
    types: 'Type-check must pass',
    lint: 'Linter must pass',
    security: 'Security audit must pass',
  };

  return names[type] || type;
}
