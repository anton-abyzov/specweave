/**
 * Reflect checker core module.
 *
 * Extracted from hooks/handlers/stop-reflect.ts.
 * Checks if reflection is enabled in config and returns result.
 *
 * Never throws.
 *
 * @module core/session/reflect-checker
 */

import * as fs from 'fs';

export interface ReflectCheckResult {
  enabled: boolean;
  reason: string;
}

/**
 * Check if reflect is enabled in config. Default: true.
 */
export function checkReflectConfig(configPath: string): ReflectCheckResult {
  try {
    if (!fs.existsSync(configPath)) {
      return { enabled: true, reason: 'No config file — default enabled' };
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.reflect?.enabled === false) {
      return { enabled: false, reason: 'Reflection disabled in config' };
    }
    return { enabled: true, reason: 'Reflection enabled in config' };
  } catch {
    return { enabled: true, reason: 'Config read error — default enabled' };
  }
}
