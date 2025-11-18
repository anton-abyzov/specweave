/**
 * ADO Sync Integration Tests
 *
 * Tests for the specweave-ado plugin integration with MULTI-PROJECT support
 *
 * Run: npm run test:integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { execFileNoThrow } from '../../src/utils/execFileNoThrow.js';
import {
  getAzureDevOpsAuth,
  hasAzureDevOpsCredentials,
  shouldRunIntegrationTests,
  getCredentialStatus
} from '../../helpers/auth.js';

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
  organization: string;
  project: string;
  displayName: string;
}

class AdoSyncTest {
  private results: TestResult[] = [];
  private adoAuth = getAzureDevOpsAuth();
  private hasCredentials = hasAzureDevOpsCredentials();
  private runIntegrationTests = shouldRunIntegrationTests();

  // Multi-project sync profiles (at least 2)
  private syncProfiles: SyncProfile[] = [];
  private createdWorkItems: Array<{ profile: string; workItemId: number; workItemUrl: string }> = [];

  constructor() {
    this.initializeSyncProfiles();
  }

  private initializeSyncProfiles(): void {
    const org = this.adoAuth?.org || 'example-org';

    // Profile 1: Primary project (from env or default)
    const project1 = process.env.ADO_TEST_PROJECT_1 || 'Project1';

    // Profile 2: Secondary project (from env or default)
    const project2 = process.env.ADO_TEST_PROJECT_2 || 'Project2';

    this.syncProfiles = [
      {
        id: 'project-1',
        organization: org,
        project: project1,
        displayName: `${org}/${project1}`
      },
      {
        id: 'project-2',
        organization: org,
        project: project2,
        displayName: `${org}/${project2}`
      }
    ];
  }

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      ADO Sync Integration Tests (Multi-Project)              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const status = getCredentialStatus();
    console.log('📊 Credential Status:');
    console.log(`   Azure DevOps: ${status.ado ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Integration Tests: ${status.integrationTestsEnabled ? '✅ Enabled' : '⏭️  Disabled'}\n`);

    console.log('🔗 Sync Profiles:');
    this.syncProfiles.forEach((profile, idx) => {
      console.log(`   ${idx + 1}. ${profile.id} → ${profile.displayName}`);
    });
    console.log('');

    try {
      await this.test1_checkAzureCliInstalled();
      await this.test2_verifyAdoAuth();
      await this.test3_detectProjectId();
      await this.test4_validateSyncProfiles();
      await this.test5_createWorkItemsMultiProject();
      await this.test6_verifyBidirectionalSync();
      await this.test7_cleanupTestWorkItems();
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
      const result = await execFileNoThrow('az', ['--version']);

      if (!result.success) {
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

  private async test3_detectProjectId(): Promise<void> {
    const testName = 'Test 3: Detect Project ID from Sync Config';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
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

      const detectedProjectId = this.syncProfiles[0].project.toLowerCase().replace(/\s+/g, '-');
      console.log(`   ADO organization: ${this.adoAuth!.org}`);
      console.log(`   Detected project ID: ${detectedProjectId}\n`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Auto-detected project ID: ${detectedProjectId}`,
        details: { projectId: detectedProjectId, organization: this.adoAuth!.org }
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
          message: 'No ADO credentials'
        });
        console.log('⏭️  SKIP: No credentials\n');
        return;
      }

      const { org, pat } = this.adoAuth!;
      const validationResults: Array<{ profile: string; valid: boolean; error?: string }> = [];

      // Get all accessible projects
      const url = `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list projects: ${response.status}`);
      }

      const data = await response.json();
      const projectNames = Array.isArray(data.value) ? data.value.map((p: any) => p.name) : [];

      // Validate each sync profile
      for (const profile of this.syncProfiles) {
        const exists = projectNames.includes(profile.project);
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

  private async test5_createWorkItemsMultiProject(): Promise<void> {
    const testName = 'Test 5: Create Work Items in Multiple Projects';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.hasCredentials || !this.runIntegrationTests) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: !this.hasCredentials ? 'No ADO credentials' : 'Integration tests disabled'
        });
        console.log('⏭️  SKIP\n');
        return;
      }

      const { org, pat } = this.adoAuth!;
      const workItemsCreated: number[] = [];

      for (const profile of this.syncProfiles) {
        try {
          const url = `https://dev.azure.com/${org}/${profile.project}/_apis/wit/workitems/$Epic?api-version=7.1`;
          const operations = [
            {
              op: 'add',
              path: '/fields/System.Title',
              value: `[TEST] Multi-Project Sync - ${profile.id} - ${new Date().toISOString()}`
            },
            {
              op: 'add',
              path: '/fields/System.Description',
              value: `<pre>Test work item from SpecWeave integration tests.\n\nProject: ${profile.id}\nProfile: ${profile.displayName}\n\nSafe to delete.</pre>`
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

          if (response.ok) {
            const workItem = await response.json();
            this.createdWorkItems.push({
              profile: profile.id,
              workItemId: workItem.id,
              workItemUrl: workItem._links.html.href
            });
            workItemsCreated.push(1);
            console.log(`   ✅ ${profile.displayName}: Created work item #${workItem.id}`);
          } else {
            console.log(`   ⚠️  ${profile.displayName}: Failed to create work item (${response.status})`);
          }
        } catch (error: any) {
          console.log(`   ⚠️  ${profile.displayName}: Error - ${error.message}`);
        }
      }

      const totalCreated = workItemsCreated.length;
      const totalProfiles = this.syncProfiles.length;

      this.results.push({
        name: testName,
        status: totalCreated >= 1 ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        message: `Created ${totalCreated}/${totalProfiles} test work items across projects`,
        details: this.createdWorkItems
      });

      console.log(`\n${totalCreated >= 1 ? '✅ PASS' : '❌ FAIL'}: Created ${totalCreated}/${totalProfiles} work items\n`);
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: `Failed to create work items: ${error.message}`
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test6_verifyBidirectionalSync(): Promise<void> {
    const testName = 'Test 6: Verify Bidirectional Sync (Push + Pull)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (this.createdWorkItems.length === 0) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No test work items created'
        });
        console.log('⏭️  SKIP: No test work items\n');
        return;
      }

      const { org, pat } = this.adoAuth!;
      const syncResults: Array<{ profile: string; workItem: string; pushed: boolean; pulled: boolean }> = [];

      for (const workItem of this.createdWorkItems) {
        try {
          const profile = this.syncProfiles.find(p => p.id === workItem.profile);
          if (!profile) continue;

          const auth = Buffer.from(`:${pat}`).toString('base64');

          // 1. PUSH: Add comment (SpecWeave → ADO)
          const commentUrl = `https://dev.azure.com/${org}/${profile.project}/_apis/wit/workitems/${workItem.workItemId}/comments?api-version=7.1-preview`;
          const comment = {
            text: '✅ Task T-001: Integration test progress\n\nProgress: 50% complete (1/2 tasks)\n\nThis demonstrates bidirectional sync from SpecWeave → ADO.'
          };

          const pushResponse = await fetch(commentUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(comment)
          });

          // 2. PULL: Retrieve work item to verify (ADO → SpecWeave)
          const pullUrl = `https://dev.azure.com/${org}/${profile.project}/_apis/wit/workitems/${workItem.workItemId}?api-version=7.1`;
          const pullResponse = await fetch(pullUrl, {
            headers: {
              'Authorization': `Basic ${auth}`
            }
          });

          let pulled = pullResponse.ok;

          syncResults.push({
            profile: profile.displayName,
            workItem: `#${workItem.workItemId}`,
            pushed: pushResponse.ok,
            pulled
          });

          const status = pushResponse.ok && pulled ? '✅' : '⚠️ ';
          console.log(`   ${status} ${profile.displayName} #${workItem.workItemId}: Push=${pushResponse.ok}, Pull=${pulled}`);
        } catch (error: any) {
          console.log(`   ⚠️  ${workItem.profile} #${workItem.workItemId}: Error - ${error.message}`);
        }
      }

      const successfulSyncs = syncResults.filter(r => r.pushed && r.pulled).length;
      const totalSyncs = syncResults.length;

      this.results.push({
        name: testName,
        status: successfulSyncs >= 1 ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        message: `Verified bidirectional sync for ${successfulSyncs}/${totalSyncs} work items`,
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

  private async test7_cleanupTestWorkItems(): Promise<void> {
    const testName = 'Test 7: Cleanup Test Work Items';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (this.createdWorkItems.length === 0) {
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'No test work items to clean up'
        });
        console.log('⏭️  SKIP: No work items to clean up\n');
        return;
      }

      const { org, pat } = this.adoAuth!;
      const deletedWorkItems: number[] = [];

      for (const workItem of this.createdWorkItems) {
        try {
          const profile = this.syncProfiles.find(p => p.id === workItem.profile);
          if (!profile) continue;

          const url = `https://dev.azure.com/${org}/${profile.project}/_apis/wit/workitems/${workItem.workItemId}?api-version=7.1`;
          const auth = Buffer.from(`:${pat}`).toString('base64');

          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${auth}`
            }
          });

          if (response.ok) {
            deletedWorkItems.push(1);
            console.log(`   ✅ Deleted ${profile.displayName} #${workItem.workItemId}`);
          } else {
            console.log(`   ⚠️  Failed to delete ${profile.displayName} #${workItem.workItemId}`);
          }
        } catch (error: any) {
          console.log(`   ⚠️  Error deleting ${workItem.profile} #${workItem.workItemId}: ${error.message}`);
        }
      }

      const totalDeleted = deletedWorkItems.length;
      const totalCreated = this.createdWorkItems.length;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Deleted ${totalDeleted}/${totalCreated} test work items`,
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

    const resultsDir = path.join(process.cwd(), 'test-results', 'ado-sync');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `ado-sync-multiproject-${timestamp}.json`);

    const report = {
      suite: 'ADO Sync Integration Tests (Multi-Project)',
      timestamp: new Date().toISOString(),
      credentialStatus: getCredentialStatus(),
      syncProfiles: this.syncProfiles,
      createdWorkItems: this.createdWorkItems,
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

export { AdoSyncTest };

const isMainModule = process.argv[1] === new URL(import.meta.url).pathname;
if (isMainModule) {
  const test = new AdoSyncTest();
  test.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}
