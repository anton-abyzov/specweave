/**
 * Auto-install Anthropic's skill-creator into .claude/skills/skill-creator/
 *
 * Called during `specweave init` and `specweave update-instructions`.
 * Non-blocking: never throws, never prevents init from completing.
 *
 * Install strategy (3-tier fallback):
 *   1. `vskill install` — globally installed vskill CLI
 *   2. `npx --registry https://registry.npmjs.org vskill install` — bypasses
 *      corporate .npmrc that may redirect to a private registry
 *   3. `claude install-skill` — last resort via claude CLI
 *
 * @since 1.0.548
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import { execFileNoThrow, isCommandAvailable } from '../../../utils/execFileNoThrow.js';

const SKILL_CREATOR_LOCAL = '.claude/skills/skill-creator/SKILL.md';
/** 3-part identifier: owner/repo/skill — used by vskill CLI */
const SKILL_CREATOR_ID = 'anthropics/skills/skill-creator';
/** Fallback URL for claude install-skill */
const SKILL_CREATOR_URL = `https://github.com/anthropics/skills/tree/main/skills/skill-creator`;
/** Public npm registry — bypasses .npmrc redirects in corporate environments */
const NPM_PUBLIC_REGISTRY = 'https://registry.npmjs.org';
/** Pinned version range for npx --package */
const VSKILL_VERSION_RANGE = '^0.5.0';

const VSKILL_INSTALL_ARGS = ['install', SKILL_CREATOR_ID, '--yes', '--agent', 'claude-code'];

export interface EnsureSkillCreatorResult {
  installed: boolean;
  skipped: boolean;
  error?: string;
}

/**
 * Ensure Anthropic's skill-creator is installed locally.
 *
 * 1. Check if already installed at .claude/skills/skill-creator/SKILL.md
 * 2. Try `vskill install` (preferred — globally installed)
 * 3. Try `npx --registry <public> vskill install` (handles missing global + .npmrc issues)
 * 4. Fall back to `claude install-skill` if vskill is unavailable
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

    const errors: string[] = [];

    // 2. Try global vskill install (preferred method)
    const vskillAvailable = await isCommandAvailable('vskill');
    if (vskillAvailable) {
      const result = await execFileNoThrow('vskill', VSKILL_INSTALL_ARGS, {
        cwd: projectRoot,
        timeout: 30000,
      });

      if (result.success) {
        if (fs.existsSync(localPath)) {
          return { installed: true, skipped: false };
        }
        console.warn('[skill-gen] vskill exited 0 but skill file not found -- trying next tier');
      }

      const vskillErr = result.success ? 'exited 0 but file not written' : (result.stderr?.trim() || result.error?.message || 'unknown error');
      errors.push(`vskill: ${vskillErr}`);
      if (!result.success) {
        console.warn(`[skill-gen] vskill install failed: ${vskillErr} -- trying npx fallback`);
      }
    }

    // 3. Try npx with explicit public registry (bypasses .npmrc redirects)
    const npxAvailable = await isCommandAvailable('npx');
    if (npxAvailable) {
      const result = await execFileNoThrow('npx', [
        '--yes', '--registry', NPM_PUBLIC_REGISTRY, '--userconfig', '/dev/null', '--ignore-scripts', '--package', `vskill@${VSKILL_VERSION_RANGE}`,
        'vskill', ...VSKILL_INSTALL_ARGS,
      ], {
        cwd: projectRoot,
        timeout: 60000, // npx may need to download vskill first
      });

      if (result.success) {
        if (fs.existsSync(localPath)) {
          return { installed: true, skipped: false };
        }
        console.warn('[skill-gen] vskill exited 0 but skill file not found -- trying next tier');
      }

      const npxErr = result.success ? 'exited 0 but file not written' : (result.stderr?.trim() || result.error?.message || 'unknown error');
      errors.push(`npx: ${npxErr}`);
      if (!result.success) {
        console.warn(`[skill-gen] npx vskill install failed: ${npxErr} -- trying claude CLI fallback`);
      }
    }

    // 4. Fall back to claude install-skill
    const claudeAvailable = await isCommandAvailable('claude');
    if (!claudeAvailable) {
      console.warn(`[skill-gen] no CLI available -- run 'npx --registry ${NPM_PUBLIC_REGISTRY} vskill install ${SKILL_CREATOR_ID}' manually`);
      return { installed: false, skipped: false, error: errors.join('; ') || 'no CLI available' };
    }

    const result = await execFileNoThrow('claude', ['install-skill', SKILL_CREATOR_URL], {
      cwd: projectRoot,
      timeout: 30000,
    });

    if (result.success) {
      if (fs.existsSync(localPath)) {
        return { installed: true, skipped: false };
      }
      console.warn('[skill-gen] vskill exited 0 but skill file not found -- trying next tier');
    }

    const claudeErr = result.success ? 'exited 0 but file not written' : (result.stderr?.trim() || result.error?.message || 'unknown error');
    errors.push(`claude: ${claudeErr}`);
    if (!result.success) {
      console.warn(`[skill-gen] claude install-skill failed: ${claudeErr} -- run 'npx --registry ${NPM_PUBLIC_REGISTRY} vskill install ${SKILL_CREATOR_ID}' manually`);
    }
    return { installed: false, skipped: false, error: errors.join('; ') || 'no CLI available' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[skill-gen] skill-creator install failed: ${msg} -- run 'npx --registry ${NPM_PUBLIC_REGISTRY} vskill install ${SKILL_CREATOR_ID}' manually`);
    return { installed: false, skipped: false, error: msg };
  }
}
