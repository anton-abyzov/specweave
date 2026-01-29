/**
 * LSP Manager
 *
 * Manages multiple LSP clients and provides unified interface for semantic analysis.
 * Automatically detects and initializes appropriate language servers.
 *
 * @module core/lsp/lsp-manager
 */

import {
  LSPClient,
  LSPServerConfig,
  detectLSPServers,
  LSPDefinitionResult,
  LSPReferencesResult,
  LSPHoverResult,
  LSPDocumentSymbolsResult,
  LSPWorkspaceSymbolsResult,
} from './lsp-client.js';
import { consoleLogger as logger } from '../../utils/logger.js';
import * as path from 'path';

export interface LSPManagerOptions {
  projectRoot: string;
  enabledLanguages?: string[];
}

/**
 * Manages LSP clients for multiple languages
 */
export class LSPManager {
  private clients: Map<string, LSPClient> = new Map();
  private projectRoot: string;
  private initialized = false;

  constructor(options: LSPManagerOptions) {
    this.projectRoot = options.projectRoot;
  }

  /**
   * Initialize all available LSP servers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const servers = await detectLSPServers(this.projectRoot);

      if (servers.length === 0) {
        logger.info('No LSP servers found. Semantic analysis will use grep fallback.');
        this.initialized = true;
        return;
      }

      logger.info(`Found ${servers.length} LSP server(s)`);

      for (const config of servers) {
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

      this.initialized = true;

    } catch (error) {
      logger.error(`LSP initialization failed: ${error}`);
      this.initialized = true; // Continue without LSP
    }
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
   * Get LSP client for a file
   */
  private getClientForFile(filePath: string): LSPClient | null {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'typescript',
      '.jsx': 'typescript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust'
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
