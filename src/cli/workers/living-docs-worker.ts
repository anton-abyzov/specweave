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

// LLM Provider for AI-powered deep analysis
let createProvider: any;
let isClaudeCodeAvailable: any;
let getClaudeCodeStatus: any;
let llmProvider: any = null;

// Enterprise Documentation Analysis
let EnterpriseDocAnalyzer: any;
let generateEnterpriseReport: any;

// Claude Availability Messaging
let getAvailabilityMessage: any;
let formatAvailabilityMessage: any;
let getSimpleErrorMessage: any;

// Robust JSON extraction from LLM responses
let extractJson: any;
let buildJsonPrompt: any;

// Intelligent Codebase Analyzer (Phase B-E)
let runIntelligentAnalysis: any;
let loadIntelligentCheckpoint: any;

interface LivingDocsJobConfig {
  jobId: string;
  projectPath: string;
  type: 'living-docs-builder';
  dependsOn?: string[];
  userInputs: {
    additionalSources: string[];
    priorityAreas: string[];
    knownPainPoints: string[];
    analysisDepth: 'quick' | 'standard' | 'deep-native';
  };
  startedAt: string;
}

/**
 * AI Module Analysis result type
 */
interface AIModuleAnalysisResult {
  purpose: string;
  keyConcepts: string[];
  dependencies: string[];
  complexity: 'low' | 'medium' | 'high';
  suggestedDocs: string[];
  architecturalNotes: string;
}

/**
 * AI-enhanced module analysis using Claude Code
 *
 * Uses robust JSON extraction with retry logic to handle common LLM
 * output patterns like prose before JSON, markdown code blocks, etc.
 */
async function runAIModuleAnalysis(
  moduleName: string,
  basicAnalysis: any,
  provider: any,
  log: (msg: string) => void
): Promise<AIModuleAnalysisResult | null> {
  // Build context from basic analysis
  const filesSummary = basicAnalysis.filesAnalyzed
    .slice(0, 5) // Limit to top 5 files to avoid prompt explosion
    .map((f: any) => `- ${f.path}: ${f.exports?.length || 0} exports`)
    .join('\n');

  const exportsSummary = basicAnalysis.keyExports
    ?.slice(0, 10)
    .map((e: any) => `- ${e.name}: ${e.type}`)
    .join('\n') || 'No exports detected';

  // Build prompt using robust JSON prompt builder (instruction at START for prominence)
  const context = `Module: ${moduleName}
Files analyzed: ${basicAnalysis.filesAnalyzed.length}
Total exports: ${basicAnalysis.totalExports}

Key files:
${filesSummary}

Key exports:
${exportsSummary}`;

  const schema = {
    purpose: 'Brief description of what this module does (1-2 sentences)',
    keyConcepts: '["concept1", "concept2", "concept3"]',
    dependencies: '["dependency1", "dependency2"]',
    complexity: 'low|medium|high',
    suggestedDocs: '["doc1.md", "doc2.md"]',
    architecturalNotes: 'Brief notes about patterns, concerns, or suggestions'
  };

  const prompt = buildJsonPrompt(
    context,
    schema,
    `Analyze this TypeScript/JavaScript module and provide structured insights about its purpose, complexity, and documentation needs.`
  );

  const maxRetries = 2;
  let lastResponse = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const attemptLabel = attempt === 0 ? '' : ` (retry ${attempt}/${maxRetries})`;
      log(`    Sending to Claude Code Opus 4.6...${attemptLabel}`);

      const currentPrompt = attempt === 0 ? prompt : generateCorrectionPrompt(prompt, lastResponse);
      const result = await provider.analyze(currentPrompt);

      if (!result || !result.content) {
        log(`    Empty response from AI`);
        continue;
      }

      lastResponse = result.content;

      // Use robust JSON extraction (dynamically loaded, no type args)
      const extraction = extractJson(result.content, {
        requiredFields: ['purpose', 'complexity']
      }) as { success: boolean; data: AIModuleAnalysisResult | null; extractionMethod: string; error: string | null };

      if (extraction.success && extraction.data) {
        if (attempt > 0) {
          log(`    JSON extraction succeeded on retry ${attempt}`);
        }
        return {
          purpose: extraction.data.purpose,
          keyConcepts: extraction.data.keyConcepts || [],
          dependencies: extraction.data.dependencies || [],
          complexity: extraction.data.complexity,
          suggestedDocs: extraction.data.suggestedDocs || [],
          architecturalNotes: extraction.data.architecturalNotes || ''
        };
      }

      // Log extraction failure details for debugging
      log(`    JSON extraction failed (${extraction.extractionMethod}): ${extraction.error}`);

    } catch (err: any) {
      log(`    AI analysis error: ${err.message}`);
    }
  }

  log(`    AI analysis failed after ${maxRetries + 1} attempts, using fallback`);
  return null;
}

/**
 * Generate a correction prompt for retry after failed JSON extraction.
 */
function generateCorrectionPrompt(originalPrompt: string, failedResponse: string): string {
  const MAX_PREVIEW_LENGTH = 200;
  const preview = failedResponse.slice(0, MAX_PREVIEW_LENGTH);
  const ellipsis = failedResponse.length > MAX_PREVIEW_LENGTH ? '...' : '';

  // Extract module context from original prompt if available
  const moduleIndex = originalPrompt.indexOf('Module:');
  const moduleContext = moduleIndex >= 0
    ? originalPrompt.slice(moduleIndex, moduleIndex + 300)
    : '';

  return `Your previous response was not valid JSON. I received:
"${preview}${ellipsis}"

CRITICAL: Respond with ONLY a JSON object. No explanations, no "Based on...", no markdown.

Required format (copy this structure exactly):
{
  "purpose": "...",
  "keyConcepts": ["..."],
  "dependencies": ["..."],
  "complexity": "low|medium|high",
  "suggestedDocs": ["..."],
  "architecturalNotes": "..."
}

${moduleContext}`;
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
  function cleanup(): void {
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  function cleanupAndExit(): void {
    cleanup();
    process.exit(0);
  }

  process.on('exit', cleanup);
  process.on('SIGTERM', cleanupAndExit);
  process.on('SIGINT', cleanupAndExit);

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

    // Load enterprise analyzer
    const enterpriseModule = await import('../../living-docs/enterprise-analyzer.js');
    EnterpriseDocAnalyzer = enterpriseModule.EnterpriseDocAnalyzer;
    generateEnterpriseReport = enterpriseModule.generateEnterpriseReport;

    // Load availability messages
    const availabilityModule = await import('../../core/llm/availability-messages.js');
    getAvailabilityMessage = availabilityModule.getAvailabilityMessage;
    formatAvailabilityMessage = availabilityModule.formatAvailabilityMessage;
    getSimpleErrorMessage = availabilityModule.getSimpleErrorMessage;

    // Load robust JSON extraction utility
    const jsonExtractorModule = await import('../../utils/llm-json-extractor.js');
    extractJson = jsonExtractorModule.extractJson;
    buildJsonPrompt = jsonExtractorModule.buildJsonPrompt;

    // Load intelligent analyzer for deep analysis modes
    const intelligentAnalyzerModule = await import('../../core/living-docs/intelligent-analyzer/index.js');
    runIntelligentAnalysis = intelligentAnalyzerModule.runIntelligentAnalysis;
    loadIntelligentCheckpoint = intelligentAnalyzerModule.loadCheckpoint;

    log('Dependencies loaded successfully');
    log('');

    // Initialize LLM provider for AI-powered deep analysis
    const depth = jobConfig.userInputs.analysisDepth;
    if (depth === 'deep-native') {
      log('Initializing AI provider for deep analysis...');
      try {
        const providerModule = await import('../../core/llm/provider-factory.js');
        createProvider = providerModule.createProvider;
        isClaudeCodeAvailable = providerModule.isClaudeCodeAvailable;
        getClaudeCodeStatus = providerModule.getClaudeCodeStatus;

        // Use Claude Code CLI with MAX subscription (FREE!)
        const available = await isClaudeCodeAvailable();
        if (available) {
          llmProvider = await createProvider({
            provider: 'claude-code',
            model: 'opus',  // Opus 4.6 for best quality
          });
          log('  ✓ Claude Code native provider initialized (using MAX subscription)');
          log('    Model: Opus 4.6');
          log('    Cost: FREE (included in MAX)');
        } else {
          // Show detailed availability message with installation instructions
          log('  ⚠ Claude Code CLI not available');
          log('');
          try {
            const status = await getClaudeCodeStatus();
            const availMsg = getAvailabilityMessage(status);
            log(`  ${availMsg.title}`);
            log(`  ${availMsg.message}`);
            log('');
            if (availMsg.instructions.length > 0) {
              log('  Installation Instructions:');
              for (const instruction of availMsg.instructions) {
                log(`    ${instruction}`);
              }
              log('');
            }
            if (availMsg.alternatives.length > 0) {
              log('  Alternatives:');
              for (const alt of availMsg.alternatives) {
                log(`    • ${alt}`);
              }
              log('');
            }
            log(`  Learn more: ${availMsg.learnMore}`);
          } catch {
            log('  Install Claude Code: npm install -g @anthropic-ai/claude-code');
            log('  Then authenticate: claude login');
          }
          log('');
          log('  Falling back to standard analysis (no AI insights)');
        }
      } catch (err: any) {
        log(`  ⚠ Failed to initialize AI provider: ${err.message}`);
        log('    Falling back to standard analysis');
      }
    }
    log('');

    // Get job manager and ensure job is registered
    const jobManager = getJobManager(projectPath);

    // Auto-register if job doesn't exist in background-jobs.json
    // This handles cases where worker is launched directly (not via job-launcher)
    if (!jobManager.getJob(jobId)) {
      log('Job not registered, auto-registering...');
      const stateFilePath = path.join(projectPath, '.specweave/state/background-jobs.json');

      // Load existing state or create new one
      let state = { jobs: [] as any[] };
      try {
        if (fs.existsSync(stateFilePath)) {
          state = JSON.parse(fs.readFileSync(stateFilePath, 'utf-8').toString());
        }
      } catch {
        // Corrupted file - start fresh
      }

      state.jobs.push({
        id: jobId,
        type: 'living-docs-builder',
        status: 'pending',
        progress: {
          current: 0,
          total: 100,
          percentage: 0,
          itemsCompleted: [],
          itemsFailed: []
        },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          type: 'living-docs-builder',
          projectPath,
          userInputs: jobConfig.userInputs
        }
      });

      fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
      fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
      log('  ✓ Job registered in background-jobs.json');
    }

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
        // Update dependency status to 'partial' (some deps failed)
        jobManager.updateDependencyStatus(jobId, 'partial');
      } else {
        // All dependencies completed successfully
        jobManager.updateDependencyStatus(jobId, 'ready');
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

        // Log umbrella detection result
        if (discovery.umbrella?.isUmbrella) {
          log(`  UMBRELLA PROJECT DETECTED:`);
          log(`    Source: ${discovery.umbrella.source}`);
          log(`    Child repos: ${discovery.umbrella.childRepoCount}`);
          log(`    Frameworks: ${discovery.techStack.frameworks.join(', ') || 'none'}`);
        }
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
    // PHASE 3.5: Intelligent Codebase Analysis (deep-native only)
    // ═══════════════════════════════════════════════════════════════
    const analysisDepth = jobConfig.userInputs.analysisDepth;
    // NOTE: Run for ALL projects (single-repo or umbrella) when deep-native selected!
    // Previously had `hasMultipleRepos` check which blocked single-repo projects from
    // getting inconsistencies, tech debt, strategy, governance, and diagrams!
    if (analysisDepth === 'deep-native') {
      log('');
      log('PHASE: Intelligent Analysis - Deep codebase understanding...');
      log('  This phase uses LLM to understand the codebase,');
      log('  detect inconsistencies, tech debt, and generate strategy recommendations.');
      updateProgress('intelligent-analysis', 0, 'Starting intelligent codebase analysis');

      try {
        // Build repo list: umbrella projects have multiple, single-repo creates synthetic entry
        // CRITICAL FIX: discovery.umbrella only has childRepoCount, not childRepos array!
        // The actual childRepos array is stored in config.json umbrella section.
        // We need to load from config.json OR use discovery.modules (which ARE the child repos!)
        let repos: Array<{ name: string; path: string }> = [];

        if (discovery.umbrella?.isUmbrella && discovery.modules.length > 1) {
          // Umbrella project: discovery.modules already contains the child repos!
          // The umbrella-detector.ts converts childRepos to ModuleInfo[] in convertReposToModules()
          repos = (discovery.modules as Array<{ name: string; path: string }>).map((m) => ({
            name: m.name,
            path: m.path,
          }));
          log(`  UMBRELLA PROJECT: Using ${repos.length} child repositories from discovery.modules`);
        } else {
          // Single-repo project: treat root as the only "repo"
          repos = [{
            name: path.basename(projectPath),
            path: projectPath,
          }];
          log(`  SINGLE-REPO PROJECT: Analyzing root directory`);
        }

        log(`  Analyzing ${repos.length} repositories...`);

        const intelligentResult = await runIntelligentAnalysis({
          projectPath,
          repos,
          llmProvider,
          onProgress: (phase: string, current: number, total: number, message: string) => {
            const progress = Math.round((current / total) * 100);
            updateProgress('intelligent-analysis', progress, `${phase}: ${message}`);
          },
          log: (msg: string) => log(`  ${msg}`),
          checkpoint: loadIntelligentCheckpoint(projectPath),
        });

        log(`  Intelligent analysis complete:`);
        log(`    - Repos analyzed: ${intelligentResult.repoAnalyses.size}`);
        log(`    - Files generated: ${intelligentResult.savedFiles.length}`);
        log('');
        log('  Generated folders:');
        log('    - /repos/ - Per-repository deep analysis');
        log('    - /organization/ - Team/service/domain clustering');
        log('    - /architecture/ - C4 diagrams and detected ADRs');
        log('    - /review-needed/ - Questions for CTO/PO');

      } catch (err: any) {
        log(`  WARNING: Intelligent analysis failed: ${err.message}`);
        log('  Continuing with standard analysis...');
        recordError(projectPath, jobId, 'intelligent-analysis', err.message);
        // Non-fatal - continue to next phase
      }
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
      const usingAI = llmProvider !== null;
      log(`PHASE: Deep Dive - Analyzing modules...${usingAI ? ' (AI-POWERED)' : ''}`);
      if (usingAI) {
        log('  Using Claude Code Opus 4.6 for semantic analysis');
      }

      // Determine which modules to analyze based on depth setting
      let modulesToAnalyze = [...discovery.modules];
      const analysisDepth = jobConfig.userInputs.analysisDepth;

      if (analysisDepth === 'quick') {
        // Only top 5 priority modules
        modulesToAnalyze = modulesToAnalyze.slice(0, 5);
      } else if (analysisDepth === 'standard') {
        // Top 10
        modulesToAnalyze = modulesToAnalyze.slice(0, 10);
      }
      // deep-native = all modules

      // CRITICAL FIX: For deep-native mode, increase file sampling!
      // Default tier-based sampling (3 files for large codebases) is too shallow.
      // Deep analysis should sample 15-20 files per module for comprehensive coverage.
      const effectiveSamplingConfig = (analysisDepth === 'deep-native')
        ? {
            ...discovery.samplingConfig,
            // Override filesPerDir: minimum 15 for deep analysis (was 3 for large tier)
            filesPerDir: Math.max(15, typeof discovery.samplingConfig.filesPerDir === 'number' ? discovery.samplingConfig.filesPerDir : 15),
          }
        : discovery.samplingConfig;

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

          // Basic Node.js analysis first (using effectiveSamplingConfig for deep modes)
          const analysis = await analyzeModule(
            projectPath,
            module,
            effectiveSamplingConfig,
            workItemMatches,
            (_moduleName: string, _fileIdx: number, _totalFiles: number) => {
              // File-level progress
            }
          );

          // AI-enhanced analysis when provider is available
          if (llmProvider && analysis.filesAnalyzed.length > 0) {
            log(`    Running AI analysis on ${module.name}...`);
            try {
              const aiAnalysis = await runAIModuleAnalysis(
                module.name,
                analysis,
                llmProvider,
                log
              );
              // Merge AI insights into analysis
              if (aiAnalysis) {
                analysis.aiInsights = aiAnalysis;
                log(`    AI insights generated`);
              }
            } catch (aiErr: any) {
              log(`    AI analysis skipped: ${aiErr.message}`);
            }
          }

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
    // PHASE 7: Enterprise Documentation Analysis
    // ═══════════════════════════════════════════════════════════════
    log('PHASE: Enterprise - Analyzing documentation health...');
    updateProgress('enterprise', 0, 'Running enterprise documentation analysis');

    try {
      const analyzer = new EnterpriseDocAnalyzer({
        projectPath,
        logger: {
          info: (msg: string) => log(`  [INFO] ${msg}`),
          warn: (msg: string) => log(`  [WARN] ${msg}`),
          error: (msg: string) => log(`  [ERROR] ${msg}`),
          debug: () => {}, // Suppress debug logs
          verbose: () => {},
          formatError: (err: Error) => err.message,
        },
        includeArchived: false,
      });

      updateProgress('enterprise', 25, 'Scanning documentation categories');
      const enterpriseReport = await analyzer.analyze();

      updateProgress('enterprise', 75, 'Generating enterprise report');

      // Generate and save the enterprise report
      const reportContent = generateEnterpriseReport(enterpriseReport);
      const enterpriseReportPath = path.join(projectPath, '.specweave/docs/ENTERPRISE-HEALTH.md');
      fs.writeFileSync(enterpriseReportPath, reportContent);

      log(`  Created: ${enterpriseReportPath}`);
      log(`  Summary:`);
      log(`    - Documentation categories: ${enterpriseReport.categories.length}`);
      log(`    - Total documents: ${enterpriseReport.totalDocuments}`);
      log(`    - Health score: ${enterpriseReport.healthScore.overall}% (Grade: ${enterpriseReport.healthScore.grade})`);
      log(`    - Freshness: ${enterpriseReport.healthScore.freshness}%`);
      log(`    - Coverage: ${enterpriseReport.healthScore.coverage}%`);
      log(`    - Accuracy: ${enterpriseReport.healthScore.accuracy}%`);
      log(`    - Spec-code mismatches: ${enterpriseReport.mismatches.length}`);
      log(`    - Recommendations: ${enterpriseReport.recommendations.length}`);

      updateProgress('enterprise', 100, 'Enterprise analysis complete');
    } catch (err: any) {
      log(`  WARNING: Enterprise analysis failed: ${err.message}`);
      log('  Continuing without enterprise report...');
      // Non-fatal - continue to completion
    }

    // ═══════════════════════════════════════════════════════════════
    // Complete
    // ═══════════════════════════════════════════════════════════════
    completeJob(projectPath, jobId);
    // Note: completeJob(jobId, optionalError?) - no error means success
    jobManager.completeJob(jobId);

    updateProgress('complete', 100, 'Living docs generation complete');

    log('');
    log('════════════════════════════════════════════════════════════');
    log('LIVING DOCS BUILDER COMPLETED');
    log('════════════════════════════════════════════════════════════');
    log(`Completed at: ${new Date().toISOString()}`);
    log(`Output:`);
    log(`  - .specweave/docs/SUGGESTIONS.md`);
    log(`  - .specweave/docs/ENTERPRISE-HEALTH.md`);
    if (analysisDepth === 'deep-native') {
      log(`  - .specweave/docs/internal/repos/ (per-repo analysis)`);
      log(`  - .specweave/docs/internal/organization/ (team/service clustering)`);
      log(`  - .specweave/docs/internal/architecture/ (C4 diagrams, detected ADRs)`);
      log(`  - .specweave/docs/internal/review-needed/ (questions for CTO/PO)`);
      log(`  - .specweave/docs/internal/strategy/ (tech debt, modernization, recommendations)`);
    }

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
