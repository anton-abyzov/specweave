/**
 * DORA Metrics Types
 *
 * TypeScript interfaces for DORA metrics calculation
 * Based on DevOps Research and Assessment (DORA) benchmarks
 *
 * @see https://dora.dev/
 */

/**
 * DORA Performance Tier
 * Based on industry benchmarks from DORA research
 */
export type DORAType = 'Elite' | 'High' | 'Medium' | 'Low' | 'N/A';

/**
 * GitHub Release (from REST API)
 */
export interface Release {
  id: number;
  tag_name: string;
  name: string;
  created_at: string;  // ISO 8601
  published_at: string;  // ISO 8601
  target_commitish: string;  // SHA of release commit
}

/**
 * GitHub Commit (from REST API)
 */
export interface Commit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;  // ISO 8601
    };
  };
}

/**
 * GitHub Issue (from REST API)
 */
export interface Issue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
  created_at: string;  // ISO 8601
  closed_at: string | null;  // ISO 8601 or null if still open
}

/**
 * Deployment Frequency Metric
 */
export interface DeploymentFrequencyMetric {
  value: number;
  unit: 'deploys/month' | 'deploys/week';
  tier: DORAType;
  description: string;
}

/**
 * Lead Time for Changes Metric
 */
export interface LeadTimeMetric {
  value: number;
  unit: 'hours' | 'days';
  tier: DORAType;
  p50: number;  // 50th percentile
  p90: number;  // 90th percentile
}

/**
 * Change Failure Rate Metric
 */
export interface ChangeFailureRateMetric {
  value: number;
  unit: 'percentage';
  tier: DORAType;
  failedReleases: number;
  totalReleases: number;
}

/**
 * Mean Time to Recovery (MTTR) Metric
 */
export interface MTTRMetric {
  value: number;
  unit: 'minutes' | 'hours';
  tier: DORAType;
  p50: number;  // 50th percentile
  p90: number;  // 90th percentile
}

/**
 * Complete DORA Metrics Output
 *
 * This is the JSON structure written to metrics/dora-latest.json
 */
export interface DORAMetrics {
  timestamp: string;  // ISO 8601
  metrics: {
    deploymentFrequency: DeploymentFrequencyMetric;
    leadTime: LeadTimeMetric;
    changeFailureRate: ChangeFailureRateMetric;
    mttr: MTTRMetric;
  };
}

/**
 * GitHub API Client Configuration
 */
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}
