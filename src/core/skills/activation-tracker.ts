/**
 * Skill/Agent Activation Tracker
 *
 * Tracks which skills and agents were activated during a session.
 * Used by stop hooks to determine if validation should run.
 *
 * @since v1.0.130
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';

/**
 * Single activation record
 */
export interface ActivationRecord {
  timestamp: string;
  type: 'skill' | 'agent';
  fqn: string;  // Fully qualified name (e.g., "sw-frontend:frontend-architect")
  domain: string;  // Detected domain (frontend, backend, mobile, etc.)
  trigger: string;  // What triggered it (keyword, prompt snippet)
  confidence: number;
}

/**
 * Session activation state
 */
export interface ActivationState {
  sessionId: string;
  startedAt: string;
  activations: ActivationRecord[];
  domains: string[];  // Unique domains that were activated
}

/**
 * Get activation state file path
 */
function getStatePath(projectRoot?: string): string {
  const root = projectRoot || process.cwd();
  return path.join(root, '.specweave', 'state', 'skill-activations.json');
}

/**
 * Load current activation state
 */
export function loadActivations(projectRoot?: string): ActivationState | null {
  const statePath = getStatePath(projectRoot);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return fs.readJsonSync(statePath) as ActivationState;
  } catch {
    return null;
  }
}

/**
 * Initialize activation tracking for a new session
 */
export function initSession(sessionId: string, projectRoot?: string): ActivationState {
  const state: ActivationState = {
    sessionId,
    startedAt: new Date().toISOString(),
    activations: [],
    domains: [],
  };

  const statePath = getStatePath(projectRoot);
  const stateDir = path.dirname(statePath);

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  fs.writeJsonSync(statePath, state, { spaces: 2 });
  return state;
}

/**
 * Track a skill or agent activation
 */
export function trackActivation(
  record: Omit<ActivationRecord, 'timestamp'>,
  projectRoot?: string
): void {
  const statePath = getStatePath(projectRoot);

  // Load or create state
  let state = loadActivations(projectRoot);
  if (!state) {
    // Auto-initialize if no session exists
    state = initSession(`auto-${Date.now()}`, projectRoot);
  }

  // Add activation record
  const activation: ActivationRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };

  state.activations.push(activation);

  // Track unique domains
  if (!state.domains.includes(record.domain)) {
    state.domains.push(record.domain);
  }

  // Save state
  try {
    fs.writeJsonSync(statePath, state, { spaces: 2 });
  } catch {
    // Ignore save errors
  }
}

/**
 * Clear activation state (called after validation completes)
 */
export function clearActivations(projectRoot?: string): void {
  const statePath = getStatePath(projectRoot);

  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

/**
 * Get domains that were activated in current session
 */
export function getActivatedDomains(projectRoot?: string): string[] {
  const state = loadActivations(projectRoot);
  return state?.domains || [];
}

/**
 * Check if any skills/agents were activated
 */
export function hasActivations(projectRoot?: string): boolean {
  const state = loadActivations(projectRoot);
  return (state?.activations.length || 0) > 0;
}

/**
 * Get activation summary for logging
 */
export function getActivationSummary(projectRoot?: string): string {
  const state = loadActivations(projectRoot);

  if (!state || state.activations.length === 0) {
    return 'No skills or agents were activated in this session.';
  }

  const lines: string[] = [
    `Session: ${state.sessionId}`,
    `Started: ${state.startedAt}`,
    `Activations: ${state.activations.length}`,
    `Domains: ${state.domains.join(', ')}`,
    '',
    'Activation History:',
  ];

  for (const act of state.activations) {
    lines.push(`  [${act.timestamp}] ${act.type}: ${act.fqn} (${act.domain})`);
  }

  return lines.join('\n');
}

/**
 * Infer domain from skill/agent FQN
 */
export function inferDomain(fqn: string): string {
  const lower = fqn.toLowerCase();

  // Check for explicit domain in FQN
  if (lower.includes('frontend') || lower.includes('react') || lower.includes('vue') || lower.includes('angular')) {
    return 'frontend';
  }
  if (lower.includes('backend') || lower.includes('api') || lower.includes('express') || lower.includes('fastapi')) {
    return 'backend';
  }
  if (lower.includes('mobile') || lower.includes('expo') || lower.includes('ios') || lower.includes('android')) {
    return 'mobile';
  }
  if (lower.includes('infra') || lower.includes('terraform') || lower.includes('k8s') || lower.includes('docker')) {
    return 'infrastructure';
  }
  if (lower.includes('ml') || lower.includes('model') || lower.includes('training') || lower.includes('ai')) {
    return 'ml';
  }
  if (lower.includes('test') || lower.includes('qa') || lower.includes('playwright') || lower.includes('vitest')) {
    return 'testing';
  }

  return 'general';
}
