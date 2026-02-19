/**
 * Submission Queue - Type Definitions
 *
 * Types for the marketplace skill submission pipeline.
 * Skills flow: discovered → queued → scanning → tier1_passed/failed → tier2_pending → verified/rejected
 */

export type SubmissionStatus =
  | 'discovered'
  | 'queued'
  | 'scanning'
  | 'tier1_passed'
  | 'tier1_failed'
  | 'tier2_pending'
  | 'verified'
  | 'rejected';

export interface Tier1Result {
  passed: boolean;
  findings: number;
  score: number;
}

export interface Tier2Result {
  verdict: string;
  score: number;
  threats: string[];
}

export interface SkillSubmission {
  id: string;
  repoFullName: string;
  repoUrl: string;
  skillPath: string;
  author: string;
  stars: number;
  lastUpdated: string;
  status: SubmissionStatus;
  tier1Result?: Tier1Result;
  tier2Result?: Tier2Result;
  discoveredAt: string;
  updatedAt: string;
  rejectedReason?: string;
}

export interface GitHubRepoInfo {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  owner: string;
  stars: number;
  lastUpdated: string;
  skillPath: string;
}

export interface ScannerStatus {
  isRunning: boolean;
  lastScanTime: string | null;
  reposScanned: number;
  reposDiscovered: number;
  rateLimitRemaining: number | null;
  rateLimitReset: string | null;
  checkpoint: {
    lastCursor: string;
    seenRepos: string[];
  } | null;
}

export interface SubmissionInsights {
  totalDiscovered: number;
  totalVerified: number;
  totalRejected: number;
  totalPending: number;
  tier1PassRate: number;
  tier2PassRate: number;
  discoveryTimeline: Array<{
    date: string;
    count: number;
  }>;
  statusDistribution: Record<SubmissionStatus, number>;
}

export interface SubmissionQueueData {
  submissions: SkillSubmission[];
  lastUpdated: string;
  version: number;
}

export interface SubmissionFilter {
  status?: SubmissionStatus;
  limit?: number;
  offset?: number;
}

export interface PaginatedSubmissions {
  items: SkillSubmission[];
  total: number;
  limit: number;
  offset: number;
}
