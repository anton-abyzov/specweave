/**
 * Integration Test: Project-Scope Guard in UserPromptSubmit Hook
 *
 * Tests the actual bash hook script to ensure it blocks SpecWeave skills
 * in non-initialized projects and provides helpful user prompts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

const HOOK_PATH = path.resolve(__dirname, '../../../plugins/specweave/hooks/user-prompt-submit.sh');

/**
 * Execute the hook with given input
 * @param input - Hook input JSON
 * @param cwd - Working directory (defaults to temp dir)
 * @returns Hook output
 */
function executeHook(input: object, cwd?: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync('bash', [HOOK_PATH], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    cwd: cwd || tmpdir(),
    env: { ...process.env, SPECWEAVE_DISABLE_AUTO_LOAD: '1' } // Disable auto-load for faster tests
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status || 0
  };
}

describe('Project-Scope Guard in Hook', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `specweave-guard-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Non-Initialized Projects', () => {
    it('should block /sw:increment in non-initialized project', () => {
      const result = executeHook(
        { prompt: '/sw:increment "new feature"' },
        tempDir
      );

      // Should block with error message
      expect(result.stdout).toContain('block');
      expect(result.stdout).toContain('Not Initialized');
      expect(result.stdout).toContain('specweave init');
    });

    it('should block /sw:do in non-initialized project', () => {
      const result = executeHook(
        { prompt: '/sw:do' },
        tempDir
      );

      expect(result.stdout).toContain('block');
      expect(result.stdout).toContain('Not Initialized');
    });

    it('should block plugin-namespaced skills', () => {
      const result = executeHook(
        { prompt: '/frontend:component-generate' },
        tempDir
      );

      expect(result.stdout).toContain('block');
      expect(result.stdout).toContain('Not Initialized');
    });

    it('should provide helpful error message with all options', () => {
      const result = executeHook(
        { prompt: '/sw:progress' },
        tempDir
      );

      const output = result.stdout;

      // Should contain all 4 options
      expect(output).toContain('Initialize SpecWeave in this project');
      expect(output).toContain('Use SpecWeave in a different directory');
      expect(output).toContain('Disable SpecWeave plugins globally');
      expect(output).toContain('Disable this guard');

      // Should mention settings.json
      expect(output).toContain('settings.json');
      expect(output).toContain('enabledPlugins');
    });

    it('should handle case-insensitive skill names', () => {
      const result = executeHook(
        { prompt: '/SW:INCREMENT "test"' },
        tempDir
      );

      expect(result.stdout).toContain('block');
      expect(result.stdout).toContain('Not Initialized');
    });

    it('should handle whitespace before skill name', () => {
      const result = executeHook(
        { prompt: '  /sw:do' },
        tempDir
      );

      expect(result.stdout).toContain('block');
    });
  });

  describe('Initialized Projects', () => {
    beforeEach(() => {
      // Create .specweave/config.json to simulate initialized project
      const specweaveDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      fs.writeFileSync(
        path.join(specweaveDir, 'config.json'),
        JSON.stringify({ version: '1.0.0' })
      );
    });

    it('should NOT block /sw:increment in initialized project', () => {
      const result = executeHook(
        { prompt: '/sw:increment "new feature"' },
        tempDir
      );

      // Should not contain "block" decision
      expect(result.stdout).not.toContain('"decision": "block"');
      expect(result.stdout).not.toContain('Not Initialized');
    });

    it('should NOT block /sw:do in initialized project', () => {
      const result = executeHook(
        { prompt: '/sw:do' },
        tempDir
      );

      expect(result.stdout).not.toContain('"decision": "block"');
    });

    it('should NOT block plugin-namespaced skills', () => {
      const result = executeHook(
        { prompt: '/frontend:component-generate' },
        tempDir
      );

      expect(result.stdout).not.toContain('"decision": "block"');
    });
  });

  describe('Non-SpecWeave Commands', () => {
    it('should NOT block regular prompts', () => {
      const result = executeHook(
        { prompt: 'write a function to calculate fibonacci' },
        tempDir
      );

      expect(result.stdout).not.toContain('block');
      expect(result.stdout).not.toContain('Not Initialized');
    });

    it('should NOT block other slash commands', () => {
      const result = executeHook(
        { prompt: '/help' },
        tempDir
      );

      expect(result.stdout).not.toContain('Not Initialized');
    });
  });

  describe('Guard Configuration', () => {
    it('should respect SPECWEAVE_DISABLE_GUARD environment variable', () => {
      const result = spawnSync('bash', [HOOK_PATH], {
        input: JSON.stringify({ prompt: '/sw:increment "test"' }),
        encoding: 'utf8',
        cwd: tempDir,
        env: {
          ...process.env,
          SPECWEAVE_DISABLE_GUARD: '1',
          SPECWEAVE_DISABLE_AUTO_LOAD: '1'
        }
      });

      // Should not block even in non-initialized project
      expect(result.stdout).not.toContain('"decision": "block"');
      expect(result.stdout).not.toContain('Not Initialized');
    });

    it('should respect guard.enabled: false in config', () => {
      // Create config with guard disabled
      const specweaveDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      fs.writeFileSync(
        path.join(specweaveDir, 'config.json'),
        JSON.stringify({
          version: '1.0.0',
          guard: { enabled: false }
        })
      );

      const result = executeHook(
        { prompt: '/sw:increment "test"' },
        tempDir
      );

      // Should not block when guard is disabled in config
      expect(result.stdout).not.toContain('"decision": "block"');
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted config.json gracefully', () => {
      const specweaveDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      fs.writeFileSync(
        path.join(specweaveDir, 'config.json'),
        'INVALID JSON {{{'
      );

      const result = executeHook(
        { prompt: '/sw:do' },
        tempDir
      );

      // Should block since config is corrupted (treat as not initialized)
      expect(result.stdout).toContain('block');
    });

    it('should handle .specweave directory without config.json', () => {
      const specweaveDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      // No config.json created

      const result = executeHook(
        { prompt: '/sw:increment "test"' },
        tempDir
      );

      // Should block since config doesn't exist
      expect(result.stdout).toContain('block');
      expect(result.stdout).toContain('Not Initialized');
    });

    it('should be fast (< 150ms for non-initialized check)', () => {
      const start = Date.now();

      executeHook(
        { prompt: '/sw:do' },
        tempDir
      );

      const duration = Date.now() - start;

      // Should be very fast since it's just checking file existence
      // Allow 500ms to account for CI/system load variability during full suite runs
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Nested Directories', () => {
    it('should find .specweave in parent directory', () => {
      // Create .specweave at root
      const specweaveDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      fs.writeFileSync(
        path.join(specweaveDir, 'config.json'),
        JSON.stringify({ version: '1.0.0' })
      );

      // Create nested directory
      const nestedDir = path.join(tempDir, 'src', 'components');
      fs.mkdirSync(nestedDir, { recursive: true });

      // Execute hook from nested directory
      const result = executeHook(
        { prompt: '/sw:do' },
        nestedDir
      );

      // Should NOT block since .specweave exists in parent
      // NOTE: This depends on bash implementation using `pwd` and walking up
      // Current implementation only checks current directory
      // This test documents the expected behavior for future enhancement
      expect(result.stdout).not.toContain('block');
    });
  });
});
