/**
 * Change Failure Rate Calculator
 *
 * Calculates percentage of deployments that cause failures (DORA metric #3)
 * Data source: GitHub Issues with labels "incident" or "production-bug"
 */

import { Release, Issue, ChangeFailureRateMetric } from '../types';
import { classifyChangeFailureRate } from '../utils/tier-classifier';

/**
 * Calculate Change Failure Rate
 *
 * Methodology:
 * 1. Find issues labeled "incident" or "production-bug"
 * 2. Link each incident to the most recent release before it
 * 3. Calculate percentage of releases with incidents
 * 4. Classify into DORA tier
 *
 * @param releases - Array of GitHub releases
 * @param issues - Array of GitHub issues
 * @returns Change failure rate metric
 */
export function calculateChangeFailureRate(
  releases: Release[],
  issues: Issue[]
): ChangeFailureRateMetric {
  // Handle zero releases
  if (releases.length === 0) {
    return {
      value: 0,
      unit: 'percentage',
      tier: 'N/A',
      failedReleases: 0,
      totalReleases: 0,
    };
  }

  // Filter incidents (issues with incident or production-bug labels)
  const incidents = issues.filter(issue =>
    issue.labels.some(label =>
      label.name === 'incident' || label.name === 'production-bug'
    )
  );

  // Handle zero incidents (perfect!)
  if (incidents.length === 0) {
    return {
      value: 0,
      unit: 'percentage',
      tier: 'Elite',
      failedReleases: 0,
      totalReleases: releases.length,
    };
  }

  // Sort releases by date (newest first)
  const sortedReleases = [...releases].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  // Track which releases had incidents
  const failedReleaseIds = new Set<number>();

  incidents.forEach(incident => {
    const incidentDate = new Date(incident.created_at);

    // Find most recent release before this incident
    const applicableRelease = sortedReleases.find(
      release => new Date(release.published_at) <= incidentDate
    );

    if (applicableRelease) {
      failedReleaseIds.add(applicableRelease.id);
    }
  });

  // Calculate failure rate
  const failedReleases = failedReleaseIds.size;
  const totalReleases = releases.length;
  const failureRate = (failedReleases / totalReleases) * 100;

  // Classify tier
  const tier = classifyChangeFailureRate(failureRate);

  return {
    value: Math.round(failureRate * 10) / 10,  // Round to 1 decimal
    unit: 'percentage',
    tier,
    failedReleases,
    totalReleases,
  };
}
