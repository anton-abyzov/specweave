/**
 * LSP Integration for Living Docs
 *
 * Provides LSP-enhanced code analysis for living docs generation.
 * Falls back to grep-based analysis when LSP is unavailable.
 *
 * @module core/lsp/lsp-living-docs-integration
 */

import { LSPManager } from './lsp-manager.js';
import { consoleLogger as logger } from '../../utils/logger.js';
import * as path from 'path';
import * as fs from 'fs';

export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'unknown';
  filePath: string;
  line: number;
  documentation?: string;
}

export interface CodeAnalysisResult {
  symbols: SymbolInfo[];
  usedLSP: boolean;
  analysisTimeMs: number;
}

export interface LSPLivingDocsAnalyzerOptions {
  /** Skip LSP initialization entirely - use grep-only mode */
  skipLSP?: boolean;
  /** Timeout for initialization in ms (default: 5000) */
  initTimeoutMs?: number;
}

/**
 * Analyze code files using LSP (with grep fallback)
 */
export class LSPLivingDocsAnalyzer {
  private lspManager: LSPManager | null = null;
  private projectRoot: string;
  private options: LSPLivingDocsAnalyzerOptions;
  private initializationAttempted = false;

  constructor(projectRoot: string, options: LSPLivingDocsAnalyzerOptions = {}) {
    this.projectRoot = projectRoot;
    this.options = {
      skipLSP: options.skipLSP ?? false,
      initTimeoutMs: options.initTimeoutMs ?? 5000,
    };
  }

  /**
   * Initialize LSP manager (with timeout protection)
   */
  async initialize(): Promise<void> {
    // Skip if already attempted or skipLSP is set
    if (this.initializationAttempted) return;
    this.initializationAttempted = true;

    if (this.options.skipLSP) {
      logger.info('LSP skipped by configuration, using grep-based analysis');
      return;
    }

    try {
      this.lspManager = new LSPManager({ projectRoot: this.projectRoot });

      // Wrap initialization with timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('LSP initialization timeout')), this.options.initTimeoutMs);
      });

      await Promise.race([this.lspManager.initialize(), timeoutPromise]);

      const stats = this.lspManager.getStatistics();
      if (stats.clientCount > 0) {
        logger.info(`LSP initialized with support for: ${stats.availableLanguages.join(', ')}`);
      } else {
        logger.info('No LSP servers available, using grep-based analysis');
        this.lspManager = null;
      }
    } catch (error) {
      logger.warn(`Failed to initialize LSP: ${error}`);
      // Clean up on failure
      if (this.lspManager) {
        try {
          await this.lspManager.shutdown();
        } catch {
          // Ignore shutdown errors
        }
      }
      this.lspManager = null;
    }
  }

  /**
   * Analyze files and extract symbols
   */
  async analyzeFiles(files: string[]): Promise<CodeAnalysisResult> {
    const startTime = Date.now();

    // Initialize LSP if not skipped and not yet attempted
    if (!this.options.skipLSP && !this.initializationAttempted) {
      await this.initialize();
    }

    const allResults = await Promise.all(files.map(file => this.analyzeFile(file)));
    const symbols = allResults.flatMap(r => r.symbols);
    const usedLSP = allResults.some(r => r.usedLSP);

    return { symbols, usedLSP, analysisTimeMs: Date.now() - startTime };
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string): Promise<CodeAnalysisResult> {
    const startTime = Date.now();

    // Try LSP first
    if (this.lspManager?.isAvailableForFile(filePath)) {
      try {
        const lspSymbols = await this.lspManager.findSymbols(filePath);
        if (lspSymbols.length > 0) {
          const symbols = lspSymbols.map(name => ({ name, kind: 'unknown' as const, filePath, line: 0 }));
          return { symbols, usedLSP: true, analysisTimeMs: Date.now() - startTime };
        }
      } catch (error) {
        logger.debug(`LSP analysis failed for ${filePath}, falling back to grep: ${error}`);
      }
    }

    // Fallback to grep-based analysis
    const symbols = await this.grepAnalyzeFile(filePath);
    return { symbols, usedLSP: false, analysisTimeMs: Date.now() - startTime };
  }

  /**
   * Grep-based analysis fallback
   */
  private async grepAnalyzeFile(filePath: string): Promise<SymbolInfo[]> {
    const symbols: SymbolInfo[] = [];
    const ext = path.extname(filePath);

    try {
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
      const patterns = this.getPatternsForExtension(ext);

      lines.forEach((line, idx) => {
        for (const { regex, kind } of patterns) {
          const match = line.match(regex);
          if (match) {
            symbols.push({ name: match[1], kind, filePath, line: idx + 1 });
          }
        }
      });
    } catch (error) {
      logger.error(`Failed to analyze file ${filePath}: ${error}`);
    }

    return symbols;
  }

  /**
   * Get regex patterns for file extension
   */
  private getPatternsForExtension(ext: string): Array<{ regex: RegExp; kind: SymbolInfo['kind'] }> {
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return [
        { regex: /^export\s+(?:async\s+)?function\s+(\w+)/, kind: 'function' },
        { regex: /^export\s+class\s+(\w+)/, kind: 'class' },
        { regex: /^export\s+interface\s+(\w+)/, kind: 'interface' },
        { regex: /^export\s+type\s+(\w+)/, kind: 'type' },
      ];
    }
    if (ext === '.py') {
      return [
        { regex: /^def\s+(\w+)/, kind: 'function' },
        { regex: /^class\s+(\w+)/, kind: 'class' },
      ];
    }
    return [];
  }

  /**
   * Shutdown LSP manager (with timeout protection)
   */
  async shutdown(): Promise<void> {
    if (this.lspManager) {
      try {
        // Wrap shutdown with 3s timeout to prevent hanging
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            logger.warn('LSP shutdown timed out, forcing cleanup');
            resolve();
          }, 3000);
        });

        await Promise.race([this.lspManager.shutdown(), timeoutPromise]);
      } catch (error) {
        logger.warn(`LSP shutdown error: ${error}`);
      } finally {
        this.lspManager = null;
      }
    }
  }
}

/**
 * Quick helper to analyze code with automatic LSP/grep selection
 */
export async function analyzeCodeForLivingDocs(
  projectRoot: string,
  files: string[]
): Promise<CodeAnalysisResult> {
  const analyzer = new LSPLivingDocsAnalyzer(projectRoot);
  await analyzer.initialize();

  try {
    return await analyzer.analyzeFiles(files);
  } finally {
    await analyzer.shutdown();
  }
}
