/**
 * TimeoutResolver - Resolves timeouts with per-language override support
 *
 * Resolution priority: perLanguage > global > default
 *
 * @see spec.md US-002: Configurable Timeouts
 * @satisfies AC-US2-03, AC-US2-05
 */

import type { LspConfig } from './lsp-config.js';

/**
 * Resolves timeout values based on language with fallback to global defaults
 */
export class TimeoutResolver {
  private readonly config: LspConfig;

  constructor(config: LspConfig) {
    this.config = config;
  }

  /**
   * Get the timeout (in seconds) for a specific language
   *
   * Resolution order:
   * 1. perLanguage[language].timeout (if defined)
   * 2. global timeout
   *
   * @param language - Language identifier (e.g., 'csharp', 'typescript')
   * @returns Timeout in seconds
   */
  getTimeout(language: string): number {
    const perLang = this.config.perLanguage?.[language];
    if (perLang?.timeout !== undefined) {
      return perLang.timeout;
    }
    return this.config.timeout;
  }

  /**
   * Get the warmup timeout (in seconds) for a specific language
   *
   * Resolution order:
   * 1. perLanguage[language].warmupTimeout (if defined)
   * 2. global warmupTimeout
   *
   * @param language - Language identifier (e.g., 'csharp', 'typescript')
   * @returns Warmup timeout in seconds
   */
  getWarmupTimeout(language: string): number {
    const perLang = this.config.perLanguage?.[language];
    if (perLang?.warmupTimeout !== undefined) {
      return perLang.warmupTimeout;
    }
    return this.config.warmupTimeout;
  }
}
