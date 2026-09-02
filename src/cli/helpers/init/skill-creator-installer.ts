/**
 * Install Anthropic's skill-creator into .claude/skills/skill-creator/
 *
 * OPT-IN since 2.0. `specweave init` / `specweave update` used to fetch this
 * from github.com unannounced and record it in a project `vskill.lock`. That
 * is a supply-chain surface the user never asked for, it is not part of the
 * 2.0 loop, and the lockfile it left behind made `specweave doctor` fail
 * forever (vskill's 64-char digest is not SpecWeave's 12-char plugin digest).
 *
 * Enable explicitly with `SPECWEAVE_INSTALL_SKILL_CREATOR=1`, or install it
 * yourself at any time:
 *   npx vskill install anthropics/skills/skill-creator
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
import * as os from 'os';
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

const VSKILL_INSTALL_ARGS = ['install', SKILL_CREATOR_ID, '--yes', '--agent', 'claude-code', '--copy'];

export interface EnsureSkillCreatorResult {
  installed: boolean;
  skipped: boolean;
  /** Why nothing was installed, when skipped. */
  reason?: 'already-installed' | 'opt-in-required';
  error?: string;
}

/** Env var that opts a project in to the network fetch. */
export const SKILL_CREATOR_OPT_IN_ENV = 'SPECWEAVE_INSTALL_SKILL_CREATOR';

/** True when the user explicitly asked for the skill-creator download. */
export function skillCreatorOptedIn(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env[SKILL_CREATOR_OPT_IN_ENV] ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/**
 * Ensure Anthropic's skill-creator is installed locally.
 *
 * 1. Check if already installed at .claude/skills/skill-creator/SKILL.md
 * 2. Bail out unless SPECWEAVE_INSTALL_SKILL_CREATOR opts in (no silent fetch)
 * 3. Try `vskill install` (preferred — globally installed)
 * 4. Try `npx --registry <public> vskill install` (handles missing global + .npmrc issues)
 * 5. Fall back to `claude install-skill` if vskill is unavailable
 *
 * All errors are caught — this function never throws.
 */
export async function ensureSkillCreator(projectRoot: string): Promise<EnsureSkillCreatorResult> {
  try {
    // 1. Check if already installed locally (handles files and symlinks)
    const localPath = path.join(projectRoot, SKILL_CREATOR_LOCAL);
    if (fs.existsSync(localPath)) {
      return { installed: false, skipped: true, reason: 'already-installed' };
    }

    // 2. Opt-in gate: never reach the network unless the user asked.
    if (!skillCreatorOptedIn()) {
      return { installed: false, skipped: true, reason: 'opt-in-required' };
    }

    const errors: string[] = [];

    // 3. Try global vskill install (preferred method)
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

    // 4. Try npx with explicit public registry (bypasses .npmrc redirects)
    //    Also use a temp cache dir to bypass corrupted ~/.npm/_cacache/ (EACCES/EEXIST)
    const npxAvailable = await isCommandAvailable('npx');
    if (npxAvailable) {
      const tmpCache = path.join(os.tmpdir(), `specweave-npm-cache-${process.pid}`);
      const result = await execFileNoThrow('npx', [
        '--yes', '--registry', NPM_PUBLIC_REGISTRY, '--userconfig', '/dev/null', '--cache', tmpCache, '--ignore-scripts', '--package', `vskill@${VSKILL_VERSION_RANGE}`,
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

      // Clean up temp cache (best-effort)
      try { fs.rmSync(tmpCache, { recursive: true, force: true }); } catch { /* non-fatal */ }
    }

    // 5. Fall back to claude install-skill
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
