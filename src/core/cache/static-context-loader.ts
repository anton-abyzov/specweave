/**
 * Static Context Loader — builds Anthropic SDK prompt-cache blocks for
 * long-lived, infrequently-changing project files (CLAUDE.md, spec.md,
 * rubric.md, etc.).
 *
 * Per ADR-0250 (0669 Wave 2):
 * - Uses the `ephemeral` cache type (5-min TTL, auto-invalidated by Anthropic).
 * - Aggregates ALL static files into a SINGLE breakpoint to preserve the
 *   4-breakpoint budget for dynamic content (tool results, message history).
 * - Missing files are silently skipped — callers can list optional paths
 *   (e.g., a per-increment rubric.md that may not exist yet).
 *
 * @module core/cache/static-context-loader
 */

import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';

/**
 * Anthropic SDK cache-control text block.
 *
 * Shape matches `@anthropic-ai/sdk` message content when prompt caching
 * is enabled. The `cache_control` marker tells the API to cache
 * everything up to and including this block.
 */
export interface CacheBlock {
  type: 'text';
  text: string;
  cache_control: { type: 'ephemeral' };
}

/**
 * Load static project files and wrap them in a single ephemeral
 * cache_control block suitable for prepending to an Anthropic API
 * message-content array.
 *
 * @param filePaths - Ordered list of paths (relative to `baseDir`) to include.
 * @param baseDir   - Resolution base for relative paths. Defaults to `process.cwd()`.
 * @returns Zero-or-one-element array of cache blocks. Empty when no files exist.
 */
export async function loadStaticContext(
  filePaths: string[],
  baseDir: string = process.cwd(),
): Promise<CacheBlock[]> {
  const sections: string[] = [];

  for (const filePath of filePaths) {
    const abs = resolve(baseDir, filePath);
    try {
      statSync(abs);
      const content = readFileSync(abs, 'utf-8');
      sections.push(`=== ${filePath} ===\n${content}`);
    } catch {
      // Missing files are silently skipped (NFR-1.2 tolerance).
    }
  }

  if (sections.length === 0) return [];

  return [
    {
      type: 'text',
      text: sections.join('\n\n'),
      cache_control: { type: 'ephemeral' },
    },
  ];
}
