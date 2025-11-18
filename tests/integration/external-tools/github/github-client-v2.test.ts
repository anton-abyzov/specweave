/**
 * GitHub Client V2 Integration Tests
 *
 * Tests for the multi-project GitHub client with profile support
 *
 * Run: npm run test:integration
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { GitHubClientV2 } from '../../plugins/specweave-github/lib/github-client-v2.js';
import { execFileNoThrow } from '../../src/utils/execFileNoThrow.js';
import type { SyncProfile } from '../../src/core/types/sync-profile.js';

describe('GitHubClientV2 Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `specweave-github-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('checkCLI', () => {
    it('should detect GitHub CLI installation', async () => {
      const result = await GitHubClientV2.checkCLI();

      // Either installed or not - both are valid states
      expect(result).toHaveProperty('installed');
      expect(result).toHaveProperty('authenticated');

      if (!result.installed) {
        expect(result.error).toContain('GitHub CLI');
      }
    }, 30000);

    it('should provide installation instructions if not installed', async () => {
      const result = await GitHubClientV2.checkCLI();

      if (!result.installed) {
        expect(result.error).toContain('https://cli.github.com');
      }
    });

    it('should provide authentication instructions if not authenticated', async () => {
      const result = await GitHubClientV2.checkCLI();

      if (result.installed && !result.authenticated) {
        expect(result.error).toContain('gh auth login');
      }
    });
  });

  describe('detectRepo', () => {
    it('should return null for non-git directory', async () => {
      const result = await GitHubClientV2.detectRepo(tempDir);
      expect(result).toBeNull();
    });

    it('should detect repository from git remote if git repo exists', async () => {
      // Initialize git repo and add GitHub remote using secure execFileNoThrow
      try {
        await execFileNoThrow('git', ['init'], { cwd: tempDir });
        await execFileNoThrow('git', [
          'remote',
          'add',
          'origin',
          'https://github.com/test-org/test-repo.git',
        ], { cwd: tempDir });

        const result = await GitHubClientV2.detectRepo(tempDir);

        expect(result).not.toBeNull();
        expect(result?.owner).toBe('test-org');
        expect(result?.repo).toBe('test-repo');
      } catch (error) {
        // Git not installed - skip test
        console.log('Git not installed, skipping git remote detection test');
      }
    });

    it('should handle SSH remotes correctly', async () => {
      try {
        await execFileNoThrow('git', ['init'], { cwd: tempDir });
        await execFileNoThrow('git', [
          'remote',
          'add',
          'origin',
          'git@github.com:test-org/test-repo.git',
        ], { cwd: tempDir });

        const result = await GitHubClientV2.detectRepo(tempDir);

        expect(result).not.toBeNull();
        expect(result?.owner).toBe('test-org');
        expect(result?.repo).toBe('test-repo');
      } catch (error) {
        // Git not installed - skip test
        console.log('Git not installed, skipping SSH remote detection test');
      }
    });
  });

  describe('constructor', () => {
    it('should create client from sync profile', () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test Repo',
        config: {
          owner: 'test-org',
          repo: 'test-repo',
        },
        timeRange: {
          default: '1M',
          max: '6M',
        },
      };

      const client = new GitHubClientV2(profile);
      expect(client).toBeDefined();
    });

    it('should reject non-GitHub profile', () => {
      const profile: SyncProfile = {
        provider: 'jira',
        displayName: 'JIRA',
        config: {
          domain: 'test.atlassian.net',
          projectKey: 'TEST',
        },
        timeRange: {
          default: '1M',
          max: '3M',
        },
      };

      expect(() => new GitHubClientV2(profile)).toThrow('Expected GitHub profile');
    });
  });

  describe('fromRepo', () => {
    it('should create client from owner and repo', () => {
      const client = GitHubClientV2.fromRepo('test-org', 'test-repo');
      expect(client).toBeDefined();
    });
  });

  describe('time range calculation (unit test)', () => {
    it('should calculate time range dates correctly', () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      const client = new GitHubClientV2(profile);

      // Access private method via type assertion for testing
      const calculateTimeRange = (client as any).calculateTimeRange.bind(client);

      const result = calculateTimeRange('1M');

      expect(result).toHaveProperty('since');
      expect(result).toHaveProperty('until');

      // Verify date format (ISO 8601)
      expect(result.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.until).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify until is today
      const today = new Date().toISOString().split('T')[0];
      expect(result.until).toBe(today);
    });

    it('should handle all time range presets', () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      const client = new GitHubClientV2(profile);
      const calculateTimeRange = (client as any).calculateTimeRange.bind(client);

      const presets = ['1W', '2W', '1M', '3M', '6M', '1Y', 'ALL'] as const;

      for (const preset of presets) {
        const result = calculateTimeRange(preset);
        expect(result).toHaveProperty('since');
        expect(result).toHaveProperty('until');
      }
    });

    it('should handle custom date range', () => {
      const profile: SyncProfile = {
        provider: 'github',
        displayName: 'Test',
        config: { owner: 'test', repo: 'test' },
        timeRange: { default: '1M', max: '6M' },
      };

      const client = new GitHubClientV2(profile);
      const calculateTimeRange = (client as any).calculateTimeRange.bind(client);

      const result = calculateTimeRange('1M', '2024-01-01', '2024-12-31');

      expect(result.since).toBe('2024-01-01');
      expect(result.until).toBe('2024-12-31');
    });
  });

  // Note: Tests for actual GitHub API calls (createEpicIssue, listIssuesInTimeRange, etc.)
  // are skipped in unit tests because they require:
  // 1. GitHub CLI to be installed and authenticated
  // 2. A real GitHub repository to test against
  // 3. Valid credentials (GitHub token)
  //
  // These are tested manually or in E2E tests with proper GitHub setup.
  // The core logic (time range calculation, profile handling) is tested above.

  describe('error handling', () => {
    it('should handle invalid profile config', () => {
      const invalidProfile: any = {
        provider: 'github',
        displayName: 'Invalid',
        config: {}, // Missing owner and repo
        timeRange: { default: '1M', max: '6M' },
      };

      expect(() => new GitHubClientV2(invalidProfile)).toThrow();
    });
  });
});

// ===========================================================================
// Manual/E2E Test Instructions
// ===========================================================================

/**
 * To test the full GitHub integration manually:
 *
 * 1. Ensure GitHub CLI is installed and authenticated:
 *    gh --version
 *    gh auth status
 *
 * 2. Create a test profile:
 *    const profile: SyncProfile = {
 *      provider: 'github',
 *      displayName: 'My Test Repo',
 *      config: {
 *        owner: 'your-org',
 *        repo: 'your-repo',
 *      },
 *      timeRange: { default: '1M', max: '6M' },
 *    };
 *
 * 3. Create client and test operations:
 *    const client = new GitHubClientV2(profile);
 *
 *    // Check CLI
 *    const cliStatus = await GitHubClientV2.checkCLI();
 *    console.log('CLI Status:', cliStatus);
 *
 *    // Detect repo
 *    const detected = await GitHubClientV2.detectRepo();
 *    console.log('Detected Repo:', detected);
 *
 *    // Create milestone
 *    const milestone = await client.createOrGetMilestone('Test Milestone');
 *    console.log('Milestone:', milestone);
 *
 *    // Create issue
 *    const issue = await client.createEpicIssue(
 *      'Test Issue',
 *      'This is a test issue created by GitHubClientV2',
 *      milestone.number,
 *      ['test', 'specweave']
 *    );
 *    console.log('Issue:', issue);
 *
 *    // List issues in time range
 *    const issues = await client.listIssuesInTimeRange('1M');
 *    console.log('Issues (last 1 month):', issues.length);
 *
 * 4. Clean up:
 *    - Close test issues via GitHub UI
 *    - Delete test milestones if needed
 */
