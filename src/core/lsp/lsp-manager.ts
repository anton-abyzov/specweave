/**
 * LSP Manager
 *
 * Manages multiple LSP clients and provides unified interface for semantic analysis.
 * Automatically detects and initializes appropriate language servers.
 *
 * For TypeScript projects, uses TsServerClient (direct tsserver protocol) instead
 * of typescript-language-server, which has issues with large projects (>500 files).
 *
 * @module core/lsp/lsp-manager
 */

import {
  LSPClient,
  detectLSPServers,
  LSPDefinitionResult,
  LSPReferencesResult,
  LSPHoverResult,
  LSPDocumentSymbolsResult,
  LSPWorkspaceSymbolsResult,
} from './lsp-client.js';
import { TsServerClient } from './tsserver-client.js';
import { consoleLogger as logger } from '../../utils/logger.js';
import * as path from 'path';
import * as fs from 'fs';

/** Common interface for both LSP and TsServer clients */
interface CodeIntelligenceClient {
  initialize(): Promise<boolean>;
  warmup(entryFiles?: string[]): Promise<boolean>;
  isWarmedUp(): boolean;
  goToDefinition(filePath: string, line: number, character: number): Promise<LSPDefinitionResult>;
  findReferences(filePath: string, line: number, character: number): Promise<LSPReferencesResult>;
  hover(filePath: string, line: number, character: number): Promise<LSPHoverResult>;
  documentSymbols(filePath: string): Promise<LSPDocumentSymbolsResult>;
  workspaceSymbols(query: string): Promise<LSPWorkspaceSymbolsResult>;
  shutdown(): Promise<void>;
}

export interface LSPManagerOptions {
  projectRoot: string;
  enabledLanguages?: string[];
}

/**
 * Manages LSP clients for multiple languages
 */
export class LSPManager {
  private clients: Map<string, CodeIntelligenceClient> = new Map();
  private projectRoot: string;
  private initialized = false;

  constructor(options: LSPManagerOptions) {
    this.projectRoot = options.projectRoot;
  }

  /**
   * Initialize all available LSP servers
   * For TypeScript, uses TsServerClient (direct protocol) instead of
   * typescript-language-server which has issues with large projects.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check for TypeScript project first - use TsServerClient directly
      const hasTypeScript = this.hasTypeScriptProject();
      if (hasTypeScript) {
        logger.debug('TypeScript project detected, using direct tsserver client');
        const tsClient = new TsServerClient(this.projectRoot);
        const success = await tsClient.initialize();
        if (success) {
          this.clients.set('typescript', tsClient);
          logger.info('TsServer client for typescript initialized');
        } else {
          logger.warn('Failed to initialize TsServer client');
        }
      }

      // Detect and initialize other LSP servers (Python, Go, etc.)
      const servers = await detectLSPServers(this.projectRoot);
      const nonTsServers = servers.filter(
        (s) => !s.command.includes('typescript')
      );

      if (nonTsServers.length > 0) {
        logger.info(`Found ${nonTsServers.length} additional LSP server(s)`);

        for (const config of nonTsServers) {
          const client = new LSPClient(config);
          const success = await client.initialize();

          if (success) {
            const lang = this.getLanguageFromCommand(config.command);
            this.clients.set(lang, client);
            logger.info(`LSP client for ${lang} initialized`);
          } else {
            logger.warn(`Failed to initialize LSP for ${config.command}`);
          }
        }
      }

      if (this.clients.size === 0) {
        logger.info('No code intelligence clients available. Semantic analysis will use grep fallback.');
      }

      this.initialized = true;
    } catch (error) {
      logger.error(`LSP initialization failed: ${error}`);
      this.initialized = true; // Continue without LSP
    }
  }

  /**
   * Check if project has TypeScript configuration
   */
  private hasTypeScriptProject(): boolean {
    return (
      fs.existsSync(path.join(this.projectRoot, 'tsconfig.json')) ||
      fs.existsSync(path.join(this.projectRoot, 'package.json'))
    );
  }

  /**
   * Get language from LSP command
   */
  private getLanguageFromCommand(command: string): string {
    if (command.includes('typescript')) return 'typescript';
    if (command.includes('pylsp') || command.includes('pyright')) return 'python';
    if (command.includes('gopls')) return 'go';
    if (command.includes('rust-analyzer')) return 'rust';
    return 'unknown';
  }

  /**
   * Get code intelligence client for a file
   */
  private getClientForFile(filePath: string): CodeIntelligenceClient | null {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'typescript',
      '.jsx': 'typescript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
    };

    const lang = langMap[ext];
    return lang ? this.clients.get(lang) || null : null;
  }

  /**
   * Check if LSP is available for a file
   */
  isAvailableForFile(filePath: string): boolean {
    return this.getClientForFile(filePath) !== null;
  }

  /**
   * Go to definition using LSP
   */
  async goToDefinition(filePath: string, line: number, character: number): Promise<LSPDefinitionResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = this.getClientForFile(filePath);
    if (!client) {
      logger.debug(`No LSP client available for ${filePath}`);
      return null;
    }

    return await client.goToDefinition(filePath, line, character);
  }

  /**
   * Find references using LSP
   */
  async findReferences(filePath: string, line: number, character: number): Promise<LSPReferencesResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = this.getClientForFile(filePath);
    if (!client) {
      logger.debug(`No LSP client available for ${filePath}`);
      return null;
    }

    return await client.findReferences(filePath, line, character);
  }

  /**
   * Get hover information using LSP
   */
  async hover(
    filePath: string,
    line: number,
    character: number
  ): Promise<LSPHoverResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = this.getClientForFile(filePath);
    if (!client) {
      logger.debug(`No LSP client available for ${filePath}`);
      return null;
    }

    return await client.hover(filePath, line, character);
  }

  /**
   * Get document symbols using LSP
   */
  async documentSymbols(filePath: string): Promise<LSPDocumentSymbolsResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = this.getClientForFile(filePath);
    if (!client) {
      logger.debug(`No LSP client available for ${filePath}`);
      return null;
    }

    return await client.documentSymbols(filePath);
  }

  /**
   * Search workspace symbols using LSP
   */
  async workspaceSymbols(query: string): Promise<LSPWorkspaceSymbolsResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Use first available client for workspace symbol search
    const client = this.clients.values().next().value;
    if (!client) {
      logger.debug('No LSP clients available for workspace symbol search');
      return null;
    }

    return await client.workspaceSymbols(query);
  }

  /**
   * Find all symbols in a file (legacy method for living docs extraction)
   */
  async findSymbols(filePath: string): Promise<string[]> {
    const result = await this.documentSymbols(filePath);
    if (!result || !result.success) {
      return [];
    }
    return result.symbols.map((s) => s.name);
  }

  /**
   * Shutdown all LSP clients
   */
  async shutdown(): Promise<void> {
    for (const [lang, client] of this.clients) {
      logger.info(`Shutting down LSP client for ${lang}`);
      await client.shutdown();
    }
    this.clients.clear();
    this.initialized = false;
  }

  /**
   * Get statistics about LSP usage
   */
  getStatistics(): { availableLanguages: string[]; clientCount: number } {
    return {
      availableLanguages: Array.from(this.clients.keys()),
      clientCount: this.clients.size
    };
  }

  /**
   * Warm up all LSP clients by triggering workspace indexing
   * This should be called on session start to prevent timeout on first query
   * v1.0.197: Added for session-start warm-up integration
   *
   * @param entryFiles Optional list of key project files to pre-open
   */
  async warmup(entryFiles?: string[]): Promise<{ success: boolean; warmedUp: string[]; failed: string[] }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const warmedUp: string[] = [];
    const failed: string[] = [];

    for (const [lang, client] of this.clients) {
      try {
        const success = await client.warmup(entryFiles);
        if (success) {
          warmedUp.push(lang);
        } else {
          failed.push(lang);
        }
      } catch (error) {
        logger.warn(`Warmup failed for ${lang}: ${error}`);
        failed.push(lang);
      }
    }

    return {
      success: failed.length === 0,
      warmedUp,
      failed
    };
  }

  /**
   * Check if all clients are warmed up
   */
  isWarmedUp(): boolean {
    if (this.clients.size === 0) return true;
    for (const client of this.clients.values()) {
      if (!client.isWarmedUp()) return false;
    }
    return true;
  }
}

/**
 * Global LSP manager instance
 */
let globalLSPManager: LSPManager | null = null;

/**
 * Get or create global LSP manager
 */
export function getGlobalLSPManager(projectRoot?: string): LSPManager {
  if (!globalLSPManager && projectRoot) {
    globalLSPManager = new LSPManager({ projectRoot });
  }
  if (!globalLSPManager) {
    throw new Error('LSP manager not initialized. Provide projectRoot on first call.');
  }
  return globalLSPManager;
}

/**
 * Shutdown global LSP manager
 */
export async function shutdownGlobalLSPManager(): Promise<void> {
  if (globalLSPManager) {
    await globalLSPManager.shutdown();
    globalLSPManager = null;
  }
}
