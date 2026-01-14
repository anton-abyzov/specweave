/**
 * Living Docs Chunked Execution for Auto Mode
 *
 * Enables living docs to run in auto mode with:
 * - Time-boxed chunks (2 hours max per iteration)
 * - Checkpoint/resume across iterations
 * - Stop hook integration
 * - Phase-by-phase progress tracking
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface LivingDocsCheckpoint {
  currentPhase: Phase;
  completedPhases: Phase[];
  phaseProgress: Record<string, any>;
  startTime: string;
  lastUpdate: string;
  totalPhases: number;
}

export type Phase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface ChunkedExecutionOptions {
  maxDuration: number;        // Max ms per chunk
  checkpoint?: LivingDocsCheckpoint; // Resume from checkpoint
  stopOnPhaseComplete: boolean; // Yield after phase
  projectPath: string;
}

export interface ChunkResult {
  status: 'phase_complete' | 'time_limit' | 'all_complete';
  currentPhase?: Phase;
  nextPhase?: Phase;
  progress?: Record<string, any>;
}

const PHASES: { id: Phase; name: string }[] = [
  { id: 'A', name: 'Discovery' },
  { id: 'B', name: 'Deep Analysis' },
  { id: 'C', name: 'Org Synthesis' },
  { id: 'D', name: 'Architecture' },
  { id: 'E', name: 'Inconsistencies' },
  { id: 'F', name: 'Strategy' },
  { id: 'G', name: 'Enterprise' },
  { id: 'H', name: 'Diagrams' },
];

const PHASE_ORDER: Phase[] = PHASES.map(p => p.id);
const PHASE_NAMES: Record<Phase, string> = Object.fromEntries(
  PHASES.map(p => [p.id, p.name])
) as Record<Phase, string>;

function getCheckpointPath(projectPath: string): string {
  return path.join(projectPath, '.specweave/state/living-docs-checkpoint.json');
}

/**
 * Load checkpoint from filesystem
 */
export function loadLivingDocsCheckpoint(projectPath: string): LivingDocsCheckpoint | null {
  const checkpointPath = getCheckpointPath(projectPath);

  if (!fs.existsSync(checkpointPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
  } catch (error) {
    logger.warn(`Failed to load living docs checkpoint: ${error}`);
    return null;
  }
}

/**
 * Save checkpoint to filesystem
 */
export function saveLivingDocsCheckpoint(
  projectPath: string,
  checkpoint: LivingDocsCheckpoint
): void {
  const checkpointPath = getCheckpointPath(projectPath);
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });

  try {
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
    logger.info(`Living docs checkpoint saved: Phase ${checkpoint.currentPhase}`);
  } catch (error) {
    logger.error(`Failed to save living docs checkpoint: ${error}`);
  }
}

/**
 * Get next phase in sequence
 */
export function getNextPhase(currentPhase: Phase): Phase | null {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}

/**
 * Get phase name for display
 */
export function getPhaseName(phase: Phase): string {
  return PHASE_NAMES[phase] || phase;
}

/**
 * Initialize checkpoint for new execution
 */
export function initializeCheckpoint(): LivingDocsCheckpoint {
  return {
    currentPhase: 'A',
    completedPhases: [],
    phaseProgress: {},
    startTime: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    totalPhases: PHASE_ORDER.length,
  };
}

/**
 * Execute living docs in chunked mode for auto mode integration
 *
 * This breaks the living docs update into time-boxed chunks that can be
 * controlled by the auto mode stop hook.
 */
export async function executeLivingDocsChunk(
  options: ChunkedExecutionOptions
): Promise<ChunkResult> {
  const startTime = Date.now();
  const checkpoint = options.checkpoint || loadLivingDocsCheckpoint(options.projectPath) || initializeCheckpoint();

  logger.info(`Starting living docs chunk: Phase ${checkpoint.currentPhase} (${getPhaseName(checkpoint.currentPhase)})`);

  let currentPhase = checkpoint.currentPhase;
  let phaseProgress = checkpoint.phaseProgress[currentPhase] || {};

  // Time-boxed execution loop
  while (Date.now() - startTime < options.maxDuration) {
    // Execute current phase
    // NOTE: This is a placeholder - actual implementation would call the real living docs builder
    const phaseResult = await executePhase(currentPhase, phaseProgress, options.projectPath);

    if (phaseResult.complete) {
      // Phase completed
      const updatedCheckpoint: LivingDocsCheckpoint = {
        ...checkpoint,
        completedPhases: [...checkpoint.completedPhases, currentPhase],
        lastUpdate: new Date().toISOString(),
      };

      // Save checkpoint
      saveLivingDocsCheckpoint(options.projectPath, updatedCheckpoint);

      logger.info(`Phase ${currentPhase} (${getPhaseName(currentPhase)}) complete!`);

      if (options.stopOnPhaseComplete) {
        // Yield control back to auto mode
        const nextPhase = getNextPhase(currentPhase);
        if (!nextPhase) {
          // All phases complete
          return { status: 'all_complete' };
        }

        return {
          status: 'phase_complete',
          currentPhase,
          nextPhase,
        };
      }

      // Move to next phase
      const nextPhase = getNextPhase(currentPhase);
      if (!nextPhase) {
        // All phases complete
        return { status: 'all_complete' };
      }
      currentPhase = nextPhase;

      phaseProgress = {};
    } else {
      // Phase still in progress
      phaseProgress = phaseResult.progress;

      // Update checkpoint with progress
      const updatedCheckpoint: LivingDocsCheckpoint = {
        ...checkpoint,
        phaseProgress: {
          ...checkpoint.phaseProgress,
          [currentPhase]: phaseProgress,
        },
        lastUpdate: new Date().toISOString(),
      };

      saveLivingDocsCheckpoint(options.projectPath, updatedCheckpoint);
    }
  }

  // Time limit reached
  logger.info(`Living docs chunk time limit reached (${options.maxDuration}ms)`);
  return {
    status: 'time_limit',
    currentPhase,
    progress: phaseProgress,
  };
}

/**
 * Execute a single phase (or chunk of a phase)
 *
 * This is a placeholder that would integrate with the actual living docs builder.
 * In real implementation, this would:
 * 1. Load the living docs builder state
 * 2. Execute the next batch of work for the current phase
 * 3. Return progress information
 */
async function executePhase(
  phase: Phase,
  progress: Record<string, any>,
  projectPath: string
): Promise<{ complete: boolean; progress: Record<string, any> }> {
  // PLACEHOLDER: Real implementation would call the actual living docs builder
  // For now, we'll simulate phase execution

  logger.info(`Executing phase ${phase} (${getPhaseName(phase)})`);

  // This would be replaced with actual living docs builder logic:
  // - Phase A: Discovery (scan file structure, detect repos)
  // - Phase B: Deep Analysis (per-repo analysis)
  // - Phase C: Org Synthesis (team structure inference)
  // - Phase D: Architecture (ADR detection, system diagrams)
  // - Phase E: Inconsistencies (broken links, spec-code gaps)
  // - Phase F: Strategy (recommendations, tech debt)
  // - Phase G: Enterprise (history, feature catalog, delivery docs)
  // - Phase H: Diagrams (Mermaid visualizations)

  // For MVP, we'll mark phase as complete immediately
  // Real implementation would track partial progress and resume
  return {
    complete: true,
    progress: {},
  };
}

/**
 * Clean up checkpoint after completion
 */
export function cleanupCheckpoint(projectPath: string): void {
  const checkpointPath = getCheckpointPath(projectPath);

  try {
    fs.unlinkSync(checkpointPath);
    logger.info('Living docs checkpoint cleaned up');
  } catch {
    // File doesn't exist or can't be deleted - ignore
  }
}

function getPhaseIcon(phase: Phase, checkpoint: LivingDocsCheckpoint): string {
  if (checkpoint.completedPhases.includes(phase)) return '✅';
  if (phase === checkpoint.currentPhase) return '🔄';
  return '⏳';
}

/**
 * Get current progress summary
 */
export function getProgressSummary(checkpoint: LivingDocsCheckpoint): string {
  const completedCount = checkpoint.completedPhases.length;
  const percentage = Math.round((completedCount / checkpoint.totalPhases) * 100);

  const phaseList = PHASE_ORDER
    .map(phase => `  ${getPhaseIcon(phase, checkpoint)} Phase ${phase}: ${getPhaseName(phase)}`)
    .join('\n');

  return `Living Docs Progress: ${completedCount}/${checkpoint.totalPhases} phases (${percentage}%)

${phaseList}

Current: Phase ${checkpoint.currentPhase} (${getPhaseName(checkpoint.currentPhase)})
Started: ${checkpoint.startTime}
Last Update: ${checkpoint.lastUpdate}`;
}
