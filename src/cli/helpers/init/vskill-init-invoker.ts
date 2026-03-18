/**
 * Auto-invoke `vskill init` to sync skills to non-Claude agents.
 *
 * Called during `specweave init` after plugin installation.
 * Non-blocking: never throws, never prevents init from completing.
 *
 * Install strategy (3-tier fallback):
 *   1. `vskill init --yes` — globally installed vskill CLI
 *   2. `npx --registry https://registry.npmjs.org vskill init --yes` — bypasses
 *      corporate .npmrc that may redirect to a private registry
 *   3. Graceful skip — log dim hint, do not fail
 *
 * @since 1.0.569
 */

import { execFileNoThrow, isCommandAvailable } from '../../../utils/execFileNoThrow.js';

/** Public npm registry — bypasses .npmrc redirects in corporate environments */
const NPM_PUBLIC_REGISTRY = 'https://registry.npmjs.org';
/** Pinned version range for npx --package */
const VSKILL_VERSION_RANGE = '^0.5.0';

const VSKILL_INIT_ARGS = ['init', '--yes'];

export interface VskillInitResult {
  invoked: boolean;
  skipped: boolean;
  error?: string;
}

/**
 * Ensure `vskill init` runs in the project to sync skills to non-Claude agents.
 *
 * 1. Try `vskill init --yes` (globally installed)
 * 2. Try `npx --registry <public> vskill init --yes` (handles missing global + .npmrc issues)
 * 3. Skip gracefully with hint message (no failure)
 *
 * All errors are caught — this function never throws.
 */
export async function ensureVskillInit(projectRoot: string): Promise<VskillInitResult> {
  try {
    const errors: string[] = [];

    // Tier 1: Try global vskill init (preferred method)
    const vskillAvailable = await isCommandAvailable('vskill');
    if (vskillAvailable) {
      const result = await execFileNoThrow('vskill', VSKILL_INIT_ARGS, {
        cwd: projectRoot,
        timeout: 30000,
      });

      if (result.success) {
        return { invoked: true, skipped: false };
      }

      const vskillErr = result.stderr?.trim() || result.error?.message || 'unknown error';
      errors.push(`vskill: ${vskillErr}`);
      console.warn(`[vskill-init] vskill init failed: ${vskillErr} -- trying npx fallback`);
    }

    // Tier 2: Try npx with explicit public registry (bypasses .npmrc redirects)
    const npxAvailable = await isCommandAvailable('npx');
    if (npxAvailable) {
      const result = await execFileNoThrow('npx', [
        '--yes', '--registry', NPM_PUBLIC_REGISTRY, '--userconfig', '/dev/null', '--ignore-scripts',
        '--package', `vskill@${VSKILL_VERSION_RANGE}`,
        'vskill', ...VSKILL_INIT_ARGS,
      ], {
        cwd: projectRoot,
        timeout: 60000, // npx may need to download vskill first
      });

      if (result.success) {
        return { invoked: true, skipped: false };
      }

      const npxErr = result.stderr?.trim() || result.error?.message || 'unknown error';
      errors.push(`npx: ${npxErr}`);
      console.warn(`[vskill-init] npx vskill init failed: ${npxErr}`);
    }

    // Tier 3: Graceful skip
    if (errors.length === 0) {
      console.warn(`[vskill-init] vskill not available -- run 'npx --registry ${NPM_PUBLIC_REGISTRY} vskill init' manually to sync skills to non-Claude agents`);
    }
    return { invoked: false, skipped: true, error: errors.length > 0 ? errors.join('; ') : undefined };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[vskill-init] unexpected error: ${msg}`);
    return { invoked: false, skipped: true, error: msg };
  }
}
