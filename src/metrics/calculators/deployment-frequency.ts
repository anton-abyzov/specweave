/**
 * Deployment Frequency Calculator
 *
 * Calculates how often deployments occur (DORA metric #1)
 * Data source: GitHub Releases API
 */

import { Release, DeploymentFrequencyMetric } from '../types';
import { classifyDeploymentFrequency } from '../utils/tier-classifier';

/**
 * Calculate Deployment Frequency from releases
 *
 * Methodology:
 * 1. Count releases in last 30 days
 * 2. Calculate deploys per month
 * 3. Classify into DORA tier
 *
 * @param releases - Array of GitHub releases
 * @returns Deployment frequency metric
 */
export function calculateDeploymentFrequency(
  releases: Release[]
): DeploymentFrequencyMetric {
  // Handle zero releases
  if (releases.length === 0) {
    return {
      value: 0,
      unit: 'deploys/month',
      tier: 'N/A',
      description: 'No releases yet',
    };
  }

  // Count releases
  const deployCount = releases.length;

  // Calculate deploys per year (for tier classification)
  // Assumes 30-day window, so multiply by 12 to get annual rate
  const deploysPerYear = (deployCount / 30) * 365;

  // Classify tier
  const tier = classifyDeploymentFrequency(deploysPerYear);

  // Generate description
  let description = '';
  switch (tier) {
    case 'Elite':
      description = 'On-demand deployment capability (multiple deploys per day)';
      break;
    case 'High':
      description = 'High deployment frequency (weekly to daily)';
      break;
    case 'Medium':
      description = 'Moderate deployment frequency (monthly to weekly)';
      break;
    case 'Low':
      description = 'Low deployment frequency (less than monthly)';
      break;
    default:
      description = 'No data available';
  }

  return {
    value: deployCount,
    unit: 'deploys/month',
    tier,
    description,
  };
}
