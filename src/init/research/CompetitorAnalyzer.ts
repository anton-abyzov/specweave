/**
 * Competitor Analyzer - Keyword Similarity Matching
 *
 * Identifies comparable products using keyword similarity matching against
 * a known product database. No external API calls - all product knowledge
 * is encoded at spec-time.
 *
 * **Approach**:
 * 1. Maintain known product database with domain tags
 * 2. Calculate keyword similarity (Jaccard index)
 * 3. Return top 3-5 most similar products
 * 4. Include strengths and weaknesses
 *
 * **Benefits**:
 * - Zero external dependencies
 * - Instant matching (no API latency)
 * - 100% deterministic and testable
 * - Works offline
 */

import { Competitor } from './types.js';

/**
 * Known product in the database
 */
interface KnownProduct {
  /** Product name */
  name: string;

  /** Product URL */
  url: string;

  /** Domain keywords */
  domains: string[];

  /** Key features/strengths */
  strengths: string[];

  /** Known weaknesses or gaps */
  weaknesses: string[];

  /** Market category */
  category: string;
}

/**
 * Product database with known competitors across different domains
 *
 * This is where competitive intelligence lives - curated knowledge
 * encoded at spec-time, not runtime LLM calls!
 */
const KNOWN_PRODUCTS: KnownProduct[] = [
  // Productivity & Collaboration
  {
    name: 'Notion',
    url: 'https://notion.so',
    domains: ['productivity', 'collaboration', 'saas'],
    strengths: ['All-in-one workspace', 'Flexible databases', 'Rich templates'],
    weaknesses: ['Steep learning curve', 'Slow with large databases', 'Limited offline mode'],
    category: 'productivity-saas'
  },
  {
    name: 'Asana',
    url: 'https://asana.com',
    domains: ['productivity', 'project', 'team', 'saas'],
    strengths: ['Task management', 'Team collaboration', 'Integrations'],
    weaknesses: ['Complex for small teams', 'Expensive for large teams', 'Limited customization'],
    category: 'productivity-saas'
  },
  {
    name: 'Monday.com',
    url: 'https://monday.com',
    domains: ['productivity', 'project', 'workflow', 'saas'],
    strengths: ['Visual workflows', 'Customizable', 'Automation'],
    weaknesses: ['Expensive', 'Can be overwhelming', 'Limited free tier'],
    category: 'productivity-saas'
  },
  {
    name: 'Slack',
    url: 'https://slack.com',
    domains: ['collaboration', 'team', 'communication', 'saas'],
    strengths: ['Real-time messaging', 'Integrations', 'Channels'],
    weaknesses: ['Information overload', 'Can replace deep work', 'Search limitations'],
    category: 'productivity-saas'
  },

  // Design Tools
  {
    name: 'Figma',
    url: 'https://figma.com',
    domains: ['design', 'collaboration', 'visual', 'saas'],
    strengths: ['Real-time collaboration', 'Web-based', 'Plugin ecosystem'],
    weaknesses: ['Requires internet', 'Learning curve', 'Performance with complex files'],
    category: 'productivity-saas'
  },
  {
    name: 'Canva',
    url: 'https://canva.com',
    domains: ['design', 'creative', 'visual'],
    strengths: ['Easy to use', 'Templates', 'Free tier'],
    weaknesses: ['Limited professional features', 'Template-heavy designs', 'Branding limitations'],
    category: 'productivity-saas'
  },

  // Healthcare
  {
    name: 'Epic',
    url: 'https://epic.com',
    domains: ['healthcare', 'medical', 'enterprise'],
    strengths: ['Comprehensive EHR', 'Integration', 'Market leader'],
    weaknesses: ['Very expensive', 'Complex implementation', 'Poor UX'],
    category: 'healthcare'
  },
  {
    name: 'Cerner',
    url: 'https://cerner.com',
    domains: ['healthcare', 'medical', 'enterprise'],
    strengths: ['Wide adoption', 'Interoperability', 'Data analytics'],
    weaknesses: ['Expensive', 'Complex', 'Customer support issues'],
    category: 'healthcare'
  },

  // Fintech
  {
    name: 'Stripe',
    url: 'https://stripe.com',
    domains: ['fintech', 'payment', 'saas'],
    strengths: ['Developer-friendly', 'Global coverage', 'Comprehensive APIs'],
    weaknesses: ['2.9% + $0.30 fees', 'Account freezes', 'Support delays'],
    category: 'fintech'
  },
  {
    name: 'Square',
    url: 'https://squareup.com',
    domains: ['fintech', 'payment', 'ecommerce'],
    strengths: ['Easy setup', 'POS hardware', 'Small business focus'],
    weaknesses: ['Higher fees', 'Account holds', 'Limited international'],
    category: 'fintech'
  },

  // E-commerce
  {
    name: 'Shopify',
    url: 'https://shopify.com',
    domains: ['ecommerce', 'saas', 'marketplace'],
    strengths: ['Easy setup', 'App ecosystem', 'Themes'],
    weaknesses: ['Transaction fees', 'Customization limits', 'Expensive apps'],
    category: 'e-commerce'
  },
  {
    name: 'WooCommerce',
    url: 'https://woocommerce.com',
    domains: ['ecommerce', 'wordpress'],
    strengths: ['Free and open-source', 'Flexible', 'Large community'],
    weaknesses: ['Requires WordPress', 'Performance issues', 'Security concerns'],
    category: 'e-commerce'
  },

  // Education
  {
    name: 'Coursera',
    url: 'https://coursera.org',
    domains: ['education', 'learning', 'online'],
    strengths: ['University partnerships', 'Certifications', 'Wide range'],
    weaknesses: ['Expensive certificates', 'Variable quality', 'Limited interactivity'],
    category: 'education'
  },
  {
    name: 'Udemy',
    url: 'https://udemy.com',
    domains: ['education', 'learning', 'online'],
    strengths: ['Affordable', 'Variety', 'Lifetime access'],
    weaknesses: ['No quality control', 'No certificates', 'Discount culture'],
    category: 'education'
  },

  // Social
  {
    name: 'Discord',
    url: 'https://discord.com',
    domains: ['social', 'community', 'gaming'],
    strengths: ['Voice chat', 'Communities', 'Free tier'],
    weaknesses: ['Moderation challenges', 'Privacy concerns', 'Information overload'],
    category: 'social-network'
  },
  {
    name: 'Reddit',
    url: 'https://reddit.com',
    domains: ['social', 'community', 'content'],
    strengths: ['Diverse communities', 'Free', 'User-driven'],
    weaknesses: ['Toxicity', 'Moderation issues', 'UI/UX dated'],
    category: 'social-network'
  }
];

/**
 * Calculate Jaccard similarity between two keyword sets
 *
 * Jaccard similarity = |A ∩ B| / |A ∪ B|
 *
 * @param keywords1 - First keyword set
 * @param keywords2 - Second keyword set
 * @returns Similarity score (0-1)
 */
function jaccardSimilarity(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1.map(k => k.toLowerCase()));
  const set2 = new Set(keywords2.map(k => k.toLowerCase()));

  // Intersection
  const intersection = new Set([...set1].filter(k => set2.has(k)));

  // Union
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
}

/**
 * Analyze competitor landscape based on keywords
 *
 * Identifies comparable products using keyword similarity matching.
 *
 * @param keywords - Keywords extracted from product vision
 * @param maxCompetitors - Maximum number of competitors to return (default: 5)
 * @returns Array of competitors sorted by similarity score
 *
 * @example
 * ```typescript
 * const competitors = analyzeCompetitors(['design', 'collaboration', 'team'], 3);
 * // Returns top 3 competitors like Figma, Canva, etc.
 * ```
 */
export function analyzeCompetitors(
  keywords: string[],
  maxCompetitors: number = 5
): Competitor[] {
  if (!keywords || keywords.length === 0) {
    return [];
  }

  // Calculate similarity scores for all products
  const scored: Array<{
    product: KnownProduct;
    similarity: number;
  }> = [];

  for (const product of KNOWN_PRODUCTS) {
    const similarity = jaccardSimilarity(keywords, product.domains);
    scored.push({ product, similarity });
  }

  // Sort by similarity (descending) and take top N
  scored.sort((a, b) => b.similarity - a.similarity);

  // Convert to Competitor format
  const competitors: Competitor[] = scored
    .slice(0, maxCompetitors)
    .filter(s => s.similarity > 0) // Only include matches
    .map(s => ({
      name: s.product.name,
      url: s.product.url,
      strengths: s.product.strengths,
      weaknesses: s.product.weaknesses
    }));

  return competitors;
}

/**
 * Get detailed competitor analysis with similarity scores (useful for debugging)
 *
 * @param keywords - Keywords from vision
 * @returns Array of products with similarity scores, sorted by score
 */
export function getDetailedCompetitorAnalysis(keywords: string[]): Array<{
  name: string;
  similarity: number;
  matchedKeywords: string[];
  category: string;
}> {
  if (!keywords || keywords.length === 0) {
    return [];
  }

  const keywordSet = new Set(keywords.map(k => k.toLowerCase()));

  const results = KNOWN_PRODUCTS.map(product => {
    const productDomains = new Set(product.domains.map(d => d.toLowerCase()));

    // Find matched keywords
    const matchedKeywords = [...keywordSet].filter(k => productDomains.has(k));

    const similarity = jaccardSimilarity(keywords, product.domains);

    return {
      name: product.name,
      similarity,
      matchedKeywords,
      category: product.category
    };
  });

  // Sort by similarity
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Add a custom product to the database (for testing or extensibility)
 *
 * @param product - Known product to add
 */
export function addKnownProduct(product: KnownProduct): void {
  KNOWN_PRODUCTS.push(product);
}

/**
 * Get all known products in the database
 *
 * @returns Array of all known products
 */
export function getAllKnownProducts(): ReadonlyArray<Readonly<KnownProduct>> {
  return KNOWN_PRODUCTS;
}
