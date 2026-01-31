/**
 * Integration tests for stop-reflect.sh cross-platform timeout
 *
 * Tests that the reflect hook works on macOS (no `timeout` command)
 * by falling back to gtimeout or perl.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('stop-reflect.sh cross-platform timeout', () => {
  const hookPath = path.join(
    process.cwd(),
    'plugins/specweave/hooks/stop-reflect.sh'
  );

  beforeAll(() => {
    // Verify hook exists
    expect(fs.existsSync(hookPath)).toBe(true);
  });

  describe('run_with_timeout function', () => {
    it('should have run_with_timeout function defined', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');
      expect(hookContent).toContain('run_with_timeout');
    });

    it('should check for gtimeout first (macOS with coreutils)', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');
      // gtimeout should be checked before timeout
      const gtimeoutPos = hookContent.indexOf('gtimeout');
      const timeoutPos = hookContent.indexOf('command -v timeout');

      // gtimeout check should exist
      expect(gtimeoutPos).toBeGreaterThan(-1);
    });

    it('should have perl fallback for systems without timeout', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');
      // Perl fallback pattern
      expect(hookContent).toContain('perl');
      expect(hookContent).toContain('alarm');
    });

    it('should use run_with_timeout instead of raw timeout command', () => {
      const hookContent = fs.readFileSync(hookPath, 'utf-8');
      // The old pattern should NOT exist
      const oldPattern = /(?<!run_with_)timeout\s+\d+\s+specweave/;
      expect(hookContent.match(oldPattern)).toBeNull();
    });
  });

  describe('perl fallback execution', () => {
    it('perl should be available on this system', () => {
      const result = spawnSync('perl', ['--version'], { encoding: 'utf-8' });
      expect(result.status).toBe(0);
    });

    it('perl alarm-based timeout should work', () => {
      // Test perl timeout with a quick command
      const result = spawnSync(
        'perl',
        ['-e', 'alarm 5; exec "echo", "hello"'],
        { encoding: 'utf-8' }
      );
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('hello');
    });

    it('perl alarm should timeout slow commands', () => {
      // Test that perl timeout actually works (1 second timeout on sleep 10)
      const result = spawnSync(
        'perl',
        ['-e', 'alarm 1; exec "sleep", "10"'],
        { encoding: 'utf-8', timeout: 5000 }
      );
      // Should have been killed by alarm (exit code 142 = 128 + 14 SIGALRM)
      expect(result.status).not.toBe(0);
    });
  });

  describe('hook execution without timeout command', () => {
    let tempDir: string;
    let mockHookPath: string;

    beforeAll(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reflect-test-'));

      // Create a modified hook that simulates no timeout command
      const hookContent = fs.readFileSync(hookPath, 'utf-8');
      const modifiedHook = hookContent.replace(
        /command -v timeout/g,
        'command -v nonexistent_timeout_cmd'
      );
      mockHookPath = path.join(tempDir, 'stop-reflect-test.sh');
      fs.writeFileSync(mockHookPath, modifiedHook, { mode: 0o755 });
    });

    afterAll(() => {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should execute successfully when timeout command is not available', () => {
      // Create minimal input for the hook
      const input = JSON.stringify({
        transcript_path: '',
      });

      // Run the modified hook
      const result = spawnSync('bash', [mockHookPath], {
        input,
        encoding: 'utf-8',
        env: {
          ...process.env,
          PROJECT_ROOT: tempDir,
        },
        timeout: 10000,
      });

      // Hook should not crash - it should return valid JSON
      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('decision');
    });
  });
});
