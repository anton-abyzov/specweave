/**
 * Submission Queue
 *
 * File-based queue for marketplace skill submissions.
 * Skills flow: discovered -> queued -> scanning -> tier1_passed/failed -> tier2_pending -> verified/rejected
 *
 * Features:
 * - File-based persistence at .specweave/state/skill-submissions.json
 * - Deduplication by repo full name
 * - Status transition validation
 * - Backup before write (.bak file)
 * - Recovery from corrupted JSON
 * - Filtering and pagination
 * - Aggregated insights/analytics
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  GitHubRepoInfo,
  SkillSubmission,
  SubmissionStatus,
  SubmissionQueueData,
  SubmissionFilter,
  PaginatedSubmissions,
  SubmissionInsights,
} from './submission-queue-types.js';

const QUEUE_FILE = '.specweave/state/skill-submissions.json';

/**
 * Valid status transitions map.
 * Each key lists the statuses it can transition TO.
 */
const VALID_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  'discovered': ['queued', 'rejected'],
  'queued': ['scanning', 'rejected'],
  'scanning': ['tier1_passed', 'tier1_failed', 'rejected'],
  'tier1_passed': ['tier2_pending', 'verified', 'rejected'],
  'tier1_failed': ['queued', 'rejected'],
  'tier2_pending': ['verified', 'rejected'],
  'verified': [],
  'rejected': [],
};

/** Statuses from which approve() can set verified */
const APPROVABLE_STATUSES: SubmissionStatus[] = ['tier1_passed', 'tier2_pending'];

/** Statuses from which reject() can set rejected (all non-terminal) */
const REJECTABLE_STATUSES: SubmissionStatus[] = [
  'discovered', 'queued', 'scanning', 'tier1_passed', 'tier1_failed', 'tier2_pending',
];

/** Pending statuses (not yet verified or rejected) */
const PENDING_STATUSES: SubmissionStatus[] = [
  'discovered', 'queued', 'scanning', 'tier1_passed', 'tier1_failed', 'tier2_pending',
];

export class SubmissionQueue {
  private filePath: string;
  private data: SubmissionQueueData;

  constructor(private projectPath: string) {
    this.filePath = path.join(projectPath, QUEUE_FILE);
    this.data = this.load();
  }

  /**
   * Reload data from disk (useful when external processes write to the file).
   */
  reload(): void {
    this.data = this.load();
  }

  /**
   * Add a submission to the queue from GitHub repo info.
   * Deduplicates by repoFullName -- returns existing entry if already present.
   */
  addSubmission(info: GitHubRepoInfo): SkillSubmission {
    const existing = this.data.submissions.find(
      s => s.repoFullName === info.fullName
    );
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const submission: SkillSubmission = {
      id: crypto.randomUUID().slice(0, 12),
      repoFullName: info.fullName,
      repoUrl: info.htmlUrl,
      skillPath: info.skillPath,
      author: info.owner,
      stars: info.stars,
      lastUpdated: info.lastUpdated,
      status: 'discovered',
      discoveredAt: now,
      updatedAt: now,
    };

    this.data.submissions.push(submission);
    this.save();
    return submission;
  }

  /**
   * Update the status of a submission.
   * Validates that the transition is allowed.
   * Returns null if the ID is not found or transition is invalid.
   */
  updateStatus(id: string, newStatus: SubmissionStatus): SkillSubmission | null {
    const submission = this.data.submissions.find(s => s.id === id);
    if (!submission) {
      return null;
    }

    const allowed = VALID_TRANSITIONS[submission.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return null;
    }

    submission.status = newStatus;
    submission.updatedAt = new Date().toISOString();
    this.save();
    return submission;
  }

  /**
   * Approve a submission (set status to verified).
   * Only works from approvable statuses (tier1_passed, tier2_pending).
   */
  approve(id: string): SkillSubmission | null {
    const submission = this.data.submissions.find(s => s.id === id);
    if (!submission) {
      return null;
    }

    if (!APPROVABLE_STATUSES.includes(submission.status)) {
      return null;
    }

    submission.status = 'verified';
    submission.updatedAt = new Date().toISOString();
    this.save();
    return submission;
  }

  /**
   * Reject a submission with a reason.
   * Can reject from any non-terminal status.
   */
  reject(id: string, reason: string): SkillSubmission | null {
    const submission = this.data.submissions.find(s => s.id === id);
    if (!submission) {
      return null;
    }

    if (!REJECTABLE_STATUSES.includes(submission.status)) {
      return null;
    }

    submission.status = 'rejected';
    submission.rejectedReason = reason;
    submission.updatedAt = new Date().toISOString();
    this.save();
    return submission;
  }

  /**
   * Update data fields on a submission (skillContent, tier1Result, etc.).
   * Does NOT change status — use updateStatus() for that.
   */
  updateFields(id: string, fields: Partial<Pick<SkillSubmission, 'skillContent' | 'tier1Result' | 'tier2Result'>>): SkillSubmission | null {
    const submission = this.data.submissions.find(s => s.id === id);
    if (!submission) return null;

    Object.assign(submission, fields);
    submission.updatedAt = new Date().toISOString();
    this.save();
    return submission;
  }

  /**
   * Get a single submission by ID.
   */
  getById(id: string): SkillSubmission | null {
    return this.data.submissions.find(s => s.id === id) ?? null;
  }

  /**
   * Get submissions with optional filtering and pagination.
   */
  getSubmissions(filter: SubmissionFilter): PaginatedSubmissions {
    let items = [...this.data.submissions];

    if (filter.status) {
      items = items.filter(s => s.status === filter.status);
    }

    const total = items.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? (items.length || 20);

    items = items.slice(offset, offset + limit);

    return { items, total, limit, offset };
  }

  /**
   * Get aggregated insights about the submission pipeline.
   */
  getInsights(): SubmissionInsights {
    const submissions = this.data.submissions;

    const statusDistribution: Record<SubmissionStatus, number> = {
      'discovered': 0,
      'queued': 0,
      'scanning': 0,
      'tier1_passed': 0,
      'tier1_failed': 0,
      'tier2_pending': 0,
      'verified': 0,
      'rejected': 0,
    };

    for (const sub of submissions) {
      statusDistribution[sub.status]++;
    }

    // Tier 1 pass rate: tier1_passed / (tier1_passed + tier1_failed)
    // Count those that reached tier1_passed or beyond (excluding tier1_failed path)
    const tier1Passed = statusDistribution['tier1_passed'] +
      statusDistribution['tier2_pending'] +
      statusDistribution['verified'];
    const tier1Failed = statusDistribution['tier1_failed'];
    const tier1Evaluated = tier1Passed + tier1Failed;
    const tier1PassRate = tier1Evaluated > 0
      ? Math.round((tier1Passed / tier1Evaluated) * 100)
      : 0;

    // Tier 2 pass rate: verified / (verified + tier2_pending)
    const tier2Passed = statusDistribution['verified'];
    const tier2Total = tier2Passed + statusDistribution['tier2_pending'];
    const tier2PassRate = tier2Total > 0
      ? Math.round((tier2Passed / tier2Total) * 100)
      : 0;

    // Pending count
    const totalPending = PENDING_STATUSES.reduce(
      (sum, status) => sum + statusDistribution[status],
      0
    );

    // Discovery timeline (group by date)
    const dayCounts = new Map<string, number>();
    for (const sub of submissions) {
      const date = sub.discoveredAt.split('T')[0];
      dayCounts.set(date, (dayCounts.get(date) || 0) + 1);
    }
    const discoveryTimeline = Array.from(dayCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalDiscovered: submissions.length,
      totalVerified: statusDistribution['verified'],
      totalRejected: statusDistribution['rejected'],
      totalPending,
      tier1PassRate,
      tier2PassRate,
      discoveryTimeline,
      statusDistribution,
    };
  }

  /**
   * Load queue data from disk with backup recovery.
   */
  private load(): SubmissionQueueData {
    const emptyData: SubmissionQueueData = {
      submissions: [],
      lastUpdated: new Date().toISOString(),
      version: 1,
    };

    // Try loading main file
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(content) as SubmissionQueueData;
        if (data && Array.isArray(data.submissions)) {
          return data;
        }
      }
    } catch {
      // Main file corrupted, try backup
    }

    // Try backup file
    const backupPath = this.filePath + '.bak';
    try {
      if (fs.existsSync(backupPath)) {
        const content = fs.readFileSync(backupPath, 'utf-8');
        const data = JSON.parse(content) as SubmissionQueueData;
        if (data && Array.isArray(data.submissions)) {
          return data;
        }
      }
    } catch {
      // Backup also corrupted
    }

    return emptyData;
  }

  /**
   * Save queue data to disk.
   * Creates a .bak backup of the previous file before writing.
   */
  private save(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create backup of existing file before overwriting
    if (fs.existsSync(this.filePath)) {
      const backupPath = this.filePath + '.bak';
      try {
        fs.copyFileSync(this.filePath, backupPath);
      } catch {
        // Non-fatal: continue saving even if backup fails
      }
    }

    this.data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
