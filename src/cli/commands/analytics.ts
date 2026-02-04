/**
 * Analytics CLI Command
 *
 * Shows usage analytics dashboard - command invocations, skill activations, agent spawns.
 * Supports filtering by time range, type, and export to JSON/CSV.
 */

import {
  AnalyticsCollector,
  AnalyticsAggregator,
  AnalyticsSummary,
  AnalyticsEventType,
} from '../../core/analytics/index.js';

export interface AnalyticsCommandOptions {
  projectRoot?: string;
  export?: 'json' | 'csv';
  since?: string;
  type?: AnalyticsEventType;
  json?: boolean;
  limit?: number;
}

export interface AnalyticsCommandResult {
  totalEvents: number;
  topCommands: Array<{ name: string; count: number }>;
  topSkills: Array<{ name: string; count: number }>;
  topAgents: Array<{ name: string; count: number }>;
  successRate: number;
  exported?: boolean;
  format?: string;
  filename?: string;
  jsonOutput?: boolean;
  data?: AnalyticsSummary;
}

/**
 * Parse time filter string (e.g., "24h", "7d", "30d") to ISO date
 */
function parseSinceFilter(since: string): string {
  const now = new Date();
  const match = since.match(/^(\d+)([hdwm])$/);

  if (!match) {
    throw new Error(`Invalid time format: ${since}. Use formats like 24h, 7d, 30d`);
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  switch (unit) {
    case 'h':
      now.setHours(now.getHours() - value);
      break;
    case 'd':
      now.setDate(now.getDate() - value);
      break;
    case 'w':
      now.setDate(now.getDate() - value * 7);
      break;
    case 'm':
      now.setMonth(now.getMonth() - value);
      break;
  }

  return now.toISOString();
}

/**
 * Format summary for console display
 */
function displaySummary(summary: AnalyticsSummary): void {
  console.log('\n📊 SpecWeave Analytics Dashboard\n');
  console.log(`Period: ${summary.since.split('T')[0]} → ${summary.until.split('T')[0]}`);
  console.log(`Total Events: ${summary.totalEvents}`);
  console.log(`Success Rate: ${summary.successRate}%\n`);

  if (summary.topCommands.length > 0) {
    console.log('🔧 Top Commands:');
    for (const cmd of summary.topCommands.slice(0, 5)) {
      console.log(`   ${cmd.count.toString().padStart(4)} │ ${cmd.name}`);
    }
    console.log('');
  }

  if (summary.topSkills.length > 0) {
    console.log('⚡ Top Skills:');
    for (const skill of summary.topSkills.slice(0, 5)) {
      console.log(`   ${skill.count.toString().padStart(4)} │ ${skill.name}`);
    }
    console.log('');
  }

  if (summary.topAgents.length > 0) {
    console.log('🤖 Top Agents:');
    for (const agent of summary.topAgents.slice(0, 5)) {
      console.log(`   ${agent.count.toString().padStart(4)} │ ${agent.name}`);
    }
    console.log('');
  }

  if (summary.dailySummaries.length > 0) {
    console.log('📅 Daily Activity (last 7 days):');
    for (const day of summary.dailySummaries.slice(-7)) {
      const bar = '█'.repeat(Math.min(day.totalEvents, 20));
      console.log(`   ${day.date} │ ${bar} (${day.totalEvents})`);
    }
    console.log('');
  }
}

/**
 * Analytics CLI command handler
 */
export async function analyticsCommand(
  options: AnalyticsCommandOptions = {}
): Promise<AnalyticsCommandResult> {
  const projectRoot = options.projectRoot || process.cwd();
  const limit = options.limit ?? 10;

  // Initialize collector and aggregator
  AnalyticsCollector.getInstance(projectRoot);
  const aggregator = new AnalyticsAggregator(projectRoot);

  // Build query options
  const queryOptions: {
    since?: string;
    type?: AnalyticsEventType;
    limit?: number;
  } = { limit };

  if (options.since) {
    queryOptions.since = parseSinceFilter(options.since);
  }

  if (options.type) {
    queryOptions.type = options.type;
  }

  // Get summary
  const summary = aggregator.getSummary(queryOptions);

  // Handle export
  if (options.export) {
    const exported = aggregator.export(options.export, queryOptions);
    console.log(`Exported to: ${exported.filename}`);
    console.log(exported.content);

    return {
      totalEvents: summary.totalEvents,
      topCommands: summary.topCommands,
      topSkills: summary.topSkills,
      topAgents: summary.topAgents,
      successRate: summary.successRate,
      exported: true,
      format: options.export,
      filename: exported.filename,
    };
  }

  // Handle JSON output
  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));

    return {
      totalEvents: summary.totalEvents,
      topCommands: summary.topCommands,
      topSkills: summary.topSkills,
      topAgents: summary.topAgents,
      successRate: summary.successRate,
      jsonOutput: true,
      data: summary,
    };
  }

  // Display formatted summary
  displaySummary(summary);

  return {
    totalEvents: summary.totalEvents,
    topCommands: summary.topCommands,
    topSkills: summary.topSkills,
    topAgents: summary.topAgents,
    successRate: summary.successRate,
  };
}
