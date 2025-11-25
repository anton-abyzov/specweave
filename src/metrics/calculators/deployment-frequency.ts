/**
 * Deployment Frequency Calculator
 *
 * Calculates how often deployments occur (DORA metric #1)
 * Data source: Commits to develop branch (each push = deployment)
 *
 * For AI-assisted development workflows, counting commits to the
 * default branch is more accurate than counting formal releases.
 */

import { Commit, DeploymentFrequencyMetric } from '../types.js';
import { classifyDeploymentFrequency } from '../utils/tier-classifier.js';

/**
 * Calculate Deployment Frequency from commits to develop
 *
 * Methodology:
 * 1. Count commits to develop in last 30 days
 * 2. Each commit = 1 deployment (trunk-based development)
 * 3. Calculate deploys per month
 * 4. Classify into DORA tier
 *
 * @param commits - Array of commits to default branch
 * @returns Deployment frequency metric
 */
export function calculateDeploymentFrequency(
  commits: Commit[]
): DeploymentFrequencyMetric {
  // Handle zero commits
  if (commits.length === 0) {
    return {
      value: 0,
      unit: 'deploys/month',
      tier: 'N/A',
      description: 'No deployments yet',
    };
  }

  // Count commits as deployments
  const deployCount = commits.length;

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
