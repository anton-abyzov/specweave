/**
 * Keyword Extractor - Pattern-Based Intelligence
 *
 * Extracts domain-specific keywords from product vision using intelligent
 * pattern matching. No external LLM API calls - all intelligence is encoded
 * at spec-time using domain knowledge.
 *
 * **Approach**:
 * 1. Define domain patterns (design, collaboration, productivity, etc.)
 * 2. Match vision text against patterns
 * 3. Score and rank keywords by relevance
 * 4. Deduplicate and return top 5-10 keywords
 *
 * **Benefits**:
 * - Zero external dependencies
 * - Instant execution (no API latency)
 * - 100% deterministic and testable
 * - Works offline
 */

/**
 * Domain pattern definitions
 *
 * Each pattern maps to a domain category and contains:
 * - Regex pattern for matching
 * - Weight (importance multiplier)
 * - Related keywords
 */
export interface DomainPattern {
  /** Domain category name */
  domain: string;

  /** Regex pattern for matching */
  pattern: RegExp;

  /** Weight multiplier (1.0 = normal, 2.0 = high priority) */
  weight: number;

  /** Related keywords for this domain */
  keywords: string[];
}

/**
 * Keyword match result
 */
export interface KeywordMatch {
  /** Matched keyword */
  keyword: string;

  /** Domain category */
  domain: string;

  /** Relevance score (higher = more relevant) */
  score: number;

  /** Number of times this keyword appeared */
  frequency: number;
}

/**
 * Domain patterns encoded with intelligence from spec generation time
 *
 * This is where the AI intelligence lives - as smart patterns designed
 * by Claude during spec generation, not as runtime LLM calls!
 */
export const DOMAIN_PATTERNS: DomainPattern[] = [
  // Design & Creative
  {
    domain: 'design',
    pattern: /\b(figma|sketch|canva|adobe|photoshop|illustrator|design|creative|visual|ui|ux|graphics|wireframe|mockup|prototype)\b/gi,
    weight: 1.5,
    keywords: ['design', 'creative', 'visual', 'ui', 'ux']
  },

  // Collaboration & Teams
  {
    domain: 'collaboration',
    pattern: /\b(team|collaborate|collaboration|remote|together|share|sharing|sync|real-time|concurrent|multiplayer|co-edit)\b/gi,
    weight: 1.3,
    keywords: ['collaboration', 'team', 'remote', 'share', 'real-time']
  },

  // Productivity & Project Management
  {
    domain: 'productivity',
    pattern: /\b(task|project|manage|management|organize|workflow|productivity|agile|scrum|kanban|backlog|sprint|milestone)\b/gi,
    weight: 1.2,
    keywords: ['productivity', 'project', 'task', 'workflow', 'manage']
  },

  // SaaS & Cloud
  {
    domain: 'saas',
    pattern: /\b(saas|cloud|platform|service|subscription|software|web-based|online|hosted|infrastructure)\b/gi,
    weight: 1.1,
    keywords: ['saas', 'cloud', 'platform', 'service', 'subscription']
  },

  // Healthcare & Medical
  {
    domain: 'healthcare',
    pattern: /\b(health|healthcare|medical|patient|hospital|clinic|doctor|physician|nurse|medicine|diagnosis|treatment|hipaa|phi)\b/gi,
    weight: 1.8,
    keywords: ['healthcare', 'medical', 'patient', 'health', 'clinical']
  },

  // Fintech & Payments
  {
    domain: 'fintech',
    pattern: /\b(payment|payments|finance|financial|banking|transaction|money|invest|investment|crypto|blockchain|wallet|trading)\b/gi,
    weight: 1.7,
    keywords: ['fintech', 'payment', 'financial', 'banking', 'transaction']
  },

  // E-commerce & Retail
  {
    domain: 'ecommerce',
    pattern: /\b(shop|store|ecommerce|e-commerce|buy|sell|selling|product|products|cart|checkout|marketplace|retail|merchant)\b/gi,
    weight: 1.4,
    keywords: ['ecommerce', 'shop', 'store', 'marketplace', 'retail']
  },

  // Education & Learning
  {
    domain: 'education',
    pattern: /\b(learn|learning|teach|teaching|student|students|course|courses|education|educational|training|school|university)\b/gi,
    weight: 1.3,
    keywords: ['education', 'learning', 'teaching', 'course', 'student']
  },

  // Social & Community
  {
    domain: 'social',
    pattern: /\b(social|network|networking|connect|connection|follow|follower|share|post|feed|community|forum|discussion)\b/gi,
    weight: 1.2,
    keywords: ['social', 'network', 'community', 'connect', 'share']
  },

  // Gaming & Entertainment
  {
    domain: 'gaming',
    pattern: /\b(game|gaming|gamer|play|player|multiplayer|esports|entertainment|streaming|video)\b/gi,
    weight: 1.1,
    keywords: ['gaming', 'game', 'entertainment', 'play', 'player']
  },

  // IoT & Hardware
  {
    domain: 'iot',
    pattern: /\b(iot|internet-of-things|device|devices|sensor|sensors|hardware|embedded|smart-home|automation)\b/gi,
    weight: 1.2,
    keywords: ['iot', 'device', 'sensor', 'hardware', 'automation']
  },

  // AI & Machine Learning
  {
    domain: 'ai-ml',
    pattern: /\b(ai|artificial[\s-]intelligence|ml|machine[\s-]learning|neural|deep[\s-]learning|nlp|computer[\s-]vision|predict|prediction|predictive|model|analytics)\b/gi,
    weight: 1.6,
    keywords: ['ai', 'machine-learning', 'intelligence', 'prediction', 'model']
  },

  // Enterprise & B2B
  {
    domain: 'enterprise',
    pattern: /\b(enterprise|b2b|business|corporate|company|organization|erp|crm|sales|marketing)\b/gi,
    weight: 1.2,
    keywords: ['enterprise', 'business', 'corporate', 'b2b', 'organization']
  }
];

/**
 * Extract keywords from vision text using pattern matching
 *
 * @param vision - Product vision text (1-3 sentences)
 * @returns Array of 5-10 keywords sorted by relevance score
 *
 * @example
 * ```typescript
 * const keywords = extractKeywords('A Figma-like design tool for remote teams');
 * // Returns: ['design', 'collaboration', 'creative', 'team', 'visual', ...]
 * ```
 */
export function extractKeywords(vision: string): string[] {
  if (!vision || vision.trim().length === 0) {
    throw new Error('Vision text cannot be empty');
  }

  // Step 1: Match vision against all domain patterns
  const matches: KeywordMatch[] = [];

  for (const domainPattern of DOMAIN_PATTERNS) {
    const regex = new RegExp(domainPattern.pattern);
    const visionMatches = vision.match(regex);

    if (visionMatches && visionMatches.length > 0) {
      // Found matches for this domain
      const frequency = visionMatches.length;

      // Add each keyword from this domain with calculated score
      for (const keyword of domainPattern.keywords) {
        const score = frequency * domainPattern.weight;

        matches.push({
          keyword,
          domain: domainPattern.domain,
          score,
          frequency
        });
      }
    }
  }

  // Step 2: Deduplicate keywords (keep highest score)
  const deduped = new Map<string, KeywordMatch>();

  for (const match of matches) {
    const existing = deduped.get(match.keyword);

    if (!existing || match.score > existing.score) {
      deduped.set(match.keyword, match);
    }
  }

  // Step 3: Sort by score (descending) and take top 10
  const sorted = Array.from(deduped.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Step 4: Extract just the keywords
  const keywords = sorted.map(m => m.keyword);

  // Step 5: Ensure minimum 3 keywords (Zod schema requirement)
  if (keywords.length < 3) {
    // Fallback: extract unique words from vision
    const words = vision
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3) // Only meaningful words
      .filter((w, i, arr) => arr.indexOf(w) === i); // Unique

    // Add fallback words until we have at least 3
    for (const word of words) {
      if (keywords.length >= 3) break;
      if (!keywords.includes(word)) {
        keywords.push(word);
      }
    }

    // Absolute fallback if still not enough
    while (keywords.length < 3) {
      keywords.push('product');
    }
  }

  return keywords;
}

/**
 * Get detailed keyword analysis (useful for debugging/testing)
 *
 * @param vision - Product vision text
 * @returns Array of KeywordMatch objects with scores and domains
 */
export function analyzeKeywords(vision: string): KeywordMatch[] {
  if (!vision || vision.trim().length === 0) {
    return [];
  }

  const matches: KeywordMatch[] = [];

  for (const domainPattern of DOMAIN_PATTERNS) {
    const regex = new RegExp(domainPattern.pattern);
    const visionMatches = vision.match(regex);

    if (visionMatches && visionMatches.length > 0) {
      const frequency = visionMatches.length;

      for (const keyword of domainPattern.keywords) {
        const score = frequency * domainPattern.weight;

        matches.push({
          keyword,
          domain: domainPattern.domain,
          score,
          frequency
        });
      }
    }
  }

  // Deduplicate
  const deduped = new Map<string, KeywordMatch>();

  for (const match of matches) {
    const existing = deduped.get(match.keyword);

    if (!existing || match.score > existing.score) {
      deduped.set(match.keyword, match);
    }
  }

  // Sort by score
  return Array.from(deduped.values()).sort((a, b) => b.score - a.score);
}
