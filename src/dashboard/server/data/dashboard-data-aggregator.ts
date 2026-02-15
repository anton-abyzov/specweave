import * as fs from 'fs';
import * as path from 'path';
import type {
  OverviewPayload,
  IncrementListPayload,
  IncrementSummary,
  SyncStatusPayload,
  SkillUsage,
  LspStatus,
  PluginInfo,
  ActivityEvent,
} from '../../types.js';

export class DashboardDataAggregator {
  constructor(private projectRoot: string) {}

  /** Get overview combining all sources */
  async getOverview(): Promise<OverviewPayload> {
    const dashboard = this.readDashboardJson();
    const syncMeta = this.readSyncMetadata();
    const notifications = this.readNotifications();
    const costs = this.readCosts();
    const analytics = this.readAnalyticsCache();
    const config = this.readConfig();

    return {
      project: {
        name: config?.project?.name,
        totalIncrements: dashboard?.summary?.total ?? 0,
        activeIncrements: dashboard?.summary?.active ?? 0,
        completedIncrements: dashboard?.summary?.completed ?? 0,
        statusBreakdown: this.extractStatusBreakdown(dashboard?.summary),
        typeBreakdown: dashboard?.summary?.byType ?? {},
        priorityBreakdown: dashboard?.summary?.byPriority ?? {},
      },
      analytics: {
        totalEvents: analytics?.totalEvents ?? 0,
        successRate: analytics?.successRate ?? 0,
        last24hEvents: this.count24hEvents(analytics),
      },
      costs: {
        totalCost: costs?.totalCost ?? dashboard?.costs?.totalCost ?? 0,
        totalSavings: costs?.totalSavings ?? dashboard?.costs?.totalSavings ?? 0,
        totalTokens: costs?.totalTokens ?? dashboard?.costs?.totalTokens ?? 0,
        sessionCount: Array.isArray(costs?.sessions) ? costs.sessions.length : 0,
      },
      notifications: {
        pendingCount: Array.isArray(notifications)
          ? notifications.filter((n: any) => !n.dismissedAt).length
          : 0,
        criticalCount: Array.isArray(notifications)
          ? notifications.filter((n: any) => !n.dismissedAt && n.severity === 'critical').length
          : 0,
      },
      sync: {
        platforms: Object.fromEntries(
          Object.entries(syncMeta || {})
            .filter(([key]) => ['github', 'jira', 'ado'].includes(key))
            .map(([key, val]: [string, any]) => [key, {
              lastImport: val?.lastImport ?? '',
              lastSyncResult: val?.lastSyncResult ?? 'unknown',
            }]),
        ),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /** Get increments list */
  async getIncrements(): Promise<IncrementListPayload> {
    const dashboard = this.readDashboardJson();
    const increments: IncrementSummary[] = [];

    if (dashboard?.increments) {
      for (const [id, data] of Object.entries(dashboard.increments) as [string, any][]) {
        increments.push({
          id,
          title: data.title || id,
          status: data.status || 'unknown',
          type: data.type || 'feature',
          priority: data.priority || 'P2',
          project: data.project,
          tasks: data.tasks || { total: 0, completed: 0 },
          acs: data.acs || { total: 0, completed: 0 },
          createdAt: data.createdAt || '',
          lastActivity: data.lastActivity || '',
        });
      }
    }

    // Sort: active first, then by last activity descending
    increments.sort((a, b) => {
      const statusOrder: Record<string, number> = { active: 0, planning: 1, paused: 2, ready_for_review: 3, completed: 4, abandoned: 5 };
      const aOrder = statusOrder[a.status] ?? 3;
      const bOrder = statusOrder[b.status] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.lastActivity || '').localeCompare(a.lastActivity || '');
    });

    return {
      increments,
      summary: dashboard?.summary ?? {},
    };
  }

  /** Get sync status */
  async getSyncStatus(): Promise<SyncStatusPayload> {
    const meta = this.readSyncMetadata();
    return {
      platforms: meta || {},
      lastUpdated: meta?.lastUpdated,
    };
  }

  /** Get analytics summary (from cache if available) */
  async getAnalyticsSummary(): Promise<Record<string, unknown>> {
    return this.readAnalyticsCache() || { totalEvents: 0, topCommands: [], topSkills: [], topAgents: [] };
  }

  /** Get per-skill usage stats */
  async getSkillUsage(): Promise<SkillUsage[]> {
    const cache = this.readAnalyticsCache();
    if (!cache?.topSkills) return [];
    return (cache.topSkills as any[]).map((s: any) => ({
      name: s.name || '',
      plugin: s.plugin || '',
      count: s.count || 0,
      successCount: s.successCount || 0,
      failureCount: s.failureCount || 0,
      avgDuration: s.avgDuration,
      lastUsed: s.lastUsed || '',
    }));
  }

  /** Get costs summary */
  async getCostsSummary(): Promise<Record<string, unknown>> {
    const costs = this.readCosts();
    return costs || { totalCost: 0, totalTokens: 0, totalSavings: 0, sessions: [] };
  }

  /** Get notifications */
  async getNotifications(): Promise<unknown[]> {
    return this.readNotifications() || [];
  }

  /** Get config */
  async getConfig(): Promise<Record<string, unknown>> {
    return this.readConfig() || {};
  }

  /** Get LSP status */
  async getLspStatus(): Promise<LspStatus | null> {
    return this.readJsonFile('.specweave/state/lsp-check.json');
  }

  /** Get installed plugins */
  async getPlugins(): Promise<PluginInfo[]> {
    const cacheDir = path.join(
      process.env.HOME || '',
      '.claude/plugins/cache/specweave',
    );
    if (!fs.existsSync(cacheDir)) return [];

    const plugins: PluginInfo[] = [];
    try {
      const entries = fs.readdirSync(cacheDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pluginDir = path.join(cacheDir, entry.name);
        // Find version directory
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
    } catch { /* ignore read errors */ }
    return plugins;
  }

  // --- Private helpers ---

  private readDashboardJson(): any {
    return this.readJsonFile('.specweave/state/dashboard.json');
  }

  private readSyncMetadata(): any {
    return this.readJsonFile('.specweave/sync-metadata.json');
  }

  private readNotifications(): any {
    const data = this.readJsonFile('.specweave/state/notifications.json');
    return data?.notifications || data || [];
  }

  private readCosts(): any {
    return this.readJsonFile('.specweave/logs/costs.json');
  }

  private readAnalyticsCache(): any {
    return this.readJsonFile('.specweave/state/analytics/cache.json');
  }

  private readConfig(): any {
    return this.readJsonFile('.specweave/config.json');
  }

  private readJsonFile(relativePath: string): any {
    const fullPath = path.join(this.projectRoot, relativePath);
    try {
      if (!fs.existsSync(fullPath)) return null;
      const content = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private extractStatusBreakdown(summary: any): Record<string, number> {
    if (!summary) return {};
    const result: Record<string, number> = {};
    for (const key of ['active', 'completed', 'paused', 'planning', 'backlog', 'ready_for_review', 'abandoned']) {
      if (summary[key] != null) result[key] = summary[key];
    }
    return result;
  }

  private count24hEvents(analytics: any): number {
    if (!analytics?.dailySummaries?.length) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const todaySummary = analytics.dailySummaries.find((d: any) => d.date === today);
    return todaySummary?.totalEvents ?? 0;
  }
}
