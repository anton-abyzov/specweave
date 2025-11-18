/**
 * Vision & Market Research Analyzer
 *
 * Analyzes product vision descriptions using AI to extract:
 * - Keywords and domain focus
 * - Market category classification
 * - Competitor analysis
 * - Opportunity scoring
 * - Viral potential detection
 * - Adaptive follow-up questions
 *
 * This is the foundation of SpecWeave's research-driven init flow.
 */

import { VisionInsights, VisionInsightsSchema, MarketCategory } from './types.js';
import { extractKeywords } from './keyword-extractor.js';

/**
 * Configuration for VisionAnalyzer
 */
export interface VisionAnalyzerConfig {
  /** Cache duration for analysis results (in milliseconds) */
  cacheDuration?: number;

  /** Maximum number of competitors to return */
  maxCompetitors?: number;

  /** Maximum number of follow-up questions */
  maxFollowUpQuestions?: number;

  /** Minimum keyword score threshold */
  minKeywordScore?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<VisionAnalyzerConfig> = {
  cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
  maxCompetitors: 5,
  maxFollowUpQuestions: 3,
  minKeywordScore: 0.5
};

/**
 * VisionAnalyzer - Main class for vision analysis
 *
 * **Usage**:
 * ```typescript
 * const analyzer = new VisionAnalyzer();
 * const insights = await analyzer.analyze('A Figma-like design tool for remote teams');
 * console.log(insights.market); // 'productivity-saas'
 * console.log(insights.keywords); // ['design', 'collaboration', 'remote teams']
 * console.log(insights.viralPotential); // true
 * ```
 */
export class VisionAnalyzer {
  private config: Required<VisionAnalyzerConfig>;
  private cache: Map<string, { insights: VisionInsights; timestamp: number }>;

  /**
   * Create a new VisionAnalyzer
   *
   * @param config - Optional configuration
   */
  constructor(config: VisionAnalyzerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
  }

  /**
   * Analyze product vision and return insights
   *
   * This is the primary method that orchestrates the entire analysis:
   * 1. Check cache
   * 2. Extract keywords (LLM or rules)
   * 3. Detect market category (LLM or rules)
   * 4. Identify competitors (LLM or empty)
   * 5. Calculate opportunity score
   * 6. Detect viral potential
   * 7. Generate follow-up questions
   * 8. Validate and return results
   *
   * @param vision - User's product vision (1-3 sentences)
   * @returns VisionInsights with validated data
   *
   * @example
   * ```typescript
   * const insights = await analyzer.analyze(
   *   'A project management tool for agile teams with real-time collaboration'
   * );
   * ```
   */
  async analyze(vision: string): Promise<VisionInsights> {
    // Validate input
    if (!vision || vision.trim().length === 0) {
      throw new Error('Vision description cannot be empty');
    }

    const trimmedVision = vision.trim();

    // Check cache
    const cached = this.getCached(trimmedVision);
    if (cached) {
      return cached;
    }

    // Perform analysis (stub implementation for now)
    // This will be implemented in subsequent tasks
    const insights: VisionInsights = await this.performAnalysis(trimmedVision);

    // Validate results
    const validated = VisionInsightsSchema.parse(insights) as VisionInsights;

    // Cache results
    this.setCached(trimmedVision, validated);

    return validated;
  }

  /**
   * Perform the actual analysis
   *
   * Implementation status:
   * - ✅ T-002: Keyword extraction (pattern-based)
   * - ✅ T-003: Market detection (rule-based classification)
   * - ✅ T-004: Competitor analysis (keyword similarity)
   * - ✅ T-005: Opportunity scoring (algorithmic)
   * - ✅ T-006: Follow-up questions (adaptive)
   *
   * @param vision - Trimmed vision text
   * @returns VisionInsights
   */
  private async performAnalysis(vision: string): Promise<VisionInsights> {
    // Import needed modules
    const { detectMarketCategory } = await import('./MarketDetector.js');
    const { analyzeCompetitors } = await import('./CompetitorAnalyzer.js');
    const { calculateOpportunityScore, estimateInnovationFactor } = await import('./OpportunityScorer.js');
    const { generateFollowUpQuestions } = await import('./QuestionGenerator.js');

    // ✅ T-002: Extract keywords using pattern matching
    const keywords = extractKeywords(vision);

    // ✅ T-003: Detect market category using rule-based classification
    const marketClassification = detectMarketCategory(vision);
    const market = marketClassification.category;
    const confidence = marketClassification.confidence;

    // ✅ T-004: Analyze competitors using keyword similarity
    const competitors = analyzeCompetitors(keywords, this.config.maxCompetitors);

    // ✅ T-005: Calculate opportunity score
    const innovation = estimateInnovationFactor(keywords, competitors.length);
    // Detect viral potential (simple heuristic)
    const viralKeywords = ['viral', 'social', 'share', 'network', 'community', 'collaboration', 'real-time'];
    const viralPotential = keywords.some(k =>
      viralKeywords.some(vk => k.toLowerCase().includes(vk))
    );

    const opportunityResult = calculateOpportunityScore(
      market,
      competitors.length,
      viralPotential,
      innovation
    );

    // ✅ T-006: Generate adaptive follow-up questions
    const followUpQuestions = generateFollowUpQuestions(
      {
        marketCategory: market,
        viralPotential,
        opportunityScore: opportunityResult.score,
        keywords,
        competitorCount: competitors.length
      },
      this.config.maxFollowUpQuestions
    );

    const insights: VisionInsights = {
      keywords,
      market,
      competitors,
      opportunityScore: opportunityResult.score,
      viralPotential,
      followUpQuestions,
      confidence,
      rawVision: vision
    };

    return insights;
  }

  /**
   * Get cached insights if available and not expired
   *
   * @param vision - Vision text (cache key)
   * @returns Cached insights or undefined
   */
  private getCached(vision: string): VisionInsights | undefined {
    const cached = this.cache.get(vision);

    if (!cached) {
      return undefined;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    if (age > this.config.cacheDuration) {
      // Expired, remove from cache
      this.cache.delete(vision);
      return undefined;
    }

    return cached.insights;
  }

  /**
   * Store insights in cache
   *
   * @param vision - Vision text (cache key)
   * @param insights - Insights to cache
   */
  private setCached(vision: string, insights: VisionInsights): void {
    this.cache.set(vision, {
      insights,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<VisionAnalyzerConfig>> {
    return { ...this.config };
  }

  /**
   * Update configuration
   *
   * @param config - Partial config to merge
   */
  updateConfig(config: Partial<VisionAnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Save vision insights to .specweave/config.json
   *
   * @param insights - Vision insights to save
   * @param configPath - Optional custom config path
   *
   * @example
   * ```typescript
   * const insights = await analyzer.analyze(vision);
   * await VisionAnalyzer.saveToConfig(insights);
   * ```
   */
  static async saveToConfig(insights: VisionInsights, configPath?: string): Promise<void> {
    const { ConfigManager } = await import('../../config/ConfigManager.js');
    await ConfigManager.updateResearch({ vision: insights }, configPath);
  }
}
