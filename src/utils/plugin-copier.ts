/**
 * First-party plugin copier for SpecWeave.
 *
 * Copies plugin directories from specweave's bundled plugins/ folder
 * to the Claude Code commands directory (~/.claude/commands/<name>/).
 * Handles permissions, hash comparison, and lockfile updates.
 *
 * This replaces the vskill CLI shell-out for first-party (bundled) plugins.
 * Third-party plugins should still use vskill CLI directly.
 *
 * @since 1.0.279
 */

import {
  cpSync,
  mkdirSync,
  chmodSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CopyPluginOptions {
  /** Force reinstall even if hash matches lockfile */
  force?: boolean;
  /** Override target dir (default: ~/.claude/commands) */
  targetBaseDir?: string;
}

export interface CopyPluginResult {
  success: boolean;
  /** Content hash of source plugin directory */
  sha: string;
  /** Where the plugin was installed to */
  targetDir?: string;
  /** Error message if failed */
  error?: string;
  /** True if skipped because hash unchanged */
  skipped?: boolean;
}

interface LockfileSkillEntry {
  version: string;
  sha: string;
  tier: string;
  installedAt: string;
  source: string;
}

interface VskillLock {
  version: number;
  agents: string[];
  skills: Record<string, LockfileSkillEntry>;
  createdAt: string;
  updatedAt: string;
}

interface MarketplacePlugin {
  name: string;
  source: string;
  version: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLAUDE_CODE_COMMANDS_DIR = join(homedir(), '.claude', 'commands');
const LOCKFILE_NAME = 'vskill.lock';

// ---------------------------------------------------------------------------
// Hash
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 content hash (first 12 hex chars) for a plugin directory.
 */
export function computePluginHash(pluginDir: string): string {
  if (!existsSync(pluginDir)) return '';

  const hash = createHash('sha256');
  try {
    const files = readdirSync(pluginDir, { recursive: true }) as string[];
    for (const file of files.sort()) {
      const fullPath = join(pluginDir, file);
      try {
        hash.update(readFileSync(fullPath, 'utf-8'));
      } catch {
        // Skip directories, binary files, etc.
      }
    }
  } catch {
    // Directory not readable
  }

  return hash.digest('hex').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Fix hook permissions: chmod 755 on all .sh files recursively.
 */
export function fixHookPermissions(targetDir: string): void {
  try {
    const files = readdirSync(targetDir, { recursive: true }) as string[];
    for (const file of files) {
      if (file.endsWith('.sh')) {
        chmodSync(join(targetDir, file), 0o755);
      }
    }
  } catch {
    // Ignore permission errors
  }
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

/**
 * Read marketplace.json and return plugins array.
 */
function parseMarketplace(marketplacePath: string): MarketplacePlugin[] {
  try {
    const content = readFileSync(marketplacePath, 'utf-8');
    const manifest = JSON.parse(content);
    return Array.isArray(manifest.plugins) ? manifest.plugins : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Lockfile
// ---------------------------------------------------------------------------

/**
 * Read vskill.lock from a directory.
 */
export function readLockfile(dir: string): VskillLock | null {
  const p = join(dir, LOCKFILE_NAME);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as VskillLock;
  } catch {
    return null;
  }
}

/**
 * Write vskill.lock to a directory.
 */
export function writeLockfile(lock: VskillLock, dir: string): void {
  lock.updatedAt = new Date().toISOString();
  writeFileSync(join(dir, LOCKFILE_NAME), JSON.stringify(lock, null, 2) + '\n', 'utf-8');
}

/**
 * Ensure a lockfile exists, creating one if needed.
 */
export function ensureLockfile(dir: string): VskillLock {
  const existing = readLockfile(dir);
  if (existing) return existing;

  const lock: VskillLock = {
    version: 1,
    agents: ['claude-code'],
    skills: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeLockfile(lock, dir);
  return lock;
}

// ---------------------------------------------------------------------------
// Root finder
// ---------------------------------------------------------------------------

/**
 * Find the specweave package root from a start directory.
 * Walks up looking for package.json with name 'specweave' or '@specweave/core'.
 * Works for both development (source) and production (dist/) layouts.
 */
export function findSpecweaveRoot(startDir: string): string | null {
  let dir = resolve(startDir);

  for (let i = 0; i < 8; i++) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'specweave' || pkg.name === '@specweave/core') {
          return dir;
        }
      } catch {
        // Invalid JSON, keep looking
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Core: copyPlugin
// ---------------------------------------------------------------------------

/**
 * Copy a single first-party plugin to ~/.claude/commands/<name>/
 *
 * This replaces `vskill add --plugin <name> --force` for bundled plugins.
 */
export function copyPlugin(
  pluginName: string,
  specweaveRoot: string,
  options: CopyPluginOptions = {},
): CopyPluginResult {
  const targetBaseDir = options.targetBaseDir ?? CLAUDE_CODE_COMMANDS_DIR;

  // 1. Find marketplace.json
  const marketplacePath = join(specweaveRoot, '.claude-plugin', 'marketplace.json');
  if (!existsSync(marketplacePath)) {
    return { success: false, sha: '', error: 'marketplace.json not found' };
  }

  // 2. Resolve plugin source directory
  const plugins = parseMarketplace(marketplacePath);
  const pluginEntry = plugins.find(p => p.name === pluginName);
  if (!pluginEntry) {
    return { success: false, sha: '', error: `Plugin "${pluginName}" not in marketplace.json` };
  }

  const sourceDir = resolve(specweaveRoot, pluginEntry.source);
  if (!existsSync(sourceDir)) {
    return { success: false, sha: '', error: `Source dir not found: ${sourceDir}` };
  }

  // 3. Compute hash and check lockfile
  const sha = computePluginHash(sourceDir);
  const lockDir = process.cwd();
  const lock = ensureLockfile(lockDir);

  if (!options.force && lock.skills[pluginName]?.sha === sha) {
    return { success: true, sha, skipped: true };
  }

  // 4. Copy plugin to target
  const targetDir = join(targetBaseDir, pluginName);
  try {
    mkdirSync(targetDir, { recursive: true });
    cpSync(sourceDir, targetDir, { recursive: true });
    fixHookPermissions(targetDir);
  } catch (err) {
    return { success: false, sha, error: `Copy failed: ${(err as Error).message}` };
  }

  // 5. Update lockfile
  lock.skills[pluginName] = {
    version: pluginEntry.version || '0.0.0',
    sha,
    tier: 'BUNDLED',
    installedAt: new Date().toISOString(),
    source: 'local:specweave',
  };
  if (!lock.agents.includes('claude-code')) {
    lock.agents.push('claude-code');
  }
  try {
    writeLockfile(lock, lockDir);
  } catch {
    // Non-fatal: lockfile write failure shouldn't block install
  }

  return { success: true, sha, targetDir };
}
