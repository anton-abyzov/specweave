/**
 * Background Job Manager
 *
 * Manages long-running operations with persistent state.
 * Jobs survive session restarts - can check progress later.
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  BackgroundJob,
  JobConfig,
  JobProgress,
  JobState,
  JobStatus,
  JobType
} from './types.js';

const STATE_FILE = '.specweave/state/background-jobs.json';

export class BackgroundJobManager {
  private projectPath: string;
  private statePath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.statePath = path.join(projectPath, STATE_FILE);
  }

  /**
   * Create a new background job
   */
  createJob(type: JobType, config: JobConfig, totalItems: number): BackgroundJob {
    const job: BackgroundJob = {
      id: crypto.randomUUID().slice(0, 8),
      type,
      status: 'pending',
      progress: {
        current: 0,
        total: totalItems,
        percentage: 0,
        itemsCompleted: [],
        itemsFailed: []
      },
      startedAt: new Date(),
      updatedAt: new Date(),
      config
    };

    this.saveJob(job);
    return job;
  }

  /**
   * Start a job (mark as running)
   */
  startJob(jobId: string): BackgroundJob | null {
    const job = this.getJob(jobId);
    if (!job) return null;

    job.status = 'running';
    job.updatedAt = new Date();
    this.saveJob(job);
    return job;
  }

  /**
   * Update job progress
   *
   * @param jobId Job ID
   * @param current Current item count
   * @param currentItem Current item being processed (for display)
   * @param completed Item ID that completed (appended to list)
   * @param failed Item ID that failed (appended to list)
   * @param newTotal Optional: update total count (ATOMIC - prevents race condition)
   */
  updateProgress(
    jobId: string,
    current: number,
    currentItem?: string,
    completed?: string,
    failed?: string,
    newTotal?: number
  ): BackgroundJob | null {
    const job = this.getJob(jobId);
    if (!job) return null;

    // ATOMIC: Update total if provided (fixes race condition)
    // Previously required two separate calls which could lose updates
    if (newTotal !== undefined && newTotal > job.progress.total) {
      job.progress.total = newTotal;
    }

    job.progress.current = current;
    job.progress.percentage = job.progress.total > 0
      ? Math.round((current / job.progress.total) * 100)
      : 0;
    job.progress.currentItem = currentItem;
    job.updatedAt = new Date();

    if (completed) {
      job.progress.itemsCompleted.push(completed);
    }
    if (failed) {
      job.progress.itemsFailed.push(failed);
    }

    // Calculate rate and ETA
    const elapsed = (Date.now() - new Date(job.startedAt).getTime()) / 1000;
    if (elapsed > 0 && current > 0) {
      job.progress.rate = Math.round((current / elapsed) * 10) / 10;
      const remaining = job.progress.total - current;
      job.progress.eta = job.progress.rate > 0
        ? Math.round(remaining / job.progress.rate)
        : 0;
    }

    this.saveJob(job);
    return job;
  }

  /**
   * Complete a job
   */
  completeJob(jobId: string, error?: string): BackgroundJob | null {
    const job = this.getJob(jobId);
    if (!job) return null;

    job.status = error ? 'failed' : 'completed';
    job.completedAt = new Date();
    job.updatedAt = new Date();
    if (error) job.error = error;

    this.saveJob(job);
    return job;
  }

  /**
   * Pause a job (can resume later)
   */
  pauseJob(jobId: string): BackgroundJob | null {
    const job = this.getJob(jobId);
    if (!job) return null;

    job.status = 'paused';
    job.updatedAt = new Date();
    this.saveJob(job);
    return job;
  }

  /**
   * Get a specific job
   */
  getJob(jobId: string): BackgroundJob | null {
    const state = this.loadState();
    return state.jobs.find(j => j.id === jobId) || null;
  }

  /**
   * Get all jobs (optionally filtered by type or status)
   */
  getJobs(filter?: { type?: JobType; status?: JobStatus }): BackgroundJob[] {
    const state = this.loadState();
    let jobs = state.jobs;

    if (filter?.type) {
      jobs = jobs.filter(j => j.type === filter.type);
    }
    if (filter?.status) {
      jobs = jobs.filter(j => j.status === filter.status);
    }

    // Sort by most recent first
    return jobs.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get active (running/paused) jobs
   */
  getActiveJobs(): BackgroundJob[] {
    return this.getJobs().filter(j =>
      j.status === 'running' || j.status === 'paused' || j.status === 'pending'
    );
  }

  /**
   * Clean up old completed jobs (keep last 10)
   */
  cleanup(): void {
    const state = this.loadState();
    const active = state.jobs.filter(j =>
      j.status === 'running' || j.status === 'paused' || j.status === 'pending'
    );
    const completed = state.jobs
      .filter(j => j.status === 'completed' || j.status === 'failed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);

    state.jobs = [...active, ...completed];
    this.saveState(state);
  }

  /**
   * Load state from disk
   */
  private loadState(): JobState {
    try {
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // Corrupted state - start fresh
    }
    return { jobs: [] };
  }

  /**
   * Save state to disk
   */
  private saveState(state: JobState): void {
    fs.ensureDirSync(path.dirname(this.statePath));
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
  }

  /**
   * Save a single job (merge into state)
   */
  private saveJob(job: BackgroundJob): void {
    const state = this.loadState();
    const index = state.jobs.findIndex(j => j.id === job.id);

    if (index >= 0) {
      state.jobs[index] = job;
    } else {
      state.jobs.push(job);
    }

    this.saveState(state);
  }

  /**
   * Set dependency tracking fields on a job
   * CRITICAL FIX (2025-12-09): Must be called after createJob to persist dependsOn/dependencyStatus
   */
  setDependencies(jobId: string, dependsOn: string[]): BackgroundJob | null {
    const job = this.getJob(jobId);
    if (!job) return null;

    job.dependsOn = dependsOn;
    job.dependencyStatus = 'waiting';
    job.updatedAt = new Date();
    this.saveJob(job);
    return job;
  }

  /**
   * Update dependency status (waiting → ready/partial)
   */
  updateDependencyStatus(jobId: string, status: 'waiting' | 'ready' | 'partial'): BackgroundJob | null {
    const job = this.getJob(jobId);
    if (!job) return null;

    job.dependencyStatus = status;
    job.updatedAt = new Date();
    this.saveJob(job);
    return job;
  }
}

/**
 * Get job manager singleton for a project
 */
const managers = new Map<string, BackgroundJobManager>();

export function getJobManager(projectPath: string): BackgroundJobManager {
  if (!managers.has(projectPath)) {
    managers.set(projectPath, new BackgroundJobManager(projectPath));
  }
  return managers.get(projectPath)!;
}
