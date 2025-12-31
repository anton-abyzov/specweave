/**
 * Prompt Chunking for Auto Mode
 *
 * Analyzes large prompts and extracts discrete features for intelligent increment planning.
 *
 * @module prompt-chunker
 */

export interface Feature {
  name: string;
  description: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTasks: number;
  dependencies: string[]; // Feature names this depends on
  keywords: string[];
}

export interface PromptAnalysis {
  features: Feature[];
  totalComplexity: number;
  recommendedIncrements: number;
}

/**
 * Feature boundary keywords that indicate separation
 */
const FEATURE_SEPARATORS = [
  'and',
  'with',
  'including',
  'also',
  'plus',
  'as well as',
  ',',
  ';',
];

/**
 * Common architectural features that usually need to come first
 */
const FOUNDATIONAL_FEATURES = [
  'auth',
  'authentication',
  'database',
  'setup',
  'infrastructure',
  'config',
  'configuration',
];

/**
 * Complexity indicators
 */
const COMPLEXITY_INDICATORS = {
  simple: ['button', 'link', 'page', 'view', 'display', 'show', 'list'],
  medium: ['form', 'validation', 'api', 'endpoint', 'integration', 'filter', 'search'],
  complex: [
    'auth',
    'payment',
    'real-time',
    'websocket',
    'notification',
    'dashboard',
    'analytics',
    'migration',
  ],
};

/**
 * Generic project type words to skip (not specific features)
 */
const GENERIC_TERMS = [
  'app',
  'application',
  'website',
  'site',
  'platform',
  'system',
  'e-commerce',
  'ecommerce',
  'dashboard',
  'portal',
];

/**
 * Extract discrete features from a natural language prompt
 *
 * @param prompt - User's natural language prompt
 * @returns Analyzed features with complexity estimates
 *
 * @example
 * ```typescript
 * const result = extractFeatures("Build e-commerce with auth, products, cart, checkout");
 * // Returns 4 features: auth, products, cart, checkout
 * ```
 */
export function extractFeatures(prompt: string): Feature[] {
  const features: Feature[] = [];

  // Normalize prompt
  const normalized = prompt
    .toLowerCase()
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split by feature separators
  const segments = splitByFeatureSeparators(normalized);

  for (const segment of segments) {
    if (segment.trim().length < 3) continue; // Skip tiny fragments

    const feature = analyzeSegment(segment);
    if (feature && !isGenericTerm(feature.name)) {
      features.push(feature);
    }
  }

  // Identify dependencies (auth typically comes before everything)
  identifyDependencies(features);

  return features;
}

/**
 * Check if a feature name is a generic term that should be skipped
 */
function isGenericTerm(name: string): boolean {
  return GENERIC_TERMS.some((term) => name.includes(term) || term.includes(name));
}

/**
 * Split prompt by feature separator keywords
 */
function splitByFeatureSeparators(prompt: string): string[] {
  // First, split by commas and semicolons
  let segments = prompt.split(/[,;]+/).map((s) => s.trim());

  // Then split by word separators (and, with, including, etc.)
  const result: string[] = [];
  for (const segment of segments) {
    // Split by word separators but keep the segment structure
    const wordSeps = /\s+(and|with|including|also|plus|as well as)\s+/i;
    const parts = segment.split(wordSeps).filter((p) => {
      // Filter out separator words themselves
      const lower = p.toLowerCase().trim();
      return lower && !['and', 'with', 'including', 'also', 'plus', 'as well as'].includes(lower);
    });

    result.push(...parts);
  }

  return result.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Analyze a segment to extract feature details
 */
function analyzeSegment(segment: string): Feature | null {
  // Extract feature name (usually the main noun/action)
  const name = extractFeatureName(segment);
  if (!name) return null;

  // Determine complexity
  const complexity = estimateComplexity(segment);

  // Estimate task count based on complexity
  const estimatedTasks = complexity === 'simple' ? 3 : complexity === 'medium' ? 7 : 12;

  // Extract keywords
  const keywords = segment.split(/\s+/).filter((word) => word.length > 3);

  return {
    name,
    description: segment,
    complexity,
    estimatedTasks,
    dependencies: [],
    keywords,
  };
}

/**
 * Extract the primary feature name from a segment
 */
function extractFeatureName(segment: string): string {
  // Remove common verbs and articles
  let cleaned = segment.replace(
    /^(build|create|add|implement|make|setup|configure|develop|the|a|an)\s+/gi,
    ''
  );

  // Remove trailing articles/connectors
  cleaned = cleaned.replace(/\s+(the|a|an|to|for|of)$/gi, '');

  // Take first 1-3 words as feature name
  const words = cleaned.trim().split(/\s+/).slice(0, 3);
  const name = words.join('-').replace(/[^a-z0-9-]/g, '');

  return name || segment.split(/\s+/)[0]; // Fallback to first word if cleaning produced empty
}

/**
 * Estimate complexity based on keywords
 */
function estimateComplexity(segment: string): 'simple' | 'medium' | 'complex' {
  const lower = segment.toLowerCase();

  // Check for complex indicators
  for (const indicator of COMPLEXITY_INDICATORS.complex) {
    if (lower.includes(indicator)) return 'complex';
  }

  // Check for medium indicators
  for (const indicator of COMPLEXITY_INDICATORS.medium) {
    if (lower.includes(indicator)) return 'medium';
  }

  return 'simple';
}

/**
 * Identify dependencies between features
 */
function identifyDependencies(features: Feature[]): void {
  // Find foundational features
  const foundationalFeatures = features.filter((f) =>
    FOUNDATIONAL_FEATURES.some((keyword) => f.name.includes(keyword))
  );

  // All non-foundational features depend on foundational ones
  for (const feature of features) {
    const isFoundational = foundationalFeatures.includes(feature);
    if (!isFoundational) {
      for (const foundation of foundationalFeatures) {
        if (!feature.dependencies.includes(foundation.name)) {
          feature.dependencies.push(foundation.name);
        }
      }
    }
  }

  // Payment depends on products/cart
  const paymentFeatures = features.filter((f) => f.name.includes('payment') || f.name.includes('checkout'));
  const productFeatures = features.filter((f) => f.name.includes('product') || f.name.includes('cart'));

  for (const payment of paymentFeatures) {
    for (const product of productFeatures) {
      if (!payment.dependencies.includes(product.name)) {
        payment.dependencies.push(product.name);
      }
    }
  }
}

/**
 * Analyze full prompt and recommend increment structure
 *
 * @param prompt - User's natural language prompt
 * @returns Full analysis with increment recommendations
 *
 * @example
 * ```typescript
 * const analysis = analyzePrompt("Build e-commerce with auth, products, cart, checkout");
 * console.log(analysis.recommendedIncrements); // 2-3 increments
 * ```
 */
export function analyzePrompt(prompt: string): PromptAnalysis {
  const features = extractFeatures(prompt);

  // Calculate total complexity
  const totalComplexity = features.reduce((sum, f) => sum + f.estimatedTasks, 0);

  // Recommend increments (target 5-15 tasks per increment)
  const recommendedIncrements = Math.max(1, Math.ceil(totalComplexity / 10));

  return {
    features,
    totalComplexity,
    recommendedIncrements,
  };
}
