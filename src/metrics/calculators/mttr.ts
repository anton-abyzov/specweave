/**
 * Mean Time to Recovery (MTTR) Calculator
 *
 * Calculates average time to recover from incidents (DORA metric #4)
 * Data source: GitHub Issues with labels "incident" or "production-bug"
 */

import { Issue, MTTRMetric } from '../types.js';
import { classifyMTTR } from '../utils/tier-classifier.js';
import { calculatePercentile } from '../utils/percentile.js';

/**
 * Calculate Mean Time to Recovery (MTTR)
 *
 * Methodology:
 * 1. Find closed issues labeled "incident" or "production-bug"
 * 2. Calculate time from created_at to closed_at for each
 * 3. Compute average, P50, P90
 * 4. Classify into DORA tier
 *
 * @param issues - Array of GitHub issues
 * @returns MTTR metric
 */
export function calculateMTTR(issues: Issue[]): MTTRMetric {
  // Filter closed incidents
  const closedIncidents = issues.filter(
    issue =>
      issue.state === 'closed' &&
      issue.closed_at !== null &&
      issue.labels.some(label =>
        label.name === 'incident' || label.name === 'production-bug'
      )
  );

  // Handle zero closed incidents
  if (closedIncidents.length === 0) {
    return {
      value: 0,
      unit: 'minutes',
      tier: 'N/A',
      p50: 0,
      p90: 0,
    };
  }

  // Calculate recovery times (in minutes)
  const recoveryTimes: number[] = closedIncidents.map(incident => {
    const createdAt = new Date(incident.created_at);
    const closedAt = new Date(incident.closed_at!);
    const recoveryMs = closedAt.getTime() - createdAt.getTime();
    return recoveryMs / (1000 * 60);  // Convert to minutes
  });

  // Calculate statistics
  const averageMTTR = recoveryTimes.reduce((sum, rt) => sum + rt, 0) / recoveryTimes.length;
  const p50 = calculatePercentile(recoveryTimes, 50);
  const p90 = calculatePercentile(recoveryTimes, 90);

  // Classify tier
  const tier = classifyMTTR(averageMTTR);

  // Choose appropriate unit
  const unit = averageMTTR < 60 ? 'minutes' : 'hours';
  const value = unit === 'minutes' ? averageMTTR : averageMTTR / 60;

  return {
    value: Math.round(value * 10) / 10,  // Round to 1 decimal
    unit,
    tier,
    p50: Math.round(p50 * 10) / 10,
    p90: Math.round(p90 * 10) / 10,
  };
}
