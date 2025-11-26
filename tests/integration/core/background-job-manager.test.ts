/**
 * Background Job Manager Integration Tests
 *
 * Tests job creation, progress tracking, and state persistence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BackgroundJobManager, getJobManager } from '../../../src/core/background/job-manager.js';
import type { CloneJobConfig, ImportJobConfig } from '../../../src/core/background/types.js';

describe('BackgroundJobManager', () => {
  let testDir: string;
  let jobManager: BackgroundJobManager;

  beforeEach(() => {
    // Create temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-job-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
    jobManager = new BackgroundJobManager(testDir);
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Job Creation', () => {
    it('should create a clone-repos job', () => {
      const config: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [
          { owner: 'test', name: 'repo1', path: 'repo1' },
          { owner: 'test', name: 'repo2', path: 'repo2' }
        ],
        projectPath: testDir
      };

      const job = jobManager.createJob('clone-repos', config, 2);

      expect(job.id).toBeDefined();
      expect(job.type).toBe('clone-repos');
      expect(job.status).toBe('pending');
      expect(job.progress.total).toBe(2);
      expect(job.progress.current).toBe(0);
    });

    it('should create an import-issues job', () => {
      const config: ImportJobConfig = {
        type: 'import-issues',
        provider: 'github',
        repositories: ['owner/repo1', 'owner/repo2'],
        timeRangeMonths: 3,
        projectPath: testDir
      };

      const job = jobManager.createJob('import-issues', config, 100);

      expect(job.id).toBeDefined();
      expect(job.type).toBe('import-issues');
      expect(job.status).toBe('pending');
      expect(job.progress.total).toBe(100);
    });
  });

  describe('Job Lifecycle', () => {
    it('should start a job', () => {
      const config: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [{ owner: 'test', name: 'repo1', path: 'repo1' }],
        projectPath: testDir
      };

      const job = jobManager.createJob('clone-repos', config, 1);
      const startedJob = jobManager.startJob(job.id);

      expect(startedJob?.status).toBe('running');
    });

    it('should update progress with percentage and rate', () => {
      const config: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [
          { owner: 'test', name: 'repo1', path: 'repo1' },
          { owner: 'test', name: 'repo2', path: 'repo2' }
        ],
        projectPath: testDir
      };

      const job = jobManager.createJob('clone-repos', config, 2);
      jobManager.startJob(job.id);

      // Simulate progress
      const updatedJob = jobManager.updateProgress(job.id, 1, 'repo1', 'repo1');

      expect(updatedJob?.progress.current).toBe(1);
      expect(updatedJob?.progress.percentage).toBe(50);
      expect(updatedJob?.progress.itemsCompleted).toContain('repo1');
    });

    it('should complete a job successfully', () => {
      const config: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [{ owner: 'test', name: 'repo1', path: 'repo1' }],
        projectPath: testDir
      };

      const job = jobManager.createJob('clone-repos', config, 1);
      jobManager.startJob(job.id);
      jobManager.updateProgress(job.id, 1, 'repo1', 'repo1');
      const completedJob = jobManager.completeJob(job.id);

      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.completedAt).toBeDefined();
    });

    it('should complete a job with error', () => {
      const config: ImportJobConfig = {
        type: 'import-issues',
        provider: 'github',
        timeRangeMonths: 3,
        projectPath: testDir
      };

      const job = jobManager.createJob('import-issues', config, 100);
      jobManager.startJob(job.id);
      const failedJob = jobManager.completeJob(job.id, 'Rate limit exceeded');

      expect(failedJob?.status).toBe('failed');
      expect(failedJob?.error).toBe('Rate limit exceeded');
    });

    it('should pause and resume a job', () => {
      const config: ImportJobConfig = {
        type: 'import-issues',
        provider: 'github',
        timeRangeMonths: 3,
        projectPath: testDir
      };

      const job = jobManager.createJob('import-issues', config, 100);
      jobManager.startJob(job.id);
      jobManager.updateProgress(job.id, 50, 'item-50');

      // Pause
      const pausedJob = jobManager.pauseJob(job.id);
      expect(pausedJob?.status).toBe('paused');
      expect(pausedJob?.progress.current).toBe(50);

      // Resume (via startJob)
      const resumedJob = jobManager.startJob(job.id);
      expect(resumedJob?.status).toBe('running');
      expect(resumedJob?.progress.current).toBe(50); // Progress preserved
    });
  });

  describe('State Persistence', () => {
    it('should persist job state to disk', () => {
      const config: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [{ owner: 'test', name: 'repo1', path: 'repo1' }],
        projectPath: testDir
      };

      const job = jobManager.createJob('clone-repos', config, 1);
      jobManager.startJob(job.id);

      // Verify state file exists
      const stateFile = path.join(testDir, '.specweave', 'state', 'background-jobs.json');
      expect(fs.existsSync(stateFile)).toBe(true);

      // Create new manager and verify job is loaded
      const newManager = new BackgroundJobManager(testDir);
      const loadedJob = newManager.getJob(job.id);

      expect(loadedJob).toBeDefined();
      expect(loadedJob?.status).toBe('running');
    });

    it('should survive session restart', () => {
      const config: ImportJobConfig = {
        type: 'import-issues',
        provider: 'jira',
        projectKey: 'PROJ',
        timeRangeMonths: 6,
        projectPath: testDir
      };

      // First session: create and start job
      const job = jobManager.createJob('import-issues', config, 500);
      jobManager.startJob(job.id);
      jobManager.updateProgress(job.id, 250, 'PROJ-250');

      // Simulate session restart
      const newManager = new BackgroundJobManager(testDir);
      const resumedJob = newManager.getJob(job.id);

      expect(resumedJob?.progress.current).toBe(250);
      expect(resumedJob?.progress.currentItem).toBe('PROJ-250');
    });
  });

  describe('Job Queries', () => {
    it('should get active jobs', () => {
      // Create multiple jobs
      const config1: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [{ owner: 'test', name: 'repo1', path: 'repo1' }],
        projectPath: testDir
      };
      const config2: ImportJobConfig = {
        type: 'import-issues',
        provider: 'github',
        timeRangeMonths: 3,
        projectPath: testDir
      };

      const job1 = jobManager.createJob('clone-repos', config1, 1);
      const job2 = jobManager.createJob('import-issues', config2, 100);

      jobManager.startJob(job1.id);
      jobManager.completeJob(job1.id);
      jobManager.startJob(job2.id);

      const activeJobs = jobManager.getActiveJobs();
      expect(activeJobs.length).toBe(1);
      expect(activeJobs[0].id).toBe(job2.id);
    });

    it('should filter jobs by type', () => {
      const cloneConfig: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [{ owner: 'test', name: 'repo1', path: 'repo1' }],
        projectPath: testDir
      };
      const importConfig: ImportJobConfig = {
        type: 'import-issues',
        provider: 'github',
        timeRangeMonths: 3,
        projectPath: testDir
      };

      jobManager.createJob('clone-repos', cloneConfig, 1);
      jobManager.createJob('import-issues', importConfig, 100);

      const cloneJobs = jobManager.getJobs({ type: 'clone-repos' });
      expect(cloneJobs.length).toBe(1);
      expect(cloneJobs[0].type).toBe('clone-repos');
    });

    it('should filter jobs by status', () => {
      const config: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [{ owner: 'test', name: 'repo1', path: 'repo1' }],
        projectPath: testDir
      };

      const job1 = jobManager.createJob('clone-repos', config, 1);
      const job2 = jobManager.createJob('clone-repos', config, 1);

      jobManager.startJob(job1.id);
      jobManager.completeJob(job1.id);
      jobManager.startJob(job2.id);

      const completedJobs = jobManager.getJobs({ status: 'completed' });
      expect(completedJobs.length).toBe(1);

      const runningJobs = jobManager.getJobs({ status: 'running' });
      expect(runningJobs.length).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old completed jobs (keep last 10)', () => {
      const config: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [{ owner: 'test', name: 'repo1', path: 'repo1' }],
        projectPath: testDir
      };

      // Create 15 completed jobs
      for (let i = 0; i < 15; i++) {
        const job = jobManager.createJob('clone-repos', config, 1);
        jobManager.startJob(job.id);
        jobManager.completeJob(job.id);
      }

      // Cleanup
      jobManager.cleanup();

      const allJobs = jobManager.getJobs();
      const completedJobs = allJobs.filter(j => j.status === 'completed');
      expect(completedJobs.length).toBe(10);
    });

    it('should preserve active jobs during cleanup', () => {
      const config: CloneJobConfig = {
        type: 'clone-repos',
        repositories: [{ owner: 'test', name: 'repo1', path: 'repo1' }],
        projectPath: testDir
      };

      // Create 12 completed jobs
      for (let i = 0; i < 12; i++) {
        const job = jobManager.createJob('clone-repos', config, 1);
        jobManager.startJob(job.id);
        jobManager.completeJob(job.id);
      }

      // Create 2 active jobs
      const activeJob1 = jobManager.createJob('clone-repos', config, 1);
      jobManager.startJob(activeJob1.id);

      const activeJob2 = jobManager.createJob('clone-repos', config, 1);
      jobManager.pauseJob(activeJob2.id);

      // Cleanup
      jobManager.cleanup();

      const activeJobs = jobManager.getActiveJobs();
      expect(activeJobs.length).toBe(2);
    });
  });

  describe('getJobManager singleton', () => {
    it('should return same instance for same project path', () => {
      const manager1 = getJobManager(testDir);
      const manager2 = getJobManager(testDir);

      expect(manager1).toBe(manager2);
    });

    it('should return different instances for different paths', () => {
      const testDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-job-test2-'));
      fs.mkdirSync(path.join(testDir2, '.specweave', 'state'), { recursive: true });

      try {
        const manager1 = getJobManager(testDir);
        const manager2 = getJobManager(testDir2);

        expect(manager1).not.toBe(manager2);
      } finally {
        fs.rmSync(testDir2, { recursive: true, force: true });
      }
    });
  });
});
