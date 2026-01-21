/**
 * Plugin Status Command
 *
 * Shows loaded plugins, skill counts, and activation status for debugging.
 *
 * Usage: /sw:plugin-status
 */

import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { SkillTriggerIndexManager } from '../../core/plugins/skill-trigger-index.js';
import { PluginCacheManager } from '../../core/lazy-loading/cache-manager.js';

export interface PluginStatusOptions {
  verbose?: boolean;
}

interface PluginInfo {
  name: string;
  version: string;
  skillCount: number;
  agentCount: number;
  commandCount: number;
  sampleTriggers: string[];
}

/**
 * Main plugin-status command handler
 */
export async function pluginStatusCommand(options: PluginStatusOptions = {}): Promise<void> {
  const projectRoot = process.cwd();

  console.log(chalk.bold.blue('\n📊 SpecWeave Plugin Status'));
  console.log(chalk.gray('===========================\n'));

  // Get all plugins
  const plugins = await discoverPlugins(projectRoot);

  if (plugins.length === 0) {
    console.log(chalk.yellow('No plugins found.'));
    console.log(chalk.gray('Run: specweave refresh-marketplace'));
    return;
  }

  // Load skill trigger index
  const indexManager = new SkillTriggerIndexManager(projectRoot);
  let index;
  let indexStats;

  try {
    index = await indexManager.loadIndex();
    const indexPath = path.join(projectRoot, '.specweave/state/skill-triggers-index.json');
    if (fs.existsSync(indexPath)) {
      const stats = fs.statSync(indexPath);
      const sizeKB = Math.round(stats.size / 1024);
      const ageMinutes = Math.round((Date.now() - stats.mtimeMs) / 60000);
      indexStats = { sizeKB, ageMinutes };
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Skill trigger index not found'));
    console.log(chalk.gray('   Run: specweave refresh-marketplace\n'));
  }

  // Display each plugin
  for (const plugin of plugins) {
    displayPlugin(plugin, index, options);
  }

  // Summary
  const totalSkills = plugins.reduce((sum, p) => sum + p.skillCount, 0);
  const totalAgents = plugins.reduce((sum, p) => sum + p.agentCount, 0);

  console.log(chalk.bold('\n📈 Summary'));
  console.log(chalk.gray('──────────'));
  console.log(`Total Plugins: ${chalk.cyan(plugins.length)}`);
  console.log(`Total Skills: ${chalk.cyan(totalSkills)}`);
  console.log(`Total Agents: ${chalk.cyan(totalAgents)}`);

  if (indexStats) {
    console.log(
      `Skill Index: ${chalk.green('✅')} Generated (${indexStats.sizeKB}KB, ${indexStats.ageMinutes}m ago)`
    );
  } else {
    console.log(`Skill Index: ${chalk.yellow('⚠️')} Not generated`);
  }

  // Lazy Loading Cache Status
  console.log(chalk.bold('\n📦 Lazy Loading Status'));
  console.log(chalk.gray('─────────────────────'));

  try {
    const cacheManager = new PluginCacheManager();
    const cachedPlugins = cacheManager.getCachedPlugins();
    const loadedPlugins = cacheManager.getLoadedPlugins();
    const cacheSize = cacheManager.getCacheSize();
    const state = cacheManager.readState();

    // Mode and summary
    console.log(`Mode: ${state.lazyMode ? chalk.green('Lazy Loading') : chalk.yellow('Full Install')}`);
    console.log(`Loaded: ${chalk.green(loadedPlugins.length)} plugins`);
    console.log(`Cached: ${chalk.yellow(cachedPlugins.length)} plugins`);
    console.log(`Cache Size: ${chalk.cyan(formatBytes(cacheSize.total))}`);

    // Last updated timestamp
    if (state.lastUpdated) {
      const lastUpdate = new Date(state.lastUpdated);
      const timeAgo = formatTimeAgo(lastUpdate);
      console.log(`Last Updated: ${chalk.gray(timeAgo)}`);
    }

    // Color-coded plugin list (loaded=green, cached=yellow)
    console.log(chalk.bold('\n📋 Plugin Status'));
    console.log(chalk.gray('────────────────'));

    // List loaded plugins (green)
    if (loadedPlugins.length > 0) {
      console.log(chalk.green('\n✓ Loaded (Active):'));
      for (const plugin of loadedPlugins.sort()) {
        const size = cacheSize.plugins[plugin] || 0;
        console.log(`  ${chalk.green('●')} ${plugin} ${chalk.gray(`(${formatBytes(size)})`)}`);
      }
    }

    // List cached-only plugins (yellow)
    const cachedOnly = cachedPlugins.filter((p) => !loadedPlugins.includes(p));
    if (cachedOnly.length > 0) {
      console.log(chalk.yellow('\n○ Cached (Ready to load):'));
      for (const plugin of cachedOnly.sort()) {
        const size = cacheSize.plugins[plugin] || 0;
        console.log(`  ${chalk.yellow('○')} ${plugin} ${chalk.gray(`(${formatBytes(size)})`)}`);
      }
    }

    // Analytics
    if (state.analytics.totalLoads > 0) {
      console.log(chalk.gray(`\nAnalytics: ${state.analytics.totalLoads} total loads`));
    }

    // Help tips
    if (cachedOnly.length > 0) {
      console.log(chalk.cyan('\n💡 Load more plugins:'));
      console.log(chalk.gray('   specweave load-plugins <group>'));
      console.log(chalk.gray('   specweave load-plugins all'));
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Lazy loading cache not available'));
    console.log(chalk.gray('   Run: specweave refresh-marketplace'));
  }

  console.log();
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format date to human-readable "time ago" string
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Display information about a single plugin
 */
function displayPlugin(plugin: PluginInfo, index: any, options: PluginStatusOptions): void {
  const isCore = plugin.name === 'specweave';
  const label = isCore ? chalk.bold.green('Core Plugin') : chalk.bold('Plugin');

  console.log(`${label}: ${chalk.cyan(plugin.name)} ${chalk.gray(`(v${plugin.version})`)}`);

  // Skills
  if (plugin.skillCount > 0) {
    console.log(`├─ Skills: ${chalk.yellow(plugin.skillCount)}`);
  }

  // Agents
  if (plugin.agentCount > 0) {
    console.log(`├─ Agents: ${chalk.yellow(plugin.agentCount)}`);
  }

  // Commands
  if (plugin.commandCount > 0) {
    console.log(`├─ Commands: ${chalk.yellow(plugin.commandCount)}`);
  }

  // Trigger keywords
  if (plugin.sampleTriggers.length > 0) {
    const triggers = plugin.sampleTriggers.slice(0, 5).join(', ');
    console.log(`├─ Triggers: ${chalk.gray(triggers)}`);
  }

  // Status
  const hasIndex = index && Object.keys(index.skills || {}).some((fqn: string) =>
    fqn.startsWith(plugin.name)
  );
  const status = hasIndex ? chalk.green('✅ Indexed') : chalk.yellow('⚠️ Not indexed');
  console.log(`└─ Status: ${status}\n`);
}

/**
 * Discover all installed plugins
 */
async function discoverPlugins(projectRoot: string): Promise<PluginInfo[]> {
  const plugins: PluginInfo[] = [];
  const pluginsDir = path.join(projectRoot, 'plugins');

  if (!fs.existsSync(pluginsDir)) {
    return [];
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pluginPath = path.join(pluginsDir, entry.name);
    const manifestPath = path.join(pluginPath, 'plugin.json');

    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Count skills
      const skillsDir = path.join(pluginPath, 'skills');
      let skillCount = 0;
      const sampleTriggers: string[] = [];

      if (fs.existsSync(skillsDir)) {
        const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
          .filter(e => e.isDirectory());
        skillCount = skillDirs.length;

        // Extract sample triggers from first skill
        if (skillDirs.length > 0) {
          const skillMd = path.join(skillsDir, skillDirs[0].name, 'SKILL.md');
          if (fs.existsSync(skillMd)) {
            const content = fs.readFileSync(skillMd, 'utf-8');
            const triggerMatch = content.match(/Activates for:?\s*([^\n]+)/i);
            if (triggerMatch) {
              const triggers = triggerMatch[1]
                .split(/,|or/)
                .map(t => t.trim())
                .filter(t => t.length > 0);
              sampleTriggers.push(...triggers);
            }
          }
        }
      }

      // Count agents
      const agentsDir = path.join(pluginPath, 'agents');
      let agentCount = 0;
      if (fs.existsSync(agentsDir)) {
        agentCount = fs.readdirSync(agentsDir, { withFileTypes: true })
          .filter(e => e.isDirectory()).length;
      }

      // Count commands
      const commandsDir = path.join(pluginPath, 'commands');
      let commandCount = 0;
      if (fs.existsSync(commandsDir)) {
        commandCount = fs.readdirSync(commandsDir)
          .filter(f => f.endsWith('.md')).length;
      }

      plugins.push({
        name: manifest.name || entry.name,
        version: manifest.version || 'unknown',
        skillCount,
        agentCount,
        commandCount,
        sampleTriggers
      });
    } catch (error) {
      // Skip invalid plugins
    }
  }

  // Sort: core first, then alphabetically
  return plugins.sort((a, b) => {
    if (a.name === 'specweave') return -1;
    if (b.name === 'specweave') return 1;
    return a.name.localeCompare(b.name);
  });
}
