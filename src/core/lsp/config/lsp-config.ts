/**
 * LspConfig schema and parsing
 *
 * @see spec.md US-002: Configurable Timeouts
 * @satisfies AC-US2-01, AC-US2-04
 */

import { z } from 'zod';

// Default timeout values (in seconds)
export const DEFAULT_TIMEOUT = 120;
export const DEFAULT_WARMUP_TIMEOUT = 90;

// Schema for per-language timeout overrides
const LanguageTimeoutSchema = z.object({
  timeout: z.number().positive().optional(),
  warmupTimeout: z.number().positive().optional(),
}).strict();

// Schema for custom LSP server configuration
const CustomServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  filePatterns: z.array(z.string()).optional(),
  languageId: z.string().optional(),
  initializationOptions: z.record(z.string(), z.unknown()).optional(),
}).strict();

// Main LSP config schema
const LspConfigSchema = z.object({
  timeout: z.number().positive().optional(),
  warmupTimeout: z.number().positive().optional(),
  perLanguage: z.record(z.string(), LanguageTimeoutSchema).optional(),
  servers: z.record(z.string(), CustomServerSchema).optional(),
}).strict();

// Root config schema (wraps lsp section)
const RootConfigSchema = z.object({
  lsp: LspConfigSchema.optional(),
}).passthrough();

/**
 * Parsed and validated LSP configuration with defaults applied
 */
export interface LspConfig {
  /** Global timeout in seconds */
  timeout: number;
  /** Warm-up timeout in seconds */
  warmupTimeout: number;
  /** Per-language timeout overrides */
  perLanguage?: Record<string, { timeout?: number; warmupTimeout?: number }>;
  /** Custom LSP server configurations */
  servers?: Record<string, {
    command: string;
    args?: string[];
    filePatterns?: string[];
    languageId?: string;
    initializationOptions?: Record<string, unknown>;
  }>;
}

/**
 * Parse and validate LSP configuration from raw config object
 *
 * Uses safeParse to gracefully handle invalid configurations,
 * falling back to defaults when validation fails.
 *
 * @param rawConfig - Raw configuration object (typically from config.json)
 * @returns Validated LspConfig with defaults applied
 */
export function parseLspConfig(rawConfig: unknown): LspConfig {
  // Use safeParse to gracefully handle invalid config
  const result = RootConfigSchema.safeParse(rawConfig);
  const parsed = result.success ? result.data : { lsp: undefined };
  const lsp = parsed.lsp ?? {};

  return {
    timeout: lsp.timeout ?? DEFAULT_TIMEOUT,
    warmupTimeout: lsp.warmupTimeout ?? DEFAULT_WARMUP_TIMEOUT,
    perLanguage: lsp.perLanguage,
    servers: lsp.servers,
  };
}
