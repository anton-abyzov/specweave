#!/usr/bin/env node
/**
 * DORA Metrics Calculator
 *
 * Main orchestrator that calculates all 4 DORA metrics
 * Entry point for CLI and GitHub Actions workflow
 */

import * as fs from 'fs';
import * as path from 'path';
import { GitHubClient } from './github-client.js';
import { calculateDeploymentFrequency } from './calculators/deployment-frequency.js';
import { calculateLeadTime } from './calculators/lead-time.js';
import { calculateChangeFailureRate } from './calculators/change-failure-rate.js';
import { calculateMTTR } from './calculators/mttr.js';
import { generateMarkdownReport, writeReport } from './report-generator.js';
import { DORAMetrics, GitHubConfig, Release, Issue, Commit } from './types.js';

/**
 * Calculate all DORA metrics
 *
 * @param client - GitHub API client
 * @returns Complete DORA metrics with raw data
 */
export async function calculateDORAMetrics(client: GitHubClient): Promise<{
  metrics: DORAMetrics;
  releases: Release[];
  issues: Issue[];
  deploymentCommits: Commit[];
}> {
  // Query data from GitHub (last 30 days)
  const since = new Date();
  since.setDate(since.getDate() - 30);

  console.log('📊 Fetching data from GitHub API...');

  // Get commits to develop branch (each commit = deployment for AI-assisted dev)
  const deploymentCommits = await client.getCommitsToDefaultBranch(since, 'develop');
  console.log(`   ✓ Found ${deploymentCommits.length} commits to develop (deployments)`);

  const releases = await client.getReleases(since);
  console.log(`   ✓ Found ${releases.length} formal releases`);

  const commits = releases.length > 0
    ? await client.getCommits(releases[0].target_commitish, new Date())
    : deploymentCommits;  // Fallback to deployment commits for lead time
  console.log(`   ✓ Found ${commits.length} commits for lead time calc`);

  const issues = await client.getIssues(['incident', 'production-bug'], since);
  console.log(`   ✓ Found ${issues.length} incidents`);

  // Calculate metrics
  console.log('\n🔢 Calculating DORA metrics...');

  // Use commits to develop for deployment frequency (not just releases)
  const deploymentFrequency = calculateDeploymentFrequency(deploymentCommits);
  console.log(`   ✓ Deployment Frequency: ${deploymentFrequency.value} ${deploymentFrequency.unit} (${deploymentFrequency.tier})`);

  const leadTime = calculateLeadTime(releases, commits);
  console.log(`   ✓ Lead Time: ${leadTime.value} ${leadTime.unit} (${leadTime.tier})`);

  const changeFailureRate = calculateChangeFailureRate(releases, issues);
  console.log(`   ✓ Change Failure Rate: ${changeFailureRate.value}% (${changeFailureRate.tier})`);

  const mttr = calculateMTTR(issues);
  console.log(`   ✓ MTTR: ${mttr.value} ${mttr.unit} (${mttr.tier})`);

  const metricsResult: DORAMetrics = {
    timestamp: new Date().toISOString(),
    metrics: {
      deploymentFrequency,
      leadTime,
      changeFailureRate,
      mttr,
    },
  };

  return {
    metrics: metricsResult,
    releases,
    issues,
    deploymentCommits,
  };
}

/**
 * Write metrics to JSON file
 *
 * @param metrics - DORA metrics
 * @param filePath - Output file path
 */
export function writeMetricsJSON(metrics: DORAMetrics, filePath: string): void {
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write JSON with pretty formatting
  const json = JSON.stringify(metrics, null, 2);
  fs.writeFileSync(filePath, json, 'utf-8');

  console.log(`\n✅ Metrics written to ${filePath}`);
}

/**
 * CLI Entry Point
 *
 * Run with: npm run metrics:dora
 * Or: ts-node src/metrics/dora-calculator.ts
 */
async function main() {
  try {
    // Parse GitHub config from environment
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    const repository = process.env.GITHUB_REPOSITORY || 'anton-abyzov/specweave';
    const [owner, repo] = repository.split('/');

    const config: GitHubConfig = { token, owner, repo };

    // Calculate metrics
    const client = new GitHubClient(config);
    const result = await calculateDORAMetrics(client);

    // Write JSON file
    const jsonOutputPath = path.join(process.cwd(), '.specweave', 'metrics', 'dora-latest.json');
    writeMetricsJSON(result.metrics, jsonOutputPath);

    // Generate and write markdown report
    console.log('\n📝 Generating detailed report...');
    const report = generateMarkdownReport(result.metrics, result.releases, result.issues);
    const reportOutputPath = path.join(process.cwd(), '.specweave', 'metrics', 'dora-report.md');
    writeReport(report, reportOutputPath);

    console.log('\n🎉 DORA metrics calculation complete!');
    console.log(`   📊 JSON: ${jsonOutputPath}`);
    console.log(`   📝 Report: ${reportOutputPath}`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error calculating DORA metrics:');
    console.error(error);
    process.exit(1);
  }
}

// ESM module entry point (always run when executed)
main();
