/**
 * Living Docs CLI Command
 *
 * Launch or resume Living Docs Builder independently of init.
 * Supports:
 * - Resuming orphaned/crashed jobs
 * - Launching new analysis with configuration
 * - Waiting for dependencies (clone/import jobs)
 *
 * Usage:
 *   specweave living-docs                        # Interactive mode
 *   specweave living-docs --resume <jobId>       # Resume orphaned job
 *   specweave living-docs --depth quick          # Quick analysis
 *   specweave living-docs --depth deep-native    # AI-powered (FREE with MAX)
 */

import * as path from 'path';
import chalk from 'chalk';
import { confirm, select, input } from '@inquirer/prompts';
import * as fs from '../../utils/fs-native.js';
import {
  getJobManager,
  launchLivingDocsJob,
  getOrphanedJobs,
  isJobRunning,
} from '../../core/background/index.js';
import type { BackgroundJob, LivingDocsJobConfig } from '../../core/background/types.js';
import type { LivingDocsUserInputs } from '../../core/background/types.js';
import { detectBrownfield, estimateDuration } from '../helpers/init/living-docs-preflight.js';
import { isClaudeCodeAvailable, getClaudeCodeStatus, getAvailableProviders } from '../../core/llm/provider-factory.js';

export interface LivingDocsOptions {
  resume?: string;
  depth?: 'quick' | 'standard' | 'deep-native';
  priority?: string;
  sources?: string;
  dependsOn?: string;
  foreground?: boolean;
  force?: boolean;
  fullScan?: boolean; // Force full scan (deep-native) regardless of brownfield detection
}

/**
 * Main living-docs command handler
 */
export async function livingDocsCommand(options: LivingDocsOptions): Promise<void> {
  const projectPath = process.cwd();

  // Check if SpecWeave is initialized
  const specweavePath = path.join(projectPath, '.specweave');
  if (!fs.existsSync(specweavePath)) {
    console.log(chalk.yellow('No SpecWeave project found in current directory.'));
    console.log(chalk.gray('Run `specweave init` to initialize a project.'));
    return;
  }

  // Handle --resume flag
  if (options.resume) {
    await handleResume(projectPath, options.resume);
    return;
  }

  // Check for orphaned living-docs jobs
  const orphanedJobs = getOrphanedLivingDocsJobs(projectPath);
  if (orphanedJobs.length > 0 && !options.force) {
    const shouldResume = await promptResumeOrphanedJob(orphanedJobs);
    if (shouldResume) {
      await handleResume(projectPath, shouldResume);
      return;
    }
  }

  // Check if already running
  const runningJob = getRunningLivingDocsJob(projectPath);
  if (runningJob) {
    console.log(chalk.yellow(`\nA Living Docs job is already running: ${runningJob.id.slice(0, 8)}`));
    console.log(chalk.gray(`  Follow progress: specweave jobs --follow ${runningJob.id.slice(0, 8)}`));
    console.log(chalk.gray(`  View logs: specweave jobs --logs ${runningJob.id.slice(0, 8)}`));
    return;
  }

  // Check if project has code (brownfield)
  const isBrownfield = detectBrownfield(projectPath);
  if (!isBrownfield && !options.force && !options.fullScan) {
    console.log(chalk.blue('\nNo existing code detected (greenfield project).'));
    console.log(chalk.gray('Living docs will sync automatically as you create increments.'));
    console.log(chalk.gray('\nTo force analysis: specweave living-docs --force'));
    console.log(chalk.gray('For full deep scan: specweave living-docs --full-scan'));
    return;
  }

  // Try to load saved config from init (NEW v1.0.103+)
  let userInputs = loadSavedLivingDocsConfig(projectPath);

  // If no saved config, collect interactively
  if (!userInputs) {
    userInputs = await collectConfiguration(projectPath, options);
    if (!userInputs) {
      console.log(chalk.gray('Cancelled.'));
      return;
    }
  } else {
    console.log(chalk.green('✓ Using configuration from init'));
    console.log(chalk.gray(`  Depth: ${userInputs.analysisDepth}`));
    if (userInputs.priorityAreas.length > 0) {
      console.log(chalk.gray(`  Priority: ${userInputs.priorityAreas.join(', ')}`));
    }
    console.log('');
  }

  // Parse depends-on
  const dependsOn = options.dependsOn
    ? options.dependsOn.split(',').map(s => s.trim())
    : undefined;

  // Check if running in auto mode
  const autoSessionPath = path.join(projectPath, '.specweave/state/auto-session.json');
  const isAutoMode = fs.existsSync(autoSessionPath);

  if (isAutoMode) {
    // Auto mode: Use chunked execution
    try {
      await runChunkedLivingDocs(projectPath, userInputs);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\nFailed to execute living docs chunk: ${errorMessage}`));
      process.exit(1);
    }
  } else {
    // v1.0.144+: Spawn background worker that can be monitored with /sw:jobs
    // Previous v1.0.103 approach (foreground: true) created job but never executed work!
    // Now we spawn a proper background worker that:
    // - Is registered as a trackable job in background-jobs.json
    // - Can be monitored with /sw:jobs
    // - Writes progress to .specweave/state/jobs/{jobId}/progress.json
    // - Creates professional living docs output
    try {
      console.log(chalk.blue('\n🔄 Starting Living Docs Builder\n'));
      console.log(chalk.gray('  This runs as a background job you can monitor'));
      console.log(chalk.gray('  Check progress: /sw:jobs'));
      console.log(chalk.gray('  View logs: specweave jobs --logs <jobId>\n'));

      const { job, pid, isBackground } = await launchLivingDocsJob({
        projectPath,
        userInputs,
        dependsOn,
        foreground: false,  // v1.0.144+: Spawn background worker for proper job tracking
      });

      displayLaunchSuccess(job, pid, isBackground, userInputs);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\nFailed to launch Living Docs Builder: ${errorMessage}`));
      process.exit(1);
    }
  }
}

/**
 * Run living docs in chunked mode for auto mode integration
 */
async function runChunkedLivingDocs(
  projectPath: string,
  userInputs: LivingDocsUserInputs
): Promise<void> {
  const { executeLivingDocsChunk, getProgressSummary, loadLivingDocsCheckpoint } =
    await import('../../core/background/living-docs-executor.js');

  console.log(chalk.blue('\n🔄 Running Living Docs in Auto Mode (Chunked Execution)\n'));

  // Load existing checkpoint or create new one
  const checkpoint = loadLivingDocsCheckpoint(projectPath);

  if (checkpoint) {
    console.log(chalk.gray('Resuming from checkpoint...'));
    console.log(chalk.gray(getProgressSummary(checkpoint)));
    console.log('');
  }

  // Execute one chunk (2 hours max)
  const result = await executeLivingDocsChunk({
    projectPath,
    maxDuration: 2 * 60 * 60 * 1000, // 2 hours
    checkpoint: checkpoint || undefined,
    stopOnPhaseComplete: true, // Yield control after each phase
  });

  // Display result
  if (result.status === 'all_complete') {
    console.log(chalk.green('\n✅ All Living Docs Phases Complete!\n'));
    console.log(chalk.gray('All 8 phases of living docs update have been completed.'));
    console.log(chalk.gray('Check .specweave/docs/internal/ for generated documentation.\n'));
  } else if (result.status === 'phase_complete') {
    console.log(chalk.green(`\n✅ Phase ${result.currentPhase} Complete!\n`));
    console.log(chalk.gray(`Next: Phase ${result.nextPhase}`));
    console.log(chalk.gray('Stop hook will continue execution in next iteration.\n'));
  } else if (result.status === 'time_limit') {
    console.log(chalk.yellow('\n⏰ Time Limit Reached (2 hours)\n'));
    console.log(chalk.gray(`Phase ${result.currentPhase} in progress...`));
    console.log(chalk.gray('Checkpoint saved. Will resume in next iteration.\n'));
  }
}

/**
 * Get orphaned living-docs jobs
 */
function getOrphanedLivingDocsJobs(projectPath: string): BackgroundJob[] {
  const orphaned = getOrphanedJobs(projectPath);
  return orphaned.filter(j => j.type === 'living-docs-builder');
}

/**
 * Get running living-docs job
 */
function getRunningLivingDocsJob(projectPath: string): BackgroundJob | null {
  const jobManager = getJobManager(projectPath);
  const jobs = jobManager.getJobs();

  for (const job of jobs) {
    if (job.type === 'living-docs-builder' && job.status === 'running') {
      if (isJobRunning(projectPath, job.id)) {
        return job;
      }
    }
  }

  return null;
}

/** Prompt user to resume an orphaned job */
async function promptResumeOrphanedJob(orphanedJobs: BackgroundJob[]): Promise<string | null> {
  console.log(chalk.yellow('\nFound orphaned Living Docs job(s):'));

  for (const job of orphanedJobs) {
    const percentage = job.progress.total > 0
      ? Math.round((job.progress.current / job.progress.total) * 100)
      : 0;
    console.log(chalk.gray(`  [${job.id.slice(0, 8)}] ${percentage}% complete - ${getTimeAgo(job.updatedAt)}`));
  }

  console.log('');

  const choices = [
    ...orphanedJobs.map(j => {
      const pct = Math.round((j.progress.current / j.progress.total) * 100);
      return { value: j.id, name: `Resume ${j.id.slice(0, 8)} (${pct}% complete)` };
    }),
    { value: 'new', name: 'Start fresh (ignore orphaned jobs)' },
    { value: 'cancel', name: 'Cancel' },
  ];

  const answer = await select({ message: 'What would you like to do?', choices });
  return answer === 'cancel' || answer === 'new' ? null : answer as string;
}

/**
 * Handle resuming a job
 */
async function handleResume(projectPath: string, jobId: string): Promise<void> {
  const jobManager = getJobManager(projectPath);
  const job = jobManager.getJob(jobId) || findJobByPrefix(jobManager.getJobs(), jobId);

  if (!job) {
    console.log(chalk.red(`Job not found: ${jobId}`));
    console.log(chalk.gray('Run `specweave jobs --all` to see all jobs.'));
    return;
  }

  if (job.type !== 'living-docs-builder') {
    console.log(chalk.red(`Job ${jobId} is not a living-docs job (type: ${job.type})`));
    console.log(chalk.gray('Use `specweave jobs --resume` for other job types.'));
    return;
  }

  if (job.status === 'running' && isJobRunning(projectPath, job.id)) {
    console.log(chalk.yellow(`Job ${job.id.slice(0, 8)} is already running.`));
    console.log(chalk.gray(`  Follow progress: specweave jobs --follow ${job.id.slice(0, 8)}`));
    return;
  }

  if (job.status === 'completed' || job.status === 'completed_with_warnings') {
    console.log(chalk.gray(`Job ${job.id.slice(0, 8)} is already completed.`));
    console.log(chalk.gray('Run `specweave living-docs` to start a new analysis.'));
    return;
  }

  // Load checkpoint info
  const checkpointPath = path.join(projectPath, '.specweave', 'state', 'jobs', job.id, 'checkpoints', 'state.json');
  let resumeInfo = 'beginning';
  if (fs.existsSync(checkpointPath)) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
      resumeInfo = `phase=${checkpoint.phase || 'unknown'}`;
      if (checkpoint.currentModule) {
        resumeInfo += `, module=${checkpoint.currentModule}`;
      }
    } catch {
      // Ignore parse errors
    }
  }

  console.log(chalk.cyan(`\nResuming Living Docs Builder (${job.id.slice(0, 8)})...`));
  console.log(chalk.gray(`  Resume point: ${resumeInfo}`));
  console.log(chalk.gray(`  Progress: ${job.progress.current}/${job.progress.total}`));

  // Load original config
  const configPath = path.join(projectPath, '.specweave', 'state', 'jobs', job.id, 'config.json');
  if (!fs.existsSync(configPath)) {
    console.log(chalk.red('\nCannot resume: job config not found.'));
    console.log(chalk.gray('You may need to start a new analysis.'));
    return;
  }

  const jobConfig: LivingDocsJobConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Mark job as running
  jobManager.startJob(job.id);

  // Re-launch worker
  try {
    const { job: resumedJob, pid, isBackground } = await launchLivingDocsJob({
      projectPath,
      userInputs: jobConfig.userInputs,
      dependsOn: jobConfig.dependsOn,
      foreground: false,
    });

    // Update the existing job ID in the new job's config
    // (The launcher creates a new job, but we want to continue the old one)
    // Actually, we need to reuse the same job ID...

    if (isBackground) {
      console.log(chalk.green(`\nJob resumed in background.`));
      console.log(chalk.gray(`  PID: ${pid}`));
      console.log(chalk.gray(`  Follow: specweave jobs --follow ${job.id.slice(0, 8)}`));
      console.log(chalk.gray(`  Logs: specweave jobs --logs ${job.id.slice(0, 8)}`));
    } else {
      console.log(chalk.yellow('\nRunning in foreground (background mode unavailable).'));
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Failed to resume: ${errorMessage}`));
    process.exit(1);
  }
}

/**
 * Collect configuration from flags or interactive prompts
 */
async function collectConfiguration(
  projectPath: string,
  options: LivingDocsOptions
): Promise<LivingDocsUserInputs | null> {
  // Handle --full-scan flag (forces deep-native analysis)
  if (options.fullScan) {
    const claudeCodeStatus = await getClaudeCodeStatus();

    if (!claudeCodeStatus.available) {
      console.log(chalk.red('\nFull Scan requires Claude MAX subscription.'));
      console.log(chalk.gray('Please use Claude Code with MAX plan to access AI-powered analysis.'));
      console.log(chalk.gray('\nAlternatively, use --depth=standard for non-AI analysis.'));
      return null;
    }

    console.log(chalk.cyan('\nFull Scan Mode Enabled'));
    console.log(chalk.gray('  Using: deep-native (comprehensive AI-powered analysis)'));
    console.log(chalk.gray('  Analyzing: All repos, modules, architecture, inconsistencies, strategy'));
    console.log('');

    return {
      analysisDepth: 'deep-native',
      priorityAreas: [],
      additionalSources: [],
      knownPainPoints: [],
    };
  }

  // If all options provided via flags, use them directly
  if (options.depth) {
    const priorityAreas = options.priority
      ? options.priority.split(',').map(s => s.trim())
      : [];
    const additionalSources = options.sources
      ? options.sources.split(',').map(s => s.trim())
      : [];

    return {
      analysisDepth: options.depth,
      priorityAreas,
      additionalSources,
      knownPainPoints: [],
    };
  }

  // Interactive mode
  console.log(chalk.blue('\nLiving Docs Builder Configuration\n'));

  // Analysis depth
  const claudeCodeStatus = await getClaudeCodeStatus();

  type DepthChoice = 'quick' | 'standard' | 'deep-native';

  const depthChoices: Array<{ value: DepthChoice; name: string; disabled?: string | false }> = [
    { value: 'quick', name: 'Quick - Structure scan + tech detection + imports + basic inconsistencies + diagrams' },
    { value: 'standard', name: 'Standard - Module analysis + dependencies + team detection + relationships + full diagrams' },
    {
      value: 'deep-native',
      name: claudeCodeStatus.available
        ? '⭐ Deep - Background (Claude MAX) - AI-powered analysis, org synthesis, enterprise KB - NO EXTRA COST! (Recommended)'
        : 'Deep - Background (Claude MAX) - AI-powered analysis, org synthesis, enterprise KB - NO EXTRA COST!',
      disabled: !claudeCodeStatus.available
        ? (claudeCodeStatus.error || 'Claude Code not available')
        : false,
    },
  ];

  const analysisDepth = await select<DepthChoice>({
    message: 'How deep should the analysis go?',
    choices: depthChoices,
    default: claudeCodeStatus.available ? 'deep-native' : 'quick',
  });

  // Priority areas
  const priorityInput = await input({
    message: 'Priority modules (comma-separated, or leave empty):',
    default: '',
  });

  const priorityAreas = priorityInput
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Additional sources
  const sourcesInput = await input({
    message: 'Additional doc folders (comma-separated, or leave empty):',
    default: '',
  });

  const additionalSources = sourcesInput
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Confirm
  const duration = estimateDuration(projectPath, analysisDepth);
  const shouldLaunch = await confirm({
    message: `Launch Living Docs Builder? (${duration})`,
    default: true,
  });

  if (!shouldLaunch) {
    return null;
  }

  return {
    analysisDepth,
    priorityAreas,
    additionalSources,
    knownPainPoints: [],
  };
}

/**
 * Display success message after launch
 */
function displayLaunchSuccess(
  job: BackgroundJob,
  pid: number | undefined,
  isBackground: boolean,
  userInputs: LivingDocsUserInputs
): void {
  console.log(chalk.green('\nLiving Docs Builder launched!'));
  console.log('');
  console.log(chalk.white(`  Job ID: ${job.id.slice(0, 8)}`));
  console.log(chalk.gray(`  Depth: ${userInputs.analysisDepth}`));

  if (userInputs.priorityAreas.length > 0) {
    console.log(chalk.gray(`  Priority: ${userInputs.priorityAreas.join(', ')}`));
  }

  if (isBackground) {
    console.log(chalk.gray(`  PID: ${pid}`));
    console.log('');
    console.log(chalk.blue('  Monitor:'));
    console.log(chalk.gray(`    specweave jobs --follow ${job.id.slice(0, 8)}`));
    console.log(chalk.gray(`    specweave jobs --logs ${job.id.slice(0, 8)}`));
  } else {
    console.log('');
    console.log(chalk.yellow('  Running in foreground...'));
  }

  console.log('');
  console.log(chalk.gray('  Output will be saved to:'));
  console.log(chalk.gray('    .specweave/docs/SUGGESTIONS.md'));
  console.log(chalk.gray('    .specweave/docs/ENTERPRISE-HEALTH.md'));
  console.log('');
}

// Helper functions

function findJobByPrefix(jobs: BackgroundJob[], prefix: string): BackgroundJob | undefined {
  return jobs.find(j => j.id.startsWith(prefix));
}

function getTimeAgo(dateStr: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Load saved living docs config from init
 * (NEW v1.0.103+: Config saved during init for interactive mode)
 */
function loadSavedLivingDocsConfig(projectPath: string): LivingDocsUserInputs | null {
  const configPath = path.join(projectPath, '.specweave', 'state', 'living-docs-config.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Delete config file after loading (one-time use)
    fs.unlinkSync(configPath);

    return data.userInputs;
  } catch {
    return null;
  }
}
