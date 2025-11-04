/**
 * GitHub Sync Integration Tests
 *
 * Tests for the specweave-github plugin integration
 *
 * Run: npm run test:integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import {
  getGitHubAuth,
  hasGitHubCredentials,
  shouldRunIntegrationTests,
  getCredentialStatus
} from '../../helpers/auth';

// Load .env file
dotenv.config();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  message?: string;
  details?: any;
}

class GithubSyncTest {
  private results: TestResult[] = [];
  private githubAuth = getGitHubAuth();
  private hasCredentials = hasGitHubCredentials();
  private runIntegrationTests = shouldRunIntegrationTests();

  constructor() {}

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      GitHub Sync Integration Tests                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Display credential status
    const status = getCredentialStatus();
    console.log('📊 Credential Status:');
    console.log(`   GitHub: ${status.github}`);
    console.log(`   Integration Tests: ${status.integrationTestsEnabled ? '✅ Enabled' : '⏭️  Disabled'}\n`);

    try {
      await this.test1_checkGhCliInstalled();
      await this.test2_verifyGitHubAuth();
      await this.test3_createTestIssue();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.generateReport();
    }
  }

  private async test1_checkGhCliInstalled(): Promise<void> {
    const testName = 'Test 1: Check gh CLI Installed';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Check if gh CLI is installed (safe - no user input)
      const result = await execFileNoThrow('gh', ['--version']);

      if (!result.success) {
        throw new Error('gh CLI not installed');
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `gh CLI installed: ${result.stdout.split('\n')[0]}`
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: 'gh CLI not installed. Install via: https://cli.github.com/'
      });
      console.log(`❌ FAIL: gh CLI not installed\n`);
    }
  }

  private async test2_verifyGitHubAuth(): Promise<void> {
    const testName = 'Test 2: Verify GitHub Authentication';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No GitHub credentials found. Set GH_TOKEN in .env or run: gh auth login'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      // Try to get authenticated user
      let username: string;
      if (this.githubAuth.source === 'gh-cli') {
        // Use gh CLI (safe - no user input)
        const result = await execFileNoThrow('gh', ['api', 'user', '-q', '.login']);
        if (!result.success) {
          throw new Error('gh CLI authentication failed');
        }
        username = result.stdout.trim();
      } else {
        // Use token directly via API
        const response = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${this.githubAuth.token}`,
            'Accept': 'application/vnd.github+json'
          }
        });

        if (!response.ok) {
          throw new Error(`GitHub API returned ${response.status}`);
        }

        const data = await response.json();
        username = data.login;
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Authenticated as: ${username} (via ${this.githubAuth.source})`
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Authentication failed: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test3_createTestIssue(): Promise<void> {
    const testName = 'Test 3: Create Test Issue (Integration)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if no credentials or integration tests disabled
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No GitHub credentials. Set GH_TOKEN in .env or run: gh auth login'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      if (!this.runIntegrationTests) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'Integration tests disabled. Set RUN_INTEGRATION_TESTS=true to enable'
        });
        console.log('⏭️  SKIP: Integration tests disabled\n');
        return;
      }

      // Get current repo (if in a git repo)
      const remoteResult = await execFileNoThrow('git', [
        'config',
        '--get',
        'remote.origin.url'
      ]);

      if (!remoteResult.success) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'Not in a git repository'
        });
        console.log('⏭️  SKIP: Not in a git repository\n');
        return;
      }

      // Parse repo from URL (works for both HTTPS and SSH)
      const remote = remoteResult.stdout.trim();
      const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
      if (!match) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'Not a GitHub repository'
        });
        console.log('⏭️  SKIP: Not a GitHub repository\n');
        return;
      }

      const repo = match[1];
      console.log(`   Repository: ${repo}`);

      // Create test issue (using gh CLI for simplicity)
      const issueTitle = `[Test] SpecWeave Integration Test ${new Date().toISOString()}`;
      const issueBody = 'This is an automated test issue from SpecWeave integration tests. Safe to close.';

      const createResult = await execFileNoThrow('gh', [
        'issue',
        'create',
        '--title',
        issueTitle,
        '--body',
        issueBody,
        '--label',
        'test'
      ]);

      if (!createResult.success) {
        throw new Error(`Failed to create issue: ${createResult.stderr}`);
      }

      const issueUrl = createResult.stdout.trim();
      const issueNumber = issueUrl.match(/\/(\d+)$/)?.[1];

      // Close the test issue immediately
      if (issueNumber) {
        await execFileNoThrow('gh', [
          'issue',
          'close',
          issueNumber,
          '--comment',
          'Test completed successfully'
        ]);
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Created and closed test issue: ${issueUrl}`,
        details: { issueUrl, issueNumber }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to create test issue: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                      Test Results Summary                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}\n`);

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️ ';
      console.log(`${icon} ${result.name} (${result.duration}ms)`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
    });

    // Save report
    const resultsDir = path.join(process.cwd(), 'test-results', 'github-sync');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `github-sync-${timestamp}.json`);

    const report = {
      suite: 'GitHub Sync Integration Tests',
      timestamp: new Date().toISOString(),
      credentialStatus: getCredentialStatus(),
      summary: { total, passed, failed, skipped },
      results: this.results
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Report saved to: ${reportPath}`);

    // Exit with error if tests failed
    if (failed > 0) {
      process.exit(1);
    }
  }
}

export { GithubSyncTest };

// Run tests if called directly
const isMainModule = process.argv[1] === new URL(import.meta.url).pathname;
if (isMainModule) {
  const test = new GithubSyncTest();
  test.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}
