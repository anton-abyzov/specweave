/**
 * Installation Health Checker - detects ghost commands, stale cache,
 * lockfile integrity issues, and namespace pollution in ~/.claude/
 */

import {
  existsSync,
  readdirSync,
  statSync,
  readFileSync,
  unlinkSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type {
  HealthChecker,
  CategoryResult,
  CheckResult,
  DoctorOptions,
} from '../types.js';
import { calculateOverallStatus } from '../types.js';
import {
  shouldSkipFromCommands,
  computePluginHash,
} from '../../../utils/plugin-copier.js';

interface InstallationHealthOptions {
  commandsDir?: string;
  cacheDir?: string;
}

export class InstallationHealthChecker implements HealthChecker {
  category = 'Installation Health';
  private commandsDir: string;
  private cacheDir: string;

  constructor(opts?: InstallationHealthOptions) {
    const home = homedir();
    this.commandsDir = opts?.commandsDir ?? join(home, '.claude', 'commands');
    this.cacheDir = opts?.cacheDir ?? join(home, '.claude', 'plugins', 'cache');
  }

  async check(
    projectRoot: string,
    options: DoctorOptions
  ): Promise<CategoryResult> {
    const checks: CheckResult[] = [];

    checks.push(this.checkGhostCommands(options.fix ?? false));
    checks.push(this.checkStaleCacheDirs(options.fix ?? false));
    checks.push(this.checkLockfileIntegrity(projectRoot, options.fix ?? false));
    checks.push(this.checkNamespacePollution(options.fix ?? false));

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  /**
   * Scan commands dir for ghost .md files that should have been filtered.
   * Ghost files = files that shouldSkipFromCommands() would exclude.
   */
  private checkGhostCommands(fix: boolean): CheckResult {
    if (!existsSync(this.commandsDir)) {
      return {
        name: 'Ghost slash commands',
        status: 'pass',
        message: 'commands directory not found (clean)',
      };
    }

    const ghosts: string[] = [];

    // Walk each plugin directory inside commands/
    for (const pluginName of this.listDirs(this.commandsDir)) {
      const pluginDir = join(this.commandsDir, pluginName);
      const mdFiles = this.walkMdFiles(pluginDir, '');

      for (const relPath of mdFiles) {
        if (shouldSkipFromCommands(relPath)) {
          ghosts.push(join(pluginName, relPath));
        }
      }
    }

    if (ghosts.length === 0) {
      return {
        name: 'Ghost slash commands',
        status: 'pass',
        message: 'no ghost commands found',
      };
    }

    if (fix) {
      for (const ghost of ghosts) {
        const fullPath = join(this.commandsDir, ghost);
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
        }
      }
      return {
        name: 'Ghost slash commands',
        status: 'warn',
        message: `${ghosts.length} ghost command(s) found and removed`,
        details: ghosts.map(g => `Ghost: ${g}`),
        fixSuggestion: `Deleted ${ghosts.length} ghost file(s)`,
      };
    }

    return {
      name: 'Ghost slash commands',
      status: 'warn',
      message: `${ghosts.length} ghost command(s) detected`,
      details: ghosts.map(g => `Ghost: ${g}`),
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
      for (const dir of tempDirs) {
        const fullPath = join(this.cacheDir, dir);
        if (existsSync(fullPath)) {
          rmSync(fullPath, { recursive: true, force: true });
        }
      }
      return {
        name: 'Stale cache directories',
        status: 'warn',
        message: `${tempDirs.length} stale dir(s) found and removed`,
        details,
        fixSuggestion: `Deleted ${tempDirs.length} temp_local dir(s)`,
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
   * Verify installed command hashes match vskill.lock entries.
   */
  private checkLockfileIntegrity(
    projectRoot: string,
    fix: boolean
  ): CheckResult {
    const lockPath = join(projectRoot, 'vskill.lock');
    if (!existsSync(lockPath)) {
      return {
        name: 'Lockfile integrity',
        status: 'skip',
        message: 'no vskill.lock found',
      };
    }

    let lockfile: {
      skills: Record<
        string,
        { sha: string; version: string; source: string }
      >;
    };
    try {
      lockfile = JSON.parse(readFileSync(lockPath, 'utf-8'));
    } catch {
      return {
        name: 'Lockfile integrity',
        status: 'warn',
        message: 'could not parse vskill.lock',
        fixSuggestion: 'Run: specweave refresh-plugins',
      };
    }

    if (!lockfile.skills || Object.keys(lockfile.skills).length === 0) {
      return {
        name: 'Lockfile integrity',
        status: 'skip',
        message: 'lockfile has no skill entries',
      };
    }

    const mismatches: string[] = [];
    const missing: string[] = [];

    for (const [name, entry] of Object.entries(lockfile.skills)) {
      const skillDir = join(this.commandsDir, name);
      if (!existsSync(skillDir)) {
        missing.push(name);
        continue;
      }

      try {
        const currentHash = computePluginHash(skillDir);
        if (currentHash !== entry.sha) {
          mismatches.push(
            `${name}: expected ${entry.sha}, got ${currentHash}`
          );
        }
      } catch {
        mismatches.push(`${name}: could not compute hash`);
      }
    }

    if (missing.length > 0) {
      return {
        name: 'Lockfile integrity',
        status: 'fail',
        message: `${missing.length} skill(s) missing from commands dir`,
        details: missing.map(m => `Missing: ${m}`),
        fixSuggestion: 'Run: specweave refresh-plugins',
      };
    }

    if (mismatches.length > 0) {
      const result: CheckResult = {
        name: 'Lockfile integrity',
        status: 'warn',
        message: `${mismatches.length} hash mismatch(es) detected`,
        details: mismatches,
      };
      if (fix) {
        result.fixSuggestion =
          'Run: specweave refresh-plugins to reinstall with correct hashes';
      } else {
        result.fixSuggestion = 'Run: specweave refresh-plugins';
      }
      return result;
    }

    return {
      name: 'Lockfile integrity',
      status: 'pass',
      message: 'all skill hashes match lockfile',
    };
  }

  /**
   * Detect .md files inside internal plugin directories that should not
   * be treated as slash commands by Claude Code.
   */
  private checkNamespacePollution(fix: boolean): CheckResult {
    if (!existsSync(this.commandsDir)) {
      return {
        name: 'Command namespace pollution',
        status: 'pass',
        message: 'commands directory not found (clean)',
      };
    }

    const pollutants: string[] = [];

    for (const pluginName of this.listDirs(this.commandsDir)) {
      const pluginDir = join(this.commandsDir, pluginName);
      const mdFiles = this.walkMdFiles(pluginDir, '');

      for (const relPath of mdFiles) {
        // Ghost commands (PLUGIN.md, README.md, FRESHNESS.md) are handled
        // by checkGhostCommands. Here we catch the remaining pollution:
        // files in internal dirs (knowledge-base/, lib/, templates/, etc.)
        const filename = relPath.split('/').pop() ?? '';
        const isGhostFile =
          filename === 'PLUGIN.md' ||
          filename === 'README.md' ||
          filename === 'FRESHNESS.md';

        if (!isGhostFile && shouldSkipFromCommands(relPath)) {
          pollutants.push(join(pluginName, relPath));
        }
      }
    }

    if (pollutants.length === 0) {
      return {
        name: 'Command namespace pollution',
        status: 'pass',
        message: 'no namespace pollution found',
      };
    }

    if (fix) {
      for (const p of pollutants) {
        const fullPath = join(this.commandsDir, p);
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
        }
      }
      return {
        name: 'Command namespace pollution',
        status: 'warn',
        message: `${pollutants.length} polluting file(s) found and removed`,
        details: pollutants.map(p => `Pollution: ${p}`),
        fixSuggestion: `Deleted ${pollutants.length} polluting file(s)`,
      };
    }

    return {
      name: 'Command namespace pollution',
      status: 'warn',
      message: `${pollutants.length} polluting file(s) detected`,
      details: pollutants.map(p => `Pollution: ${p}`),
      fixSuggestion: 'Run: specweave doctor --fix',
    };
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

  /** Recursively collect all .md file relative paths under a directory. */
  private walkMdFiles(dir: string, prefix: string): string[] {
    const results: string[] = [];
    try {
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const relPath = prefix ? `${prefix}/${entry}` : entry;
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            results.push(...this.walkMdFiles(fullPath, relPath));
          } else if (stat.isFile() && entry.endsWith('.md')) {
            results.push(relPath);
          }
        } catch {
          // Skip unreadable entries
        }
      }
    } catch {
      // Skip unreadable directories
    }
    return results;
  }
}
