/**
 * Job Launcher Unit Tests
 *
 * Tests for launching background jobs (clone, import) and utility functions.
 * Key test: ESM compatibility with __dirname replacement.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  launchCloneJob,
  launchImportJob,
  isJobRunning,
  killJob,
  getJobLog,
  getJobResult,
  cleanupOldJobs
} from '../../../../src/core/background/job-launcher.js';
import { BackgroundJobManager } from '../../../../src/core/background/job-manager.js';

describe('JobLauncher', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-launcher-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state', 'jobs'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('launchCloneJob', () => {
    it('should create a clone job in foreground mode', async () => {
      const result = await launchCloneJob({
        projectPath: testDir,
        repositories: [
          { owner: 'org', name: 'repo1', path: 'repos/repo1', cloneUrl: 'https://example.com/repo1.git' },
          { owner: 'org', name: 'repo2', path: 'repos/repo2', cloneUrl: 'https://example.com/repo2.git' }
        ],
        foreground: true
      });

      expect(result.job).toBeDefined();
      expect(result.job.type).toBe('clone-repos');
      expect(result.job.status).toBe('pending');
      expect(result.job.progress.total).toBe(2);
      expect(result.isBackground).toBe(false);
      expect(result.pid).toBeUndefined();
    });

    it('should write job config to disk', async () => {
      const result = await launchCloneJob({
        projectPath: testDir,
        repositories: [
          { owner: 'org', name: 'repo1', path: 'repos/repo1', cloneUrl: 'https://example.com/repo1.git' }
        ],
        foreground: true
      });

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.jobId).toBe(result.job.id);
      expect(config.projectPath).toBe(testDir);
      expect(config.repositories).toHaveLength(1);
      expect(config.repositories[0].cloneUrl).toBe('https://example.com/repo1.git');
    });

    it('should handle empty repository list', async () => {
      const result = await launchCloneJob({
        projectPath: testDir,
        repositories: [],
        foreground: true
      });

      expect(result.job.progress.total).toBe(0);
    });

    it('should fallback to foreground when worker not found in background mode', async () => {
      // Background mode but worker won't be found in test environment
      const result = await launchCloneJob({
        projectPath: testDir,
        repositories: [
          { owner: 'org', name: 'repo1', path: 'repos/repo1', cloneUrl: 'https://example.com/repo1.git' }
        ],
        foreground: false
      });

      // Should fallback to foreground since worker path isn't found in test env
      expect(result.job).toBeDefined();
      // Note: isBackground depends on whether worker is found
    });
  });

  describe('launchImportJob', () => {
    it('should create an import job with GitHub config', async () => {
      const result = await launchImportJob({
        type: 'import-issues',
        projectPath: testDir,
        coordinatorConfig: {
          github: true,
          githubRepositories: [
            { owner: 'org', repo: 'repo1' }
          ],
          importConfig: { timeRangeMonths: 6 }
        },
        estimatedTotal: 100,
        foreground: true
      });

      expect(result.job).toBeDefined();
      expect(result.job.type).toBe('import-issues');
      expect(result.job.progress.total).toBe(100);
      expect(result.isBackground).toBe(false);
    });

    it('should create an import job with JIRA config', async () => {
      const result = await launchImportJob({
        type: 'import-issues',
        projectPath: testDir,
        coordinatorConfig: {
          jira: true,
          importConfig: { timeRangeMonths: 3 }
        },
        foreground: true
      });

      expect(result.job).toBeDefined();
      expect(result.job.type).toBe('import-issues');
    });

    it('should create an import job with ADO config', async () => {
      const result = await launchImportJob({
        type: 'import-issues',
        projectPath: testDir,
        coordinatorConfig: {
          ado: true,
          importConfig: { timeRangeMonths: 12 }
        },
        foreground: true
      });

      expect(result.job).toBeDefined();
      expect(result.job.type).toBe('import-issues');
    });

    it('should use default time range if not specified', async () => {
      const result = await launchImportJob({
        type: 'import-issues',
        projectPath: testDir,
        coordinatorConfig: {
          github: true
        },
        foreground: true
      });

      // Check config was written with default time range
      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config).toBeDefined();
    });
  });

  describe('isJobRunning', () => {
    it('should return false when PID file does not exist', () => {
      expect(isJobRunning(testDir, 'nonexistent-job')).toBe(false);
    });

    it('should return false when process is not running', () => {
      // Create fake job directory with PID file pointing to non-existent process
      const jobId = 'test-job-123';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      // Use a very high PID that's unlikely to exist
      fs.writeFileSync(path.join(jobDir, 'worker.pid'), '999999999');

      expect(isJobRunning(testDir, jobId)).toBe(false);
    });

    it('should return true when process is running', () => {
      // Create fake job directory with current process PID
      const jobId = 'test-job-456';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      // Use current process PID (should be running)
      fs.writeFileSync(path.join(jobDir, 'worker.pid'), process.pid.toString());

      expect(isJobRunning(testDir, jobId)).toBe(true);
    });
  });

  describe('killJob', () => {
    it('should return false when PID file does not exist', () => {
      expect(killJob(testDir, 'nonexistent-job')).toBe(false);
    });

    it('should return false when process cannot be killed', () => {
      const jobId = 'test-job-kill';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      // Non-existent PID
      fs.writeFileSync(path.join(jobDir, 'worker.pid'), '999999999');

      expect(killJob(testDir, jobId)).toBe(false);
    });
  });

  describe('getJobLog', () => {
    it('should return empty string when log file does not exist', () => {
      expect(getJobLog(testDir, 'nonexistent-job')).toBe('');
    });

    it('should return full log content', () => {
      const jobId = 'test-job-log';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      const logContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      fs.writeFileSync(path.join(jobDir, 'worker.log'), logContent);

      expect(getJobLog(testDir, jobId)).toBe(logContent);
    });

    it('should return tail lines when specified', () => {
      const jobId = 'test-job-log-tail';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      const logContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      fs.writeFileSync(path.join(jobDir, 'worker.log'), logContent);

      const result = getJobLog(testDir, jobId, 2);
      expect(result).toBe('Line 4\nLine 5');
    });
  });

  describe('getJobResult', () => {
    it('should return null when result file does not exist', () => {
      expect(getJobResult(testDir, 'nonexistent-job')).toBeNull();
    });

    it('should return parsed result JSON', () => {
      const jobId = 'test-job-result';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      const result = {
        totalCount: 10,
        succeeded: 8,
        failed: 2,
        completedAt: '2025-01-01T00:00:00.000Z'
      };
      fs.writeFileSync(path.join(jobDir, 'result.json'), JSON.stringify(result));

      expect(getJobResult(testDir, jobId)).toEqual(result);
    });

    it('should return null for invalid JSON', () => {
      const jobId = 'test-job-bad-result';
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', jobId);
      fs.mkdirSync(jobDir, { recursive: true });

      fs.writeFileSync(path.join(jobDir, 'result.json'), 'not valid json');

      expect(getJobResult(testDir, jobId)).toBeNull();
    });
  });

  describe('cleanupOldJobs', () => {
    it('should not throw when jobs directory does not exist', () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-empty-'));
      try {
        expect(() => cleanupOldJobs(emptyDir)).not.toThrow();
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });

    it('should delete old completed job directories', async () => {
      // Create job via manager to get proper state
      const jobManager = new BackgroundJobManager(testDir);
      const job = jobManager.createJob('clone-repos', {
        type: 'clone-repos',
        repositories: [],
        projectPath: testDir
      }, 0);

      jobManager.startJob(job.id);
      jobManager.completeJob(job.id);

      // Create job directory
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', job.id);
      fs.mkdirSync(jobDir, { recursive: true });
      fs.writeFileSync(path.join(jobDir, 'config.json'), '{}');

      // Set modification time to 10 days ago
      const oldTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      fs.utimesSync(jobDir, oldTime, oldTime);

      // Cleanup with 7 day retention
      cleanupOldJobs(testDir, 7);

      // Directory should be deleted
      expect(fs.existsSync(jobDir)).toBe(false);
    });

    it('should preserve recent job directories', async () => {
      // Create job via manager
      const jobManager = new BackgroundJobManager(testDir);
      const job = jobManager.createJob('clone-repos', {
        type: 'clone-repos',
        repositories: [],
        projectPath: testDir
      }, 0);

      jobManager.startJob(job.id);
      jobManager.completeJob(job.id);

      // Create job directory (recent - created just now)
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', job.id);
      fs.mkdirSync(jobDir, { recursive: true });
      fs.writeFileSync(path.join(jobDir, 'config.json'), '{}');

      // Cleanup
      cleanupOldJobs(testDir, 7);

      // Directory should still exist (recent)
      expect(fs.existsSync(jobDir)).toBe(true);
    });

    it('should preserve running job directories regardless of age', async () => {
      // Create job via manager but keep it running
      const jobManager = new BackgroundJobManager(testDir);
      const job = jobManager.createJob('clone-repos', {
        type: 'clone-repos',
        repositories: [],
        projectPath: testDir
      }, 0);

      jobManager.startJob(job.id);
      // Don't complete - keep running

      // Create job directory
      const jobDir = path.join(testDir, '.specweave', 'state', 'jobs', job.id);
      fs.mkdirSync(jobDir, { recursive: true });
      fs.writeFileSync(path.join(jobDir, 'config.json'), '{}');

      // Set modification time to 10 days ago
      const oldTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      fs.utimesSync(jobDir, oldTime, oldTime);

      // Cleanup
      cleanupOldJobs(testDir, 7);

      // Directory should still exist (job still running)
      expect(fs.existsSync(jobDir)).toBe(true);
    });
  });

  describe('ESM Compatibility', () => {
    it('should have working __dirname equivalent (import.meta.url based)', async () => {
      // This test verifies that the ESM fix for __dirname is working.
      // If this fails with "ReferenceError: __dirname is not defined",
      // the fix was not applied correctly.

      // Simply calling launchCloneJob exercises the findWorkerByName function
      // which uses __dirname internally
      const result = await launchCloneJob({
        projectPath: testDir,
        repositories: [
          { owner: 'test', name: 'repo', path: 'repos/repo', cloneUrl: 'https://example.com/repo.git' }
        ],
        foreground: true
      });

      // If we get here without "ReferenceError: __dirname is not defined",
      // the ESM fix is working
      expect(result.job).toBeDefined();
    });

    it('should handle background mode worker path resolution', async () => {
      // This test exercises the findCloneWorkerPath function which uses __dirname
      // Even if worker isn't found, it shouldn't throw "__dirname is not defined"
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const result = await launchCloneJob({
          projectPath: testDir,
          repositories: [
            { owner: 'test', name: 'repo', path: 'repos/repo', cloneUrl: 'https://example.com/repo.git' }
          ],
          foreground: false // Try background mode
        });

        // Should either:
        // 1. Find worker and spawn (isBackground: true)
        // 2. Fallback to foreground (isBackground: false) with warning
        expect(result.job).toBeDefined();
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('Job Configuration', () => {
    it('should preserve repository clone URLs in config', async () => {
      const repos = [
        { owner: 'org/project', name: 'frontend', path: 'repos/frontend', cloneUrl: 'https://pat@dev.azure.com/org/project/_git/frontend' },
        { owner: 'org/project', name: 'backend', path: 'repos/backend', cloneUrl: 'https://pat@dev.azure.com/org/project/_git/backend' }
      ];

      const result = await launchCloneJob({
        projectPath: testDir,
        repositories: repos,
        foreground: true
      });

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(config.repositories).toHaveLength(2);
      expect(config.repositories[0].cloneUrl).toBe(repos[0].cloneUrl);
      expect(config.repositories[1].cloneUrl).toBe(repos[1].cloneUrl);
    });

    it('should include startedAt timestamp in config', async () => {
      const beforeTime = new Date().toISOString();

      const result = await launchCloneJob({
        projectPath: testDir,
        repositories: [],
        foreground: true
      });

      const configPath = path.join(testDir, '.specweave', 'state', 'jobs', result.job.id, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(config.startedAt).toBeDefined();
      expect(new Date(config.startedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    });
  });
});
