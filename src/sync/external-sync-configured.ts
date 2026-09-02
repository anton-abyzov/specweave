/**
 * "Is any external tracker actually wired up?" — the gate every automatic
 * sync path must consult before it does work or, worse, announces work.
 *
 * A project with no GitHub/Jira/ADO configuration used to see
 * `✅ Auto-synced increment … to external tools` on `start` and `resume`,
 * while `doctor` in the same project said `.env file: not required (no
 * external sync enabled)`. Nothing had been synced anywhere.
 *
 * Deliberately dependency-free and synchronous (mirrors
 * core/living-docs/living-docs-enabled.ts) so the status-change trigger can
 * call it without pulling the sync engine in.
 *
 * @module sync/external-sync-configured
 */

import * as fs from 'fs';
import * as path from 'path';

/** Provider values that mean "nothing external". */
const NON_EXTERNAL_PROVIDERS = new Set(['', 'none', 'local', 'file', 'offline']);

/**
 * True when the project has an external tracker configured.
 *
 * Defensive by design: a missing or broken config means "not configured", so
 * the caller stays quiet rather than claiming a sync that cannot have run.
 */
export function externalSyncConfigured(projectRoot: string): boolean {
  let config: Record<string, any>;
  try {
    config = JSON.parse(
      fs.readFileSync(path.join(projectRoot, '.specweave', 'config.json'), 'utf-8')
    );
  } catch {
    return false;
  }

  // 2.0 shape — `specweave sync-setup` writes sync.enabled = true.
  const sync = config?.sync;
  if (sync?.enabled === true) return true;
  if (sync?.github?.enabled === true || sync?.jira?.enabled === true || sync?.ado?.enabled === true) {
    return true;
  }

  // 1.x block still written by the issue-tracker wizard.
  const tracker = config?.issueTracker;
  if (tracker?.enabled === true) return true;
  const provider = tracker?.provider ?? tracker?.type;
  if (typeof provider === 'string' && !NON_EXTERNAL_PROVIDERS.has(provider.trim().toLowerCase())) {
    return true;
  }

  return false;
}
