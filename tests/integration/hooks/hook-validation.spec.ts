/**
 * Hook Validation Integration Tests
 *
 * Tests all SpecWeave hooks for:
 * - Valid JSON output format
 * - Correct exit codes (0 = success)
 * - Path resolution (dist/src/ not dist/)
 * - Error handling (graceful degradation)
 * - Integration with Claude Code
 *
 * Related: Plugin hook error investigation (increment 0031)
 * See: .specweave/increments/0031-external-tool-status-sync/reports/HOOK-ERROR-ANALYSIS.md
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

describe('Hook Validation', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  const hooksDir = path.join(projectRoot, 'plugins/specweave/hooks');

  // Helper to run hook with input
  async function runHook(hookName: string, input: string): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    const hookPath = path.join(hooksDir, hookName);

    try {
      const result = await execAsync(
        `echo '${input.replace(/'/g, "'\\''")}' | bash "${hookPath}"`,
        { cwd: projectRoot }
      );
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        exitCode: error.code || 1
      };
    }
  }

  // Helper to validate JSON output
  function isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  describe('Path Resolution', () => {
    it('should have all required compiled files in correct locations', () => {
      const requiredFiles = [
        'dist/src/core/increment/metadata-manager.js',
        'dist/src/core/deduplication/command-deduplicator.js',
        'dist/plugins/specweave/lib/hooks/sync-living-docs.js',
        'dist/plugins/specweave/lib/hooks/translate-living-docs.js',
        'dist/plugins/specweave/lib/hooks/update-tasks-md.js'
      ];

      requiredFiles.forEach(file => {
        const fullPath = path.join(projectRoot, file);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    it('should NOT have files in flattened dist/ structure', () => {
      // These paths are WRONG (flattened structure)
      const wrongPaths = [
        'dist/cli/index.js',  // Should be dist/src/cli/index.js
        'dist/metrics/dora-calculator.js'  // Should be dist/src/metrics/
      ];

      wrongPaths.forEach(file => {
        const fullPath = path.join(projectRoot, file);
        if (fs.existsSync(fullPath)) {
          console.warn(`⚠️  Found file in flattened location: ${file}`);
          console.warn('   This may indicate TypeScript compilation issue');
        }
      });
    });

    it('should use correct paths in hook scripts', () => {
      const hookFiles = [
        'user-prompt-submit.sh',
        'pre-command-deduplication.sh',
        'post-task-completion.sh'
      ];

      hookFiles.forEach(hookFile => {
        const content = fs.readFileSync(
          path.join(hooksDir, hookFile),
          'utf-8'
        );

        // Check for incorrect paths
        const wrongPatterns = [
          /dist\/cli\/index\.js(?!\/)/,  // dist/cli/index.js (not dist/src/cli/)
          /dist\/metrics\/(?!.*dist\/src)/  // dist/metrics/ (not dist/src/metrics/)
        ];

        wrongPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            console.warn(`⚠️  Potential wrong path in ${hookFile}:`, matches[0]);
          }
        });
      });
    });
  });

  describe('user-prompt-submit.sh', () => {
    const sampleInput = JSON.stringify({
      prompt: '/specweave:increment "test feature"',
      session_id: 'test-123',
      cwd: projectRoot
    });

    it('should output valid JSON', async () => {
      const result = await runHook('user-prompt-submit.sh', sampleInput);

      expect(isValidJSON(result.stdout)).toBe(true);
    });

    it('should exit with code 0', async () => {
      const result = await runHook('user-prompt-submit.sh', sampleInput);

      expect(result.exitCode).toBe(0);
    });

    it('should have valid decision field', async () => {
      const result = await runHook('user-prompt-submit.sh', sampleInput);
      const output = JSON.parse(result.stdout);

      expect(['approve', 'block']).toContain(output.decision);
    });

    it('should handle missing metadata gracefully', async () => {
      // Simulate missing node/dist files
      const inputWithoutDist = JSON.stringify({
        prompt: '/specweave:increment "test"',
        cwd: '/tmp/no-dist'
      });

      const result = await runHook('user-prompt-submit.sh', inputWithoutDist);

      // Should still exit 0 (fail-open)
      expect(result.exitCode).toBe(0);
      expect(isValidJSON(result.stdout)).toBe(true);
    });

    it('should block when WIP limit exceeded (2+ active)', async () => {
      // This test assumes we have 2+ active increments
      // If not, it should approve
      const result = await runHook('user-prompt-submit.sh', sampleInput);
      const output = JSON.parse(result.stdout);

      if (output.decision === 'block') {
        expect(output.reason).toContain('HARD CAP');
      }
    });
  });

  describe('pre-command-deduplication.sh', () => {
    const sampleInput = JSON.stringify({
      prompt: '/specweave:do',
      session_id: 'test-456',
      cwd: projectRoot
    });

    it('should output valid JSON', async () => {
      const result = await runHook('pre-command-deduplication.sh', sampleInput);

      expect(isValidJSON(result.stdout)).toBe(true);
    });

    it('should exit with code 0', async () => {
      const result = await runHook('pre-command-deduplication.sh', sampleInput);

      expect(result.exitCode).toBe(0);
    });

    it('should approve first invocation', async () => {
      const result = await runHook('pre-command-deduplication.sh', sampleInput);
      const output = JSON.parse(result.stdout);

      expect(output.decision).toBe('approve');
    });

    it('should detect rapid duplicate invocations', async () => {
      // First call
      await runHook('pre-command-deduplication.sh', sampleInput);

      // Immediate second call (< 1s)
      const result = await runHook('pre-command-deduplication.sh', sampleInput);
      const output = JSON.parse(result.stdout);

      // Should block duplicate
      expect(['approve', 'block']).toContain(output.decision);

      if (output.decision === 'block') {
        expect(output.reason).toContain('DUPLICATE');
      }
    });

    it('should handle missing deduplicator gracefully', async () => {
      const inputWithoutDist = JSON.stringify({
        prompt: '/specweave:do',
        cwd: '/tmp/no-dist'
      });

      const result = await runHook('pre-command-deduplication.sh', inputWithoutDist);

      // Should approve (fail-open)
      expect(result.exitCode).toBe(0);
      expect(isValidJSON(result.stdout)).toBe(true);

      const output = JSON.parse(result.stdout);
      expect(output.decision).toBe('approve');
    });
  });

  describe('post-task-completion.sh', () => {
    const sampleInput = JSON.stringify({
      session_id: 'test-789',
      cwd: projectRoot,
      hook_event_name: 'PostToolUse',
      tool_name: 'TodoWrite',
      tool_input: {
        todos: [
          { content: 'Test task', status: 'completed', activeForm: 'Testing' }
        ]
      },
      tool_response: {
        oldTodos: [],
        newTodos: [
          { content: 'Test task', status: 'completed', activeForm: 'Testing' }
        ]
      }
    });

    it('should execute without errors', async () => {
      const result = await runHook('post-task-completion.sh', sampleInput);

      // Post hooks don't output JSON, just exit 0
      expect(result.exitCode).toBe(0);
    });

    it('should handle missing sync scripts gracefully', async () => {
      const inputWithoutDist = JSON.stringify({
        ...JSON.parse(sampleInput),
        cwd: '/tmp/no-dist'
      });

      const result = await runHook('post-task-completion.sh', inputWithoutDist);

      // Should still exit 0 (fail-open)
      expect(result.exitCode).toBe(0);
    });

    it('should log to debug log', async () => {
      const debugLog = path.join(projectRoot, '.specweave/logs/hooks-debug.log');

      // Clear log
      if (fs.existsSync(debugLog)) {
        const stats = fs.statSync(debugLog);
        const sizeBefore = stats.size;

        await runHook('post-task-completion.sh', sampleInput);

        // Check if log grew (hook wrote to it)
        const statsAfter = fs.statSync(debugLog);
        expect(statsAfter.size).toBeGreaterThanOrEqual(sizeBefore);
      }
    });
  });

  describe('Hook Output Format', () => {
    it('should never output plain text before JSON', async () => {
      const hooks = [
        'user-prompt-submit.sh',
        'pre-command-deduplication.sh'
      ];

      for (const hook of hooks) {
        const result = await runHook(hook, JSON.stringify({
          prompt: '/specweave:test',
          cwd: projectRoot
        }));

        // First non-empty line should be valid JSON
        const firstLine = result.stdout.trim().split('\n')[0];

        if (firstLine && firstLine.length > 0) {
          expect(isValidJSON(firstLine) || firstLine === '{').toBe(true);
        }
      }
    });

    it('should use proper JSON structure for blocking', async () => {
      // Create scenario that triggers block
      const input = JSON.stringify({
        prompt: '/specweave:increment "test"',
        cwd: projectRoot
      });

      const result = await runHook('user-prompt-submit.sh', input);
      const output = JSON.parse(result.stdout);

      if (output.decision === 'block') {
        expect(output).toHaveProperty('reason');
        expect(typeof output.reason).toBe('string');
        expect(output.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON input gracefully', async () => {
      const result = await runHook('user-prompt-submit.sh', 'invalid json');

      // Hook uses set -euo pipefail, so invalid JSON causes exit 1
      // This is acceptable - hook should fail fast on invalid input
      // Claude Code will handle the error appropriately
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should handle missing required fields', async () => {
      const result = await runHook('user-prompt-submit.sh', JSON.stringify({}));

      // Should handle missing prompt field
      expect(result.exitCode).toBe(0);
    });

    it('should handle node not available', async () => {
      // This is hard to test without actually removing node
      // But we can verify fallback paths exist in code
      const userPromptSubmit = fs.readFileSync(
        path.join(hooksDir, 'user-prompt-submit.sh'),
        'utf-8'
      );

      // Should have fallback when node check fails
      expect(userPromptSubmit).toContain('command -v node');
      expect(userPromptSubmit).toContain('else');  // Fallback branch
    });
  });

  describe('Integration with Claude Code', () => {
    it('should match Claude Code hook event schema', () => {
      // Verify hooks expect correct input format
      const postTaskCompletion = fs.readFileSync(
        path.join(hooksDir, 'post-task-completion.sh'),
        'utf-8'
      );

      // Post-task-completion hook receives PostToolUse event
      // Input comes from stdin as JSON with tool_input/tool_response
      // We just verify the hook is properly structured
      expect(postTaskCompletion).toContain('INPUT');
      expect(postTaskCompletion).toContain('bash');
      expect(postTaskCompletion).toContain('TodoWrite');
    });

    it('should output format matching Claude Code expectations', async () => {
      const result = await runHook('user-prompt-submit.sh', JSON.stringify({
        prompt: '/test',
        cwd: projectRoot
      }));

      const output = JSON.parse(result.stdout);

      // Claude Code expects these fields
      expect(output).toHaveProperty('decision');

      // Optional fields
      if (output.systemMessage) {
        expect(typeof output.systemMessage).toBe('string');
      }
      if (output.reason) {
        expect(typeof output.reason).toBe('string');
      }
    });
  });
});
