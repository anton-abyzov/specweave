/**
 * LSP Bootstrapper for Living Docs
 *
 * Initializes LSP clients only for languages detected during discovery.
 * Checks if server binaries are installed before attempting initialization.
 *
 * @module core/living-docs/lsp-bootstrapper
 */

import { LSPManager, type LSPManagerOptions } from '../lsp/lsp-manager.js';
import { consoleLogger as logger } from '../../utils/logger.js';
import { execFileSync } from 'child_process';

/**
 * Maps language names to their primary server binary commands.
 * Covers all 10 supported languages. First match wins.
 */
export const LANGUAGE_TO_SERVER_BINARY: Record<string, string[]> = {
  typescript: ['tsserver', 'typescript-language-server'],
  javascript: ['tsserver', 'typescript-language-server'],
  python: ['pyright-langserver', 'pyright', 'pylsp'],
  go: ['gopls'],
  rust: ['rust-analyzer'],
  java: ['jdtls'],
  csharp: ['csharp-ls', 'OmniSharp'],
  kotlin: ['kotlin-language-server'],
  swift: ['sourcekit-lsp'],
  php: ['intelephense', 'phpactor'],
  ruby: ['solargraph'],
};

/**
 * Minimal interface for the LSP manager used by the bootstrapper.
 * Allows injection of mocks in tests without module-level mocking.
 */
export interface LspManagerLike {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getStatistics(): { availableLanguages: string[]; clientCount: number };
}

/**
 * Context returned by the bootstrapper, carrying initialized LSP clients
 * through the pipeline for downstream phases.
 */
export interface LspContext {
  /** Initialized LSP manager (null if no servers available) */
  lspManager: LspManagerLike | null;
  /** Languages that have active LSP clients */
  availableLanguages: string[];
  /** Languages that were detected but whose server was not installed */
  skippedLanguages: string[];
}

export interface LspBootstrapperOptions {
  /** Factory for creating LSP manager instances (defaults to real LSPManager) */
  createLspManager?: (opts: LSPManagerOptions) => LspManagerLike;
  /** Function to check binary availability (defaults to which/where) */
  isBinaryAvailable?: (binary: string) => boolean;
}

/**
 * Smart LSP bootstrapper that activates only relevant language servers.
 */
export class LspBootstrapper {
  private projectRoot: string;
  private lspManager: LspManagerLike | null = null;
  private createLspManager: (opts: LSPManagerOptions) => LspManagerLike;
  private checkBinary: (binary: string) => boolean;

  constructor(projectRoot: string, options?: LspBootstrapperOptions) {
    this.projectRoot = projectRoot;
    this.createLspManager = options?.createLspManager ?? ((opts) => new LSPManager(opts));
    this.checkBinary = options?.isBinaryAvailable ?? defaultIsBinaryAvailable;
  }

  /**
   * Bootstrap LSP clients for the given detected languages.
   * Only initializes servers whose binaries are installed.
   */
  async bootstrap(languagesDetected: string[]): Promise<LspContext> {
    if (languagesDetected.length === 0) {
      logger.info('No languages detected, skipping LSP bootstrap');
      return { lspManager: null, availableLanguages: [], skippedLanguages: [] };
    }

    const availableLanguages: string[] = [];
    const skippedLanguages: string[] = [];

    for (const lang of languagesDetected) {
      const binaries = LANGUAGE_TO_SERVER_BINARY[lang];
      if (!binaries) {
        logger.warn(`No known LSP server for language: ${lang}`);
        skippedLanguages.push(lang);
        continue;
      }

      const hasBinary = binaries.some((bin) => this.checkBinary(bin));
      if (hasBinary) {
        availableLanguages.push(lang);
      } else {
        logger.warn(
          `LSP server not installed for ${lang} (tried: ${binaries.join(', ')})`
        );
        skippedLanguages.push(lang);
      }
    }

    if (availableLanguages.length === 0) {
      logger.info('No LSP servers available, falling back to regex analysis');
      return { lspManager: null, availableLanguages: [], skippedLanguages };
    }

    // Initialize LSPManager with only the available languages
    try {
      this.lspManager = this.createLspManager({
        projectRoot: this.projectRoot,
        enabledLanguages: availableLanguages,
      });
      await this.lspManager.initialize();

      const stats = this.lspManager.getStatistics();
      logger.info(
        `LSP bootstrap: ${stats.clientCount} server(s) active for [${stats.availableLanguages.join(', ')}]`
      );

      return {
        lspManager: this.lspManager,
        availableLanguages: stats.availableLanguages,
        skippedLanguages,
      };
    } catch (error) {
      logger.warn(`LSP initialization failed: ${error}`);
      this.lspManager = null;
      return {
        lspManager: null,
        availableLanguages: [],
        skippedLanguages: [...availableLanguages, ...skippedLanguages],
      };
    }
  }

  /**
   * Shutdown all LSP clients.
   */
  async shutdown(): Promise<void> {
    if (this.lspManager) {
      await this.lspManager.shutdown();
      this.lspManager = null;
    }
  }
}

/**
 * Default binary availability check using which/where.
 */
function defaultIsBinaryAvailable(binary: string): boolean {
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(whichCmd, [binary], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
