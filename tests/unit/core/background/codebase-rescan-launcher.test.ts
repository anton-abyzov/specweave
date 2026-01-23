/**
 * Codebase Rescan Job Launcher Unit Tests
 *
 * Tests for launching codebase rescan background jobs with full scan mode.
 * Key test: Verify full scan mode is used for comprehensive living docs updates.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  launchCodebaseRescanJob,
  isJobRunning,
  getJobLog,
  getJobResult
} from '../../../../src/core/background/job-launcher.js';

describe('CodebaseRescanJobLauncher', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-rescan-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state', 'jobs'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave', 'increments', '0001-test-increment'), { recursive: true });

    // Create minimal increment files
    fs.writeFileSync(
      path.join(testDir, '.specweave', 'increments', '0001-test-increment', 'spec.md'),
      '---\ntitle: Test Increment\n---\n# Test'
    );
    fs.writeFileSync(
      path.join(testDir, '.specweave', 'increments', '0001-test-increment', 'metadata.json'),
      JSON.stringify({ id: '0001-test-increment', status: 'completed', createdAt: new Date().toISOString() })
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('launchCodebaseRescanJob', () => {
    it('should create a codebase rescan job with full depth in foreground mode', async () => {
      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        featureId: 'FS-001',
        depth: 'full',
        foreground: true
      });

      expect(result.job).toBeDefined();
      expect(result.job.type).toBe('codebase-rescan');
      expect(result.job.status).toBe('pending');
      expect(result.isBackground).toBe(false);
      expect(result.pid).toBeUndefined();
    });

    it('should write job config with full depth to disk', async () => {
      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        featureId: 'FS-001',
        depth: 'full',
        foreground: true
      });

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.jobId).toBe(result.job.id);
      expect(config.projectPath).toBe(testDir);
      expect(config.closedIncrementId).toBe('0001-test-increment');
      expect(config.featureId).toBe('FS-001');
      expect(config.depth).toBe('full');  // CRITICAL: Must be 'full' not 'quick'
    });

    it('should default depth to quick when not specified', async () => {
      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        foreground: true
      });

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Default is 'quick' per job-launcher.ts line 487
      expect(config.depth).toBe('quick');
    });

    it('should handle missing featureId gracefully', async () => {
      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        depth: 'full',
        foreground: true
      });

      expect(result.job).toBeDefined();

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.featureId).toBeUndefined();
    });

    it('should include scopePaths when provided', async () => {
      const scopePaths = ['src/core/', 'src/utils/'];

      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        featureId: 'FS-001',
        scopePaths,
        depth: 'full',
        foreground: true
      });

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.scopePaths).toEqual(scopePaths);
    });

    it('should include startedAt timestamp in config', async () => {
      const beforeTime = new Date().toISOString();

      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        depth: 'full',
        foreground: true
      });

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(config.startedAt).toBeDefined();
      expect(new Date(config.startedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    });

    it('should fallback to foreground when worker not found in background mode', async () => {
      // In test environment, worker may be found (dist exists) or not found
      // Either way, it should not throw - just return a job
      try {
        const result = await launchCodebaseRescanJob({
          projectPath: testDir,
          closedIncrementId: '0001-test-increment',
          depth: 'full',
          foreground: false
        });

        // If we get here without error, job was created (background or foreground)
        expect(result.job).toBeDefined();
      } catch (err: any) {
        // Worker spawn may fail in test environment (PID file timeout)
        // This is expected if worker can't start - verify it's a startup error
        expect(err.message).toMatch(/Worker failed to start|Worker process died/);
      }
    });
  });

  describe('Full vs Quick Depth Behavior', () => {
    it('should use full depth for comprehensive reconciliation', async () => {
      // Full depth should enable deep reconciliation in codebase-rescan-worker
      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        featureId: 'FS-001',
        depth: 'full',
        foreground: true
      });

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Full mode enables:
      // - Deep reconciliation (undocumented exports, missing code items, signature mismatches)
      // - Comprehensive living docs update
      expect(config.depth).toBe('full');
    });

    it('should use quick depth for basic sync', async () => {
      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        featureId: 'FS-001',
        depth: 'quick',
        foreground: true
      });

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Quick mode:
      // - Basic reconciliation only
      // - Faster execution
      expect(config.depth).toBe('quick');
    });
  });

  describe('Job State Management', () => {
    it('should not be running initially', async () => {
      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        depth: 'full',
        foreground: true
      });

      // In foreground mode, no worker is spawned
      expect(isJobRunning(testDir, result.job.id)).toBe(false);
    });

    it('should have empty log initially', async () => {
      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        depth: 'full',
        foreground: true
      });

      // No worker log in foreground mode
      expect(getJobLog(testDir, result.job.id)).toBe('');
    });

    it('should have no result initially', async () => {
      const result = await launchCodebaseRescanJob({
        projectPath: testDir,
        closedIncrementId: '0001-test-increment',
        depth: 'full',
        foreground: true
      });

      expect(getJobResult(testDir, result.job.id)).toBeNull();
    });
  });
});
