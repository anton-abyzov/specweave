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

/**
 * Analyze code files using LSP (with grep fallback)
 */
export class LSPLivingDocsAnalyzer {
  private lspManager: LSPManager | null = null;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Initialize LSP manager
   */
  async initialize(): Promise<void> {
    try {
      this.lspManager = new LSPManager({ projectRoot: this.projectRoot });
      await this.lspManager.initialize();

      const stats = this.lspManager.getStatistics();
      if (stats.clientCount > 0) {
        logger.info(`LSP initialized with support for: ${stats.availableLanguages.join(', ')}`);
      } else {
        logger.info('No LSP servers available, using grep-based analysis');
        this.lspManager = null;
      }
    } catch (error) {
      logger.warn(`Failed to initialize LSP: ${error}`);
      this.lspManager = null;
    }
  }

  /**
   * Analyze files and extract symbols
   */
  async analyzeFiles(files: string[]): Promise<CodeAnalysisResult> {
    const startTime = Date.now();
    if (!this.lspManager) await this.initialize();

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
   * Shutdown LSP manager
   */
  async shutdown(): Promise<void> {
    if (this.lspManager) {
      await this.lspManager.shutdown();
      this.lspManager = null;
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
