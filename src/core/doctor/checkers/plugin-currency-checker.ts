/**
 * Plugin Currency Checker — reports outdated Claude Code plugins.
 *
 * Reads ~/.claude/plugins/installed_plugins.json and, for every install,
 * looks up the upstream version from the matching marketplace.json (via
 * ~/.claude/plugins/known_marketplaces.json). A drift between the
 * installed version and the marketplace version surfaces as a `warn`
 * with a fix suggestion to run `specweave refresh-plugins`.
 *
 * Increment 0794 — US-004 / T-016.
 * ADR: 0794-04-doctor-as-update-visibility-surface.md
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  HealthChecker,
  CategoryResult,
  CheckResult,
  DoctorOptions,
} from '../types.js';
import { calculateOverallStatus } from '../types.js';

interface PluginInstall {
  scope: 'project' | 'user';
  projectPath?: string;
  installPath?: string;
  version: string;
  installedAt?: string;
  lastUpdated?: string;
  gitCommitSha?: string;
}

interface InstalledPluginsFile {
  version: number;
  plugins: Record<string, PluginInstall[]>;
}

interface KnownMarketplaceSource {
  source: string;
  repo?: string;
  url?: string;
  path?: string;
}

interface KnownMarketplaceEntry {
  source: KnownMarketplaceSource;
  installLocation: string;
  lastUpdated?: string;
}

interface MarketplacePluginEntry {
  name: string;
  version?: string;
  source?: string;
}

interface MarketplaceManifest {
  name: string;
  version?: string;
  plugins?: MarketplacePluginEntry[];
}

interface PluginCurrencyOptions {
  homeDir?: string;
  cwd?: string;
}

export class PluginCurrencyChecker implements HealthChecker {
  category = 'Plugin Currency';
  private homeDir: string;
  private cwd: string;

  constructor(opts?: PluginCurrencyOptions) {
    this.homeDir = opts?.homeDir ?? os.homedir();
    this.cwd = opts?.cwd ?? process.cwd();
  }

  async check(_projectRoot: string, _options: DoctorOptions): Promise<CategoryResult> {
    const checks: CheckResult[] = [];
    const installedPath = path.join(this.homeDir, '.claude', 'plugins', 'installed_plugins.json');
    const knownPath = path.join(this.homeDir, '.claude', 'plugins', 'known_marketplaces.json');

    if (!fs.existsSync(installedPath)) {
      checks.push({
        name: 'Plugin currency',
        status: 'skip',
        message: 'no Claude Code plugins installed (~/.claude/plugins/installed_plugins.json missing)',
      });
      return { category: this.category, status: calculateOverallStatus(checks), checks };
    }

    let installed: InstalledPluginsFile;
    try {
      installed = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'parse error';
      checks.push({
        name: 'Plugin currency',
        status: 'fail',
        message: `cannot read installed_plugins.json: ${msg}`,
      });
      return { category: this.category, status: calculateOverallStatus(checks), checks };
    }

    const known: Record<string, KnownMarketplaceEntry> = fs.existsSync(knownPath)
      ? JSON.parse(fs.readFileSync(knownPath, 'utf8'))
      : {};

    const drifted: Array<{ pluginName: string; marketplace: string; installed: string; latest: string; scope: string }> = [];
    const checked: string[] = [];
    const skipped: string[] = [];

    for (const [pluginAt, installs] of Object.entries(installed.plugins ?? {})) {
      const sepIdx = pluginAt.lastIndexOf('@');
      if (sepIdx <= 0) {
        skipped.push(`${pluginAt}: malformed key (expected name@marketplace)`);
        continue;
      }
      const pluginName = pluginAt.slice(0, sepIdx);
      const marketplaceName = pluginAt.slice(sepIdx + 1);

      const marketplaceEntry = known[marketplaceName];
      if (!marketplaceEntry?.installLocation) {
        skipped.push(`${pluginAt}: marketplace not in known_marketplaces.json`);
        continue;
      }

      const marketplaceJsonPath = path.join(
        marketplaceEntry.installLocation,
        '.claude-plugin',
        'marketplace.json'
      );
      if (!fs.existsSync(marketplaceJsonPath)) {
        skipped.push(`${pluginAt}: marketplace.json not found at ${marketplaceJsonPath}`);
        continue;
      }

      let manifest: MarketplaceManifest;
      try {
        manifest = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf8'));
      } catch (err: unknown) {
        skipped.push(`${pluginAt}: invalid marketplace.json (${err instanceof Error ? err.message : 'parse error'})`);
        continue;
      }

      const pluginEntry = manifest.plugins?.find((p) => p.name === pluginName);
      const upstream = pluginEntry?.version ?? manifest.version;
      if (!upstream) {
        skipped.push(`${pluginAt}: no version in marketplace.json`);
        continue;
      }

      checked.push(pluginAt);
      for (const install of installs) {
        if (install.version !== upstream) {
          drifted.push({
            pluginName,
            marketplace: marketplaceName,
            installed: install.version,
            latest: upstream,
            scope: install.scope,
          });
        }
      }
    }

    if (checked.length === 0 && skipped.length === 0) {
      checks.push({
        name: 'Plugin currency',
        status: 'skip',
        message: 'no plugins to check',
      });
      return { category: this.category, status: calculateOverallStatus(checks), checks };
    }

    if (drifted.length === 0) {
      checks.push({
        name: 'Plugin currency',
        status: 'pass',
        message: `${checked.length} plugin install(s) up to date`,
        details: skipped.length > 0 ? skipped : undefined,
      });
    } else {
      const lines = drifted.map(
        (d) =>
          `${d.pluginName}@${d.marketplace} (${d.scope}): installed v${d.installed} -> latest v${d.latest}`
      );
      checks.push({
        name: 'Plugin currency',
        status: 'warn',
        message: `${drifted.length} plugin install(s) outdated`,
        details: lines.concat(skipped.length > 0 ? [`${skipped.length} skipped: ${skipped.join('; ')}`] : []),
        fixSuggestion: 'Run: specweave refresh-plugins',
      });
    }

    return { category: this.category, status: calculateOverallStatus(checks), checks };
  }
}
