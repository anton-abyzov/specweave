/**
 * Stop-reflect hook handler.
 *
 * Fires when a session ends. Checks if reflection is enabled in config.
 * If enabled, logs that reflection was requested (actual reflection logic
 * will call `specweave reflect-stop` CLI in a follow-up).
 *
 * NEVER blocks — always returns approve.
 *
 * @module core/hooks/handlers/stop-reflect
 */

import * as fs from 'fs';
import type { HandlerFn } from './types.js';
import { logHook } from './utils.js';

/** Check if reflect is enabled in config. Default: true */
function isReflectEnabled(configPath: string): boolean {
  try {
    if (!fs.existsSync(configPath)) return true;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    // Note: explicit false check — missing key defaults to enabled
    return config.reflect?.enabled !== false;
  } catch {
    return true; // Default enabled on error
  }
}

export const handle: HandlerFn = async (input, context) => {
  try {
    const enabled = isReflectEnabled(context.configPath);

    if (!enabled) {
      logHook(context, 'stop-reflect', 'Reflection disabled in config');
      return { decision: 'approve' };
    }

    // Reflection is enabled — log intent
    logHook(context, 'stop-reflect', 'Reflection requested at session end');
    return { decision: 'approve' };
  } catch {
    // Never throw — always approve
    return { decision: 'approve' };
  }
};
