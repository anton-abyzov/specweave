/**
 * Job Dependency System
 *
 * Enables jobs to wait for other jobs to complete before starting.
 * Used by living-docs-builder to wait for clone and import jobs.
 */

import { getJobManager, BackgroundJobManager } from './job-manager.js';

export interface DependencyStatus {
  /** Whether all dependencies are satisfied */
  ready: boolean;
  /** Job IDs still running/pending */
  waitingFor: string[];
  /** Job IDs that failed */
  failedDeps: string[];
  /** Job IDs that completed successfully */
  completedDeps: string[];
}

const EMPTY_STATUS: DependencyStatus = { ready: true, waitingFor: [], failedDeps: [], completedDeps: [] };

/**
 * Check the status of job dependencies
 */
export function checkDependencies(
  jobManager: BackgroundJobManager,
  dependsOn: string[] | undefined
): DependencyStatus {
  if (!dependsOn || dependsOn.length === 0) {
    return EMPTY_STATUS;
  }

  const waitingFor: string[] = [];
  const failedDeps: string[] = [];
  const completedDeps: string[] = [];

  for (const depId of dependsOn) {
    const job = jobManager.getJob(depId);

    if (!job) {
      // Job doesn't exist (deleted or never created), treat as completed
      completedDeps.push(depId);
      continue;
    }

    switch (job.status) {
      case 'completed':
      case 'completed_with_warnings':
        completedDeps.push(depId);
        break;
      case 'failed':
        failedDeps.push(depId);
        break;
      default:
        waitingFor.push(depId);
    }
  }

  return {
    ready: waitingFor.length === 0,
    waitingFor,
    failedDeps,
    completedDeps
  };
}

/**
 * Wait for all dependencies to complete (or fail)
 *
 * @param projectPath - Project root path
 * @param dependsOn - Array of job IDs to wait for
 * @param onProgress - Callback for progress updates
 * @param pollIntervalMs - How often to check (default 10 seconds)
 * @returns Final dependency status
 */
export async function waitForDependencies(
  projectPath: string,
  dependsOn: string[] | undefined,
  onProgress: (status: DependencyStatus) => void,
  pollIntervalMs: number = 10000
): Promise<DependencyStatus> {
  const jobManager = getJobManager(projectPath);
  let status = checkDependencies(jobManager, dependsOn);

  while (!status.ready) {
    onProgress(status);
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    status = checkDependencies(jobManager, dependsOn);
  }

  // Final callback with ready status
  onProgress(status);
  return status;
}

/**
 * Check for circular dependencies
 *
 * @param jobManager - Job manager instance
 * @param jobId - The job being checked
 * @param dependsOn - Its dependencies
 * @returns Array of circular dependency chains found, or empty if none
 */
export function detectCircularDependencies(
  jobManager: BackgroundJobManager,
  jobId: string,
  dependsOn: string[] | undefined
): string[][] {
  if (!dependsOn || dependsOn.length === 0) {
    return [];
  }

  const circularChains: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [jobId];

  function dfs(currentId: string): void {
    if (visited.has(currentId)) {
      return;
    }

    const job = jobManager.getJob(currentId);
    if (!job) {
      return;
    }

    // Get dependencies from job config if it has them
    const deps = (job.config as { dependsOn?: string[] }).dependsOn;
    if (!deps || deps.length === 0) {
      return;
    }

    for (const depId of deps) {
      if (depId === jobId) {
        // Found circular dependency back to original job
        circularChains.push([...path, depId]);
      } else if (!visited.has(depId)) {
        path.push(depId);
        dfs(depId);
        path.pop();
      }
    }

    visited.add(currentId);
  }

  // Check each direct dependency
  for (const depId of dependsOn) {
    if (depId === jobId) {
      // Direct self-reference
      circularChains.push([jobId, depId]);
    } else {
      path.push(depId);
      dfs(depId);
      path.pop();
    }
  }

  return circularChains;
}

/**
 * Format dependency status for display
 */
export function formatDependencyStatus(status: DependencyStatus): string {
  if (status.ready) {
    if (status.failedDeps.length > 0) {
      return `Dependencies ready (${status.failedDeps.length} failed, proceeding with partial data)`;
    }
    return 'All dependencies completed';
  }

  const parts: string[] = [];
  if (status.waitingFor.length > 0) {
    parts.push(`Waiting for: ${status.waitingFor.join(', ')}`);
  }
  if (status.completedDeps.length > 0) {
    parts.push(`Completed: ${status.completedDeps.length}`);
  }
  if (status.failedDeps.length > 0) {
    parts.push(`Failed: ${status.failedDeps.length}`);
  }

  return parts.join(' | ');
}
