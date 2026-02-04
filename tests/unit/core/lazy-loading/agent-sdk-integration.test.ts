/**
 * Agent SDK Integration Tests
 *
 * NOTE: Tests SKIPPED - keyword-detector.ts was never created.
 * Plugin detection now uses LLM-based detection in llm-plugin-detector.ts instead.
 *
 * Tests for Claude Code Agent SDK integration with lazy plugin loading.
 * Verifies that confidence-based plugin suggestions work correctly
 * and that the Task tool spawns agents with proper model selection.
 *
 * @module tests/unit/core/lazy-loading/agent-sdk-integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Skip: Module doesn't exist - was replaced by LLM-based detection
// import {
//   detectSpecWeaveIntent,
//   determinePlugins,
//   DEVELOPMENT_KEYWORDS,
//   SPECWEAVE_KEYWORDS,
// } from '../../../../src/core/lazy-loading/keyword-detector.js';

describe.skip('Agent SDK Integration', () => {
  describe('Confidence-Based Plugin Loading', () => {
    /**
     * Test Case 1: High Confidence (0.9+) - SpecWeave-specific keywords
     *
     * When user explicitly mentions SpecWeave concepts, confidence should be
     * very high (0.9+), ensuring immediate plugin loading.
     */
    it('should return high confidence (0.9+) for SpecWeave-specific keywords', () => {
      const testCases = [
        { prompt: 'Create a new /sw:increment for user authentication', expectedMin: 0.9 },
        { prompt: 'Update the spec.md with new acceptance criteria', expectedMin: 0.9 },
        { prompt: 'Run specweave init in this directory', expectedMin: 0.9 },
        { prompt: 'Check the tasks.md for pending items', expectedMin: 0.9 },
        { prompt: 'Review the living documentation', expectedMin: 0.9 },
      ];

      for (const { prompt, expectedMin } of testCases) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(expectedMin);
        expect(result.suggestedPlugins).toContain('sw');
      }
    });

    /**
     * Test Case 2: Medium Confidence (0.7) - Development domain keywords
     *
     * Domain-specific keywords (react, kubernetes, ml) should get 0.7 confidence,
     * which is above the 0.6 auto-install threshold.
     */
    it('should return medium confidence (0.7) for domain keywords', () => {
      const testCases = [
        {
          prompt: 'Build a React dashboard with charts',
          expectedMin: 0.7,
          expectedPlugins: ['sw-frontend'],
        },
        {
          prompt: 'Create a REST API with Express and PostgreSQL',
          expectedMin: 0.7,
          expectedPlugins: ['sw-backend'],
        },
        {
          prompt: 'Deploy to Kubernetes with Helm charts',
          expectedMin: 0.7,
          expectedPlugins: ['sw-k8s'],
        },
        {
          prompt: 'Build an ML pipeline with PyTorch',
          expectedMin: 0.7,
          expectedPlugins: ['sw-ml'],
        },
        {
          prompt: 'Write E2E tests with Playwright',
          expectedMin: 0.7,
          expectedPlugins: ['sw-testing'],
        },
      ];

      for (const { prompt, expectedMin, expectedPlugins } of testCases) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(expectedMin);
        for (const plugin of expectedPlugins) {
          expect(result.suggestedPlugins).toContain(plugin);
        }
      }
    });

    /**
     * Test Case 3: Boosted Confidence (0.8+) - Multi-domain keywords
     *
     * When multiple domains are detected, confidence gets boosted by 0.1
     */
    it('should boost confidence for multi-domain prompts', () => {
      const result = detectSpecWeaveIntent(
        'Build a React frontend with Express API and PostgreSQL database, deploy to Kubernetes'
      );

      expect(result.detected).toBe(true);
      // 0.7 base + 0.1 multi-domain boost = 0.8+
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.matchedKeywords.length).toBeGreaterThan(3);
    });

    /**
     * Test Case 4: Medium-High Confidence for domain keywords
     *
     * In v1.0.130+, most development terms are in DEVELOPMENT_KEYWORDS,
     * so they get 0.7 confidence. This is intentional - we want ANY
     * development task to trigger plugin loading.
     *
     * The distinction is now:
     * - 0.9+: SpecWeave-specific (increment, spec.md, etc.)
     * - 0.7-0.8: Domain keywords (react, kubernetes, etc.)
     * - 0.0: Negative patterns (openapi spec, terraform plan, etc.)
     */
    it('should return medium confidence (0.7) for domain keywords like kanban/jira', () => {
      // "kanban" and "board" are in DEVELOPMENT_KEYWORDS.jira
      // So they get 0.7 confidence (above threshold)
      const jiraPrompt = 'Check the kanban board';
      const result = detectSpecWeaveIntent(jiraPrompt);

      // Should detect with 0.7 confidence (domain keyword)
      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.matchedKeywords).toContain('board');
    });

    /**
     * Test Case 5: Zero Confidence - Negative patterns
     *
     * Certain patterns should NOT trigger SpecWeave detection
     */
    it('should return zero confidence for negative patterns', () => {
      const negativePatterns = [
        'Generate an OpenAPI spec for the API',
        'Create a Terraform plan for infrastructure',
        'Run the gulp task for building',
        'Check the query plan in PostgreSQL',
        'What is the node version?',
      ];

      for (const prompt of negativePatterns) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.detected).toBe(false);
        expect(result.confidence).toBe(0);
        expect(result.suggestedPlugins).toEqual([]);
      }
    });

    /**
     * Test Case 6: Confidence threshold for auto-install
     *
     * The detect-intent CLI uses 0.6 as the default threshold.
     * Only prompts with confidence >= 0.6 should trigger auto-install.
     *
     * NOTE: Most development terms now get 0.7 confidence because they're
     * in DEVELOPMENT_KEYWORDS. Only negative patterns get 0 confidence.
     */
    it('should correctly determine auto-install eligibility based on threshold', () => {
      const AUTO_INSTALL_THRESHOLD = 0.6;

      // Should auto-install (confidence >= 0.6)
      const shouldInstall = [
        'Build a React component', // 0.7 (domain keyword)
        'Create an API endpoint', // 0.7 (domain keyword)
        'Create a new increment', // 0.9 (specweave keyword)
      ];

      // Should NOT auto-install (confidence = 0 due to negative patterns)
      const shouldNotInstall = [
        'Generate an OpenAPI spec', // 0 (negative pattern)
        'Create a terraform plan', // 0 (negative pattern)
      ];

      for (const prompt of shouldInstall) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.confidence).toBeGreaterThanOrEqual(AUTO_INSTALL_THRESHOLD);
      }

      for (const prompt of shouldNotInstall) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.confidence).toBeLessThan(AUTO_INSTALL_THRESHOLD);
      }
    });
  });

  describe('Plugin Suggestion Accuracy', () => {
    /**
     * Test that frontend keywords suggest frontend plugin
     */
    it('should suggest correct plugins for frontend development', () => {
      const frontendPrompts = [
        'Create a Vue 3 composition API component',
        'Build a Next.js app with SSR',
        'Style with Tailwind CSS',
        'Create a responsive dashboard',
      ];

      for (const prompt of frontendPrompts) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.suggestedPlugins).toContain('sw-frontend');
      }
    });

    /**
     * Test that backend keywords suggest backend plugin
     *
     * Uses keywords that are in KEYWORD_PLUGIN_MAP pointing to specweave-backend
     */
    it('should suggest correct plugins for backend development', () => {
      const backendPrompts = [
        'Create a GraphQL API', // "graphql" -> specweave-backend
        'Build a REST API with Express', // "rest", "express" -> specweave-backend
        'Set up PostgreSQL database', // "postgres" -> specweave-backend
        'Create MongoDB database schema', // "mongodb" -> specweave-backend
      ];

      for (const prompt of backendPrompts) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.suggestedPlugins).toContain('sw-backend');
      }
    });

    /**
     * Test that ML keywords suggest ML plugin
     *
     * Uses keywords that are in KEYWORD_PLUGIN_MAP pointing to specweave-ml
     */
    it('should suggest correct plugins for ML development', () => {
      const mlPrompts = [
        'Train a PyTorch model for classification', // "pytorch" -> specweave-ml
        'Build a TensorFlow neural network', // "tensorflow" -> specweave-ml
        'Create an MLOps workflow', // "mlops" -> specweave-ml
        'Build machine learning pipeline', // "machine learning" -> specweave-ml
      ];

      for (const prompt of mlPrompts) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.suggestedPlugins).toContain('sw-ml');
      }
    });

    /**
     * Test that short keywords use word boundaries to avoid false positives
     */
    it('should not false-positive on short keywords embedded in words', () => {
      // "ai" should not match inside "mermaid"
      const mermaidPrompt = 'Create Mermaid architecture diagrams';
      const mermaidResult = detectSpecWeaveIntent(mermaidPrompt);
      expect(mermaidResult.suggestedPlugins).not.toContain('sw-ml');

      // "ui" should not match inside "fruit"
      const fruitPrompt = 'Build a fruit inventory system';
      const fruitResult = detectSpecWeaveIntent(fruitPrompt);
      expect(fruitResult.suggestedPlugins).not.toContain('sw-frontend');

      // "ml" should not match inside "html"
      const htmlPrompt = 'Parse HTML documents';
      const htmlResult = detectSpecWeaveIntent(htmlPrompt);
      expect(htmlResult.suggestedPlugins).not.toContain('sw-ml');
    });

    /**
     * Test standalone short keywords DO match
     */
    it('should match standalone short keywords with word boundaries', () => {
      // Standalone "AI" should match
      const aiPrompt = 'Build an AI assistant';
      const aiResult = detectSpecWeaveIntent(aiPrompt);
      expect(aiResult.suggestedPlugins).toContain('sw-ml');

      // Standalone "UI" should match
      const uiPrompt = 'Design the UI components';
      const uiResult = detectSpecWeaveIntent(uiPrompt);
      expect(uiResult.suggestedPlugins).toContain('sw-frontend');

      // Standalone "ML" should match
      const mlPrompt = 'Create ML pipeline';
      const mlResult = detectSpecWeaveIntent(mlPrompt);
      expect(mlResult.suggestedPlugins).toContain('sw-ml');
    });
  });

  describe('Agent SDK Model Selection', () => {
    /**
     * Mock the Task tool call structure that would be used with Agent SDK
     *
     * This tests the expected format for spawning agents with different models.
     * In production, these would be actual Task tool calls to Claude Code.
     */
    interface MockTaskCall {
      subagent_type: string;
      prompt: string;
      model?: 'haiku' | 'sonnet' | 'opus';
      description: string;
    }

    /**
     * Test that high-confidence scenarios would use faster models
     */
    it('should recommend haiku model for simple, high-confidence routing', () => {
      // For simple plugin routing decisions, haiku is sufficient
      const simpleRouting: MockTaskCall = {
        subagent_type: 'sw-frontend:frontend-architect',
        prompt: 'Create a React component for user profile',
        model: 'haiku', // Fast, cheap for simple tasks
        description: 'Frontend component creation',
      };

      expect(simpleRouting.model).toBe('haiku');
    });

    /**
     * Test that complex scenarios would use more capable models
     */
    it('should recommend sonnet/opus for complex architectural decisions', () => {
      // For complex architectural decisions, use more capable models
      const complexArchitecture: MockTaskCall = {
        subagent_type: 'sw-backend:database-optimizer',
        prompt:
          'Design a multi-tenant database schema with row-level security, considering scalability to 10M users',
        model: 'sonnet', // More capable for complex reasoning
        description: 'Database architecture design',
      };

      expect(complexArchitecture.model).toBe('sonnet');

      // For critical decisions, use opus
      const criticalDecision: MockTaskCall = {
        subagent_type: 'sw-infra:kubernetes-architect',
        prompt:
          'Design production Kubernetes architecture for financial services with compliance requirements',
        model: 'opus', // Highest capability for critical decisions
        description: 'Production K8s architecture',
      };

      expect(criticalDecision.model).toBe('opus');
    });
  });

  describe('Real-World Prompt Scenarios', () => {
    /**
     * These test real prompts that users might type
     */

    it('should handle "Build a React dashboard that displays GitHub repository statistics"', () => {
      const prompt = 'Build a React dashboard that displays GitHub repository statistics';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.matchedKeywords).toContain('react');
      expect(result.matchedKeywords).toContain('dashboard');
      expect(result.matchedKeywords).toContain('github');
      expect(result.suggestedPlugins).toContain('sw-frontend');
      expect(result.suggestedPlugins).toContain('sw-github');
    });

    it('should handle "Set up CI/CD pipeline with GitHub Actions and deploy to AWS"', () => {
      const prompt = 'Set up CI/CD pipeline with GitHub Actions and deploy to AWS';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.suggestedPlugins).toContain('sw-infra');
      expect(result.suggestedPlugins).toContain('sw-github');
    });

    it('should handle "Create a payment checkout flow with Stripe webhooks"', () => {
      const prompt = 'Create a payment checkout flow with Stripe webhooks';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.matchedKeywords).toContain('stripe');
      expect(result.matchedKeywords).toContain('checkout');
      expect(result.suggestedPlugins).toContain('sw-payments');
    });

    it('should handle "Write comprehensive E2E tests with Playwright for the auth flow"', () => {
      const prompt = 'Write comprehensive E2E tests with Playwright for the auth flow';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.matchedKeywords).toContain('e2e');
      expect(result.matchedKeywords).toContain('playwright');
      expect(result.suggestedPlugins).toContain('sw-testing');
    });

    it('should handle "Build a mobile app with React Native and Expo"', () => {
      const prompt = 'Build a mobile app with React Native and Expo';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.suggestedPlugins).toContain('sw-mobile');
    });

    it('should handle complex multi-domain prompt with boosted confidence', () => {
      const prompt =
        'Build a full-stack e-commerce platform with React frontend, Node.js API, PostgreSQL database, Stripe payments, and deploy to Kubernetes on AWS';
      const result = detectSpecWeaveIntent(prompt);

      expect(result.detected).toBe(true);
      // Multi-domain should boost confidence
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      // Should suggest multiple plugins
      expect(result.suggestedPlugins).toContain('sw-frontend');
      expect(result.suggestedPlugins).toContain('sw-backend');
      expect(result.suggestedPlugins).toContain('sw-payments');
      expect(result.suggestedPlugins).toContain('sw-k8s');
      expect(result.suggestedPlugins).toContain('sw-infra');
    });
  });

  describe('Performance', () => {
    /**
     * Detection should be fast (<5ms) for real-time hook usage
     */
    it('should complete detection in under 15ms', () => {
      // Note: Keyword-based detection should be fast, but first call may have overhead
      // Allow up to 15ms for cold start, subsequent calls should be faster
      const prompts = [
        'Build a React dashboard',
        'Create a REST API with Express',
        'Deploy to Kubernetes',
        'Build an ML pipeline with PyTorch and TensorFlow',
        'Create a full-stack app with React, Node, PostgreSQL, and deploy to AWS',
      ];

      for (const prompt of prompts) {
        const result = detectSpecWeaveIntent(prompt);
        expect(result.latencyMs).toBeLessThan(15);
      }
    });
  });
});
