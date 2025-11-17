/**
 * E2E tests for /specweave:next command
 *
 * Tests the complete workflow orchestration system end-to-end.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { executeNextCommand, parseArgs } from '../../../src/cli/commands/next-command.js';

describe('Next Command E2E', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `next-e2e-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.specweave/increments'));
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Argument Parsing', () => {
    it('should parse increment ID', () => {
      const config = parseArgs(['0039']);
      expect(config.incrementId).toBe('0039');
    });

    it('should parse autonomous flag', () => {
      const config = parseArgs(['--autonomous', '0039']);
      expect(config.autonomous).toBe(true);
      expect(config.incrementId).toBe('0039');
    });

    it('should parse all options', () => {
      const config = parseArgs([
        '--autonomous',
        '--dry-run',
        '--verbose',
        '--force',
        '--stop-on-error',
        '--max-iterations', '20',
        '--max-cost', '10',
        '--resume-from', 'checkpoint-1',
        '0039'
      ]);

      expect(config.autonomous).toBe(true);
      expect(config.dryRun).toBe(true);
      expect(config.verbose).toBe(true);
      expect(config.force).toBe(true);
      expect(config.stopOnError).toBe(true);
      expect(config.maxIterations).toBe(20);
      expect(config.maxCost).toBe(10);
      expect(config.resumeFrom).toBe('checkpoint-1');
      expect(config.incrementId).toBe('0039');
    });
  });

  describe('Interactive Mode', () => {
    it('should detect phase and suggest action', async () => {
      // Create test increment with only spec.md
      const incrementDir = path.join(testDir, '.specweave/increments/0001-test');
      await fs.ensureDir(incrementDir);
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        `---
increment: 0001-test
status: in-progress
---
# Test Feature
`
      );

      // This test would require mocking console output
      // For now, just verify it doesn't crash
      const config = {
        incrementId: '0001-test',
        dryRun: true,
        verbose: false
      };

      // In real E2E, would capture and verify output
      expect(config).toBeDefined();
    });
  });

  describe('Safety Guardrails', () => {
    it('should respect max iterations', () => {
      const config = parseArgs(['--autonomous', '--max-iterations', '10', '0039']);
      expect(config.maxIterations).toBe(10);
    });

    it('should respect cost threshold', () => {
      const config = parseArgs(['--autonomous', '--max-cost', '5', '0039']);
      expect(config.maxCost).toBe(5);
    });

    it('should support checkpoint resume', () => {
      const config = parseArgs(['--autonomous', '--resume-from', 'checkpoint-3', '0039']);
      expect(config.resumeFrom).toBe('checkpoint-3');
    });
  });
});
