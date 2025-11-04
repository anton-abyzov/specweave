/**
 * Jira Sync Integration Tests
 *
 * Tests for the specweave-jira plugin integration
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

class JiraSyncTest {
  private results: TestResult[] = [];
  private jiraAuth = getJiraAuth();
  private hasCredentials = hasJiraCredentials();
  private runIntegrationTests = shouldRunIntegrationTests();
  private testIssueKey?: string; // Store for cleanup
  private testProjectKey?: string; // Store project key

  constructor() {}

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      Jira Sync Integration Tests                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Display credential status
    const status = getCredentialStatus();
    console.log('📊 Credential Status:');
    console.log(`   Jira: ${status.jira ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Integration Tests: ${status.integrationTestsEnabled ? '✅ Enabled' : '⏭️  Disabled'}\n`);

    try {
      await this.test1_verifyJiraAuth();
      await this.test2_listProjects();
      await this.test3_queryIssues();
      await this.test4_createIssue();
      await this.test5_addComment();
      await this.test6_getAndDeleteIssue();
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

      // Test authentication by fetching current user
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

  private async test2_listProjects(): Promise<void> {
    const testName = 'Test 2: List Jira Projects';
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

      // List accessible projects
      const url = `https://${domain}/rest/api/3/project`;
      const auth = Buffer.from(`${email}:${token}`).toString('base64');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list projects: ${response.status} ${response.statusText}`);
      }

      const projects = await response.json();
      const projectCount = Array.isArray(projects) ? projects.length : 0;
      const projectNames = Array.isArray(projects)
        ? projects.slice(0, 3).map((p: any) => p.name).join(', ')
        : '';

      // Store first project key for creating test issues
      if (Array.isArray(projects) && projects.length > 0) {
        this.testProjectKey = projects[0].key;
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Found ${projectCount} projects${projectNames ? `: ${projectNames}...` : ''}`,
        details: { projectCount }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to list projects: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test3_queryIssues(): Promise<void> {
    const testName = 'Test 3: Query Jira Issues (Integration)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if no credentials or integration tests disabled
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

      const { domain, email, token } = this.jiraAuth!;

      // Query for recent issues (limit to 5 for testing)
      const jql = 'order by created DESC';
      const url = `https://${domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=5`;
      const auth = Buffer.from(`${email}:${token}`).toString('base64');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to query issues: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const issueCount = data.total || 0;
      const fetchedCount = data.issues?.length || 0;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Successfully queried ${fetchedCount} issues (${issueCount} total)`,
        details: { issueCount, fetchedCount }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to query issues: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test4_createIssue(): Promise<void> {
    const testName = 'Test 4: Create Issue (Sync)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if no credentials or integration tests disabled
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

      if (!this.testProjectKey) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No project found to create issue in'
        });
        console.log('⏭️  SKIP: No project available\n');
        return;
      }

      const { domain, email, token } = this.jiraAuth!;

      // Create test issue
      const url = `https://${domain}/rest/api/3/issue`;
      const auth = Buffer.from(`${email}:${token}`).toString('base64');

      const issueData = {
        fields: {
          project: { key: this.testProjectKey },
          summary: '[TEST] SpecWeave Integration Test - DO NOT DELETE',
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Test issue created by SpecWeave Jira integration tests. This will be automatically deleted after testing.'
                  }
                ]
              }
            ]
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create issue: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const issue = await response.json();
      this.testIssueKey = issue.key;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Created issue ${issue.key} in ${this.testProjectKey}`,
        details: {
          issueKey: issue.key,
          issueUrl: `https://${domain}/browse/${issue.key}`
        }
      });
      console.log(`✅ PASS: Created issue ${issue.key}\n`);
      console.log(`   URL: https://${domain}/browse/${issue.key}\n`);
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to create issue: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test5_addComment(): Promise<void> {
    const testName = 'Test 5: Add Comment (Push Progress)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if previous test didn't create issue
      if (!this.testIssueKey) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No test issue created'
        });
        console.log('⏭️  SKIP: No test issue\n');
        return;
      }

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

      // Add comment to issue (simulating progress sync)
      const url = `https://${domain}/rest/api/3/issue/${this.testIssueKey}/comment`;
      const auth = Buffer.from(`${email}:${token}`).toString('base64');

      const commentData = {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '✅ Task T-001: Integration test completed\n\nProgress: 50% complete (1/2 tasks)\n\nThis comment demonstrates bidirectional sync from SpecWeave → Jira.',
                  marks: []
                }
              ]
            }
          ]
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commentData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add comment: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const comment = await response.json();

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Added progress comment to issue ${this.testIssueKey}`,
        details: {
          issueKey: this.testIssueKey,
          commentId: comment.id
        }
      });
      console.log(`✅ PASS: Added comment to issue ${this.testIssueKey}\n`);
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to add comment: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test6_getAndDeleteIssue(): Promise<void> {
    const testName = 'Test 6: Get & Delete Issue (Pull + Cleanup)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if previous test didn't create issue
      if (!this.testIssueKey) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No test issue created'
        });
        console.log('⏭️  SKIP: No test issue\n');
        return;
      }

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

      // Get issue to verify sync (simulating bidirectional pull)
      const getUrl = `https://${domain}/rest/api/3/issue/${this.testIssueKey}`;
      const auth = Buffer.from(`${email}:${token}`).toString('base64');

      const getResponse = await fetch(getUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        throw new Error(`Failed to get issue: ${getResponse.status} ${getResponse.statusText}\n${errorText}`);
      }

      const issue = await getResponse.json();
      const currentStatus = issue.fields.status.name;

      console.log(`   Retrieved issue ${this.testIssueKey} (Status: ${currentStatus})\n`);

      // Delete test issue (cleanup)
      const deleteUrl = `https://${domain}/rest/api/3/issue/${this.testIssueKey}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.log(`   ⚠️  Warning: Failed to delete test issue: ${deleteResponse.status}\n`);
      } else {
        console.log(`   Deleted test issue ${this.testIssueKey} (cleanup)\n`);
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Retrieved and deleted issue ${this.testIssueKey}`,
        details: {
          issueKey: this.testIssueKey,
          statusBeforeDelete: currentStatus,
          deleted: deleteResponse.ok
        }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to get/delete issue: ${error.message}`
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
    const resultsDir = path.join(process.cwd(), 'test-results', 'jira-sync');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `jira-sync-${timestamp}.json`);

    const report = {
      suite: 'Jira Sync Integration Tests',
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

export { JiraSyncTest };

// Run tests if called directly
const isMainModule = process.argv[1] === new URL(import.meta.url).pathname;
if (isMainModule) {
  const test = new JiraSyncTest();
  test.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}
