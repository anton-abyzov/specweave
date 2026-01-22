/**
 * Tests for /sw:jobs command
 *
 * Tests both read-jobs.sh (bash) and jobs.js (Node) implementations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
// CRITICAL: Import getCleanEnv to prevent NODE_OPTIONS debugger flags from breaking child processes
import { getCleanEnv } from '../test-utils/clean-env.js';

describe('/sw:jobs command', () => {
  let tempDir: string;
  let specweaveDir: string;
  let stateDir: string;
  let jobsFile: string;
  let dashboardFile: string;
  let autoSessionFile: string;

  beforeEach(() => {
    // Create temporary test directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-jobs-test-'));
    specweaveDir = path.join(tempDir, '.specweave');
    stateDir = path.join(specweaveDir, 'state');
    jobsFile = path.join(stateDir, 'background-jobs.json');
    dashboardFile = path.join(stateDir, 'dashboard.json');
    autoSessionFile = path.join(stateDir, 'auto-session.json');

    // Create directory structure
    fs.mkdirSync(stateDir, { recursive: true });

    // Initialize with empty jobs
    fs.writeFileSync(jobsFile, JSON.stringify({ jobs: [] }, null, 2));

    // Initialize dashboard with no increments
    fs.writeFileSync(dashboardFile, JSON.stringify({
      increments: {},
      summary: {
        total: 0,
        active: 0,
        completed: 0
      }
    }, null, 2));
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('jobs.js (Node implementation)', () => {
    it('should show "No background jobs found" when jobs array is empty', () => {
      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('No background jobs found');
    });

    it('should show running jobs', () => {
      const jobs = {
        jobs: [
          {
            id: 'running-123',
            type: 'import-issues',
            status: 'running',
            provider: 'github',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: { current: 2500, total: 10000 }
          }
        ]
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Running (1)');
      expect(result).toContain('[running-] import-issues');
      expect(result).toContain('Progress: 2500/10000 (25%)');
    });

    it('should show paused jobs', () => {
      const jobs = {
        jobs: [
          {
            id: 'paused-456',
            type: 'clone-repos',
            status: 'paused',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: { current: 2, total: 5 }
          }
        ]
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Paused (1)');
      expect(result).toContain('[paused-4] clone-repos');
    });

    it('should show failed jobs with error message', () => {
      const jobs = {
        jobs: [
          {
            id: 'failed-789',
            type: 'import-issues',
            status: 'failed',
            provider: 'jira',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: { current: 100, total: 1000 },
            error: 'Authentication failed'
          }
        ]
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Failed (1)');
      expect(result).toContain('[failed-7] import-issues');
      expect(result).toContain('Error: Authentication failed');
    });

    it('should only show completed jobs with --all flag', () => {
      const jobs = {
        jobs: [
          {
            id: 'completed-001',
            type: 'brownfield-analysis',
            status: 'completed',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            progress: { current: 1234, total: 1234 }
          }
        ]
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');

      // Without --all
      const resultWithout = execSync(`node ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });
      expect(resultWithout).toContain('No active jobs');
      expect(resultWithout).not.toContain('Completed (1)');

      // With --all
      const resultWith = execSync(`node ${scriptPath} --all`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });
      expect(resultWith).toContain('Completed (1)');
      expect(resultWith).toContain('[complete] brownfield-analysis - 1234 items');
    });

    it('should show specific job details with --id flag', () => {
      const jobs = {
        jobs: [
          {
            id: 'specific-123',
            type: 'import-issues',
            status: 'running',
            provider: 'github',
            startedAt: '2025-12-31T10:00:00.000Z',
            updatedAt: '2025-12-31T10:05:00.000Z',
            progress: { current: 2500, total: 10000 }
          }
        ]
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath} --id specific-123`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Job Details: specific-123');
      expect(result).toContain('Type: import-issues');
      expect(result).toContain('Status: running');
      expect(result).toContain('Progress: 2500/10000 (25%)');
    });

    it('should support partial ID matching with --id flag', () => {
      const jobs = {
        jobs: [
          {
            id: 'partial-match-789',
            type: 'clone-repos',
            status: 'running',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: { current: 3, total: 5 }
          }
        ]
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath} --id partial`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Job Details: partial-match-789');
    });

    it('should show error for non-existent job ID', () => {
      const jobs = { jobs: [] };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');

      try {
        execSync(`node ${scriptPath} --id nonexistent`, {
          cwd: tempDir,
          encoding: 'utf-8',
          env: getCleanEnv()
        });
        expect.fail('Should have exited with non-zero code');
      } catch (error: any) {
        // execSync throws when command exits with non-zero code
        // Output may be in stdout, stderr, or message
        const output = (error.stdout?.toString() || '') + (error.stderr?.toString() || '') + (error.message || '');
        expect(output).toContain('Job not found: nonexistent');
      }
    });

    it('should calculate progress percentage correctly', () => {
      const testCases = [
        { current: 0, total: 100, expected: 0 },
        { current: 25, total: 100, expected: 25 },
        { current: 50, total: 100, expected: 50 },
        { current: 99, total: 100, expected: 99 },
        { current: 100, total: 100, expected: 100 },
        { current: 0, total: 0, expected: 0 }, // Edge case: divide by zero
      ];

      testCases.forEach(({ current, total, expected }) => {
        const jobs = {
          jobs: [
            {
              id: `test-${current}-${total}`,
              type: 'import-issues',
              status: 'running',
              startedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              progress: { current, total }
            }
          ]
        };
        fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

        const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
        const result = execSync(`node ${scriptPath}`, {
          cwd: tempDir,
          encoding: 'utf-8',
          env: getCleanEnv()
        });

        expect(result).toContain(`${current}/${total} (${expected}%)`);
      });
    });

    it('should show help message with --help flag', () => {
      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath} --help`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('SpecWeave Instant Jobs');
      expect(result).toContain('USAGE');
      expect(result).toContain('OPTIONS');
      expect(result).toContain('--all');
      expect(result).toContain('--id <jobId>');
    });
  });

  describe('read-jobs.sh (Bash implementation)', () => {
    it('should show current work status with increments', () => {
      const dashboard = {
        increments: {
          '0001-test-feature': {
            status: 'active',
            tasks: { completed: 5, total: 10 }
          }
        },
        summary: {
          total: 1,
          active: 1,
          completed: 0
        }
      };
      fs.writeFileSync(dashboardFile, JSON.stringify(dashboard, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/read-jobs.sh');
      const result = execSync(`bash ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Current Work Status');
      expect(result).toContain('In Progress:');
      expect(result).toContain('0001-test-feature');
      expect(result).toContain('Tasks: 5/10 (50%)');
    });

    it('should show auto session status when running', () => {
      const autoSession = {
        sessionId: 'auto-2025-12-31-test123',
        status: 'running',
        iteration: 10,
        maxIterations: 50,
        currentIncrement: '0001-test-feature'
      };
      fs.writeFileSync(autoSessionFile, JSON.stringify(autoSession, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/read-jobs.sh');
      const result = execSync(`bash ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Auto Mode: RUNNING');
      expect(result).toContain('Session: auto-2025-12-31-test123');
      expect(result).toContain('Iteration: 10 / 50');
      expect(result).toContain('Current: 0001-test-feature');
    });

    it('should show background jobs section', () => {
      const jobs = {
        jobs: [
          {
            id: 'test-job-123',
            type: 'import-issues',
            status: 'running',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: { current: 100, total: 1000 }
          }
        ]
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/read-jobs.sh');
      const result = execSync(`bash ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Background Jobs');
      expect(result).toContain('Running (1)');
      expect(result).toContain('[test-job] import-issues');
      expect(result).toContain('Progress: 100/1000 (10%)');
    });

    it('should show helpful commands at the end', () => {
      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/read-jobs.sh');
      const result = execSync(`bash ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Commands:');
      expect(result).toContain('/sw:do');
      expect(result).toContain('/sw:progress');
      expect(result).toContain('/sw:done <id>');
      expect(result).toContain('/sw:jobs --id <id>');
      expect(result).toContain('/sw:jobs --all');
    });

    it('should handle missing dashboard gracefully', () => {
      fs.unlinkSync(dashboardFile);

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/read-jobs.sh');
      const result = execSync(`bash ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('No increment data available');
      expect(result).toContain('Run /sw:status to rebuild cache');
    });
  });

  describe('Edge cases', () => {
    it('should handle jobs with missing progress fields', () => {
      const jobs = {
        jobs: [
          {
            id: 'no-progress',
            type: 'import-issues',
            status: 'running',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: {}
          }
        ]
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Running (1)');
      expect(result).toContain('0/0 (0%)');
    });

    it('should handle corrupted jobs file', () => {
      fs.writeFileSync(jobsFile, 'invalid json{{{');

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');

      try {
        execSync(`node ${scriptPath}`, {
          cwd: tempDir,
          encoding: 'utf-8',
          env: getCleanEnv()
        });
        expect.fail('Should have exited with non-zero code');
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stdout?.toString() || error.stderr?.toString()).toContain('Error reading jobs state');
      }
    });

    it('should handle multiple jobs of same status', () => {
      const jobs = {
        jobs: [
          {
            id: 'running-1',
            type: 'import-issues',
            status: 'running',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: { current: 100, total: 1000 }
          },
          {
            id: 'running-2',
            type: 'clone-repos',
            status: 'running',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: { current: 2, total: 5 }
          },
          {
            id: 'running-3',
            type: 'brownfield-analysis',
            status: 'running',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: { current: 500, total: 2000 }
          }
        ]
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath}`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Running (3)');
      expect(result).toContain('[running-] import-issues');
      expect(result).toContain('[running-] clone-repos');
      expect(result).toContain('[running-] brownfield-analysis');
    });

    it('should limit completed jobs display to 10 with --all', () => {
      const jobs = {
        jobs: Array.from({ length: 15 }, (_, i) => ({
          id: `completed-${i}`,
          type: 'import-issues',
          status: 'completed',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          progress: { current: 1000, total: 1000 }
        }))
      };
      fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));

      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/jobs.js');
      const result = execSync(`node ${scriptPath} --all`, {
        cwd: tempDir,
        encoding: 'utf-8',
        env: getCleanEnv()
      });

      expect(result).toContain('Completed (15)');
      expect(result).toContain('... and 5 more');
    });
  });
});
