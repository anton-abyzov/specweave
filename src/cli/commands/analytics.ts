/**
 * Analytics CLI Command
 *
 * Shows usage statistics for commands, skills, and agents.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AnalyticsAggregator } from '../../core/analytics/analytics-aggregator.js';
import { AnalyticsQueryOptions, AnalyticsSummary, UsageCount, DailySummary } from '../../core/analytics/types.js';

interface AnalyticsCommandOptions {
  since?: string;
  until?: string;
  export?: 'json' | 'csv';
  limit?: number;
  type?: 'command' | 'skill' | 'agent';
  plugin?: string;
}

/**
 * Format a number with commas
 */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

/**
 * Pad string to fixed width
 */
function pad(str: string, width: number, padChar = ' '): string {
  if (str.length >= width) return str.slice(0, width);
  return str + padChar.repeat(width - str.length);
}

/**
 * Create a progress bar
 */
function progressBar(value: number, max: number, width = 10): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format success rate with color indicator
 */
function formatSuccessRate(successCount: number, total: number): string {
  if (total === 0) return '-';
  const rate = Math.round((successCount / total) * 100);
  return `${rate}%`;
}

/**
 * Render the analytics dashboard
 */
function renderDashboard(summary: AnalyticsSummary): void {
  const line = '═'.repeat(68);
  const thinLine = '─'.repeat(68);

  console.log('');
  console.log('📊 SpecWeave Usage Analytics');
  console.log(line);
  console.log('');

  // Period info
  const sinceDate = summary.since.split('T')[0];
  const untilDate = summary.until.split('T')[0];
  console.log(`Period: ${sinceDate} to ${untilDate}`);
  console.log(`Total Events: ${formatNumber(summary.totalEvents)} | Success Rate: ${summary.successRate}%`);
  console.log('');

  // Top Commands
  if (summary.topCommands.length > 0) {
    console.log('TOP COMMANDS                          Count    Success   Avg(ms)');
    console.log(thinLine);
    renderTopList(summary.topCommands);
    console.log('');
  }

  // Top Skills
  if (summary.topSkills.length > 0) {
    console.log('TOP SKILLS                            Count    Success   Plugin');
    console.log(thinLine);
    renderTopList(summary.topSkills, true);
    console.log('');
  }

  // Top Agents
  if (summary.topAgents.length > 0) {
    console.log('TOP AGENTS                            Count    Success   Plugin');
    console.log(thinLine);
    renderTopList(summary.topAgents, true);
    console.log('');
  }

  // Activity chart (last 7 days)
  if (summary.dailySummaries.length > 0) {
    console.log('ACTIVITY (recent days)');
    console.log(thinLine);
    renderActivityChart(summary.dailySummaries.slice(-7));
    console.log('');
  }

  if (summary.totalEvents === 0) {
    console.log('No analytics data recorded yet.');
    console.log('');
    console.log('Analytics will be collected as you use SpecWeave commands.');
    console.log('');
  }
}

/**
 * Render a top list of items
 */
function renderTopList(items: UsageCount[], showPlugin = false): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const num = `${i + 1}.`;
    const name = pad(item.name, 35, '.');
    const count = pad(String(item.count), 8);
    const success = pad(formatSuccessRate(item.successCount, item.count), 9);

    if (showPlugin) {
      const plugin = item.plugin || '-';
      console.log(`${num} ${name} ${count} ${success} ${plugin}`);
    } else {
      const duration = item.avgDuration !== undefined ? formatNumber(item.avgDuration) : '-';
      console.log(`${num} ${name} ${count} ${success} ${duration}`);
    }
  }
}

/**
 * Render activity chart
 */
function renderActivityChart(dailySummaries: DailySummary[]): void {
  if (dailySummaries.length === 0) return;

  const maxEvents = Math.max(...dailySummaries.map((d) => d.totalEvents));

  for (const day of dailySummaries) {
    const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
    const bar = progressBar(day.totalEvents, maxEvents);
    console.log(`${dayName}: ${bar} ${day.totalEvents}`);
  }
}

/**
 * CLI command to show analytics
 */
export async function analyticsCommand(options: AnalyticsCommandOptions = {}): Promise<void> {
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
