#!/usr/bin/env node
/**
 * Background Import Worker
 *
 * Standalone script that runs import in a detached process.
 * Survives terminal close - progress tracked via job state file.
 *
 * Usage:
 *   node import-worker.js <jobId> <projectPath>
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

// Worker-specific imports (loaded dynamically to reduce startup time)
let ImportCoordinator: any;
let getJobManager: any;
let ItemConverter: any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WorkerJobConfig {
  jobId: string;
  projectPath: string;
  coordinatorConfig: any;
  startedAt: string;
}

/**
 * Main worker entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: import-worker.js <jobId> <projectPath>');
    process.exit(1);
  }

  const jobId = args[0];
  const projectPath = args[1];

  // Write PID file for process management with EXCLUSIVE lock (P1 fix)
  // Uses O_EXCL flag to prevent race condition when multiple resume attempts happen
  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.pid');
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });

  try {
    // 'wx' = O_WRONLY | O_CREAT | O_EXCL - fails if file exists
    const fd = fs.openSync(pidFile, 'wx');
    fs.writeSync(fd, process.pid.toString());
    fs.closeSync(fd);
  } catch (err: any) {
    if (err.code === 'EEXIST') {
      // PID file already exists - another worker is running
      // Check if the existing process is still alive
      try {
        const existingPid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
        process.kill(existingPid, 0); // Signal 0 = check if alive
        // Process is alive - exit to avoid duplicate workers
        console.error(`Worker already running for job ${jobId} (PID: ${existingPid})`);
        process.exit(1);
      } catch {
        // Existing process is dead - safe to take over
        // Remove stale PID file and write new one
        fs.unlinkSync(pidFile);
        fs.writeFileSync(pidFile, process.pid.toString());
      }
    } else {
      throw err;
    }
  }

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

    // Log to worker-specific log file
    const logPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.log');
    const log = (msg: string) => {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    };

    log(`════════════════════════════════════════════════════════════`);
    log(`BACKGROUND IMPORT JOB STARTED`);
    log(`════════════════════════════════════════════════════════════`);
    log(`Job ID: ${jobId}`);
    log(`Project path: ${projectPath}`);
    log(`PID: ${process.pid}`);
    log(`Started at: ${new Date().toISOString()}`);
    log(``);

    // Dynamically import heavy dependencies
    const importCoordinatorModule = await import('../../importers/import-coordinator.js');
    ImportCoordinator = importCoordinatorModule.ImportCoordinator;

    const jobManagerModule = await import('../../core/background/job-manager.js');
    getJobManager = jobManagerModule.getJobManager;

    const itemConverterModule = await import('../../importers/item-converter.js');
    ItemConverter = itemConverterModule.ItemConverter;

    // Get job manager and mark as running
    const jobManager = getJobManager(projectPath);
    jobManager.startJob(jobId);

    log('Dependencies loaded successfully');
    log(``);

    // Setup progress tracking
    const coordinatorConfig = jobConfig.coordinatorConfig;
    let totalEstimate = 0;
    let currentCount = 0;
    let lastLoggedPage = 0;

    // Log import configuration
    log(`────────────────────────────────────────────────────────────`);
    log(`IMPORT CONFIGURATION:`);
    log(`────────────────────────────────────────────────────────────`);
    if (coordinatorConfig.importConfig) {
      log(`Time range: ${coordinatorConfig.importConfig.timeRangeMonths} months`);
      log(`Include closed: ${coordinatorConfig.importConfig.includeClosed}`);
      log(`Page size: ${coordinatorConfig.importConfig.pageSize || 'default'}`);
    }
    if (coordinatorConfig.github) {
      log(`GitHub: ${coordinatorConfig.github.owner}/${coordinatorConfig.github.repo}`);
    }
    if (coordinatorConfig.githubRepositories) {
      log(`GitHub repos: ${coordinatorConfig.githubRepositories.length} repositories`);
      for (const repo of coordinatorConfig.githubRepositories) {
        log(`  → ${repo.owner}/${repo.repo}`);
      }
    }
    if (coordinatorConfig.jira) {
      log(`JIRA: ${coordinatorConfig.jira.host}`);
      if (coordinatorConfig.jira.projectMappings?.length) {
        log(`  Projects: ${coordinatorConfig.jira.projectMappings.length} configured`);
      }
    }
    if (coordinatorConfig.ado) {
      log(`Azure DevOps: ${coordinatorConfig.ado.orgUrl}`);
      if (coordinatorConfig.ado.projectMappings?.length) {
        log(`  Projects: ${coordinatorConfig.ado.projectMappings.length} configured`);
        for (const pm of coordinatorConfig.ado.projectMappings) {
          const areaCount = pm.areaMappings?.length || 0;
          log(`    → ${pm.projectName} (${areaCount} area paths)`);
        }
      }
    }
    log(``);

    log(`────────────────────────────────────────────────────────────`);
    log(`STARTING IMPORT...`);
    log(`────────────────────────────────────────────────────────────`);

    coordinatorConfig.onProgressEnhanced = (info: any) => {
      currentCount = info.current || currentCount;
      if (info.total && info.total > totalEstimate) {
        totalEstimate = info.total;
      }

      // ATOMIC progress update - fixes race condition (P1 fix)
      // Single call updates both current count AND total in one file write
      jobManager.updateProgress(
        jobId,
        currentCount,
        info.sourceRepo || info.platform,
        undefined,  // completed
        undefined,  // failed
        totalEstimate > 0 ? totalEstimate : undefined  // newTotal (atomic)
      );

      // P3 FIX: Log every 100 items, on page changes, OR on final item
      // The final item check prevents "stuck at 96%" UX where last log was at 1,200
      // but job completes at 1,245 items
      const isLastItem = totalEstimate > 0 && currentCount >= totalEstimate;
      const shouldLog = isLastItem ||
                        (info.page && info.page !== lastLoggedPage) ||
                        (currentCount % 100 === 0) ||
                        (info.percentage && info.percentage % 10 === 0);

      if (shouldLog || info.page !== lastLoggedPage) {
        lastLoggedPage = info.page || lastLoggedPage;
        const parts: string[] = [];
        if (info.page) parts.push(`page ${info.page}`);
        parts.push(`${currentCount}/${totalEstimate || '?'} items`);
        if (info.percentage) parts.push(`${info.percentage}%`);
        if (info.rate) parts.push(`${info.rate}/s`);
        if (isLastItem) parts.push('COMPLETE');
        log(`[${info.platform}] ${info.sourceRepo || ''} - ${parts.join(' | ')}`);
      }
    };

    // Rate limit handling
    coordinatorConfig.onRateLimitPause = (platform: string, seconds: number) => {
      log(`Rate limited by ${platform}, pausing for ${seconds}s`);
      jobManager.pauseJob(jobId);

      // Set resume time
      const job = jobManager.getJob(jobId);
      if (job) {
        job.resumeAfter = new Date(Date.now() + seconds * 1000);
      }
    };

    // Execute import
    const coordinator = new ImportCoordinator(coordinatorConfig);
    const result = await coordinator.importAll();

    log(``);
    log(`────────────────────────────────────────────────────────────`);
    log(`IMPORT PHASE COMPLETE`);
    log(`────────────────────────────────────────────────────────────`);
    log(`Total items fetched: ${result.totalCount}`);

    // Log per-platform breakdown
    if (result.results && result.results.length > 0) {
      log(`Platform breakdown:`);
      for (const platformResult of result.results) {
        log(`  → ${platformResult.platform}: ${platformResult.count} items`);
      }
    }

    // Log per-repo breakdown
    if (result.allItems.length > 0) {
      const repoCounts = new Map<string, { open: number; closed: number }>();
      for (const item of result.allItems) {
        const repo = item.sourceRepo || item.adoProjectName || item.jiraProjectKey || 'unknown';
        const existing = repoCounts.get(repo) || { open: 0, closed: 0 };
        if (item.status === 'open' || item.status === 'in-progress') {
          existing.open++;
        } else {
          existing.closed++;
        }
        repoCounts.set(repo, existing);
      }
      log(`Per-source breakdown:`);
      for (const [repo, counts] of repoCounts) {
        const total = counts.open + counts.closed;
        log(`  → ${repo}: ${total} items (${counts.open} open, ${counts.closed} closed)`);
      }
    }

    // CRITICAL: Convert imported items to living docs
    // Without this, items are fetched but NOT saved to specs folder!
    if (result.totalCount > 0 && result.allItems.length > 0) {
      log(``);
      log(`────────────────────────────────────────────────────────────`);
      log(`CONVERTING TO LIVING DOCS...`);
      log(`────────────────────────────────────────────────────────────`);

      const specsDir = path.join(projectPath, '.specweave', 'docs', 'internal', 'specs');

      // Group items by source for proper folder structure
      const groups = groupItemsByExternalContainer(result.allItems, projectPath);
      let totalConverted = 0;

      for (const group of groups) {
        const { projectId, items, externalContainer } = group;

        log(`Converting ${items.length} items for project: ${projectId}`);

        const converter = new ItemConverter({
          specsDir,
          projectRoot: projectPath,
          enableFeatureAllocation: true,
          projectId,
          enableGlobalCollisionDetection: false,
          autoArchiveAfterDays: 30,
          externalContainer,
          onFeatureCreated: (featureId: string, featurePath: string) => {
            log(`Created feature folder: ${projectId}/${featureId}`);
          },
          onItemArchived: (usId: string, reason: string) => {
            log(`Archived ${usId} (${reason})`);
          }
        });

        const convertedStories = await converter.convertItems(items);
        totalConverted += convertedStories.length;

        // Update progress
        jobManager.updateProgress(jobId, totalConverted, `Converting: ${projectId}`);
      }

      log(`Converted ${totalConverted} User Stories to living docs`);
      log(`Location: .specweave/docs/internal/specs/`);
    }

    // Mark job as complete
    jobManager.completeJob(jobId);

    // Write result summary
    const resultPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'result.json');
    const finalResult = {
      totalCount: result.totalCount,
      completedAt: new Date().toISOString(),
      platforms: result.platforms || [],
      errors: result.errors || {}
    };
    fs.writeFileSync(resultPath, JSON.stringify(finalResult, null, 2));

    log(``);
    log(`════════════════════════════════════════════════════════════`);
    log(`JOB COMPLETED SUCCESSFULLY`);
    log(`════════════════════════════════════════════════════════════`);
    log(`Total items imported: ${result.totalCount}`);
    log(`Completed at: ${new Date().toISOString()}`);
    log(`Duration: ${Math.round((Date.now() - new Date(jobConfig.startedAt).getTime()) / 1000)}s`);
    if (Object.keys(result.errors || {}).length > 0) {
      log(`Errors: ${JSON.stringify(result.errors)}`);
    }
    log(``);
    log(`Next steps:`);
    log(`  → Review User Stories: .specweave/docs/internal/specs/`);
    log(`  → Create increments: /sw:increment "feature"`);
    log(`════════════════════════════════════════════════════════════`);

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
 * Group items by external container (JIRA project/board, ADO project/area path)
 * Returns groups with container context for 2-level directory structure
 *
 * CRITICAL FIX (v0.34.1): Use specweaveProject from config for JIRA Level 2
 * - Level 1 (project): JIRA projectKey (e.g., "CORE")
 * - Level 2 (board): specweaveProject from boardMapping (e.g., "fe", "be")
 *
 * This respects the structure-level-detector configuration.
 */
interface ContainerGroup {
  containerId: string;
  containerType: 'jira' | 'ado' | null;
  projectId: string;
  items: any[];
  externalContainer: any;
}

function groupItemsByExternalContainer(items: any[], projectPath: string): ContainerGroup[] {
  const groups = new Map<string, ContainerGroup>();

  // Import normalizeToProjectId dynamically would be complex, so inline the logic
  const normalize = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // CRITICAL FIX (v0.34.1): Load config to get JIRA board mappings
  // This is needed to map jiraBoardId → specweaveProject
  let jiraBoardMappings: Map<number, string> = new Map();
  try {
    const configPath = path.join(projectPath, '.specweave', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Extract board mappings from sync.profiles
      if (config.sync?.profiles) {
        for (const profile of Object.values(config.sync.profiles) as any[]) {
          if (profile.provider === 'jira' && profile.config?.boardMapping?.boards) {
            for (const board of profile.config.boardMapping.boards) {
              if (board.boardId && board.specweaveProject) {
                jiraBoardMappings.set(board.boardId, normalize(board.specweaveProject));
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Config parsing failed - log warning but continue with fallback behavior
    console.warn(`Failed to load JIRA board mappings from config: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const item of items) {
    let groupKey: string;
    let containerType: 'jira' | 'ado' | null = null;
    let containerId: string | undefined;
    let projectId: string;
    let externalContainer: any;

    // Check for JIRA container context
    if (item.jiraProjectKey) {
      containerType = 'jira';
      containerId = item.jiraProjectKey;

      // CRITICAL FIX (v0.34.1): Use specweaveProject from boardMapping (Level 2)
      // Map jiraBoardId → specweaveProject using config
      // Fallback to normalized boardName if mapping not found
      if (item.jiraBoardId && jiraBoardMappings.has(item.jiraBoardId)) {
        projectId = jiraBoardMappings.get(item.jiraBoardId)!;
      } else if (item.jiraBoardName) {
        projectId = normalize(item.jiraBoardName) || 'default';
      } else {
        projectId = 'default';
      }

      groupKey = `jira:${containerId}:${projectId}`;
      externalContainer = {
        type: 'jira-project',
        containerId,
        containerName: containerId,
        boardId: item.jiraBoardId,
        boardName: item.jiraBoardName
      };
    }
    // Check for ADO container context
    else if (item.adoProjectName) {
      containerType = 'ado';
      containerId = item.adoProjectName;
      if (item.adoAreaPath) {
        const areaSegments = item.adoAreaPath.split('\\');
        const lastSegment = areaSegments[areaSegments.length - 1];
        projectId = normalize(lastSegment) || 'default';
      } else {
        projectId = 'default';
      }
      groupKey = `ado:${containerId}:${projectId}`;
      externalContainer = {
        type: 'ado-project',
        containerId,
        containerName: containerId,
        areaPath: item.adoAreaPath
      };
    }
    // GitHub or default
    else {
      if (item.sourceRepo) {
        const parts = item.sourceRepo.split('/');
        const rawRepoName = parts.length > 1 ? parts[1] : item.sourceRepo;
        projectId = normalize(rawRepoName) || '_default';
      } else {
        projectId = '_default';
      }
      groupKey = `gh:${projectId}`;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        containerId: containerId || projectId,
        containerType,
        projectId,
        items: [],
        externalContainer
      });
    }
    groups.get(groupKey)!.items.push(item);
  }

  return Array.from(groups.values());
}

// Run worker
main().catch((error) => {
  console.error('Fatal worker error:', error);
  process.exit(1);
});
