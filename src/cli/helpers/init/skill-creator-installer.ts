/**
 * Auto-install Anthropic's skill-creator into .claude/skills/skill-creator/
 *
 * Called during `specweave init` and `specweave update-instructions`.
 * Non-blocking: never throws, never prevents init from completing.
 *
 * @since 1.0.548
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import { execFileNoThrow, isCommandAvailable } from '../../../utils/execFileNoThrow.js';

const SKILL_CREATOR_LOCAL = '.claude/skills/skill-creator/SKILL.md';
const SKILL_CREATOR_URL = 'https://github.com/anthropics/claude-code/tree/main/skill-creator';

export interface EnsureSkillCreatorResult {
  installed: boolean;
  skipped: boolean;
  error?: string;
}

/**
 * Ensure Anthropic's skill-creator is installed locally.
 *
 * 1. Check if already installed at .claude/skills/skill-creator/SKILL.md
 * 2. Check claude CLI availability
 * 3. Run `claude install-skill <url>` with 30s timeout
 *
 * All errors are caught — this function never throws.
 */
export async function ensureSkillCreator(projectRoot: string): Promise<EnsureSkillCreatorResult> {
  try {
    // 1. Check if already installed locally (handles files and symlinks)
    const localPath = path.join(projectRoot, SKILL_CREATOR_LOCAL);
    if (fs.existsSync(localPath)) {
      return { installed: false, skipped: true };
    }

    // 2. Check claude CLI availability
    const cliAvailable = await isCommandAvailable('claude');
    if (!cliAvailable) {
      console.warn('[skill-gen] claude CLI not found -- skill-creator auto-install skipped');
      return { installed: false, skipped: false, error: 'claude CLI not found' };
    }

    // 3. Run claude install-skill
    const result = await execFileNoThrow('claude', ['install-skill', SKILL_CREATOR_URL], {
      cwd: projectRoot,
      timeout: 30000,
    });

    if (result.success) {
      return { installed: true, skipped: false };
    }

    const errorMsg = result.stderr?.trim() || result.error?.message || 'unknown error';
    console.warn(`[skill-gen] skill-creator install failed: ${errorMsg} -- run 'claude install-skill ${SKILL_CREATOR_URL}' manually`);
    return { installed: false, skipped: false, error: errorMsg };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[skill-gen] skill-creator install failed: ${msg} -- run 'claude install-skill ${SKILL_CREATOR_URL}' manually`);
    return { installed: false, skipped: false, error: msg };
  }
}
