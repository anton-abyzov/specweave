/**
 * Lead Time for Changes Calculator
 *
 * Calculates time from commit to deployment (DORA metric #2)
 * Data source: Git commits + GitHub Releases API
 */

import { Release, Commit, LeadTimeMetric } from '../types';
import { classifyLeadTime } from '../utils/tier-classifier';
import { calculatePercentile } from '../utils/percentile';

/**
 * Calculate Lead Time for Changes
 *
 * Methodology:
 * 1. For each release, find all commits since previous release
 * 2. Calculate time delta (commit date → release date) for each commit
 * 3. Compute average, P50, P90
 * 4. Classify into DORA tier
 *
 * @param releases - Array of GitHub releases (sorted by date desc)
 * @param commits - Array of Git commits
 * @returns Lead time metric
 */
export function calculateLeadTime(
  releases: Release[],
  commits: Commit[]
): LeadTimeMetric {
  // Handle zero releases
  if (releases.length === 0) {
    return {
      value: 0,
      unit: 'hours',
      tier: 'N/A',
      p50: 0,
      p90: 0,
    };
  }

  // Sort releases by date (newest first)
  const sortedReleases = [...releases].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  // Calculate lead times for all commits
  const leadTimes: number[] = [];

  sortedReleases.forEach((release, index) => {
    const releaseDate = new Date(release.published_at);
    const previousReleaseDate =
      index < sortedReleases.length - 1
        ? new Date(sortedReleases[index + 1].published_at)
        : new Date(0);  // Beginning of time for first release

    // Find commits between previous release and current release
    const releaseCommits = commits.filter(commit => {
      const commitDate = new Date(commit.commit.author.date);
      return commitDate > previousReleaseDate && commitDate <= releaseDate;
    });

    // Calculate lead time for each commit
    releaseCommits.forEach(commit => {
      const commitDate = new Date(commit.commit.author.date);
      const leadTimeMs = releaseDate.getTime() - commitDate.getTime();
      const leadTimeHours = leadTimeMs / (1000 * 60 * 60);  // Convert to hours
      leadTimes.push(leadTimeHours);
    });
  });

  // Handle no commits (edge case)
  if (leadTimes.length === 0) {
    return {
      value: 0,
      unit: 'hours',
      tier: 'N/A',
      p50: 0,
      p90: 0,
    };
  }

  // Calculate statistics
  const averageLeadTime = leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length;
  const p50 = calculatePercentile(leadTimes, 50);
  const p90 = calculatePercentile(leadTimes, 90);

  // Classify tier
  const tier = classifyLeadTime(averageLeadTime);

  // Choose appropriate unit
  const unit = averageLeadTime < 24 ? 'hours' : 'days';
  const value = unit === 'hours' ? averageLeadTime : averageLeadTime / 24;

  return {
    value: Math.round(value * 10) / 10,  // Round to 1 decimal
    unit,
    tier,
    p50: Math.round(p50 * 10) / 10,
    p90: Math.round(p90 * 10) / 10,
  };
}
