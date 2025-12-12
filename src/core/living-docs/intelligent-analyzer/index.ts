/**
 * Intelligent Analyzer
 *
 * Main orchestrator for deep codebase understanding.
 * Phases: A) Discovery -> B) Deep Analysis -> C) Org Synthesis
 *         -> D) Architecture -> E) Inconsistencies -> F) Strategy
 *         -> G) Enterprise -> H) Diagrams
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeAllRepos, analyzeRepo } from './deep-repo-analyzer.js';
import { synthesizeOrganization, saveOrganizationStructure } from './organization-synthesizer.js';
import { generateArchitecture, saveArchitecture } from './architecture-generator.js';
import { detectInconsistencies, saveReviewNeeded } from './inconsistency-detector.js';
import { generateStrategy, saveStrategy } from './strategy-generator.js';
import { EnterpriseGenerator } from '../enterprise/enterprise-generator.js';
import { DeliveryGenerator } from '../delivery/delivery-generator.js';
import { OpsGenerator } from '../operations/ops-generator.js';
import { MermaidGenerator } from '../diagrams/mermaid-generator.js';
import {
  detectEcosystems,
  parsePythonStandards,
  parseGoStandards,
  parseJavaStandards,
  parseFrontendStandards,
  generateStandardsMarkdown,
  generateUnifiedSummary,
  type DetectedEcosystem,
  type GeneratedFile,
} from '../governance/index.js';
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
  projectName?: string;
  repos: Array<{ name: string; path: string }>;
  llmProvider?: LLMProvider;
  onProgress?: ProgressCallback;
  log?: (msg: string) => void;
  checkpoint?: IntelligentAnalysisCheckpoint;
  /** Enable enterprise knowledge base generation (Phase G) */
  enableEnterprise?: boolean;
  /** Enable delivery/ops documentation (Phase G) */
  enableDeliveryOps?: boolean;
  /** Enable Mermaid diagram generation (Phase H) */
  enableDiagrams?: boolean;
  /** Enable governance/standards detection (Phase G.4) */
  enableGovernance?: boolean;
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
    projectName = path.basename(projectPath),
    repos,
    llmProvider = null,
    onProgress = () => {},
    log = console.log,
    checkpoint: existingCheckpoint,
    enableEnterprise = true,
    enableDeliveryOps = true,
    enableDiagrams = true,
    enableGovernance = true,
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

    // Phase E: Inconsistency Detection (Enhanced)
    log('');
    inconsistencyResult = await detectInconsistencies(
      repoAnalyses,
      orgResult,
      llmProvider,
      onProgress,
      log,
      projectPath // Pass projectPath for broken links, spec-code gaps detection
    );
    const reviewFiles = await saveReviewNeeded(projectPath, inconsistencyResult);
    savedFiles.push(...reviewFiles);
    checkpoint.inconsistenciesComplete = true;
    checkpoint.phase = 'F';
    saveCheckpoint(projectPath, checkpoint);
    log(`Phase E complete: ${inconsistencyResult.enhancedIssues?.length || inconsistencyResult.issues.length} issues, ${inconsistencyResult.techDebt.length} tech debt`);
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
    checkpoint.phase = 'G';
    saveCheckpoint(projectPath, checkpoint);
    log(`Phase F complete: ${strategyResult.recommendations.length} recommendations generated`);
  }

  // Phase G: Enterprise Knowledge Base & Delivery/Ops
  if (!checkpoint.enterpriseComplete && orgResult) {
    log('');
    log('PHASE G: Enterprise Knowledge Base');

    // G.1: Enterprise documentation (history, features, teams, relationships)
    if (enableEnterprise) {
      try {
        const enterpriseGen = new EnterpriseGenerator({
          projectPath,
          projectName,
          teams: orgResult.teams,
        });
        const enterpriseResult = await enterpriseGen.generate();
        savedFiles.push(...enterpriseResult.savedFiles);
        log(`  Generated ${enterpriseResult.savedFiles.length} enterprise docs`);
      } catch (err) {
        log(`  Enterprise generation warning: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // G.2: Delivery documentation (CI/CD, releases, deployments)
    if (enableDeliveryOps) {
      try {
        const deliveryGen = new DeliveryGenerator({ projectPath, projectName });
        const deliveryResult = await deliveryGen.generate();
        savedFiles.push(...deliveryResult.savedFiles);
        log(`  Generated ${deliveryResult.savedFiles.length} delivery docs`);
      } catch (err) {
        log(`  Delivery generation warning: ${err instanceof Error ? err.message : String(err)}`);
      }

      // G.3: Operations documentation (runbooks, monitoring, incidents)
      try {
        const opsGen = new OpsGenerator({ projectPath, projectName });
        const opsResult = await opsGen.generate();
        savedFiles.push(...opsResult.savedFiles);
        log(`  Generated ${opsResult.savedFiles.length} ops docs`);
      } catch (err) {
        log(`  Ops generation warning: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // G.4: Governance/Standards Detection (coding standards for all ecosystems)
    if (enableGovernance) {
      try {
        log('  Detecting coding standards across ecosystems...');
        const governanceFiles = await generateGovernanceDocs(projectPath, log);
        savedFiles.push(...governanceFiles);
        log(`  Generated ${governanceFiles.length} governance docs`);
      } catch (err) {
        log(`  Governance generation warning: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    checkpoint.enterpriseComplete = true;
    checkpoint.phase = 'H';
    saveCheckpoint(projectPath, checkpoint);
    log('Phase G complete: Enterprise documentation generated');
  }

  // Phase H: Mermaid Diagrams
  if (!checkpoint.diagramsComplete && enableDiagrams) {
    log('');
    log('PHASE H: Diagram Generation');

    try {
      // Load feature specs for diagrams
      const { EnhancedSpecLoader } = await import('../enterprise/spec-loader.js');
      const specLoader = new EnhancedSpecLoader({ projectPath });
      const specsCatalog = await specLoader.loadAllSpecs();

      const mermaidGen = new MermaidGenerator({
        projectPath,
        projectName,
        features: specsCatalog.features,
        teams: orgResult?.teams,
        repoAnalyses,
      });
      const diagramResult = await mermaidGen.generate();
      savedFiles.push(...diagramResult.savedFiles);
      log(`  Generated ${diagramResult.diagrams.length} Mermaid diagrams`);
    } catch (err) {
      log(`  Diagram generation warning: ${err instanceof Error ? err.message : String(err)}`);
    }

    checkpoint.diagramsComplete = true;
    saveCheckpoint(projectPath, checkpoint);
    log('Phase H complete: Diagrams generated');
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
    enterpriseComplete: false,
    diagramsComplete: false,
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

/**
 * Generate governance documentation (coding standards for all ecosystems)
 * Phase G.4: Detects Python, Go, Java, Frontend standards from config files
 */
async function generateGovernanceDocs(
  projectPath: string,
  log: (msg: string) => void
): Promise<string[]> {
  const savedFiles: string[] = [];
  const governancePath = path.join(projectPath, '.specweave/docs/internal/governance');
  const standardsPath = path.join(governancePath, 'standards');

  fs.mkdirSync(standardsPath, { recursive: true });

  // Step 1: Detect all ecosystems
  const ecosystems = await detectEcosystems(projectPath);
  log(`    Detected ${ecosystems.length} ecosystems: ${ecosystems.map(e => e.name).join(', ')}`);

  if (ecosystems.length === 0) {
    // Create placeholder governance doc
    const placeholderContent = [
      '# Coding Standards',
      '',
      `**Generated**: ${new Date().toISOString().split('T')[0]}`,
      '',
      '## No Ecosystems Detected',
      '',
      'No recognized technology stacks were detected in this project.',
      'To generate standards documentation, ensure your project has:',
      '',
      '- Python: `pyproject.toml`, `setup.py`, `.flake8`, `ruff.toml`',
      '- Go: `go.mod`, `.golangci.yml`',
      '- Java: `pom.xml`, `build.gradle`, `checkstyle.xml`',
      '- Frontend: `package.json` with React/Vue/Angular/Svelte',
      '',
      '*Re-run analysis after adding config files.*',
    ].join('\n');

    const placeholderFile = path.join(governancePath, 'index.md');
    fs.writeFileSync(placeholderFile, placeholderContent);
    savedFiles.push(placeholderFile);
    return savedFiles;
  }

  // Step 2: Parse standards for each ecosystem
  const generatedFiles: GeneratedFile[] = [];

  for (const ecosystem of ecosystems) {
    let standards: any = null;
    let markdown = '';

    try {
      switch (ecosystem.name) {
        case 'python':
          standards = await parsePythonStandards(projectPath, ecosystem.configFiles);
          markdown = generateStandardsMarkdown('python', standards);
          break;

        case 'go':
          standards = await parseGoStandards(projectPath, ecosystem.configFiles);
          markdown = generateStandardsMarkdown('go', standards);
          break;

        case 'java':
        case 'kotlin':
          standards = await parseJavaStandards(projectPath, ecosystem.configFiles);
          markdown = generateStandardsMarkdown('java', standards);
          break;

        case 'react':
        case 'vue':
        case 'angular':
          // Frontend parser auto-detects framework, doesn't use configFiles
          standards = await parseFrontendStandards(projectPath);
          markdown = generateStandardsMarkdown(ecosystem.name, standards);
          break;

        default:
          log(`    Skipping unknown ecosystem: ${ecosystem.name}`);
          continue;
      }

      if (markdown) {
        const relativePath = `standards/${ecosystem.name}.md`;
        const fullPath = path.join(governancePath, relativePath);
        fs.writeFileSync(fullPath, markdown);
        savedFiles.push(fullPath);
        generatedFiles.push({ path: relativePath, content: markdown });
        log(`    Generated ${ecosystem.name} standards`);
      }
    } catch (err) {
      log(`    Failed to parse ${ecosystem.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Step 3: Generate unified summary (index.md)
  const summaryContent = generateUnifiedSummary(ecosystems, generatedFiles);
  const summaryFile = path.join(governancePath, 'index.md');
  fs.writeFileSync(summaryFile, summaryContent);
  savedFiles.push(summaryFile);

  return savedFiles;
}

// Re-export types
export * from './types.js';
