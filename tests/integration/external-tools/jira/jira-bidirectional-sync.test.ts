/**
 * Jira Bidirectional Sync Test
 *
 * Tests the full bidirectional synchronization workflow:
 * 1. Import Jira Epic as SpecWeave Increment
 * 2. Verify RFC/docs folder integration
 * 3. Test bidirectional sync
 *
 * Prerequisites:
 * - .env file with JIRA_API_TOKEN, JIRA_EMAIL, JIRA_DOMAIN
 * - Access to Jira project with at least one Epic
 *
 * Run: npm run test:sync:jira
 */

import { JiraClient } from '../../src/integrations/jira/jira-client';
import { JiraMapper } from '../../src/integrations/jira/jira-mapper';
import { credentialsManager } from '../../src/core/credentials-manager';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  message?: string;
  details?: any;
}

class JiraBidirectionalSyncTest {
  private client: JiraClient;
  private mapper: JiraMapper;
  private results: TestResult[] = [];
  private testEpicKey: string = '';
  private testIncrementId: string = '';
  // ✅ ISOLATED TEST PROJECT (NOT real .specweave/)
  private testProjectRoot: string;

  constructor() {
    this.client = new JiraClient();
    this.mapper = new JiraMapper(this.client);

    // Use isolated test directory OUTSIDE .specweave/
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.testProjectRoot = path.join(__dirname, '../../../fixtures', `jira-bidirectional-test-${timestamp}`);
  }

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      Jira Bidirectional Sync Integration Test               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`📁 Test Project: ${this.testProjectRoot}\n`);

    try {
      // Setup isolated test environment
      await this.setupTestEnvironment();

      await this.test1_CheckCredentials();
      await this.test2_TestConnection();
      await this.test3_FindOrCreateTestEpic();
      await this.test4_ImportEpicAsIncrement();
      await this.test5_VerifyIncrementStructure();
      await this.test6_VerifyRFCGeneration();
      await this.test7_TestBidirectionalSync();
      await this.test8_Cleanup();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.generateReport();
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up isolated test environment...');

    // Create test .specweave/ structure
    const specweaveDir = path.join(this.testProjectRoot, '.specweave');
    const incrementsDir = path.join(specweaveDir, 'increments');
    const docsDir = path.join(specweaveDir, 'docs');
    const rfcsDir = path.join(docsDir, 'rfcs');

    fs.mkdirSync(incrementsDir, { recursive: true });
    fs.mkdirSync(rfcsDir, { recursive: true });

    console.log('✅ Test environment ready\n');
  }

  private async cleanupTestEnvironment(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');

    if (fs.existsSync(this.testProjectRoot)) {
      fs.rmSync(this.testProjectRoot, { recursive: true, force: true });
      console.log('✅ Test environment cleaned');
    }
  }

  private async test1_CheckCredentials(): Promise<void> {
    const testName = 'Test 1: Check Jira Credentials';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const hasCredentials = credentialsManager.hasJiraCredentials();
      if (hasCredentials) {
        const maskedInfo = credentialsManager.getMaskedJiraInfo();
        console.log(maskedInfo);
        this.results.push({
          name: testName,
          status: 'PASS',
          duration: Date.now() - start,
          message: 'Credentials found and validated'
        });
        console.log('✅ PASS\n');
      } else {
        throw new Error('Jira credentials not found');
      }
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
      throw error;
    }
  }

  private async test2_TestConnection(): Promise<void> {
    const testName = 'Test 2: Test Jira Connection';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const connected = await this.client.testConnection();
      if (connected) {
        this.results.push({
          name: testName,
          status: 'PASS',
          duration: Date.now() - start,
          message: 'Successfully connected to Jira'
        });
        console.log('✅ PASS\n');
      } else {
        throw new Error('Failed to connect to Jira');
      }
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
      throw error;
    }
  }

  private async test3_FindOrCreateTestEpic(): Promise<void> {
    const testName = 'Test 3: Find or Create Test Epic';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Search for existing test epics
      const projects = await this.client.getProjects();
      const projectKey = projects[0]?.key || 'SCRUM';

      const epics = await this.client.searchIssues({
        project: projectKey,
        issueType: ['Epic'],
        jql: 'labels = "specweave-test" AND issuetype = Epic',
        maxResults: 1
      });

      if (epics.length > 0) {
        this.testEpicKey = epics[0].key;
        console.log(`✅ Found existing test Epic: ${this.testEpicKey}`);
      } else {
        // Create a test epic with stories
        const epic = await this.client.createIssue({
          issueType: 'Epic',
          summary: '[SpecWeave Test] Test Epic for Sync',
          description: 'This is a test epic for bidirectional sync testing.',
          // priority: 'High', // Skip priority - not available in all projects
          labels: ['specweave-test', 'sync-test']
        }, projectKey);

        this.testEpicKey = epic.key;
        console.log(`✅ Created test Epic: ${this.testEpicKey}`);

        // Create 2 test stories
        const story1 = await this.client.createIssue({
          issueType: 'Story',
          summary: 'User can authenticate',
          description: 'As a user, I want to authenticate so that I can access the system.',
          // priority: 'High', // Skip priority - not available in all projects
          labels: ['specweave-test'],
          epicKey: this.testEpicKey
        }, projectKey);
        console.log(`   ✅ Created Story: ${story1.key}`);

        const story2 = await this.client.createIssue({
          issueType: 'Story',
          summary: 'User can view dashboard',
          description: 'As a user, I want to view my dashboard so that I can see my data.',
          // priority: 'Medium', // Skip priority - not available in all projects
          labels: ['specweave-test'],
          epicKey: this.testEpicKey
        }, projectKey);
        console.log(`   ✅ Created Story: ${story2.key}`);
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Using Epic ${this.testEpicKey}`,
        details: { epicKey: this.testEpicKey }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test4_ImportEpicAsIncrement(): Promise<void> {
    const testName = 'Test 4: Import Epic as SpecWeave Increment';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const result = await this.mapper.importEpicAsIncrement(this.testEpicKey);

      if (result.success) {
        console.log(`\n✅ Import Result:`);
        console.log(`   ${result.summary}`);
        console.log(`   Changes: Created ${result.changes.created}, Updated ${result.changes.updated}`);

        // Extract increment ID from summary
        const match = result.summary.match(/Increment (\d{4})/);
        if (match) {
          this.testIncrementId = match[1];
        }

        this.results.push({
          name: testName,
          status: 'PASS',
          duration: Date.now() - start,
          message: result.summary,
          details: { incrementId: this.testIncrementId, changes: result.changes }
        });
        console.log('✅ PASS\n');
      } else {
        throw new Error(result.summary);
      }
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test5_VerifyIncrementStructure(): Promise<void> {
    const testName = 'Test 5: Verify Increment Structure';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.testIncrementId) {
        throw new Error('No increment ID from previous test');
      }

      // Using ISOLATED test directory
      const incrementFolder = path.join(this.testProjectRoot, '.specweave', 'increments', this.testIncrementId);

      // Check files exist
      const requiredFiles = ['spec.md', 'tasks.md', 'context-manifest.yaml'];
      const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(incrementFolder, file)));

      if (missingFiles.length > 0) {
        throw new Error(`Missing files: ${missingFiles.join(', ')}`);
      }

      console.log(`✅ Increment folder created: ${incrementFolder}`);
      console.log(`✅ All required files present: ${requiredFiles.join(', ')}`);

      // Read and display spec.md frontmatter
      const specContent = fs.readFileSync(path.join(incrementFolder, 'spec.md'), 'utf-8');
      const frontmatterMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        console.log(`\n📄 spec.md frontmatter:`);
        console.log(frontmatterMatch[1].split('\n').map(line => `   ${line}`).join('\n'));
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Increment structure verified',
        details: { incrementId: this.testIncrementId, files: requiredFiles }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test6_VerifyRFCGeneration(): Promise<void> {
    const testName = 'Test 6: Verify RFC Document Generation';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Using ISOLATED test directory
      const rfcFolder = path.join(this.testProjectRoot, '.specweave', 'docs', 'rfcs');

      if (!fs.existsSync(rfcFolder)) {
        throw new Error('RFC folder not created');
      }

      // Find RFC file for this increment
      const rfcFiles = fs.readdirSync(rfcFolder).filter(f => f.startsWith(`rfc-${this.testIncrementId}`));

      if (rfcFiles.length === 0) {
        throw new Error('RFC document not created');
      }

      const rfcPath = path.join(rfcFolder, rfcFiles[0]);
      const rfcContent = fs.readFileSync(rfcPath, 'utf-8');

      console.log(`✅ RFC document created: ${rfcFiles[0]}`);
      console.log(`✅ RFC content preview (first 300 chars):`);
      console.log(rfcContent.substring(0, 300).split('\n').map(line => `   ${line}`).join('\n'));

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'RFC document generated',
        details: { rfcFile: rfcFiles[0] }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test7_TestBidirectionalSync(): Promise<void> {
    const testName = 'Test 7: Test Bidirectional Sync';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.testIncrementId) {
        throw new Error('No increment ID from previous test');
      }

      // Perform sync
      const result = await this.mapper.syncIncrement(this.testIncrementId);

      if (result.success) {
        console.log(`\n✅ Sync Result:`);
        console.log(`   ${result.summary}`);
        console.log(`   Changes: Updated ${result.changes.updated}`);
        console.log(`   Conflicts: ${result.conflicts.length}`);

        if (result.conflicts.length > 0) {
          console.log(`\n   Conflicts resolved:`);
          result.conflicts.forEach(c => {
            console.log(`   - ${c.type}: ${c.jira_value} vs ${c.specweave_value} → ${c.resolution}`);
          });
        }

        this.results.push({
          name: testName,
          status: 'PASS',
          duration: Date.now() - start,
          message: result.summary,
          details: { conflicts: result.conflicts.length, changes: result.changes }
        });
        console.log('✅ PASS\n');
      } else {
        throw new Error(result.summary);
      }
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async test8_Cleanup(): Promise<void> {
    const testName = 'Test 8: Cleanup Test Data';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      console.log(`✅ JIRA test data created (preserved in Jira):`);
      console.log(`   - Jira Epic: ${this.testEpicKey}`);
      console.log(`\n✅ Local test increments (will be cleaned up):`);
      console.log(`   - SpecWeave Increment: ${this.testIncrementId}`);
      console.log(`   - Test Project: ${this.testProjectRoot}`);

      // Clean up test environment
      await this.cleanupTestEnvironment();

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Test environment cleaned up successfully'
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
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

    // Save to test-results folder
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `jira-bidirectional-sync-${timestamp}.json`);

    const report = {
      suite: 'Jira Bidirectional Sync Integration Test',
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        skipped
      },
      results: this.results,
      testData: {
        epicKey: this.testEpicKey,
        incrementId: this.testIncrementId
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Report saved to: ${reportPath}`);
  }
}

// Run tests
// Run tests if called directly
const isMainModule = process.argv[1] === new URL(import.meta.url).pathname;
if (isMainModule) {
  const test = new JiraBidirectionalSyncTest();
  test.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { JiraBidirectionalSyncTest };
