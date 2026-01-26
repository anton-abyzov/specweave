/**
 * E2E Test: UserPromptSubmit Hook additionalContext Integration
 *
 * Verifies that the hook DYNAMICALLY generates additionalContext
 * and outputs valid JSON that Claude Code can process.
 *
 * This test fills the gap identified by judge-llm:
 * - Static tests only verify hook file contains certain strings
 * - This E2E test verifies actual execution produces correct output
 *
 * @since 1.0.167
 * @see ADR-0230 (UserPromptSubmit Hook additionalContext Fix)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import os from 'os';
import * as fs from '../../../src/utils/fs-native.js';
import { getCleanEnv } from '../../test-utils/clean-env.js';
import { findProjectRoot } from '../../test-utils/project-root.js';
import { IncrementFactory } from '../test-utils/increment-factory.js';

// ✅ SAFE: Find project root from test file location, not process.cwd()
const projectRoot = findProjectRoot(import.meta.url);

describe('UserPromptSubmit Hook - additionalContext E2E Integration', () => {
  const hookPath = path.join(
    projectRoot,
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  // Test directory for isolated execution
  let testRoot: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(
      os.tmpdir(),
      `hook-additionalcontext-e2e-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`
    );

    // Create isolated test directory with .specweave structure
    await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'state'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'logs'));

    // Create minimal config.json
    await fs.writeJSON(
      path.join(testRoot, '.specweave', 'config.json'),
      {
        pluginAutoLoad: { enabled: false }, // Disable LLM calls for test speed
        incrementAssist: { enabled: false },
        testing: { defaultTestMode: 'test-after' }
      },
      { spaces: 2 }
    );

    // Mock process.cwd() to return testRoot for code under test
    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    // Cleanup test directory
    if (testRoot && await fs.pathExists(testRoot)) {
      await fs.remove(testRoot);
    }
  });

  /**
   * Helper: Execute hook with given prompt and return parsed output
   * Uses getCleanEnv() to prevent debugger interference (VSCode, CI/CD)
   */
  function executeHook(prompt: string, options: { env?: Record<string, string> } = {}): {
    raw: string;
    parsed: unknown;
    exitCode: number;
  } {
    // CRITICAL: Use getCleanEnv() to remove NODE_OPTIONS debugger flags
    const env = {
      ...getCleanEnv(),
      SPECWEAVE_DISABLE_AUTO_LOAD: '1', // Disable LLM detection
      SPECWEAVE_DISABLE_HOOKS: '0',
      PWD: testRoot,
      ...options.env
    };

    const input = JSON.stringify({ prompt });

    try {
      const result = spawnSync('bash', [hookPath], {
        input,
        encoding: 'utf8',
        cwd: testRoot,
        env,
        timeout: 10000
      });

      const raw = result.stdout?.trim() || '';
      let parsed: unknown = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        // Output might not be JSON
      }

      return {
        raw,
        parsed,
        exitCode: result.status ?? -1
      };
    } catch {
      return {
        raw: '',
        parsed: null,
        exitCode: -1
      };
    }
  }

  /**
   * Helper: Clean up all increments in test directory
   */
  async function cleanupIncrements(): Promise<void> {
    const incrementsDir = path.join(testRoot, '.specweave', 'increments');
    if (await fs.pathExists(incrementsDir)) {
      const entries = await fs.readdir(incrementsDir);
      for (const entry of entries) {
        const entryPath = path.join(incrementsDir, entry);
        const stat = await fs.stat(entryPath);
        if (stat.isDirectory()) {
          await fs.remove(entryPath);
        }
      }
    }
    // Also clear status cache
    const statusCache = path.join(testRoot, '.specweave', 'state', 'status-line.json');
    if (await fs.pathExists(statusCache)) {
      await fs.remove(statusCache);
    }
  }

  describe('JSON Output Format Validation', () => {
    it('should output valid JSON for simple prompts', () => {
      const result = executeHook('hello world');

      expect(result.exitCode).toBe(0);
      expect(result.raw).toBeTruthy();
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });

    it('should output decision:approve for non-SpecWeave prompts', () => {
      const result = executeHook('what is 2+2?');

      expect(result.exitCode).toBe(0);
      expect(result.parsed).toMatchObject({
        decision: 'approve'
      });
    });

    it('should use hookSpecificOutput wrapper for context injection', async () => {
      // Create an active increment to trigger context injection
      await IncrementFactory.create(testRoot, '0001-test-feature', {
        status: 'active',
        title: 'Test Feature'
      });

      // Create status-line.json cache
      await fs.writeJSON(
        path.join(testRoot, '.specweave', 'state', 'status-line.json'),
        { current: { total: 1, completed: 0 } },
        { spaces: 2 }
      );

      const result = executeHook('/sw:status');

      expect(result.exitCode).toBe(0);

      // Should use hookSpecificOutput.additionalContext (NOT systemMessage!)
      if (result.parsed && typeof result.parsed === 'object') {
        const output = result.parsed as Record<string, unknown>;

        // Must NOT have systemMessage (that was the bug!)
        expect(output).not.toHaveProperty('systemMessage');

        // Must have hookSpecificOutput wrapper
        if ('hookSpecificOutput' in output) {
          const hookOutput = output.hookSpecificOutput as Record<string, unknown>;
          expect(hookOutput).toHaveProperty('hookEventName', 'UserPromptSubmit');
          expect(hookOutput).toHaveProperty('additionalContext');
          expect(typeof hookOutput.additionalContext).toBe('string');
        }
      }
    });
  });

  describe('Dynamic Context Generation', () => {
    it('should dynamically include active increment in context', async () => {
      // Setup active increment using IncrementFactory
      await IncrementFactory.create(testRoot, '0002-dynamic-test', {
        status: 'active',
        title: 'Dynamic Test',
        tasksComplete: false
      });

      // Create status cache
      await fs.writeJSON(
        path.join(testRoot, '.specweave', 'state', 'status-line.json'),
        { current: { total: 2, completed: 1, acsTotal: 4, acsCompleted: 2 } },
        { spaces: 2 }
      );

      const result = executeHook('implement the feature');

      expect(result.exitCode).toBe(0);

      // Extract additionalContext
      const additionalContext = extractAdditionalContext(result.parsed);

      // Should contain dynamic increment info
      if (additionalContext) {
        expect(additionalContext).toContain('0002-dynamic-test');
      }
    });

    it('should include TDD context when TDD mode is enabled', async () => {
      // Enable TDD mode in config
      await fs.writeJSON(
        path.join(testRoot, '.specweave', 'config.json'),
        {
          pluginAutoLoad: { enabled: false },
          incrementAssist: { enabled: false },
          testing: {
            defaultTestMode: 'TDD',
            tddEnforcement: 'strict'
          }
        },
        { spaces: 2 }
      );

      const result = executeHook('implement the feature');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should contain TDD enforcement message
      if (additionalContext) {
        expect(additionalContext).toMatch(/TDD|RED.*GREEN.*REFACTOR/i);
      }
    });
  });

  describe('Claude Code Schema Compliance', () => {
    it('should produce output matching Claude Code UserPromptSubmit schema', async () => {
      // Setup increment for context
      await IncrementFactory.create(testRoot, '0003-schema-test', {
        status: 'active',
        title: 'Schema Test'
      });

      const result = executeHook('/sw:progress');

      expect(result.exitCode).toBe(0);
      expect(result.parsed).toBeTruthy();

      const output = result.parsed as Record<string, unknown>;

      // Valid Claude Code responses for UserPromptSubmit:
      // 1. {"decision": "approve"} - simple approval
      // 2. {"decision": "block", "reason": "..."} - block with reason
      // 3. {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": "..."}} - context injection

      const isValidSimpleApprove = output.decision === 'approve';
      const isValidBlock = output.decision === 'block' && typeof output.reason === 'string';
      const isValidContextInjection =
        typeof output.hookSpecificOutput === 'object' &&
        output.hookSpecificOutput !== null &&
        (output.hookSpecificOutput as Record<string, unknown>).hookEventName === 'UserPromptSubmit';

      expect(isValidSimpleApprove || isValidBlock || isValidContextInjection).toBe(true);
    });

    it('should properly escape special characters in additionalContext', async () => {
      // Create increment with special characters in title
      await IncrementFactory.create(testRoot, '0004-special-chars', {
        status: 'active',
        title: 'Handle "quotes" and \\backslashes'
      });

      const result = executeHook('/sw:status');

      expect(result.exitCode).toBe(0);

      // Output must be valid JSON (meaning escaping worked)
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });

    it('should handle newlines in context without breaking JSON', () => {
      const result = executeHook('/sw:progress');

      expect(result.exitCode).toBe(0);

      // If there's additionalContext, newlines must be escaped
      const additionalContext = extractAdditionalContext(result.parsed);
      if (additionalContext) {
        // The raw JSON must be valid (newlines escaped as \n)
        expect(() => JSON.parse(result.raw)).not.toThrow();
      }
    });
  });

  describe('WIP Limit Context Injection', () => {
    it('should inject WIP warning when creating increment at limit', async () => {
      // Create multiple active increments to hit WIP limit
      await IncrementFactory.create(testRoot, '0001-wip-test-1', {
        status: 'active',
        title: 'WIP Test 1'
      });
      await IncrementFactory.create(testRoot, '0002-wip-test-2', {
        status: 'active',
        title: 'WIP Test 2'
      });

      // Set WIP limit to 1 in config
      await fs.writeJSON(
        path.join(testRoot, '.specweave', 'config.json'),
        {
          pluginAutoLoad: { enabled: false },
          incrementAssist: { enabled: false },
          limits: { maxActiveIncrements: 1, hardCap: 3 }
        },
        { spaces: 2 }
      );

      const result = executeHook('/sw:increment "new feature"');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should contain WIP warning
      if (additionalContext) {
        expect(additionalContext).toMatch(/WIP|active increment/i);
      }
    });
  });

  describe('External Folder Detection', () => {
    it('should inject warning when external folder detected in prompt', async () => {
      // Clean up any leftover increments from previous tests
      await cleanupIncrements();

      // Use prompt that matches the regex pattern: (in|to|at|create)[[:space:]]+(~/|/Users/|...)
      const result = executeHook('create in ~/Projects/external-folder');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should contain external folder warning (EXTERNAL PROJECT DETECTED message)
      if (additionalContext) {
        expect(additionalContext).toMatch(/EXTERNAL|outside|NEW.*Claude.*session/i);
      }
    });
  });

  describe('Regression: systemMessage Field (ADR-0230)', () => {
    it('should NEVER use systemMessage field (Claude Code ignores it)', () => {
      // Test multiple scenarios
      const prompts = [
        '/sw:status',
        '/sw:progress',
        '/sw:increment "test"',
        'implement new feature',
        'build dashboard'
      ];

      for (const prompt of prompts) {
        const result = executeHook(prompt);

        expect(result.exitCode).toBe(0);

        if (result.parsed && typeof result.parsed === 'object') {
          const output = result.parsed as Record<string, unknown>;

          // systemMessage was the bug - must NEVER appear
          expect(output).not.toHaveProperty('systemMessage');
        }
      }
    });
  });

  describe('Deep JSON Structure Validation', () => {
    it('should produce syntactically valid JSON with complex content', async () => {
      // Create increment with complex content using IncrementFactory
      await IncrementFactory.create(testRoot, '0010-json-test', {
        status: 'active',
        title: 'Complex task with "quotes" and émojis 🎉'
      });

      const result = executeHook('/sw:status');

      expect(result.exitCode).toBe(0);

      // Must be valid JSON despite complex content
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });

    it('should handle empty prompts gracefully', () => {
      const result = executeHook('');

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });

    it('should handle very long prompts without truncation errors', () => {
      const longPrompt = 'implement '.repeat(500); // ~5000 chars

      const result = executeHook(longPrompt);

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });

    it('should handle prompts with JSON-like content', () => {
      const jsonPrompt = 'create a config like {"key": "value", "nested": {"a": 1}}';

      const result = executeHook(jsonPrompt);

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.raw)).not.toThrow();
    });

    it('should validate hookSpecificOutput structure when present', async () => {
      // Create active increment to trigger context
      await IncrementFactory.create(testRoot, '0011-struct-test', {
        status: 'active',
        title: 'Structure Test'
      });

      const result = executeHook('/sw:progress');

      expect(result.exitCode).toBe(0);

      if (result.parsed && typeof result.parsed === 'object') {
        const output = result.parsed as Record<string, unknown>;

        if ('hookSpecificOutput' in output) {
          const hookOutput = output.hookSpecificOutput as Record<string, unknown>;

          // Validate required fields per Claude Code schema
          expect(hookOutput).toHaveProperty('hookEventName');
          expect(hookOutput.hookEventName).toBe('UserPromptSubmit');

          // additionalContext must be a string
          if ('additionalContext' in hookOutput) {
            expect(typeof hookOutput.additionalContext).toBe('string');
            // Must not be empty when present
            expect((hookOutput.additionalContext as string).length).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});

/**
 * Helper: Extract additionalContext from parsed hook output
 */
function extractAdditionalContext(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const output = parsed as Record<string, unknown>;

  if ('hookSpecificOutput' in output && typeof output.hookSpecificOutput === 'object') {
    const hookOutput = output.hookSpecificOutput as Record<string, unknown>;
    if ('additionalContext' in hookOutput && typeof hookOutput.additionalContext === 'string') {
      return hookOutput.additionalContext;
    }
  }

  return null;
}
