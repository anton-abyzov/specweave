/**
 * Analytics CLI Command
 *
 * Shows usage statistics for commands, skills, and agents.
 * Also supports lazy loading analytics with --lazy-loading flag.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AnalyticsAggregator } from '../../core/analytics/analytics-aggregator.js';
import { AnalyticsQueryOptions, AnalyticsSummary, UsageCount, DailySummary } from '../../core/analytics/types.js';
import { PluginCacheManager } from '../../core/lazy-loading/cache-manager.js';

interface AnalyticsCommandOptions {
  since?: string;
  until?: string;
  export?: 'json' | 'csv';
  limit?: number;
  type?: 'command' | 'skill' | 'agent';
  plugin?: string;
  lazyLoading?: boolean;
}

/** Format a number with commas */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Pad string to fixed width */
function pad(str: string, width: number, padChar = ' '): string {
  return str.length >= width ? str.slice(0, width) : str + padChar.repeat(width - str.length);
}

/** Create a progress bar */
function progressBar(value: number, max: number, width = 10): string {
  const filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Format success rate as percentage */
function formatSuccessRate(successCount: number, total: number): string {
  return total === 0 ? '-' : `${Math.round((successCount / total) * 100)}%`;
}

/** Render the analytics dashboard */
function renderDashboard(summary: AnalyticsSummary): void {
  const line = '═'.repeat(68);
  const thinLine = '─'.repeat(68);

  console.log('\n📊 SpecWeave Usage Analytics');
  console.log(line + '\n');

  // Period info
  console.log(`Period: ${summary.since.split('T')[0]} to ${summary.until.split('T')[0]}`);
  console.log(`Total Events: ${formatNumber(summary.totalEvents)} | Success Rate: ${summary.successRate}%\n`);

  // Render sections
  const sections = [
    { title: 'TOP COMMANDS                          Count    Success   Avg(ms)', items: summary.topCommands, showPlugin: false },
    { title: 'TOP SKILLS                            Count    Success   Plugin', items: summary.topSkills, showPlugin: true },
    { title: 'TOP AGENTS                            Count    Success   Plugin', items: summary.topAgents, showPlugin: true },
  ];

  for (const section of sections) {
    if (section.items.length > 0) {
      console.log(section.title);
      console.log(thinLine);
      renderTopList(section.items, section.showPlugin);
      console.log('');
    }
  }

  // Activity chart (last 7 days)
  if (summary.dailySummaries.length > 0) {
    console.log('ACTIVITY (recent days)');
    console.log(thinLine);
    renderActivityChart(summary.dailySummaries.slice(-7));
    console.log('');
  }

  if (summary.totalEvents === 0) {
    console.log('No analytics data recorded yet.\n');
    console.log('Analytics will be collected as you use SpecWeave commands.\n');
  }
}

/** Render a top list of items */
function renderTopList(items: UsageCount[], showPlugin = false): void {
  items.forEach((item, i) => {
    const num = `${i + 1}.`;
    const name = pad(item.name, 35, '.');
    const count = pad(String(item.count), 8);
    const success = pad(formatSuccessRate(item.successCount, item.count), 9);
    const extra = showPlugin
      ? (item.plugin || '-')
      : (item.avgDuration !== undefined ? formatNumber(item.avgDuration) : '-');
    console.log(`${num} ${name} ${count} ${success} ${extra}`);
  });
}

/** Render activity chart */
function renderActivityChart(dailySummaries: DailySummary[]): void {
  if (dailySummaries.length === 0) return;

  const maxEvents = Math.max(...dailySummaries.map(d => d.totalEvents));
  for (const day of dailySummaries) {
    const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
    console.log(`${dayName}: ${progressBar(day.totalEvents, maxEvents)} ${day.totalEvents}`);
  }
}

/** Render lazy loading analytics dashboard */
function renderLazyLoadingDashboard(): void {
  const cacheManager = new PluginCacheManager();
  const analytics = cacheManager.getAnalyticsSummary();

  const line = '═'.repeat(68);
  const thinLine = '─'.repeat(68);

  console.log('\n⚡ Plugin Loading Analytics');
  console.log(line + '\n');

  console.log('SUMMARY');
  console.log(thinLine);
  console.log(`Total plugin loads:          ${formatNumber(analytics.totalLoads)}`);
  console.log(`Currently loaded:            ${analytics.loadedPlugins}`);
  console.log(`Available in marketplace:    ${analytics.availablePlugins}`);
  console.log('');

  if (analytics.totalLoads === 0) {
    console.log('No plugin loading activity recorded yet.\n');
  }
}

/**
 * CLI command to show analytics
 */
export async function analyticsCommand(options: AnalyticsCommandOptions = {}): Promise<void> {
  // Handle lazy loading analytics
  if (options.lazyLoading) {
    renderLazyLoadingDashboard();
    return;
  }
  const aggregator = new AnalyticsAggregator();

  // Build query options
  const queryOptions: AnalyticsQueryOptions = {
    limit: options.limit ?? 10,
  };

  if (options.since) {
    queryOptions.since = options.since.includes('T')
      ? options.since
      : `${options.since}T00:00:00.000Z`;
  } else {
    // Default to last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    queryOptions.since = thirtyDaysAgo.toISOString();
  }

  if (options.until) {
    queryOptions.until = options.until.includes('T')
      ? options.until
      : `${options.until}T23:59:59.999Z`;
  }

  if (options.type) {
    queryOptions.type = options.type;
  }

  if (options.plugin) {
    queryOptions.plugin = options.plugin;
  }

  // Get summary
  const summary = aggregator.getSummaryWithCache(queryOptions);

  // Export if requested
  if (options.export) {
    const { filename, content } = aggregator.export(options.export, queryOptions);
    const exportsDir = path.join(aggregator['collector'].getAnalyticsDir(), 'exports');

    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const exportPath = path.join(exportsDir, filename);
    fs.writeFileSync(exportPath, content, 'utf-8');

    console.log(`\n✅ Analytics exported to: ${exportPath}\n`);
    return;
  }

  // Render dashboard
  renderDashboard(summary);
}
