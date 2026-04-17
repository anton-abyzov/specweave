/**
 * PreToolUse skill-chain state guard (0669 Wave 3 / AC-US5-03).
 *
 * Replaces the prior filesystem-marker-only implementation with a dual-read
 * strategy that prefers TaskGet-based state and falls back to legacy
 * `.specweave/state/skill-chain-*.json` markers for one release (NFR-1.2).
 *
 * @module core/hooks/pretooluse-guard
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SkillChainState {
  phase?: string;
  incrementId?: string;
  source?: string;
  [key: string]: unknown;
}

export type TaskStateProvider = (
  incrementId: string | undefined,
) => Promise<SkillChainState | null>;

export interface GuardContext {
  stateDir: string;
  incrementId?: string;
}

export type StateSource = 'task-state' | 'filesystem' | 'default';

export interface GuardDecision {
  decision: 'allow' | 'block';
  source: StateSource;
  state: SkillChainState | null;
  reason?: string;
}

/**
 * Safely read a skill-chain JSON marker from the filesystem.
 * Tolerates missing files, malformed JSON, and IO errors (NFR-1.2).
 */
function readFilesystemMarker(
  stateDir: string,
  incrementId: string | undefined,
): SkillChainState | null {
  if (!incrementId) return null;

  const markerPath = path.join(stateDir, `skill-chain-${incrementId}.json`);

  try {
    if (!fs.existsSync(markerPath)) return null;
    const raw = fs.readFileSync(markerPath, 'utf-8');
    const parsed = JSON.parse(raw) as SkillChainState;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Invoke the TaskGet-based state provider. Swallows provider errors and
 * treats them as "no state", enabling the filesystem fallback path.
 */
async function safeGetTaskState(
  provider: TaskStateProvider | undefined,
  incrementId: string | undefined,
): Promise<SkillChainState | null> {
  if (!provider) return null;
  try {
    return await provider(incrementId);
  } catch {
    return null;
  }
}

/**
 * Determine the skill-chain state for the current increment.
 *
 * Resolution order:
 *   1. TaskGet-based state (primary source).
 *   2. Filesystem `skill-chain-*.json` marker (legacy fallback for one release).
 *   3. Safe permissive default — never block tool use on missing state.
 */
export async function checkSkillChainState(
  context: GuardContext,
  taskStateProvider?: TaskStateProvider,
): Promise<GuardDecision> {
  const taskState = await safeGetTaskState(taskStateProvider, context.incrementId);
  if (taskState) {
    return { decision: 'allow', source: 'task-state', state: taskState };
  }

  const fsState = readFilesystemMarker(context.stateDir, context.incrementId);
  if (fsState) {
    return { decision: 'allow', source: 'filesystem', state: fsState };
  }

  return { decision: 'allow', source: 'default', state: null };
}
