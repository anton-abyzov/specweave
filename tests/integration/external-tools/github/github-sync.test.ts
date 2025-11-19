/**
 * GitHub Sync Integration Tests
 *
 * Tests for the specweave-github plugin integration with MULTI-PROJECT support
 *
 * Run: npm run test:integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { execFileNoThrow } from '../../src/utils/execFileNoThrow.js';
import {
  getGitHubAuth,
  hasGitHubCredentials,
  shouldRunIntegrationTests,
  getCredentialStatus
} from '../../helpers/auth.js';
import { findProjectRoot } from '../../../test-utils/project-root.js';

// ✅ SAFE: Find project root from test file location, not process.cwd()
const projectRoot = findProjectRoot(import.meta.url);

// Load .env file
dotenv.config();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  message?: string;
  details?: any;
}

interface SyncProfile {
  id: string;
  repo: string;
  owner: string;
  displayName: string;
}

class GithubSyncTest {
  private results: TestResult[] = [];
  private githubAuth = getGitHubAuth();
  private hasCredentials = hasGitHubCredentials();
  private runIntegrationTests = shouldRunIntegrationTests();

  // Multi-project sync profiles (at least 2)
  private syncProfiles: SyncProfile[] = [];
  private createdIssues: Array<{ profile: string; issueNumber: string; issueUrl: string }> = [];

  constructor() {
    // Initialize sync profiles from environment or use test repos
    this.initializeSyncProfiles();
  }

  private initializeSyncProfiles(): void {
    // Profile 1: Primary repo (from git remote or env)
    const primaryRepo = process.env.GITHUB_TEST_REPO_1 || 'specweave';
    const primaryOwner = process.env.GITHUB_TEST_OWNER_1 || 'anton-abyzov';

    // Profile 2: Secondary repo (from env)
    const secondaryRepo = process.env.GITHUB_TEST_REPO_2 || 'specweave-test';
    const secondaryOwner = process.env.GITHUB_TEST_OWNER_2 || 'anton-abyzov';

    this.syncProfiles = [
      {
        id: 'project-1',
        repo: primaryRepo,
        owner: primaryOwner,
        displayName: `${primaryOwner}/${primaryRepo}`
      },
      {
        id: 'project-2',
        repo: secondaryRepo,
        owner: secondaryOwner,
        displayName: `${secondaryOwner}/${secondaryRepo}`
      }
    ];
  }

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      GitHub Sync Integration Tests (Multi-Project)           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Display credential status
    const status = getCredentialStatus();
    console.log('📊 Credential Status:');
    console.log(`   GitHub: ${status.github}`);
    console.log(`   Integration Tests: ${status.integrationTestsEnabled ? '✅ Enabled' : '⏭️  Disabled'}\n`);

    console.log('🔗 Sync Profiles:');
    this.syncProfiles.forEach((profile, idx) => {
      console.log(`   ${idx + 1}. ${profile.id} → ${profile.displayName}`);
    });
    console.log('');

    try {
      await this.test1_checkGhCliInstalled();
      await this.test2_verifyGitHubAuth();
      await this.test3_detectProjectId();
      await this.test4_validateSyncProfiles();
      await this.test5_createIssuesMultiProject();
      await this.test6_verifyBidirectionalSync();
      await this.test7_cleanupTestIssues();
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

  private async test3_detectProjectId(): Promise<void> {
    const testName = 'Test 3: Detect Project ID from Git Remote';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
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
      const httpsMatch = remote.match(/https?:\/\/[^\/]+\/[^\/]+\/([^\/\s]+?)(?:\.git)?$/);
      const sshMatch = remote.match(/git@[^:]+:[^\/]+\/([^\/\s]+?)(?:\.git)?$/);

      const match = httpsMatch || sshMatch;
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

      const detectedProjectId = match[1].toLowerCase();
      console.log(`   Git remote: ${remote}`);
      console.log(`   Detected project ID: ${detectedProjectId}\n`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Auto-detected project ID: ${detectedProjectId}`,
        details: { projectId: detectedProjectId, remote }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to detect project ID: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test4_validateSyncProfiles(): Promise<void> {
    const testName = 'Test 4: Validate Sync Profiles (Multi-Project)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No GitHub credentials'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      // Validate each sync profile
      const validationResults: Array<{ profile: string; valid: boolean; error?: string }> = [];

      for (const profile of this.syncProfiles) {
        try {
          // Check if repo is accessible
          const response = await fetch(`https://api.github.com/repos/${profile.owner}/${profile.repo}`, {
            headers: {
              'Authorization': `Bearer ${this.githubAuth.token}`,
              'Accept': 'application/vnd.github+json'
            }
          });

          if (response.ok) {
            validationResults.push({ profile: profile.displayName, valid: true });
            console.log(`   ✅ ${profile.displayName} - Accessible`);
          } else {
            validationResults.push({
              profile: profile.displayName,
              valid: false,
              error: `HTTP ${response.status}`
            });
            console.log(`   ❌ ${profile.displayName} - Not accessible (${response.status})`);
          }
        } catch (error: any) {
          validationResults.push({
            profile: profile.displayName,
            valid: false,
            error: error.message
          });
          console.log(`   ❌ ${profile.displayName} - Error: ${error.message}`);
        }
      }

      const validProfiles = validationResults.filter(r => r.valid).length;
      const totalProfiles = this.syncProfiles.length;

      this.results.push({
        name: testName,
        status: validProfiles >= 1 ? 'PASS' : 'FAIL', // At least 1 profile must be valid
        duration: Date.now() - start,
        message: `Validated ${validProfiles}/${totalProfiles} sync profiles`,
        details: validationResults
      });

      if (validProfiles >= 1) {
        console.log(`\n✅ PASS: ${validProfiles}/${totalProfiles} profiles valid\n`);
      } else {
        console.log(`\n❌ FAIL: No valid sync profiles\n`);
      }
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to validate profiles: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test5_createIssuesMultiProject(): Promise<void> {
    const testName = 'Test 5: Create Issues in Multiple Projects';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if no credentials or integration tests disabled
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No GitHub credentials'
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

      // Create test issue in each profile
      const issuesCreated: number[] = [];

      for (const profile of this.syncProfiles) {
        try {
          const issueTitle = `[Test] Multi-Project Sync Test - ${profile.id} - ${new Date().toISOString()}`;
          const issueBody = `This is an automated test issue from SpecWeave integration tests.\n\n**Project**: ${profile.id}\n**Profile**: ${profile.displayName}\n\nSafe to close.`;

          // Create issue using gh CLI
          const createResult = await execFileNoThrow('gh', [
            'issue',
            'create',
            '--repo',
            `${profile.owner}/${profile.repo}`,
            '--title',
            issueTitle,
            '--body',
            issueBody,
            '--label',
            'test,specweave'
          ]);

          if (createResult.success) {
            const issueUrl = createResult.stdout.trim();
            const issueNumber = issueUrl.match(/\/(\d+)$/)?.[1] || '';

            this.createdIssues.push({
              profile: profile.id,
              issueNumber,
              issueUrl
            });

            issuesCreated.push(1);
            console.log(`   ✅ ${profile.displayName}: Created issue #${issueNumber}`);
          } else {
            console.log(`   ⚠️  ${profile.displayName}: Failed to create issue (skipping)`);
          }
        } catch (error: any) {
          console.log(`   ⚠️  ${profile.displayName}: Error - ${error.message}`);
        }
      }

      const totalCreated = issuesCreated.length;
      const totalProfiles = this.syncProfiles.length;

      this.results.push({
        name: testName,
        status: totalCreated >= 1 ? 'PASS' : 'FAIL', // At least 1 issue must be created
        duration: Date.now() - start,
        message: `Created ${totalCreated}/${totalProfiles} test issues across projects`,
        details: this.createdIssues
      });

      if (totalCreated >= 1) {
        console.log(`\n✅ PASS: Created ${totalCreated}/${totalProfiles} issues\n`);
      } else {
        console.log(`\n❌ FAIL: No issues created\n`);
      }
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to create issues: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test6_verifyBidirectionalSync(): Promise<void> {
    const testName = 'Test 6: Verify Bidirectional Sync (Push + Pull)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (this.createdIssues.length === 0) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No test issues created'
        });
        console.log('⏭️  SKIP: No test issues\n');
        return;
      }

      // Test bidirectional sync for each created issue
      const syncResults: Array<{ profile: string; issue: string; pushed: boolean; pulled: boolean }> = [];

      for (const issue of this.createdIssues) {
        try {
          const profile = this.syncProfiles.find(p => p.id === issue.profile);
          if (!profile) continue;

          // 1. PUSH: Add comment (SpecWeave → GitHub)
          const commentBody = `✅ Task T-001: Integration test progress\n\nProgress: 50% complete (1/2 tasks)\n\nThis demonstrates bidirectional sync from SpecWeave → GitHub.`;

          const pushResult = await execFileNoThrow('gh', [
            'issue',
            'comment',
            issue.issueNumber,
            '--repo',
            `${profile.owner}/${profile.repo}`,
            '--body',
            commentBody
          ]);

          // 2. PULL: Retrieve issue to verify comment (GitHub → SpecWeave)
          const pullResult = await execFileNoThrow('gh', [
            'issue',
            'view',
            issue.issueNumber,
            '--repo',
            `${profile.owner}/${profile.repo}`,
            '--json',
            'comments'
          ]);

          let pulled = false;
          if (pullResult.success) {
            const data = JSON.parse(pullResult.stdout);
            pulled = data.comments && data.comments.length > 0;
          }

          syncResults.push({
            profile: profile.displayName,
            issue: issue.issueNumber,
            pushed: pushResult.success,
            pulled
          });

          const status = pushResult.success && pulled ? '✅' : '⚠️ ';
          console.log(`   ${status} ${profile.displayName} #${issue.issueNumber}: Push=${pushResult.success}, Pull=${pulled}`);
        } catch (error: any) {
          console.log(`   ⚠️  ${issue.profile} #${issue.issueNumber}: Error - ${error.message}`);
        }
      }

      const successfulSyncs = syncResults.filter(r => r.pushed && r.pulled).length;
      const totalSyncs = syncResults.length;

      this.results.push({
        name: testName,
        status: successfulSyncs >= 1 ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        message: `Verified bidirectional sync for ${successfulSyncs}/${totalSyncs} issues`,
        details: syncResults
      });

      if (successfulSyncs >= 1) {
        console.log(`\n✅ PASS: ${successfulSyncs}/${totalSyncs} bidirectional syncs verified\n`);
      } else {
        console.log(`\n❌ FAIL: No successful bidirectional syncs\n`);
      }
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to verify sync: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test7_cleanupTestIssues(): Promise<void> {
    const testName = 'Test 7: Cleanup Test Issues';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (this.createdIssues.length === 0) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No test issues to clean up'
        });
        console.log('⏭️  SKIP: No issues to clean up\n');
        return;
      }

      // Close each created issue
      const closedIssues: number[] = [];

      for (const issue of this.createdIssues) {
        try {
          const profile = this.syncProfiles.find(p => p.id === issue.profile);
          if (!profile) continue;

          const closeResult = await execFileNoThrow('gh', [
            'issue',
            'close',
            issue.issueNumber,
            '--repo',
            `${profile.owner}/${profile.repo}`,
            '--comment',
            'Test completed successfully - closing test issue'
          ]);

          if (closeResult.success) {
            closedIssues.push(1);
            console.log(`   ✅ Closed ${profile.displayName} #${issue.issueNumber}`);
          } else {
            console.log(`   ⚠️  Failed to close ${profile.displayName} #${issue.issueNumber}`);
          }
        } catch (error: any) {
          console.log(`   ⚠️  Error closing ${issue.profile} #${issue.issueNumber}: ${error.message}`);
        }
      }

      const totalClosed = closedIssues.length;
      const totalCreated = this.createdIssues.length;

      this.results.push({
        name: testName,
        status: 'PASS', // Always pass (cleanup is best-effort)
        duration: Date.now() - start,
        message: `Closed ${totalClosed}/${totalCreated} test issues`,
        details: { closed: totalClosed, total: totalCreated }
      });

      console.log(`\n✅ PASS: Cleanup complete (${totalClosed}/${totalCreated} closed)\n`);
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'PASS', // Cleanup failures don't fail the suite
        duration: Date.now() - start,
        message: `Cleanup completed with warnings: ${error.message}`
      });
      console.log(`⚠️  WARNING: ${error.message}\n`);
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
    const resultsDir = path.join(projectRoot, 'test-results', 'github-sync');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `github-sync-multiproject-${timestamp}.json`);

    const report = {
      suite: 'GitHub Sync Integration Tests (Multi-Project)',
      timestamp: new Date().toISOString(),
      credentialStatus: getCredentialStatus(),
      syncProfiles: this.syncProfiles,
      createdIssues: this.createdIssues,
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
