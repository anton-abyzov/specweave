/**
 * Tests for Keyword Detector - Lazy Plugin Loading
 *
 * @module tests/unit/core/lazy-loading/keyword-detector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectSpecWeaveIntent,
  determinePlugins,
  getPluginGroups,
  getPluginsForGroup,
  getAllPlugins,
  SPECWEAVE_KEYWORDS,
  PLUGIN_GROUPS,
} from '../../../../src/core/lazy-loading/keyword-detector.js';

describe('Keyword Detector', () => {
  describe('detectSpecWeaveIntent', () => {
    describe('High Confidence Keywords', () => {
      it('should detect /sw: command with high confidence', () => {
        const result = detectSpecWeaveIntent('Let me run /sw:increment for this feature');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.matchedKeywords).toContain('/sw:');
      });

      it('should detect "specweave" keyword', () => {
        const result = detectSpecWeaveIntent('I want to use specweave for this project');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.matchedKeywords).toContain('specweave');
      });

      it('should detect "increment" keyword', () => {
        const result = detectSpecWeaveIntent("Let's create an increment for auth");
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.matchedKeywords).toContain('increment');
      });

      it('should detect spec.md reference', () => {
        const result = detectSpecWeaveIntent('Update the spec.md file with new requirements');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.matchedKeywords).toContain('spec.md');
      });

      it('should detect tasks.md reference', () => {
        const result = detectSpecWeaveIntent('Check the tasks.md for pending items');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.matchedKeywords).toContain('tasks.md');
      });

      it('should detect "living docs" phrase', () => {
        const result = detectSpecWeaveIntent('Update the living docs with the new architecture');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.matchedKeywords).toContain('living docs');
      });

      it('should detect "acceptance criteria"', () => {
        const result = detectSpecWeaveIntent('Review the acceptance criteria for US-001');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.matchedKeywords).toContain('acceptance criteria');
      });

      it('should detect "user story"', () => {
        const result = detectSpecWeaveIntent('Create a user story for the login feature');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.matchedKeywords).toContain('user story');
      });
    });

    describe('Medium Confidence Keywords', () => {
      it('should detect "jira sync" with medium confidence', () => {
        const result = detectSpecWeaveIntent('Run jira sync to update issues');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        expect(result.matchedKeywords).toContain('jira sync');
      });

      it('should detect "github sync"', () => {
        const result = detectSpecWeaveIntent('Execute github sync for the increment');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        expect(result.matchedKeywords).toContain('github sync');
      });

      it('should detect "auto mode"', () => {
        const result = detectSpecWeaveIntent('Start auto mode for autonomous execution');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        expect(result.matchedKeywords).toContain('auto mode');
      });

      it('should detect "tdd mode"', () => {
        const result = detectSpecWeaveIntent('Enable tdd mode for test-driven development');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        expect(result.matchedKeywords).toContain('tdd mode');
      });

      it('should detect "feature planning"', () => {
        const result = detectSpecWeaveIntent("Let's do some feature planning for Q1");
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        expect(result.matchedKeywords).toContain('feature planning');
      });
    });

    describe('Low Confidence Keywords', () => {
      it('should detect standalone "backlog" with development confidence', () => {
        // v1.0.130: "backlog" is now in DEVELOPMENT_KEYWORDS.jira
        // so it gets 0.7 confidence (above auto-install threshold)
        const result = detectSpecWeaveIntent('Review the backlog items');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.7);
        expect(result.matchedKeywords).toContain('backlog');
      });

      it('should detect standalone "kanban" with low confidence', () => {
        const result = detectSpecWeaveIntent('Update the kanban board');
        expect(result.detected).toBe(true);
        expect(result.confidence).toBeGreaterThanOrEqual(0.3);
        expect(result.matchedKeywords).toContain('kanban');
      });

      it('should require word boundaries for low confidence keywords', () => {
        // "spec" should match but not within "specification"
        const result1 = detectSpecWeaveIntent('Check the spec for details');
        expect(result1.detected).toBe(true);
        expect(result1.matchedKeywords).toContain('spec');

        // "openapi spec" is a negative pattern, should not detect
        const result2 = detectSpecWeaveIntent('Update the openapi spec');
        expect(result2.detected).toBe(false);
      });
    });

    describe('Negative Patterns', () => {
      it('should NOT detect "openapi spec"', () => {
        const result = detectSpecWeaveIntent('Generate the openapi spec for the API');
        expect(result.detected).toBe(false);
        expect(result.confidence).toBe(0);
      });

      it('should NOT detect "test spec"', () => {
        const result = detectSpecWeaveIntent('Write a test spec for the component');
        expect(result.detected).toBe(false);
      });

      it('should NOT detect "task runner"', () => {
        const result = detectSpecWeaveIntent('Configure the task runner for builds');
        expect(result.detected).toBe(false);
      });

      it('should NOT detect "gulp task"', () => {
        const result = detectSpecWeaveIntent('Create a gulp task for minification');
        expect(result.detected).toBe(false);
      });

      it('should NOT detect "terraform plan"', () => {
        const result = detectSpecWeaveIntent('Run terraform plan to preview changes');
        expect(result.detected).toBe(false);
      });

      it('should NOT detect "build plan"', () => {
        const result = detectSpecWeaveIntent('Review the build plan for the release');
        expect(result.detected).toBe(false);
      });

      it('should prioritize negative patterns over positive keywords', () => {
        // Even if "spec" is present, "api spec" negates it
        const result = detectSpecWeaveIntent('Document the api spec with swagger');
        expect(result.detected).toBe(false);
      });
    });

    describe('Case Insensitivity', () => {
      it('should detect keywords regardless of case', () => {
        const result1 = detectSpecWeaveIntent('Run SPECWEAVE init');
        expect(result1.detected).toBe(true);
        expect(result1.matchedKeywords).toContain('specweave');

        const result2 = detectSpecWeaveIntent('Create an INCREMENT for auth');
        expect(result2.detected).toBe(true);
        expect(result2.matchedKeywords).toContain('increment');

        const result3 = detectSpecWeaveIntent('Update the Spec.MD file');
        expect(result3.detected).toBe(true);
        expect(result3.matchedKeywords).toContain('spec.md');
      });

      it('should handle mixed case negative patterns', () => {
        const result = detectSpecWeaveIntent('Update the OpenAPI Spec');
        expect(result.detected).toBe(false);
      });
    });

    describe('Confidence Boosting', () => {
      it('should boost confidence when 3+ keywords match', () => {
        const result = detectSpecWeaveIntent(
          'Create an increment with spec.md and tasks.md for the user story'
        );
        expect(result.detected).toBe(true);
        expect(result.confidence).toBe(1.0); // 0.9 + 0.1 boost, capped at 1.0
        expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Performance', () => {
      it('should complete detection in less than 50ms', () => {
        const longPrompt = 'A'.repeat(10000) + ' specweave increment ' + 'B'.repeat(10000);
        const result = detectSpecWeaveIntent(longPrompt);
        expect(result.latencyMs).toBeLessThan(50);
        expect(result.detected).toBe(true);
      });

      it('should handle empty prompts gracefully', () => {
        const result = detectSpecWeaveIntent('');
        expect(result.detected).toBe(false);
        expect(result.matchedKeywords).toEqual([]);
        expect(result.suggestedPlugins).toEqual([]);
      });

      it('should return latency measurement', () => {
        const result = detectSpecWeaveIntent('test prompt');
        expect(typeof result.latencyMs).toBe('number');
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle special characters in prompt', () => {
        const result = detectSpecWeaveIntent('Run /sw:do && update spec.md!');
        expect(result.detected).toBe(true);
      });

      it('should handle newlines and tabs', () => {
        const result = detectSpecWeaveIntent('Create\nan\nincrement\tfor auth');
        expect(result.detected).toBe(true);
        expect(result.matchedKeywords).toContain('increment');
      });

      it('should handle Unicode characters', () => {
        const result = detectSpecWeaveIntent('Create an increment for 用户认证');
        expect(result.detected).toBe(true);
      });

      it('should not detect when prompt has no relevant keywords', () => {
        const result = detectSpecWeaveIntent('Hello world, how are you today?');
        expect(result.detected).toBe(false);
      });
    });
  });

  describe('determinePlugins', () => {
    it('should always include core specweave plugin', () => {
      const result = determinePlugins([], '');
      expect(result).toContain('specweave');
    });

    it('should suggest jira plugin for jira-related keywords', () => {
      const result = determinePlugins(['jira sync'], 'sync with jira');
      expect(result).toContain('specweave-jira');
    });

    it('should suggest github plugin for github-related keywords', () => {
      const result = determinePlugins(['github sync'], 'sync with github');
      expect(result).toContain('specweave-github');
    });

    it('should suggest ado plugin for azure devops keywords', () => {
      const result = determinePlugins(['ado sync'], 'sync with azure devops');
      expect(result).toContain('specweave-ado');
    });

    it('should suggest frontend plugin for react/vue keywords', () => {
      const result = determinePlugins([], 'build a react component');
      expect(result).toContain('specweave-frontend');
    });

    it('should suggest backend plugin for api/database keywords', () => {
      const result = determinePlugins([], 'create an api endpoint with database');
      expect(result).toContain('specweave-backend');
    });

    it('should suggest k8s plugin for kubernetes keywords', () => {
      const result = determinePlugins([], 'deploy to kubernetes');
      expect(result).toContain('specweave-k8s');
    });

    it('should suggest multiple plugins for complex prompts', () => {
      const result = determinePlugins([], 'build a react frontend with api backend and jira sync');
      expect(result).toContain('specweave');
      expect(result).toContain('specweave-frontend');
      expect(result).toContain('specweave-backend');
      expect(result).toContain('specweave-jira');
    });

    it('should suggest testing plugin for test keywords', () => {
      const result = determinePlugins([], 'write e2e tests with playwright');
      expect(result).toContain('specweave-testing');
    });

    it('should route mermaid keywords to core (diagrams now in core)', () => {
      // v1.0.130: Diagrams, docs, release moved to CORE specweave plugin
      // No separate specweave-diagrams plugin needed
      const result = determinePlugins([], 'create a mermaid diagram');
      expect(result).toContain('specweave'); // Core handles diagrams
      // specweave-diagrams is no longer suggested
    });
  });

  describe('getPluginGroups', () => {
    it('should return all plugin groups', () => {
      const groups = getPluginGroups();
      expect(groups).toHaveProperty('core');
      expect(groups).toHaveProperty('github');
      expect(groups).toHaveProperty('jira');
      expect(groups).toHaveProperty('ado');
      expect(groups).toHaveProperty('frontend');
      expect(groups).toHaveProperty('backend');
    });

    it('should return a copy, not the original', () => {
      const groups1 = getPluginGroups();
      const groups2 = getPluginGroups();
      groups1.core.push('test');
      expect(groups2.core).not.toContain('test');
    });
  });

  describe('getPluginsForGroup', () => {
    it('should return plugins for core group', () => {
      const plugins = getPluginsForGroup('core');
      expect(plugins).toContain('specweave');
    });

    it('should return plugins for github group', () => {
      const plugins = getPluginsForGroup('github');
      expect(plugins).toContain('specweave-github');
    });

    it('should return empty array for unknown group', () => {
      const plugins = getPluginsForGroup('unknown-group');
      expect(plugins).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const plugins1 = getPluginsForGroup('CORE');
      const plugins2 = getPluginsForGroup('Core');
      expect(plugins1).toEqual(plugins2);
    });
  });

  describe('getAllPlugins', () => {
    it('should return all unique plugins', () => {
      const plugins = getAllPlugins();
      expect(plugins.length).toBeGreaterThan(0);
      // Check for some expected plugins
      expect(plugins).toContain('specweave');
      expect(plugins).toContain('specweave-github');
      expect(plugins).toContain('specweave-jira');
    });

    it('should not have duplicates', () => {
      const plugins = getAllPlugins();
      const uniquePlugins = [...new Set(plugins)];
      expect(plugins.length).toBe(uniquePlugins.length);
    });
  });

  describe('SPECWEAVE_KEYWORDS constant', () => {
    it('should have high confidence keywords', () => {
      expect(SPECWEAVE_KEYWORDS.high.length).toBeGreaterThan(0);
      expect(SPECWEAVE_KEYWORDS.high).toContain('/sw:');
      expect(SPECWEAVE_KEYWORDS.high).toContain('specweave');
      expect(SPECWEAVE_KEYWORDS.high).toContain('increment');
    });

    it('should have medium confidence keywords', () => {
      expect(SPECWEAVE_KEYWORDS.medium.length).toBeGreaterThan(0);
      expect(SPECWEAVE_KEYWORDS.medium).toContain('jira sync');
    });

    it('should have low confidence keywords', () => {
      expect(SPECWEAVE_KEYWORDS.low.length).toBeGreaterThan(0);
      expect(SPECWEAVE_KEYWORDS.low).toContain('backlog');
    });

    it('should have negative patterns', () => {
      expect(SPECWEAVE_KEYWORDS.negative.length).toBeGreaterThan(0);
      expect(SPECWEAVE_KEYWORDS.negative).toContain('openapi spec');
    });
  });

  describe('PLUGIN_GROUPS constant', () => {
    it('should have expected groups', () => {
      expect(Object.keys(PLUGIN_GROUPS)).toContain('core');
      expect(Object.keys(PLUGIN_GROUPS)).toContain('github');
      expect(Object.keys(PLUGIN_GROUPS)).toContain('jira');
      expect(Object.keys(PLUGIN_GROUPS)).toContain('ado');
    });

    it('should have at least one plugin per group', () => {
      for (const [group, plugins] of Object.entries(PLUGIN_GROUPS)) {
        expect(plugins.length).toBeGreaterThan(0);
      }
    });
  });
});
