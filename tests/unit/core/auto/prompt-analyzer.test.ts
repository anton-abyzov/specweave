/**
 * Prompt Analyzer Tests
 *
 * Tests for prompt analysis and flag suggestion.
 * Target: 90%+ coverage
 */

import { describe, it, expect } from 'vitest';
import {
  PromptAnalyzer,
  DOMAIN_KEYWORDS,
  type DomainDetection,
} from '../../../../src/core/auto/parallel/prompt-analyzer.js';

describe('PromptAnalyzer', () => {
  const analyzer = new PromptAnalyzer();

  // ============================================================================
  // SINGLE DOMAIN DETECTION TESTS
  // ============================================================================

  describe('Single Domain Detection', () => {
    describe('Frontend Detection', () => {
      it('should detect React', () => {
        const result = analyzer.detectDomains('Build a React component');
        expect(result.some((d) => d.domain === 'frontend')).toBe(true);
      });

      it('should detect Vue', () => {
        const result = analyzer.detectDomains('Create a Vue.js app');
        expect(result.some((d) => d.domain === 'frontend')).toBe(true);
      });

      it('should detect Tailwind CSS', () => {
        const result = analyzer.detectDomains('Style with Tailwind CSS');
        expect(result.some((d) => d.domain === 'frontend')).toBe(true);
      });

      it('should detect UI components', () => {
        const result = analyzer.detectDomains('Build a modal component with button');
        expect(result.some((d) => d.domain === 'frontend')).toBe(true);
      });

      it('should detect Next.js', () => {
        const result = analyzer.detectDomains('Setup Next.js project');
        expect(result.some((d) => d.domain === 'frontend')).toBe(true);
      });
    });

    describe('Backend Detection', () => {
      it('should detect Express', () => {
        const result = analyzer.detectDomains('Create an Express server');
        expect(result.some((d) => d.domain === 'backend')).toBe(true);
      });

      it('should detect API endpoints', () => {
        const result = analyzer.detectDomains('Build REST API endpoints');
        expect(result.some((d) => d.domain === 'backend')).toBe(true);
      });

      it('should detect GraphQL', () => {
        const result = analyzer.detectDomains('Implement GraphQL resolvers');
        expect(result.some((d) => d.domain === 'backend')).toBe(true);
      });

      it('should detect NestJS', () => {
        const result = analyzer.detectDomains('Setup NestJS controllers');
        expect(result.some((d) => d.domain === 'backend')).toBe(true);
      });

      it('should detect authentication', () => {
        const result = analyzer.detectDomains('Add JWT authentication');
        expect(result.some((d) => d.domain === 'backend')).toBe(true);
      });
    });

    describe('Database Detection', () => {
      it('should detect Prisma', () => {
        const result = analyzer.detectDomains('Setup Prisma schema');
        expect(result.some((d) => d.domain === 'database')).toBe(true);
      });

      it('should detect PostgreSQL', () => {
        const result = analyzer.detectDomains('Configure PostgreSQL database');
        expect(result.some((d) => d.domain === 'database')).toBe(true);
      });

      it('should detect migrations', () => {
        const result = analyzer.detectDomains('Create database migration');
        expect(result.some((d) => d.domain === 'database')).toBe(true);
      });

      it('should detect MongoDB', () => {
        const result = analyzer.detectDomains('Setup MongoDB collections');
        expect(result.some((d) => d.domain === 'database')).toBe(true);
      });

      it('should detect Redis', () => {
        const result = analyzer.detectDomains('Add Redis caching');
        expect(result.some((d) => d.domain === 'database')).toBe(true);
      });
    });

    describe('DevOps Detection', () => {
      it('should detect Docker', () => {
        const result = analyzer.detectDomains('Create Dockerfile');
        expect(result.some((d) => d.domain === 'devops')).toBe(true);
      });

      it('should detect Kubernetes', () => {
        const result = analyzer.detectDomains('Deploy to Kubernetes cluster');
        expect(result.some((d) => d.domain === 'devops')).toBe(true);
      });

      it('should detect Terraform', () => {
        const result = analyzer.detectDomains('Write Terraform infrastructure');
        expect(result.some((d) => d.domain === 'devops')).toBe(true);
      });

      it('should detect GitHub Actions', () => {
        const result = analyzer.detectDomains('Setup GitHub Actions CI/CD');
        expect(result.some((d) => d.domain === 'devops')).toBe(true);
      });

      it('should detect AWS', () => {
        const result = analyzer.detectDomains('Deploy to AWS Lambda');
        expect(result.some((d) => d.domain === 'devops')).toBe(true);
      });
    });

    describe('QA Detection', () => {
      it('should detect Vitest', () => {
        const result = analyzer.detectDomains('Write Vitest unit tests');
        expect(result.some((d) => d.domain === 'qa')).toBe(true);
      });

      it('should detect Playwright', () => {
        const result = analyzer.detectDomains('Add Playwright E2E tests');
        expect(result.some((d) => d.domain === 'qa')).toBe(true);
      });

      it('should detect Jest', () => {
        const result = analyzer.detectDomains('Configure Jest testing');
        expect(result.some((d) => d.domain === 'qa')).toBe(true);
      });

      it('should detect coverage', () => {
        const result = analyzer.detectDomains('Improve test coverage');
        expect(result.some((d) => d.domain === 'qa')).toBe(true);
      });

      it('should detect integration tests', () => {
        const result = analyzer.detectDomains('Write integration test suite');
        expect(result.some((d) => d.domain === 'qa')).toBe(true);
      });
    });
  });

  // ============================================================================
  // MULTI-DOMAIN DETECTION TESTS
  // ============================================================================

  describe('Multi-Domain Detection', () => {
    it('should detect frontend + backend', () => {
      const result = analyzer.detectDomains('Build React login page with Express API');
      const domains = result.map((d) => d.domain);
      expect(domains).toContain('frontend');
      expect(domains).toContain('backend');
    });

    it('should detect frontend + backend + database', () => {
      const result = analyzer.detectDomains(
        'Create React dashboard with NestJS API and Prisma database'
      );
      const domains = result.map((d) => d.domain);
      expect(domains).toContain('frontend');
      expect(domains).toContain('backend');
      expect(domains).toContain('database');
    });

    it('should detect all domains in full-stack prompt', () => {
      const result = analyzer.detectDomains(
        'Build a React app with Express API, PostgreSQL database, Docker deployment, and Playwright tests'
      );
      const domains = result.map((d) => d.domain);
      expect(domains).toContain('frontend');
      expect(domains).toContain('backend');
      expect(domains).toContain('database');
      expect(domains).toContain('devops');
      expect(domains).toContain('qa');
    });

    it('should detect devops + qa', () => {
      const result = analyzer.detectDomains('Setup CI/CD pipeline with Jest tests');
      const domains = result.map((d) => d.domain);
      expect(domains).toContain('devops');
      expect(domains).toContain('qa');
    });

    it('should sort domains by score', () => {
      const result = analyzer.detectDomains(
        'Build React Vue Angular components for the API'
      );
      // Frontend should have higher score (3 framework keywords)
      expect(result[0].domain).toBe('frontend');
    });
  });

  // ============================================================================
  // CONFIDENCE CALCULATION TESTS
  // ============================================================================

  describe('Confidence Calculation', () => {
    it('should return high confidence for 3+ keywords', () => {
      const result = analyzer.detectDomains('React Vue Angular Tailwind component');
      const frontend = result.find((d) => d.domain === 'frontend');
      expect(frontend?.confidence).toBe('high');
    });

    it('should return high confidence for high score', () => {
      const result = analyzer.detectDomains('React NextJS Svelte');
      const frontend = result.find((d) => d.domain === 'frontend');
      expect(frontend?.confidence).toBe('high'); // 3 framework keywords = 9 score
    });

    it('should return medium confidence for 2 keywords', () => {
      const result = analyzer.detectDomains('React component');
      const frontend = result.find((d) => d.domain === 'frontend');
      // React (3) + component (2) = 5, which is medium
      expect(frontend?.confidence).toBe('medium');
    });

    it('should return low confidence for 1 low-weight keyword', () => {
      const result = analyzer.detectDomains('add a button');
      const frontend = result.find((d) => d.domain === 'frontend');
      expect(frontend?.confidence).toBe('low');
    });

    it('should calculate confidence correctly', () => {
      expect(analyzer.calculateConfidence(3, 9)).toBe('high');
      expect(analyzer.calculateConfidence(2, 5)).toBe('medium');
      expect(analyzer.calculateConfidence(1, 2)).toBe('low');
      expect(analyzer.calculateConfidence(0, 0)).toBe('low');
    });
  });

  // ============================================================================
  // PARALLEL SUGGESTION TESTS
  // ============================================================================

  describe('Parallel Suggestion', () => {
    it('should suggest parallel for 2+ domains with medium+ confidence', () => {
      const domains: DomainDetection[] = [
        { domain: 'frontend', keywords: ['react', 'component'], score: 5, confidence: 'medium' },
        { domain: 'backend', keywords: ['api', 'express'], score: 6, confidence: 'high' },
      ];
      expect(analyzer.shouldSuggestParallel(domains)).toBe(true);
    });

    it('should not suggest parallel for single domain', () => {
      const domains: DomainDetection[] = [
        { domain: 'frontend', keywords: ['react'], score: 3, confidence: 'high' },
      ];
      expect(analyzer.shouldSuggestParallel(domains)).toBe(false);
    });

    it('should not suggest parallel for low confidence domains', () => {
      const domains: DomainDetection[] = [
        { domain: 'frontend', keywords: ['button'], score: 1, confidence: 'low' },
        { domain: 'backend', keywords: ['route'], score: 2, confidence: 'low' },
      ];
      expect(analyzer.shouldSuggestParallel(domains)).toBe(false);
    });

    it('should suggest parallel with mixed confidence (at least 2 medium+)', () => {
      const domains: DomainDetection[] = [
        { domain: 'frontend', keywords: ['react'], score: 3, confidence: 'high' },
        { domain: 'backend', keywords: ['api'], score: 3, confidence: 'medium' },
        { domain: 'qa', keywords: ['test'], score: 2, confidence: 'low' },
      ];
      expect(analyzer.shouldSuggestParallel(domains)).toBe(true);
    });
  });

  // ============================================================================
  // PR SUGGESTION TESTS
  // ============================================================================

  describe('PR Suggestion', () => {
    it('should suggest PR for "create PR"', () => {
      expect(analyzer.shouldSuggestPR('Create a PR for review')).toBe(true);
    });

    it('should suggest PR for "pull request"', () => {
      expect(analyzer.shouldSuggestPR('Open a pull request')).toBe(true);
    });

    it('should suggest PR for "code review"', () => {
      expect(analyzer.shouldSuggestPR('Ready for code review')).toBe(true);
    });

    it('should suggest PR for "merge"', () => {
      expect(analyzer.shouldSuggestPR('Merge these changes')).toBe(true);
    });

    it('should suggest PR for "ship"', () => {
      expect(analyzer.shouldSuggestPR('Ship this feature')).toBe(true);
    });

    it('should not suggest PR for unrelated prompts', () => {
      expect(analyzer.shouldSuggestPR('Build a React component')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(analyzer.shouldSuggestPR('CREATE A PR')).toBe(true);
      expect(analyzer.shouldSuggestPR('Pull Request')).toBe(true);
    });
  });

  // ============================================================================
  // FULL ANALYSIS TESTS
  // ============================================================================

  describe('Full Analysis', () => {
    it('should return complete analysis result', () => {
      const result = analyzer.analyze('Build React login with Express API, create PR');

      expect(result.domains.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(typeof result.shouldUseParallel).toBe('boolean');
    });

    it('should include parallel flag for multi-domain prompts', () => {
      const result = analyzer.analyze('Build React UI with Express API');

      const parallelSuggestion = result.suggestions.find((s) => s.flag === '--parallel');
      expect(parallelSuggestion).toBeDefined();
    });

    it('should include domain flags', () => {
      const result = analyzer.analyze('Build React component with Prisma schema');

      expect(result.suggestions.some((s) => s.flag === '--frontend')).toBe(true);
      expect(result.suggestions.some((s) => s.flag === '--database')).toBe(true);
    });

    it('should include PR flag when PR keywords present', () => {
      const result = analyzer.analyze('Build feature and create pull request');

      expect(result.suggestions.some((s) => s.flag === '--pr')).toBe(true);
    });

    it('should set shouldUseParallel correctly', () => {
      const singleDomain = analyzer.analyze('Build React component');
      expect(singleDomain.shouldUseParallel).toBe(false);

      const multiDomain = analyzer.analyze('Build React UI with Express API');
      expect(multiDomain.shouldUseParallel).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty prompt', () => {
      const result = analyzer.analyze('');
      expect(result.domains).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.shouldUseParallel).toBe(false);
    });

    it('should handle prompt with no keywords', () => {
      const result = analyzer.analyze('Do something interesting');
      expect(result.domains).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should handle mixed case keywords', () => {
      const result = analyzer.detectDomains('REACT VUE ANGULAR');
      expect(result.some((d) => d.domain === 'frontend')).toBe(true);
    });

    it('should handle keywords within words', () => {
      // 'api' should match, but not 'capital'
      const result = analyzer.detectDomains('Build an API for capital management');
      expect(result.some((d) => d.domain === 'backend')).toBe(true);
    });

    it('should handle multi-word keywords', () => {
      const result = analyzer.detectDomains('Setup GitHub Actions workflow');
      expect(result.some((d) => d.domain === 'devops')).toBe(true);
    });

    it('should handle punctuation', () => {
      const result = analyzer.detectDomains('Build React. Add API! Configure Docker?');
      expect(result.some((d) => d.domain === 'frontend')).toBe(true);
      expect(result.some((d) => d.domain === 'backend')).toBe(true);
      expect(result.some((d) => d.domain === 'devops')).toBe(true);
    });

    it('should handle special characters in keywords', () => {
      const result = analyzer.detectDomains('Setup Next.js and Nest.js');
      expect(result.some((d) => d.domain === 'frontend')).toBe(true);
      expect(result.some((d) => d.domain === 'backend')).toBe(true);
    });
  });

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  describe('Helper Methods', () => {
    describe('getSuggestedDomains', () => {
      it('should return only domains with medium+ confidence', () => {
        const domains = analyzer.getSuggestedDomains('React Express button route');
        expect(domains).toContain('frontend');
        expect(domains).toContain('backend');
      });

      it('should return empty array for no matches', () => {
        const domains = analyzer.getSuggestedDomains('Do something');
        expect(domains).toEqual([]);
      });
    });

    describe('formatSuggestions', () => {
      it('should format suggestions for display', () => {
        const result = analyzer.analyze('Build React UI with Express API');
        const formatted = analyzer.formatSuggestions(result.suggestions);

        expect(formatted).toContain('Suggested flags:');
        expect(formatted).toContain('--');
      });

      it('should return empty string for no suggestions', () => {
        const formatted = analyzer.formatSuggestions([]);
        expect(formatted).toBe('');
      });

      it('should show stars for confidence', () => {
        const result = analyzer.analyze('React Vue Angular Tailwind Express NestJS');
        const formatted = analyzer.formatSuggestions(result.suggestions);

        expect(formatted).toContain('★');
      });
    });
  });

  // ============================================================================
  // KEYWORD DICTIONARY TESTS
  // ============================================================================

  describe('Keyword Dictionary', () => {
    it('should have keywords for all domains except general', () => {
      for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        if (domain !== 'general') {
          expect(keywords.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have weights between 1 and 3', () => {
      for (const keywords of Object.values(DOMAIN_KEYWORDS)) {
        for (const { weight } of keywords) {
          expect(weight).toBeGreaterThanOrEqual(1);
          expect(weight).toBeLessThanOrEqual(3);
        }
      }
    });

    it('should have no duplicate keywords within domains', () => {
      for (const keywords of Object.values(DOMAIN_KEYWORDS)) {
        const keywordList = keywords.map((k) => k.keyword);
        const unique = [...new Set(keywordList)];
        expect(keywordList.length).toBe(unique.length);
      }
    });
  });

  // ============================================================================
  // NATURAL LANGUAGE VARIATIONS
  // ============================================================================

  describe('Natural Language Variations', () => {
    it('should handle conversational prompts', () => {
      const result = analyzer.analyze(
        "I need to build a user authentication system with a React frontend and Node.js backend"
      );
      expect(result.domains.some((d) => d.domain === 'frontend')).toBe(true);
    });

    it('should handle technical specifications', () => {
      const result = analyzer.analyze(
        'Implement REST API with JWT auth, PostgreSQL persistence, and Redis caching'
      );
      expect(result.domains.some((d) => d.domain === 'backend')).toBe(true);
      expect(result.domains.some((d) => d.domain === 'database')).toBe(true);
    });

    it('should handle feature requests', () => {
      const result = analyzer.analyze(
        'Add a dashboard page with charts and data visualization using React and Tailwind'
      );
      expect(result.domains.some((d) => d.domain === 'frontend')).toBe(true);
    });

    it('should handle bug fix descriptions', () => {
      const result = analyzer.analyze(
        'Fix the API endpoint that returns 500 errors on the user route'
      );
      expect(result.domains.some((d) => d.domain === 'backend')).toBe(true);
    });

    it('should handle refactoring requests', () => {
      const result = analyzer.analyze(
        'Refactor the database queries to use Prisma instead of raw SQL'
      );
      expect(result.domains.some((d) => d.domain === 'database')).toBe(true);
    });
  });
});
