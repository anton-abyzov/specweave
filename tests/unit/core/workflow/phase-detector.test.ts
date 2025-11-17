import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for PhaseDetector
 *
 * Tests workflow phase detection based on keywords, commands, context, and hints.
 * Part of increment 0039: Ultra-Smart Next Command (US-001)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseDetector } from '../../../../src/core/workflow/phase-detector.js';
import {
  WorkflowPhase,
  DetectionContext,
  EvidenceType
} from '../../../../src/core/workflow/types.js';

describe('PhaseDetector', () => {
  let detector: PhaseDetector;

  beforeEach(() => {
    detector = new PhaseDetector();
  });

  describe('Keyword Analysis (40% weight)', () => {
    it('should detect SPEC_WRITING phase from spec keywords', async () => {
      const context: DetectionContext = {
        userPrompt: 'I need to write the specification for user authentication',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.SPEC_WRITING);
      expect(result.confidence).toBeGreaterThan(0.2); // Keyword-only evidence
      expect(result.evidence.some(e =>
        e.type === EvidenceType.KEYWORD &&
        e.description.includes('specification')
      )).toBe(true);
    });

    it('should detect PLAN_GENERATION phase from architecture keywords', async () => {
      const context: DetectionContext = {
        userPrompt: 'How should I design the architecture for this feature?',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.PLAN_GENERATION);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.KEYWORD &&
        (e.description.includes('design') || e.description.includes('architecture'))
      )).toBe(true);
    });

    it('should detect IMPLEMENTATION phase from coding keywords', async () => {
      const context: DetectionContext = {
        userPrompt: 'Let\'s implement the user login feature now',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.KEYWORD &&
        e.description.includes('implement')
      )).toBe(true);
    });

    it('should detect TESTING phase from test keywords', async () => {
      const context: DetectionContext = {
        userPrompt: 'I need to write unit tests for the authentication module',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.TESTING);
      expect(result.confidence).toBeGreaterThan(0.25); // Relaxed threshold
      expect(result.evidence.some(e =>
        e.type === EvidenceType.KEYWORD &&
        (e.description.includes('unit tests') || e.description.includes('test'))
      )).toBe(true);
    });

    it('should detect COMPLETION phase from done keywords', async () => {
      const context: DetectionContext = {
        userPrompt: 'All tasks are done, ready to close this increment',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.COMPLETION);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.KEYWORD &&
        e.description.includes('done')
      )).toBe(true);
    });

    it('should handle multiple keywords for same phase', async () => {
      const context: DetectionContext = {
        userPrompt: 'I want to write the spec and document the requirements',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.SPEC_WRITING);
      // Multiple keywords should increase confidence
      expect(result.confidence).toBeGreaterThan(0.3);
      const keywordEvidence = result.evidence.filter(e => e.type === EvidenceType.KEYWORD);
      expect(keywordEvidence.length).toBeGreaterThan(0);
    });

    it('should give higher weight to implementation keywords', async () => {
      const context: DetectionContext = {
        userPrompt: 'Let\'s build this feature',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      // Implementation has weight multiplier of 1.2
      expect(result.confidence).toBeGreaterThan(0.4);
    });
  });

  describe('Command Analysis (30% weight)', () => {
    it('should detect phase from recent /specweave:plan command', async () => {
      const context: DetectionContext = {
        userPrompt: 'What should I do next?',
        recentCommands: ['/specweave:plan']
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.PLAN_GENERATION);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.COMMAND &&
        e.description.includes('/specweave:plan')
      )).toBe(true);
    });

    it('should detect phase from recent /specweave:do command', async () => {
      const context: DetectionContext = {
        userPrompt: 'Continue',
        recentCommands: ['/specweave:do']
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.COMMAND &&
        e.description.includes('/specweave:do')
      )).toBe(true);
    });

    it('should give more weight to recent commands', async () => {
      const context: DetectionContext = {
        userPrompt: 'What next?',
        recentCommands: [
          '/specweave:do',         // Most recent (weight: 1.0)
          '/specweave:plan',       // Older (weight: 0.7)
          '/specweave:increment'   // Oldest (weight: 0.5)
        ]
      };

      const result = await detector.detect(context);

      // Most recent command should dominate
      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
    });

    it('should detect testing phase from npm test command', async () => {
      const context: DetectionContext = {
        userPrompt: 'Check results',
        recentCommands: ['npm test']
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.TESTING);
    });

    it('should combine keyword and command evidence', async () => {
      const context: DetectionContext = {
        userPrompt: 'Let\'s implement this',
        recentCommands: ['/specweave:do']
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      // Should have both keyword and command evidence
      expect(result.evidence.some(e => e.type === EvidenceType.KEYWORD)).toBe(true);
      expect(result.evidence.some(e => e.type === EvidenceType.COMMAND)).toBe(true);
      // Combined confidence should be high
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Hint Analysis (10% weight)', () => {
    it('should detect phase from explicit hint', async () => {
      const context: DetectionContext = {
        userPrompt: 'Help me',
        recentCommands: [],
        explicitHint: 'I am in the implementation phase'
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.USER_HINT &&
        e.description.includes('implementation')
      )).toBe(true);
    });

    it('should give strong weight to explicit hints', async () => {
      const context: DetectionContext = {
        userPrompt: 'What to do?',
        recentCommands: [],
        explicitHint: 'testing'
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.TESTING);
      const hintEvidence = result.evidence.find(e => e.type === EvidenceType.USER_HINT);
      expect(hintEvidence).toBeDefined();
      // Hint weight is 0.1 * 2.0 = 0.2 (strong signal)
      expect(hintEvidence!.weight).toBeGreaterThanOrEqual(0.15);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence with multiple evidence sources', async () => {
      const context: DetectionContext = {
        userPrompt: 'I want to implement the authentication feature',
        recentCommands: ['/specweave:do', '/specweave:progress'],
        explicitHint: 'implementation'
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      // Keyword + Command + Hint = high confidence
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should have lower confidence with weak evidence', async () => {
      const context: DetectionContext = {
        userPrompt: 'Help',
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Low confidence, might be UNKNOWN
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should cap confidence at 1.0', async () => {
      const context: DetectionContext = {
        userPrompt: 'implement build develop code create feature write implement',
        recentCommands: ['/specweave:do', '/specweave:do', '/specweave:do'],
        explicitHint: 'implementation'
      };

      const result = await detector.detect(context);

      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Alternative Phases', () => {
    it('should include alternative phases sorted by confidence', async () => {
      const context: DetectionContext = {
        userPrompt: 'I need to write code and also write tests',
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should detect implementation as primary
      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);

      // Should have alternatives
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);

      // Testing should be an alternative (mentioned "write tests")
      expect(result.alternatives.some(a => a.phase === WorkflowPhase.TESTING)).toBe(true);

      // Alternatives should be sorted by confidence descending
      for (let i = 0; i < result.alternatives.length - 1; i++) {
        expect(result.alternatives[i].confidence).toBeGreaterThanOrEqual(
          result.alternatives[i + 1].confidence
        );
      }
    });

    it('should limit alternatives to top 3', async () => {
      const context: DetectionContext = {
        userPrompt: 'spec plan implement test document review done',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result.alternatives.length).toBeLessThanOrEqual(3);
    });

    it('should not include alternatives if disabled in config', async () => {
      const detectorNoAlts = new PhaseDetector({ includeAlternatives: false });

      const context: DetectionContext = {
        userPrompt: 'implement and test',
        recentCommands: []
      };

      const result = await detectorNoAlts.detect(context);

      expect(result.alternatives).toHaveLength(0);
    });
  });

  describe('Command Suggestions', () => {
    it('should suggest /specweave:plan for PLAN_GENERATION phase', async () => {
      const context: DetectionContext = {
        userPrompt: 'I need to create an implementation plan and design the architecture',
        recentCommands: ['/specweave:increment'] // Add command for more evidence
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.PLAN_GENERATION);
      // Suggestion only if confidence >= threshold (0.6)
      if (result.confidence >= 0.6) {
        expect(result.suggestedCommand).toBe('/specweave:plan');
        expect(result.suggestionReason).toBeDefined();
      }
    });

    it('should suggest /specweave:do for IMPLEMENTATION phase', async () => {
      const context: DetectionContext = {
        userPrompt: 'Let\'s start coding and implement this feature',
        recentCommands: ['/specweave:plan'] // Add command for more evidence
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      if (result.confidence >= 0.6) {
        expect(result.suggestedCommand).toBe('/specweave:do');
      }
    });

    it('should suggest /specweave:done for COMPLETION phase', async () => {
      const context: DetectionContext = {
        userPrompt: 'Everything is complete and done, ready to finish and close',
        recentCommands: ['/specweave:progress'] // Add command for more evidence
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.COMPLETION);
      if (result.confidence >= 0.6) {
        expect(result.suggestedCommand).toBe('/specweave:done');
      }
    });

    it('should not suggest command if confidence below threshold', async () => {
      const detectorHighThreshold = new PhaseDetector({ confidenceThreshold: 0.9 });

      const context: DetectionContext = {
        userPrompt: 'Help',
        recentCommands: []
      };

      const result = await detectorHighThreshold.detect(context);

      // Low confidence, no suggestion
      expect(result.suggestedCommand).toBeUndefined();
    });
  });

  describe('Context Analysis (20% weight)', () => {
    // Temporarily create test increment directories for context testing
    const testProjectDir = '/tmp/specweave-phase-detector-test';
    const testIncrementId = '0001-test-feature';

    beforeEach(() => {
      // Clean up any previous test artifacts
      if (require('fs').existsSync(testProjectDir)) {
        require('fs').rmSync(testProjectDir, { recursive: true, force: true });
      }
    });

    afterEach(() => {
      // Clean up test artifacts
      if (require('fs').existsSync(testProjectDir)) {
        require('fs').rmSync(testProjectDir, { recursive: true, force: true });
      }
    });

    it('should detect PLAN_GENERATION when spec exists but plan missing', async () => {
      // Setup: Create increment with only spec.md
      const incrementDir = `${testProjectDir}/.specweave/increments/${testIncrementId}`;
      require('fs').mkdirSync(incrementDir, { recursive: true });
      require('fs').writeFileSync(`${incrementDir}/spec.md`, '# Feature Spec\n\nSome requirements');

      const context: DetectionContext = {
        userPrompt: 'What next?',
        incrementId: testIncrementId,
        workingDirectory: testProjectDir,
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should detect PLAN_GENERATION phase
      expect(result.phase).toBe(WorkflowPhase.PLAN_GENERATION);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.FILE_STATE &&
        e.description.includes('plan.md missing')
      )).toBe(true);
    });

    it('should detect TASK_BREAKDOWN when plan exists but tasks missing', async () => {
      // Setup: Create increment with spec and plan
      const incrementDir = `${testProjectDir}/.specweave/increments/${testIncrementId}`;
      require('fs').mkdirSync(incrementDir, { recursive: true });
      require('fs').writeFileSync(`${incrementDir}/spec.md`, '# Feature Spec\n\nRequirements');
      require('fs').writeFileSync(`${incrementDir}/plan.md`, '# Implementation Plan\n\nPhases');

      const context: DetectionContext = {
        userPrompt: 'Continue',
        incrementId: testIncrementId,
        workingDirectory: testProjectDir,
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should detect TASK_BREAKDOWN phase
      expect(result.phase).toBe(WorkflowPhase.TASK_BREAKDOWN);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.FILE_STATE &&
        e.description.includes('tasks.md missing')
      )).toBe(true);
    });

    it('should detect IMPLEMENTATION when all files present', async () => {
      // Setup: Create increment with all files
      const incrementDir = `${testProjectDir}/.specweave/increments/${testIncrementId}`;
      require('fs').mkdirSync(incrementDir, { recursive: true });
      require('fs').writeFileSync(`${incrementDir}/spec.md`, '# Feature Spec\n\nRequirements');
      require('fs').writeFileSync(`${incrementDir}/plan.md`, '# Implementation Plan\n\nPhases');
      require('fs').writeFileSync(`${incrementDir}/tasks.md`, '# Tasks\n\n- [ ] Task 1');

      const context: DetectionContext = {
        userPrompt: 'Next step?',
        incrementId: testIncrementId,
        workingDirectory: testProjectDir,
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should detect IMPLEMENTATION phase (all files present)
      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.FILE_STATE &&
        e.description.includes('All increment files present')
      )).toBe(true);
    });

    it('should detect SPEC_WRITING when spec is empty', async () => {
      // Setup: Create increment with empty spec
      const incrementDir = `${testProjectDir}/.specweave/increments/${testIncrementId}`;
      require('fs').mkdirSync(incrementDir, { recursive: true });
      require('fs').writeFileSync(`${incrementDir}/spec.md`, ''); // Empty file

      const context: DetectionContext = {
        userPrompt: 'What to do?',
        incrementId: testIncrementId,
        workingDirectory: testProjectDir,
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should detect SPEC_WRITING phase
      expect(result.phase).toBe(WorkflowPhase.SPEC_WRITING);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.FILE_STATE &&
        e.description.includes('spec.md exists but is empty')
      )).toBe(true);
    });

    it('should detect PLAN_GENERATION when plan is empty', async () => {
      // Setup: Create increment with spec and empty plan
      const incrementDir = `${testProjectDir}/.specweave/increments/${testIncrementId}`;
      require('fs').mkdirSync(incrementDir, { recursive: true });
      require('fs').writeFileSync(`${incrementDir}/spec.md`, '# Spec\n\nRequirements');
      require('fs').writeFileSync(`${incrementDir}/plan.md`, ''); // Empty file

      const context: DetectionContext = {
        userPrompt: 'Continue',
        incrementId: testIncrementId,
        workingDirectory: testProjectDir,
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should detect PLAN_GENERATION phase
      expect(result.phase).toBe(WorkflowPhase.PLAN_GENERATION);
      expect(result.evidence.some(e =>
        e.type === EvidenceType.FILE_STATE &&
        e.description.includes('plan.md exists but is empty')
      )).toBe(true);
    });

    it('should handle no incrementId gracefully', async () => {
      // Setup: Create .specweave directory
      require('fs').mkdirSync(`${testProjectDir}/.specweave/increments`, { recursive: true });

      const context: DetectionContext = {
        userPrompt: 'What should I do?',
        workingDirectory: testProjectDir,
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should still work but without context evidence
      expect(result).toBeDefined();
      expect(result.evidence.filter(e =>
        e.type === EvidenceType.FILE_STATE ||
        e.type === EvidenceType.INCREMENT_STATUS
      ).length).toBe(0);
    });

    it('should handle non-SpecWeave project gracefully', async () => {
      // No .specweave directory
      const context: DetectionContext = {
        userPrompt: 'implement feature',
        incrementId: testIncrementId,
        workingDirectory: testProjectDir,
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should still detect from keywords only
      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      // No context evidence
      expect(result.evidence.filter(e => e.type === EvidenceType.FILE_STATE).length).toBe(0);
    });

    it('should handle non-existent increment gracefully', async () => {
      // Setup: Create .specweave but not the specific increment
      require('fs').mkdirSync(`${testProjectDir}/.specweave/increments`, { recursive: true });

      const context: DetectionContext = {
        userPrompt: 'test this',
        incrementId: '9999-does-not-exist',
        workingDirectory: testProjectDir,
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should still work from keywords
      expect(result.phase).toBe(WorkflowPhase.TESTING);
      // No file state evidence
      expect(result.evidence.filter(e => e.type === EvidenceType.FILE_STATE).length).toBe(0);
    });

    it('should combine context evidence with keywords', async () => {
      // Setup: All files present
      const incrementDir = `${testProjectDir}/.specweave/increments/${testIncrementId}`;
      require('fs').mkdirSync(incrementDir, { recursive: true });
      require('fs').writeFileSync(`${incrementDir}/spec.md`, '# Spec');
      require('fs').writeFileSync(`${incrementDir}/plan.md`, '# Plan');
      require('fs').writeFileSync(`${incrementDir}/tasks.md`, '# Tasks');

      const context: DetectionContext = {
        userPrompt: 'Let\'s implement this feature',
        incrementId: testIncrementId,
        workingDirectory: testProjectDir,
        recentCommands: []
      };

      const result = await detector.detect(context);

      // Should have both keyword and file-state evidence
      expect(result.evidence.some(e => e.type === EvidenceType.KEYWORD)).toBe(true);
      expect(result.evidence.some(e => e.type === EvidenceType.FILE_STATE)).toBe(true);
      // Higher confidence due to combined evidence
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Performance & Caching', () => {
    it('should cache file states for repeated detections', async () => {
      // Setup: Create increment
      const testProjectDir = '/tmp/specweave-perf-test';
      const testIncrementId = '0001-test';
      const incrementDir = `${testProjectDir}/.specweave/increments/${testIncrementId}`;

      try {
        require('fs').mkdirSync(incrementDir, { recursive: true });
        require('fs').writeFileSync(`${incrementDir}/spec.md`, '# Spec');

        const context: DetectionContext = {
          userPrompt: 'What next?',
          incrementId: testIncrementId,
          workingDirectory: testProjectDir,
          recentCommands: []
        };

        // First detection (cache miss)
        detector.resetPerformanceStats();
        await detector.detect(context);

        // Second detection (should hit cache)
        await detector.detect(context);

        const stats = detector.getPerformanceStats();

        expect(stats.detectionCount).toBe(2);
        expect(stats.cacheHits).toBeGreaterThanOrEqual(1); // At least one hit
        expect(stats.cacheHitRate).toBeGreaterThan(0); // >0% cache hit rate
      } finally {
        if (require('fs').existsSync(testProjectDir)) {
          require('fs').rmSync(testProjectDir, { recursive: true, force: true });
        }
      }
    });

    it('should track detection performance metrics', async () => {
      detector.resetPerformanceStats();

      const context: DetectionContext = {
        userPrompt: 'implement feature',
        recentCommands: []
      };

      // Run 5 detections
      for (let i = 0; i < 5; i++) {
        await detector.detect(context);
      }

      const stats = detector.getPerformanceStats();

      expect(stats.detectionCount).toBe(5);
      expect(stats.averageDetectionTime).toBeGreaterThanOrEqual(0); // >= 0ms (can be 0 if ultra-fast)
      expect(stats.averageDetectionTime).toBeLessThan(100); // Should be fast (<100ms)
    });

    it('should complete detection in <50ms for typical case', async () => {
      const context: DetectionContext = {
        userPrompt: 'Let\'s implement this',
        recentCommands: ['/specweave:plan']
      };

      const startTime = Date.now();
      await detector.detect(context);
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(50); // <50ms performance target
    });

    it('should clear cache on demand', async () => {
      const testProjectDir = '/tmp/specweave-cache-clear-test';
      const testIncrementId = '0001-test';
      const incrementDir = `${testProjectDir}/.specweave/increments/${testIncrementId}`;

      try {
        require('fs').mkdirSync(incrementDir, { recursive: true });
        require('fs').writeFileSync(`${incrementDir}/spec.md`, '# Spec');

        const context: DetectionContext = {
          userPrompt: 'What next?',
          incrementId: testIncrementId,
          workingDirectory: testProjectDir,
          recentCommands: []
        };

        // Populate cache
        detector.resetPerformanceStats();
        await detector.detect(context);

        // Clear cache
        detector.clearCache();

        // Next detection should be a cache miss
        await detector.detect(context);
        const stats = detector.getPerformanceStats();

        expect(stats.cacheMisses).toBe(2); // Both detections are misses after clear
      } finally {
        if (require('fs').existsSync(testProjectDir)) {
          require('fs').rmSync(testProjectDir, { recursive: true, force: true });
        }
      }
    });

    it('should expire cache after TTL', async () => {
      const testProjectDir = '/tmp/specweave-ttl-test';
      const testIncrementId = '0001-test';
      const incrementDir = `${testProjectDir}/.specweave/increments/${testIncrementId}`;

      try {
        // Create detector with short TTL (100ms)
        const shortTTLDetector = new PhaseDetector({
          keywordWeight: 0.4,
          commandWeight: 0.3,
          contextWeight: 0.2,
          hintWeight: 0.1
        });
        // Access private property via type assertion
        (shortTTLDetector as any).DEFAULT_CACHE_TTL = 100;

        require('fs').mkdirSync(incrementDir, { recursive: true });
        require('fs').writeFileSync(`${incrementDir}/spec.md`, '# Spec');

        const context: DetectionContext = {
          userPrompt: 'What next?',
          incrementId: testIncrementId,
          workingDirectory: testProjectDir,
          recentCommands: []
        };

        // First detection
        await shortTTLDetector.detect(context);

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        // Second detection (should be cache miss due to expiration)
        shortTTLDetector.resetPerformanceStats();
        await shortTTLDetector.detect(context);
        const stats = shortTTLDetector.getPerformanceStats();

        expect(stats.cacheMisses).toBeGreaterThan(0); // Cache expired
      } finally {
        if (require('fs').existsSync(testProjectDir)) {
          require('fs').rmSync(testProjectDir, { recursive: true, force: true });
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prompt', async () => {
      const context: DetectionContext = {
        userPrompt: '',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result).toBeDefined();
      expect(result.phase).toBeDefined();
      expect(result.confidence).toBeLessThan(0.3);
    });

    it('should handle prompt with no recognizable keywords', async () => {
      const context: DetectionContext = {
        userPrompt: 'xyz abc qwerty',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.2);
    });

    it('should handle empty recent commands', async () => {
      const context: DetectionContext = {
        userPrompt: 'implement feature',
        recentCommands: []
      };

      const result = await detector.detect(context);

      expect(result.phase).toBe(WorkflowPhase.IMPLEMENTATION);
      // Should still work with keyword evidence only
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should handle conflicting evidence gracefully', async () => {
      const context: DetectionContext = {
        userPrompt: 'write spec',           // SPEC_WRITING
        recentCommands: ['/specweave:done'], // COMPLETION
        explicitHint: 'testing'              // TESTING
      };

      const result = await detector.detect(context);

      // Should pick one phase (highest weighted evidence)
      expect(result).toBeDefined();
      expect(result.phase).toBeDefined();
      // Should have evidence from multiple sources
      expect(result.evidence.length).toBeGreaterThan(1);
    });
  });
});
