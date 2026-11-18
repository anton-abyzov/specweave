/**
 * `specweave init --force`: back up `.specweave/`, then remove it so init
 * starts over. Nothing is removed when the backup cannot be made.
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';

/**
 * Copy `.specweave/` to `.specweave.backup-<time>` beside it, then remove it.
 * The name carries the full time, so a second fresh start the same day keeps
 * the first backup. Returns the backup path, or null when the copy failed
 * (then `.specweave/` is left exactly as it was).
 */
export function backupAndClearSpecweave(targetDir: string, now: Date = new Date()): string | null {
  const specweave = path.join(targetDir, '.specweave');
  const backup = path.join(targetDir, `.specweave.backup-${now.toISOString().replace(/[:.]/g, '-')}`);
  try {
    fs.copySync(specweave, backup);
  } catch {
    return null;
  }
  fs.removeSync(specweave);
  return backup;
}
