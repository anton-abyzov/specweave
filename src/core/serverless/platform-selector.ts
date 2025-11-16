/**
 * Platform Selector
 *
 * Ranks serverless platforms based on project context and requirements.
 */

import type {
  ProjectContext,
  ServerlessPlatform,
  PlatformKnowledgeBase,
  PlatformRanking,
  PlatformSelectionResult,
  CloudProvider,
} from './types.js';

interface SelectionCriteria {
  context: ProjectContext;
  preferredEcosystem?: 'aws' | 'azure' | 'gcp' | 'open-source' | 'mobile';
  runtimeRequired?: string;
  prioritizeStartupCredits?: boolean;
  prioritizeLearning?: boolean;
  isProduction?: boolean;
}

/**
 * Select and rank platforms based on criteria
 */
export function selectPlatforms(
  knowledgeBase: PlatformKnowledgeBase,
  criteria: SelectionCriteria
): PlatformSelectionResult {
  const rankings: PlatformRanking[] = [];

  for (const platform of knowledgeBase.platforms.values()) {
    const score = scorePlatform(platform, criteria);
    const rationale = generateRationale(platform, criteria);
    const tradeoffs = generateTradeoffs(platform, criteria);

    rankings.push({
      platform,
      score,
      rationale,
      tradeoffs,
    });
  }

  // Sort by score descending
  rankings.sort((a, b) => b.score - a.score);

  const recommendedPlatform = rankings[0];

  return {
    rankedPlatforms: rankings,
    recommendedPlatform,
    context: criteria.context,
  };
}

/**
 * Score a platform based on selection criteria (0-100)
 */
function scorePlatform(platform: ServerlessPlatform, criteria: SelectionCriteria): number {
  let score = 0; // Base score (changed from 50 to 0 for better differentiation)

  // Context-based scoring
  if (criteria.context === 'pet-project') {
    score += scorePetProject(platform, criteria);
  } else if (criteria.context === 'startup') {
    score += scoreStartup(platform, criteria);
  } else if (criteria.context === 'enterprise') {
    score += scoreEnterprise(platform, criteria);
  }

  // Ecosystem matching (strong preference - should override context biases)
  if (criteria.preferredEcosystem) {
    score += scoreEcosystem(platform, criteria.preferredEcosystem);
  }

  // Runtime support
  if (criteria.runtimeRequired) {
    const hasRuntime = platform.features.runtimes.some((runtime) =>
      runtime.toLowerCase().includes(criteria.runtimeRequired!.toLowerCase())
    );
    score += hasRuntime ? 10 : -20;
  }

  // Learning prioritization
  if (criteria.prioritizeLearning) {
    score += scoreLearning(platform);
  }

  // Ensure score is within 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Score for pet project context
 */
function scorePetProject(platform: ServerlessPlatform, criteria: SelectionCriteria): number {
  let score = 0;

  // Free tier generosity
  const freeTierRequests = platform.pricing.freeTier.requests;
  if (freeTierRequests >= 1000000) {
    score += 20;
  } else if (freeTierRequests >= 500000) {
    score += 10;
  }

  // Ease of learning (documentation, community size)
  if (platform.ecosystem.documentation === 'excellent') {
    score += 10;
  }
  if (platform.ecosystem.communitySize === 'very-large') {
    score += 10;
  }

  // Portability (less lock-in is better for learning)
  if (platform.lockIn.portability === 'high') {
    score += 5;
  }

  // Firebase is excellent for pet projects (beginner-friendly)
  if (platform.id === 'firebase') {
    score += 15;
  }

  // Supabase is great for open-source learners
  if (platform.provider === 'Supabase') {
    score += 10;
  }

  return score;
}

/**
 * Score for startup context
 */
function scoreStartup(platform: ServerlessPlatform, criteria: SelectionCriteria): number {
  let score = 0;

  // Startup credits availability
  const hasStartupProgram = platform.startupPrograms.length > 0;
  if (hasStartupProgram && criteria.prioritizeStartupCredits) {
    score += 25;
  } else if (hasStartupProgram) {
    score += 10;
  }

  // Ecosystem size (more integrations for rapid development)
  if (platform.ecosystem.integrations.length > 15) {
    score += 15;
  } else if (platform.ecosystem.integrations.length > 10) {
    score += 10;
  }

  // Free tier generosity
  const freeTierCompute = platform.pricing.freeTier.computeGbSeconds;
  if (freeTierCompute >= 400000) {
    score += 15;
  }

  // AWS/GCP are strong choices for startups
  if (platform.provider === 'AWS' || platform.provider === 'GCP') {
    score += 10;
  }

  return score;
}

/**
 * Score for enterprise context
 */
function scoreEnterprise(platform: ServerlessPlatform, criteria: SelectionCriteria): number {
  let score = 0;

  // Ecosystem maturity
  if (platform.ecosystem.communitySize === 'very-large') {
    score += 20;
  }

  // Documentation quality (critical for enterprise)
  if (platform.ecosystem.documentation === 'excellent') {
    score += 15;
  }

  // Enterprise features (max memory, max execution time)
  if (platform.features.maxMemoryMb >= 8192) {
    score += 10;
  }
  if (platform.features.maxExecutionMinutes >= 15) {
    score += 10;
  }

  // AWS is the de-facto enterprise choice
  if (platform.provider === 'AWS') {
    score += 20;
  }

  // Azure is strong for Microsoft shops
  if (platform.provider === 'Azure') {
    score += 15;
  }

  // GCP is strong for Google ecosystem
  if (platform.provider === 'GCP') {
    score += 15;
  }

  return score;
}

/**
 * Score based on ecosystem preference
 */
function scoreEcosystem(platform: ServerlessPlatform, ecosystem: string): number {
  let score = 0;

  // Very strong ecosystem preference - must override all context-based biases
  // Even if a platform has weaker features, ecosystem lock-in is a major decision factor
  if (ecosystem === 'aws' && platform.provider === 'AWS') {
    score += 50;
  } else if (ecosystem === 'azure' && platform.provider === 'Azure') {
    score += 50;
  } else if (ecosystem === 'gcp' && platform.provider === 'GCP') {
    score += 50;
  } else if (ecosystem === 'open-source' && platform.provider === 'Supabase') {
    score += 50;
  } else if (ecosystem === 'mobile' && platform.id === 'firebase') {
    score += 50;
  }

  return score;
}

/**
 * Score for learning prioritization
 */
function scoreLearning(platform: ServerlessPlatform): number {
  let score = 0;

  // Excellent documentation for learning
  if (platform.ecosystem.documentation === 'excellent') {
    score += 15;
  }

  // Large community for getting help
  if (platform.ecosystem.communitySize === 'very-large') {
    score += 10;
  }

  // Firebase is beginner-friendly
  if (platform.id === 'firebase') {
    score += 20;
  }

  // Supabase has great docs for learners
  if (platform.provider === 'Supabase') {
    score += 15;
  }

  return score;
}

/**
 * Generate rationale for platform selection
 */
function generateRationale(platform: ServerlessPlatform, criteria: SelectionCriteria): string {
  const reasons: string[] = [];

  if (criteria.context === 'pet-project') {
    reasons.push(
      `Free tier: ${platform.pricing.freeTier.requests.toLocaleString()} requests/month`
    );
    reasons.push(`Documentation: ${platform.ecosystem.documentation || 'good'}`);
    reasons.push(`Community size: ${platform.ecosystem.communitySize}`);
  } else if (criteria.context === 'startup') {
    if (platform.startupPrograms.length > 0) {
      const credits = platform.startupPrograms[0].credits;
      reasons.push(`Startup credits: $${credits}`);
    }
    reasons.push(`${platform.ecosystem.integrations.length} integrations available`);
    reasons.push(`Free tier: ${platform.pricing.freeTier.computeGbSeconds.toLocaleString()} GB-seconds/month`);
  } else if (criteria.context === 'enterprise') {
    reasons.push(`Max memory: ${platform.features.maxMemoryMb} MB`);
    reasons.push(`Max execution: ${platform.features.maxExecutionMinutes} minutes`);
    reasons.push(`Enterprise-grade documentation and support`);
  }

  return reasons.join('. ');
}

/**
 * Generate tradeoffs (pros and cons)
 */
function generateTradeoffs(
  platform: ServerlessPlatform,
  criteria: SelectionCriteria
): {
  pros: string[];
  cons: string[];
} {
  const pros: string[] = [];
  const cons: string[] = [];

  // Portability
  if (platform.lockIn.portability === 'high') {
    pros.push('High portability - easy to migrate to other platforms');
  } else if (platform.lockIn.portability === 'low') {
    cons.push('Low portability - significant vendor lock-in');
  }

  // Documentation
  if (platform.ecosystem.documentation === 'excellent') {
    pros.push('Excellent documentation and learning resources');
  }

  // Community
  if (platform.ecosystem.communitySize === 'very-large') {
    pros.push('Very large community for troubleshooting and support');
  } else if (platform.ecosystem.communitySize === 'small') {
    cons.push('Smaller community - fewer resources and examples');
  }

  // Free tier
  if (platform.pricing.freeTier.requests >= 1000000) {
    pros.push('Generous free tier');
  }

  // Startup credits
  if (platform.startupPrograms.length > 0 && criteria.context === 'startup') {
    pros.push(`Startup credits available ($${platform.startupPrograms[0].credits})`);
  }

  // Cold start
  const coldStartMs = platform.features.coldStartMs;
  if (coldStartMs < 200) {
    pros.push('Fast cold starts (< 200ms)');
  } else if (coldStartMs > 400) {
    cons.push('Slower cold starts (> 400ms)');
  }

  // Runtime support
  if (platform.features.runtimes.length > 6) {
    pros.push(`Wide runtime support (${platform.features.runtimes.length} runtimes)`);
  }

  return { pros, cons };
}
