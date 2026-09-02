/**
 * Installation Health Checker - detects legacy commands dirs, stale cache,
 * lockfile integrity issues, and plugin cache hook freshness in ~/.claude/
 *
 * @since 1.0.279
 * @updated 1.0.356 - Migrated from commands-based to native plugin cache checks
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  rmSync,
  copyFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import type {
  HealthChecker,
  CategoryResult,
  CheckResult,
  DoctorOptions,
} from '../types.js';
import { calculateOverallStatus } from '../types.js';
import { computePluginHash, readGlobalLockfile } from '../../../utils/plugin-copier.js';
import { npmRegistryFlag } from '../../../utils/npm-constants.js';

/**
 * The 2.0 plugin hook assets copied into Claude Code's plugin cache.
 * The old shell hooks (user-prompt-submit.sh et al) were removed in 2.0.
 */
const PLUGIN_HOOK_ASSETS = ['hooks.json', 'run.mjs'] as const;

interface InstallationHealthOptions {
  commandsDir?: string;
  cacheDir?: string;
  /** Global skills dir (~/.claude/skills). Injectable for tests. */
  skillsDir?: string;
  /** Root of the specweave package (holds .claude-plugin/marketplace.json). Injectable for tests. */
  packageRoot?: string;
}

/**
 * SpecWeave's own plugin digest (computePluginHash) is a 12-char sha256 prefix.
 * vskill records a FULL 64-char sha256 of the skill source instead — the two
 * are not comparable, and comparing them produced a permanent, unfixable
 * "hash mismatch" in `doctor` after every `specweave update`.
 */
const FOREIGN_DIGEST_RE = /^[0-9a-f]{64}$/;

/** How long a `npm view specweave version` answer stays good for. */
export const NPM_VERSION_CACHE_MS = 24 * 60 * 60 * 1000;

export class InstallationHealthChecker implements HealthChecker {
  category = 'Installation Health';
  private commandsDir: string;
  private cacheDir: string;
  private skillsDir: string;
  private packageRootOverride?: string;

  constructor(opts?: InstallationHealthOptions) {
    const home = homedir();
    this.commandsDir = opts?.commandsDir ?? join(home, '.claude', 'commands');
    this.cacheDir = opts?.cacheDir ?? join(home, '.claude', 'plugins', 'cache');
    this.skillsDir = opts?.skillsDir ?? join(home, '.claude', 'skills');
    this.packageRootOverride = opts?.packageRoot;
  }

  async check(
    projectRoot: string,
    options: DoctorOptions
  ): Promise<CategoryResult> {
    const checks: CheckResult[] = [];

    checks.push(this.checkLegacyCommandsDirs(options.fix ?? false));
    checks.push(this.checkStaleCacheDirs(options.fix ?? false));
    checks.push(this.checkLockfileIntegrity(projectRoot, options.fix ?? false));
    checks.push(this.checkPluginCacheHookFreshness(options.fix ?? false));
    checks.push(...await this.checkStaleLockfiles(projectRoot, options.fix ?? false));
    if (!options.quick) {
      checks.push(this.checkUpdateHealth(options.fix ?? false, projectRoot));
    }

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  /**
   * Detect legacy ~/.claude/commands/<name>/ directories.
   *
   * Since 1.0.356, plugins are installed via Claude Code's native plugin system
   * to ~/.claude/plugins/cache/. Any remaining dirs in ~/.claude/commands/ are
   * legacy artifacts that should be removed to avoid duplicate slash commands.
   */
  private checkLegacyCommandsDirs(fix: boolean): CheckResult {
    if (!existsSync(this.commandsDir)) {
      return {
        name: 'Legacy commands directories',
        status: 'pass',
        message: 'no legacy commands directory (clean)',
      };
    }

    const legacyDirs = this.listDirs(this.commandsDir);

    if (legacyDirs.length === 0) {
      return {
        name: 'Legacy commands directories',
        status: 'pass',
        message: 'commands directory is empty',
      };
    }

    if (fix) {
      let removed = 0;
      for (const dir of legacyDirs) {
        const fullPath = join(this.commandsDir, dir);
        try {
          rmSync(fullPath, { recursive: true, force: true });
          removed++;
        } catch {
          // Best effort
        }
      }
      return {
        name: 'Legacy commands directories',
        status: removed === legacyDirs.length ? 'pass' : 'warn',
        message: `${removed}/${legacyDirs.length} legacy dir(s) removed (migrated to native plugin cache)`,
        details: legacyDirs.map(d => `Legacy: ~/.claude/commands/${d}`),
        fixSuggestion: 'Restart Claude Code to use native plugin cache',
      };
    }

    return {
      name: 'Legacy commands directories',
      status: 'warn',
      message: `${legacyDirs.length} legacy commands dir(s) found (should use native plugin cache)`,
      details: legacyDirs.map(d => `Legacy: ~/.claude/commands/${d}`),
      fixSuggestion: 'Run: specweave doctor --fix',
    };
  }

  /**
   * Detect stale/orphaned cache directories.
   * - temp_local_* dirs are always orphaned (interrupted installs)
   * - Other dirs are reported but not auto-deleted
   */
  private checkStaleCacheDirs(fix: boolean): CheckResult {
    if (!existsSync(this.cacheDir)) {
      return {
        name: 'Stale cache directories',
        status: 'pass',
        message: 'cache directory not found (clean)',
      };
    }

    const tempDirs: string[] = [];
    const details: string[] = [];

    // Walk top-level entries in cache dir
    for (const entry of this.listDirs(this.cacheDir)) {
      if (entry.startsWith('temp_local_')) {
        tempDirs.push(entry);
        const fullPath = join(this.cacheDir, entry);
        try {
          const stat = statSync(fullPath);
          const ageHours = Math.round(
            (Date.now() - stat.mtimeMs) / (1000 * 60 * 60)
          );
          details.push(`Orphaned temp dir: ${entry} (${ageHours}h old)`);
        } catch {
          details.push(`Orphaned temp dir: ${entry}`);
        }
      }
    }

    if (tempDirs.length === 0) {
      return {
        name: 'Stale cache directories',
        status: 'pass',
        message: 'no stale cache directories',
      };
    }

    if (fix) {
      let removed = 0;
      for (const dir of tempDirs) {
        const fullPath = join(this.cacheDir, dir);
        try {
          if (existsSync(fullPath)) {
            rmSync(fullPath, { recursive: true, force: true });
            removed++;
          }
        } catch {
          // Ignore cleanup errors (e.g. race conditions with concurrent processes)
        }
      }
      return {
        name: 'Stale cache directories',
        status: removed === tempDirs.length ? 'pass' : 'warn',
        message: `${removed}/${tempDirs.length} stale dir(s) removed`,
        details,
        fixSuggestion: `Deleted ${removed} temp_local dir(s)`,
      };
    }

    return {
      name: 'Stale cache directories',
      status: 'warn',
      message: `${tempDirs.length} stale cache dir(s) detected`,
      details,
      fixSuggestion: 'Run: specweave doctor --fix',
    };
  }

  /**
   * Locations a locked skill may legitimately live in, in resolution order.
   *
   * `specweave init` installs the sw plugin's skills PROJECT-LOCAL into
   * `<project>/.claude/skills/` (that is what its own output says), and vskill
   * installs third-party skills there too. Only looking in the Claude plugin
   * cache made every fresh `init` end in
   * "N skill(s) missing from plugin cache" and a doctor exit code of 1.
   */
  private skillSearchPaths(projectRoot: string, name: string): string[] {
    return [
      join(this.cacheDir, 'specweave', name),
      join(this.commandsDir, name),
      join(projectRoot, '.claude', 'skills', name),
      join(this.skillsDir, name),
    ];
  }

  /** Root of the running specweave package, or null. */
  private packageRoot(): string | null {
    if (this.packageRootOverride) return this.packageRootOverride;
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 8; i++) {
      try {
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as { name?: string };
        if (pkg.name === 'specweave') return dir;
      } catch { /* keep walking */ }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }

  /**
   * Source directory of a bundled marketplace plugin in the running package
   * (e.g. `sw` -> `<pkg>/plugins/specweave`). This is the directory the sha in
   * the global lockfile was computed from, so it is the ONLY dir a bundled
   * entry's hash can meaningfully be compared against.
   */
  private bundledPluginSourceDir(name: string): string | null {
    const root = this.packageRoot();
    if (!root) return null;
    try {
      const marketplace = JSON.parse(
        readFileSync(join(root, '.claude-plugin', 'marketplace.json'), 'utf-8')
      ) as { plugins?: Array<{ name?: string; source?: string }> };
      const entry = (marketplace.plugins ?? []).find(p => p?.name === name);
      if (!entry?.source) return null;
      const dir = join(root, entry.source);
      return existsSync(dir) ? dir : null;
    } catch {
      return null;
    }
  }

  /**
   * A bundled plugin installed PROJECT-LOCAL is exploded into
   * `<project>/.claude/skills/<skill>/` — one dir per skill, no dir named after
   * the plugin. Detect that layout so `init`'s own default install mode is not
   * reported as "missing from plugin cache".
   */
  private bundledSkillsCopiedIntoProject(projectRoot: string, name: string): boolean {
    const sourceDir = this.bundledPluginSourceDir(name);
    if (!sourceDir) return false;
    const skillsDir = join(sourceDir, 'skills');
    if (!existsSync(skillsDir)) return false;
    const projectSkills = join(projectRoot, '.claude', 'skills');
    if (!existsSync(projectSkills)) return false;
    return this.listDirs(skillsDir).some(skill => existsSync(join(projectSkills, skill, 'SKILL.md')));
  }

  /**
   * Verify installed skills recorded in the lockfiles are actually present, and
   * — where the digest is one SpecWeave itself wrote — that it still matches.
   *
   * Provenance matters:
   *   - global `~/.specweave/plugins-lock.json` = SpecWeave-managed plugins
   *     (12-char computePluginHash digest). A missing one is a real failure.
   *   - project `vskill.lock` = third-party skills installed by vskill, with a
   *     full 64-char sha256 of the source file. That digest is NOT comparable
   *     with computePluginHash, so it is presence-checked only; a missing one
   *     is a warning pointing at vskill, never a `specweave doctor` failure.
   */
  private checkLockfileIntegrity(
    projectRoot: string,
    fix: boolean
  ): CheckResult {
    type Entry = { sha: string; version: string; source: string; tier?: string };
    const mergedSkills: Record<string, Entry> = {};

    // Read global lock first (bundled plugins)
    try {
      const globalLock = readGlobalLockfile();
      if (globalLock?.skills) {
        Object.assign(mergedSkills, globalLock.skills);
      }
    } catch { /* non-fatal */ }

    // Read project lock (third-party skills, may override)
    const lockPath = join(projectRoot, 'vskill.lock');
    if (existsSync(lockPath)) {
      try {
        const projectLock = JSON.parse(readFileSync(lockPath, 'utf-8'));
        if (projectLock.skills) {
          Object.assign(mergedSkills, projectLock.skills);
        }
      } catch {
        return {
          name: 'Lockfile integrity',
          status: 'warn',
          message: 'could not parse vskill.lock',
          fixSuggestion: 'Run: specweave refresh-plugins',
        };
      }
    }

    if (Object.keys(mergedSkills).length === 0) {
      return {
        name: 'Lockfile integrity',
        status: 'skip',
        message: 'no lockfile entries found',
      };
    }

    const lockfile = { skills: mergedSkills };

    /**
     * Provenance comes from the ENTRY, not from which file it sits in: a
     * bundled `sw` entry can legitimately live in either lockfile, while a
     * `github:`/`npm:` entry is always vskill's.
     */
    const isVskillManaged = (entry: Entry): boolean =>
      !(entry.source ?? '').startsWith('local:') && entry.tier !== 'BUNDLED';
    const foreign = new Set(
      Object.entries(lockfile.skills).filter(([, e]) => isVskillManaged(e)).map(([n]) => n)
    );

    const mismatches: string[] = [];
    /** Missing SpecWeave-managed plugins — a genuine broken install. */
    const missing: string[] = [];
    /** Missing vskill-managed skills — vskill's problem, not a doctor failure. */
    const missingForeign: string[] = [];

    for (const [name, entry] of Object.entries(lockfile.skills)) {
      const isForeign = foreign.has(name);
      const installedDir = this.skillSearchPaths(projectRoot, name).find(p => existsSync(p)) ?? null;
      const present = installedDir !== null
        || (!isForeign && this.bundledSkillsCopiedIntoProject(projectRoot, name));

      if (!present) {
        (isForeign ? missingForeign : missing).push(name);
        continue;
      }

      // Only compare digests SpecWeave itself produced.
      if (isForeign || FOREIGN_DIGEST_RE.test(entry.sha ?? '')) continue;

      // A bundled entry's sha is the hash of the plugin SOURCE in the package,
      // not of whatever the installer exploded into the cache/project.
      const hashDir = this.bundledPluginSourceDir(name) ?? installedDir;
      if (!hashDir) continue;

      try {
        const currentHash = computePluginHash(hashDir);
        if (currentHash !== entry.sha) {
          mismatches.push(`${name}: expected ${entry.sha}, got ${currentHash}`);
        }
      } catch {
        mismatches.push(`${name}: could not compute hash`);
      }
    }

    if (missing.length > 0) {
      const allDetails = [
        ...missing.map(m => `Missing: ${m}`),
        ...missingForeign.map(m => `Missing (vskill-managed): ${m}`),
        ...mismatches.map(m => `Mismatch: ${m}`),
      ];
      const mismatchNote = mismatches.length > 0
        ? ` (also ${mismatches.length} hash mismatch(es))`
        : '';

      if (fix) {
        try {
          execSync('specweave refresh-plugins', { stdio: 'pipe' });
          return {
            name: 'Lockfile integrity',
            status: 'warn',
            message: `${missing.length} skill(s) were missing${mismatchNote}, ran refresh-plugins`,
            details: allDetails,
            fixSuggestion: 'Ran: specweave refresh-plugins',
          };
        } catch (err) {
          return {
            name: 'Lockfile integrity',
            status: 'fail',
            message: `refresh-plugins failed: ${err instanceof Error ? err.message : 'unknown error'}`,
            details: allDetails,
            fixSuggestion: 'Run: specweave refresh-plugins',
          };
        }
      }
      return {
        name: 'Lockfile integrity',
        status: 'fail',
        message: `${missing.length} skill(s) missing from plugin cache${mismatchNote}`,
        details: allDetails,
        fixSuggestion: 'Run: specweave refresh-plugins',
      };
    }

    if (mismatches.length > 0) {
      if (fix) {
        // Update lockfile hashes to match currently installed files
        try {
          const updatedSkills: typeof lockfile.skills = {};
          for (const [name, entry] of Object.entries(lockfile.skills)) {
            const dir = this.bundledPluginSourceDir(name)
              ?? this.skillSearchPaths(projectRoot, name).find(p => existsSync(p))
              ?? null;
            if (dir && !foreign.has(name) && !FOREIGN_DIGEST_RE.test(entry.sha ?? '')) {
              try {
                updatedSkills[name] = { ...entry, sha: computePluginHash(dir) };
              } catch {
                updatedSkills[name] = entry;
              }
            } else {
              updatedSkills[name] = entry;
            }
          }
          writeFileSync(lockPath, JSON.stringify({ ...lockfile, skills: updatedSkills }, null, 2) + '\n', 'utf-8');
          return {
            name: 'Lockfile integrity',
            status: 'pass',
            message: `${mismatches.length} hash mismatch(es) corrected in lockfile`,
            fixSuggestion: 'Updated lockfile hashes',
          };
        } catch (err) {
          return {
            name: 'Lockfile integrity',
            status: 'warn',
            message: `Could not update lockfile: ${err instanceof Error ? err.message : 'unknown error'}`,
            details: mismatches,
            fixSuggestion: 'Run: specweave update',
          };
        }
      }
      return {
        name: 'Lockfile integrity',
        status: 'warn',
        message: `${mismatches.length} hash mismatch(es) detected`,
        details: mismatches,
        fixSuggestion: 'Run: specweave doctor --fix',
      };
    }

    if (missingForeign.length > 0) {
      return {
        name: 'Lockfile integrity',
        status: 'warn',
        message: `${missingForeign.length} vskill-managed skill(s) not installed`,
        details: missingForeign.map(m => `Missing: ${m}`),
        fixSuggestion: `Run: npx vskill install ${missingForeign[0]}`,
      };
    }

    return {
      name: 'Lockfile integrity',
      status: 'pass',
      message: 'all locked skills present',
    };
  }

  /**
   * Detect stale hooks in ~/.claude/plugins/cache/specweave/.
   *
   * Claude Code's plugin system copies hooks to its own cache directory when
   * `claude plugin install` runs. If the source (npm package) is updated but
   * the cache isn't refreshed, hooks run stale code. This check compares the
   * 2.0 plugin hook assets (hooks.json + the run.mjs launcher) in the cache
   * against the source and fixes mismatches.
   *
   * @since 1.0.306
   */
  private checkPluginCacheHookFreshness(fix: boolean): CheckResult {
    const pluginCacheBase = join(this.cacheDir, 'specweave', 'sw');

    if (!existsSync(pluginCacheBase)) {
      return {
        name: 'Plugin cache hook freshness',
        status: 'pass',
        message: 'no specweave plugin cache found (clean)',
      };
    }

    // Find the specweave npm package's hooks/ dir (walk up from this file)
    const sourceHooksDir = this.findSourceHooksDir();
    if (!sourceHooksDir) {
      return {
        name: 'Plugin cache hook freshness',
        status: 'skip',
        message: 'could not locate source hooks (npm package not found)',
      };
    }

    /** [cachedPath, sourcePath] pairs whose contents differ. */
    const staleHooks: Array<[string, string]> = [];

    for (const versionDir of this.listDirs(pluginCacheBase)) {
      for (const asset of PLUGIN_HOOK_ASSETS) {
        const sourcePath = join(sourceHooksDir, asset);
        const cachedHook = join(pluginCacheBase, versionDir, 'hooks', asset);
        if (!existsSync(sourcePath) || !existsSync(cachedHook)) continue;

        try {
          if (readFileSync(cachedHook, 'utf-8') !== readFileSync(sourcePath, 'utf-8')) {
            staleHooks.push([cachedHook, sourcePath]);
          }
        } catch {
          // Can't read = skip
        }
      }
    }

    if (staleHooks.length === 0) {
      return {
        name: 'Plugin cache hook freshness',
        status: 'pass',
        message: 'plugin cache hooks are up to date',
      };
    }

    if (fix) {
      let fixed = 0;
      for (const [cachedHook, sourcePath] of staleHooks) {
        try {
          copyFileSync(sourcePath, cachedHook);
          fixed++;
        } catch {
          // Best effort
        }
      }
      return {
        name: 'Plugin cache hook freshness',
        status: fixed === staleHooks.length ? 'pass' : 'warn',
        message: `${fixed}/${staleHooks.length} stale hook(s) updated from source`,
        details: staleHooks.map(([cachedHook]) => `Updated: ${cachedHook}`),
        fixSuggestion: 'Restart Claude Code to pick up updated hooks',
      };
    }

    return {
      name: 'Plugin cache hook freshness',
      status: 'warn',
      message: `${staleHooks.length} stale hook(s) in plugin cache`,
      details: staleHooks.map(([cachedHook]) => `Stale: ${cachedHook}`),
      fixSuggestion: 'Run: specweave doctor --fix (or specweave update)',
    };
  }

  /**
   * Locate the authoritative `plugins/specweave/hooks/` directory.
   *
   * Resolution order:
   * 1. Walk up from __dirname to find package.json with name "specweave"
   * 2. Global npm install via `npm root -g`
   * 3. ~/.claude/plugins/marketplaces/specweave/
   */
  private findSourceHooksDir(): string | null {
    const hooksRelPath = join('plugins', 'specweave', 'hooks');
    /** A hooks dir is only authoritative if it carries the manifest. */
    const isHooksDir = (dir: string) => existsSync(join(dir, 'hooks.json'));

    // 1. Walk up from __dirname
    try {
      let dir = __dirname;
      for (let i = 0; i < 10; i++) {
        const pkgPath = join(dir, 'package.json');
        if (existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            if (pkg.name === 'specweave') {
              const hooksDir = join(dir, hooksRelPath);
              if (isHooksDir(hooksDir)) return hooksDir;
            }
          } catch { /* continue */ }
        }
        const parent = join(dir, '..');
        if (parent === dir) break;
        dir = parent;
      }
    } catch { /* fallback */ }

    // 2. Global npm install
    try {
      const npmRoot = execSync('npm root -g', { encoding: 'utf-8', timeout: 5000 }).trim();
      const globalPath = join(npmRoot, 'specweave', hooksRelPath);
      if (isHooksDir(globalPath)) return globalPath;
    } catch { /* fallback */ }

    // 3. Marketplace path
    const marketplacePath = join(homedir(), '.claude', 'plugins', 'marketplaces', 'specweave', hooksRelPath);
    if (isHooksDir(marketplacePath)) return marketplacePath;

    return null;
  }

  /**
   * Detect (and optionally remove) stale lockfiles:
   *   - Legacy `skills-lock.json` files (dead format)
   *   - Orphaned child-repo `vskill.lock` files in umbrella projects
   *
   * @since 1.0.541
   */
  private async checkStaleLockfiles(
    projectRoot: string,
    fix: boolean
  ): Promise<CheckResult[]> {
    const { cleanupLegacyLockfiles, cleanupOrphanedChildLocks } = await import(
      '../../../utils/cleanup-stale-plugins.js'
    );

    const threshold = fix ? 0 : 5000;

    const legacyResult = cleanupLegacyLockfiles(projectRoot, {
      mtimeThresholdMs: threshold,
    });
    const orphanResult = cleanupOrphanedChildLocks(projectRoot, {
      mtimeThresholdMs: threshold,
    });

    const results: CheckResult[] = [];

    // Legacy lockfiles check
    const legacyTotal = legacyResult.removedCount + legacyResult.skippedCount;
    if (legacyTotal === 0) {
      results.push({
        name: 'Legacy lockfiles',
        status: 'pass',
        message: 'no stale lockfiles',
      });
    } else if (fix) {
      results.push({
        name: 'Legacy lockfiles',
        status: legacyResult.removedCount > 0 ? 'pass' : 'warn',
        message: `${legacyResult.removedCount} legacy lockfile(s) removed`,
        details: legacyResult.removedPaths.map(p => `Removed: ${p}`),
      });
    } else {
      results.push({
        name: 'Legacy lockfiles',
        status: 'warn',
        message: `${legacyTotal} legacy lockfile(s) found`,
        details: [
          ...legacyResult.removedPaths.map(p => `Stale: ${p}`),
          ...legacyResult.skippedPaths.map(p => `Recent: ${p}`),
        ],
        fixSuggestion: 'Run: specweave doctor --fix',
      });
    }

    // Orphaned child lockfiles check
    const orphanTotal = orphanResult.removedCount + orphanResult.skippedCount;
    if (orphanTotal === 0) {
      results.push({
        name: 'Orphaned child lockfiles',
        status: 'pass',
        message: 'no stale lockfiles',
      });
    } else if (fix) {
      results.push({
        name: 'Orphaned child lockfiles',
        status: orphanResult.removedCount > 0 ? 'pass' : 'warn',
        message: `${orphanResult.removedCount} orphaned lockfile(s) removed`,
        details: orphanResult.removedPaths.map(p => `Removed: ${p}`),
      });
    } else {
      results.push({
        name: 'Orphaned child lockfiles',
        status: 'warn',
        message: `${orphanTotal} orphaned child lockfile(s) found`,
        details: [
          ...orphanResult.removedPaths.map(p => `Stale: ${p}`),
          ...orphanResult.skippedPaths.map(p => `Recent: ${p}`),
        ],
        fixSuggestion: 'Run: specweave doctor --fix',
      });
    }

    return results;
  }

  /**
   * Check if specweave can be updated successfully.
   * Detects stale npm cache and CDN propagation issues.
   * When fix=true: clears npm cache.
   *
   * @since 1.0.395
   */
  /**
   * Run an npm command against the public registry with a clean environment.
   * Always bypasses user auth config to prevent E401 from stale tokens.
   */
  private npmPublicExec(command: string, timeout: number): string {
    const env = { ...process.env };
    delete env['NPM_TOKEN'];
    for (const key of Object.keys(env)) {
      if (
        key.startsWith('npm_config_') &&
        (key.includes('authToken') || key.includes('_auth') || key.includes('_password'))
      ) {
        delete env[key];
      }
    }
    const emptyConfig = process.platform === 'win32' ? 'NUL' : '/dev/null';
    env['npm_config_userconfig'] = emptyConfig;
    env['npm_config_globalconfig'] = join(
      process.platform === 'win32' ? (process.env['TEMP'] || 'C:\\Temp') : '/tmp',
      '.specweave-npm-noop'
    );
    return execSync(`${command} ${npmRegistryFlag()}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
      env,
    }).trim();
  }

  /**
   * Latest published version, cached for 24 h under
   * `.specweave/state/npm-version-check.json`. `npm view` is a network round
   * trip; doctor runs often enough that hitting the registry every time is
   * the single slowest check in the report.
   */
  private latestPublishedVersion(projectRoot: string): string {
    const cachePath = join(projectRoot, '.specweave', 'state', 'npm-version-check.json');
    try {
      const cached = JSON.parse(readFileSync(cachePath, 'utf-8')) as { version?: string; checkedAt?: number };
      if (cached.version && typeof cached.checkedAt === 'number'
        && Date.now() - cached.checkedAt < NPM_VERSION_CACHE_MS) {
        return cached.version;
      }
    } catch {
      // no cache / unreadable — fall through to the network
    }

    const version = this.npmPublicExec('npm view specweave version', 15000);
    try {
      mkdirSync(join(projectRoot, '.specweave', 'state'), { recursive: true });
      writeFileSync(cachePath, JSON.stringify({ version, checkedAt: Date.now() }, null, 2), 'utf-8');
    } catch {
      // caching is best-effort
    }
    return version;
  }

  /**
   * Version of the CLI that is ACTUALLY EXECUTING, read from its own
   * package.json.
   *
   * Shelling out to `specweave --version` answered for whatever `specweave`
   * happens to be first on PATH — a different (usually older) install, or the
   * marketplace plugin cache — so `doctor` told users running the newest CLI
   * that they were outdated. It compared two numbers from two different
   * installs under a "your CLI is out of date" label.
   */
  runningCliVersion(): string | null {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 8; i++) {
      try {
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as {
          name?: string;
          version?: string;
        };
        if (pkg.name === 'specweave' && typeof pkg.version === 'string') return pkg.version;
      } catch { /* keep walking */ }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }

  private checkUpdateHealth(fix: boolean, projectRoot: string): CheckResult {
    // The version of the binary the user is running RIGHT NOW.
    const installedVersion = this.runningCliVersion();
    if (!installedVersion) {
      return {
        name: 'Update health',
        status: 'skip',
        message: 'could not determine installed version',
      };
    }

    // Get latest version from npm — always use clean env to avoid E401 from stale tokens
    let latestVersion: string;
    try {
      latestVersion = this.latestPublishedVersion(projectRoot);
    } catch {
      return {
        name: 'Update health',
        status: 'warn',
        message: 'could not query npm registry (network issue or npm not configured)',
        fixSuggestion: 'Check network connection and npm configuration',
      };
    }

    if (installedVersion === latestVersion) {
      return {
        name: 'Update health',
        status: 'pass',
        message: `up to date (v${installedVersion})`,
      };
    }

    // Outdated — verify the latest version is actually installable (detect CDN issues)
    try {
      this.npmPublicExec(`npm view specweave@${latestVersion} version`, 15000);
      // Version is resolvable, just outdated
      return {
        name: 'Update health',
        status: 'warn',
        message: `outdated: v${installedVersion} (latest: v${latestVersion})`,
        fixSuggestion: 'Run: specweave update',
      };
    } catch (error: any) {
      const stderr = error.stderr?.toString() || error.message || '';
      if (stderr.includes('ETARGET') || stderr.includes('notarget')) {
        if (fix) {
          try {
            execSync('npm cache clean --force', {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
              timeout: 30000,
            });
            return {
              name: 'Update health',
              status: 'warn',
              message: `npm cache cleared (v${latestVersion} had CDN propagation issue)`,
              fixSuggestion: 'Run: specweave update',
            };
          } catch {
            return {
              name: 'Update health',
              status: 'fail',
              message: 'npm cache clean failed for CDN propagation issue',
              fixSuggestion: 'Run manually: npm cache clean --force && specweave update',
            };
          }
        }
        return {
          name: 'Update health',
          status: 'fail',
          message: `v${latestVersion} not yet available on npm CDN (propagation delay)`,
          fixSuggestion: 'Run: specweave doctor --fix (clears npm cache)',
        };
      }

      // Some other resolution error — still outdated
      return {
        name: 'Update health',
        status: 'warn',
        message: `outdated: v${installedVersion} (latest: v${latestVersion})`,
        fixSuggestion: 'Run: specweave update',
      };
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  /** List immediate subdirectories of a path. */
  private listDirs(dir: string): string[] {
    try {
      return readdirSync(dir).filter(e => {
        try {
          return statSync(join(dir, e)).isDirectory();
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }
}
