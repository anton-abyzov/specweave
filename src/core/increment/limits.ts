/**
 * Increment Limits
 *
 * Type-based limits for concurrent active increments.
 * Part of increment 0007: Smart Status Management
 */

import { MetadataManager } from './metadata-manager';
import {
  IncrementType,
  IncrementStatus,
  TYPE_LIMITS,
  IncrementMetadata
} from '../types/increment-metadata';

/**
 * Limit check result
 */
export interface LimitCheckResult {
  /** Whether the limit is exceeded */
  exceeded: boolean;

  /** Current count of active increments of this type */
  current: number;

  /** Maximum allowed (null = unlimited) */
  limit: number | null;

  /** Warning message if limit exceeded */
  warning?: string;

  /** Severity level: info, warning, error */
  severity: 'info' | 'warning' | 'error';

  /** Suggested actions */
  suggestions?: string[];

  /** Active increments of this type */
  activeIncrements?: IncrementMetadata[];
}

/**
 * Context switching cost warning
 */
export interface ContextSwitchWarning {
  /** Whether warning should be shown */
  show: boolean;

  /** Estimated productivity cost (%) */
  productivityCost: string;

  /** Message to display */
  message: string;

  /** Options for user */
  options: Array<{
    label: string;
    value: string;
    description: string;
  }>;
}

/**
 * Check if creating a new increment would exceed type-based limits
 */
export function checkIncrementLimits(type: IncrementType): LimitCheckResult {
  // Get limit for this type
  const limit = TYPE_LIMITS[type];

  // If unlimited, no check needed
  if (limit === null) {
    return {
      exceeded: false,
      current: 0,
      limit: null,
      severity: 'info'
    };
  }

  // Get active increments of this type (not paused, not completed, not abandoned)
  const allIncrements = MetadataManager.getAll();
  const activeOfType = allIncrements.filter(
    m => m.type === type && m.status === IncrementStatus.ACTIVE
  );

  const current = activeOfType.length;
  const exceeded = current >= limit;

  // Build result
  const result: LimitCheckResult = {
    exceeded,
    current,
    limit,
    severity: exceeded ? 'warning' : 'info',
    activeIncrements: activeOfType
  };

  // Add warning message if exceeded
  if (exceeded) {
    result.warning = buildLimitWarning(type, current, limit, activeOfType);
    result.suggestions = buildSuggestions(type, activeOfType);
  }

  return result;
}

/**
 * Check all increment types and return warnings
 */
export function checkAllLimits(): Record<IncrementType, LimitCheckResult> {
  const results: Partial<Record<IncrementType, LimitCheckResult>> = {};

  for (const type of Object.values(IncrementType)) {
    results[type] = checkIncrementLimits(type);
  }

  return results as Record<IncrementType, LimitCheckResult>;
}

/**
 * Get context switching warning for starting a new increment
 */
export function getContextSwitchWarning(newType: IncrementType): ContextSwitchWarning {
  const activeIncrements = MetadataManager.getActive();
  const activeCount = activeIncrements.length;

  // No warning if no active increments
  if (activeCount === 0) {
    return {
      show: false,
      productivityCost: '0%',
      message: '',
      options: []
    };
  }

  // No warning for hotfixes (emergency work)
  if (newType === IncrementType.HOTFIX || newType === IncrementType.BUG) {
    return {
      show: false,
      productivityCost: '0%',
      message: '',
      options: []
    };
  }

  // Calculate productivity cost
  const productivityCost = calculateProductivityCost(activeCount);

  // Build warning message
  const message = buildContextSwitchMessage(activeCount, productivityCost, activeIncrements);

  // Build options
  const options = [
    {
      label: 'Continue current work',
      value: 'continue',
      description: 'Finish active increment(s) before starting new work (recommended)'
    },
    {
      label: 'Pause current work',
      value: 'pause',
      description: 'Pause active increment(s) to focus on new work'
    },
    {
      label: 'Work in parallel',
      value: 'parallel',
      description: `Start new increment (${productivityCost} productivity cost)`
    }
  ];

  return {
    show: true,
    productivityCost,
    message,
    options
  };
}

/**
 * Build warning message for exceeded limit
 */
function buildLimitWarning(
  type: IncrementType,
  current: number,
  limit: number,
  activeIncrements: IncrementMetadata[]
): string {
  const typeLabel = formatTypeLabel(type);
  const incrementList = activeIncrements
    .map(m => `  • ${m.id}`)
    .join('\n');

  return `
⚠️  You have ${current} active ${typeLabel} increment(s) (limit: ${limit})

Active ${typeLabel} increments:
${incrementList}

Recommendation: Complete or pause one before starting another.
Context switching reduces productivity by 20-40%.
`.trim();
}

/**
 * Build suggestions for resolving limit exceeded
 */
function buildSuggestions(type: IncrementType, activeIncrements: IncrementMetadata[]): string[] {
  const suggestions: string[] = [];

  // Suggest completing increments
  suggestions.push(`Complete active increment: /done <id>`);

  // Suggest pausing increments
  suggestions.push(`Pause active increment: /pause <id>`);

  // Show status
  suggestions.push(`Check status: /status`);

  // Type-specific suggestions
  if (type === IncrementType.FEATURE) {
    suggestions.push(`Reduce scope: Break large feature into smaller increments`);
  } else if (type === IncrementType.REFACTOR) {
    suggestions.push(`Refactors need focus: Complete current refactor before starting new one`);
  }

  return suggestions;
}

/**
 * Build context switching warning message
 */
function buildContextSwitchMessage(
  activeCount: number,
  productivityCost: string,
  activeIncrements: IncrementMetadata[]
): string {
  const incrementList = activeIncrements
    .map(m => `  • ${m.id} [${m.type}]`)
    .join('\n');

  return `
⚠️  You have ${activeCount} active increment(s)

Active increments:
${incrementList}

Starting new work will reduce productivity by ${productivityCost} due to context switching.

Research shows:
• 2 concurrent tasks = 20% slower
• 3+ concurrent tasks = 40% slower
• Frequent switches = more bugs

Recommended: Complete or pause active work first.
`.trim();
}

/**
 * Calculate productivity cost based on active increment count
 */
function calculateProductivityCost(activeCount: number): string {
  if (activeCount === 0) return '0%';
  if (activeCount === 1) return '20%';
  if (activeCount === 2) return '30%';
  return '40%';
}

/**
 * Format type label for display
 */
function formatTypeLabel(type: IncrementType): string {
  switch (type) {
    case IncrementType.HOTFIX: return 'hotfix';
    case IncrementType.FEATURE: return 'feature';
    case IncrementType.BUG: return 'bug';
    case IncrementType.CHANGE_REQUEST: return 'change request';
    case IncrementType.REFACTOR: return 'refactor';
    case IncrementType.EXPERIMENT: return 'experiment';
    default: return type;
  }
}

/**
 * Get summary of all limits
 */
export function getLimitsSummary(): string {
  const results = checkAllLimits();
  const lines: string[] = [];

  lines.push('Increment Limits:');
  lines.push('');

  for (const [type, result] of Object.entries(results)) {
    const typeLabel = formatTypeLabel(type as IncrementType);
    const limitStr = result.limit === null ? 'unlimited' : result.limit.toString();
    const status = result.exceeded ? '⚠️ ' : '✅';

    lines.push(`${status} ${typeLabel}: ${result.current}/${limitStr} active`);
  }

  return lines.join('\n');
}

/**
 * Check if starting a new increment of this type would be allowed
 * (considering limits)
 */
export function canStartIncrement(type: IncrementType): { allowed: boolean; reason?: string } {
  const check = checkIncrementLimits(type);

  if (!check.exceeded) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: check.warning
  };
}
