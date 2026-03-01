/**
 * Brownfield Analysis Worker
 *
 * Performs brownfield documentation analysis in phases:
 * 1. Discovery - Find all code/doc files
 * 2. Code Analysis - Extract signatures, APIs
 * 3. Doc Matching - Match code to docs
 * 4. Discrepancy Detection - Find documentation gaps
 * 5. Reporting - Generate summary
 *
 * Supports pause/resume via checkpoints.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AnalysisDepth } from '../../core/background/types.js';
import {
  BrownfieldJobConfig,
  BrownfieldPhase,
  updateBrownfieldProgress,
  completeBrownfieldJob,
  failBrownfieldJob,
} from '../../core/background/index.js';
import {
  BrownfieldDiscrepancyManager,
  BrownfieldDiscrepancyCreate,
  BrownfieldDiscrepancyType,
} from '../../core/discrepancy/index.js';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { createProvider } from '../../core/llm/provider-factory.js';
import type { LLMProvider } from '../../core/llm/types.js';

/**
 * File metadata for discovery
 */
interface FileInfo {
  path: string;
  relativePath: string;
  type: 'code' | 'doc' | 'config';
  extension: string;
  size: number;
  lastModified: Date;
}

/**
 * Module information from code analysis
 */
interface ModuleInfo {
  name: string;
  path: string;
  exports: ExportInfo[];
  hasTests: boolean;
  lastModified: Date;
  contributors?: string[];
}

/**
 * Exported function/type information
 */
interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'type' | 'interface' | 'const' | 'variable';
  line: number;
  hasDocComment: boolean;
  signature?: string;
}

/**
 * Documentation file information
 */
interface DocInfo {
  path: string;
  relativePath: string;
  title?: string;
  topics: string[];
  lastModified: Date;
  wordCount: number;
}

/**
 * Analysis context shared across phases
 */
interface AnalysisContext {
  projectPath: string;
  sourceDocsPath?: string;
  depth: AnalysisDepth;
  codeFiles: FileInfo[];
  docFiles: FileInfo[];
  modules: ModuleInfo[];
  docs: DocInfo[];
}

/**
 * Brownfield Analysis Worker
 */
export class BrownfieldAnalysisWorker {
  private readonly projectPath: string;
  private readonly jobId: string;
  private readonly config: BrownfieldJobConfig;
  private readonly logger: Logger;
  private readonly discrepancyManager: BrownfieldDiscrepancyManager;
  private context: AnalysisContext;
  private llmProvider?: LLMProvider;

  constructor(
    projectPath: string,
    jobId: string,
    config: BrownfieldJobConfig,
    options: { logger?: Logger } = {}
  ) {
    this.projectPath = projectPath;
    this.jobId = jobId;
    this.config = config;
    this.logger = options.logger ?? consoleLogger;
    this.discrepancyManager = new BrownfieldDiscrepancyManager(projectPath, {
      logger: this.logger,
    });
    this.context = {
      projectPath,
      sourceDocsPath: config.sourceDocsPath,
      depth: config.analysisDepth,
      codeFiles: [],
      docFiles: [],
      modules: [],
      docs: [],
    };
  }

  /**
   * Initialize LLM provider for deep analysis modes
   */
  private async initLLMProvider(): Promise<void> {
    if (this.context.depth === 'deep-native') {
      try {
        this.llmProvider = await createProvider({
          provider: 'claude-code',
          model: 'opus',  // Use Opus 4.6 for best analysis quality
        }, { logger: this.logger });
        this.logger.log('Initialized Claude Code native provider (using MAX subscription)');
      } catch (error) {
        this.logger.warn('Claude Code not available, falling back to standard analysis');
        this.context.depth = 'standard';
      }
    }
  }

  /**
   * Run the brownfield analysis
   */
  async run(): Promise<number> {
    const phases: BrownfieldPhase[] = [
      'discovery',
      'code-analysis',
      'doc-matching',
      'discrepancy-detect',
      'reporting',
    ];

    // Initialize LLM provider for deep analysis modes
    await this.initLLMProvider();

    // Resume from checkpoint if exists
    const startPhaseIndex = this.config.checkpoint
      ? phases.indexOf(this.config.checkpoint.phase)
      : 0;

    let discrepancyCount = 0;

    try {
      for (let i = startPhaseIndex; i < phases.length; i++) {
        const phase = phases[i];
        this.logger.log(`Starting phase: ${phase}`);

        updateBrownfieldProgress(this.projectPath, this.jobId, phase, 0, 100);

        switch (phase) {
          case 'discovery':
            await this.runDiscoveryPhase();
            break;
          case 'code-analysis':
            await this.runCodeAnalysisPhase();
            break;
          case 'doc-matching':
            await this.runDocMatchingPhase();
            break;
          case 'discrepancy-detect':
            discrepancyCount = await this.runDiscrepancyDetectionPhase();
            break;
          case 'reporting':
            await this.runReportingPhase(discrepancyCount);
            break;
        }

        updateBrownfieldProgress(this.projectPath, this.jobId, phase, 100, 100);
        this.logger.log(`Completed phase: ${phase}`);
      }

      completeBrownfieldJob(this.projectPath, this.jobId, discrepancyCount);
      return discrepancyCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Brownfield analysis failed:', error);
      failBrownfieldJob(this.projectPath, this.jobId, errorMsg);
      throw error;
    }
  }

  /**
   * Phase 1: Discovery - Find all code and documentation files
   */
  private async runDiscoveryPhase(): Promise<void> {
    this.logger.log('Discovering files...');

    // Find code files
    this.context.codeFiles = this.findFiles(this.projectPath, [
      '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    ], ['code']);

    // Find documentation files
    const docPaths = this.context.sourceDocsPath
      ? [path.join(this.projectPath, this.context.sourceDocsPath)]
      : [this.projectPath];

    for (const docPath of docPaths) {
      if (fs.existsSync(docPath)) {
        this.context.docFiles.push(...this.findFiles(docPath, [
          '.md', '.mdx', '.rst', '.txt',
        ], ['doc']));
      }
    }

    this.logger.log(`Found ${this.context.codeFiles.length} code files`);
    this.logger.log(`Found ${this.context.docFiles.length} doc files`);
  }

  /**
   * Phase 2: Code Analysis - Extract exports and signatures
   */
  private async runCodeAnalysisPhase(): Promise<void> {
    this.logger.log('Analyzing code...');

    // Group files by directory to form modules
    const moduleMap = new Map<string, FileInfo[]>();

    for (const file of this.context.codeFiles) {
      const dir = path.dirname(file.relativePath);
      if (!moduleMap.has(dir)) {
        moduleMap.set(dir, []);
      }
      moduleMap.get(dir)!.push(file);
    }

    // Analyze each module
    for (const [modulePath, files] of moduleMap.entries()) {
      const module = this.analyzeModule(modulePath, files);
      if (module) {
        this.context.modules.push(module);
      }
    }

    this.logger.log(`Analyzed ${this.context.modules.length} modules`);
  }

  /**
   * Phase 3: Doc Matching - Match docs to code modules
   */
  private async runDocMatchingPhase(): Promise<void> {
    this.logger.log('Matching documentation...');

    for (const docFile of this.context.docFiles) {
      const docInfo = this.parseDocFile(docFile);
      if (docInfo) {
        this.context.docs.push(docInfo);
      }
    }

    this.logger.log(`Parsed ${this.context.docs.length} doc files`);
  }

  /**
   * Phase 4: Discrepancy Detection - Find documentation gaps
   */
  private async runDiscrepancyDetectionPhase(): Promise<number> {
    this.logger.log('Detecting discrepancies...');

    await this.discrepancyManager.ensureFolderStructure();

    const discrepancies: BrownfieldDiscrepancyCreate[] = [];

    // Detect undocumented exports
    for (const module of this.context.modules) {
      const undocumented = module.exports.filter(e => !e.hasDocComment);
      if (undocumented.length > 0) {
        discrepancies.push({
          type: 'missing-docs',
          module: module.name,
          codeLocation: `${module.path}`,
          summary: `${undocumented.length} undocumented exports in ${module.name}`,
          details: `The following exports lack documentation:\n${undocumented.map(e => `- ${e.name} (${e.type})`).join('\n')}`,
          evidence: {
            codeSnippet: undocumented.slice(0, 5).map(e => e.signature || e.name).join('\n'),
          },
          priority: this.calculatePriority(undocumented.length, module.exports.length),
          confidence: 90,
          autoDetected: true,
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy: 'brownfield-analyzer',
          lastChecked: new Date().toISOString(),
        });
      }
    }

    // Detect modules without any docs
    const modulesWithoutDocs = this.context.modules.filter(m => {
      const moduleName = m.name.toLowerCase();
      return !this.context.docs.some(d =>
        d.relativePath.toLowerCase().includes(moduleName) ||
        d.topics.some(t => t.toLowerCase().includes(moduleName))
      );
    });

    for (const module of modulesWithoutDocs) {
      discrepancies.push({
        type: 'missing-docs',
        module: module.name,
        codeLocation: module.path,
        summary: `No documentation found for module: ${module.name}`,
        details: `Module ${module.name} has ${module.exports.length} exports but no matching documentation file.`,
        evidence: {},
        priority: 'medium',
        confidence: 75,
        autoDetected: true,
        status: 'pending',
        detectedAt: new Date().toISOString(),
        detectedBy: 'brownfield-analyzer',
        lastChecked: new Date().toISOString(),
      });
    }

    // AI-powered deep analysis (when provider available)
    if (this.llmProvider && this.context.depth === 'deep-native') {
      this.logger.log('Running AI-powered deep analysis...');
      const aiDiscrepancies = await this.runAIAnalysis();
      discrepancies.push(...aiDiscrepancies);
    }

    // Create discrepancies in batch
    if (discrepancies.length > 0) {
      await this.discrepancyManager.createBatch(discrepancies);
    }

    this.logger.log(`Detected ${discrepancies.length} discrepancies`);
    return discrepancies.length;
  }

  /**
   * AI-powered deep analysis using Claude Code or configured LLM
   */
  private async runAIAnalysis(): Promise<BrownfieldDiscrepancyCreate[]> {
    if (!this.llmProvider) return [];

    const aiDiscrepancies: BrownfieldDiscrepancyCreate[] = [];

    // Analyze modules in batches to avoid context overflow
    const BATCH_SIZE = 5;
    const totalModules = this.context.modules.length;

    for (let i = 0; i < totalModules; i += BATCH_SIZE) {
      const batch = this.context.modules.slice(i, Math.min(i + BATCH_SIZE, totalModules));

      this.logger.log(`AI analyzing modules ${i + 1}-${Math.min(i + BATCH_SIZE, totalModules)} of ${totalModules}...`);

      for (const module of batch) {
        try {
          const moduleDiscrepancies = await this.analyzeModuleWithAI(module);
          aiDiscrepancies.push(...moduleDiscrepancies);
        } catch (error) {
          this.logger.warn(`AI analysis failed for module ${module.name}: ${error}`);
        }
      }
    }

    return aiDiscrepancies;
  }

  /**
   * Analyze a single module with AI for semantic discrepancies
   */
  private async analyzeModuleWithAI(module: ModuleInfo): Promise<BrownfieldDiscrepancyCreate[]> {
    if (!this.llmProvider) return [];

    // Read sample code from the module
    const codeFiles = this.context.codeFiles.filter(f =>
      f.relativePath.startsWith(module.path) || path.dirname(f.relativePath) === module.path
    );

    if (codeFiles.length === 0) return [];

    // Read first file as sample (limit to 2000 chars)
    let sampleCode = '';
    try {
      const firstFile = codeFiles[0];
      const content = fs.readFileSync(firstFile.path, 'utf-8');
      sampleCode = content.slice(0, 2000);
    } catch {
      return [];
    }

    // Find related docs
    const relatedDocs = this.context.docs.filter(d =>
      d.relativePath.toLowerCase().includes(module.name.toLowerCase()) ||
      d.topics.some(t => t.toLowerCase().includes(module.name.toLowerCase()))
    );

    const docSummary = relatedDocs.length > 0
      ? relatedDocs.map(d => `${d.relativePath}: ${d.title || 'No title'}`).join('\n')
      : 'No documentation found';

    const prompt = `Analyze this code module for documentation quality:

MODULE: ${module.name}
EXPORTS: ${module.exports.slice(0, 10).map(e => `${e.name} (${e.type})`).join(', ')}

SAMPLE CODE:
\`\`\`typescript
${sampleCode}
\`\`\`

RELATED DOCS:
${docSummary}

Identify documentation issues. Return JSON array of issues:
[{"type": "missing-docs"|"stale-docs"|"incomplete-docs", "summary": "brief description", "details": "explanation", "priority": "critical"|"high"|"medium"|"low", "confidence": 0-100}]

Only include issues with confidence > 70. Return empty array [] if no issues found.`;

    try {
      const result = await this.llmProvider.analyzeStructured<Array<{
        type: 'missing-docs' | 'stale-docs' | 'incomplete-docs';
        summary: string;
        details: string;
        priority: 'critical' | 'high' | 'medium' | 'low';
        confidence: number;
      }>>(prompt, {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              summary: { type: 'string' },
              details: { type: 'string' },
              priority: { type: 'string' },
              confidence: { type: 'number' },
            },
            required: ['type', 'summary', 'details', 'priority', 'confidence'],
          },
        },
        timeout: 60000,
      });

      // Convert AI results to discrepancies
      return result.data
        .filter(item => item.confidence > 70)
        .map(item => ({
          type: item.type as BrownfieldDiscrepancyType,
          module: module.name,
          codeLocation: module.path,
          summary: item.summary,
          details: item.details,
          evidence: { aiAnalyzed: true },
          priority: item.priority,
          confidence: item.confidence,
          autoDetected: true,
          status: 'pending' as const,
          detectedAt: new Date().toISOString(),
          detectedBy: `ai-${this.llmProvider!.name}`,
          lastChecked: new Date().toISOString(),
        }));
    } catch (error) {
      this.logger.warn(`AI analysis failed for ${module.name}: ${error}`);
      return [];
    }
  }

  /**
   * Phase 5: Reporting - Generate summary
   */
  private async runReportingPhase(discrepancyCount: number): Promise<void> {
    this.logger.log('Generating report...');

    const stats = await this.discrepancyManager.getStats();

    const report = {
      generatedAt: new Date().toISOString(),
      analysisDepth: this.context.depth,
      codebase: {
        codeFiles: this.context.codeFiles.length,
        docFiles: this.context.docFiles.length,
        modules: this.context.modules.length,
      },
      discrepancies: {
        total: discrepancyCount,
        byType: stats.byType,
        byPriority: stats.byPriority,
      },
      recommendations: this.generateRecommendations(stats),
    };

    // Save report
    const reportPath = path.join(
      this.projectPath,
      '.specweave',
      'discrepancies',
      'latest-report.json'
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.logger.log(`Report saved to ${reportPath}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Helper methods
  // ─────────────────────────────────────────────────────────────

  private findFiles(
    dir: string,
    extensions: string[],
    types: Array<'code' | 'doc' | 'config'>,
    maxDepth = 10
  ): FileInfo[] {
    const files: FileInfo[] = [];
    this.walkDir(dir, extensions, files, '', maxDepth, types[0]);
    return files;
  }

  private walkDir(
    dir: string,
    extensions: string[],
    files: FileInfo[],
    relativePath: string,
    depth: number,
    type: 'code' | 'doc' | 'config'
  ): void {
    if (depth <= 0) return;
    if (!fs.existsSync(dir)) return;

    // Skip common non-code directories
    const skipDirs = ['node_modules', '.git', '.specweave', 'dist', 'build', 'coverage'];
    const dirName = path.basename(dir);
    if (skipDirs.includes(dirName)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          this.walkDir(fullPath, extensions, files, relPath, depth - 1, type);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            const stats = fs.statSync(fullPath);
            files.push({
              path: fullPath,
              relativePath: relPath,
              type,
              extension: ext,
              size: stats.size,
              lastModified: stats.mtime,
            });
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  private analyzeModule(modulePath: string, files: FileInfo[]): ModuleInfo | null {
    const exports: ExportInfo[] = [];
    let lastModified = new Date(0);

    for (const file of files) {
      if (file.lastModified > lastModified) {
        lastModified = file.lastModified;
      }

      // Quick analysis: look for export statements
      try {
        const content = fs.readFileSync(file.path, 'utf-8');
        const fileExports = this.extractExports(content, file);
        exports.push(...fileExports);
      } catch {
        // Skip files that can't be read
      }
    }

    if (exports.length === 0 && this.context.depth === 'quick') {
      return null;
    }

    return {
      name: modulePath || 'root',
      path: modulePath,
      exports,
      hasTests: files.some(f => f.relativePath.includes('.test.') || f.relativePath.includes('.spec.')),
      lastModified,
    };
  }

  private extractExports(content: string, file: FileInfo): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const lines = content.split('\n');

    // Simple regex patterns for exports
    const exportPatterns = [
      { regex: /export\s+(?:async\s+)?function\s+(\w+)/g, type: 'function' as const },
      { regex: /export\s+class\s+(\w+)/g, type: 'class' as const },
      { regex: /export\s+(?:type|interface)\s+(\w+)/g, type: 'type' as const },
      { regex: /export\s+const\s+(\w+)/g, type: 'const' as const },
      { regex: /export\s+\{\s*([^}]+)\s*\}/g, type: 'variable' as const },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of exportPatterns) {
        const matches = line.matchAll(pattern.regex);
        for (const match of matches) {
          const name = match[1].trim();

          // Check if previous line has doc comment
          const hasDocComment = i > 0 && (
            lines[i - 1].trim().startsWith('*/') ||
            lines[i - 1].trim().startsWith('* ') ||
            lines[i - 1].trim().startsWith('//')
          );

          if (pattern.type === 'variable') {
            // Handle export { a, b, c }
            const names = name.split(',').map(n => n.trim().split(' ')[0]);
            for (const n of names) {
              if (n && !n.includes('type')) {
                exports.push({
                  name: n,
                  type: 'variable',
                  line: i + 1,
                  hasDocComment: false, // Can't easily detect for re-exports
                });
              }
            }
          } else {
            exports.push({
              name,
              type: pattern.type,
              line: i + 1,
              hasDocComment,
              signature: line.trim().slice(0, 100),
            });
          }
        }
      }
    }

    return exports;
  }

  private parseDocFile(file: FileInfo): DocInfo | null {
    try {
      const content = fs.readFileSync(file.path, 'utf-8');

      // Extract title (first heading)
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1];

      // Extract topics (other headings)
      const headingMatches = content.matchAll(/^#{2,}\s+(.+)$/gm);
      const topics = Array.from(headingMatches).map(m => m[1]);

      // Word count
      const wordCount = content.split(/\s+/).length;

      return {
        path: file.path,
        relativePath: file.relativePath,
        title,
        topics,
        lastModified: file.lastModified,
        wordCount,
      };
    } catch {
      return null;
    }
  }

  private calculatePriority(
    undocumentedCount: number,
    totalCount: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    const ratio = undocumentedCount / totalCount;

    if (ratio > 0.8 && undocumentedCount > 5) {
      return 'critical';
    }
    if (ratio > 0.5 && undocumentedCount > 3) {
      return 'high';
    }
    if (ratio > 0.3) {
      return 'medium';
    }
    return 'low';
  }

  private generateRecommendations(
    stats: ReturnType<BrownfieldDiscrepancyManager['getStats']> extends Promise<infer T> ? T : never
  ): string[] {
    const recommendations: string[] = [];

    if (stats.byType['missing-docs'] > 10) {
      recommendations.push('Consider creating a documentation sprint to address missing docs');
    }

    if (stats.byType['stale-docs'] > 5) {
      recommendations.push('Review and update stale documentation');
    }

    if (stats.byPriority.critical > 0) {
      recommendations.push('Address critical discrepancies first - they may impact onboarding');
    }

    if (stats.total > 50) {
      recommendations.push('Consider using /sw:discrepancy-to-increment to batch discrepancies');
    }

    return recommendations;
  }
}

/**
 * Run brownfield analysis for a job
 */
export async function runBrownfieldAnalysis(
  projectPath: string,
  jobId: string,
  config: BrownfieldJobConfig,
  options: { logger?: Logger } = {}
): Promise<number> {
  const worker = new BrownfieldAnalysisWorker(projectPath, jobId, config, options);
  return worker.run();
}
