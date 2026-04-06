/**
 * Analytics push CLI command.
 *
 * Replaces PostToolUse analytics hook with explicit CLI invocation.
 *
 *   specweave analytics push --type skill --name sw:pm
 *   specweave analytics push --type agent --name general
 *
 * @module cli/commands/analytics-push
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  writeSkillEvent,
  writeAgentEvent,
} from '../../core/analytics/event-writer.js';

export interface AnalyticsPushResult {
  success: boolean;
  eventsWritten: number;
}

export interface AnalyticsPushOptions {
  type?: 'skill' | 'agent';
  name?: string;
  plugin?: string;
  projectRoot?: string;
  json?: boolean;
  silent?: boolean;
}

function resolveProjectRoot(provided?: string): string | null {
  const root = provided ?? process.cwd();
  const configPath = path.join(root, '.specweave', 'config.json');
  if (!fs.existsSync(configPath)) return null;
  return root;
}

/**
 * Execute `specweave analytics push`.
 */
export async function analyticsPushCommand(
  options: AnalyticsPushOptions = {},
): Promise<AnalyticsPushResult> {
  // Validate required flags
  if (!options.type) {
    if (!options.silent) console.error('Missing required flag: --type <skill|agent>');
    return { success: false, eventsWritten: 0 };
  }
  if (!options.name) {
    if (!options.silent) console.error('Missing required flag: --name <string>');
    return { success: false, eventsWritten: 0 };
  }
  if (options.type !== 'skill' && options.type !== 'agent') {
    if (!options.silent) console.error('--type must be "skill" or "agent"');
    return { success: false, eventsWritten: 0 };
  }

  const projectRoot = resolveProjectRoot(options.projectRoot);
  if (!projectRoot) {
    const msg = 'Not a SpecWeave project (no .specweave/config.json found)';
    if (!options.silent) console.error(msg);
    return { success: false, eventsWritten: 0 };
  }

  const analyticsDir = path.join(projectRoot, '.specweave', 'state', 'analytics');
  const timestamp = new Date().toISOString();

  let writeResult;
  if (options.type === 'skill') {
    writeResult = writeSkillEvent(analyticsDir, options.name, options.plugin, timestamp);
  } else {
    writeResult = writeAgentEvent(analyticsDir, options.name, timestamp);
  }

  const result: AnalyticsPushResult = {
    success: writeResult.written > 0,
    eventsWritten: writeResult.written,
  };

  if (!options.silent) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.success) {
      console.log(`Recorded ${options.type} event: ${options.name}`);
    } else {
      console.error('Failed to write analytics event');
    }
  }

  return result;
}
