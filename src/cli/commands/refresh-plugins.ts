/**
 * Refresh SpecWeave Plugins via vskill
 *
 * New vskill-backed plugin refresh command that replaces refresh-marketplace.
 * Uses vskill CLI (shell-out) for plugin installation, scanning, and lockfile management.
 *
 * Modes:
 *   - Default (lazy): Install only core `sw` plugin
 *   - --all: Install all plugins from marketplace.json
 *   - Hash comparison: Skip plugins whose content hash hasn't changed
 *
 * @since 1.0.273
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'node:crypto';
import { consoleLogger as logger } from '../../utils/logger.js';
import { execFileNoThrowSync, ExecResult } from '../../utils/execFileNoThrow.js';
import { getDirname } from '../../utils/esm-helpers.js';

const __dirname = getDirname(import.meta.url);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RefreshPluginsOptions {
  verbose?: boolean;
  force?: boolean;
  /** Install ALL plugins (not just core). Default: false (lazy mode - core only). */
  all?: boolean;
}

interface MarketplacePlugin {
  name: string;
  source: string;
  version: string;
  description?: string;
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Core plugins that are always installed in lazy mode */
const CORE_PLUGINS = ['sw'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the path to the specweave repo's marketplace.json.
 * Searches upwards from cwd or uses the specweave package install location.
 */
function findMarketplaceJson(): string | null {
  // Strategy 1: Look relative to this file's package (installed specweave)
  // The marketplace.json is at <specweave-root>/.claude-plugin/marketplace.json
  const candidates = [
    // Running from source (development)
    path.resolve(__dirname, '../../../.claude-plugin/marketplace.json'),
    // Running from dist (installed)
    path.resolve(__dirname, '../../../../.claude-plugin/marketplace.json'),
    // Current working directory (project using specweave as dependency)
    path.join(process.cwd(), '.claude-plugin/marketplace.json'),
    // Installed marketplace location (Claude Code manages this)
    path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.claude/plugins/marketplaces/specweave/.claude-plugin/marketplace.json'
    ),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Parse marketplace.json and return available plugins.
 */
function getAvailablePlugins(marketplacePath: string): MarketplacePlugin[] {
  try {
    const content = fs.readFileSync(marketplacePath, 'utf-8');
    const manifest = JSON.parse(content);
    if (!Array.isArray(manifest.plugins)) return [];
    return manifest.plugins.map((p: MarketplacePlugin) => ({
      name: p.name,
      source: p.source,
      version: p.version || '0.0.0',
      ...(p.description ? { description: p.description } : {}),
    }));
  } catch {
    return [];
  }
}

/**
 * Read vskill.lock from the current directory.
 */
function readLockfile(): VskillLock | null {
  const lockPath = path.join(process.cwd(), 'vskill.lock');
  if (!fs.existsSync(lockPath)) return null;
  try {
    const raw = fs.readFileSync(lockPath, 'utf-8');
    return JSON.parse(raw) as VskillLock;
  } catch {
    return null;
  }
}

/**
 * Write vskill.lock to the current directory.
 */
function writeLockfile(lock: VskillLock): void {
  lock.updatedAt = new Date().toISOString();
  const lockPath = path.join(process.cwd(), 'vskill.lock');
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
}

/**
 * Ensure a lockfile exists, creating one if needed.
 */
function ensureLockfile(): VskillLock {
  const existing = readLockfile();
  if (existing) return existing;

  const lock: VskillLock = {
    version: 1,
    agents: [],
    skills: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeLockfile(lock);
  return lock;
}

/**
 * Compute the content hash for a plugin's source directory.
 * Walks the plugin directory and hashes all readable file contents.
 */
function computePluginHash(pluginDir: string): string {
  if (!fs.existsSync(pluginDir)) return '';

  const hash = createHash('sha256');

  try {
    const files = fs.readdirSync(pluginDir, { recursive: true }) as string[];
    for (const file of files.sort()) {
      const fullPath = path.join(pluginDir, file);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        hash.update(content);
      } catch {
        // Skip unreadable files (directories, binary, etc.)
      }
    }
  } catch {
    // Directory not readable
  }

  return hash.digest('hex').slice(0, 12);
}

/**
 * Install a single plugin via vskill CLI (shell-out).
 */
function installPluginViaVskill(
  pluginName: string,
  pluginDirBase: string,
  options: RefreshPluginsOptions,
): { success: boolean; sha: string } {
  // Shell out to vskill add with --plugin and --pluginDir flags
  const args = [
    'add',
    'specweave',         // source identifier
    '--plugin', pluginName,
    '--pluginDir', pluginDirBase,
  ];

  if (options.force) {
    args.push('--force');
  }

  // Try to find vskill CLI
  const vskillPaths = [
    // In monorepo (development)
    path.resolve(__dirname, '../../../../../vskill/dist/index.js'),
    // Fallback: global vskill
    'vskill',
  ];

  let result: ExecResult = { stdout: '', stderr: '', exitCode: 1, success: false };

  for (const vskillPath of vskillPaths) {
    if (vskillPath === 'vskill') {
      result = execFileNoThrowSync('vskill', args) ?? result;
    } else {
      result = execFileNoThrowSync('node', [vskillPath, ...args]) ?? result;
    }

    if (result.success) break;
  }

  // Compute hash for lockfile
  const marketplaceJsonDir = path.dirname(pluginDirBase);
  const marketplace = getAvailablePlugins(
    path.join(marketplaceJsonDir, '.claude-plugin/marketplace.json')
  );
  const plugin = marketplace.find(p => p.name === pluginName);
  const pluginSourceDir = plugin?.source
    ? path.resolve(pluginDirBase, '..', plugin.source)
    : pluginDirBase;

  const sha = computePluginHash(pluginSourceDir);

  return { success: result?.success ?? false, sha };
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

/**
 * Refresh plugins using vskill.
 *
 * Default (lazy mode): installs only core `sw` plugin.
 * With --all flag: installs all plugins from marketplace.json.
 * Uses hash comparison to skip unchanged plugins.
 */
export async function refreshPluginsCommand(options: RefreshPluginsOptions = {}): Promise<void> {
  const lazyMode = !(options.all ?? false);

  console.log(chalk.blue.bold('\n  SpecWeave Plugin Refresh (vskill)'));
  console.log(chalk.blue.bold(`  Mode: ${lazyMode ? 'lazy (core only)' : 'all plugins'}\n`));

  // Step 1: Find marketplace.json
  const marketplacePath = findMarketplaceJson();
  if (!marketplacePath) {
    console.log(chalk.yellow('Could not find marketplace.json'));
    console.log(chalk.gray('  Run from within the specweave project or ensure it is installed.'));
    return;
  }

  const marketplaceDir = path.dirname(path.dirname(marketplacePath)); // Go up from .claude-plugin/
  logger.debug(`Found marketplace.json at ${marketplacePath}`);

  // Step 2: Read available plugins
  const allPlugins = getAvailablePlugins(marketplacePath);
  if (allPlugins.length === 0) {
    console.log(chalk.yellow('No plugins found in marketplace.json'));
    return;
  }

  console.log(chalk.gray(`  Found ${allPlugins.length} plugins in marketplace.json`));

  // Step 3: Determine which plugins to process
  const pluginsToProcess = lazyMode
    ? allPlugins.filter(p => CORE_PLUGINS.includes(p.name))
    : allPlugins;

  // Step 4: Read lockfile for hash comparison
  const lock = ensureLockfile();

  // Step 5: Process each plugin
  let installed = 0;
  let skipped = 0;
  let failed = 0;

  for (const plugin of pluginsToProcess) {
    const existingEntry = lock.skills[plugin.name];

    // Compute current hash for the plugin source
    const pluginSourceDir = path.resolve(marketplaceDir, plugin.source);
    const currentHash = computePluginHash(pluginSourceDir);

    // Skip if hash hasn't changed (unless --force)
    if (existingEntry && existingEntry.sha === currentHash && !options.force) {
      if (options.verbose) {
        console.log(chalk.gray(`  - ${plugin.name}: unchanged (skipped)`));
      }
      skipped++;
      continue;
    }

    // Install via vskill
    console.log(chalk.blue(`  Installing ${plugin.name}...`));

    const result = installPluginViaVskill(plugin.name, marketplaceDir, options);

    if (result.success) {
      installed++;
      console.log(chalk.green(`  + ${plugin.name} installed`));

      // Update lockfile entry
      lock.skills[plugin.name] = {
        version: plugin.version,
        sha: currentHash || result.sha,
        tier: 'SCANNED',
        installedAt: new Date().toISOString(),
        source: `local:specweave`,
      };
    } else {
      failed++;
      console.log(chalk.red(`  x ${plugin.name} failed`));
    }
  }

  // Step 6: Write updated lockfile
  writeLockfile(lock);

  // Step 7: Summary
  console.log('');
  console.log(chalk.blue.bold('  Summary'));
  console.log(chalk.green(`  Installed: ${installed}`));
  if (skipped > 0) console.log(chalk.gray(`  Skipped (unchanged): ${skipped}`));
  if (failed > 0) console.log(chalk.red(`  Failed: ${failed}`));
  console.log('');

  if (lazyMode) {
    console.log(chalk.cyan('  Lazy mode: Only core plugin installed.'));
    console.log(chalk.gray('  Use --all to install all plugins.'));
  }

  console.log('');
}
