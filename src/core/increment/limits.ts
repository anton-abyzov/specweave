/**
 * Increment Limits
 *
 * Type-based limits for concurrent active increments.
 * Part of increment 0007: Smart Status Management
 */

import { MetadataManager } from './metadata-manager.js';
import {
  IncrementType,
  IncrementStatus,
  TYPE_LIMITS,
  IncrementMetadata
} from '../types/increment-metadata.js';

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

  // Get active increments of this type (not paused, not completed, not abandoned)
  const allIncrements = MetadataManager.getAll();
  const activeOfType = allIncrements.filter(
    m => m.type === type && m.status === IncrementStatus.ACTIVE
  );

  const current = activeOfType.length;

  // If unlimited, no limit enforcement but still report current count
  if (limit === null) {
    return {
      exceeded: false,
      current,
      limit: null,
      severity: 'info'
    };
  }

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
    result.suggestions = buildSuggestions(type);
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
 * Type-specific suggestions for exceeding limits
 */
const TYPE_SUGGESTIONS: Partial<Record<IncrementType, string>> = {
  [IncrementType.FEATURE]: 'Reduce scope: Break large feature into smaller increments',
  [IncrementType.REFACTOR]: 'Refactors need focus: Complete current refactor before starting new one'
};

/**
 * Build suggestions for resolving limit exceeded
 */
function buildSuggestions(type: IncrementType): string[] {
  const suggestions = [
    'Complete active increment: /done <id>',
    'Pause active increment: /pause <id>',
    'Check status: /status'
  ];

  const typeSuggestion = TYPE_SUGGESTIONS[type];
  if (typeSuggestion) {
    suggestions.push(typeSuggestion);
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
 * Productivity cost lookup table based on research
 */
const PRODUCTIVITY_COST = ['0%', '20%', '30%', '40%'] as const;

/**
 * Calculate productivity cost based on active increment count
 */
function calculateProductivityCost(activeCount: number): string {
  return PRODUCTIVITY_COST[Math.min(activeCount, PRODUCTIVITY_COST.length - 1)];
}

/**
 * Type label mapping for display
 */
const TYPE_LABELS: Record<IncrementType, string> = {
  [IncrementType.HOTFIX]: 'hotfix',
  [IncrementType.FEATURE]: 'feature',
  [IncrementType.BUG]: 'bug',
  [IncrementType.CHANGE_REQUEST]: 'change request',
  [IncrementType.REFACTOR]: 'refactor',
  [IncrementType.EXPERIMENT]: 'experiment'
};

/**
 * Format type label for display
 */
function formatTypeLabel(type: IncrementType): string {
  return TYPE_LABELS[type] ?? type;
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
