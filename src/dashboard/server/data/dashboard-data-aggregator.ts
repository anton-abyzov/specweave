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
} from '../../types.js';
import type { CostsSummaryPayload } from './cost-aggregator.js';

interface AnalyticsAggregation {
  totalEvents: number;
  successRate: number;
  topCommands: Array<{ name: string; count: number }>;
  topSkills: Array<{ name: string; plugin: string; count: number; successCount: number; failureCount: number; lastUsed: string }>;
  topAgents: Array<{ name: string; count: number }>;
  dailySummaries: Array<{ date: string; totalEvents: number }>;
  last24hEvents: number;
}

export class DashboardDataAggregator {
  private analyticsCache: AnalyticsAggregation | null = null;
  private analyticsCacheTime = 0;
  private readonly analyticsCacheTTL = 30_000; // 30 seconds

  constructor(private projectRoot: string) {}

  /** Get overview combining all sources */
  async getOverview(costData?: CostsSummaryPayload): Promise<OverviewPayload> {
    const dashboard = this.readDashboardJson();
    const syncMeta = this.readSyncMetadata();
    const notifications = this.readNotifications();
    const analytics = await this.aggregateEventsFromJsonl();
    const config = this.readConfig();

    // Use cache summary, or fall back to filesystem scan
    const summary = dashboard?.summary ?? this.buildSummaryFromIncrements(this.scanIncrementsFromFilesystem());

    return {
      project: {
        name: config?.project?.name,
        totalIncrements: summary.total ?? 0,
        activeIncrements: summary.active ?? 0,
        completedIncrements: summary.completed ?? 0,
        statusBreakdown: this.extractStatusBreakdown(summary),
        typeBreakdown: summary.byType ?? {},
        priorityBreakdown: summary.byPriority ?? {},
      },
      analytics: {
        totalEvents: analytics.totalEvents,
        successRate: analytics.successRate,
        last24hEvents: analytics.last24hEvents,
      },
      costs: {
        totalCost: costData?.totalCost ?? 0,
        totalSavings: costData?.totalSavings ?? 0,
        totalTokens: costData?.totalTokens ?? 0,
        sessionCount: costData?.sessionCount ?? 0,
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
        platforms: this.enrichSyncPlatforms(syncMeta, config),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /** Get increments list */
  async getIncrements(): Promise<IncrementListPayload> {
    const dashboard = this.readDashboardJson();
    let increments: IncrementSummary[] = [];

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
    } else {
      // Fallback: scan filesystem directly when cache is missing
      increments = this.scanIncrementsFromFilesystem();
    }

    // Sort: active first, then by last activity descending
    increments.sort((a, b) => {
      const statusOrder: Record<string, number> = { active: 0, planning: 1, paused: 2, ready_for_review: 3, completed: 4, abandoned: 5 };
      const aOrder = statusOrder[a.status] ?? 3;
      const bOrder = statusOrder[b.status] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.lastActivity || '').localeCompare(a.lastActivity || '');
    });

    const summary = dashboard?.summary ?? this.buildSummaryFromIncrements(increments);

    return {
      increments,
      summary,
    };
  }

  /** Get sync status with enriched connection diagnosis */
  async getSyncStatus(): Promise<SyncStatusPayload> {
    const meta = this.readSyncMetadata();
    const config = this.readConfig();
    return {
      platforms: this.enrichSyncPlatforms(meta, config),
      lastUpdated: meta?.lastUpdated,
    };
  }

  /** Get analytics summary aggregated from events.jsonl */
  async getAnalyticsSummary(): Promise<AnalyticsAggregation> {
    return this.aggregateEventsFromJsonl();
  }

  /** Get per-skill usage stats from events.jsonl */
  async getSkillUsage(): Promise<SkillUsage[]> {
    const analytics = await this.aggregateEventsFromJsonl();
    return analytics.topSkills.map(s => ({
      name: s.name,
      plugin: s.plugin,
      count: s.count,
      successCount: s.successCount,
      failureCount: s.failureCount,
      avgDuration: undefined,
      lastUsed: s.lastUsed,
    }));
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

  // --- Analytics Aggregation from events.jsonl ---

  private async aggregateEventsFromJsonl(): Promise<AnalyticsAggregation> {
    if (this.analyticsCache && Date.now() - this.analyticsCacheTime < this.analyticsCacheTTL) {
      return this.analyticsCache;
    }

    const eventsPath = path.join(this.projectRoot, '.specweave/state/analytics/events.jsonl');
    const commandCounts = new Map<string, number>();
    const skillMap = new Map<string, { plugin: string; count: number; successCount: number; failureCount: number; lastUsed: string }>();
    const agentCounts = new Map<string, number>();
    const dailyCounts = new Map<string, number>();
    let totalEvents = 0;
    let successCount = 0;
    let last24hEvents = 0;
    const now24h = new Date(Date.now() - 86_400_000).toISOString();

    try {
      if (!fs.existsSync(eventsPath)) {
        const empty: AnalyticsAggregation = { totalEvents: 0, successRate: 0, topCommands: [], topSkills: [], topAgents: [], dailySummaries: [], last24hEvents: 0 };
        this.analyticsCache = empty;
        this.analyticsCacheTime = Date.now();
        return empty;
      }

      const content = fs.readFileSync(eventsPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          totalEvents++;
          if (event.success) successCount++;
          if (event.timestamp && event.timestamp >= now24h) last24hEvents++;

          const name = event.name || '';
          const type = event.type || '';

          // Command counts (only actual command events)
          if (name && type === 'command') {
            commandCounts.set(name, (commandCounts.get(name) || 0) + 1);
          }

          // Skill tracking
          if (type === 'skill') {
            const existing = skillMap.get(name);
            if (existing) {
              existing.count++;
              if (event.success) existing.successCount++;
              else existing.failureCount++;
              if (event.timestamp > existing.lastUsed) existing.lastUsed = event.timestamp;
            } else {
              skillMap.set(name, {
                plugin: event.plugin || 'specweave',
                count: 1,
                successCount: event.success ? 1 : 0,
                failureCount: event.success ? 0 : 1,
                lastUsed: event.timestamp || '',
              });
            }
          }

          // Agent tracking
          if (type === 'agent') {
            agentCounts.set(name, (agentCounts.get(name) || 0) + 1);
          }

          // Daily bucketing
          if (event.timestamp) {
            const date = event.timestamp.slice(0, 10);
            dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
          }
        } catch { /* skip bad lines */ }
      }
    } catch { /* file read error */ }

    const topCommands = Array.from(commandCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const topSkills = Array.from(skillMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    const topAgents = Array.from(agentCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const dailySummaries = Array.from(dailyCounts.entries())
      .map(([date, totalEvents]) => ({ date, totalEvents }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const result: AnalyticsAggregation = {
      totalEvents,
      successRate: totalEvents > 0 ? Math.round((successCount / totalEvents) * 100) : 0,
      topCommands,
      topSkills,
      topAgents,
      dailySummaries,
      last24hEvents,
    };

    this.analyticsCache = result;
    this.analyticsCacheTime = Date.now();
    return result;
  }

  // --- Sync Enrichment ---

  private enrichSyncPlatforms(syncMeta: any, config: any): Record<string, any> {
    const platforms: Record<string, any> = {};
    const platformConfigs: Record<string, { key: string; label: string; configCheck: () => string | null }> = {
      github: {
        key: 'github',
        label: 'GitHub',
        configCheck: () => {
          const gh = config?.sync?.github;
          return gh?.owner && gh?.repo ? `${gh.owner}/${gh.repo}` : null;
        },
      },
      jira: {
        key: 'jira',
        label: 'JIRA',
        configCheck: () => {
          const j = config?.sync?.jira;
          return j?.domain ? `${j.domain} (${j.projectKey || 'N/A'})` : null;
        },
      },
      ado: {
        key: 'ado',
        label: 'Azure DevOps',
        configCheck: () => {
          const a = config?.sync?.ado;
          return a?.organization ? `${a.organization}/${a.project || ''}` : null;
        },
      },
    };

    for (const [key, pConfig] of Object.entries(platformConfigs)) {
      const meta = syncMeta?.[key];
      const configDetail = pConfig.configCheck();
      const lastImport = meta?.lastImport || '';
      const lastSyncResult = meta?.lastSyncResult || 'unknown';
      const lastImportCount = meta?.lastImportCount ?? 0;

      let connectionStatus: string;
      let diagnosticMessage = '';

      if (!configDetail) {
        connectionStatus = 'not_configured';
        diagnosticMessage = `${pConfig.label} sync is not configured. Add credentials in config.json.`;
      } else if (!lastImport) {
        connectionStatus = 'configured_never_synced';
        diagnosticMessage = `${pConfig.label} configured for ${configDetail}. No sync attempted yet.`;
      } else if (lastSyncResult === 'success') {
        connectionStatus = 'connected';
        diagnosticMessage = `${pConfig.label} connected to ${configDetail}. Last sync: ${lastImportCount} items.`;
      } else {
        connectionStatus = 'sync_failed';
        diagnosticMessage = `${pConfig.label} configured for ${configDetail}. Last sync attempt failed at ${new Date(lastImport).toLocaleString()}.`;
      }

      platforms[key] = {
        lastImport,
        lastSyncResult,
        lastImportCount,
        lastSkippedCount: meta?.lastSkippedCount ?? 0,
        connectionStatus,
        diagnosticMessage,
        configDetail,
      };
    }

    return platforms;
  }

  // --- Filesystem fallback (when dashboard.json cache is missing) ---

  /** Scan increment directories directly from filesystem */
  scanIncrementsFromFilesystem(): IncrementSummary[] {
    const incrementsDir = path.join(this.projectRoot, '.specweave/increments');
    if (!fs.existsSync(incrementsDir)) return [];

    const increments: IncrementSummary[] = [];
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(incrementsDir, { withFileTypes: true });
    } catch {
      return [];
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || !/^\d/.test(entry.name)) continue;
      // Skip archive directories
      if (entry.name.startsWith('_')) continue;

      const dir = path.join(incrementsDir, entry.name);
      const metadataPath = path.join(dir, 'metadata.json');
      if (!fs.existsSync(metadataPath)) continue;

      try {
        const raw = fs.readFileSync(metadataPath, 'utf-8');
        const meta = JSON.parse(raw);

        const tasksPath = path.join(dir, 'tasks.md');
        const specPath = path.join(dir, 'spec.md');
        const tasks = this.countTasksFromFile(tasksPath);
        const acs = this.countAcsFromFile(specPath);

        // Get last activity from metadata mtime
        let lastActivity = meta.lastActivity || '';
        if (!lastActivity) {
          try {
            const stat = fs.statSync(metadataPath);
            lastActivity = stat.mtime.toISOString();
          } catch { /* ignore */ }
        }

        increments.push({
          id: entry.name,
          title: meta.title || entry.name,
          status: meta.status || 'unknown',
          type: meta.type || 'feature',
          priority: meta.priority || 'P2',
          project: meta.project,
          tasks: tasks.total > 0 ? tasks : (meta.tasks || { total: 0, completed: 0 }),
          acs: acs.total > 0 ? acs : (meta.acceptanceCriteria
            ? { total: meta.acceptanceCriteria.total || 0, completed: meta.acceptanceCriteria.satisfied || 0 }
            : { total: 0, completed: 0 }),
          createdAt: meta.createdAt || meta.created || '',
          lastActivity,
        });
      } catch { /* skip invalid metadata */ }
    }

    return increments;
  }

  /** Count tasks from tasks.md file */
  private countTasksFromFile(tasksPath: string): { total: number; completed: number } {
    if (!fs.existsSync(tasksPath)) return { total: 0, completed: 0 };
    try {
      const content = fs.readFileSync(tasksPath, 'utf-8');
      const lines = content.split('\n');
      let total = 0;
      let completed = 0;

      for (const line of lines) {
        // Heading-based: ## T-001, ### T-001, #### T-001
        if (/^#{2,}\s+T-\d/.test(line)) {
          total++;
        }
        // Checklist-based: - [x] T-001 or - [ ] T-001
        if (/^- \[[x ]\] T-\d/.test(line)) {
          total++;
          if (/^- \[x\] T-\d/.test(line)) completed++;
        }
        // Status checkbox: **Status**: [x]
        if (/\*\*Status\*\*:\s*\[x\]/.test(line)) {
          completed++;
        }
      }
      return { total, completed };
    } catch {
      return { total: 0, completed: 0 };
    }
  }

  /** Count acceptance criteria from spec.md file */
  private countAcsFromFile(specPath: string): { total: number; completed: number } {
    if (!fs.existsSync(specPath)) return { total: 0, completed: 0 };
    try {
      const content = fs.readFileSync(specPath, 'utf-8');
      const lines = content.split('\n');
      let total = 0;
      let completed = 0;

      for (const line of lines) {
        if (/- \[.\] \*\*AC-/.test(line)) {
          total++;
          if (/- \[x\] \*\*AC-/.test(line)) completed++;
        }
      }
      return { total, completed };
    } catch {
      return { total: 0, completed: 0 };
    }
  }

  /** Build summary counts from increment list */
  private buildSummaryFromIncrements(increments: IncrementSummary[]): Record<string, number> {
    const summary: Record<string, number> = { total: increments.length };
    for (const inc of increments) {
      summary[inc.status] = (summary[inc.status] || 0) + 1;
    }
    return summary;
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
}
