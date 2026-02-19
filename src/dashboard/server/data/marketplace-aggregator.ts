/**
 * Marketplace Aggregator
 *
 * Provides dashboard-facing API for marketplace scanner status,
 * submission queue management, and pipeline insights.
 */

import { SubmissionQueue } from '../../../core/fabric/submission-queue.js';
import { getJobManager } from '../../../core/background/job-manager.js';
import type {
  SubmissionFilter,
  PaginatedSubmissions,
  SubmissionInsights,
  ScannerStatus,
  SkillSubmission,
} from '../../../core/fabric/submission-queue-types.js';

export class MarketplaceAggregator {
  private queue: SubmissionQueue;

  constructor(private projectPath: string) {
    this.queue = new SubmissionQueue(projectPath);
  }

  /** Get scanner status from BackgroundJobManager state */
  async getScannerStatus(): Promise<ScannerStatus> {
    const jobManager = getJobManager(this.projectPath);
    const activeJobs = jobManager.getActiveJobs();
    const scannerJob = activeJobs.find(
      j => j.type === 'marketplace-scan' && (j.status === 'running' || j.status === 'pending'),
    );

    // Also check completed jobs for last scan info
    const allJobs = jobManager.getJobs({ type: 'marketplace-scan' });
    const lastCompletedJob = allJobs.find(j => j.status === 'completed' || j.status === 'completed_with_warnings');

    const insights = this.queue.getInsights();

    return {
      isRunning: !!scannerJob,
      lastScanTime: lastCompletedJob
        ? new Date(lastCompletedJob.completedAt || lastCompletedJob.updatedAt).toISOString()
        : null,
      reposScanned: lastCompletedJob?.progress?.current ?? 0,
      reposDiscovered: insights.totalDiscovered,
      rateLimitRemaining: null,
      rateLimitReset: null,
      checkpoint: null,
    };
  }

  /** Get paginated/filtered submissions */
  async getQueue(filter?: SubmissionFilter): Promise<PaginatedSubmissions> {
    return this.queue.getSubmissions(filter || {});
  }

  /** Get only verified skills */
  async getVerifiedSkills(): Promise<SkillSubmission[]> {
    const result = this.queue.getSubmissions({ status: 'verified' });
    return result.items;
  }

  /** Get pipeline insights/analytics */
  async getInsights(): Promise<SubmissionInsights> {
    return this.queue.getInsights();
  }

  /** Approve a submission */
  async approveSubmission(id: string): Promise<void> {
    this.queue.approve(id);
  }

  /** Reject a submission with reason */
  async rejectSubmission(id: string, reason: string): Promise<void> {
    this.queue.reject(id, reason);
  }

  /** Get a single submission by ID */
  async getSubmission(id: string): Promise<SkillSubmission | null> {
    return this.queue.getById(id);
  }
}
