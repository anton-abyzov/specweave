/**
 * Plan Approval for Auto Mode
 *
 * Displays increment plan and handles user approval/modification before execution.
 *
 * @module plan-approval
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IncrementPlan, PlanningResult } from './increment-planner.js';

export interface ApprovalConfig {
  /** Skip approval prompt (--yes flag) */
  autoApprove?: boolean;
  /** Project root path */
  projectPath: string;
  /** Interactive mode (default: true) */
  interactive?: boolean;
}

export interface ApprovalResult {
  approved: boolean;
  modifiedPlan?: PlanningResult;
  skippedIncrements?: string[];
  reason?: string;
}

export interface PlanDisplayOptions {
  /** Show detailed feature breakdown */
  showDetails?: boolean;
  /** Show dependency graph */
  showDependencies?: boolean;
  /** Output format */
  format?: 'text' | 'markdown' | 'json';
}

/**
 * Format increment plan for display
 *
 * @param plan - Planning result to display
 * @param options - Display options
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const output = formatPlanDisplay(plan, { showDetails: true });
 * console.log(output);
 * ```
 */
export function formatPlanDisplay(plan: PlanningResult, options: PlanDisplayOptions = {}): string {
  const { showDetails = true, showDependencies = true, format = 'text' } = options;

  if (format === 'json') {
    return JSON.stringify(plan, null, 2);
  }

  const lines: string[] = [];
  const isMarkdown = format === 'markdown';

  // Header
  if (isMarkdown) {
    lines.push('## 📋 Increment Plan');
    lines.push('');
  } else {
    lines.push('📋 Increment Plan');
    lines.push('═'.repeat(50));
  }

  // Summary
  lines.push('');
  lines.push(`Total Features: ${plan.totalFeatures}`);
  lines.push(`Total Tasks: ~${plan.totalTasks}`);
  lines.push(`Estimated Duration: ${plan.estimatedDuration}`);
  lines.push(`Increments: ${plan.increments.length}`);
  lines.push('');

  // Increments table/list
  if (isMarkdown) {
    lines.push('### Increments');
    lines.push('');
    lines.push('| # | Name | Tasks | Features | Dependencies |');
    lines.push('|---|------|-------|----------|--------------|');

    for (let i = 0; i < plan.increments.length; i++) {
      const inc = plan.increments[i];
      const deps = inc.dependencies.length > 0 ? inc.dependencies.map((d) => `#${d.split('-')[0]}`).join(', ') : '-';
      lines.push(
        `| ${i + 1} | ${inc.name} | ~${inc.estimatedTasks} | ${inc.features.length} | ${deps} |`
      );
    }
  } else {
    lines.push('Increments:');
    lines.push('-'.repeat(50));

    for (let i = 0; i < plan.increments.length; i++) {
      const inc = plan.increments[i];
      lines.push(`  ${i + 1}. ${inc.name}`);
      lines.push(`     ID: ${inc.id}`);
      lines.push(`     Tasks: ~${inc.estimatedTasks}`);
      lines.push(`     Features: ${inc.features.map((f) => f.name).join(', ')}`);

      if (showDependencies && inc.dependencies.length > 0) {
        lines.push(`     Depends on: ${inc.dependencies.join(', ')}`);
      }
      lines.push('');
    }
  }

  // Detailed feature breakdown
  if (showDetails) {
    lines.push('');
    if (isMarkdown) {
      lines.push('### Feature Breakdown');
      lines.push('');
    } else {
      lines.push('Feature Breakdown:');
      lines.push('-'.repeat(50));
    }

    for (const inc of plan.increments) {
      lines.push(`${inc.name}:`);
      for (const feature of inc.features) {
        const complexityIcon =
          feature.complexity === 'complex' ? '🔴' : feature.complexity === 'medium' ? '🟡' : '🟢';
        lines.push(`  ${complexityIcon} ${feature.name} (~${feature.estimatedTasks} tasks)`);
        if (feature.description !== feature.name) {
          lines.push(`      "${feature.description}"`);
        }
      }
      lines.push('');
    }
  }

  // Dependency graph visualization
  if (showDependencies && plan.increments.some((inc) => inc.dependencies.length > 0)) {
    lines.push('');
    if (isMarkdown) {
      lines.push('### Execution Order');
      lines.push('```');
    } else {
      lines.push('Execution Order:');
      lines.push('-'.repeat(50));
    }

    // Simple ASCII dependency graph
    for (let i = 0; i < plan.increments.length; i++) {
      const inc = plan.increments[i];
      const prefix = i === 0 ? '┌' : i === plan.increments.length - 1 ? '└' : '├';
      const deps =
        inc.dependencies.length > 0 ? ` ← depends on: ${inc.dependencies.join(', ')}` : '';
      lines.push(`${prefix}─ ${inc.id}${deps}`);
    }

    if (isMarkdown) {
      lines.push('```');
    }
  }

  return lines.join('\n');
}

/**
 * Log approved plan to file
 *
 * @param plan - Approved plan
 * @param projectPath - Project root path
 */
export function logApprovedPlan(plan: PlanningResult, projectPath: string): void {
  const logsDir = path.join(projectPath, '.specweave/logs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logsDir, `plan-approved-${timestamp}.json`);

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'plan_approved',
    plan: {
      totalFeatures: plan.totalFeatures,
      totalTasks: plan.totalTasks,
      estimatedDuration: plan.estimatedDuration,
      increments: plan.increments.map((inc) => ({
        id: inc.id,
        name: inc.name,
        estimatedTasks: inc.estimatedTasks,
        featureCount: inc.features.length,
        dependencies: inc.dependencies,
      })),
    },
  };

  fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));

  // Also append to auto-sessions.log
  const sessionsLog = path.join(logsDir, 'auto-sessions.log');
  const logLine = JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'plan_approved',
    increments: plan.increments.length,
    totalTasks: plan.totalTasks,
  });
  fs.appendFileSync(sessionsLog, logLine + '\n');
}

/**
 * Generate approval prompt text
 *
 * @param plan - Planning result
 * @returns Prompt text for user approval
 */
export function generateApprovalPrompt(plan: PlanningResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('💡 Review the plan above.');
  lines.push('');
  lines.push('Options:');
  lines.push('  1. Approve - Start execution with this plan');
  lines.push('  2. Modify  - Adjust increment structure');
  lines.push('  3. Cancel  - Abort and return to prompt');
  lines.push('');
  lines.push('To skip this prompt in future: use --yes flag');
  lines.push('');

  return lines.join('\n');
}

/**
 * Validate plan is executable
 *
 * @param plan - Planning result to validate
 * @returns Validation result with any issues
 */
export function validatePlan(plan: PlanningResult): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for empty plan
  if (plan.increments.length === 0) {
    issues.push('Plan has no increments');
  }

  // Check for increments with no features
  for (const inc of plan.increments) {
    if (inc.features.length === 0) {
      issues.push(`Increment ${inc.id} has no features`);
    }
  }

  // Check for circular dependencies
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function detectCycle(incId: string): boolean {
    if (visiting.has(incId)) return true;
    if (visited.has(incId)) return false;

    visiting.add(incId);

    const inc = plan.increments.find((i) => i.id === incId);
    if (inc) {
      for (const depId of inc.dependencies) {
        if (detectCycle(depId)) {
          issues.push(`Circular dependency detected involving ${incId}`);
          return true;
        }
      }
    }

    visiting.delete(incId);
    visited.add(incId);
    return false;
  }

  for (const inc of plan.increments) {
    detectCycle(inc.id);
  }

  // Check for missing dependencies
  const allIds = new Set(plan.increments.map((i) => i.id));
  for (const inc of plan.increments) {
    for (const depId of inc.dependencies) {
      if (!allIds.has(depId)) {
        issues.push(`Increment ${inc.id} depends on non-existent increment ${depId}`);
      }
    }
  }

  // Warn about very large increments
  for (const inc of plan.increments) {
    if (inc.estimatedTasks > 20) {
      issues.push(
        `Warning: Increment ${inc.id} has ~${inc.estimatedTasks} tasks (consider splitting)`
      );
    }
  }

  return {
    valid: issues.filter((i) => !i.startsWith('Warning:')).length === 0,
    issues,
  };
}

/**
 * Save plan to state for later execution
 *
 * @param plan - Planning result to save
 * @param projectPath - Project root path
 */
export function savePlanToState(plan: PlanningResult, projectPath: string): void {
  const stateDir = path.join(projectPath, '.specweave/state');
  const planFile = path.join(stateDir, 'pending-plan.json');

  // Ensure state directory exists
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const planState = {
    savedAt: new Date().toISOString(),
    plan,
    status: 'pending_approval',
  };

  fs.writeFileSync(planFile, JSON.stringify(planState, null, 2));
}

/**
 * Load saved plan from state
 *
 * @param projectPath - Project root path
 * @returns Saved plan or null if none exists
 */
export function loadPlanFromState(
  projectPath: string
): { plan: PlanningResult; savedAt: string } | null {
  const planFile = path.join(projectPath, '.specweave/state/pending-plan.json');

  if (!fs.existsSync(planFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(planFile, 'utf-8');
    const state = JSON.parse(content);
    return {
      plan: state.plan,
      savedAt: state.savedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Clear saved plan from state
 *
 * @param projectPath - Project root path
 */
export function clearPlanFromState(projectPath: string): void {
  const planFile = path.join(projectPath, '.specweave/state/pending-plan.json');

  if (fs.existsSync(planFile)) {
    fs.unlinkSync(planFile);
  }
}

/**
 * Process user's plan modification request
 *
 * @param plan - Original plan
 * @param modification - User's modification description
 * @returns Modified plan
 */
export function applyPlanModification(
  plan: PlanningResult,
  modification: {
    type: 'merge' | 'split' | 'remove' | 'reorder';
    incrementIds: string[];
    newName?: string;
  }
): PlanningResult {
  const increments = [...plan.increments];

  switch (modification.type) {
    case 'merge': {
      // Merge multiple increments into one
      const toMerge = increments.filter((inc) => modification.incrementIds.includes(inc.id));
      if (toMerge.length < 2) break;

      const merged: IncrementPlan = {
        id: toMerge[0].id,
        name: modification.newName || toMerge.map((i) => i.name).join(' & '),
        description: toMerge.map((i) => i.description).join('; '),
        features: toMerge.flatMap((i) => i.features),
        estimatedTasks: toMerge.reduce((sum, i) => sum + i.estimatedTasks, 0),
        dependencies: [...new Set(toMerge.flatMap((i) => i.dependencies))].filter(
          (d) => !modification.incrementIds.includes(d)
        ),
        priority: Math.min(...toMerge.map((i) => i.priority)),
      };

      // Remove merged increments and add new one
      const filtered = increments.filter((inc) => !modification.incrementIds.includes(inc.id));
      filtered.splice(merged.priority - 1, 0, merged);

      return {
        ...plan,
        increments: filtered,
      };
    }

    case 'remove': {
      // Remove increments from plan
      const filtered = increments.filter((inc) => !modification.incrementIds.includes(inc.id));
      const totalTasks = filtered.reduce((sum, i) => sum + i.estimatedTasks, 0);

      return {
        ...plan,
        increments: filtered,
        totalTasks,
        totalFeatures: filtered.reduce((sum, i) => sum + i.features.length, 0),
      };
    }

    case 'reorder': {
      // Reorder increments (incrementIds is the new order)
      const reordered = modification.incrementIds
        .map((id) => increments.find((inc) => inc.id === id))
        .filter((inc): inc is IncrementPlan => inc !== undefined);

      // Add any increments not in the reorder list at the end
      const remaining = increments.filter((inc) => !modification.incrementIds.includes(inc.id));

      return {
        ...plan,
        increments: [...reordered, ...remaining].map((inc, idx) => ({
          ...inc,
          priority: idx + 1,
        })),
      };
    }

    default:
      return plan;
  }

  return plan;
}
