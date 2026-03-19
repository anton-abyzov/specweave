/**
 * Shared Rate-Limit Budget for GitHub API Calls
 *
 * Cross-process coordination via a state file at .specweave/state/github-rate-limit.json.
 * All GitHub API calls check this shared budget before executing. If the budget
 * drops below the emergency reserve (200), calls are skipped with a warning.
 *
 * Periodically validates the budget against the actual GitHub rate limit
 * (every 50 calls or 5 minutes, whichever comes first).
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execFileNoThrow } from '../utils/execFileNoThrow.js';

export const EMERGENCY_RESERVE = 200;
const VALIDATION_INTERVAL_CALLS = 50;
const VALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_LIMIT = 5000;

export interface BudgetState {
  remaining: number;
  limit: number;
  resetAt: string;
  lastChecked: string;
  callsSinceValidation: number;
}

function statePath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'state', 'github-rate-limit.json');
}

function defaultState(): BudgetState {
  return {
    remaining: DEFAULT_LIMIT,
    limit: DEFAULT_LIMIT,
    resetAt: new Date(Date.now() + 3600_000).toISOString(),
    lastChecked: new Date().toISOString(),
    callsSinceValidation: 0,
  };
}

/**
 * Read the current budget state from disk. Returns default if file missing or corrupt.
 */
export async function getBudgetState(projectRoot: string): Promise<BudgetState> {
  try {
    const raw = await fs.readFile(statePath(projectRoot), 'utf-8');
    return JSON.parse(raw) as BudgetState;
  } catch (err) {
    // Fail-closed: if we can't read the state file, assume budget is exhausted.
    // This prevents runaway API calls when the state file is missing or corrupt.
    console.warn('[rate-limit-budget] Failed to read state file, defaulting to exhausted:', err);
    return { ...defaultState(), remaining: 0 };
  }
}

async function writeBudgetState(projectRoot: string, state: BudgetState): Promise<void> {
  const filePath = statePath(projectRoot);
  const tmpPath = filePath + '.tmp';
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmpPath, JSON.stringify(state, null, 2));
  await fs.rename(tmpPath, filePath);
}

/**
 * Check if there is enough budget to make a GitHub API call.
 * Returns false if remaining < EMERGENCY_RESERVE (200).
 */
export async function checkBudget(projectRoot: string): Promise<boolean> {
  const state = await getBudgetState(projectRoot);
  return state.remaining >= EMERGENCY_RESERVE;
}

/**
 * Decrement the budget by 1 after a GitHub API call.
 * Atomic: read -> decrement -> write.
 */
export async function decrementBudget(projectRoot: string): Promise<void> {
  const state = await getBudgetState(projectRoot);
  state.remaining = Math.max(0, state.remaining - 1);
  state.callsSinceValidation++;
  await writeBudgetState(projectRoot, state);
}

/**
 * Validate the budget against the actual GitHub rate limit via `gh api rate_limit`.
 * Called every VALIDATION_INTERVAL_CALLS decrements or if lastChecked > VALIDATION_INTERVAL_MS.
 */
export async function validateBudget(projectRoot: string): Promise<void> {
  const state = await getBudgetState(projectRoot);

  const result = await execFileNoThrow('gh', [
    'api', 'rate_limit',
  ]);

  if (result.exitCode !== 0) {
    // API call failed — update lastChecked to avoid hammering, keep existing budget
    console.warn('[rate-limit-budget] gh api rate_limit failed (exit', result.exitCode, '):', result.stderr || '(no stderr)');
    state.lastChecked = new Date().toISOString();
    await writeBudgetState(projectRoot, state);
    return;
  }

  try {
    const data = JSON.parse(result.stdout);
    const rate = data.rate;
    if (!rate || typeof rate.remaining !== 'number') {
      console.warn('[rate-limit-budget] Unexpected rate_limit response structure:', result.stdout.slice(0, 200));
      state.lastChecked = new Date().toISOString();
      await writeBudgetState(projectRoot, state);
      return;
    }
    state.remaining = rate.remaining;
    state.limit = rate.limit;
    state.resetAt = new Date(rate.reset * 1000).toISOString();
    state.lastChecked = new Date().toISOString();
    state.callsSinceValidation = 0;
    await writeBudgetState(projectRoot, state);
  } catch (err) {
    // Parse failure — update lastChecked only
    console.warn('[rate-limit-budget] Failed to parse rate_limit response:', err, '| stdout:', result.stdout.slice(0, 200));
    state.lastChecked = new Date().toISOString();
    await writeBudgetState(projectRoot, state);
  }
}

/**
 * Check if validation is needed (every 50 calls or 5 min).
 */
export function needsValidation(state: BudgetState): boolean {
  if (state.callsSinceValidation >= VALIDATION_INTERVAL_CALLS) return true;
  const elapsed = Date.now() - new Date(state.lastChecked).getTime();
  if (isNaN(elapsed)) return true; // corrupt lastChecked — force re-validation
  return elapsed >= VALIDATION_INTERVAL_MS;
}

/**
 * Combined check-and-decrement for use in GitHubClientV2.
 * Returns true if the call should proceed, false if budget exhausted.
 * Triggers validation when needed.
 */
export async function checkAndDecrement(projectRoot: string): Promise<boolean> {
  const state = await getBudgetState(projectRoot);

  // Trigger validation if needed
  if (needsValidation(state)) {
    await validateBudget(projectRoot);
    // Re-read state after validation
    const refreshed = await getBudgetState(projectRoot);
    if (refreshed.remaining < EMERGENCY_RESERVE) return false;
    refreshed.remaining = Math.max(0, refreshed.remaining - 1);
    refreshed.callsSinceValidation++;
    await writeBudgetState(projectRoot, refreshed);
    return true;
  }

  if (state.remaining < EMERGENCY_RESERVE) return false;

  state.remaining = Math.max(0, state.remaining - 1);
  state.callsSinceValidation++;
  await writeBudgetState(projectRoot, state);
  return true;
}
