/**
 * Checkpoint Manager - Pause/Resume support for Living Docs Builder
 *
 * Enables long-running living docs jobs to:
 * 1. Save progress at key points (after each phase/module)
 * 2. Resume from last checkpoint on restart
 * 3. Track phase and module completion
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import type { LivingDocsPhase } from '../background/types.js';
import type { DiscoveryResult } from './discovery.js';
import type { WorkItemMatchResult } from './workitem-matcher.js';

/**
 * Simplified checkpoint for internal use
 * (Not extending LivingDocsCheckpoint to avoid complex phaseProgress structure)
 */
export interface FullCheckpoint {
  /** Current phase */
  phase: LivingDocsPhase;
  /** Simple progress percentage (0-100) */
  progressPercent: number;
  /** Discovery results (saved after discovery phase) */
  discovery?: DiscoveryResult;
  /** Foundation docs paths (saved after foundation phase) */
  foundationPaths?: string[];
  /** Work item matching stats (saved after integration phase) */
  matchingStats?: {
    totalWorkItems: number;
    matchedWorkItems: number;
    modulesWithWorkItems: number;
  };
  /** Module analysis progress */
  moduleAnalysis?: {
    completed: string[];
    current?: string;
    remaining: string[];
  };
  /** Error log */
  errors: Array<{
    phase: LivingDocsPhase;
    message: string;
    timestamp: string;
  }>;
  /** Last updated timestamp */
  lastUpdated?: string;
}

/**
 * Checkpoint file paths
 */
export interface CheckpointPaths {
  /** Main checkpoint file */
  checkpoint: string;
  /** Phase-specific checkpoint directory */
  phasesDir: string;
  /** Discovery results */
  discovery: string;
  /** Foundation docs record */
  foundation: string;
  /** Matching results */
  matching: string;
}

/**
 * Get checkpoint file paths for a job
 */
export function getCheckpointPaths(projectPath: string, jobId: string): CheckpointPaths {
  const jobDir = path.join(projectPath, '.specweave', 'jobs', jobId);
  const checkpointsDir = path.join(jobDir, 'checkpoints');

  return {
    checkpoint: path.join(checkpointsDir, 'checkpoint.json'),
    phasesDir: checkpointsDir,
    discovery: path.join(checkpointsDir, 'discovery.json'),
    foundation: path.join(checkpointsDir, 'foundation.json'),
    matching: path.join(checkpointsDir, 'matching.json')
  };
}

/**
 * Initialize checkpoint for a new job
 */
export function initializeCheckpoint(
  projectPath: string,
  jobId: string
): FullCheckpoint {
  const checkpoint: FullCheckpoint = {
    phase: 'waiting',
    progressPercent: 0,
    errors: []
  };

  // Ensure checkpoint directory exists
  const paths = getCheckpointPaths(projectPath, jobId);
  fs.ensureDirSync(paths.phasesDir);

  // Save initial checkpoint
  saveCheckpoint(projectPath, jobId, checkpoint);

  return checkpoint;
}

/**
 * Save checkpoint to disk
 */
export function saveCheckpoint(
  projectPath: string,
  jobId: string,
  checkpoint: FullCheckpoint
): void {
  const paths = getCheckpointPaths(projectPath, jobId);
  fs.ensureDirSync(paths.phasesDir);

  // Save main checkpoint
  fs.writeFileSync(paths.checkpoint, JSON.stringify({
    ...checkpoint,
    lastUpdated: new Date().toISOString()
  }, null, 2));
}

/**
 * Load checkpoint from disk
 */
export function loadCheckpoint(
  projectPath: string,
  jobId: string
): FullCheckpoint | null {
  const paths = getCheckpointPaths(projectPath, jobId);

  if (!fs.existsSync(paths.checkpoint)) {
    return null;
  }

  try {
    const content = fs.readFileSync(paths.checkpoint, 'utf-8');
    return JSON.parse(content) as FullCheckpoint;
  } catch {
    return null;
  }
}

/**
 * Save discovery results to checkpoint
 */
export function saveDiscoveryCheckpoint(
  projectPath: string,
  jobId: string,
  discovery: DiscoveryResult
): void {
  const paths = getCheckpointPaths(projectPath, jobId);

  // Save discovery data
  fs.writeFileSync(paths.discovery, JSON.stringify(discovery, null, 2));

  // Update main checkpoint
  const checkpoint = loadCheckpoint(projectPath, jobId) || initializeCheckpoint(projectPath, jobId);
  checkpoint.discovery = discovery;
  checkpoint.phase = 'discovery';
  checkpoint.progressPercent = 100;
  saveCheckpoint(projectPath, jobId, checkpoint);
}

/**
 * Load discovery results from checkpoint
 */
export function loadDiscoveryCheckpoint(
  projectPath: string,
  jobId: string
): DiscoveryResult | null {
  const paths = getCheckpointPaths(projectPath, jobId);

  if (!fs.existsSync(paths.discovery)) {
    return null;
  }

  try {
    const content = fs.readFileSync(paths.discovery, 'utf-8');
    return JSON.parse(content) as DiscoveryResult;
  } catch {
    return null;
  }
}

/**
 * Save foundation phase completion
 */
export function saveFoundationCheckpoint(
  projectPath: string,
  jobId: string,
  foundationPaths: string[]
): void {
  const paths = getCheckpointPaths(projectPath, jobId);

  // Save foundation record
  fs.writeFileSync(paths.foundation, JSON.stringify({
    completedAt: new Date().toISOString(),
    files: foundationPaths
  }, null, 2));

  // Update main checkpoint
  const checkpoint = loadCheckpoint(projectPath, jobId) || initializeCheckpoint(projectPath, jobId);
  checkpoint.foundationPaths = foundationPaths;
  checkpoint.phase = 'foundation';
  checkpoint.progressPercent = 100;
  saveCheckpoint(projectPath, jobId, checkpoint);
}

/**
 * Save matching phase completion
 */
export function saveMatchingCheckpoint(
  projectPath: string,
  jobId: string,
  result: WorkItemMatchResult
): void {
  const paths = getCheckpointPaths(projectPath, jobId);

  // Save matching summary (not full data - too large)
  fs.writeFileSync(paths.matching, JSON.stringify({
    completedAt: new Date().toISOString(),
    stats: result.stats,
    priorityQueue: result.priorityQueue.slice(0, 20)
  }, null, 2));

  // Update main checkpoint
  const checkpoint = loadCheckpoint(projectPath, jobId) || initializeCheckpoint(projectPath, jobId);
  checkpoint.matchingStats = result.stats;
  checkpoint.phase = 'integration';
  checkpoint.progressPercent = 100;
  saveCheckpoint(projectPath, jobId, checkpoint);
}

/**
 * Update module analysis progress
 */
export function updateModuleProgress(
  projectPath: string,
  jobId: string,
  completedModule: string,
  remainingModules: string[]
): void {
  const checkpoint = loadCheckpoint(projectPath, jobId);
  if (!checkpoint) return;

  if (!checkpoint.moduleAnalysis) {
    checkpoint.moduleAnalysis = {
      completed: [],
      remaining: remainingModules
    };
  }

  checkpoint.moduleAnalysis.completed.push(completedModule);
  checkpoint.moduleAnalysis.remaining = remainingModules;
  checkpoint.moduleAnalysis.current = remainingModules[0];

  // Calculate progress
  const total = checkpoint.moduleAnalysis.completed.length + remainingModules.length;
  checkpoint.progressPercent = Math.round((checkpoint.moduleAnalysis.completed.length / total) * 100);

  saveCheckpoint(projectPath, jobId, checkpoint);
}

/**
 * Start module analysis phase
 */
export function startModuleAnalysis(
  projectPath: string,
  jobId: string,
  modules: string[]
): void {
  const checkpoint = loadCheckpoint(projectPath, jobId);
  if (!checkpoint) return;

  checkpoint.phase = 'deep-dive';
  checkpoint.progressPercent = 0;
  checkpoint.moduleAnalysis = {
    completed: [],
    current: modules[0],
    remaining: modules
  };

  saveCheckpoint(projectPath, jobId, checkpoint);
}

/**
 * Record an error in the checkpoint
 */
export function recordError(
  projectPath: string,
  jobId: string,
  phase: LivingDocsPhase,
  message: string
): void {
  const checkpoint = loadCheckpoint(projectPath, jobId);
  if (!checkpoint) return;

  checkpoint.errors.push({
    phase,
    message,
    timestamp: new Date().toISOString()
  });

  saveCheckpoint(projectPath, jobId, checkpoint);
}

/**
 * Complete job with final phase
 */
export function completeJob(
  projectPath: string,
  jobId: string
): void {
  const checkpoint = loadCheckpoint(projectPath, jobId);
  if (!checkpoint) return;

  checkpoint.phase = 'suggestions';
  checkpoint.progressPercent = 100;

  saveCheckpoint(projectPath, jobId, checkpoint);
}

/**
 * Check if a phase is already completed
 */
export function isPhaseCompleted(
  checkpoint: FullCheckpoint | null,
  phase: LivingDocsPhase
): boolean {
  if (!checkpoint) return false;

  const phaseOrder: LivingDocsPhase[] = [
    'waiting', 'discovery', 'foundation', 'integration', 'deep-dive', 'suggestions'
  ];

  const currentIndex = phaseOrder.indexOf(checkpoint.phase);
  const targetIndex = phaseOrder.indexOf(phase);

  // Phase is completed if we're past it AND progress is 100%
  if (currentIndex > targetIndex) return true;
  if (currentIndex === targetIndex && checkpoint.progressPercent === 100) return true;

  return false;
}

/**
 * Get resume point for a job
 */
export function getResumePoint(
  projectPath: string,
  jobId: string
): { phase: LivingDocsPhase; module?: string } | null {
  const checkpoint = loadCheckpoint(projectPath, jobId);
  if (!checkpoint) return null;

  // If in deep-dive phase, resume from current module
  if (checkpoint.phase === 'deep-dive' && checkpoint.moduleAnalysis?.current) {
    return {
      phase: 'deep-dive',
      module: checkpoint.moduleAnalysis.current
    };
  }

  // Otherwise resume from current phase
  return { phase: checkpoint.phase };
}
