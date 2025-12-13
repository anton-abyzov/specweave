#!/usr/bin/env node
/**
 * Background Clone Worker
 *
 * Standalone script that runs repository cloning in a detached process.
 * Survives terminal close - progress tracked via job state file.
 *
 * CRITICAL BEHAVIOR (v0.34.0+):
 * - NEVER stops on individual repo failures - always continues to the end!
 * - Already-cloned repos are automatically skipped (enables easy resume)
 * - Final status: 'completed' (all success) or 'completed_with_warnings' (any failure)
 * - NEVER marks as 'failed' unless the entire job crashes
 * - Failed repos are tracked in result.json with error reasons
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
// NOTE: JOB_SUCCESS_THRESHOLD no longer used for clone jobs (v0.34.0+)
// Clone jobs NEVER fail - they always complete with warnings if any repos fail

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
    // CRITICAL: NEVER stop on failure - always continue to the end!
    const repos = jobConfig.repositories;
    let completed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const failedRepos: Array<{ name: string; error: string }> = [];

    log(`Starting clone of ${repos.length} repositories (will NEVER stop on individual failures)`);

    for (const repo of repos) {
      const repoPath = path.join(projectPath, repo.path);

      // Skip if already exists (enables easy resume by re-running)
      if (fs.existsSync(path.join(repoPath, '.git'))) {
        log(`Skipping ${repo.name} (already cloned)`);
        completed++;
        succeeded++;
        skipped++;
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
        failedRepos.push({ name: repo.name, error: result.error || 'Unknown error' });
        jobManager.updateProgress(jobId, completed, repo.name, undefined, repo.name);
        // CRITICAL: Log but CONTINUE - never break the loop!
        log(`⚠️ Failed to clone ${repo.name}, but CONTINUING to next repo (${repos.length - completed} remaining)`);
      }

      // Small delay between clones to be nice to the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    log(`\n========== CLONE JOB SUMMARY ==========`);
    log(`Total: ${repos.length} | Succeeded: ${succeeded} | Failed: ${failed} | Skipped (already cloned): ${skipped}`);
    if (failedRepos.length > 0) {
      log(`\nFailed repositories:`);
      failedRepos.forEach(r => log(`  - ${r.name}: ${r.error.split('\n')[0]}`));
    }

    // Mark job as complete
    // CRITICAL FIX (v0.34.0): NEVER mark clone jobs as 'failed'!
    // Clone jobs always complete - either 'completed' (all success) or 'completed_with_warnings' (any failure)
    // This ensures users can always resume by re-running the command
    const successRate = repos.length > 0 ? (succeeded / repos.length) * 100 : 100;

    if (failed === 0) {
      // Perfect success - no error message
      log('✅ All repositories cloned successfully!');
      jobManager.completeJob(jobId);
    } else {
      // Any failures = completed_with_warnings (NEVER 'failed'!)
      // This allows easy resume: just run the clone command again
      const warningMsg = `${failed} of ${repos.length} repositories failed (${successRate.toFixed(1)}% success rate). Run clone command again to retry failed repos.`;
      log(`⚠️ ${warningMsg}`);
      jobManager.completeJobWithWarnings(jobId, warningMsg);
    }

    // Write detailed result summary including failed repos for retry
    const resultPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'result.json');
    fs.writeFileSync(resultPath, JSON.stringify({
      totalCount: repos.length,
      succeeded,
      failed,
      skipped,
      successRate: successRate.toFixed(1),
      completedAt: new Date().toISOString(),
      // Track failed repos with reasons for easy debugging/retry
      failedRepos: failedRepos.map(r => ({
        name: r.name,
        error: r.error.split('\n')[0] // First line only
      })),
      // Hint for users
      resumeHint: failed > 0 ? 'Run /sw-github:clone or /sw-ado:clone again to retry. Already-cloned repos will be skipped.' : null
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
    // ALWAYS exit with code 0 - clone jobs never "fail" (v0.34.0+)
    // Any failures are tracked as warnings, allowing easy resume
    process.exit(0);

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
