import * as fs from 'fs';
import * as path from 'path';
import type { PluginInfo, SkillUsage, LspStatus } from '../../types.js';

/**
 * Enhanced plugin scanner that reads plugin cache, LSP status,
 * LSP warmup, and skill trigger data.
 */
export class PluginScanner {
  constructor(private projectRoot: string) {}

  /** Scan installed plugins from cache */
  getInstalledPlugins(): PluginInfo[] {
    const cacheDir = path.join(process.env.HOME || '', '.claude/plugins/cache/specweave');
    if (!fs.existsSync(cacheDir)) return [];

    const plugins: PluginInfo[] = [];
    try {
      const entries = fs.readdirSync(cacheDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pluginDir = path.join(cacheDir, entry.name);
        const versions = fs.readdirSync(pluginDir, { withFileTypes: true })
          .filter(v => v.isDirectory())
          .map(v => v.name);
        const version = versions[0] || '0.0.0';
        const versionDir = path.join(pluginDir, version);

        let skillCount = 0;
        let commandCount = 0;
        const skillsDir = path.join(versionDir, 'skills');
        const commandsDir = path.join(versionDir, 'commands');
        if (fs.existsSync(skillsDir)) {
          skillCount = fs.readdirSync(skillsDir, { withFileTypes: true })
            .filter(d => d.isDirectory()).length;
        }
        if (fs.existsSync(commandsDir)) {
          commandCount = fs.readdirSync(commandsDir)
            .filter(f => f.endsWith('.md')).length;
        }

        plugins.push({ name: entry.name, version, skillCount, commandCount });
      }
    } catch { /* ignore */ }

    return plugins.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Get LSP check status */
  getLspStatus(): LspStatus | null {
    return this.readJson('.specweave/state/lsp-check.json');
  }

  /** Get LSP warmup status */
  getLspWarmup(): LspWarmupStatus | null {
    return this.readJson('.specweave/state/lsp-warmup.json');
  }

  /** Get skill trigger index */
  getSkillTriggers(): Record<string, string[]> {
    const data = this.readJson('.specweave/state/skill-triggers-index.json');
    return data || {};
  }

  /** Get skill usage from analytics cache */
  getSkillUsage(): SkillUsage[] {
    const cache = this.readJson('.specweave/state/analytics/cache.json');
    if (!cache?.topSkills) return [];
    return (cache.topSkills as any[]).map((s: any) => ({
      name: s.name || '',
      plugin: s.plugin || '',
      count: s.count || 0,
      successCount: s.successCount || s.count || 0,
      failureCount: s.failureCount || 0,
      avgDuration: s.avgDuration,
      lastUsed: s.lastUsed || '',
    }));
  }

  /** Combined plugins + LSP response */
  getFullPluginData(): {
    plugins: PluginInfo[];
    skills: SkillUsage[];
    lsp: LspStatus | null;
    warmup: LspWarmupStatus | null;
    triggerCount: number;
  } {
    return {
      plugins: this.getInstalledPlugins(),
      skills: this.getSkillUsage(),
      lsp: this.getLspStatus(),
      warmup: this.getLspWarmup(),
      triggerCount: Object.keys(this.getSkillTriggers()).length,
    };
  }

  private readJson(relativePath: string): any {
    const fullPath = path.join(this.projectRoot, relativePath);
    try {
      if (!fs.existsSync(fullPath)) return null;
      return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch { return null; }
  }
}

export interface LspWarmupStatus {
  warmedUp: string[];
  failed: string[];
  elapsed: number;
  timestamp: string;
}
