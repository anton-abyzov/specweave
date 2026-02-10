/**
 * Claude Settings Environment Variable Configuration
 *
 * Manages environment variables in .claude/settings.json,
 * specifically CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS for
 * native agent teams support.
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';

/**
 * Enable agent teams env var in .claude/settings.json
 *
 * Adds CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 to the env section
 * of .claude/settings.json. Creates the file/directory if needed.
 * Preserves all existing settings.
 */
export function enableAgentTeamsEnvVar(projectDir: string): void {
  const claudeDir = path.join(projectDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  // Ensure .claude directory exists
  fs.mkdirSync(claudeDir, { recursive: true });

  // Read existing settings or start fresh
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  // Get or create env section
  const env = (settings.env || {}) as Record<string, string>;

  // Skip if already set
  if (env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1') {
    return;
  }

  // Add the env var
  env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
  settings.env = env;

  // Write back
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}
