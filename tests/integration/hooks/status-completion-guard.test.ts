/**
 * Tests for status-completion-guard.sh
 *
 * This guard prevents direct status changes to "completed" in metadata.json.
 * Status MUST be changed via /sw:done (with marker file) or /sw:auto (verified).
 *
 * @since 1.0.196
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('status-completion-guard', () => {
  const guardPath = path.join(process.cwd(), 'plugins/specweave/hooks/v2/guards/status-completion-guard.sh');
  let testDir: string;

  beforeAll(() => {
    // Create a temp directory that looks like a SpecWeave project
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-guard-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'increments', '0001-test'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
  });

  afterAll(() => {
    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function runGuard(input: object): { decision: string; reason?: string } {
    try {
      const result = execSync(`echo '${JSON.stringify(input)}' | bash ${guardPath}`, {
        cwd: testDir,
        encoding: 'utf8',
        env: { ...process.env, HOME: os.homedir() }
      });
      return JSON.parse(result.trim());
    } catch (error: unknown) {
      const err = error as { stdout?: string };
      // execSync throws on non-zero exit, but guard always exits 0
      return JSON.parse(err.stdout?.trim() || '{"decision":"allow"}');
    }
  }

  describe('blocking direct status changes to completed', () => {
    it('should BLOCK Edit to metadata.json changing status to completed', () => {
      const input = {
        tool_name: 'Edit',
        tool_input: {
          file_path: '.specweave/increments/0001-test/metadata.json',
          old_string: '"status": "active"',
          new_string: '"status": "completed"'
        }
      };

      const result = runGuard(input);
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('blocked');
    });

    it('should BLOCK status change from paused to completed', () => {
      const input = {
        tool_name: 'Edit',
        tool_input: {
          file_path: '.specweave/increments/0001-test/metadata.json',
          old_string: '"status": "paused"',
          new_string: '"status": "completed"'
        }
      };

      const result = runGuard(input);
      expect(result.decision).toBe('block');
    });

    it('should BLOCK status change from ready_for_review to completed', () => {
      const input = {
        tool_name: 'Edit',
        tool_input: {
          file_path: '.specweave/increments/0001-test/metadata.json',
          old_string: '"status": "ready_for_review"',
          new_string: '"status": "completed"'
        }
      };

      const result = runGuard(input);
      expect(result.decision).toBe('block');
    });
  });

  describe('allowing legitimate operations', () => {
    it('should ALLOW non-status edits to metadata.json', () => {
      const input = {
        tool_name: 'Edit',
        tool_input: {
          file_path: '.specweave/increments/0001-test/metadata.json',
          old_string: '"title": "Old Title"',
          new_string: '"title": "New Title"'
        }
      };

      const result = runGuard(input);
      expect(result.decision).toBe('allow');
    });

    it('should ALLOW edits to other files', () => {
      const input = {
        tool_name: 'Edit',
        tool_input: {
          file_path: '.specweave/increments/0001-test/spec.md',
          old_string: 'old content',
          new_string: 'new content'
        }
      };

      const result = runGuard(input);
      expect(result.decision).toBe('allow');
    });

    it('should ALLOW status changes to non-completed values', () => {
      const input = {
        tool_name: 'Edit',
        tool_input: {
          file_path: '.specweave/increments/0001-test/metadata.json',
          old_string: '"status": "active"',
          new_string: '"status": "ready_for_review"'
        }
      };

      const result = runGuard(input);
      expect(result.decision).toBe('allow');
    });

    it('should ALLOW Write tool (not Edit)', () => {
      const input = {
        tool_name: 'Write',
        tool_input: {
          file_path: '.specweave/increments/0001-test/metadata.json',
          content: '{"status": "completed"}'
        }
      };

      const result = runGuard(input);
      expect(result.decision).toBe('allow');
    });
  });

  describe('marker file bypass', () => {
    it('should ALLOW status change to completed when marker file exists', () => {
      // Create the marker file
      const markerPath = path.join(testDir, '.specweave', 'state', '.sw-done-in-progress');
      fs.writeFileSync(markerPath, '');

      try {
        const input = {
          tool_name: 'Edit',
          tool_input: {
            file_path: '.specweave/increments/0001-test/metadata.json',
            old_string: '"status": "active"',
            new_string: '"status": "completed"'
          }
        };

        const result = runGuard(input);
        expect(result.decision).toBe('allow');
      } finally {
        // Clean up marker
        fs.unlinkSync(markerPath);
      }
    });
  });
});
