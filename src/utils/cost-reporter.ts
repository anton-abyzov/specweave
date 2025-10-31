/**
 * Cost Report Generation
 *
 * Generates human-readable cost reports with multiple export formats:
 * - JSON (machine-readable)
 * - CSV (spreadsheet import)
 * - ASCII Dashboard (CLI display)
 */

import fs from 'fs-extra';
import type { CostTracker } from '../core/cost-tracker';
import type { IncrementCostReport } from '../types/cost-tracking';

export class CostReporter {
  constructor(private costTracker: CostTracker) {}

  /**
   * Generate cost report for a specific increment
   *
   * @param incrementId - Increment ID (e.g., '0003')
   * @returns Aggregate cost report
   */
  generateIncrementReport(incrementId: string): IncrementCostReport {
    return this.costTracker.getIncrementCost(incrementId);
  }

  /**
   * Export report to JSON file
   *
   * @param incrementId - Increment ID
   * @param outputPath - Output file path
   */
  async exportToJSON(incrementId: string, outputPath: string): Promise<void> {
    const report = this.generateIncrementReport(incrementId);
    await fs.writeJson(outputPath, report, { spaces: 2 });
  }

  /**
   * Export report to CSV file
   *
   * @param incrementId - Increment ID
   * @param outputPath - Output file path
   */
  async exportToCSV(incrementId: string, outputPath: string): Promise<void> {
    const sessions = this.costTracker.getIncrementSessions(incrementId);

    // CSV headers
    const headers = [
      'Session ID',
      'Agent',
      'Model',
      'Command',
      'Started At',
      'Ended At',
      'Input Tokens',
      'Output Tokens',
      'Total Tokens',
      'Cost ($)',
      'Savings ($)',
    ];

    // CSV rows
    const rows = sessions.map((s) => [
      s.sessionId,
      s.agent,
      s.model,
      s.command || 'N/A',
      s.startedAt,
      s.endedAt || 'In Progress',
      s.tokenUsage.inputTokens.toString(),
      s.tokenUsage.outputTokens.toString(),
      s.tokenUsage.totalTokens.toString(),
      s.cost.toFixed(4),
      s.savings.toFixed(4),
    ]);

    // Generate CSV (simple implementation, no external deps)
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join(
      '\n'
    );

    await fs.writeFile(outputPath, csv, 'utf-8');
  }

  /**
   * Generate ASCII dashboard for CLI display
   *
   * @param incrementId - Optional increment ID (defaults to all increments)
   * @returns ASCII table with cost breakdown
   */
  generateDashboard(incrementId?: string): string {
    if (incrementId) {
      return this.generateIncrementDashboard(incrementId);
    } else {
      return this.generateOverallDashboard();
    }
  }

  /**
   * Generate dashboard for a specific increment
   */
  private generateIncrementDashboard(incrementId: string): string {
    const report = this.generateIncrementReport(incrementId);
    const sessions = this.costTracker.getIncrementSessions(incrementId);

    if (sessions.length === 0) {
      return `No cost data for increment ${incrementId}`;
    }

    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push(`  Cost Report: Increment ${incrementId}`);
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push(
      `  Total Cost:       $${report.totalCost.toFixed(4).padStart(10)}`
    );
    lines.push(
      `  Total Savings:    $${report.totalSavings.toFixed(4).padStart(10)}`
    );
    const baselineCost = report.totalCost + report.totalSavings;
    const savingsPercentage =
      baselineCost > 0 ? (report.totalSavings / baselineCost) * 100 : 0;
    lines.push(
      `  Savings %:         ${savingsPercentage.toFixed(1).padStart(10)}%`
    );
    lines.push(
      `  Total Tokens:      ${report.totalTokens.toLocaleString().padStart(10)}`
    );
    lines.push(`  Sessions:          ${report.sessionCount.toString().padStart(10)}`);
    lines.push('');

    // Cost by Model
    lines.push('COST BY MODEL');
    lines.push('───────────────────────────────────────────────────────────────');
    for (const [model, cost] of Object.entries(report.costByModel)) {
      const percentage = (cost / report.totalCost) * 100;
      lines.push(
        `  ${model.padEnd(15)} $${cost.toFixed(4).padStart(10)}  (${percentage.toFixed(1).padStart(5)}%)`
      );
    }
    lines.push('');

    // Cost by Agent
    lines.push('COST BY AGENT');
    lines.push('───────────────────────────────────────────────────────────────');
    const sortedAgents = Object.entries(report.costByAgent).sort(
      ([, a], [, b]) => b - a
    );
    for (const [agent, cost] of sortedAgents.slice(0, 10)) {
      // Top 10
      const percentage = (cost / report.totalCost) * 100;
      lines.push(
        `  ${agent.padEnd(25)} $${cost.toFixed(4).padStart(8)}  (${percentage.toFixed(1).padStart(5)}%)`
      );
    }
    if (sortedAgents.length > 10) {
      lines.push(`  ... and ${sortedAgents.length - 10} more agents`);
    }
    lines.push('');

    // Recent Sessions (last 5)
    lines.push('RECENT SESSIONS');
    lines.push('───────────────────────────────────────────────────────────────');
    const recentSessions = sessions
      .sort((a, b) => {
        const timeA = new Date(a.startedAt).getTime();
        const timeB = new Date(b.startedAt).getTime();
        return timeB - timeA;
      })
      .slice(0, 5);

    for (const session of recentSessions) {
      const time = new Date(session.startedAt).toLocaleString();
      lines.push(`  ${time}`);
      lines.push(`  Agent: ${session.agent.padEnd(20)} Model: ${session.model}`);
      lines.push(
        `  Cost: $${session.cost.toFixed(4).padStart(8)}    Savings: $${session.savings.toFixed(4).padStart(8)}`
      );
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate dashboard for all increments
   */
  private generateOverallDashboard(): string {
    const summary = this.costTracker.getSummary();

    if (summary.totalSessions === 0) {
      return 'No cost data available';
    }

    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('  SpecWeave Cost Summary - All Increments');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    // Overall Summary
    lines.push('OVERALL SUMMARY');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push(
      `  Total Cost:       $${summary.totalCost.toFixed(4).padStart(10)}`
    );
    lines.push(
      `  Total Savings:    $${summary.totalSavings.toFixed(4).padStart(10)}`
    );
    lines.push(
      `  Savings %:         ${summary.savingsPercentage.toFixed(1).padStart(10)}%`
    );
    lines.push(`  Total Sessions:    ${summary.totalSessions.toString().padStart(10)}`);
    lines.push('');

    // Agent Stats
    if (summary.mostExpensiveAgent) {
      lines.push('AGENT STATS');
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push(`  Most Expensive:    ${summary.mostExpensiveAgent}`);
      if (summary.cheapestAgent !== summary.mostExpensiveAgent) {
        lines.push(`  Least Expensive:   ${summary.cheapestAgent}`);
      }
      lines.push('');
    }

    // By Increment
    const allSessions = this.costTracker.getAllSessions();
    const incrementIds = [...new Set(allSessions.map((s) => s.increment).filter(Boolean))];

    if (incrementIds.length > 0) {
      lines.push('COST BY INCREMENT');
      lines.push('───────────────────────────────────────────────────────────────');

      for (const incrementId of incrementIds) {
        const report = this.generateIncrementReport(incrementId!);
        lines.push(
          `  ${incrementId!.padEnd(30)} $${report.totalCost.toFixed(4).padStart(8)}  (${report.sessionCount} sessions)`
        );
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('💡 Tip: Use "/specweave.costs 0003" to see detailed report for increment 0003');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate compact one-line summary
   *
   * @param incrementId - Optional increment ID
   * @returns One-line summary string
   */
  generateSummaryLine(incrementId?: string): string {
    if (incrementId) {
      const report = this.generateIncrementReport(incrementId);
      return `Increment ${incrementId}: $${report.totalCost.toFixed(4)} cost, $${report.totalSavings.toFixed(4)} saved (${((report.totalSavings / (report.totalCost + report.totalSavings)) * 100).toFixed(1)}%)`;
    } else {
      const summary = this.costTracker.getSummary();
      return `Total: $${summary.totalCost.toFixed(4)} cost, $${summary.totalSavings.toFixed(4)} saved (${summary.savingsPercentage.toFixed(1)}%) across ${summary.totalSessions} sessions`;
    }
  }
}
