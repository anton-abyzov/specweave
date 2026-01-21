/**
 * Parallel Auto Mode
 *
 * Module for parallel agent execution in auto mode.
 * Provides worktree isolation, state management, agent spawning,
 * prompt analysis, and PR generation.
 */

// Re-export types from main types.ts
export type {
  AgentDomain,
  AgentStatus,
  ParallelAgent,
  ParallelSession,
  ParallelConfig,
  FlagSuggestion,
  WorktreeInfo,
  PRResult,
  GitProvider,
} from '../types.js';

// Core orchestrator
export {
  ParallelOrchestrator,
  type DomainTaskAssignment,
  type SessionCreateOptions,
  type SessionStatus,
  type AgentCompletionCallback,
} from './orchestrator.js';

// Worktree management
export {
  WorktreeManager,
  type WorktreeCreateOptions,
  type WorktreeRemoveOptions,
  type MergeResult,
} from './worktree-manager.js';

// State management
export { StateManager } from './state-manager.js';

// Agent spawning
export {
  AgentSpawner,
  type TaskSpawnRequest,
  type AgentContext,
  type AgentSpawnResult,
} from './agent-spawner.js';

// Prompt analysis
export {
  PromptAnalyzer,
  DOMAIN_KEYWORDS,
  type DomainDetection,
  type AnalysisResult,
} from './prompt-analyzer.js';

// PR generation
export {
  PRGenerator,
  type PRCreateOptions,
} from './pr-generator.js';

// Platform utilities
export {
  isWindows,
  isMacOS,
  isLinux,
  normalizePath,
  handleLongPath,
  getShell,
  spawnCommand,
  playSound,
  isCI,
  generateId,
  timestamp,
  type SpawnResult,
  type SoundType,
} from './platform-utils.js';
