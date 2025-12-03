#!/usr/bin/env node
/**
 * Living Docs Builder Worker
 *
 * Background worker that generates living documentation from codebase analysis.
 * Handles long-running operations (hours/days for large codebases) with:
 * - Checkpoint/resume support
 * - Dependency waiting (clone/import jobs)
 * - Phase-based progress tracking
 * - Structured logging
 *
 * Usage:
 *   node living-docs-worker.js <jobId> <projectPath>
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically loaded modules
let checkDependencies: any;
let waitForDependencies: any;
let getJobManager: any;
let runDiscovery: any;
let buildFoundation: any;
let saveFoundationDocs: any;
let loadImportedWorkItems: any;
let matchWorkItemsToModules: any;
let saveMatchingResults: any;
let analyzeModule: any;
let saveModuleAnalysis: any;
let generateSuggestions: any;
let saveSuggestionsReport: any;
let initializeCheckpoint: any;
let loadCheckpoint: any;
let saveCheckpoint: any;
let saveDiscoveryCheckpoint: any;
let loadDiscoveryCheckpoint: any;
let saveFoundationCheckpoint: any;
let saveMatchingCheckpoint: any;
let startModuleAnalysis: any;
let updateModuleProgress: any;
let recordError: any;
let completeJob: any;
let isPhaseCompleted: any;
let getResumePoint: any;

interface LivingDocsJobConfig {
  jobId: string;
  projectPath: string;
  type: 'living-docs-builder';
  dependsOn?: string[];
  userInputs: {
    additionalSources: string[];
    priorityAreas: string[];
    knownPainPoints: string[];
    analysisDepth: 'quick' | 'standard' | 'deep';
  };
  startedAt: string;
}

/**
 * Main worker entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: living-docs-worker.js <jobId> <projectPath>');
    process.exit(1);
  }

  const jobId = args[0];
  const projectPath = args[1];

  // Write PID file with exclusive lock
  // NOTE: Must match path in job-launcher.ts: .specweave/state/jobs/{jobId}/
  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.pid');
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });

  try {
    const fd = fs.openSync(pidFile, 'wx');
    fs.writeSync(fd, process.pid.toString());
    fs.closeSync(fd);
  } catch (err: any) {
    if (err.code === 'EEXIST') {
      try {
        const existingPid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
        process.kill(existingPid, 0);
        console.error(`Worker already running for job ${jobId} (PID: ${existingPid})`);
        process.exit(1);
      } catch {
        fs.unlinkSync(pidFile);
        fs.writeFileSync(pidFile, process.pid.toString());
      }
    } else {
      throw err;
    }
  }

  // Cleanup on exit
  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch {
      // Ignore
    }
  };

  process.on('exit', cleanup);
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  process.on('SIGINT', () => { cleanup(); process.exit(0); });

  // Setup logging
  // NOTE: Must match path in job-launcher.ts: .specweave/state/jobs/{jobId}/
  const logDir = path.join(projectPath, '.specweave', 'state', 'jobs', jobId);
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'worker.log');
  const progressPath = path.join(logDir, 'progress.json');

  const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
  };

  const updateProgress = (phase: string, progress: number, message: string) => {
    fs.writeFileSync(progressPath, JSON.stringify({
      phase,
      progress,
      message,
      updatedAt: new Date().toISOString()
    }, null, 2));
  };

  try {
    log('════════════════════════════════════════════════════════════');
    log('LIVING DOCS BUILDER STARTED');
    log('════════════════════════════════════════════════════════════');
    log(`Job ID: ${jobId}`);
    log(`Project path: ${projectPath}`);
    log(`PID: ${process.pid}`);
    log(`Started at: ${new Date().toISOString()}`);
    log('');

    // Load job configuration
    const configPath = path.join(logDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Job config not found: ${configPath}`);
    }

    const jobConfig: LivingDocsJobConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    log(`User inputs: ${JSON.stringify(jobConfig.userInputs)}`);
    log(`Dependencies: ${jobConfig.dependsOn?.join(', ') || 'none'}`);
    log('');

    // Load modules dynamically
    log('Loading dependencies...');

    const depModule = await import('../../core/background/job-dependency.js');
    checkDependencies = depModule.checkDependencies;
    waitForDependencies = depModule.waitForDependencies;

    const jobManagerModule = await import('../../core/background/job-manager.js');
    getJobManager = jobManagerModule.getJobManager;

    const discoveryModule = await import('../../core/living-docs/discovery.js');
    runDiscovery = discoveryModule.runDiscovery;

    const foundationModule = await import('../../core/living-docs/foundation-builder.js');
    buildFoundation = foundationModule.buildFoundation;
    saveFoundationDocs = foundationModule.saveFoundationDocs;

    const matcherModule = await import('../../core/living-docs/workitem-matcher.js');
    loadImportedWorkItems = matcherModule.loadImportedWorkItems;
    matchWorkItemsToModules = matcherModule.matchWorkItemsToModules;
    saveMatchingResults = matcherModule.saveMatchingResults;

    const analyzerModule = await import('../../core/living-docs/module-analyzer.js');
    analyzeModule = analyzerModule.analyzeModule;
    saveModuleAnalysis = analyzerModule.saveModuleAnalysis;

    const suggestionsModule = await import('../../core/living-docs/suggestions-generator.js');
    generateSuggestions = suggestionsModule.generateSuggestions;
    saveSuggestionsReport = suggestionsModule.saveSuggestionsReport;

    const checkpointModule = await import('../../core/living-docs/checkpoint-manager.js');
    initializeCheckpoint = checkpointModule.initializeCheckpoint;
    loadCheckpoint = checkpointModule.loadCheckpoint;
    saveCheckpoint = checkpointModule.saveCheckpoint;
    saveDiscoveryCheckpoint = checkpointModule.saveDiscoveryCheckpoint;
    loadDiscoveryCheckpoint = checkpointModule.loadDiscoveryCheckpoint;
    saveFoundationCheckpoint = checkpointModule.saveFoundationCheckpoint;
    saveMatchingCheckpoint = checkpointModule.saveMatchingCheckpoint;
    startModuleAnalysis = checkpointModule.startModuleAnalysis;
    updateModuleProgress = checkpointModule.updateModuleProgress;
    recordError = checkpointModule.recordError;
    completeJob = checkpointModule.completeJob;
    isPhaseCompleted = checkpointModule.isPhaseCompleted;
    getResumePoint = checkpointModule.getResumePoint;

    log('Dependencies loaded successfully');
    log('');

    // Get job manager and mark as running
    const jobManager = getJobManager(projectPath);
    jobManager.startJob(jobId);

    // Check for existing checkpoint (resume support)
    let checkpoint = loadCheckpoint(projectPath, jobId);
    if (checkpoint) {
      log(`Resuming from checkpoint: phase=${checkpoint.phase}, progress=${checkpoint.phaseProgress}%`);
    } else {
      checkpoint = initializeCheckpoint(projectPath, jobId);
      log('Initialized new checkpoint');
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: Wait for dependencies
    // ═══════════════════════════════════════════════════════════════
    if (jobConfig.dependsOn && jobConfig.dependsOn.length > 0 && !isPhaseCompleted(checkpoint, 'waiting')) {
      log('PHASE: Waiting for dependencies...');
      updateProgress('waiting', 0, 'Waiting for clone/import jobs to complete');

      const depStatus = await waitForDependencies(
        projectPath,
        jobConfig.dependsOn,
        (status: { waitingFor: string[]; failedDeps: string[]; completedDeps: string[]; ready: boolean }) => {
          if (status.waitingFor.length > 0) {
            log(`  Still waiting for: ${status.waitingFor.join(', ')}`);
            updateProgress('waiting', 0, `Waiting for ${status.waitingFor.length} jobs`);
          }
        },
        30000 // Check every 30 seconds
      );

      if (depStatus.failedDeps.length > 0) {
        log(`  WARNING: Some dependencies failed: ${depStatus.failedDeps.join(', ')}`);
        log('  Proceeding with available data...');
      }

      log('  Dependencies complete');
      checkpoint.phase = 'discovery';
      saveCheckpoint(projectPath, jobId, checkpoint);
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: Discovery
    // ═══════════════════════════════════════════════════════════════
    let discovery = loadDiscoveryCheckpoint(projectPath, jobId);

    if (!discovery) {
      log('PHASE: Discovery - Scanning codebase...');
      updateProgress('discovery', 0, 'Scanning codebase structure');

      try {
        discovery = await runDiscovery(
          projectPath,
          jobConfig.userInputs.additionalSources,
          (phase: string, current: number, total: number) => {
            const progress = Math.round((current / total) * 100);
            updateProgress('discovery', progress, `${phase}: ${current}/${total}`);
          }
        );

        saveDiscoveryCheckpoint(projectPath, jobId, discovery);
        log(`  Discovered ${discovery.codebaseStats.totalFiles} files in ${discovery.modules.length} modules`);
        log(`  Tier: ${discovery.tier}`);
        log(`  Languages: ${discovery.techStack.languages.join(', ')}`);
      } catch (err: any) {
        recordError(projectPath, jobId, 'discovery', err.message);
        throw err;
      }
    } else {
      log('  Discovery loaded from checkpoint');
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: Foundation docs
    // ═══════════════════════════════════════════════════════════════
    if (!isPhaseCompleted(checkpoint, 'foundation')) {
      log('PHASE: Foundation - Building high-level docs...');
      updateProgress('foundation', 0, 'Generating overview documentation');

      try {
        const foundationDocs = await buildFoundation(
          projectPath,
          discovery,
          (docName: string, status: string) => {
            log(`  ${docName}: ${status}`);
            if (status === 'generating') {
              updateProgress('foundation', 50, `Generating ${docName}`);
            }
          }
        );

        const savedPaths = await saveFoundationDocs(projectPath, foundationDocs);
        saveFoundationCheckpoint(projectPath, jobId, savedPaths);
        log(`  Created ${savedPaths.length} foundation docs`);
      } catch (err: any) {
        recordError(projectPath, jobId, 'foundation', err.message);
        throw err;
      }
    } else {
      log('  Foundation phase already complete');
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 4: Integration (Work Item Matching)
    // ═══════════════════════════════════════════════════════════════
    let matchResult: any;

    if (!isPhaseCompleted(checkpoint, 'integration')) {
      log('PHASE: Integration - Matching work items...');
      updateProgress('integration', 0, 'Loading imported work items');

      try {
        const workItems = await loadImportedWorkItems(projectPath, (phase: string, current: number, total: number) => {
          updateProgress('integration', Math.round((current / total) * 50), `Loading work items: ${current}/${total}`);
        });

        log(`  Loaded ${workItems.length} work items`);

        matchResult = await matchWorkItemsToModules(projectPath, discovery, workItems, (phase: string, current: number, total: number) => {
          updateProgress('integration', 50 + Math.round((current / total) * 50), `Matching: ${current}/${total}`);
        });

        await saveMatchingResults(projectPath, matchResult);
        saveMatchingCheckpoint(projectPath, jobId, matchResult);
        log(`  Matched ${matchResult.stats.matchedWorkItems}/${matchResult.stats.totalWorkItems} items`);
        log(`  Modules with work items: ${matchResult.stats.modulesWithWorkItems}`);
      } catch (err: any) {
        recordError(projectPath, jobId, 'integration', err.message);
        throw err;
      }
    } else {
      log('  Integration phase already complete');
      // Load from checkpoint if needed
      matchResult = checkpoint.matchingStats ? {
        stats: checkpoint.matchingStats,
        moduleMap: new Map(),
        priorityQueue: [],
        unmatchedItems: []
      } : null;
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 5: Deep Dive (Module Analysis)
    // ═══════════════════════════════════════════════════════════════
    const moduleAnalyses = new Map<string, any>();

    if (!isPhaseCompleted(checkpoint, 'deep-dive')) {
      log('PHASE: Deep Dive - Analyzing modules...');

      // Determine which modules to analyze based on depth setting
      let modulesToAnalyze = [...discovery.modules];

      if (jobConfig.userInputs.analysisDepth === 'quick') {
        // Only top 5 priority modules
        modulesToAnalyze = modulesToAnalyze.slice(0, 5);
      } else if (jobConfig.userInputs.analysisDepth === 'standard') {
        // Top 10
        modulesToAnalyze = modulesToAnalyze.slice(0, 10);
      }
      // 'deep' = all modules

      // Check for resume point
      const resumePoint = getResumePoint(projectPath, jobId);
      let startIndex = 0;

      if (resumePoint?.module) {
        startIndex = modulesToAnalyze.findIndex(m => m.name === resumePoint.module);
        if (startIndex === -1) startIndex = 0;
        log(`  Resuming from module: ${resumePoint.module}`);
      } else {
        startModuleAnalysis(projectPath, jobId, modulesToAnalyze.map(m => m.name));
      }

      for (let i = startIndex; i < modulesToAnalyze.length; i++) {
        const module = modulesToAnalyze[i];
        const remaining = modulesToAnalyze.slice(i + 1).map(m => m.name);

        log(`  Analyzing module: ${module.name} (${i + 1}/${modulesToAnalyze.length})`);
        updateProgress('deep-dive', Math.round(((i + 1) / modulesToAnalyze.length) * 100),
          `Analyzing ${module.name}`);

        try {
          const workItemMatches = matchResult?.moduleMap?.get(module.name)?.matches || [];

          const analysis = await analyzeModule(
            projectPath,
            module,
            discovery.samplingConfig,
            workItemMatches,
            (_moduleName: string, _fileIdx: number, _totalFiles: number) => {
              // File-level progress
            }
          );

          moduleAnalyses.set(module.name, analysis);
          await saveModuleAnalysis(projectPath, analysis);

          updateModuleProgress(projectPath, jobId, module.name, remaining);
          log(`    Files analyzed: ${analysis.filesAnalyzed.length}`);
          log(`    Exports found: ${analysis.totalExports}`);
        } catch (err: any) {
          recordError(projectPath, jobId, 'deep-dive', `${module.name}: ${err.message}`);
          log(`    ERROR: ${err.message}`);
          // Continue with next module
        }
      }
    } else {
      log('  Deep dive phase already complete');
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 6: Suggestions
    // ═══════════════════════════════════════════════════════════════
    log('PHASE: Suggestions - Generating recommendations...');
    updateProgress('suggestions', 0, 'Generating SUGGESTIONS.md');

    try {
      const report = await generateSuggestions(
        projectPath,
        discovery,
        moduleAnalyses,
        matchResult || { stats: { totalWorkItems: 0, matchedWorkItems: 0, modulesWithWorkItems: 0 }, moduleMap: new Map(), priorityQueue: [], unmatchedItems: [] },
        jobConfig.userInputs
      );

      const suggestionsPath = await saveSuggestionsReport(projectPath, report);
      log(`  Created: ${suggestionsPath}`);
      log(`  Summary:`);
      log(`    - Total modules: ${report.summary.totalModules}`);
      log(`    - Documented: ${report.summary.modulesDocumented}`);
      log(`    - Partial: ${report.summary.modulesPartial}`);
      log(`    - Undocumented: ${report.summary.modulesUndocumented}`);
      log(`    - Coverage: ${report.summary.coveragePercent}%`);
    } catch (err: any) {
      recordError(projectPath, jobId, 'suggestions', err.message);
      throw err;
    }

    // ═══════════════════════════════════════════════════════════════
    // Complete
    // ═══════════════════════════════════════════════════════════════
    completeJob(projectPath, jobId);
    jobManager.completeJob(jobId, {
      completedAt: new Date().toISOString(),
      modulesAnalyzed: moduleAnalyses.size,
      suggestionsGenerated: true
    });

    updateProgress('complete', 100, 'Living docs generation complete');

    log('');
    log('════════════════════════════════════════════════════════════');
    log('LIVING DOCS BUILDER COMPLETED');
    log('════════════════════════════════════════════════════════════');
    log(`Completed at: ${new Date().toISOString()}`);
    log(`Output: .specweave/docs/SUGGESTIONS.md`);

  } catch (err: any) {
    log(`FATAL ERROR: ${err.message}`);
    log(err.stack || '');

    try {
      const jobManager = getJobManager(projectPath);
      jobManager.failJob(jobId, err.message);
    } catch {
      // Ignore
    }

    updateProgress('error', 0, err.message);
    process.exit(1);
  }
}

main();
