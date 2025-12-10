/**
 * Living Docs Orchestrator
 *
 * Main coordinator that manages the entire analysis pipeline with caching and change detection.
 *
 * Architecture:
 * Phase 1: Discovery (repo scanning)
 * Phase 2: Analysis (patterns, modules, tech debt)
 * Phase 3: Synthesis (ADR generation with LLM)
 */

import * as fs from 'fs';
import * as path from 'path';
import {execSync} from 'child_process';
import { Logger, consoleLogger } from '../../../utils/logger.js';
import { runIntelligentAnalysis } from './index.js';
import type { RepoAnalysis, LLMProvider, ProgressCallback } from './types.js';

export interface OrchestratorOptions {
  projectRoot: string;
  logger?: Logger;
  llmProvider?: LLMProvider;
}

export interface UpdateOptions {
  incremental?: boolean;  // Use Git diff for changes
  full?: boolean;         // Ignore cache, rebuild everything
  adrOnly?: boolean;      // Only run ADR discovery
  techDebtOnly?: boolean; // Only run tech debt analysis
  modulesOnly?: boolean;  // Only rebuild module graph
  dryRun?: boolean;       // Show what would be updated
}

export interface DiscoveryResult {
  repos: Array<{ name: string; path: string }>;
  totalFiles: number;
  duration: number;
}

export interface AnalysisResult {
  repoAnalyses: Map<string, RepoAnalysis>;
  duration: number;
  filesCreated?: string[];
}

export interface SynthesisResult {
  adrsGenerated: number;
  teamsClustered: number;
  duration: number;
  filesCreated?: string[];
}

export interface PhaseResult {
  success: boolean;
  duration: number;
  message: string;
}

export interface UpdateResult {
  success: boolean;
  duration: number;
  phases: {
    discovery: PhaseResult;
    analysis: PhaseResult;
    synthesis: PhaseResult;
  };
  filesCreated: string[];
  filesUpdated: string[];
  errors: string[];
}

export interface ChangedFiles {
  path: string;
  status: 'added' | 'modified' | 'deleted';
}

/**
 * Main orchestrator for living docs intelligent analysis.
 *
 * Coordinates all analysis phases with caching and Git-based change detection.
 */
export class LivingDocsOrchestrator {
  private projectRoot: string;
  private logger: Logger;
  private llmProvider?: LLMProvider;
  private cacheDir: string;

  constructor(options: OrchestratorOptions) {
    this.projectRoot = options.projectRoot;
    this.logger = options.logger ?? consoleLogger;
    this.llmProvider = options.llmProvider;
    this.cacheDir = path.join(this.projectRoot, '.specweave/cache/analysis');

    // Ensure cache directory exists
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  /**
   * Main entry point - orchestrates full update or incremental update.
   */
  async update(options: UpdateOptions = {}): Promise<UpdateResult> {
    const startTime = Date.now();
    const result: UpdateResult = {
      success: false,
      duration: 0,
      phases: {
        discovery: { success: false, duration: 0, message: '' },
        analysis: { success: false, duration: 0, message: '' },
        synthesis: { success: false, duration: 0, message: '' },
      },
      filesCreated: [],
      filesUpdated: [],
      errors: [],
    };

    try {
      this.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.info('LIVING DOCS INTELLIGENT ANALYSIS');
      this.logger.info(`Mode: ${options.full ? 'FULL' : 'INCREMENTAL'}`);
      this.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.info('');

      // Clear cache if full rebuild requested (AC-US6-04)
      if (options.full) {
        this.logger.info('🔄 FULL MODE - Clearing cache and checkpoints...');
        await this.clearCache();
        this.logger.info('');
      }

      // Dry run - show what would be updated
      if (options.dryRun) {
        this.logger.info('DRY RUN MODE - No changes will be made');
        const changedFiles = await this.detectChanges();
        this.logger.info(`Would analyze ${changedFiles.length} changed files`);
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // Phase 1: Discovery
      const discoveryResult = await this.executePhase1Discovery();
      result.phases.discovery = {
        success: true,
        duration: discoveryResult.duration,
        message: `Discovered ${discoveryResult.repos.length} repos (${discoveryResult.totalFiles} files)`,
      };

      // Phase 2: Analysis (if not adrOnly/techDebtOnly)
      if (!options.adrOnly && !options.techDebtOnly) {
        const analysisResult = await this.executePhase2Analysis(discoveryResult.repos);
        result.phases.analysis = {
          success: true,
          duration: analysisResult.duration,
          message: `Analyzed ${analysisResult.repoAnalyses.size} repos`,
        };
        // Track files created during analysis
        if (analysisResult.filesCreated) {
          result.filesCreated.push(...analysisResult.filesCreated);
        }
      }

      // Phase 3: Synthesis (ADRs, teams, architecture)
      const synthesisResult = await this.executePhase3Synthesis(discoveryResult.repos);
      result.phases.synthesis = {
        success: true,
        duration: synthesisResult.duration,
        message: `Generated ${synthesisResult.adrsGenerated} ADRs, ${synthesisResult.teamsClustered} teams`,
      };
      // Track files created during synthesis
      if (synthesisResult.filesCreated) {
        result.filesCreated.push(...synthesisResult.filesCreated);
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      // Enhanced update logging (AC-US6-06)
      this.logger.info('');
      this.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.info(`✅ LIVING DOCS UPDATE COMPLETE`);
      this.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.info('');

      // Show what was updated
      this.logger.info('📊 SUMMARY:');
      this.logger.info('');

      if (result.phases.discovery.success) {
        this.logger.info(`  Discovery: ${result.phases.discovery.message}`);
        this.logger.info(`    Duration: ${Math.round(result.phases.discovery.duration / 1000)}s`);
      }

      if (result.phases.analysis.success) {
        this.logger.info(`  Analysis: ${result.phases.analysis.message}`);
        this.logger.info(`    Duration: ${Math.round(result.phases.analysis.duration / 1000)}s`);
      }

      if (result.phases.synthesis.success) {
        this.logger.info(`  Synthesis: ${result.phases.synthesis.message}`);
        this.logger.info(`    Duration: ${Math.round(result.phases.synthesis.duration / 1000)}s`);
      }

      this.logger.info('');

      if (result.filesCreated.length > 0) {
        this.logger.info(`  Files Created: ${result.filesCreated.length}`);
        result.filesCreated.slice(0, 5).forEach(file => this.logger.info(`    • ${file}`));
        if (result.filesCreated.length > 5) {
          this.logger.info(`    ... and ${result.filesCreated.length - 5} more`);
        }
      }

      if (result.filesUpdated.length > 0) {
        this.logger.info(`  Files Updated: ${result.filesUpdated.length}`);
        result.filesUpdated.slice(0, 5).forEach(file => this.logger.info(`    • ${file}`));
        if (result.filesUpdated.length > 5) {
          this.logger.info(`    ... and ${result.filesUpdated.length - 5} more`);
        }
      }

      this.logger.info('');
      this.logger.info(`  Total Duration: ${Math.round(result.duration / 1000)}s`);
      this.logger.info(`  Mode: ${options.full ? 'FULL (cache bypassed)' : 'INCREMENTAL (cache used)'}`);
      this.logger.info('');
      this.logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Save last update info to cache
      await this.saveToCache('last-update.json', {
        timestamp: new Date().toISOString(),
        commit: this.getCurrentCommit(),
        duration: result.duration,
        mode: options.full ? 'full' : 'incremental',
        filesCreated: result.filesCreated.length,
        filesUpdated: result.filesUpdated.length,
      });

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.logger.error(`Analysis failed: ${error}`);
    }

    return result;
  }

  /**
   * Phase 1: Discovery
   * Scans all repos (umbrella or single) and creates file inventory.
   */
  private async executePhase1Discovery(): Promise<DiscoveryResult> {
    const startTime = Date.now();
    this.logger.info('📂 Phase 1: Discovery');
    this.logger.info('');

    // Detect repos (umbrella or single)
    const repos = await this.discoverRepos();

    let totalFiles = 0;
    for (const repo of repos) {
      const fileCount = this.countFiles(repo.path);
      totalFiles += fileCount;
      this.logger.info(`  ✓ ${repo.name} (${fileCount} files)`);
    }

    const duration = Date.now() - startTime;
    this.logger.info('');
    this.logger.info(`✅ Discovery complete (${Math.round(duration / 1000)}s)`);
    this.logger.info('');

    return { repos, totalFiles, duration };
  }

  /**
   * Phase 2: Analysis
   * Pattern detection, module graph, tech debt detection.
   */
  private async executePhase2Analysis(repos: Array<{ name: string; path: string }>): Promise<AnalysisResult> {
    const startTime = Date.now();
    this.logger.info('🔍 Phase 2: Analysis');
    this.logger.info('');

    // Use existing intelligent analysis (refactored in future tasks)
    const analysisOptions = {
      projectPath: this.projectRoot,
      repos,
      llmProvider: this.llmProvider,
      onProgress: (phase: string, current: number, total: number, message: string) => {
        this.logger.info(`  [${phase}] ${current}/${total} - ${message}`);
      },
      log: (msg: string) => this.logger.info(`  ${msg}`),
    };

    const { repoAnalyses, savedFiles } = await runIntelligentAnalysis(analysisOptions);

    const duration = Date.now() - startTime;
    this.logger.info('');
    this.logger.info(`✅ Analysis complete (${Math.round(duration / 1000)}s)`);
    this.logger.info('');

    return { repoAnalyses, duration, filesCreated: savedFiles };
  }

  /**
   * Phase 3: Synthesis
   * LLM-powered ADR synthesis, team clustering, architecture docs.
   */
  private async executePhase3Synthesis(repos: Array<{ name: string; path: string }>): Promise<SynthesisResult> {
    const startTime = Date.now();
    this.logger.info('💎 Phase 3: Synthesis (LLM-powered)');
    this.logger.info('');

    // This will be expanded in future tasks (T-013 to T-016)
    // For now, we leverage the existing intelligent analysis synthesis phases
    const adrsGenerated = 0; // TODO: Count from architecture-generator.ts
    const teamsClustered = 0; // TODO: Count from organization-synthesizer.ts

    const duration = Date.now() - startTime;
    this.logger.info('');
    this.logger.info(`✅ Synthesis complete (${Math.round(duration / 1000)}s)`);
    this.logger.info('');

    return { adrsGenerated, teamsClustered, duration };
  }

  /**
   * Detect changes since last update using Git diff.
   */
  async detectChanges(): Promise<ChangedFiles[]> {
    try {
      const lastUpdate = await this.loadFromCache<{ commit: string }>('last-update.json');
      if (!lastUpdate || !lastUpdate.commit) {
        // No previous update, consider all files changed
        return [];
      }

      const currentCommit = this.getCurrentCommit();
      if (lastUpdate.commit === currentCommit) {
        // No changes since last update
        return [];
      }

      // Run git diff to get changed files
      const diffOutput = execSync(
        `git diff --name-status ${lastUpdate.commit} ${currentCommit}`,
        { cwd: this.projectRoot, encoding: 'utf-8' }
      );

      const changedFiles: ChangedFiles[] = [];
      for (const line of diffOutput.split('\n')) {
        if (!line.trim()) continue;

        const [status, filePath] = line.split('\t');
        if (!filePath) continue;

        changedFiles.push({
          path: filePath,
          status: status.startsWith('A') ? 'added' :
                  status.startsWith('M') ? 'modified' :
                  status.startsWith('D') ? 'deleted' : 'modified',
        });
      }

      return changedFiles;
    } catch (error) {
      this.logger.warn(`Git diff failed: ${error}`);
      return [];
    }
  }

  /**
   * Load data from cache.
   */
  async loadFromCache<T>(key: string): Promise<T | null> {
    const cachePath = path.join(this.cacheDir, key);
    if (!fs.existsSync(cachePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      this.logger.warn(`Failed to load cache ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Save data to cache.
   */
  async saveToCache(key: string, data: any): Promise<void> {
    const cachePath = path.join(this.cacheDir, key);
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
  }

  /**
   * Clear all cache and checkpoint data.
   * Used when --full flag is set to force complete rebuild.
   */
  async clearCache(): Promise<void> {
    try {
      // Clear cache directory
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
        this.logger.info(`  ✓ Cleared ${files.length} cache files`);
      }

      // Clear intelligent analysis checkpoint
      const checkpointPath = path.join(
        this.projectRoot,
        '.specweave/docs/internal/temp/intelligent-analysis-checkpoint.json'
      );
      if (fs.existsSync(checkpointPath)) {
        fs.unlinkSync(checkpointPath);
        this.logger.info('  ✓ Cleared intelligent analysis checkpoint');
      }
    } catch (error) {
      this.logger.warn(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Discover all repos (umbrella or single).
   */
  private async discoverRepos(): Promise<Array<{ name: string; path: string }>> {
    const configPath = path.join(this.projectRoot, '.specweave/config.json');
    if (!fs.existsSync(configPath)) {
      // Single repo mode
      return [{ name: 'main', path: this.projectRoot }];
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.umbrella && config.umbrella.childRepos) {
        // Multi-repo umbrella mode
        return config.umbrella.childRepos.map((repo: any) => ({
          name: repo.name,
          path: path.join(this.projectRoot, repo.path),
        }));
      }
    } catch (error) {
      this.logger.warn(`Failed to load config: ${error}`);
    }

    // Fallback to single repo
    return [{ name: 'main', path: this.projectRoot }];
  }

  /**
   * Get current Git commit hash.
   */
  private getCurrentCommit(): string {
    try {
      return execSync('git rev-parse HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Count files in a directory (excluding node_modules, .git, etc.).
   */
  private countFiles(dirPath: string): number {
    let count = 0;
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.specweave'];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (excludeDirs.includes(entry.name)) continue;

          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            count++;
          }
        }
      } catch {
        // Ignore permission errors
      }
    };

    walk(dirPath);
    return count;
  }
}
