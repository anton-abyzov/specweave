#!/usr/bin/env node
/**
 * DORA Metrics Calculator
 *
 * Main orchestrator that calculates all 4 DORA metrics
 * Entry point for CLI and GitHub Actions workflow
 */

import * as fs from 'fs';
import * as path from 'path';
import { GitHubClient } from './github-client';
import { calculateDeploymentFrequency } from './calculators/deployment-frequency';
import { calculateLeadTime } from './calculators/lead-time';
import { calculateChangeFailureRate } from './calculators/change-failure-rate';
import { calculateMTTR } from './calculators/mttr';
import { DORAMetrics, GitHubConfig } from './types';

/**
 * Calculate all DORA metrics
 *
 * @param client - GitHub API client
 * @returns Complete DORA metrics
 */
export async function calculateDORAMetrics(client: GitHubClient): Promise<DORAMetrics> {
  // Query data from GitHub (last 30 days)
  const since = new Date();
  since.setDate(since.getDate() - 30);

  console.log('📊 Fetching data from GitHub API...');
  const releases = await client.getReleases(since);
  console.log(`   ✓ Found ${releases.length} releases`);

  const commits = releases.length > 0
    ? await client.getCommits(releases[0].target_commitish, new Date())
    : [];
  console.log(`   ✓ Found ${commits.length} commits`);

  const issues = await client.getIssues(['incident', 'production-bug'], since);
  console.log(`   ✓ Found ${issues.length} incidents`);

  // Calculate metrics
  console.log('\n🔢 Calculating DORA metrics...');

  const deploymentFrequency = calculateDeploymentFrequency(releases);
  console.log(`   ✓ Deployment Frequency: ${deploymentFrequency.value} ${deploymentFrequency.unit} (${deploymentFrequency.tier})`);

  const leadTime = calculateLeadTime(releases, commits);
  console.log(`   ✓ Lead Time: ${leadTime.value} ${leadTime.unit} (${leadTime.tier})`);

  const changeFailureRate = calculateChangeFailureRate(releases, issues);
  console.log(`   ✓ Change Failure Rate: ${changeFailureRate.value}% (${changeFailureRate.tier})`);

  const mttr = calculateMTTR(issues);
  console.log(`   ✓ MTTR: ${mttr.value} ${mttr.unit} (${mttr.tier})`);

  return {
    timestamp: new Date().toISOString(),
    metrics: {
      deploymentFrequency,
      leadTime,
      changeFailureRate,
      mttr,
    },
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
    const metrics = await calculateDORAMetrics(client);

    // Write to file
    const outputPath = path.join(process.cwd(), 'metrics', 'dora-latest.json');
    writeMetricsJSON(metrics, outputPath);

    console.log('\n🎉 DORA metrics calculation complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error calculating DORA metrics:');
    console.error(error);
    process.exit(1);
  }
}

// ESM module entry point (always run when executed)
main();
