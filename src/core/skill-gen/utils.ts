/**
 * Shared utilities for skill-gen modules.
 *
 * Extracted from signal-collector.ts, drift-detector.ts, and suggestion-engine.ts
 * to eliminate duplication. All public functions are error-isolated (catch + warn).
 *
 * @module core/skill-gen/utils
 */

import { readFile, writeFile, readdir, mkdir, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { z } from 'zod';
import type { SignalStore } from './types.js';
import { EMPTY_SIGNAL_STORE } from './types.js';

// ── Constants ────────────────────────────────────────────────────────

export const TOKEN_BUDGET = 50000;
export const MAX_EVIDENCE = 20;
export const MAX_STRING_LENGTH = 200;

// ── Zod Schemas ──────────────────────────────────────────────────────

export const SignalEntrySchema = z.object({
  id: z.string(),
  pattern: z.string(),
  category: z.string(),
  description: z.string(),
  incrementIds: z.array(z.string()),
  firstSeen: z.string(),
  lastSeen: z.string(),
  confidence: z.number(),
  evidence: z.array(z.string()),
  suggested: z.boolean(),
  declined: z.boolean(),
  generated: z.boolean(),
  uniqueSourceFiles: z.array(z.string()).optional(),
});

export const SignalStoreSchema = z.object({
  version: z.string(),
  signals: z.array(SignalEntrySchema),
});

// ── File collection ──────────────────────────────────────────────────

/**
 * Recursively collect markdown files from a directory.
 * Returns empty array if directory doesn't exist or is unreadable.
 */
export async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await collectMarkdownFiles(fullPath)));
      } else if (entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or is unreadable
  }
  return results;
}

// ── Store I/O ────────────────────────────────────────────────────────

/**
 * Load signal store from disk with Zod validation and corruption recovery.
 * Returns empty store on missing/corrupted/invalid files with a logged warning.
 */
export async function loadSignalStore(filePath: string): Promise<SignalStore> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = SignalStoreSchema.parse(parsed);
    return validated as SignalStore;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return { ...EMPTY_SIGNAL_STORE, signals: [] };
    }
    // Corrupted or invalid — backup and start fresh
    try {
      await copyFile(filePath, filePath + '.bak');
    } catch {
      // backup failed, continue anyway
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[skill-gen/utils] Invalid signal store, starting fresh: ${msg}`);
    return { ...EMPTY_SIGNAL_STORE, signals: [] };
  }
}

/**
 * Save signal store to disk, creating parent directories as needed.
 */
export async function saveSignalStore(filePath: string, store: SignalStore): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

// ── String utilities ─────────────────────────────────────────────────

/**
 * Strip control characters and truncate to maxLength.
 */
export function sanitizeString(input: string, maxLength: number = MAX_STRING_LENGTH): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = input.replace(/[\x00-\x1F\x7F]/g, '');
  return cleaned.slice(0, maxLength);
}

/**
 * Estimate token count using the rough heuristic: ceil(chars / 4).
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Cap evidence array at max entries using FIFO eviction (oldest removed first).
 */
export function capEvidence(evidence: string[], max: number = MAX_EVIDENCE): string[] {
  if (evidence.length <= max) {
    return evidence;
  }
  return evidence.slice(evidence.length - max);
}
