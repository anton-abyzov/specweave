#!/usr/bin/env npx tsx
/**
 * Pipeline Verification Script
 *
 * Exercises the entire discovery → fetch → scan pipeline against real APIs
 * and prints detailed evidence of each step.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SourceRegistry } from '../../src/core/fabric/discovery/source-registry.js';
import { GitHubProvider } from '../../src/core/fabric/discovery/github-provider.js';
import { SkillsShProvider } from '../../src/core/fabric/discovery/skillssh-provider.js';
import { NpmProvider } from '../../src/core/fabric/discovery/npm-provider.js';
import { ContentFetcher } from '../../src/core/fabric/discovery/content-fetcher.js';
import { ScanPipeline } from '../../src/core/fabric/discovery/scan-pipeline.js';
import { SubmissionQueue } from '../../src/core/fabric/submission-queue.js';
import type { GitHubRepoInfo } from '../../src/core/fabric/submission-queue-types.js';

const HR = '═'.repeat(70);
const hr = '─'.repeat(70);

async function main() {
  console.log(HR);
  console.log('  UNIVERSAL SKILL DISCOVERY PIPELINE — LIVE VERIFICATION');
  console.log(HR);

  // Setup temp project
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-verify-'));
  fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
  const queue = new SubmissionQueue(testDir);

  try {
    // === PHASE 1: Discovery ===
    console.log('\n▶ PHASE 1: DISCOVERY\n');

    // GitHub
    console.log('[GitHub Provider]');
    const ghProvider = new GitHubProvider({ maxResultsPerQuery: 5 });
    const ghRepos: GitHubRepoInfo[] = [];
    try {
      for await (const repo of ghProvider.discover()) {
        ghRepos.push(repo);
        if (ghRepos.length >= 5) break;
      }
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
    }
    console.log(`  Found: ${ghRepos.length} repos`);
    for (const r of ghRepos) {
      console.log(`    ★ ${r.stars.toString().padStart(5)} | ${r.fullName}`);
    }

    // skills.sh
    console.log('\n[skills.sh Provider]');
    const ssProvider = new SkillsShProvider();
    const ssRepos: GitHubRepoInfo[] = [];
    try {
      for await (const repo of ssProvider.discover()) {
        ssRepos.push(repo);
      }
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
    }
    console.log(`  Found: ${ssRepos.length} repos`);
    for (const r of ssRepos.slice(0, 10)) {
      console.log(`    • ${r.fullName}`);
    }
    if (ssRepos.length > 10) console.log(`    ... +${ssRepos.length - 10} more`);

    // npm
    console.log('\n[npm Provider]');
    const npmProvider = new NpmProvider();
    const npmRepos: GitHubRepoInfo[] = [];
    try {
      for await (const repo of npmProvider.discover()) {
        npmRepos.push(repo);
      }
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
    }
    console.log(`  Found: ${npmRepos.length} repos`);
    for (const r of npmRepos.slice(0, 10)) {
      console.log(`    📦 ${r.fullName} (${r.description?.slice(0, 50) || 'no description'})`);
    }
    if (npmRepos.length > 10) console.log(`    ... +${npmRepos.length - 10} more`);

    // Combined with dedup
    const allRepos = [...ghRepos, ...ssRepos, ...npmRepos];
    const unique = new Map<string, GitHubRepoInfo>();
    for (const r of allRepos) {
      if (!unique.has(r.fullName)) unique.set(r.fullName, r);
    }
    console.log(`\n${hr}`);
    console.log(`Discovery Total: ${allRepos.length} raw → ${unique.size} unique repos`);
    console.log(hr);

    // === PHASE 2: Content Fetching ===
    console.log('\n▶ PHASE 2: CONTENT FETCHING\n');
    const fetcher = new ContentFetcher();
    const targets = Array.from(unique.values()).slice(0, 5);

    for (const repo of targets) {
      const content = await fetcher.fetchSkillContent(repo.fullName, repo.skillPath);
      if (content) {
        console.log(`  ✓ ${repo.fullName} — ${content.length} bytes`);
        // Show first line of frontmatter
        const nameMatch = content.match(/name:\s*(.+)/);
        if (nameMatch) console.log(`    name: ${nameMatch[1]}`);
      } else {
        console.log(`  ✗ ${repo.fullName} — SKILL.md not found`);
      }
    }

    // === PHASE 3: Security Scanning Pipeline ===
    console.log('\n▶ PHASE 3: FULL SCAN PIPELINE\n');
    const pipeline = new ScanPipeline(queue);

    const scanTargets = Array.from(unique.values()).slice(0, 8);
    const results: Array<{
      repo: string;
      status: string;
      score: number | string;
      findings: number | string;
      contentLen: number | string;
    }> = [];

    for (const repo of scanTargets) {
      const sub = queue.addSubmission(repo);
      queue.updateStatus(sub.id, 'queued');
      queue.updateStatus(sub.id, 'scanning');

      const result = await pipeline.scanSubmission(sub.id);
      results.push({
        repo: repo.fullName,
        status: result?.status ?? 'error',
        score: result?.tier1Result?.score ?? '-',
        findings: result?.tier1Result?.findings ?? '-',
        contentLen: result?.skillContent?.length ?? 0,
      });
    }

    // Print results table
    console.log('  ' + hr);
    console.log('  ' + 'Repo'.padEnd(35) + 'Status'.padEnd(16) + 'Score'.padEnd(8) + 'Findings'.padEnd(10) + 'Content');
    console.log('  ' + hr);
    for (const r of results) {
      const statusIcon = r.status === 'tier1_passed' ? '✓' : r.status === 'tier1_failed' ? '✗' : '?';
      console.log(`  ${statusIcon} ${r.repo.padEnd(33)}${r.status.padEnd(16)}${String(r.score).padEnd(8)}${String(r.findings).padEnd(10)}${r.contentLen}b`);
    }
    console.log('  ' + hr);

    const passed = results.filter(r => r.status === 'tier1_passed').length;
    const failed = results.filter(r => r.status === 'tier1_failed').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`\n  PIPELINE SUMMARY:`);
    console.log(`    Scanned:     ${results.length}`);
    console.log(`    Passed:      ${passed}`);
    console.log(`    Failed:      ${failed}`);
    console.log(`    Errors:      ${errors}`);

    // === PHASE 4: Queue State ===
    console.log('\n▶ PHASE 4: FINAL QUEUE STATE\n');
    const allSubs = queue.getSubmissions({});
    console.log(`  Total submissions: ${allSubs.total}`);
    const byStatus: Record<string, number> = {};
    for (const s of allSubs.items) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    }
    for (const [status, count] of Object.entries(byStatus).sort()) {
      console.log(`    ${status}: ${count}`);
    }

    // Insights
    const insights = queue.getInsights();
    console.log(`\n  Insights:`);
    console.log(`    Tier 1 pass rate: ${insights.tier1PassRate}%`);

    console.log(`\n${HR}`);
    console.log('  VERIFICATION COMPLETE');
    console.log(HR);

  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
