import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DashboardDataAggregator } from '../../../../../src/dashboard/server/data/dashboard-data-aggregator.js';

describe('DashboardDataAggregator — sync errors and gaps', () => {
  let tempDir: string;
  let aggregator: DashboardDataAggregator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aggregator-sync-'));
    fs.mkdirSync(path.join(tempDir, '.specweave', 'state'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.specweave', 'increments'), { recursive: true });
    aggregator = new DashboardDataAggregator(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getSyncErrors', () => {
    it('returns recent failure entries from audit log', async () => {
      const auditPath = path.join(tempDir, '.specweave', 'state', 'sync-audit.jsonl');
      const entries = [
        { timestamp: new Date().toISOString(), incrementId: '0499-test', provider: 'github', outcome: 'failure', error: 'Rate limit' },
        { timestamp: new Date().toISOString(), incrementId: '0499-test', provider: 'jira', outcome: 'success' },
        { timestamp: new Date().toISOString(), incrementId: '0499-test', provider: 'ado', outcome: 'failure', error: 'Timeout' },
      ];
      fs.writeFileSync(auditPath, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');

      const errors = await aggregator.getSyncErrors(24, 5);
      expect(errors).toHaveLength(2);
      expect(errors[0].provider).toBe('ado'); // most recent first
      expect(errors[1].provider).toBe('github');
    });

    it('limits results to specified count', async () => {
      const auditPath = path.join(tempDir, '.specweave', 'state', 'sync-audit.jsonl');
      const entries = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        incrementId: '0499-test',
        provider: 'github',
        outcome: 'failure',
        error: `Error ${i}`,
      }));
      fs.writeFileSync(auditPath, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');

      const errors = await aggregator.getSyncErrors(24, 5);
      expect(errors).toHaveLength(5);
    });

    it('returns empty array when no audit file exists', async () => {
      const errors = await aggregator.getSyncErrors();
      expect(errors).toEqual([]);
    });
  });

  describe('getSyncGaps', () => {
    it('detects missing providers', async () => {
      // Config with github and jira configured
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        hooks: { post_increment_done: { sync_to_github_project: true } },
        sync: { jira: { domain: 'test.atlassian.net', projectKey: 'TEST' } },
      }));

      // Increment with only github synced
      const incDir = path.join(tempDir, '.specweave', 'increments', '0499-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({
        id: '0499-test',
        status: 'active',
        externalLinks: { github: { milestone: 1 } },
      }));

      const gaps = await aggregator.getSyncGaps();
      expect(gaps).toHaveLength(1);
      expect(gaps[0].incrementId).toBe('0499-test');
      expect(gaps[0].syncedProviders).toContain('github');
      expect(gaps[0].missingProviders).toContain('jira');
    });

    it('returns empty when all providers are synced', async () => {
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        hooks: { post_increment_done: { sync_to_github_project: true } },
      }));

      const incDir = path.join(tempDir, '.specweave', 'increments', '0499-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({
        id: '0499-test',
        status: 'active',
        externalLinks: { github: { milestone: 1 } },
      }));

      const gaps = await aggregator.getSyncGaps();
      expect(gaps).toEqual([]);
    });

    it('returns empty when no config exists', async () => {
      const gaps = await aggregator.getSyncGaps();
      expect(gaps).toEqual([]);
    });

    it('skips non-active increments', async () => {
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        hooks: { post_increment_done: { sync_to_github_project: true } },
      }));

      const incDir = path.join(tempDir, '.specweave', 'increments', '0499-test');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), JSON.stringify({
        id: '0499-test',
        status: 'completed', // not active
        externalLinks: {},
      }));

      const gaps = await aggregator.getSyncGaps();
      expect(gaps).toEqual([]);
    });
  });
});
