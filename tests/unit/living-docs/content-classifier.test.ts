import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for Content Classifier
 */

import {
  ContentClassifier,
  ContentCategory,
  createContentClassifier,
} from '../../../src/core/living-docs/content-classifier';
import { ParsedSection } from '../../../src/core/living-docs/content-parser';

describe('ContentClassifier', () => {
  let classifier: ContentClassifier;

  beforeEach(() => {
    classifier = new ContentClassifier();
  });

  describe('User Story Classification', () => {
    it('should classify sections with US-XXX pattern as User Story', () => {
      const section: ParsedSection = {
        id: 'us-001',
        heading: 'US-001: User Login',
        level: 2,
        content: '**As a** user\n**I want** to log in\n**So that** I can access my account',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.UserStory);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.suggestedFilename).toContain('us-001');
    });

    it('should classify sections with user story format', () => {
      const section: ParsedSection = {
        id: 'login-feature',
        heading: 'Login Feature',
        level: 2,
        content: 'As a user I want to log in so that I can access the system.\n\n**Acceptance Criteria**:\n- AC-01: User can enter credentials',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.UserStory);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should classify sections with acceptance criteria', () => {
      const section: ParsedSection = {
        id: 'feature',
        heading: 'Feature Requirements',
        level: 2,
        content: 'Acceptance Criteria:\n- AC-US1-01: Given user logs in, When credentials valid, Then dashboard shows',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.UserStory);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('NFR Classification', () => {
    it('should classify sections with NFR-XXX pattern', () => {
      const section: ParsedSection = {
        id: 'nfr-001',
        heading: 'NFR-001: Performance Requirements',
        level: 2,
        content: 'The system must respond in <200ms for 95th percentile',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.NFR);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.suggestedFilename).toContain('nfr-001');
    });

    it('should classify sections with NFR keywords', () => {
      const section: ParsedSection = {
        id: 'performance',
        heading: 'Performance Requirements',
        level: 2,
        content: 'The system must handle 10,000 concurrent users with latency under 100ms and 99.9% availability',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.NFR);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should classify sections with quantitative metrics', () => {
      const section: ParsedSection = {
        id: 'requirements',
        heading: 'System Requirements',
        level: 2,
        content: 'Must support >5000 req/s throughput with <30ms response time',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.NFR);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Architecture Classification', () => {
    it('should classify sections with architecture headings', () => {
      const section: ParsedSection = {
        id: 'architecture',
        heading: 'System Architecture',
        level: 2,
        content: 'The system uses microservices architecture with event-driven communication',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.Architecture);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should classify sections with HLD pattern', () => {
      const section: ParsedSection = {
        id: 'hld',
        heading: 'HLD: Reflection Engine',
        level: 2,
        content: 'High-level design of the reflection engine component',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.Architecture);
      expect(result.suggestedFilename).toContain('hld');
    });

    it('should classify sections with diagram code blocks', () => {
      const section: ParsedSection = {
        id: 'design',
        heading: 'Component Design',
        level: 2,
        content: 'Architecture diagram:',
        rawContent: '',
        codeBlocks: [
          {
            language: 'mermaid',
            content: 'graph TD\nA-->B',
            startLine: 5,
            endLine: 7,
          },
        ],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.Architecture);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('ADR Classification', () => {
    it('should classify sections with ADR-XXX pattern', () => {
      const section: ParsedSection = {
        id: 'adr-001',
        heading: 'ADR-001: Use PostgreSQL',
        level: 2,
        content: 'Context: We need a database\nDecision: Use PostgreSQL\nConsequences: High reliability',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.ADR);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.suggestedPath).toContain('architecture/adr');
    });

    it('should classify sections with ADR structure', () => {
      const section: ParsedSection = {
        id: 'decision',
        heading: 'Technical Decision: Database Choice',
        level: 2,
        content: '## Context\n\n## Decision\n\n## Alternatives\n\n## Consequences',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.ADR);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should classify sections with decision rationale', () => {
      const section: ParsedSection = {
        id: 'choice',
        heading: 'Database Choice',
        level: 2,
        content: 'Why we chose PostgreSQL over MySQL: better JSONB support and trade-offs considered',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.ADR);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Operations Classification', () => {
    it('should classify runbook sections', () => {
      const section: ParsedSection = {
        id: 'runbook',
        heading: 'Runbook: API Service',
        level: 2,
        content: 'Step 1: Check logs\nStep 2: Restart service\nStep 3: Verify health',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.Operations);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.suggestedFilename).toContain('runbook');
    });

    it('should classify SLO sections', () => {
      const section: ParsedSection = {
        id: 'slo',
        heading: 'SLO: API Availability',
        level: 2,
        content: 'SLI: 99.9% uptime with alerting on breaches',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.Operations);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should classify sections with operations keywords', () => {
      const section: ParsedSection = {
        id: 'ops',
        heading: 'Operations Guide',
        level: 2,
        content: 'Incident response procedure for on-call engineers with escalation paths and monitoring',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.Operations);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Delivery Classification', () => {
    it('should classify test strategy sections', () => {
      const section: ParsedSection = {
        id: 'test',
        heading: 'Test Strategy',
        level: 2,
        content: 'Unit tests: 85% coverage\nIntegration tests: E2E with Playwright\nRelease plan: CI/CD pipeline',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.Delivery);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should classify release plan sections', () => {
      const section: ParsedSection = {
        id: 'release',
        heading: 'Release Plan',
        level: 2,
        content: 'Deployment strategy with continuous integration and automated testing',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.Delivery);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should classify git workflow sections', () => {
      const section: ParsedSection = {
        id: 'workflow',
        heading: 'Development Workflow',
        level: 2,
        content: 'Git flow with pull request reviews and merge strategy using feature branches',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 10,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBe(ContentCategory.Delivery);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Statistics', () => {
    it('should provide classification statistics', () => {
      const sections: ParsedSection[] = [
        {
          id: 'us-001',
          heading: 'US-001',
          level: 2,
          content: 'As a user',
          rawContent: '',
          codeBlocks: [],
          links: [],
          images: [],
          startLine: 1,
          endLine: 5,
          children: [],
        },
        {
          id: 'us-002',
          heading: 'US-002',
          level: 2,
          content: 'As a user',
          rawContent: '',
          codeBlocks: [],
          links: [],
          images: [],
          startLine: 6,
          endLine: 10,
          children: [],
        },
        {
          id: 'arch',
          heading: 'Architecture',
          level: 2,
          content: 'System design',
          rawContent: '',
          codeBlocks: [],
          links: [],
          images: [],
          startLine: 11,
          endLine: 15,
          children: [],
        },
      ];

      const results = classifier.classifyAll(sections);
      const stats = classifier.getStatistics(results);

      expect(stats.total).toBe(3);
      expect(stats.byCategory[ContentCategory.UserStory]).toBe(2);
      expect(stats.byCategory[ContentCategory.Architecture]).toBe(1);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    it('should filter by category', () => {
      const sections: ParsedSection[] = [
        {
          id: 'us',
          heading: 'US-001',
          level: 2,
          content: 'As a user',
          rawContent: '',
          codeBlocks: [],
          links: [],
          images: [],
          startLine: 1,
          endLine: 5,
          children: [],
        },
        {
          id: 'nfr',
          heading: 'NFR-001',
          level: 2,
          content: 'Performance <100ms',
          rawContent: '',
          codeBlocks: [],
          links: [],
          images: [],
          startLine: 6,
          endLine: 10,
          children: [],
        },
      ];

      const results = classifier.classifyAll(sections);
      const userStories = classifier.filterByCategory(results, ContentCategory.UserStory);

      expect(userStories).toHaveLength(1);
      expect(userStories[0].category).toBe(ContentCategory.UserStory);
    });

    it('should filter by confidence', () => {
      const sections: ParsedSection[] = [
        {
          id: 'high',
          heading: 'US-001',
          level: 2,
          content: 'As a user I want',
          rawContent: '',
          codeBlocks: [],
          links: [],
          images: [],
          startLine: 1,
          endLine: 5,
          children: [],
        },
        {
          id: 'low',
          heading: 'Random',
          level: 2,
          content: 'Some content',
          rawContent: '',
          codeBlocks: [],
          links: [],
          images: [],
          startLine: 6,
          endLine: 10,
          children: [],
        },
      ];

      const results = classifier.classifyAll(sections);
      const highConfidence = classifier.filterByConfidence(results, 0.8);

      expect(highConfidence.length).toBeGreaterThan(0);
      expect(highConfidence.every((r) => r.confidence >= 0.8)).toBe(true);
    });
  });

  describe('Factory Functions', () => {
    it('should work with createContentClassifier', () => {
      const classifier = createContentClassifier();
      const section: ParsedSection = {
        id: 'test',
        heading: 'US-001',
        level: 2,
        content: 'test',
        rawContent: '',
        codeBlocks: [],
        links: [],
        images: [],
        startLine: 1,
        endLine: 5,
        children: [],
      };

      const result = classifier.classify(section);

      expect(result.category).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});
