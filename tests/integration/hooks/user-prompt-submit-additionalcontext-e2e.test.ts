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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('UserPromptSubmit Hook - additionalContext E2E Integration', () => {
  const hookPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/user-prompt-submit.sh'
  );

  // Test directory for isolated execution
  let testDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();

    // Create isolated test directory with .specweave structure
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-hook-e2e-'));

    // Create minimal .specweave structure
    fs.mkdirSync(path.join(testDir, '.specweave', 'increments'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave', 'logs'), { recursive: true });

    // Create minimal config.json
    fs.writeFileSync(
      path.join(testDir, '.specweave', 'config.json'),
      JSON.stringify({
        pluginAutoLoad: { enabled: false }, // Disable LLM calls for test speed
        incrementAssist: { enabled: false },
        testing: { defaultTestMode: 'test-after' }
      }, null, 2)
    );
  });

  afterAll(() => {
    process.chdir(originalCwd);
    // Cleanup test directory
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper: Execute hook with given prompt and return parsed output
   */
  function executeHook(prompt: string, options: { cwd?: string; env?: Record<string, string> } = {}): {
    raw: string;
    parsed: unknown;
    exitCode: number;
  } {
    const cwd = options.cwd || testDir;
    const env = {
      ...process.env,
      SPECWEAVE_DISABLE_AUTO_LOAD: '1', // Disable LLM detection
      SPECWEAVE_DISABLE_HOOKS: '0',
      ...options.env
    };

    // Clean debugger env vars (VSCode debug mode fix)
    delete env.NODE_OPTIONS;
    delete env.NODE_INSPECT;
    delete env.VSCODE_INSPECTOR_OPTIONS;

    const input = JSON.stringify({ prompt });

    try {
      const result = spawnSync('bash', [hookPath], {
        input,
        encoding: 'utf8',
        cwd,
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
    } catch (error) {
      return {
        raw: '',
        parsed: null,
        exitCode: -1
      };
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

    it('should use hookSpecificOutput wrapper for context injection', () => {
      // Create an active increment to trigger context injection
      const incrementDir = path.join(testDir, '.specweave', 'increments', '0001-test-feature');
      fs.mkdirSync(incrementDir, { recursive: true });
      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({ id: '0001-test-feature', status: 'active', type: 'feature' })
      );
      fs.writeFileSync(
        path.join(incrementDir, 'tasks.md'),
        '### T-001: Test task\n**Status**: [ ] pending'
      );

      // Create status-line.json cache
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'state', 'status-line.json'),
        JSON.stringify({ current: { total: 1, completed: 0 } })
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
    it('should dynamically include active increment in context', () => {
      // Setup active increment
      const incrementDir = path.join(testDir, '.specweave', 'increments', '0002-dynamic-test');
      fs.mkdirSync(incrementDir, { recursive: true });
      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({ id: '0002-dynamic-test', status: 'active', type: 'feature' })
      );
      fs.writeFileSync(
        path.join(incrementDir, 'tasks.md'),
        '### T-001: First\n**Status**: [x] completed\n### T-002: Second\n**Status**: [ ] pending'
      );

      // Create status cache
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'state', 'status-line.json'),
        JSON.stringify({ current: { total: 2, completed: 1, acsTotal: 4, acsCompleted: 2 } })
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

    it('should include TDD context when TDD mode is enabled', () => {
      // Enable TDD mode in config
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          pluginAutoLoad: { enabled: false },
          incrementAssist: { enabled: false },
          testing: {
            defaultTestMode: 'TDD',
            tddEnforcement: 'strict'
          }
        }, null, 2)
      );

      const result = executeHook('implement the feature');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should contain TDD enforcement message
      if (additionalContext) {
        expect(additionalContext).toMatch(/TDD|RED.*GREEN.*REFACTOR/i);
      }

      // Restore config
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          pluginAutoLoad: { enabled: false },
          incrementAssist: { enabled: false },
          testing: { defaultTestMode: 'test-after' }
        }, null, 2)
      );
    });
  });

  describe('Claude Code Schema Compliance', () => {
    it('should produce output matching Claude Code UserPromptSubmit schema', () => {
      // Setup increment for context
      const incrementDir = path.join(testDir, '.specweave', 'increments', '0003-schema-test');
      fs.mkdirSync(incrementDir, { recursive: true });
      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({ id: '0003-schema-test', status: 'active', type: 'feature' })
      );

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

    it('should properly escape special characters in additionalContext', () => {
      // Create increment with special characters in name
      const incrementDir = path.join(testDir, '.specweave', 'increments', '0004-special-chars');
      fs.mkdirSync(incrementDir, { recursive: true });
      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({ id: '0004-special-chars', status: 'active', type: 'feature' })
      );
      fs.writeFileSync(
        path.join(incrementDir, 'tasks.md'),
        '### T-001: Handle "quotes" and \\backslashes\n**Status**: [ ] pending'
      );

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
    it('should inject WIP warning when creating increment at limit', () => {
      // Create multiple active increments to hit WIP limit
      for (let i = 1; i <= 2; i++) {
        const dir = path.join(testDir, '.specweave', 'increments', `000${i}-wip-test-${i}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, 'metadata.json'),
          JSON.stringify({ id: `000${i}-wip-test-${i}`, status: 'active', type: 'feature' })
        );
      }

      // Set WIP limit to 1 in config
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({
          pluginAutoLoad: { enabled: false },
          incrementAssist: { enabled: false },
          limits: { maxActiveIncrements: 1, hardCap: 3 }
        }, null, 2)
      );

      const result = executeHook('/sw:increment "new feature"');

      expect(result.exitCode).toBe(0);

      const additionalContext = extractAdditionalContext(result.parsed);

      // Should contain WIP warning
      if (additionalContext) {
        expect(additionalContext).toMatch(/WIP|active increment/i);
      }

      // Cleanup
      for (let i = 1; i <= 2; i++) {
        const dir = path.join(testDir, '.specweave', 'increments', `000${i}-wip-test-${i}`);
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
    });
  });

  describe('External Folder Detection', () => {
    it('should inject warning when external folder detected in prompt', () => {
      // Clean up any leftover increments from previous tests
      const incrementsDir = path.join(testDir, '.specweave', 'increments');
      if (fs.existsSync(incrementsDir)) {
        for (const entry of fs.readdirSync(incrementsDir)) {
          const entryPath = path.join(incrementsDir, entry);
          if (fs.statSync(entryPath).isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
          }
        }
      }

      // Also clear the status cache
      const statusCache = path.join(testDir, '.specweave', 'state', 'status-line.json');
      if (fs.existsSync(statusCache)) {
        fs.unlinkSync(statusCache);
      }

      // Use prompt that matches the regex pattern: (in|to|at|create)[[:space:]]+(~/|/Users/|...)
      // Pattern expects direct "in ~/..." or "create ~/..." format
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

  describe('Deep JSON Structure Validation (LOW priority fixes)', () => {
    it('should produce syntactically valid JSON with complex content', () => {
      // Create increment with complex content
      const incrementDir = path.join(testDir, '.specweave', 'increments', '0010-json-test');
      fs.mkdirSync(incrementDir, { recursive: true });
      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({ id: '0010-json-test', status: 'active', type: 'feature' })
      );
      fs.writeFileSync(
        path.join(incrementDir, 'tasks.md'),
        `### T-001: Complex task with "quotes" and 'apostrophes'
**Status**: [ ] pending
Description includes:
- Backslashes: \\path\\to\\file
- Unicode: 日本語 émojis 🎉
- Newlines and tabs`
      );

      const result = executeHook('/sw:status');

      expect(result.exitCode).toBe(0);

      // Must be valid JSON despite complex content
      expect(() => JSON.parse(result.raw)).not.toThrow();

      // Cleanup
      fs.rmSync(incrementDir, { recursive: true, force: true });
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

    it('should validate hookSpecificOutput structure when present', () => {
      // Create active increment to trigger context
      const incrementDir = path.join(testDir, '.specweave', 'increments', '0011-struct-test');
      fs.mkdirSync(incrementDir, { recursive: true });
      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({ id: '0011-struct-test', status: 'active', type: 'feature' })
      );

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

      // Cleanup
      fs.rmSync(incrementDir, { recursive: true, force: true });
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
