/**
 * DCI Scripts Installer
 *
 * Copies skill-context.sh (and any future DCI scripts) from the plugin
 * directory to .specweave/scripts/ in the user's project so that DCI
 * blocks in SKILL.md files can execute.
 *
 * The DCI blocks use `|| true` for graceful degradation when scripts
 * are missing, but installing them enables project context injection.
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import { findSourceDir } from './path-utils.js';
import { getDirname } from '../../../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

/** Scripts that DCI blocks reference and need to be copied */
const DCI_SCRIPTS = ['skill-context.sh'];

/**
 * Copy DCI scripts from plugin source to .specweave/scripts/ in the project.
 *
 * Idempotent — overwrites existing scripts to keep them up to date.
 * Sets executable permission on Unix systems.
 *
 * @param projectDir - The user's project root directory
 * @returns Number of scripts successfully copied
 */
export function installDciScripts(projectDir: string): number {
  const sourceScriptsDir = findSourceDir('plugins/specweave/scripts', __dirname);

  if (!fs.existsSync(sourceScriptsDir)) {
    return 0;
  }

  const targetScriptsDir = path.join(projectDir, '.specweave', 'scripts');
  fs.mkdirSync(targetScriptsDir, { recursive: true });

  let copied = 0;

  for (const script of DCI_SCRIPTS) {
    const sourcePath = path.join(sourceScriptsDir, script);
    const targetPath = path.join(targetScriptsDir, script);

    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    try {
      fs.copyFileSync(sourcePath, targetPath);
      // Set executable on Unix (no-op on Windows)
      try {
        fs.chmodSync(targetPath, 0o755);
      } catch {
        // chmodSync may fail on Windows — non-critical
      }
      copied++;
    } catch {
      // Non-critical — DCI blocks use || true for graceful degradation
    }
  }

  return copied;
}
