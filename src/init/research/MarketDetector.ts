/**
 * Market Category Detector - Rule-Based Classification
 *
 * Classifies product vision into market categories using intelligent
 * rule-based matching against domain patterns. No external LLM calls -
 * all classification logic is encoded at spec-time.
 *
 * **Approach**:
 * 1. Match vision against domain patterns
 * 2. Score each market category based on pattern matches
 * 3. Calculate confidence score
 * 4. Return best-fit category with confidence
 *
 * **Benefits**:
 * - Zero external dependencies
 * - Instant classification (no API latency)
 * - 100% deterministic and testable
 * - Works offline
 */

import { MarketCategory } from './types.js';
import { DOMAIN_PATTERNS } from './keyword-extractor.js';

/**
 * Market category mapping to domain patterns
 *
 * Each market category is defined by:
 * - Primary domains (strongly correlated)
 * - Secondary domains (moderately correlated)
 * - Minimum score threshold
 */
interface MarketCategoryMapping {
  /** Market category name */
  category: MarketCategory;

  /** Primary domain indicators (weight: 3.0) */
  primaryDomains: string[];

  /** Secondary domain indicators (weight: 1.0) */
  secondaryDomains: string[];

  /** Minimum confidence threshold (0-1) */
  minConfidence: number;
}

/**
 * Market category classification result
 */
export interface MarketClassification {
  /** Detected market category */
  category: MarketCategory;

  /** Confidence score (0-1) */
  confidence: number;

  /** Runner-up category (if close) */
  runnerUp?: {
    category: MarketCategory;
    confidence: number;
  };
}

/**
 * Market category mappings with intelligent rules
 *
 * This encodes business intelligence about what domains correlate
 * with which market categories.
 */
const MARKET_MAPPINGS: MarketCategoryMapping[] = [
  {
    category: 'productivity-saas',
    primaryDomains: ['productivity', 'saas', 'collaboration'],
    secondaryDomains: ['enterprise', 'design'],
    minConfidence: 0.6
  },
  {
    category: 'healthcare',
    primaryDomains: ['healthcare'],
    secondaryDomains: ['ai-ml', 'saas', 'enterprise'],
    minConfidence: 0.7
  },
  {
    category: 'fintech',
    primaryDomains: ['fintech'],
    secondaryDomains: ['ecommerce', 'enterprise', 'blockchain'],
    minConfidence: 0.7
  },
  {
    category: 'e-commerce',
    primaryDomains: ['ecommerce'],
    secondaryDomains: ['fintech', 'ai-ml', 'social'],
    minConfidence: 0.6
  },
  {
    category: 'education',
    primaryDomains: ['education'],
    secondaryDomains: ['ai-ml', 'saas', 'collaboration'],
    minConfidence: 0.6
  },
  {
    category: 'gaming',
    primaryDomains: ['gaming'],
    secondaryDomains: ['social', 'ai-ml'],
    minConfidence: 0.7
  },
  {
    category: 'social-network',
    primaryDomains: ['social'],
    secondaryDomains: ['collaboration', 'ecommerce', 'gaming'],
    minConfidence: 0.6
  },
  {
    category: 'enterprise-b2b',
    primaryDomains: ['enterprise'],
    secondaryDomains: ['productivity', 'saas', 'collaboration'],
    minConfidence: 0.6
  },
  {
    category: 'consumer-b2c',
    primaryDomains: ['social', 'ecommerce'],
    secondaryDomains: ['gaming', 'education'],
    minConfidence: 0.5
  },
  {
    category: 'marketplace',
    primaryDomains: ['ecommerce'],
    secondaryDomains: ['social', 'fintech'],
    minConfidence: 0.6
  },
  {
    category: 'iot',
    primaryDomains: ['iot'],
    secondaryDomains: ['ai-ml', 'healthcare'],
    minConfidence: 0.7
  },
  {
    category: 'blockchain',
    primaryDomains: ['blockchain'],
    secondaryDomains: ['fintech', 'gaming'],
    minConfidence: 0.7
  },
  {
    category: 'ai-ml',
    primaryDomains: ['ai-ml'],
    secondaryDomains: ['healthcare', 'fintech', 'ecommerce'],
    minConfidence: 0.7
  }
];

/**
 * Detect market category from vision text
 *
 * Uses rule-based classification against domain patterns to determine
 * the best-fit market category with confidence score.
 *
 * @param vision - Product vision text
 * @returns Market classification with category and confidence
 *
 * @example
 * ```typescript
 * const result = detectMarketCategory('A project management tool for agile teams');
 * // Returns: { category: 'productivity-saas', confidence: 0.85 }
 * ```
 */
export function detectMarketCategory(vision: string): MarketClassification {
  if (!vision || vision.trim().length === 0) {
    return {
      category: 'unknown',
      confidence: 0
    };
  }

  const visionLower = vision.toLowerCase();

  // Step 1: Detect which domains are present in the vision
  const presentDomains = new Set<string>();

  for (const domainPattern of DOMAIN_PATTERNS) {
    const regex = new RegExp(domainPattern.pattern);
    if (regex.test(visionLower)) {
      presentDomains.add(domainPattern.domain);
    }
  }

  // If no domains detected, return unknown
  if (presentDomains.size === 0) {
    return {
      category: 'unknown',
      confidence: 0
    };
  }

  // Step 2: Score each market category based on domain matches
  const categoryScores: Array<{
    category: MarketCategory;
    score: number;
    confidence: number;
  }> = [];

  for (const mapping of MARKET_MAPPINGS) {
    let score = 0;

    // Primary domains: weight 3.0
    for (const primaryDomain of mapping.primaryDomains) {
      if (presentDomains.has(primaryDomain)) {
        score += 3.0;
      }
    }

    // Secondary domains: weight 1.0
    for (const secondaryDomain of mapping.secondaryDomains) {
      if (presentDomains.has(secondaryDomain)) {
        score += 1.0;
      }
    }

    // Calculate confidence (normalize score)
    const maxPossibleScore = mapping.primaryDomains.length * 3.0 +
                            mapping.secondaryDomains.length * 1.0;
    const confidence = score / maxPossibleScore;

    if (confidence >= mapping.minConfidence) {
      categoryScores.push({
        category: mapping.category,
        score,
        confidence
      });
    }
  }

  // Step 3: Sort by score (descending)
  categoryScores.sort((a, b) => b.score - a.score);

  // Step 4: Return best match (or unknown if no matches)
  if (categoryScores.length === 0) {
    return {
      category: 'unknown',
      confidence: 0
    };
  }

  const best = categoryScores[0];
  const result: MarketClassification = {
    category: best.category,
    confidence: best.confidence
  };

  // Include runner-up if close (within 20% confidence)
  if (categoryScores.length > 1) {
    const runnerUp = categoryScores[1];
    if (runnerUp.confidence >= best.confidence * 0.8) {
      result.runnerUp = {
        category: runnerUp.category,
        confidence: runnerUp.confidence
      };
    }
  }

  return result;
}

/**
 * Get all potential market categories with scores (useful for debugging)
 *
 * @param vision - Product vision text
 * @returns Array of all categories with scores, sorted by confidence
 */
export function analyzeMarketCategories(vision: string): Array<{
  category: MarketCategory;
  confidence: number;
  matchedDomains: string[];
}> {
  if (!vision || vision.trim().length === 0) {
    return [];
  }

  const visionLower = vision.toLowerCase();

  // Detect domains
  const presentDomains = new Set<string>();
  for (const domainPattern of DOMAIN_PATTERNS) {
    const regex = new RegExp(domainPattern.pattern);
    if (regex.test(visionLower)) {
      presentDomains.add(domainPattern.domain);
    }
  }

  // Score all categories
  const results: Array<{
    category: MarketCategory;
    confidence: number;
    matchedDomains: string[];
  }> = [];

  for (const mapping of MARKET_MAPPINGS) {
    let score = 0;
    const matchedDomains: string[] = [];

    for (const primaryDomain of mapping.primaryDomains) {
      if (presentDomains.has(primaryDomain)) {
        score += 3.0;
        matchedDomains.push(primaryDomain);
      }
    }

    for (const secondaryDomain of mapping.secondaryDomains) {
      if (presentDomains.has(secondaryDomain)) {
        score += 1.0;
        matchedDomains.push(secondaryDomain);
      }
    }

    const maxPossibleScore = mapping.primaryDomains.length * 3.0 +
                            mapping.secondaryDomains.length * 1.0;
    const confidence = score / maxPossibleScore;

    results.push({
      category: mapping.category,
      confidence,
      matchedDomains
    });
  }

  // Sort by confidence
  return results.sort((a, b) => b.confidence - a.confidence);
}
