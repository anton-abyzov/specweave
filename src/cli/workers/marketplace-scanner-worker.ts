#!/usr/bin/env node
/**
 * Marketplace Scanner Worker
 *
 * Standalone script that scans GitHub for community Claude Code skills
 * and feeds them through the submission queue for security verification.
 *
 * Usage:
 *   node marketplace-scanner-worker.js <jobId> <projectPath>
 *
 * The worker reads job configuration from:
 *   .specweave/state/jobs/<jobId>/config.json
 *
 * And updates progress to:
 *   .specweave/state/background-jobs.json
 *
 * Marketplace config defaults from .specweave/config.json under marketplace.scanner:
 * {
 *   "marketplace": {
 *     "scanner": {
 *       "intervalMinutes": 60,
 *       "searchTopics": ["claude-code-skill", "specweave-plugin"],
 *       "searchFilenames": ["SKILL.md"],
 *       "maxResultsPerScan": 100,
 *       "autoScanOnDiscover": true,
 *       "autoTier2": false,
 *       "githubToken": ""
 *     }
 *   }
 * }
 */

import * as fs from 'fs';
import * as path from 'path';

/** Default marketplace scanner config */
const DEFAULT_SCANNER_CONFIG = {
  intervalMinutes: 60,
  searchTopics: ['claude-code-skill', 'specweave-plugin'],
  searchFilenames: ['SKILL.md'],
  maxResultsPerScan: 100,
  autoScanOnDiscover: true,
  autoTier2: false,
  githubToken: '',
  sources: ['github', 'skillssh', 'npm'],
};

interface WorkerJobConfig {
  jobId: string;
  projectPath: string;
  searchTopics: string[];
  searchFilenames: string[];
  maxResultsPerScan: number;
  intervalMinutes: number;
  startedAt: string;
  checkpoint?: {
    lastCursor: string;
    seenRepos: string[];
  };
}

interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: Array<{
    full_name: string;
    html_url: string;
    description: string | null;
    owner: { login: string };
    stargazers_count: number;
    updated_at: string;
  }>;
}

interface RateLimitInfo {
  remaining: number;
  reset: number; // Unix timestamp
}

/**
 * Parse rate limit headers from a fetch Response
 */
function parseRateLimit(response: Response): RateLimitInfo {
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '60', 10);
  const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10);
  return { remaining, reset };
}

/**
 * Calculate backoff delay based on rate limit info
 */
function calculateBackoff(rateLimit: RateLimitInfo, attempt: number): number {
  if (rateLimit.remaining < 5) {
    // Wait until rate limit resets + small buffer
    const resetMs = (rateLimit.reset * 1000) - Date.now();
    return Math.max(resetMs + 1000, 1000);
  }
  // Exponential backoff for errors: 1s, 2s, 4s, 8s, 16s (max)
  return Math.min(1000 * Math.pow(2, attempt), 16000);
}

/**
 * Search GitHub for repos matching topics or filenames
 */
export async function scanGitHub(
  config: WorkerJobConfig,
  githubToken: string,
  log: (msg: string) => void,
): Promise<{
  repos: Array<{
    fullName: string;
    htmlUrl: string;
    description: string | null;
    owner: string;
    stars: number;
    lastUpdated: string;
  }>;
  rateLimit: RateLimitInfo;
  nextCursor: string;
}> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'specweave-marketplace-scanner',
  };
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  // Build search query from topics and filenames
  const queries: string[] = [];
  for (const topic of config.searchTopics) {
    queries.push(`topic:${topic}`);
  }
  for (const filename of config.searchFilenames) {
    queries.push(`filename:${filename}`);
  }

  const searchQuery = queries.join('+');
  const perPage = Math.min(config.maxResultsPerScan, 100);

  // Parse page from checkpoint cursor
  let page = 1;
  if (config.checkpoint?.lastCursor) {
    const parsed = parseInt(config.checkpoint.lastCursor, 10);
    if (!isNaN(parsed)) {
      page = parsed;
    }
  }

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=updated&order=desc&per_page=${perPage}&page=${page}`;

  log(`Searching GitHub: ${searchQuery} (page ${page})`);

  let response: Response;
  let attempt = 0;
  let rateLimit: RateLimitInfo = { remaining: 60, reset: 0 };

  // Retry with exponential backoff
  while (attempt < 3) {
    try {
      response = await fetch(url, { headers });
      rateLimit = parseRateLimit(response);

      if (response.ok) {
        break;
      }

      if (response.status === 403 && rateLimit.remaining < 5) {
        // Rate limited
        const delay = calculateBackoff(rateLimit, attempt);
        log(`Rate limited. Waiting ${Math.round(delay / 1000)}s (remaining: ${rateLimit.remaining})`);
        await sleep(delay);
        attempt++;
        continue;
      }

      // Other error
      const errorText = await response.text();
      log(`GitHub API error (${response.status}): ${errorText.slice(0, 200)}`);
      attempt++;
      const delay = calculateBackoff(rateLimit, attempt);
      await sleep(delay);
      continue;
    } catch (error: any) {
      log(`Network error: ${error.message}`);
      attempt++;
      const delay = calculateBackoff(rateLimit, attempt);
      await sleep(delay);
      continue;
    }
  }

  // Parse results
  if (!response! || !response!.ok) {
    log('All retry attempts failed');
    return { repos: [], rateLimit, nextCursor: String(page) };
  }

  const data: GitHubSearchResult = await response!.json();
  log(`Found ${data.total_count} total results, ${data.items.length} in this page`);

  const repos = data.items.map(item => ({
    fullName: item.full_name,
    htmlUrl: item.html_url,
    description: item.description,
    owner: item.owner.login,
    stars: item.stargazers_count,
    lastUpdated: item.updated_at,
  }));

  return {
    repos,
    rateLimit,
    nextCursor: String(page + 1),
  };
}

/**
 * Sleep function - replaceable for testing
 */
let sleepFn = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

function sleep(ms: number): Promise<void> {
  return sleepFn(ms);
}

/**
 * Replace sleep function (for testing)
 */
export function _setSleepFn(fn: (ms: number) => Promise<void>): void {
  sleepFn = fn;
}

/**
 * Reset sleep function to default
 */
export function _resetSleepFn(): void {
  sleepFn = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Read marketplace scanner config from .specweave/config.json
 * Falls back to sensible defaults if section is missing
 */
function readMarketplaceConfig(projectPath: string): typeof DEFAULT_SCANNER_CONFIG {
  try {
    const configPath = path.join(projectPath, '.specweave', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const scannerConfig = config?.marketplace?.scanner;
      if (scannerConfig) {
        return { ...DEFAULT_SCANNER_CONFIG, ...scannerConfig };
      }
    }
  } catch {
    // Use defaults
  }
  return { ...DEFAULT_SCANNER_CONFIG };
}

/**
 * Main worker entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: marketplace-scanner-worker.js <jobId> <projectPath>');
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

  try {
    // Load job configuration
    const configPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'config.json');

    if (!fs.existsSync(configPath)) {
      throw new Error(`Job config not found: ${configPath}`);
    }

    const jobConfig: WorkerJobConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Read marketplace config from project config (with defaults)
    const marketplaceConfig = readMarketplaceConfig(projectPath);
    const githubToken = marketplaceConfig.githubToken || process.env.GITHUB_TOKEN || '';

    // Log to worker-specific log file
    const logPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.log');
    const log = (msg: string) => {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] ${msg}\n`;
      fs.appendFileSync(logPath, logLine);
      process.stdout.write(logLine);
    };

    log(`Marketplace scanner worker started for job ${jobId}`);
    log(`Project path: ${projectPath}`);
    log(`PID: ${process.pid}`);
    log(`Search topics: ${jobConfig.searchTopics.join(', ')}`);
    log(`Search filenames: ${jobConfig.searchFilenames.join(', ')}`);
    log(`Interval: ${jobConfig.intervalMinutes} minutes`);
    log(`Auto scan on discover: ${marketplaceConfig.autoScanOnDiscover}`);

    // Dynamically import job manager and submission queue
    const jobManagerModule = await import('../../core/background/job-manager.js');
    const { SubmissionQueue } = await import('../../core/fabric/submission-queue.js');

    const jobManager = jobManagerModule.getJobManager(projectPath);
    jobManager.startJob(jobId);

    const queue = new SubmissionQueue(projectPath);

    // Load checkpoint from config if resuming
    if (jobConfig.checkpoint) {
      log(`Resuming from checkpoint: page ${jobConfig.checkpoint.lastCursor}, ${jobConfig.checkpoint.seenRepos.length} seen repos`);
    }

    let seenRepos = new Set(jobConfig.checkpoint?.seenRepos || []);
    let lastCursor = jobConfig.checkpoint?.lastCursor || '1';
    let totalDiscovered = 0;
    let totalNew = 0;
    let scanCycle = 0;

    // Scan loop - runs until job is stopped
    let running = true;
    const stopHandler = () => { running = false; };
    process.on('SIGTERM', stopHandler);

    while (running) {
      scanCycle++;
      log(`\n--- Scan cycle ${scanCycle} ---`);

      try {
        // Execute GitHub search
        const configWithCheckpoint: WorkerJobConfig = {
          ...jobConfig,
          checkpoint: {
            lastCursor,
            seenRepos: Array.from(seenRepos),
          },
        };

        const result = await scanGitHub(configWithCheckpoint, githubToken, log);

        // Also discover from additional sources (skills.sh, npm, broader GitHub)
        const additionalRepos: typeof result.repos = [];
        try {
          const { SourceRegistry } = await import('../../core/fabric/discovery/source-registry.js');
          const { GitHubProvider } = await import('../../core/fabric/discovery/github-provider.js');
          const { SkillsShProvider } = await import('../../core/fabric/discovery/skillssh-provider.js');
          const { NpmProvider } = await import('../../core/fabric/discovery/npm-provider.js');

          const registry = new SourceRegistry();
          const enabledSources = marketplaceConfig.sources || ['github', 'skillssh', 'npm'];

          if (enabledSources.includes('github')) registry.register(new GitHubProvider({ token: githubToken }));
          if (enabledSources.includes('skillssh')) registry.register(new SkillsShProvider());
          if (enabledSources.includes('npm')) registry.register(new NpmProvider());

          for await (const repo of registry.discoverAll()) {
            additionalRepos.push({
              fullName: repo.fullName,
              htmlUrl: repo.htmlUrl,
              description: repo.description,
              owner: repo.owner,
              stars: repo.stars,
              lastUpdated: repo.lastUpdated,
            });
          }
          log(`Additional sources found ${additionalRepos.length} repos`);
        } catch (providerError: any) {
          log(`Provider discovery error (non-fatal): ${providerError.message}`);
        }

        // Process discovered repos (legacy + provider results)
        const allRepos = [...result.repos, ...additionalRepos];
        let cycleNew = 0;
        for (const repo of allRepos) {
          totalDiscovered++;

          if (seenRepos.has(repo.fullName)) {
            continue; // Already seen
          }

          // Check if already in queue
          const existing = queue.getSubmissions({ status: undefined });
          const alreadyQueued = existing.items.some(s => s.repoFullName === repo.fullName);

          if (!alreadyQueued) {
            // Add to submission queue
            const submission = queue.addSubmission({
              fullName: repo.fullName,
              htmlUrl: repo.htmlUrl,
              description: repo.description,
              owner: repo.owner,
              stars: repo.stars,
              lastUpdated: repo.lastUpdated,
              skillPath: 'SKILL.md',
            });

            log(`New skill discovered: ${repo.fullName} (${repo.stars} stars)`);
            totalNew++;
            cycleNew++;

            // Auto-trigger Tier 1 scan if enabled
            if (marketplaceConfig.autoScanOnDiscover) {
              try {
                const { ScanPipeline } = await import('../../core/fabric/discovery/scan-pipeline.js');
                queue.updateStatus(submission.id, 'queued');
                queue.updateStatus(submission.id, 'scanning');
                const pipeline = new ScanPipeline(queue, { token: githubToken });
                const scanResult = await pipeline.scanSubmission(submission.id);
                if (scanResult) {
                  log(`Scanned ${repo.fullName}: ${scanResult.status} (score: ${scanResult.tier1Result?.score ?? 'N/A'})`);
                }
              } catch (scanError: any) {
                log(`Failed to scan ${repo.fullName}: ${scanError.message}`);
              }
            }
          }

          seenRepos.add(repo.fullName);
        }

        // Update cursor for next page
        lastCursor = result.nextCursor;

        // Save checkpoint
        const checkpoint = {
          lastCursor,
          seenRepos: Array.from(seenRepos),
        };

        // Write checkpoint to config file
        const updatedConfig: WorkerJobConfig = {
          ...jobConfig,
          checkpoint,
        };
        fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));

        // Update job progress
        jobManager.updateProgress(
          jobId,
          totalNew,
          `Cycle ${scanCycle}: ${cycleNew} new repos`,
          cycleNew > 0 ? `cycle-${scanCycle}` : undefined
        );

        log(`Cycle ${scanCycle} complete: ${result.repos.length} repos checked, ${cycleNew} new, rate limit remaining: ${result.rateLimit.remaining}`);

        // Check rate limit before next cycle
        if (result.rateLimit.remaining < 5) {
          const waitMs = calculateBackoff(result.rateLimit, 0);
          log(`Rate limit low (${result.rateLimit.remaining}), waiting ${Math.round(waitMs / 1000)}s`);
          await sleep(waitMs);
        }

      } catch (error: any) {
        log(`Scan cycle ${scanCycle} error: ${error.message}`);
        // Continue to next cycle after delay
      }

      // Sleep between scan cycles
      if (running) {
        const sleepMs = jobConfig.intervalMinutes * 60 * 1000;
        log(`Sleeping ${jobConfig.intervalMinutes} minutes until next scan...`);

        // Sleep in small intervals to be responsive to SIGTERM
        const sleepEnd = Date.now() + sleepMs;
        while (running && Date.now() < sleepEnd) {
          await sleep(Math.min(5000, sleepEnd - Date.now()));
        }
      }
    }

    // Job was stopped
    log(`\nScanner stopped. Total: ${totalDiscovered} repos scanned, ${totalNew} new discoveries`);
    jobManager.completeJob(jobId);

    // Write result summary
    const resultPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'result.json');
    fs.writeFileSync(resultPath, JSON.stringify({
      totalScanned: totalDiscovered,
      totalNewDiscoveries: totalNew,
      scanCycles: scanCycle,
      seenRepos: Array.from(seenRepos),
      completedAt: new Date().toISOString(),
    }, null, 2));

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

// Run worker only when executed directly (not when imported by tests)
// Check if this module is the entry point by looking at process.argv
const isDirectExecution = process.argv[1] &&
  (process.argv[1].endsWith('marketplace-scanner-worker.js') ||
   process.argv[1].endsWith('marketplace-scanner-worker.ts'));

if (isDirectExecution) {
  main().catch((error) => {
    console.error('Fatal worker error:', error);
    process.exit(1);
  });
}
