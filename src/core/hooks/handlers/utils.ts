/**
 * Shared utilities for hook handlers.
 *
 * @module core/hooks/handlers/utils
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HookContext, HookInput } from './types.js';

/**
 * Walk up from `startDir` to find the nearest directory containing `.specweave/config.json`.
 * Returns the project root path, or null if not found.
 */
export function findProjectRoot(startDir?: string): string | null {
  let current = startDir ?? process.cwd();
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

/**
 * Build a HookContext from a project root path.
 */
export function createContext(projectRoot: string): HookContext {
  return {
    projectRoot,
    stateDir: path.join(projectRoot, '.specweave', 'state'),
    logsDir: path.join(projectRoot, '.specweave', 'logs'),
    configPath: path.join(projectRoot, '.specweave', 'config.json'),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Parse a raw stdin string as JSON. Returns empty object on failure.
 */
export function parseStdinJson(raw: string): HookInput {
  if (!raw || !raw.trim()) return {};
  try {
    return JSON.parse(raw) as HookInput;
  } catch {
    return {};
  }
}

/**
 * Append a log entry to `.specweave/logs/hooks.log`.
 * Never throws — logging failures are silently ignored.
 */
export function logHook(
  context: HookContext,
  handler: string,
  message: string,
): void {
  try {
    fs.mkdirSync(context.logsDir, { recursive: true });
    const entry = `[${context.timestamp}] ${handler}: ${message}\n`;
    fs.appendFileSync(path.join(context.logsDir, 'hooks.log'), entry);
  } catch {
    // Never throw from logging
  }
}
