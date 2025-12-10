#!/usr/bin/env node
/**
 * Background Clone Worker
 *
 * Standalone script that runs repository cloning in a detached process.
 * Survives terminal close - progress tracked via job state file.
 *
 * Usage:
 *   node clone-worker.js <jobId> <projectPath>
 *
 * The worker reads job configuration from:
 *   .specweave/state/jobs/<jobId>/config.json
 *
 * And updates progress to:
 *   .specweave/state/background-jobs.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { JOB_SUCCESS_THRESHOLD } from '../../core/background/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CloneRepoConfig {
  owner: string;     // e.g., "org/project"
  name: string;      // e.g., "repo-name"
  path: string;      // e.g., "repos/repo-name"
  cloneUrl: string;  // Full URL with auth
}

interface WorkerJobConfig {
  jobId: string;
  projectPath: string;
  repositories: CloneRepoConfig[];
  startedAt: string;
}

/**
 * Clone a single repository using async spawn
 */
async function cloneRepository(
  cloneUrl: string,
  targetDir: string,
  repoName: string,
  log: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    log(`Starting clone: ${repoName}`);

    // Ensure parent directory exists
    const parentDir = path.dirname(targetDir);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Spawn git clone process
    const gitProcess = spawn('git', ['clone', cloneUrl, repoName], {
      cwd: parentDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';

    gitProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gitProcess.on('close', (code) => {
      if (code === 0) {
        log(`Successfully cloned: ${repoName}`);
        resolve({ success: true });
      } else {
        // Sanitize error message (remove PAT from URL)
        const sanitizedError = stderr.replace(/https:\/\/[^@]+@/g, 'https://***@');
        log(`Failed to clone ${repoName}: ${sanitizedError}`);
        resolve({ success: false, error: sanitizedError });
      }
    });

    gitProcess.on('error', (error) => {
      log(`Error spawning git for ${repoName}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
  });
}

/**
 * Main worker entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: clone-worker.js <jobId> <projectPath>');
    process.exit(1);
  }

  const jobId = args[0];
  const projectPath = args[1];

  // Write PID file for process management
  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.pid');
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  fs.writeFileSync(pidFile, process.pid.toString());

  // Setup cleanup on exit
  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  };

  process.on('exit', cleanup);
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  // Dynamically import job manager
  let getJobManager: any;

  try {
    // Load job configuration
    const configPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'config.json');

    if (!fs.existsSync(configPath)) {
      throw new Error(`Job config not found: ${configPath}`);
    }

    const jobConfig: WorkerJobConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Log to worker-specific log file
    const logPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.log');
    const log = (msg: string) => {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] ${msg}\n`;
      fs.appendFileSync(logPath, logLine);
      // Also output to stdout for debugging
      process.stdout.write(logLine);
    };

    log(`Clone worker started for job ${jobId}`);
    log(`Project path: ${projectPath}`);
    log(`PID: ${process.pid}`);
    log(`Repositories to clone: ${jobConfig.repositories.length}`);

    // Dynamically import job manager
    const jobManagerModule = await import('../../core/background/job-manager.js');
    getJobManager = jobManagerModule.getJobManager;

    // Get job manager and mark as running
    const jobManager = getJobManager(projectPath);
    jobManager.startJob(jobId);

    log('Job manager loaded, starting clone operations...');

    // Clone repositories sequentially to avoid overwhelming the system
    const repos = jobConfig.repositories;
    let completed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const repo of repos) {
      const repoPath = path.join(projectPath, repo.path);

      // Skip if already exists
      if (fs.existsSync(path.join(repoPath, '.git'))) {
        log(`Skipping ${repo.name} (already exists)`);
        completed++;
        succeeded++;
        jobManager.updateProgress(jobId, completed, repo.name, repo.name);
        continue;
      }

      // Clone the repository
      const result = await cloneRepository(
        repo.cloneUrl,
        repoPath,
        repo.name,
        log
      );

      completed++;

      if (result.success) {
        succeeded++;
        jobManager.updateProgress(jobId, completed, repo.name, repo.name);
      } else {
        failed++;
        jobManager.updateProgress(jobId, completed, repo.name, undefined, repo.name);
      }

      // Small delay between clones to be nice to the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Mark job as complete - use success threshold to determine status
    // CRITICAL FIX (v0.33.5): 95%+ success = completed_with_warnings (not failed!)
    // This prevents cascading failures that block living docs and other dependent jobs
    const successRate = repos.length > 0 ? (succeeded / repos.length) * 100 : 100;

    if (failed === 0) {
      // Perfect success - no error message
      jobManager.completeJob(jobId);
    } else if (successRate >= JOB_SUCCESS_THRESHOLD) {
      // Partial success - completed with warnings, not failed
      // Use completeJobWithWarnings to set status to 'completed_with_warnings'
      jobManager.completeJobWithWarnings(
        jobId,
        `${failed} of ${repos.length} repositories failed (${successRate.toFixed(1)}% success rate)`
      );
    } else {
      // Too many failures - mark as failed
      jobManager.completeJob(
        jobId,
        `${failed} of ${repos.length} repositories failed (${successRate.toFixed(1)}% success rate - below ${JOB_SUCCESS_THRESHOLD}% threshold)`
      );
    }

    // Write result summary
    const resultPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'result.json');
    fs.writeFileSync(resultPath, JSON.stringify({
      totalCount: repos.length,
      succeeded,
      failed,
      completedAt: new Date().toISOString()
    }, null, 2));

    // Persist umbrella config to config.json (v0.31.0+)
    log('Persisting umbrella configuration...');
    try {
      const configPath = path.join(projectPath, '.specweave', 'config.json');
      let config: Record<string, any> = {};

      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }

      // Build child repos list from successful clones
      const newChildRepos = repos.map(repo => ({
        id: repo.name,
        path: repo.path,
        name: repo.name,
        team: extractTeamFromPath(repo.path),
        areaPath: (repo as any).areaPath,
        clonedAt: new Date().toISOString(),
        status: 'cloned' as const,
      }));

      // CRITICAL FIX (v0.31.x): Merge and deduplicate childRepos by id
      // Bug: Previous code overwrote entire umbrella.childRepos, losing existing repos
      // and causing duplicates when clone job runs multiple times
      const existingChildRepos: typeof newChildRepos = config.umbrella?.childRepos || [];
      const mergedRepos = [...existingChildRepos];

      for (const newRepo of newChildRepos) {
        const existingIndex = mergedRepos.findIndex(r => r.id === newRepo.id);
        if (existingIndex >= 0) {
          // Update existing repo with new info (e.g., clonedAt timestamp)
          mergedRepos[existingIndex] = newRepo;
        } else {
          // Add new repo
          mergedRepos.push(newRepo);
        }
      }

      config.umbrella = {
        enabled: true,
        childRepos: mergedRepos,
        detectedFrom: 'clone-job',
        detectedAt: new Date().toISOString(),
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      log(`Umbrella config saved: ${mergedRepos.length} repos (${newChildRepos.length} from this job)`);
    } catch (umbrellaError: any) {
      log(`Warning: Failed to persist umbrella config: ${umbrellaError.message}`);
      // Non-fatal: continue with job completion
    }

    log(`Clone job completed: ${succeeded}/${repos.length} succeeded, ${failed} failed (${successRate.toFixed(1)}% success rate)`);
    // Exit code 0 if success rate >= threshold, 1 otherwise
    // This allows dependent jobs to proceed when most repos cloned successfully
    process.exit(successRate >= JOB_SUCCESS_THRESHOLD ? 0 : 1);

  } catch (error: any) {
    // Log error
    const logPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR: ${error.message}\n`);
    fs.appendFileSync(logPath, `${error.stack}\n`);

    // Mark job as failed
    try {
      const jobManagerModule = await import('../../core/background/job-manager.js');
      const jobManager = jobManagerModule.getJobManager(projectPath);
      jobManager.completeJob(jobId, error.message);
    } catch {
      // Ignore if can't update job
    }

    console.error(`Worker error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Extract team name from repo path
 * e.g., "acme/inventory-fe" -> "inventory"
 */
function extractTeamFromPath(repoPath: string): string | undefined {
  const parts = repoPath.split('/');

  if (parts.length >= 2) {
    // Pattern: org/team-suffix -> team
    const repoName = parts[parts.length - 1];
    // Remove common suffixes
    const team = repoName
      .replace(/-fe$/, '')
      .replace(/-be$/, '')
      .replace(/-api$/, '')
      .replace(/-web$/, '')
      .replace(/-mobile$/, '')
      .replace(/-backend$/, '')
      .replace(/-frontend$/, '')
      .replace(/-service$/, '')
      .replace(/-srv$/, '');

    return team;
  }

  return undefined;
}

// Run worker
main().catch((error) => {
  console.error('Fatal worker error:', error);
  process.exit(1);
});
