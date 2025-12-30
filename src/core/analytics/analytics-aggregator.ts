/**
 * Analytics Aggregator
 *
 * Aggregates raw analytics events into summaries, top lists, and daily breakdowns.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsSummary,
  UsageCount,
  DailySummary,
  AnalyticsQueryOptions,
} from './types.js';
import { AnalyticsCollector } from './analytics-collector.js';

/**
 * Aggregates analytics events into summaries
 */
export class AnalyticsAggregator {
  private collector: AnalyticsCollector;
  private cacheFile: string;
  private cacheTTLMs: number = 5 * 60 * 1000; // 5 minutes

  constructor(projectRoot?: string) {
    this.collector = AnalyticsCollector.getInstance(projectRoot);
    this.cacheFile = path.join(this.collector.getAnalyticsDir(), 'cache.json');
  }

  /**
   * Get aggregated analytics summary
   */
  getSummary(options: AnalyticsQueryOptions = {}): AnalyticsSummary {
    const limit = options.limit ?? 10;
    const events = this.collector.readEventsFiltered({
      since: options.since,
      until: options.until,
      type: options.type,
      plugin: options.plugin,
    });

    const now = new Date().toISOString();
    const since = options.since ?? (events[0]?.timestamp || now);
    const until = options.until ?? now;

    return {
      generatedAt: now,
      since,
      until,
      totalEvents: events.length,
      topCommands: this.getTopByType(events, 'command', limit),
      topSkills: this.getTopByType(events, 'skill', limit),
      topAgents: this.getTopByType(events, 'agent', limit),
      dailySummaries: this.getDailySummaries(events),
      successRate: this.calculateSuccessRate(events),
    };
  }

  /**
   * Get top items by event type
   */
  private getTopByType(
    events: AnalyticsEvent[],
    type: AnalyticsEventType,
    limit: number
  ): UsageCount[] {
    const filtered = events.filter((e) => e.type === type);
    return this.aggregateByName(filtered, limit);
  }

  /**
   * Aggregate events by name
   */
  private aggregateByName(events: AnalyticsEvent[], limit: number): UsageCount[] {
    const countMap = new Map<
      string,
      {
        count: number;
        successCount: number;
        failureCount: number;
        totalDuration: number;
        durationCount: number;
        plugin?: string;
        lastUsed: string;
      }
    >();

    for (const event of events) {
      const existing = countMap.get(event.name);
      if (existing) {
        existing.count++;
        if (event.success) existing.successCount++;
        else existing.failureCount++;
        if (event.duration !== undefined) {
          existing.totalDuration += event.duration;
          existing.durationCount++;
        }
        if (event.timestamp > existing.lastUsed) {
          existing.lastUsed = event.timestamp;
        }
      } else {
        countMap.set(event.name, {
          count: 1,
          successCount: event.success ? 1 : 0,
          failureCount: event.success ? 0 : 1,
          totalDuration: event.duration ?? 0,
          durationCount: event.duration !== undefined ? 1 : 0,
          plugin: event.plugin,
          lastUsed: event.timestamp,
        });
      }
    }

    // Convert to array and sort by count
    const result: UsageCount[] = [];
    for (const [name, data] of countMap.entries()) {
      result.push({
        name,
        count: data.count,
        successCount: data.successCount,
        failureCount: data.failureCount,
        avgDuration:
          data.durationCount > 0
            ? Math.round(data.totalDuration / data.durationCount)
            : undefined,
        plugin: data.plugin,
        lastUsed: data.lastUsed,
      });
    }

    return result.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  /**
   * Get daily summaries
   */
  private getDailySummaries(events: AnalyticsEvent[]): DailySummary[] {
    const dailyMap = new Map<
      string,
      {
        commands: Set<string>;
        skills: Set<string>;
        agents: Set<string>;
        commandCount: number;
        skillCount: number;
        agentCount: number;
      }
    >();

    for (const event of events) {
      const date = event.timestamp.split('T')[0];
      let daily = dailyMap.get(date);

      if (!daily) {
        daily = {
          commands: new Set(),
          skills: new Set(),
          agents: new Set(),
          commandCount: 0,
          skillCount: 0,
          agentCount: 0,
        };
        dailyMap.set(date, daily);
      }

      switch (event.type) {
        case 'command':
          daily.commands.add(event.name);
          daily.commandCount++;
          break;
        case 'skill':
          daily.skills.add(event.name);
          daily.skillCount++;
          break;
        case 'agent':
          daily.agents.add(event.name);
          daily.agentCount++;
          break;
      }
    }

    // Convert to array and sort by date
    const result: DailySummary[] = [];
    for (const [date, data] of dailyMap.entries()) {
      result.push({
        date,
        totalEvents: data.commandCount + data.skillCount + data.agentCount,
        commands: data.commandCount,
        skills: data.skillCount,
        agents: data.agentCount,
        uniqueCommands: data.commands.size,
        uniqueSkills: data.skills.size,
        uniqueAgents: data.agents.size,
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate overall success rate
   */
  private calculateSuccessRate(events: AnalyticsEvent[]): number {
    if (events.length === 0) return 100;

    const successCount = events.filter((e) => e.success).length;
    return Math.round((successCount / events.length) * 100 * 10) / 10;
  }

  /**
   * Get cached summary if valid
   */
  getCachedSummary(): AnalyticsSummary | null {
    try {
      if (!fs.existsSync(this.cacheFile)) return null;

      const stats = fs.statSync(this.cacheFile);
      const age = Date.now() - stats.mtimeMs;

      if (age > this.cacheTTLMs) return null;

      const content = fs.readFileSync(this.cacheFile, 'utf-8');
      return JSON.parse(content) as AnalyticsSummary;
    } catch {
      return null;
    }
  }

  /**
   * Cache the summary
   */
  cacheSummary(summary: AnalyticsSummary): void {
    try {
      const dir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(summary, null, 2), 'utf-8');
    } catch {
      // Silently fail
    }
  }

  /**
   * Get summary with caching
   */
  getSummaryWithCache(options: AnalyticsQueryOptions = {}): AnalyticsSummary {
    // Only use cache for default queries (no filters)
    const hasFilters =
      options.since || options.until || options.type || options.plugin;

    if (!hasFilters) {
      const cached = this.getCachedSummary();
      if (cached) return cached;
    }

    const summary = this.getSummary(options);

    if (!hasFilters) {
      this.cacheSummary(summary);
    }

    return summary;
  }

  /**
   * Generate daily summary and save to file
   */
  generateDailySummary(): void {
    try {
      const events = this.collector.readEvents();
      const summaryFile = path.join(
        this.collector.getAnalyticsDir(),
        'daily-summary.json'
      );

      const dailySummaries = this.getDailySummaries(events);

      fs.writeFileSync(
        summaryFile,
        JSON.stringify({ summaries: dailySummaries, updatedAt: new Date().toISOString() }, null, 2),
        'utf-8'
      );
    } catch {
      // Silently fail
    }
  }

  /**
   * Export analytics data
   */
  export(
    format: 'json' | 'csv',
    options: AnalyticsQueryOptions = {}
  ): { filename: string; content: string } {
    const summary = this.getSummary(options);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

    if (format === 'json') {
      return {
        filename: `analytics-export-${timestamp}.json`,
        content: JSON.stringify(summary, null, 2),
      };
    }

    // CSV format
    const lines: string[] = [];

    // Header
    lines.push('# SpecWeave Analytics Export');
    lines.push(`# Generated: ${summary.generatedAt}`);
    lines.push(`# Period: ${summary.since} to ${summary.until}`);
    lines.push('');

    // Top Commands
    lines.push('## Top Commands');
    lines.push('Name,Count,Success,Failure,Avg Duration (ms),Plugin,Last Used');
    for (const cmd of summary.topCommands) {
      lines.push(
        `${cmd.name},${cmd.count},${cmd.successCount},${cmd.failureCount},${cmd.avgDuration ?? ''},${cmd.plugin ?? ''},${cmd.lastUsed}`
      );
    }
    lines.push('');

    // Top Skills
    lines.push('## Top Skills');
    lines.push('Name,Count,Success,Failure,Avg Duration (ms),Plugin,Last Used');
    for (const skill of summary.topSkills) {
      lines.push(
        `${skill.name},${skill.count},${skill.successCount},${skill.failureCount},${skill.avgDuration ?? ''},${skill.plugin ?? ''},${skill.lastUsed}`
      );
    }
    lines.push('');

    // Top Agents
    lines.push('## Top Agents');
    lines.push('Name,Count,Success,Failure,Avg Duration (ms),Plugin,Last Used');
    for (const agent of summary.topAgents) {
      lines.push(
        `${agent.name},${agent.count},${agent.successCount},${agent.failureCount},${agent.avgDuration ?? ''},${agent.plugin ?? ''},${agent.lastUsed}`
      );
    }
    lines.push('');

    // Daily Summary
    lines.push('## Daily Summary');
    lines.push('Date,Total,Commands,Skills,Agents,Unique Commands,Unique Skills,Unique Agents');
    for (const day of summary.dailySummaries) {
      lines.push(
        `${day.date},${day.totalEvents},${day.commands},${day.skills},${day.agents},${day.uniqueCommands},${day.uniqueSkills},${day.uniqueAgents}`
      );
    }

    return {
      filename: `analytics-export-${timestamp}.csv`,
      content: lines.join('\n'),
    };
  }
}
