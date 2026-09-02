/**
 * Shared utilities for hook handlers.
 *
 * @module core/hooks/handlers/utils
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HookContext, HookInput } from './types.js';

/** Single JSONL hook log per project; rotated once when it exceeds this size. */
export const HOOK_LOG_FILE = 'hooks.jsonl';
export const HOOK_LOG_MAX_BYTES = 1024 * 1024;

export type HookLogLevel = 'warn' | 'error' | 'block';

/**
 * Walk up from `startDir` to find the nearest directory containing `.specweave/config.json`.
 * Returns the project root path, or null if not found.
 */
export function findProjectRoot(startDir?: string): string | null {
  let current = path.resolve(startDir ?? process.cwd());
  const root = path.parse(current).root;
  let limit = 0;

  while (current !== root && limit < 100) {
    if (fs.existsSync(path.join(current, '.specweave', 'config.json'))) {
      return current;
    }
    current = path.dirname(current);
    limit++;
  }
  return null;
}

/** Build a HookContext from a project root path. */
export function createContext(projectRoot: string): HookContext {
  return {
    projectRoot,
    stateDir: path.join(projectRoot, '.specweave', 'state'),
    logsDir: path.join(projectRoot, '.specweave', 'logs'),
    configPath: path.join(projectRoot, '.specweave', 'config.json'),
    timestamp: new Date().toISOString(),
  };
}

/** Parse a raw stdin string as JSON. Returns empty object on failure. */
export function parseStdinJson(raw: string): HookInput {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as HookInput) : {};
  } catch {
    return {};
  }
}

/** Normalize a path for matching: backslashes → forward slashes. */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

export function getToolName(input: HookInput): string {
  const name = input.tool_name ?? (input as Record<string, unknown>).toolName ?? '';
  return typeof name === 'string' ? name : '';
}

export function getToolInput(input: HookInput): Record<string, unknown> {
  const ti = input.tool_input ?? (input as Record<string, unknown>).toolInput;
  return ti && typeof ti === 'object' ? (ti as Record<string, unknown>) : {};
}

/** The normalized `tool_input.file_path` ('' when absent). */
export function getFilePath(input: HookInput): string {
  const fp = getToolInput(input).file_path;
  return typeof fp === 'string' ? normalizePath(fp) : '';
}

/** True when the (normalized) path is inside a `.specweave/increments/` tree. */
export function isIncrementFile(filePath: string): boolean {
  return normalizePath(filePath).includes('.specweave/increments/');
}

/** `0874-crawl-coverage` from any increment path; 'unknown' otherwise. */
export function extractIncrementId(filePath: string): string {
  const m = normalizePath(filePath).match(/\.specweave\/increments\/(\d{4}E?-[^/]+)/);
  return m ? m[1] : 'unknown';
}

/** Read + parse JSON, null on any failure. */
export function readJsonSafe<T = Record<string, unknown>>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

/**
 * Active increment ids: `.specweave/state/active-increment.json` (`{ids:[]}`)
 * first, falling back to a metadata.json scan for status active|in-progress.
 * Only ids whose folder still exists are returned.
 */
export function readActiveIncrements(projectRoot: string): string[] {
  const incDir = path.join(projectRoot, '.specweave', 'increments');
  const state = readJsonSafe<{ ids?: unknown }>(
    path.join(projectRoot, '.specweave', 'state', 'active-increment.json'),
  );
  const fromState = Array.isArray(state?.ids)
    ? state!.ids.filter((x): x is string => typeof x === 'string' && fs.existsSync(path.join(incDir, x)))
    : [];
  if (fromState.length > 0) return fromState;

  const active: string[] = [];
  try {
    for (const dir of fs.readdirSync(incDir)) {
      if (!/^\d{4}E?-/.test(dir)) continue;
      const meta = readJsonSafe<{ status?: string }>(path.join(incDir, dir, 'metadata.json'));
      if (meta && (meta.status === 'active' || meta.status === 'in-progress')) active.push(dir);
    }
  } catch {
    // no increments dir
  }
  return active.sort();
}

/**
 * Append one JSONL line to `.specweave/logs/hooks.jsonl`. Only warnings,
 * errors and blocks are logged (no per-invocation noise). The file is rotated
 * to `hooks.jsonl.1` once it exceeds {@link HOOK_LOG_MAX_BYTES}. Never throws.
 */
export function logHook(
  context: HookContext,
  handler: string,
  message: string,
  level: HookLogLevel = 'warn',
): void {
  try {
    fs.mkdirSync(context.logsDir, { recursive: true });
    const file = path.join(context.logsDir, HOOK_LOG_FILE);
    try {
      if (fs.statSync(file).size > HOOK_LOG_MAX_BYTES) {
        fs.renameSync(file, `${file}.1`);
      }
    } catch {
      // file absent — nothing to rotate
    }
    const entry = { t: context.timestamp, hook: handler, level, msg: message };
    fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  } catch {
    // Never throw from logging
  }
}
