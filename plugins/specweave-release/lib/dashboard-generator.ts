/**
 * DORA Dashboard Generator
 *
 * Generates living docs dashboard with trends and visual indicators
 *
 * Output: .specweave/docs/internal/delivery/dora-dashboard.md
 *
 * Features:
 * - Current metrics with tier indicators (✅ Elite, 🟢 High, 🟡 Medium, 🔴 Low)
 * - 7-day, 30-day, 90-day trend charts
 * - Percentage changes with up/down arrows
 * - Degradation alerts
 * - Links to detailed reports and ADRs
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  DORASnapshot,
  TrendData,
  DegradationAlert,
  readHistory,
  calculateTrend,
  detectDegradation,
  getLatestSnapshot,
} from './dora-tracker.js';

// ============================================================================
// Constants
// ============================================================================

const SPECWEAVE_ROOT = process.cwd();
const DASHBOARD_PATH = path.join(
  SPECWEAVE_ROOT,
  '.specweave',
  'docs',
  'internal',
  'delivery',
  'dora-dashboard.md'
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get tier indicator icon
 */
function getTierIcon(tier: string): string {
  switch (tier) {
    case 'elite': return '✅';
    case 'high': return '🟢';
    case 'medium': return '🟡';
    case 'low': return '🔴';
    default: return '⚪';
  }
}

/**
 * Format trend change with arrow
 */
function formatTrendChange(change: number): string {
  if (change > 0) {
    return `↑ +${change.toFixed(1)}%`;
  } else if (change < 0) {
    return `↓ ${change.toFixed(1)}%`;
  } else {
    return `→ 0%`;
  }
}

/**
 * Get overall tier (worst of all 4 metrics)
 */
function getOverallTier(snapshot: DORASnapshot): { tier: string; icon: string; count: Record<string, number> } {
  const tiers = [
    snapshot.deploymentFrequency.tier,
    snapshot.leadTime.tier,
    snapshot.changeFailureRate.tier,
    snapshot.mttr.tier === 'n/a' ? 'elite' : snapshot.mttr.tier, // Treat N/A as elite (no incidents)
  ];

  // Count metrics at each tier
  const count = {
    elite: tiers.filter(t => t === 'elite').length,
    high: tiers.filter(t => t === 'high').length,
    medium: tiers.filter(t => t === 'medium').length,
    low: tiers.filter(t => t === 'low').length,
  };

  // Overall tier = worst tier (prioritize low > medium > high > elite)
  let overallTier = 'elite';
  if (count.low > 0) overallTier = 'low';
  else if (count.medium > 0) overallTier = 'medium';
  else if (count.high > 0) overallTier = 'high';

  return {
    tier: overallTier,
    icon: getTierIcon(overallTier),
    count,
  };
}

// ============================================================================
// Dashboard Generation
// ============================================================================

/**
 * Generate DORA dashboard markdown
 */
export function generateDashboard(): string {
  const latest = getLatestSnapshot();
  if (!latest) {
    return `# DORA Metrics Dashboard

**Status**: No metrics data available

Run \`npm run metrics:dora\` to calculate DORA metrics.
`;
  }

  const overall = getOverallTier(latest);
  const alerts = detectDegradation();

  // Header
  let markdown = `# DORA Metrics Dashboard

**Last Updated**: ${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]} UTC
**Overall Rating**: ${overall.icon} **${overall.tier.charAt(0).toUpperCase() + overall.tier.slice(1)}** (${overall.count.elite} Elite, ${overall.count.high} High, ${overall.count.medium} Medium, ${overall.count.low} Low)

---

## Current Metrics

`;

  // Metrics table
  const metrics = [
    {
      name: 'Deployment Frequency',
      key: 'deploymentFrequency' as const,
      current: `${latest.deploymentFrequency.value} ${latest.deploymentFrequency.unit}`,
      tier: latest.deploymentFrequency.tier,
    },
    {
      name: 'Lead Time for Changes',
      key: 'leadTime' as const,
      current: `${latest.leadTime.value} ${latest.leadTime.unit}`,
      tier: latest.leadTime.tier,
    },
    {
      name: 'Change Failure Rate',
      key: 'changeFailureRate' as const,
      current: `${latest.changeFailureRate.value}%`,
      tier: latest.changeFailureRate.tier,
    },
    {
      name: 'Time to Restore Service (MTTR)',
      key: 'mttr' as const,
      current: latest.mttr.tier === 'n/a' ? 'N/A (No incidents)' : `${latest.mttr.value} ${latest.mttr.unit}`,
      tier: latest.mttr.tier,
    },
  ];

  markdown += `| Metric | Current | 7-Day Trend | 30-Day Trend | 90-Day Trend | Tier |\n`;
  markdown += `|--------|---------|-------------|--------------|--------------|------|\n`;

  metrics.forEach(metric => {
    const trend = calculateTrend(metric.key);
    const sevenDay = trend ? formatTrendChange(trend.sevenDayChange) : '-';
    const thirtyDay = trend ? formatTrendChange(trend.thirtyDayChange) : '-';
    const ninetyDay = trend ? formatTrendChange(trend.ninetyDayChange) : '-';

    markdown += `| **${metric.name}** | ${metric.current} | ${sevenDay} | ${thirtyDay} | ${ninetyDay} | ${getTierIcon(metric.tier)} ${metric.tier.charAt(0).toUpperCase() + metric.tier.slice(1)} |\n`;
  });

  markdown += `\n`;

  // Degradation Alerts
  if (alerts.length > 0) {
    markdown += `## ⚠️ Degradation Alerts\n\n`;
    alerts.forEach(alert => {
      const icon = alert.severity === 'critical' ? '🔴' : '🟠';
      markdown += `${icon} **${alert.metric}**: ${alert.message}\n`;
      markdown += `- Previous (30-day avg): ${alert.previousValue.toFixed(2)}\n`;
      markdown += `- Current: ${alert.currentValue.toFixed(2)}\n`;
      markdown += `- Change: ${alert.percentageChange.toFixed(1)}%\n\n`;
    });
  } else {
    markdown += `## ✅ No Degradation Detected\n\nAll metrics are stable or improving compared to 30-day averages.\n\n`;
  }

  // Tier Reference
  markdown += `---

## DORA Performance Tiers

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| **Deployment Frequency** | On-demand (multiple/day) | Weekly - Monthly | Monthly - 6 months | < 6 months |
| **Lead Time for Changes** | < 1 hour | 1 day - 1 week | 1 week - 1 month | 1-6 months |
| **Change Failure Rate** | 0-15% | 16-30% | 31-45% | > 45% |
| **Time to Restore Service** | < 1 hour | < 1 day | 1 day - 1 week | > 1 week |

**Source**: [DORA State of DevOps Research](https://dora.dev/)

---

## Historical Trends

**Total Snapshots**: ${readHistory().length}

**Data Retention**: All snapshots stored in \`.specweave/metrics/dora-history.jsonl\`

**Calculation Frequency**: After every increment completion (automated via hooks)

---

## Related Documentation

- [DORA Metrics (Detailed)](./dora-metrics.md) - Full methodology and measurement details
- [Release Process](./release-process.md) - Release workflow and best practices
- [Testing Strategy](./guides/testing-strategy.md) - Testing approach linked to change failure rate
- [Branch Strategy](./branch-strategy.md) - Git workflow linked to lead time

---

## Actions

**If metrics are degrading**:

1. **Review Recent Changes** - What changed in the last 30 days?
2. **Analyze Root Cause** - Use incident reports, test failures, deployment logs
3. **Create ADR** - Document decision to address degradation
4. **Implement Improvements** - Create increment to fix underlying issues
5. **Monitor Progress** - Track metrics recovery over next 30 days

**If metrics are improving**:

1. **Document Success** - What practices led to improvement?
2. **Share Knowledge** - Update team playbooks with learnings
3. **Maintain Momentum** - Continue proven practices
4. **Set New Goals** - Aim for next tier (High → Elite)

---

**Dashboard Auto-Generated**: ${new Date().toISOString()}
**Generator**: \`plugins/specweave-release/lib/dashboard-generator.ts\`
`;

  return markdown;
}

/**
 * Write dashboard to file
 */
export function writeDashboard(): void {
  const markdown = generateDashboard();

  // Ensure directory exists
  const dir = path.dirname(DASHBOARD_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write dashboard
  fs.writeFileSync(DASHBOARD_PATH, markdown, 'utf-8');

  console.log(`✓ Dashboard generated: ${DASHBOARD_PATH}`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

/**
 * CLI tool for dashboard generation
 *
 * Usage: npm run dora:dashboard
 */
async function main() {
  try {
    writeDashboard();
    console.log('✅ DORA dashboard generated successfully');
  } catch (error) {
    console.error('❌ Failed to generate dashboard:', error);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main().catch(console.error);
}
