/**
 * Intelligent Analyzer
 *
 * Main orchestrator for deep codebase understanding.
 * Phases: A) Discovery -> B) Deep Analysis -> C) Org Synthesis
 *         -> D) Architecture -> E) Inconsistencies -> F) Strategy
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeAllRepos, analyzeRepo } from './deep-repo-analyzer.js';
import { synthesizeOrganization, saveOrganizationStructure } from './organization-synthesizer.js';
import { generateArchitecture, saveArchitecture } from './architecture-generator.js';
import { detectInconsistencies, saveReviewNeeded } from './inconsistency-detector.js';
import { generateStrategy, saveStrategy } from './strategy-generator.js';
import type { OrganizationSynthesisResult } from './organization-synthesizer.js';
import type { InconsistencyResult } from './inconsistency-detector.js';
import type {
  RepoAnalysis,
  IntelligentAnalysisCheckpoint,
  LLMProvider,
  ProgressCallback,
} from './types.js';

export interface IntelligentAnalysisOptions {
  projectPath: string;
  repos: Array<{ name: string; path: string }>;
  llmProvider?: LLMProvider;
  onProgress?: ProgressCallback;
  log?: (msg: string) => void;
  checkpoint?: IntelligentAnalysisCheckpoint;
}

export interface IntelligentAnalysisResult {
  repoAnalyses: Map<string, RepoAnalysis>;
  savedFiles: string[];
  checkpoint: IntelligentAnalysisCheckpoint;
}

export async function runIntelligentAnalysis(
  options: IntelligentAnalysisOptions
): Promise<IntelligentAnalysisResult> {
  const {
    projectPath,
    repos,
    llmProvider = null,
    onProgress = () => {},
    log = console.log,
    checkpoint: existingCheckpoint,
  } = options;

  const savedFiles: string[] = [];
  let checkpoint = existingCheckpoint || createInitialCheckpoint(repos.length);

  log('==========================================================');
  log('INTELLIGENT CODEBASE ANALYSIS');
  log(`Repos: ${repos.length} | LLM: ${llmProvider ? 'enabled' : 'basic'}`);
  log('==========================================================');

  // Phase B: Deep Repo Analysis
  let repoAnalyses: Map<string, RepoAnalysis>;
  if (!checkpoint.deepAnalysisComplete) {
    log('');
    repoAnalyses = await analyzeAllRepos(
      repos,
      llmProvider,
      onProgress,
      log,
      { reposCompleted: checkpoint.reposCompleted }
    );
    checkpoint.deepAnalysisComplete = true;
    checkpoint.phase = 'C';

    // Save repo analyses
    const reposPath = path.join(projectPath, '.specweave/docs/internal/repos');
    fs.mkdirSync(reposPath, { recursive: true });

    for (const [name, analysis] of repoAnalyses) {
      const repoFolder = path.join(reposPath, name);
      fs.mkdirSync(repoFolder, { recursive: true });

      // Overview
      const overviewContent = buildRepoOverview(analysis);
      fs.writeFileSync(path.join(repoFolder, 'overview.md'), overviewContent);
      savedFiles.push(path.join(repoFolder, 'overview.md'));

      // API Surface
      if (analysis.mainApis.length > 0) {
        const apiContent = buildApiSurface(analysis);
        fs.writeFileSync(path.join(repoFolder, 'api-surface.md'), apiContent);
        savedFiles.push(path.join(repoFolder, 'api-surface.md'));
      }
    }

    saveCheckpoint(projectPath, checkpoint);
    log(`Phase B complete: Analyzed ${repoAnalyses.size} repos`);
  } else {
    // Load from checkpoint
    repoAnalyses = loadRepoAnalyses(projectPath);
    log(`Resuming from checkpoint, ${repoAnalyses.size} repos loaded`);
  }

  // Phase C: Organization Synthesis
  let orgResult: OrganizationSynthesisResult | null = null;
  let inconsistencyResult: InconsistencyResult | null = null;

  if (!checkpoint.clusteringComplete) {
    log('');
    orgResult = await synthesizeOrganization(
      repoAnalyses,
      projectPath,
      llmProvider,
      onProgress,
      log
    );
    const orgFiles = await saveOrganizationStructure(projectPath, orgResult, repoAnalyses);
    savedFiles.push(...orgFiles);
    checkpoint.clusteringComplete = true;
    checkpoint.phase = 'D';
    saveCheckpoint(projectPath, checkpoint);
    log(`Phase C complete: ${orgResult.teams.length} teams, ${orgResult.microservices.length} services`);

    // Phase D: Architecture Generation
    log('');
    const archResult = await generateArchitecture(
      repoAnalyses,
      orgResult,
      projectPath,
      llmProvider,
      onProgress,
      log
    );
    const archFiles = await saveArchitecture(projectPath, archResult);
    savedFiles.push(...archFiles);
    checkpoint.architectureComplete = true;
    checkpoint.phase = 'E';
    saveCheckpoint(projectPath, checkpoint);
    log(`Phase D complete: ${archResult.detectedAdrs.length} ADRs detected`);

    // Phase E: Inconsistency Detection
    log('');
    inconsistencyResult = await detectInconsistencies(
      repoAnalyses,
      orgResult,
      llmProvider,
      onProgress,
      log
    );
    const reviewFiles = await saveReviewNeeded(projectPath, inconsistencyResult);
    savedFiles.push(...reviewFiles);
    checkpoint.inconsistenciesComplete = true;
    checkpoint.phase = 'F';
    saveCheckpoint(projectPath, checkpoint);
    log(`Phase E complete: ${inconsistencyResult.issues.length} issues, ${inconsistencyResult.techDebt.length} tech debt`);
  }

  // Phase F: Strategy Generation
  if (!checkpoint.strategyComplete && orgResult && inconsistencyResult) {
    log('');
    const strategyResult = await generateStrategy(
      repoAnalyses,
      orgResult,
      inconsistencyResult,
      llmProvider,
      onProgress,
      log
    );
    const strategyFiles = await saveStrategy(projectPath, strategyResult);
    savedFiles.push(...strategyFiles);
    checkpoint.strategyComplete = true;
    saveCheckpoint(projectPath, checkpoint);
    log(`Phase F complete: ${strategyResult.recommendations.length} recommendations generated`);
  }

  log('');
  log('==========================================================');
  log('INTELLIGENT ANALYSIS COMPLETE');
  log(`Generated ${savedFiles.length} files`);
  log('==========================================================');

  return { repoAnalyses, savedFiles, checkpoint };
}

function buildRepoOverview(analysis: RepoAnalysis): string {
  const lines: string[] = [
    `# ${analysis.name}`,
    '',
    `*Analyzed: ${analysis.analyzedAt.split('T')[0]} | Confidence: ${analysis.confidence}**`,
    '',
    '## Purpose',
    '',
    analysis.purpose,
    '',
  ];

  if (analysis.keyConcepts.length > 0) {
    lines.push('## Key Concepts', '');
    for (const c of analysis.keyConcepts) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  if (analysis.patternsUsed.length > 0) {
    lines.push('## Patterns', '');
    for (const p of analysis.patternsUsed) {
      lines.push(`- **${p.pattern}** (${p.category})`);
    }
    lines.push('');
  }

  if (analysis.externalDependencies.length > 0) {
    lines.push('## External Dependencies', '');
    for (const d of analysis.externalDependencies) {
      lines.push(`- ${d}`);
    }
    lines.push('');
  }

  if (analysis.observations.length > 0) {
    lines.push('## Observations', '');
    for (const o of analysis.observations) {
      lines.push(`- ${o}`);
    }
  }

  return lines.join('\n');
}

function buildApiSurface(analysis: RepoAnalysis): string {
  const lines: string[] = [
    `# API Surface: ${analysis.name}`,
    '',
    '*Auto-generated by Intelligent Analyzer*',
    '',
    '| Name | Type | Description | Location |',
    '|------|------|-------------|----------|',
  ];

  for (const api of analysis.mainApis) {
    lines.push(`| ${api.name} | ${api.type} | ${api.description} | ${api.location || '-'} |`);
  }

  return lines.join('\n');
}

function createInitialCheckpoint(repoCount: number): IntelligentAnalysisCheckpoint {
  return {
    phase: 'B',
    reposTotal: repoCount,
    reposCompleted: [],
    repoInProgress: null,
    discoveryComplete: true,
    deepAnalysisComplete: false,
    clusteringComplete: false,
    architectureComplete: false,
    inconsistenciesComplete: false,
    strategyComplete: false,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    estimatedCompletion: null,
  };
}

function saveCheckpoint(projectPath: string, checkpoint: IntelligentAnalysisCheckpoint): void {
  const tempPath = path.join(projectPath, '.specweave/docs/internal/temp');
  fs.mkdirSync(tempPath, { recursive: true });
  checkpoint.lastActivityAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(tempPath, 'intelligent-analysis-checkpoint.json'),
    JSON.stringify(checkpoint, null, 2)
  );
}

function loadRepoAnalyses(projectPath: string): Map<string, RepoAnalysis> {
  // For now, return empty - in full implementation would load from temp
  return new Map();
}

export function loadCheckpoint(projectPath: string): IntelligentAnalysisCheckpoint | null {
  const checkpointFile = path.join(
    projectPath,
    '.specweave/docs/internal/temp/intelligent-analysis-checkpoint.json'
  );
  if (!fs.existsSync(checkpointFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(checkpointFile, 'utf-8'));
  } catch {
    return null;
  }
}

// Re-export types
export * from './types.js';
