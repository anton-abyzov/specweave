/**
 * Claude Settings Permission Configuration
 *
 * Adds DCI script patterns to .claude/settings.json permissions.allow
 * so skill-context.sh can execute without interactive approval.
 * Required for non-interactive environments (anymodel, proxies) and
 * users with restrictive permission settings.
 *
 * Note: skill-memories.sh was replaced with instruction-based loading
 * (cross-platform, no shell needed). Only skill-context.sh remains as DCI.
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';

/** Bash patterns that DCI hooks need auto-approved */
const DCI_PATTERNS = [
  'Bash(.specweave/scripts/skill-context.sh *)',
];

/** Legacy pattern to clean up from existing settings */
const LEGACY_PATTERNS = [
  'Bash(.specweave/scripts/skill-memories.sh *)',
];

/**
 * Add DCI script permissions to project-level .claude/settings.json
 *
 * Adds patterns for skill-context.sh to the permissions.allow array.
 * Idempotent — skips patterns already present. Also cleans up legacy
 * skill-memories.sh patterns. Skips if user has blanket "Bash" permission.
 */
export function enableDciPermissions(projectDir: string): void {
  const claudeDir = path.join(projectDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  fs.mkdirSync(claudeDir, { recursive: true });

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  const permissions = (settings.permissions || {}) as Record<string, unknown>;
  const allow = (permissions.allow || []) as string[];

  // Skip if user has blanket Bash permission — all commands already allowed
  if (allow.includes('Bash')) {
    return;
  }

  let changed = false;

  // Add current DCI patterns
  for (const pattern of DCI_PATTERNS) {
    if (!allow.includes(pattern)) {
      allow.push(pattern);
      changed = true;
    }
  }

  // Remove legacy patterns (skill-memories.sh no longer used as DCI)
  for (const legacy of LEGACY_PATTERNS) {
    const idx = allow.indexOf(legacy);
    if (idx !== -1) {
      allow.splice(idx, 1);
      changed = true;
    }
  }

  if (!changed) {
    return;
  }

  permissions.allow = allow;
  settings.permissions = permissions;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}
