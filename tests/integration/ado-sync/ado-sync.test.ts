/**
 * ADO Sync Integration Tests
 *
 * Tests for the specweave-ado plugin integration
 *
 * Run: npm run test:integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import {
  getAzureDevOpsAuth,
  hasAzureDevOpsCredentials,
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

class AdoSyncTest {
  private results: TestResult[] = [];
  private adoAuth = getAzureDevOpsAuth();
  private hasCredentials = hasAzureDevOpsCredentials();
  private runIntegrationTests = shouldRunIntegrationTests();
  private testWorkItemId?: number; // Store for cleanup

  constructor() {}

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      ADO Sync Integration Tests                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Display credential status
    const status = getCredentialStatus();
    console.log('📊 Credential Status:');
    console.log(`   Azure DevOps: ${status.ado ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Integration Tests: ${status.integrationTestsEnabled ? '✅ Enabled' : '⏭️  Disabled'}\n`);

    try {
      await this.test1_checkAzureCliInstalled();
      await this.test2_verifyAdoAuth();
      await this.test3_listWorkItems();
      await this.test4_createWorkItem();
      await this.test5_addComment();
      await this.test6_updateWorkItem();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.generateReport();
    }
  }

  private async test1_checkAzureCliInstalled(): Promise<void> {
    const testName = 'Test 1: Check Azure CLI Installed';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Check if az CLI is installed (safe - no user input)
      const result = await execFileNoThrow('az', ['--version']);

      if (!result.success) {
        // Azure CLI not installed, skip
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'Azure CLI not installed. Install from: https://learn.microsoft.com/cli/azure/install-azure-cli'
        });
        console.log('⏭️  SKIP: Azure CLI not installed\n');
        return;
      }

      const version = result.stdout.split('\n')[0];
      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Azure CLI installed: ${version}`
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Error checking Azure CLI: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test2_verifyAdoAuth(): Promise<void> {
    const testName = 'Test 2: Verify ADO Authentication';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No ADO credentials. Set AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, and AZURE_DEVOPS_PROJECT in .env'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      const { org, pat } = this.adoAuth!;

      // Test authentication by fetching organization details
      const url = `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Azure DevOps API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const projectCount = data.count || 0;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Authenticated to ${org} (${projectCount} projects accessible)`
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

  private async test3_listWorkItems(): Promise<void> {
    const testName = 'Test 3: List Work Items (Integration)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if no credentials or integration tests disabled
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No ADO credentials'
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

      const { org, project, pat } = this.adoAuth!;

      // Query for work items (limit to 5 for testing)
      const wiqlUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/wiql?api-version=7.0`;
      const wiqlQuery = {
        query: 'SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.TeamProject] = @project ORDER BY [System.ChangedDate] DESC'
      };

      const response = await fetch(wiqlUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(wiqlQuery)
      });

      if (!response.ok) {
        throw new Error(`Failed to query work items: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const workItemCount = data.workItems?.length || 0;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Successfully queried ${workItemCount} work items from ${project}`,
        details: { org, project, workItemCount }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to list work items: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test4_createWorkItem(): Promise<void> {
    const testName = 'Test 4: Create Work Item (Sync)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if no credentials or integration tests disabled
      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No ADO credentials'
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

      const { org, project, pat } = this.adoAuth!;

      // Create test work item
      const url = `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/$Epic?api-version=7.1`;
      const operations = [
        {
          op: 'add',
          path: '/fields/System.Title',
          value: '[TEST] SpecWeave Integration Test - DO NOT DELETE'
        },
        {
          op: 'add',
          path: '/fields/System.Description',
          value: '<pre>Test work item created by SpecWeave ADO integration tests.\nThis will be automatically deleted after testing.</pre>'
        },
        {
          op: 'add',
          path: '/fields/System.Tags',
          value: 'specweave; integration-test; auto-delete'
        }
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          'Content-Type': 'application/json-patch+json'
        },
        body: JSON.stringify(operations)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create work item: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const workItem = await response.json();
      this.testWorkItemId = workItem.id;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Created work item #${workItem.id} in ${project}`,
        details: {
          workItemId: workItem.id,
          url: workItem._links.html.href
        }
      });
      console.log(`✅ PASS: Created work item #${workItem.id}\n`);
      console.log(`   URL: ${workItem._links.html.href}\n`);
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to create work item: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test5_addComment(): Promise<void> {
    const testName = 'Test 5: Add Comment (Push Progress)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if previous test didn't create work item
      if (!this.testWorkItemId) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No test work item created'
        });
        console.log('⏭️  SKIP: No test work item\n');
        return;
      }

      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No ADO credentials'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      const { org, project, pat } = this.adoAuth!;

      // Add comment to work item (simulating progress sync)
      const url = `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/${this.testWorkItemId}/comments?api-version=7.1-preview`;
      const comment = {
        text: '✅ Task T-001: Integration test completed\n\nProgress: 50% complete (1/2 tasks)\n\nThis comment demonstrates bidirectional sync from SpecWeave → ADO.'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(comment)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add comment: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const commentData = await response.json();

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Added progress comment to work item #${this.testWorkItemId}`,
        details: {
          workItemId: this.testWorkItemId,
          commentId: commentData.id
        }
      });
      console.log(`✅ PASS: Added comment to work item #${this.testWorkItemId}\n`);
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

  private async test6_updateWorkItem(): Promise<void> {
    const testName = 'Test 6: Get & Delete Work Item (Pull + Cleanup)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Skip if previous test didn't create work item
      if (!this.testWorkItemId) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No test work item created'
        });
        console.log('⏭️  SKIP: No test work item\n');
        return;
      }

      if (!this.hasCredentials) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No ADO credentials'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      const { org, project, pat } = this.adoAuth!;

      // Get work item to verify sync (simulating bidirectional pull)
      const getUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/${this.testWorkItemId}?api-version=7.1`;
      const getResponse = await fetch(getUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
        }
      });

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        throw new Error(`Failed to get work item: ${getResponse.status} ${getResponse.statusText}\n${errorText}`);
      }

      const workItem = await getResponse.json();
      const currentState = workItem.fields['System.State'];

      console.log(`   Retrieved work item #${this.testWorkItemId} (State: ${currentState})\n`);

      // Delete test work item (cleanup)
      const deleteUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/${this.testWorkItemId}?api-version=7.1`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
        }
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.log(`   ⚠️  Warning: Failed to delete test work item: ${deleteResponse.status}\n`);
      } else {
        console.log(`   Deleted test work item #${this.testWorkItemId} (cleanup)\n`);
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Retrieved and deleted work item #${this.testWorkItemId}`,
        details: {
          workItemId: this.testWorkItemId,
          stateBeforeDelete: currentState,
          deleted: deleteResponse.ok
        }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to update work item: ${error.message}`
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
    const resultsDir = path.join(process.cwd(), 'test-results', 'ado-sync');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `ado-sync-${timestamp}.json`);

    const report = {
      suite: 'ADO Sync Integration Tests',
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

export { AdoSyncTest };

// Run tests if called directly
const isMainModule = process.argv[1] === new URL(import.meta.url).pathname;
if (isMainModule) {
  const test = new AdoSyncTest();
  test.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}
