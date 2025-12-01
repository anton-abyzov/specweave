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

    // Log to worker-specific log file
    const logPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.log');
    const log = (msg: string) => {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    };

    log(`Worker started for job ${jobId}`);
    log(`Project path: ${projectPath}`);
    log(`PID: ${process.pid}`);

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

    log('Dependencies loaded, starting import...');

    // Setup progress tracking
    const coordinatorConfig = jobConfig.coordinatorConfig;
    let totalEstimate = 0;
    let currentCount = 0;

    coordinatorConfig.onProgressEnhanced = (info: any) => {
      currentCount = info.current || currentCount;
      if (info.total && info.total > totalEstimate) {
        totalEstimate = info.total;
      }

      // Update job progress
      jobManager.updateProgress(
        jobId,
        currentCount,
        info.sourceRepo || info.platform,
        undefined,
        undefined
      );

      // Update total estimate if we now know more
      const job = jobManager.getJob(jobId);
      if (job && totalEstimate > job.progress.total) {
        job.progress.total = totalEstimate;
        // Force save with new total
        jobManager.updateProgress(jobId, currentCount, info.sourceRepo || info.platform);
      }

      log(`Progress: ${currentCount}/${totalEstimate} - ${info.platform} ${info.sourceRepo || ''}`);
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

    log(`Import complete: ${result.totalCount} items fetched`);

    // CRITICAL: Convert imported items to living docs
    // Without this, items are fetched but NOT saved to specs folder!
    if (result.totalCount > 0 && result.allItems.length > 0) {
      log('Converting items to living docs...');

      const specsDir = path.join(projectPath, '.specweave', 'docs', 'internal', 'specs');

      // Group items by source for proper folder structure
      const groups = groupItemsByExternalContainer(result.allItems);
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
    }

    // Mark job as complete
    jobManager.completeJob(jobId);

    // Write result summary
    const resultPath = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'result.json');
    fs.writeFileSync(resultPath, JSON.stringify({
      totalCount: result.totalCount,
      completedAt: new Date().toISOString(),
      platforms: result.platforms || [],
      errors: result.errors || {}
    }, null, 2));

    log('Worker finished successfully');
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
 */
interface ContainerGroup {
  containerId: string;
  containerType: 'jira' | 'ado' | null;
  projectId: string;
  items: any[];
  externalContainer: any;
}

function groupItemsByExternalContainer(items: any[]): ContainerGroup[] {
  const groups = new Map<string, ContainerGroup>();

  // Import normalizeToProjectId dynamically would be complex, so inline the logic
  const normalize = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

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
      projectId = item.jiraBoardName
        ? normalize(item.jiraBoardName) || 'default'
        : 'default';
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
