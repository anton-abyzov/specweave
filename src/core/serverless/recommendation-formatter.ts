/**
 * Recommendation Formatter
 *
 * Formats serverless platform recommendations with data freshness indicators
 */

import type { ServerlessPlatform } from './types.js';

export interface DataFreshnessResult {
  isStale: boolean;
  daysOld: number;
  lastVerifiedDate: string;
}

/**
 * Check if platform data is stale (> 30 days old)
 */
export function checkDataFreshness(lastVerified: string): DataFreshnessResult {
  const lastVerifiedDate = new Date(lastVerified);
  const today = new Date();

  // Calculate days difference
  const diffTime = Math.abs(today.getTime() - lastVerifiedDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return {
    isStale: diffDays > 30,
    daysOld: diffDays,
    lastVerifiedDate: lastVerified
  };
}

/**
 * Format a platform recommendation with freshness indicator
 */
export function formatPlatformRecommendationWithFreshness(platform: ServerlessPlatform): string {
  const freshness = checkDataFreshness(platform.lastVerified);

  let recommendation = `## ${platform.name} (${platform.provider})\n\n`;

  // Add pricing information
  recommendation += `**Free Tier**:\n`;
  recommendation += `- ${platform.pricing.freeTier.requests.toLocaleString()} requests/month\n`;
  recommendation += `- ${platform.pricing.freeTier.computeGbSeconds.toLocaleString()} GB-seconds/month\n`;
  recommendation += `- ${platform.pricing.freeTier.dataTransferGb} GB data transfer/month\n\n`;

  // Add features
  recommendation += `**Features**:\n`;
  recommendation += `- Runtimes: ${platform.features.runtimes.join(', ')}\n`;
  recommendation += `- Cold Start: ~${platform.features.coldStartMs}ms\n`;
  recommendation += `- Max Execution: ${platform.features.maxExecutionMinutes} minutes\n`;
  recommendation += `- Max Memory: ${platform.features.maxMemoryMb}MB\n\n`;

  // Add data freshness indicator
  recommendation += `---\n\n`;
  recommendation += `📅 **Last verified**: ${platform.lastVerified}`;

  if (freshness.isStale) {
    recommendation += ` ⚠️\n\n`;
    recommendation += `> **⚠️ Stale Data Warning**: This platform data is ${freshness.daysOld} days old (last verified: ${platform.lastVerified}). `;
    recommendation += `Pricing and features may have changed. Please verify current pricing and features with the platform provider before making decisions.\n`;
  } else {
    recommendation += ` ✅ (${freshness.daysOld} days ago)\n`;
  }

  return recommendation;
}

/**
 * Format multiple platform recommendations with freshness indicators
 */
export function formatMultiplePlatformRecommendations(platforms: ServerlessPlatform[]): string {
  let output = `# Serverless Platform Recommendations\n\n`;

  // Check if any platforms have stale data
  const stalePlatforms = platforms.filter(p => checkDataFreshness(p.lastVerified).isStale);

  if (stalePlatforms.length > 0) {
    output += `> **⚠️ Data Freshness Notice**: ${stalePlatforms.length} platform(s) have data older than 30 days. Recommendations include freshness warnings.\n\n`;
  }

  // Add each platform recommendation
  platforms.forEach((platform, index) => {
    if (index > 0) {
      output += `\n---\n\n`;
    }
    output += formatPlatformRecommendationWithFreshness(platform);
  });

  return output;
}
