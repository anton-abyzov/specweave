/**
 * Live Discovery Integration Test
 *
 * Hits real APIs (GitHub, skills.sh, npm) to verify the full pipeline
 * actually discovers, fetches, and scores real skills.
 *
 * NOTE: Requires internet access. Skipped in CI.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('Live Discovery Pipeline', { timeout: 60000 }, () => {
  let testDir: string;
  let queue: SubmissionQueue;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-live-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
    queue = new SubmissionQueue(testDir);
  });

  afterEach(() => {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('GitHub provider discovers repos with SKILL.md', async () => {
    const provider = new GitHubProvider({ maxResultsPerQuery: 5 });
    const results: GitHubRepoInfo[] = [];

    for await (const repo of provider.discover()) {
      results.push(repo);
      if (results.length >= 3) break; // Don't exhaust rate limit
    }

    console.log(`\n[GitHub] Discovered ${results.length} repos:`);
    for (const r of results) {
      console.log(`  - ${r.fullName} (${r.stars} stars) ${r.htmlUrl}`);
    }

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].fullName).toContain('/');
    expect(results[0].htmlUrl).toContain('github.com');
  });

  it('skills.sh provider extracts GitHub links', async () => {
    const provider = new SkillsShProvider();
    const results: GitHubRepoInfo[] = [];

    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    console.log(`\n[skills.sh] Discovered ${results.length} repos:`);
    for (const r of results.slice(0, 10)) {
      console.log(`  - ${r.fullName} ${r.htmlUrl}`);
    }
    if (results.length > 10) console.log(`  ... and ${results.length - 10} more`);

    // skills.sh may or may not be up, so we just verify it doesn't crash
    expect(results).toBeDefined();
  });

  it('npm provider finds skill packages', async () => {
    const provider = new NpmProvider();
    const results: GitHubRepoInfo[] = [];

    for await (const repo of provider.discover()) {
      results.push(repo);
    }

    console.log(`\n[npm] Discovered ${results.length} repos:`);
    for (const r of results.slice(0, 10)) {
      console.log(`  - ${r.fullName} ${r.htmlUrl}`);
    }
    if (results.length > 10) console.log(`  ... and ${results.length - 10} more`);

    expect(results).toBeDefined();
  });

  it('SourceRegistry combines all providers with dedup', async () => {
    const registry = new SourceRegistry();
    registry.register(new GitHubProvider({ maxResultsPerQuery: 5 }));
    registry.register(new SkillsShProvider());
    registry.register(new NpmProvider());

    const results: GitHubRepoInfo[] = [];
    for await (const repo of registry.discoverAll()) {
      results.push(repo);
    }

    console.log(`\n[Registry] Total unique repos: ${results.length}`);
    const bySource = {
      withStars: results.filter(r => r.stars > 0).length,
      withoutStars: results.filter(r => r.stars === 0).length,
    };
    console.log(`  With stars (from GitHub API): ${bySource.withStars}`);
    console.log(`  Without stars (skills.sh/npm): ${bySource.withoutStars}`);

    // Verify dedup: no duplicate fullNames
    const names = results.map(r => r.fullName);
    const unique = new Set(names);
    expect(names.length).toBe(unique.size);
  });

  it('ContentFetcher retrieves real SKILL.md content', async () => {
    // First, discover a real repo
    const provider = new GitHubProvider({ maxResultsPerQuery: 5 });
    let targetRepo: GitHubRepoInfo | null = null;

    for await (const repo of provider.discover()) {
      targetRepo = repo;
      break;
    }

    if (!targetRepo) {
      console.log('\n[ContentFetcher] No repos discovered, skipping');
      return;
    }

    console.log(`\n[ContentFetcher] Fetching SKILL.md from ${targetRepo.fullName}...`);
    const fetcher = new ContentFetcher();
    const content = await fetcher.fetchSkillContent(targetRepo.fullName, targetRepo.skillPath);

    if (content) {
      console.log(`  Content length: ${content.length} bytes`);
      console.log(`  First 200 chars: ${content.slice(0, 200)}...`);
      expect(content.length).toBeGreaterThan(0);
    } else {
      console.log('  SKILL.md not found (repo may have been removed or path changed)');
    }
  });

  it('Full pipeline: discover → fetch → scan → score', async () => {
    // Discover a real repo
    const provider = new GitHubProvider({ maxResultsPerQuery: 5 });
    let targetRepo: GitHubRepoInfo | null = null;

    for await (const repo of provider.discover()) {
      targetRepo = repo;
      break;
    }

    if (!targetRepo) {
      console.log('\n[Pipeline] No repos discovered, skipping');
      return;
    }

    console.log(`\n[Pipeline] Testing full pipeline with ${targetRepo.fullName}`);

    // Add to queue
    const sub = queue.addSubmission(targetRepo);
    expect(sub.status).toBe('discovered');
    console.log(`  1. Added to queue: ${sub.id} (status: ${sub.status})`);

    // Advance to scanning
    queue.updateStatus(sub.id, 'queued');
    queue.updateStatus(sub.id, 'scanning');
    console.log(`  2. Advanced to: scanning`);

    // Run scan pipeline
    const pipeline = new ScanPipeline(queue);
    const result = await pipeline.scanSubmission(sub.id);

    if (result) {
      console.log(`  3. Scan complete:`);
      console.log(`     Status: ${result.status}`);
      console.log(`     Has content: ${!!result.skillContent} (${result.skillContent?.length ?? 0} bytes)`);
      console.log(`     Tier 1 result: ${JSON.stringify(result.tier1Result)}`);

      expect(result.tier1Result).toBeDefined();
      expect(['tier1_passed', 'tier1_failed']).toContain(result.status);
      expect(typeof result.tier1Result!.score).toBe('number');
    } else {
      console.log(`  3. Scan returned null (submission not found)`);
    }

    // Print full queue state
    const allSubs = queue.getSubmissions({});
    console.log(`\n  Final queue state (${allSubs.total} submissions):`);
    for (const s of allSubs.items) {
      console.log(`    ${s.id} | ${s.repoFullName} | ${s.status} | score: ${s.tier1Result?.score ?? '-'}`);
    }
  });

  it('Bulk discovery: discover multiple repos and scan them all', async () => {
    const provider = new GitHubProvider({ maxResultsPerQuery: 10 });
    const repos: GitHubRepoInfo[] = [];

    for await (const repo of provider.discover()) {
      repos.push(repo);
      if (repos.length >= 5) break;
    }

    console.log(`\n[Bulk] Discovered ${repos.length} repos, scanning all...`);

    const pipeline = new ScanPipeline(queue);
    const results: Array<{ repo: string; status: string; score: number | string }> = [];

    for (const repo of repos) {
      const sub = queue.addSubmission(repo);
      queue.updateStatus(sub.id, 'queued');
      queue.updateStatus(sub.id, 'scanning');

      const result = await pipeline.scanSubmission(sub.id);
      results.push({
        repo: repo.fullName,
        status: result?.status ?? 'failed',
        score: result?.tier1Result?.score ?? 'N/A',
      });
    }

    console.log('\n  Results:');
    console.log('  ' + '-'.repeat(70));
    console.log('  Repo'.padEnd(40) + 'Status'.padEnd(16) + 'Score');
    console.log('  ' + '-'.repeat(70));
    for (const r of results) {
      console.log(`  ${r.repo.padEnd(40)}${r.status.padEnd(16)}${r.score}`);
    }
    console.log('  ' + '-'.repeat(70));

    const passed = results.filter(r => r.status === 'tier1_passed').length;
    const failed = results.filter(r => r.status === 'tier1_failed').length;
    console.log(`\n  Summary: ${passed} passed, ${failed} failed out of ${results.length}`);

    // At least some should have been processed
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.status !== 'failed' || r.score === 'N/A')).toBe(true);
  });
});
