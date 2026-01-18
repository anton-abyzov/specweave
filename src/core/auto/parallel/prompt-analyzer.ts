/**
 * Prompt Analyzer
 *
 * Analyzes user prompts to detect domains and suggest appropriate flags
 * for parallel execution mode.
 */

import type { AgentDomain, FlagSuggestion } from '../types.js';

/**
 * Keyword weight for confidence calculation
 */
interface KeywordWeight {
  keyword: string;
  weight: number; // 1-3, where 3 is most indicative
}

/**
 * Domain detection result
 */
export interface DomainDetection {
  domain: AgentDomain;
  keywords: string[];
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  domains: DomainDetection[];
  suggestions: FlagSuggestion[];
  shouldUseParallel: boolean;
}

/**
 * Domain keyword dictionaries with weights
 */
export const DOMAIN_KEYWORDS: Record<AgentDomain, KeywordWeight[]> = {
  frontend: [
    // Frameworks (weight 3)
    { keyword: 'react', weight: 3 },
    { keyword: 'vue', weight: 3 },
    { keyword: 'angular', weight: 3 },
    { keyword: 'svelte', weight: 3 },
    { keyword: 'nextjs', weight: 3 },
    { keyword: 'next.js', weight: 3 },
    { keyword: 'remix', weight: 3 },
    { keyword: 'nuxt', weight: 3 },
    // Styling (weight 2)
    { keyword: 'tailwind', weight: 2 },
    { keyword: 'css', weight: 2 },
    { keyword: 'scss', weight: 2 },
    { keyword: 'styled-components', weight: 2 },
    // UI concepts (weight 2)
    { keyword: 'ui', weight: 2 },
    { keyword: 'component', weight: 2 },
    { keyword: 'page', weight: 2 },
    { keyword: 'layout', weight: 2 },
    { keyword: 'responsive', weight: 2 },
    { keyword: 'animation', weight: 2 },
    // Elements (weight 1)
    { keyword: 'form', weight: 1 },
    { keyword: 'modal', weight: 1 },
    { keyword: 'button', weight: 1 },
    { keyword: 'input', weight: 1 },
    { keyword: 'dropdown', weight: 1 },
    { keyword: 'navigation', weight: 1 },
    { keyword: 'header', weight: 1 },
    { keyword: 'footer', weight: 1 },
    { keyword: 'sidebar', weight: 1 },
  ],
  backend: [
    // Frameworks (weight 3)
    { keyword: 'express', weight: 3 },
    { keyword: 'fastify', weight: 3 },
    { keyword: 'nestjs', weight: 3 },
    { keyword: 'nest.js', weight: 3 },
    { keyword: 'hono', weight: 3 },
    { keyword: 'koa', weight: 3 },
    // API concepts (weight 3)
    { keyword: 'api', weight: 3 },
    { keyword: 'endpoint', weight: 3 },
    { keyword: 'rest', weight: 2 },
    { keyword: 'graphql', weight: 3 },
    { keyword: 'trpc', weight: 3 },
    // Server concepts (weight 2)
    { keyword: 'server', weight: 2 },
    { keyword: 'route', weight: 2 },
    { keyword: 'controller', weight: 2 },
    { keyword: 'service', weight: 2 },
    { keyword: 'middleware', weight: 2 },
    { keyword: 'handler', weight: 2 },
    // Auth (weight 2)
    { keyword: 'jwt', weight: 2 },
    { keyword: 'authentication', weight: 2 },
    { keyword: 'authorization', weight: 2 },
    { keyword: 'oauth', weight: 2 },
    // Realtime (weight 2)
    { keyword: 'websocket', weight: 2 },
    { keyword: 'socket.io', weight: 2 },
    { keyword: 'sse', weight: 2 },
  ],
  database: [
    // ORMs (weight 3)
    { keyword: 'prisma', weight: 3 },
    { keyword: 'drizzle', weight: 3 },
    { keyword: 'typeorm', weight: 3 },
    { keyword: 'sequelize', weight: 3 },
    { keyword: 'mongoose', weight: 3 },
    // Databases (weight 3)
    { keyword: 'postgres', weight: 3 },
    { keyword: 'postgresql', weight: 3 },
    { keyword: 'mysql', weight: 3 },
    { keyword: 'mongodb', weight: 3 },
    { keyword: 'sqlite', weight: 3 },
    { keyword: 'redis', weight: 3 },
    { keyword: 'supabase', weight: 3 },
    { keyword: 'neon', weight: 3 },
    { keyword: 'planetscale', weight: 3 },
    // Concepts (weight 2)
    { keyword: 'schema', weight: 2 },
    { keyword: 'migration', weight: 2 },
    { keyword: 'table', weight: 2 },
    { keyword: 'sql', weight: 2 },
    { keyword: 'query', weight: 2 },
    { keyword: 'index', weight: 1 },
    { keyword: 'constraint', weight: 1 },
    { keyword: 'foreign key', weight: 2 },
    { keyword: 'relation', weight: 2 },
  ],
  devops: [
    // IaC (weight 3)
    { keyword: 'terraform', weight: 3 },
    { keyword: 'pulumi', weight: 3 },
    { keyword: 'cloudformation', weight: 3 },
    // Containers (weight 3)
    { keyword: 'docker', weight: 3 },
    { keyword: 'dockerfile', weight: 3 },
    { keyword: 'kubernetes', weight: 3 },
    { keyword: 'k8s', weight: 3 },
    { keyword: 'helm', weight: 3 },
    // CI/CD (weight 3)
    { keyword: 'ci/cd', weight: 3 },
    { keyword: 'cicd', weight: 3 },
    { keyword: 'github actions', weight: 3 },
    { keyword: 'gitlab ci', weight: 3 },
    { keyword: 'jenkins', weight: 3 },
    // Cloud (weight 2)
    { keyword: 'aws', weight: 2 },
    { keyword: 'gcp', weight: 2 },
    { keyword: 'azure', weight: 2 },
    { keyword: 'cloudflare', weight: 2 },
    { keyword: 'vercel', weight: 2 },
    { keyword: 'netlify', weight: 2 },
    // Operations (weight 2)
    { keyword: 'deploy', weight: 2 },
    { keyword: 'deployment', weight: 2 },
    { keyword: 'infrastructure', weight: 2 },
    { keyword: 'pipeline', weight: 2 },
  ],
  qa: [
    // Test frameworks (weight 3)
    { keyword: 'vitest', weight: 3 },
    { keyword: 'jest', weight: 3 },
    { keyword: 'playwright', weight: 3 },
    { keyword: 'cypress', weight: 3 },
    { keyword: 'mocha', weight: 3 },
    // Test types (weight 2)
    { keyword: 'test', weight: 2 },
    { keyword: 'testing', weight: 2 },
    { keyword: 'e2e', weight: 3 },
    { keyword: 'end-to-end', weight: 3 },
    { keyword: 'integration test', weight: 3 },
    { keyword: 'unit test', weight: 2 },
    { keyword: 'coverage', weight: 2 },
    // Quality (weight 2)
    { keyword: 'qa', weight: 2 },
    { keyword: 'quality', weight: 1 },
    { keyword: 'assertion', weight: 1 },
    { keyword: 'mock', weight: 1 },
    { keyword: 'stub', weight: 1 },
    { keyword: 'fixture', weight: 1 },
  ],
  general: [],
};

/**
 * PR-related keywords
 */
const PR_KEYWORDS = [
  'pr',
  'pull request',
  'merge request',
  'review',
  'code review',
  'ship',
  'release',
  'merge',
];

/**
 * Prompt Analyzer for detecting domains and suggesting flags.
 */
export class PromptAnalyzer {
  /**
   * Analyze a prompt and return domain detections and flag suggestions
   */
  analyze(prompt: string): AnalysisResult {
    const domains = this.detectDomains(prompt);
    const suggestions = this.buildSuggestions(prompt, domains);
    const shouldUseParallel = this.shouldSuggestParallel(domains);

    return {
      domains,
      suggestions,
      shouldUseParallel,
    };
  }

  /**
   * Detect domains in a prompt
   */
  detectDomains(prompt: string): DomainDetection[] {
    const normalizedPrompt = prompt.toLowerCase();
    const detections: DomainDetection[] = [];

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (domain === 'general') continue; // Skip general domain

      const matchedKeywords: string[] = [];
      let score = 0;

      for (const { keyword, weight } of keywords) {
        if (this.containsKeyword(normalizedPrompt, keyword)) {
          matchedKeywords.push(keyword);
          score += weight;
        }
      }

      if (matchedKeywords.length > 0) {
        detections.push({
          domain: domain as AgentDomain,
          keywords: matchedKeywords,
          score,
          confidence: this.calculateConfidence(matchedKeywords.length, score),
        });
      }
    }

    // Sort by score descending
    return detections.sort((a, b) => b.score - a.score);
  }

  /**
   * Check if prompt contains a keyword (word boundary aware)
   */
  private containsKeyword(prompt: string, keyword: string): boolean {
    // Handle multi-word keywords
    if (keyword.includes(' ')) {
      return prompt.includes(keyword);
    }

    // For single words, use word boundary matching
    const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'i');
    return regex.test(prompt);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculate confidence based on match count and score
   */
  calculateConfidence(matchCount: number, score: number): 'high' | 'medium' | 'low' {
    // High confidence: 3+ keywords OR score >= 6
    if (matchCount >= 3 || score >= 6) {
      return 'high';
    }
    // Medium confidence: 2 keywords OR score >= 3
    if (matchCount >= 2 || score >= 3) {
      return 'medium';
    }
    // Low confidence: 1 keyword with low score
    return 'low';
  }

  /**
   * Check if parallel mode should be suggested
   */
  shouldSuggestParallel(domains: DomainDetection[]): boolean {
    // Suggest parallel if 2+ domains detected with at least medium confidence
    const significantDomains = domains.filter(
      (d) => d.confidence === 'high' || d.confidence === 'medium'
    );
    return significantDomains.length >= 2;
  }

  /**
   * Check if PR should be suggested
   */
  shouldSuggestPR(prompt: string): boolean {
    const normalizedPrompt = prompt.toLowerCase();
    return PR_KEYWORDS.some((keyword) => normalizedPrompt.includes(keyword));
  }

  /**
   * Build flag suggestions based on analysis
   */
  private buildSuggestions(prompt: string, domains: DomainDetection[]): FlagSuggestion[] {
    const suggestions: FlagSuggestion[] = [];

    // Suggest parallel if 2+ domains
    if (this.shouldSuggestParallel(domains)) {
      suggestions.push({
        flag: '--parallel',
        reason: `Detected ${domains.length} domains: ${domains.map((d) => d.domain).join(', ')}`,
        confidence: 'high',
      });
    }

    // Add domain-specific flags for detected domains
    for (const detection of domains) {
      if (detection.confidence !== 'low') {
        suggestions.push({
          flag: `--${detection.domain}`,
          reason: `Detected ${detection.keywords.slice(0, 3).join(', ')}${detection.keywords.length > 3 ? '...' : ''}`,
          confidence: detection.confidence,
          domain: detection.domain,
        });
      }
    }

    // Suggest PR if PR keywords found
    if (this.shouldSuggestPR(prompt)) {
      suggestions.push({
        flag: '--pr',
        reason: 'Detected PR/review keywords',
        confidence: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Get suggested domains from a prompt
   */
  getSuggestedDomains(prompt: string): AgentDomain[] {
    const domains = this.detectDomains(prompt);
    return domains
      .filter((d) => d.confidence !== 'low')
      .map((d) => d.domain);
  }

  /**
   * Get formatted suggestions as a string for display
   */
  formatSuggestions(suggestions: FlagSuggestion[]): string {
    if (suggestions.length === 0) {
      return '';
    }

    const lines = ['Suggested flags:'];
    for (const suggestion of suggestions) {
      const conf = suggestion.confidence === 'high' ? '★★★' : suggestion.confidence === 'medium' ? '★★☆' : '★☆☆';
      lines.push(`  ${conf} ${suggestion.flag} - ${suggestion.reason}`);
    }
    return lines.join('\n');
  }
}
