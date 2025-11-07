#!/usr/bin/env node
/**
 * DORA Metrics Report Generator
 *
 * Generates detailed markdown reports from DORA metrics
 * Provides insights, trends, and actionable recommendations
 */

import * as fs from 'fs';
import * as path from 'path';
import { DORAMetrics, Release, Issue } from './types.js';

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get tier emoji
 */
function getTierEmoji(tier: string): string {
  switch (tier) {
    case 'Elite': return '🏆';
    case 'High': return '⭐';
    case 'Medium': return '📊';
    case 'Low': return '⚠️';
    default: return '⚪';
  }
}

/**
 * Get status emoji
 */
function getStatusEmoji(tier: string): string {
  switch (tier) {
    case 'Elite':
    case 'High':
      return '✅';
    case 'Medium':
      return '⚠️';
    case 'Low':
      return '❌';
    default:
      return 'ℹ️';
  }
}

/**
 * Generate deployment frequency insights
 */
function generateDFInsights(value: number, tier: string): string[] {
  const insights: string[] = [];

  if (tier === 'Elite') {
    insights.push('🎉 **Elite Performance**: Deploying multiple times per day enables rapid feedback and reduced risk');
    insights.push('✅ Continue current cadence - no action needed');
  } else if (tier === 'High') {
    insights.push('✅ **Strong Performance**: Weekly to monthly deployments indicate healthy delivery rhythm');
    insights.push('📈 **Next Level**: Consider increasing to daily deployments for elite performance');
    insights.push('💡 **Tip**: Implement feature flags to decouple deployment from release');
  } else if (tier === 'Medium') {
    insights.push('⚠️ **Room for Improvement**: Monthly to quarterly deployments increase risk');
    insights.push('🎯 **Action**: Break down changes into smaller, more frequent deployments');
    insights.push('🔧 **Focus**: Improve CI/CD pipeline automation');
  } else {
    insights.push('❌ **Critical**: Infrequent deployments create significant risk and slow feedback');
    insights.push('🚨 **Urgent**: Implement automated deployment pipeline');
    insights.push('📋 **Priority**: Break monolithic releases into incremental deployments');
  }

  return insights;
}

/**
 * Generate lead time insights
 */
function generateLTInsights(value: number, tier: string, p50?: number, p90?: number): string[] {
  const insights: string[] = [];

  if (tier === 'Elite') {
    insights.push('🎉 **Elite Performance**: Sub-hour lead time enables rapid iteration');
    insights.push('✅ Best-in-class delivery speed');
  } else if (tier === 'High') {
    insights.push('✅ **Strong Performance**: Lead time under 1 week is competitive');
    if (p50 && p90) {
      insights.push(`📊 **Distribution**: 50% of changes deploy in ${p50}h, 90% in ${p90}h`);
    }
    insights.push('📈 **Next Level**: Focus on reducing p90 to reach elite tier');
    insights.push('💡 **Tip**: Identify bottlenecks in slowest 10% of deployments');
  } else if (tier === 'Medium') {
    insights.push('⚠️ **Moderate Performance**: 1 week to 1 month lead time slows feedback');
    insights.push('🎯 **Action**: Reduce code review time and automate testing');
    insights.push('🔧 **Focus**: Eliminate manual approval steps');
  } else {
    insights.push('❌ **Critical**: Long lead times reduce agility and increase risk');
    insights.push('🚨 **Urgent**: Implement automated testing and deployment');
    insights.push('📋 **Priority**: Reduce batch size and increase deployment frequency');
  }

  return insights;
}

/**
 * Generate change failure rate insights
 */
function generateCFRInsights(value: number, tier: string, failed: number, total: number): string[] {
  const insights: string[] = [];

  if (tier === 'Elite') {
    insights.push('🎉 **Elite Performance**: < 15% failure rate indicates high quality');
    if (failed === 0) {
      insights.push('🏆 **Perfect Record**: Zero failures across all deployments!');
    }
    insights.push('✅ Maintain current quality standards');
  } else if (tier === 'High') {
    insights.push('✅ **Good Performance**: 16-30% failure rate is manageable');
    insights.push(`📊 **Stats**: ${failed} failures out of ${total} deployments`);
    insights.push('📈 **Next Level**: Focus on test coverage and pre-deployment validation');
    insights.push('💡 **Tip**: Implement smoke tests and canary deployments');
  } else if (tier === 'Medium') {
    insights.push('⚠️ **Concerning**: 31-45% failure rate impacts reliability');
    insights.push(`📊 **Stats**: ${failed} failures out of ${total} deployments`);
    insights.push('🎯 **Action**: Increase automated test coverage');
    insights.push('🔧 **Focus**: Implement pre-commit hooks and PR validation');
  } else {
    insights.push('❌ **Critical**: > 45% failure rate severely impacts trust');
    insights.push(`📊 **Stats**: ${failed} failures out of ${total} deployments`);
    insights.push('🚨 **Urgent**: Implement comprehensive test suite');
    insights.push('📋 **Priority**: Add smoke tests and staging environment');
  }

  return insights;
}

/**
 * Generate MTTR insights
 */
function generateMTTRInsights(value: number, tier: string, p50?: number, p90?: number): string[] {
  const insights: string[] = [];

  if (value === 0 || tier === 'N/A') {
    insights.push('ℹ️ **No Incidents**: No production incidents in measurement period');
    insights.push('✅ This is good news! Either stability is high or incident tracking needs improvement');
    insights.push('💡 **Tip**: Ensure production incidents are labeled "incident" or "production-bug"');
    return insights;
  }

  if (tier === 'Elite') {
    insights.push('🎉 **Elite Performance**: Sub-hour recovery time minimizes impact');
    insights.push('✅ Excellent incident response capability');
  } else if (tier === 'High') {
    insights.push('✅ **Strong Performance**: Recovery within 24 hours limits damage');
    if (p50 && p90) {
      insights.push(`📊 **Distribution**: 50% resolve in ${p50} min, 90% in ${p90} min`);
    }
    insights.push('📈 **Next Level**: Implement auto-remediation for common issues');
  } else if (tier === 'Medium') {
    insights.push('⚠️ **Room for Improvement**: Multi-day recovery extends impact');
    insights.push('🎯 **Action**: Create runbooks for common incidents');
    insights.push('🔧 **Focus**: Improve monitoring and alerting');
  } else {
    insights.push('❌ **Critical**: Week-plus recovery time is unacceptable');
    insights.push('🚨 **Urgent**: Implement on-call rotation and incident procedures');
    insights.push('📋 **Priority**: Create disaster recovery plan');
  }

  return insights;
}

/**
 * Generate markdown report
 */
export function generateMarkdownReport(
  metrics: DORAMetrics,
  releases?: Release[],
  issues?: Issue[]
): string {
  const timestamp = new Date(metrics.timestamp);
  const { deploymentFrequency, leadTime, changeFailureRate, mttr } = metrics.metrics;

  let report = `# DORA Metrics Report

**Generated**: ${formatDate(timestamp)} at ${timestamp.toLocaleTimeString('en-US')}
**Period**: Last 30 days

---

## 📊 Executive Summary

| Metric | Value | Tier | Status |
|--------|-------|------|--------|
| **Deployment Frequency** | ${deploymentFrequency.value} ${deploymentFrequency.unit} | ${getTierEmoji(deploymentFrequency.tier)} ${deploymentFrequency.tier} | ${getStatusEmoji(deploymentFrequency.tier)} |
| **Lead Time for Changes** | ${leadTime.value} ${leadTime.unit} | ${getTierEmoji(leadTime.tier)} ${leadTime.tier} | ${getStatusEmoji(leadTime.tier)} |
| **Change Failure Rate** | ${changeFailureRate.value}% | ${getTierEmoji(changeFailureRate.tier)} ${changeFailureRate.tier} | ${getStatusEmoji(changeFailureRate.tier)} |
| **Mean Time to Recovery** | ${mttr.value} ${mttr.unit} | ${getTierEmoji(mttr.tier)} ${mttr.tier} | ${getStatusEmoji(mttr.tier)} |

`;

  // Overall assessment
  const tiers = [deploymentFrequency.tier, leadTime.tier, changeFailureRate.tier, mttr.tier];
  const eliteCount = tiers.filter(t => t === 'Elite').length;
  const highCount = tiers.filter(t => t === 'High').length;

  if (eliteCount >= 3) {
    report += `**Overall Assessment**: 🏆 **Elite Team** - ${eliteCount}/4 metrics at elite level\n\n`;
  } else if (eliteCount + highCount >= 3) {
    report += `**Overall Assessment**: ⭐ **High-Performing Team** - ${eliteCount + highCount}/4 metrics at high or elite\n\n`;
  } else {
    report += `**Overall Assessment**: 📊 **Growing Team** - Focus on continuous improvement\n\n`;
  }

  report += `---

## 🚀 Deployment Frequency

**Current**: ${deploymentFrequency.value} ${deploymentFrequency.unit} (${getTierEmoji(deploymentFrequency.tier)} ${deploymentFrequency.tier})

**Industry Benchmarks**:
- 🏆 Elite: Multiple deploys per day (>365/year)
- ⭐ High: Weekly to monthly (52-365/year)
- 📊 Medium: Monthly to quarterly (12-52/year)
- ⚠️ Low: Less than quarterly (<12/year)

### Insights

${generateDFInsights(deploymentFrequency.value, deploymentFrequency.tier).map(i => `- ${i}`).join('\n')}

---

## ⚡ Lead Time for Changes

**Current**: ${leadTime.value} ${leadTime.unit} (${getTierEmoji(leadTime.tier)} ${leadTime.tier})
`;

  if (leadTime.p50 && leadTime.p90) {
    report += `**Percentiles**: P50 = ${leadTime.p50}h, P90 = ${leadTime.p90}h\n`;
  }

  report += `
**Industry Benchmarks**:
- 🏆 Elite: Less than 1 hour
- ⭐ High: 1 day to 1 week
- 📊 Medium: 1 week to 1 month
- ⚠️ Low: More than 1 month

### Insights

${generateLTInsights(leadTime.value, leadTime.tier, leadTime.p50, leadTime.p90).map(i => `- ${i}`).join('\n')}

---

## ✅ Change Failure Rate

**Current**: ${changeFailureRate.value}% (${getTierEmoji(changeFailureRate.tier)} ${changeFailureRate.tier})
**Failed Releases**: ${changeFailureRate.failedReleases} / ${changeFailureRate.totalReleases}

**Industry Benchmarks**:
- 🏆 Elite: 0-15%
- ⭐ High: 16-30%
- 📊 Medium: 31-45%
- ⚠️ Low: More than 45%

### Insights

${generateCFRInsights(changeFailureRate.value, changeFailureRate.tier, changeFailureRate.failedReleases, changeFailureRate.totalReleases).map(i => `- ${i}`).join('\n')}

---

## 🔧 Mean Time to Recovery (MTTR)

**Current**: ${mttr.value} ${mttr.unit} (${getTierEmoji(mttr.tier)} ${mttr.tier})
`;

  if (mttr.p50 && mttr.p90) {
    report += `**Percentiles**: P50 = ${mttr.p50} min, P90 = ${mttr.p90} min\n`;
  }

  report += `
**Industry Benchmarks**:
- 🏆 Elite: Less than 1 hour
- ⭐ High: 1 hour to 1 day
- 📊 Medium: 1 day to 1 week
- ⚠️ Low: More than 1 week

### Insights

${generateMTTRInsights(mttr.value, mttr.tier, mttr.p50, mttr.p90).map(i => `- ${i}`).join('\n')}

---

## 📈 Recent Activity

`;

  // Add release information if available
  if (releases && releases.length > 0) {
    report += `### Recent Releases (${releases.length} in last 30 days)\n\n`;
    releases.slice(0, 5).forEach((release: any) => {
      const publishedAt = new Date(release.published_at);
      report += `- **[${release.tag_name}](${release.html_url})** - ${formatDate(publishedAt)}\n`;
      if (release.name && release.name !== release.tag_name) {
        report += `  _${release.name}_\n`;
      }
    });
    if (releases.length > 5) {
      report += `\n_...and ${releases.length - 5} more releases_\n`;
    }
    report += '\n';
  }

  // Add incident information if available
  if (issues && issues.length > 0) {
    report += `### Production Incidents (${issues.length} tracked)\n\n`;
    issues.slice(0, 5).forEach((issue: any) => {
      const createdAt = new Date(issue.created_at);
      const closedAt = issue.closed_at ? new Date(issue.closed_at) : null;
      const duration = closedAt
        ? Math.round((closedAt.getTime() - createdAt.getTime()) / (1000 * 60))
        : 'ongoing';

      report += `- **[#${issue.number}](${issue.html_url})** ${issue.title}\n`;
      report += `  Created: ${formatDate(createdAt)} | `;
      if (typeof duration === 'number') {
        report += `Resolved in: ${duration} minutes\n`;
      } else {
        report += `Status: ${duration}\n`;
      }
    });
    if (issues.length > 5) {
      report += `\n_...and ${issues.length - 5} more incidents_\n`;
    }
  } else {
    report += `### Production Incidents

ℹ️ No production incidents tracked in the last 30 days.

💡 **Tip**: Label issues with "incident" or "production-bug" to track them automatically.

`;
  }

  report += `---

## 🎯 Recommended Actions

`;

  const actions: string[] = [];

  // Deployment frequency actions
  if (deploymentFrequency.tier === 'Medium' || deploymentFrequency.tier === 'Low') {
    actions.push('1. **Increase Deployment Frequency**');
    actions.push('   - Implement automated CI/CD pipeline');
    actions.push('   - Use feature flags to decouple deployment from release');
    actions.push('   - Break down large changes into smaller increments');
  }

  // Lead time actions
  if (leadTime.tier === 'Medium' || leadTime.tier === 'Low') {
    actions.push('2. **Reduce Lead Time**');
    actions.push('   - Automate code review and approval processes');
    actions.push('   - Implement automated testing (unit, integration, E2E)');
    actions.push('   - Reduce manual steps in deployment pipeline');
  }

  // Change failure rate actions
  if (changeFailureRate.tier === 'Medium' || changeFailureRate.tier === 'Low') {
    actions.push('3. **Improve Change Failure Rate**');
    actions.push('   - Increase test coverage (target: 80%+)');
    actions.push('   - Implement pre-commit hooks and linting');
    actions.push('   - Add smoke tests and staging environment');
  }

  // MTTR actions
  if (mttr.tier === 'Medium' || mttr.tier === 'Low') {
    actions.push('4. **Reduce Mean Time to Recovery**');
    actions.push('   - Create incident runbooks for common issues');
    actions.push('   - Implement automated rollback procedures');
    actions.push('   - Improve monitoring and alerting');
  }

  if (actions.length === 0) {
    report += `✅ **Great work!** All metrics are performing well. Focus on maintaining current standards.

💡 **Continue**:
- Monitor metrics regularly for trends
- Share DORA metrics with team for transparency
- Celebrate successes and learn from incidents
`;
  } else {
    report += actions.join('\n') + '\n';
  }

  report += `
---

## 📚 Resources

- **DORA Research**: [State of DevOps Report](https://cloud.google.com/devops/state-of-devops)
- **Metrics Calculation**: [GitHub Workflow](https://github.com/anton-abyzov/specweave/actions/workflows/dora-metrics.yml)
- **Implementation**: [SpecWeave DORA Calculator](https://github.com/anton-abyzov/specweave/tree/develop/src/metrics)

---

_This report was generated automatically by SpecWeave DORA Metrics Calculator_
_Last updated: ${formatDate(timestamp)}_
`;

  return report;
}

/**
 * Write report to markdown file
 */
export function writeReport(report: string, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, report, 'utf-8');
  console.log(`\n✅ Report written to ${filePath}`);
}
