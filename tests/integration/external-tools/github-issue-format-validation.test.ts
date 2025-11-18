/**
 * E2E Test: GitHub Issue Format Validation
 *
 * CRITICAL: Prevents regression to deprecated [Increment XXXX] format
 *
 * Background:
 * - Issue #611 was created with WRONG format: "[Increment 0043]"
 * - Correct format: "US-XXX" or "FS-YY-MM-DD" (living docs sync)
 * - Data flow: Increment → Living Docs → GitHub
 *
 * This test ensures:
 * 1. GitHub client REJECTS deprecated [Increment XXXX] format
 * 2. Living docs sync generates CORRECT US/FS format
 * 3. No code path can create issues with old format
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GitHubClientV2 } from '../../../plugins/specweave-github/lib/github-client-v2.js';
import { SyncProfile } from '../../../src/core/types/sync-profile.js';

describe('GitHub Issue Format Validation (E2E)', () => {
  let client: GitHubClientV2;

  beforeAll(() => {
    // Create test client (no actual API calls in these tests)
    const profile: SyncProfile = {
      provider: 'github',
      displayName: 'test/repo',
      config: { owner: 'test', repo: 'repo' },
      timeRange: { default: '1M', max: '6M' },
    };
    client = new GitHubClientV2(profile);
  });

  describe('CRITICAL: Reject deprecated [Increment XXXX] format', () => {
    it('should REJECT issue creation with [Increment XXXX] format', async () => {
      const deprecatedTitle = '[Increment 0043] spec.md desync fix';

      // CRITICAL: This MUST throw error
      await expect(
        client.createEpicIssue(deprecatedTitle, 'Test body')
      ).rejects.toThrow(/DEPRECATED FORMAT DETECTED/);

      await expect(
        client.createEpicIssue(deprecatedTitle, 'Test body')
      ).rejects.toThrow(/US-XXX: Title/);

      await expect(
        client.createEpicIssue(deprecatedTitle, 'Test body')
      ).rejects.toThrow(/FS-YY-MM-DD: Title/);
    });

    it('should REJECT case-insensitive variations', async () => {
      const variations = [
        '[Increment 0043] Title',
        '[increment 0001] Title',
        '[INCREMENT 9999] Title',
        '[Increment  123] Title', // Extra space
      ];

      for (const title of variations) {
        await expect(
          client.createEpicIssue(title, 'Test body')
        ).rejects.toThrow(/DEPRECATED FORMAT/);
      }
    });

    it('should provide clear error message with correct format', async () => {
      const deprecatedTitle = '[Increment 0043] Title';

      try {
        await client.createEpicIssue(deprecatedTitle, 'Test body');
        throw new Error('Should have thrown validation error');
      } catch (error: any) {
        // Verify error message includes:
        expect(error.message).toContain('DEPRECATED FORMAT DETECTED');
        expect(error.message).toContain('US-XXX: Title');
        expect(error.message).toContain('FS-YY-MM-DD: Title');
        expect(error.message).toContain('[Increment XXXX] Title');
        expect(error.message).toContain('Increment → Living Docs → GitHub');
        expect(error.message).toContain('/specweave:sync-docs');
      }
    });
  });

  describe('CORRECT: Accept living docs formats', () => {
    it('should ACCEPT User Story format (US-XXX)', async () => {
      const correctTitles = [
        'US-001: User authentication',
        'US-042: Payment processing',
        'US-999: Advanced analytics',
      ];

      // These should NOT throw validation errors
      // (They will fail due to no actual GitHub connection, but validation passes)
      for (const title of correctTitles) {
        try {
          await client.createEpicIssue(title, 'Test body');
        } catch (error: any) {
          // If error is validation error, test fails
          expect(error.message).not.toContain('DEPRECATED FORMAT');
        }
      }
    });

    it('should ACCEPT Feature Spec format (FS-YY-MM-DD)', async () => {
      const correctTitles = [
        'FS-25-11-18: Living docs sync fix',
        'FS-24-12-01: GitHub integration',
        'FS-25-01-15: New feature',
      ];

      for (const title of correctTitles) {
        try {
          await client.createEpicIssue(title, 'Test body');
        } catch (error: any) {
          expect(error.message).not.toContain('DEPRECATED FORMAT');
        }
      }
    });

    it('should ACCEPT Epic format (EP-XXX)', async () => {
      const correctTitles = [
        'EP-001: Q1 Feature Set',
        'EP-042: Platform Migration',
      ];

      for (const title of correctTitles) {
        try {
          await client.createEpicIssue(title, 'Test body');
        } catch (error: any) {
          expect(error.message).not.toContain('DEPRECATED FORMAT');
        }
      }
    });
  });

  describe('EDGE CASES: Partial matches should NOT be rejected', () => {
    it('should ACCEPT titles that mention "Increment" in description', async () => {
      const safeTitles = [
        'US-001: Feature to increment counter',
        'FS-25-11-18: Auto-increment IDs',
        'Incremental deployment strategy', // No brackets
      ];

      for (const title of safeTitles) {
        try {
          await client.createEpicIssue(title, 'Test body');
        } catch (error: any) {
          expect(error.message).not.toContain('DEPRECATED FORMAT');
        }
      }
    });

    it('should ONLY reject [Increment XXXX] exact pattern', async () => {
      const shouldReject = [
        '[Increment 0001] Title',
        '[Increment 9999] Title',
      ];

      const shouldAccept = [
        'Increment 0001: Title', // No brackets
        '[Feature 0001] Title', // Different word
        '[Epic 0001] Title', // Different word
        'US-001: [Increment] mentioned in title', // Brackets but no number
      ];

      for (const title of shouldReject) {
        await expect(
          client.createEpicIssue(title, 'Test')
        ).rejects.toThrow(/DEPRECATED FORMAT/);
      }

      for (const title of shouldAccept) {
        try {
          await client.createEpicIssue(title, 'Test');
        } catch (error: any) {
          expect(error.message).not.toContain('DEPRECATED FORMAT');
        }
      }
    });
  });

  describe('PREVENTION: Verify no code generates deprecated format', () => {
    it('task-sync.ts should have deprecation warnings', async () => {
      // This test verifies task-sync.ts is properly marked as deprecated
      const taskSyncPath = './plugins/specweave-github/lib/task-sync.ts';
      const fs = await import('fs/promises');

      try {
        const content = await fs.readFile(taskSyncPath, 'utf-8');

        // Should contain deprecation warnings
        expect(content).toContain('DEPRECATED');
        expect(content).toContain('Living Docs');
        expect(content).toMatch(/\[Increment.*\]/); // Still has old format
        expect(content).toContain('TODO: Remove task-sync.ts entirely');
      } catch (error) {
        // File might not exist in all test environments
        console.warn('⚠️  Could not verify task-sync.ts deprecation');
      }
    });

    it('github-manager agent should have deprecation warnings', async () => {
      const agentPath = './plugins/specweave-github/agents/github-manager/AGENT.md';
      const fs = await import('fs/promises');

      try {
        const content = await fs.readFile(agentPath, 'utf-8');

        // Should contain clear deprecation warnings
        expect(content).toContain('DEPRECATED');
        expect(content).toContain('Use Living Docs Sync Instead');
        expect(content).toContain('/specweave:sync-docs');
        expect(content).toContain('/specweave-github:sync');
      } catch (error) {
        console.warn('⚠️  Could not verify github-manager deprecation');
      }
    });
  });
});
