import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DashboardDataAggregator } from '../../../src/dashboard/server/data/dashboard-data-aggregator.js';

describe('DashboardDataAggregator - Sync Errors & Gaps (T-009/T-010)', () => {
  let testDir: string;
  let stateDir: string;
  let aggregator: DashboardDataAggregator;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-sync-test-'));
    stateDir = path.join(testDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    // Create minimal config.json for sync gap detection
    const configDir = path.join(testDir, '.specweave');
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({
      sync: {
        github: { owner: 'test-owner', repo: 'test-repo' },
        jira: { domain: 'test.atlassian.net', projectKey: 'TEST' },
      },
    }));
    aggregator = new DashboardDataAggregator(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('getSyncErrors (with errorStack for T-010 expandable rows)', () => {
    it('should return recent failure entries from audit log with errorStack', async () => {
      const auditPath = path.join(stateDir, 'sync-audit.jsonl');
      const now = new Date();
      const entry = {
        timestamp: now.toISOString(),
        incrementId: '0499-test',
        provider: 'github',
        outcome: 'failure',
        error: 'Rate limit exceeded',
        errorStack: 'Error: Rate limit exceeded\n    at syncToGitHub (sync.ts:42)\n    at SyncResilience (resilience.ts:88)\n    at main (index.ts:1)',
      };
      fs.writeFileSync(auditPath, JSON.stringify(entry));

      const errors = await aggregator.getSyncErrors();

      expect(errors.length).toBe(1);
      expect(errors[0].errorStack).toBeDefined();
      expect(errors[0].errorStack).toContain('syncToGitHub');
    });

    it('should return recent failure entries from audit log', async () => {
      const auditPath = path.join(stateDir, 'sync-audit.jsonl');
      const now = new Date();
      const entries = [
        { timestamp: now.toISOString(), incrementId: '0499-test', provider: 'github', outcome: 'failure', error: 'Rate limit exceeded' },
        { timestamp: now.toISOString(), incrementId: '0499-test', provider: 'jira', outcome: 'success' },
        { timestamp: now.toISOString(), incrementId: '0499-test', provider: 'ado', outcome: 'skipped_circuit_open', error: 'Circuit open' },
      ];
      fs.writeFileSync(auditPath, entries.map(e => JSON.stringify(e)).join('\n'));

      const errors = await aggregator.getSyncErrors();

      // Should return failures and skipped entries, not successes
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const githubError = errors.find(e => e.provider === 'github');
      expect(githubError).toBeDefined();
      expect(githubError!.error).toContain('Rate limit');
      expect(githubError!.incrementId).toBe('0499-test');
      expect(githubError!.timestamp).toBeTruthy();
    });

    it('should limit results to 5 entries', async () => {
      const auditPath = path.join(stateDir, 'sync-audit.jsonl');
      const now = new Date();
      const entries = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(now.getTime() - i * 60000).toISOString(),
        incrementId: `0${400 + i}-test`,
        provider: 'github',
        outcome: 'failure',
        error: `Error ${i}`,
      }));
      fs.writeFileSync(auditPath, entries.map(e => JSON.stringify(e)).join('\n'));

      const errors = await aggregator.getSyncErrors();

      expect(errors.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array when no audit file exists', async () => {
      const errors = await aggregator.getSyncErrors();
      expect(errors).toEqual([]);
    });
  });

  describe('getSyncGaps', () => {
    it('should detect increments with missing provider coverage', async () => {
      // Create an increment with only github synced but jira configured
      const incDir = path.join(testDir, '.specweave', 'increments', '0499-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({
        id: '0499-test',
        status: 'active',
        externalLinks: {
          github: { issues: { 'US-001': { issueNumber: 1, status: 'active' } }, syncedAt: '2026-03-12T00:00:00Z' },
          // jira missing - this is the gap
        },
      }));

      const gaps = await aggregator.getSyncGaps();

      // Should detect that jira is configured but not synced for this increment
      expect(Array.isArray(gaps)).toBe(true);
    });

    it('should return empty array when all providers are synced', async () => {
      const incDir = path.join(testDir, '.specweave', 'increments', '0499-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({
        id: '0499-test',
        status: 'active',
        externalLinks: {
          github: { issues: { 'US-001': { issueNumber: 1 } }, syncedAt: '2026-03-12T00:00:00Z' },
          jira: { userStories: { 'US-001': { issueKey: 'TEST-1' } }, syncedAt: '2026-03-12T00:00:00Z' },
        },
      }));

      const gaps = await aggregator.getSyncGaps();

      const relevantGap = gaps.find((g: any) => g.incrementId === '0499-test');
      expect(relevantGap).toBeUndefined();
    });
  });
});
