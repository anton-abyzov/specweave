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
    const symbols: SymbolInfo[] = [];
    let usedLSP = false;

    if (!this.lspManager) {
      await this.initialize();
    }

    for (const file of files) {
      const fileSymbols = await this.analyzeFile(file);
      symbols.push(...fileSymbols.symbols);
      if (fileSymbols.usedLSP) {
        usedLSP = true;
      }
    }

    const analysisTimeMs = Date.now() - startTime;

    return {
      symbols,
      usedLSP,
      analysisTimeMs
    };
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string): Promise<CodeAnalysisResult> {
    const startTime = Date.now();

    // Try LSP first
    if (this.lspManager && this.lspManager.isAvailableForFile(filePath)) {
      try {
        const symbols = await this.lspManager.findSymbols(filePath);
        if (symbols.length > 0) {
          return {
            symbols: symbols.map(name => ({
              name,
              kind: 'unknown' as const,
              filePath,
              line: 0
            })),
            usedLSP: true,
            analysisTimeMs: Date.now() - startTime
          };
        }
      } catch (error) {
        logger.debug(`LSP analysis failed for ${filePath}, falling back to grep: ${error}`);
      }
    }

    // Fallback to grep-based analysis
    const symbols = await this.grepAnalyzeFile(filePath);
    return {
      symbols,
      usedLSP: false,
      analysisTimeMs: Date.now() - startTime
    };
  }

  /**
   * Grep-based analysis fallback
   */
  private async grepAnalyzeFile(filePath: string): Promise<SymbolInfo[]> {
    const symbols: SymbolInfo[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const ext = path.extname(filePath);

      // TypeScript/JavaScript
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        lines.forEach((line, idx) => {
          // Functions
          const funcMatch = line.match(/^export\s+(async\s+)?function\s+(\w+)/);
          if (funcMatch) {
            symbols.push({
              name: funcMatch[2],
              kind: 'function',
              filePath,
              line: idx + 1
            });
          }

          // Classes
          const classMatch = line.match(/^export\s+(class|interface)\s+(\w+)/);
          if (classMatch) {
            symbols.push({
              name: classMatch[2],
              kind: classMatch[1] === 'class' ? 'class' : 'interface',
              filePath,
              line: idx + 1
            });
          }

          // Types
          const typeMatch = line.match(/^export\s+type\s+(\w+)/);
          if (typeMatch) {
            symbols.push({
              name: typeMatch[1],
              kind: 'type',
              filePath,
              line: idx + 1
            });
          }
        });
      }

      // Python
      if (ext === '.py') {
        lines.forEach((line, idx) => {
          // Functions
          const funcMatch = line.match(/^def\s+(\w+)/);
          if (funcMatch) {
            symbols.push({
              name: funcMatch[1],
              kind: 'function',
              filePath,
              line: idx + 1
            });
          }

          // Classes
          const classMatch = line.match(/^class\s+(\w+)/);
          if (classMatch) {
            symbols.push({
              name: classMatch[1],
              kind: 'class',
              filePath,
              line: idx + 1
            });
          }
        });
      }

    } catch (error) {
      logger.error(`Failed to analyze file ${filePath}: ${error}`);
    }

    return symbols;
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
