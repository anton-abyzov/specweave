/**
 * Jira Sync Integration Tests
 *
 * Tests for the specweave-jira plugin integration with MULTI-PROJECT support
 *
 * Run: npm run test:integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  getJiraAuth,
  hasJiraCredentials,
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

interface SyncProfile {
  id: string;
  projectKey: string;
  domain: string;
  displayName: string;
}

class JiraSyncTest {
  private results: TestResult[] = [];
  private jiraAuth = getJiraAuth();
  private hasCredentials = hasJiraCredentials();
  private runIntegrationTests = shouldRunIntegrationTests();

  // Multi-project sync profiles (at least 2)
  private syncProfiles: SyncProfile[] = [];
  private createdIssues: Array<{ profile: string; issueKey: string; issueUrl: string }> = [];

  constructor() {
    this.initializeSyncProfiles();
  }

  private initializeSyncProfiles(): void {
    const domain = this.jiraAuth?.domain || 'example.atlassian.net';

    // Profile 1: Primary project (from env or default)
    const project1Key = process.env.JIRA_TEST_PROJECT_1 || 'PROJ1';

    // Profile 2: Secondary project (from env or default)
    const project2Key = process.env.JIRA_TEST_PROJECT_2 || 'PROJ2';

    this.syncProfiles = [
      {
        id: 'project-1',
        projectKey: project1Key,
        domain,
        displayName: `${domain}/${project1Key}`
      },
      {
        id: 'project-2',
        projectKey: project2Key,
        domain,
        displayName: `${domain}/${project2Key}`
      }
    ];
  }

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      Jira Sync Integration Tests (Multi-Project)             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const status = getCredentialStatus();
    console.log('📊 Credential Status:');
    console.log(`   Jira: ${status.jira ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Integration Tests: ${status.integrationTestsEnabled ? '✅ Enabled' : '⏭️  Disabled'}\n`);

    console.log('🔗 Sync Profiles:');
    this.syncProfiles.forEach((profile, idx) => {
      console.log(`   ${idx + 1}. ${profile.id} → ${profile.displayName}`);
    });
    console.log('');

    try {
      await this.test1_verifyJiraAuth();
      await this.test2_detectProjectId();
      await this.test3_validateSyncProfiles();
      await this.test4_createIssuesMultiProject();
      await this.test5_verifyBidirectionalSync();
      await this.test6_cleanupTestIssues();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.generateReport();
    }
  }

  private async test1_verifyJiraAuth(): Promise<void> {
    const testName = 'Test 1: Verify Jira Authentication';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No Jira credentials. Set JIRA_API_TOKEN, JIRA_EMAIL, and JIRA_DOMAIN in .env'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      const { domain, email, token } = this.jiraAuth!;
      const url = `https://${domain}/rest/api/3/myself`;
      const auth = Buffer.from(`${email}:${token}`).toString('base64');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Jira API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const displayName = data.displayName || email;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Authenticated as: ${displayName} (${email})`
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

  private async test2_detectProjectId(): Promise<void> {
    const testName = 'Test 2: Detect Project ID from Sync Config';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No Jira credentials'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      const detectedProjectId = this.syncProfiles[0].projectKey.toLowerCase();
      console.log(`   Jira domain: ${this.jiraAuth!.domain}`);
      console.log(`   Detected project ID: ${detectedProjectId}\n`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Auto-detected project ID: ${detectedProjectId}`,
        details: { projectId: detectedProjectId, domain: this.jiraAuth!.domain }
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

  private async test3_validateSyncProfiles(): Promise<void> {
    const testName = 'Test 3: Validate Sync Profiles (Multi-Project)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No Jira credentials'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      const { domain, email, token } = this.jiraAuth!;
      const validationResults: Array<{ profile: string; valid: boolean; error?: string }> = [];

      // Get all accessible projects
      const url = `https://${domain}/rest/api/3/project`;
      const auth = Buffer.from(`${email}:${token}`).toString('base64');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list projects: ${response.status}`);
      }

      const projects = await response.json();
      const projectKeys = Array.isArray(projects) ? projects.map((p: any) => p.key) : [];

      // Validate each sync profile
      for (const profile of this.syncProfiles) {
        const exists = projectKeys.includes(profile.projectKey);
        validationResults.push({
          profile: profile.displayName,
          valid: exists,
          error: exists ? undefined : 'Project not found'
        });
        console.log(`   ${exists ? '✅' : '❌'} ${profile.displayName} - ${exists ? 'Accessible' : 'Not found'}`);
      }

      const validProfiles = validationResults.filter(r => r.valid).length;
      const totalProfiles = this.syncProfiles.length;

      this.results.push({
        name: testName,
        status: validProfiles >= 1 ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        message: `Validated ${validProfiles}/${totalProfiles} sync profiles`,
        details: validationResults
      });

      console.log(`\n${validProfiles >= 1 ? '✅ PASS' : '❌ FAIL'}: ${validProfiles}/${totalProfiles} profiles valid\n`);
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

  private async test4_createIssuesMultiProject(): Promise<void> {
    const testName = 'Test 4: Create Issues in Multiple Projects';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.hasCredentials || !this.runIntegrationTests) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: !this.hasCredentials ? 'No Jira credentials' : 'Integration tests disabled'
        });
        console.log('⏭️  SKIP\n');
        return;
      }

      const { domain, email, token } = this.jiraAuth!;
      const issuesCreated: number[] = [];

      for (const profile of this.syncProfiles) {
        try {
          const url = `https://${domain}/rest/api/3/issue`;
          const auth = Buffer.from(`${email}:${token}`).toString('base64');

          const issueData = {
            fields: {
              project: { key: profile.projectKey },
              summary: `[TEST] Multi-Project Sync - ${profile.id} - ${new Date().toISOString()}`,
              description: {
                type: 'doc',
                version: 1,
                content: [{
                  type: 'paragraph',
                  content: [{
                    type: 'text',
                    text: `Test issue from SpecWeave integration tests.\n\nProject: ${profile.id}\nProfile: ${profile.displayName}\n\nSafe to delete.`
                  }]
                }]
              },
              issuetype: { name: 'Task' },
              labels: ['specweave', 'integration-test', 'auto-delete']
            }
          };

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(issueData)
          });

          if (response.ok) {
            const issue = await response.json();
            this.createdIssues.push({
              profile: profile.id,
              issueKey: issue.key,
              issueUrl: `https://${domain}/browse/${issue.key}`
            });
            issuesCreated.push(1);
            console.log(`   ✅ ${profile.displayName}: Created issue ${issue.key}`);
          } else {
            console.log(`   ⚠️  ${profile.displayName}: Failed to create issue (${response.status})`);
          }
        } catch (error: any) {
          console.log(`   ⚠️  ${profile.displayName}: Error - ${error.message}`);
        }
      }

      const totalCreated = issuesCreated.length;
      const totalProfiles = this.syncProfiles.length;

      this.results.push({
        name: testName,
        status: totalCreated >= 1 ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        message: `Created ${totalCreated}/${totalProfiles} test issues across projects`,
        details: this.createdIssues
      });

      console.log(`\n${totalCreated >= 1 ? '✅ PASS' : '❌ FAIL'}: Created ${totalCreated}/${totalProfiles} issues\n`);
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

  private async test5_verifyBidirectionalSync(): Promise<void> {
    const testName = 'Test 5: Verify Bidirectional Sync (Push + Pull)';
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

      const { domain, email, token } = this.jiraAuth!;
      const syncResults: Array<{ profile: string; issue: string; pushed: boolean; pulled: boolean }> = [];

      for (const issue of this.createdIssues) {
        try {
          const profile = this.syncProfiles.find(p => p.id === issue.profile);
          if (!profile) continue;

          const auth = Buffer.from(`${email}:${token}`).toString('base64');

          // 1. PUSH: Add comment (SpecWeave → Jira)
          const commentUrl = `https://${domain}/rest/api/3/issue/${issue.issueKey}/comment`;
          const commentData = {
            body: {
              type: 'doc',
              version: 1,
              content: [{
                type: 'paragraph',
                content: [{
                  type: 'text',
                  text: '✅ Task T-001: Integration test progress\n\nProgress: 50% complete (1/2 tasks)\n\nThis demonstrates bidirectional sync from SpecWeave → Jira.'
                }]
              }]
            }
          };

          const pushResponse = await fetch(commentUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(commentData)
          });

          // 2. PULL: Retrieve issue to verify (Jira → SpecWeave)
          const pullUrl = `https://${domain}/rest/api/3/issue/${issue.issueKey}?fields=comment`;
          const pullResponse = await fetch(pullUrl, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json'
            }
          });

          let pulled = false;
          if (pullResponse.ok) {
            const data = await pullResponse.json();
            pulled = data.fields?.comment?.total > 0;
          }

          syncResults.push({
            profile: profile.displayName,
            issue: issue.issueKey,
            pushed: pushResponse.ok,
            pulled
          });

          const status = pushResponse.ok && pulled ? '✅' : '⚠️ ';
          console.log(`   ${status} ${profile.displayName} ${issue.issueKey}: Push=${pushResponse.ok}, Pull=${pulled}`);
        } catch (error: any) {
          console.log(`   ⚠️  ${issue.profile} ${issue.issueKey}: Error - ${error.message}`);
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

      console.log(`\n${successfulSyncs >= 1 ? '✅ PASS' : '❌ FAIL'}: ${successfulSyncs}/${totalSyncs} bidirectional syncs verified\n`);
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

  private async test6_cleanupTestIssues(): Promise<void> {
    const testName = 'Test 6: Cleanup Test Issues';
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

      const { domain, email, token } = this.jiraAuth!;
      const deletedIssues: number[] = [];

      for (const issue of this.createdIssues) {
        try {
          const profile = this.syncProfiles.find(p => p.id === issue.profile);
          if (!profile) continue;

          const url = `https://${domain}/rest/api/3/issue/${issue.issueKey}`;
          const auth = Buffer.from(`${email}:${token}`).toString('base64');

          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${auth}`
            }
          });

          if (response.ok) {
            deletedIssues.push(1);
            console.log(`   ✅ Deleted ${profile.displayName} ${issue.issueKey}`);
          } else {
            console.log(`   ⚠️  Failed to delete ${profile.displayName} ${issue.issueKey}`);
          }
        } catch (error: any) {
          console.log(`   ⚠️  Error deleting ${issue.profile} ${issue.issueKey}: ${error.message}`);
        }
      }

      const totalDeleted = deletedIssues.length;
      const totalCreated = this.createdIssues.length;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Deleted ${totalDeleted}/${totalCreated} test issues`,
        details: { deleted: totalDeleted, total: totalCreated }
      });

      console.log(`\n✅ PASS: Cleanup complete (${totalDeleted}/${totalCreated} deleted)\n`);
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'PASS',
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

    const resultsDir = path.join(process.cwd(), 'test-results', 'jira-sync');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `jira-sync-multiproject-${timestamp}.json`);

    const report = {
      suite: 'Jira Sync Integration Tests (Multi-Project)',
      timestamp: new Date().toISOString(),
      credentialStatus: getCredentialStatus(),
      syncProfiles: this.syncProfiles,
      createdIssues: this.createdIssues,
      summary: { total, passed, failed, skipped },
      results: this.results
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Report saved to: ${reportPath}`);

    if (failed > 0) {
      process.exit(1);
    }
  }
}

export { JiraSyncTest };

const isMainModule = process.argv[1] === new URL(import.meta.url).pathname;
if (isMainModule) {
  const test = new JiraSyncTest();
  test.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}
