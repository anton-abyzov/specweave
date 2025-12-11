#!/usr/bin/env tsx
/**
 * Per-US Field Resolution Monitoring Script
 *
 * Monitors for edge cases in project resolution after frontmatter removal.
 * Tracks resolution sources, confidence levels, and potential issues.
 *
 * Run daily via cron or CI pipeline:
 *   npx tsx scripts/monitoring/per-us-resolution-monitor.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectResolutionService, ResolvedProject } from '../../src/core/project/project-resolution.js';
import { consoleLogger } from '../../src/utils/logger.js';

interface MonitoringReport {
  timestamp: string;
  totalIncrements: number;
  resolutionStats: {
    perUs: number;
    config: number;
    detection: number;
    fallback: number;
  };
  confidenceLevels: {
    high: number;
    medium: number;
    low: number;
  };
  edgeCases: EdgeCase[];
  warnings: string[];
}

interface EdgeCase {
  incrementId: string;
  issue: string;
  resolution: ResolvedProject;
  severity: 'low' | 'medium' | 'high';
}

async function monitorResolution(): Promise<MonitoringReport> {
  const projectRoot = process.cwd();
  const incrementsDir = path.join(projectRoot, '.specweave', 'increments');
  const resolver = new ProjectResolutionService(projectRoot, { logger: consoleLogger });

  const report: MonitoringReport = {
    timestamp: new Date().toISOString(),
    totalIncrements: 0,
    resolutionStats: {
      perUs: 0,
      config: 0,
      detection: 0,
      fallback: 0,
    },
    confidenceLevels: {
      high: 0,
      medium: 0,
      low: 0,
    },
    edgeCases: [],
    warnings: [],
  };

  // Find all active increments
  const increments = fs.readdirSync(incrementsDir)
    .filter(name => /^\d{4}/.test(name))
    .filter(name => {
      const stat = fs.statSync(path.join(incrementsDir, name));
      return stat.isDirectory();
    });

  report.totalIncrements = increments.length;

  for (const incrementName of increments) {
    const specPath = path.join(incrementsDir, incrementName, 'spec.md');

    if (!fs.existsSync(specPath)) {
      report.warnings.push(`Missing spec.md for ${incrementName}`);
      continue;
    }

    try {
      // Use the correct method: resolveProjectForIncrement
      const resolution = await resolver.resolveProjectForIncrement(incrementName);

      // Track resolution source
      if (resolution.source === 'per-us') report.resolutionStats.perUs++;
      else if (resolution.source === 'config') report.resolutionStats.config++;
      else if (resolution.source === 'detection') report.resolutionStats.detection++;
      else if (resolution.source === 'fallback') report.resolutionStats.fallback++;

      // Track confidence level
      if (resolution.confidence === 'high') report.confidenceLevels.high++;
      else if (resolution.confidence === 'medium') report.confidenceLevels.medium++;
      else if (resolution.confidence === 'low') report.confidenceLevels.low++;

      // Detect edge cases
      if (resolution.source === 'fallback') {
        report.edgeCases.push({
          incrementId: incrementName,
          issue: 'Using ultimate fallback - no per-US fields, config, or detection',
          resolution,
          severity: 'high',
        });
      }

      if (resolution.confidence === 'low' && resolution.source !== 'fallback') {
        report.edgeCases.push({
          incrementId: incrementName,
          issue: `Low confidence resolution via ${resolution.source}`,
          resolution,
          severity: 'medium',
        });
      }

      // Check for cross-project without explicit per-US
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const userStories = specContent.match(/###\s+US-\d+:/g) || [];
      const projectFields = specContent.match(/\*\*Project\*\*:\s*\S+/g) || [];

      if (userStories.length > 1 && projectFields.length < userStories.length) {
        report.edgeCases.push({
          incrementId: incrementName,
          issue: `Multi-US increment with incomplete per-US project fields (${projectFields.length}/${userStories.length})`,
          resolution,
          severity: 'medium',
        });
      }

    } catch (error: any) {
      report.warnings.push(`Error resolving ${incrementName}: ${error.message}`);
    }
  }

  return report;
}

function generateReportSummary(report: MonitoringReport): string {
  const lines: string[] = [];

  lines.push('═'.repeat(70));
  lines.push('PER-US FIELD RESOLUTION MONITORING REPORT');
  lines.push('═'.repeat(70));
  lines.push('');
  lines.push(`Date: ${new Date(report.timestamp).toLocaleString()}`);
  lines.push(`Total Increments Scanned: ${report.totalIncrements}`);
  lines.push('');

  lines.push('Resolution Source Distribution:');
  lines.push(`  Per-US Fields:  ${report.resolutionStats.perUs} (${((report.resolutionStats.perUs / report.totalIncrements) * 100).toFixed(1)}%)`);
  lines.push(`  Config Fallback: ${report.resolutionStats.config} (${((report.resolutionStats.config / report.totalIncrements) * 100).toFixed(1)}%)`);
  lines.push(`  Detection:      ${report.resolutionStats.detection} (${((report.resolutionStats.detection / report.totalIncrements) * 100).toFixed(1)}%)`);
  lines.push(`  Ultimate Fallback: ${report.resolutionStats.fallback} (${((report.resolutionStats.fallback / report.totalIncrements) * 100).toFixed(1)}%)`);
  lines.push('');

  lines.push('Confidence Level Distribution:');
  lines.push(`  High:   ${report.confidenceLevels.high} (${((report.confidenceLevels.high / report.totalIncrements) * 100).toFixed(1)}%)`);
  lines.push(`  Medium: ${report.confidenceLevels.medium} (${((report.confidenceLevels.medium / report.totalIncrements) * 100).toFixed(1)}%)`);
  lines.push(`  Low:    ${report.confidenceLevels.low} (${((report.confidenceLevels.low / report.totalIncrements) * 100).toFixed(1)}%)`);
  lines.push('');

  if (report.edgeCases.length > 0) {
    lines.push('─'.repeat(70));
    lines.push(`EDGE CASES DETECTED: ${report.edgeCases.length}`);
    lines.push('─'.repeat(70));
    lines.push('');

    const highSeverity = report.edgeCases.filter(e => e.severity === 'high');
    const mediumSeverity = report.edgeCases.filter(e => e.severity === 'medium');
    const lowSeverity = report.edgeCases.filter(e => e.severity === 'low');

    if (highSeverity.length > 0) {
      lines.push(`🔴 HIGH SEVERITY (${highSeverity.length}):`);
      highSeverity.forEach(edge => {
        lines.push(`  • ${edge.incrementId}`);
        lines.push(`    Issue: ${edge.issue}`);
        lines.push(`    Resolution: ${edge.resolution.projectId} (${edge.resolution.source}, ${edge.resolution.confidence} confidence)`);
        lines.push('');
      });
    }

    if (mediumSeverity.length > 0) {
      lines.push(`🟡 MEDIUM SEVERITY (${mediumSeverity.length}):`);
      mediumSeverity.forEach(edge => {
        lines.push(`  • ${edge.incrementId}`);
        lines.push(`    Issue: ${edge.issue}`);
        lines.push(`    Resolution: ${edge.resolution.projectId} (${edge.resolution.source})`);
        lines.push('');
      });
    }

    if (lowSeverity.length > 0) {
      lines.push(`🟢 LOW SEVERITY (${lowSeverity.length}):`);
      lowSeverity.forEach(edge => {
        lines.push(`  • ${edge.incrementId}: ${edge.issue}`);
      });
      lines.push('');
    }
  } else {
    lines.push('✅ NO EDGE CASES DETECTED');
    lines.push('');
  }

  if (report.warnings.length > 0) {
    lines.push('─'.repeat(70));
    lines.push(`WARNINGS (${report.warnings.length}):`);
    lines.push('─'.repeat(70));
    report.warnings.forEach(warning => {
      lines.push(`  ⚠️  ${warning}`);
    });
    lines.push('');
  }

  lines.push('═'.repeat(70));

  // Health assessment
  const perUsPercentage = (report.resolutionStats.perUs / report.totalIncrements) * 100;
  const fallbackPercentage = (report.resolutionStats.fallback / report.totalIncrements) * 100;
  const highConfidencePercentage = (report.confidenceLevels.high / report.totalIncrements) * 100;

  lines.push('HEALTH ASSESSMENT:');

  if (perUsPercentage >= 80 && highConfidencePercentage >= 90 && fallbackPercentage < 5) {
    lines.push('  ✅ EXCELLENT - Per-US resolution working as expected');
  } else if (perUsPercentage >= 60 && fallbackPercentage < 10) {
    lines.push('  🟡 GOOD - Minor issues, continue monitoring');
  } else {
    lines.push('  🔴 ATTENTION NEEDED - High fallback usage or low confidence');
    lines.push('     Action: Review edge cases and add per-US fields where missing');
  }

  lines.push('═'.repeat(70));

  return lines.join('\n');
}

async function main() {
  console.log('Starting per-US field resolution monitoring...\n');

  const report = await monitorResolution();

  // Generate and display summary
  const summary = generateReportSummary(report);
  console.log(summary);

  // Save full report to file
  const reportDir = path.join(process.cwd(), '.specweave', 'monitoring');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, `per-us-resolution-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Full report saved: ${reportPath}`);

  // Exit with error code if high-severity edge cases found
  const highSeverityCases = report.edgeCases.filter(e => e.severity === 'high');
  if (highSeverityCases.length > 0) {
    console.error(`\n❌ Found ${highSeverityCases.length} high-severity edge cases!`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Monitoring failed:', error);
  process.exit(1);
});
