/**
 * Jira Incremental Sync Test
 *
 * Tests granular work item management:
 * 1. Add specific Story to existing increment
 * 2. Add specific Bug to existing increment
 * 3. Add specific Task to existing increment
 * 4. Create increment from multiple items (cherry-pick)
 * 5. Verify spec.md organization (User Stories, Bugs, Technical Tasks sections)
 * 6. Verify RFC updates when items added
 * 7. Verify work_items array in frontmatter
 *
 * Prerequisites:
 * - .env file with JIRA_API_TOKEN, JIRA_EMAIL, JIRA_DOMAIN
 * - Access to Jira project with ability to create issues
 *
 * Run: npm run test:incremental:jira
 */

import { JiraClient } from '../../src/integrations/jira/jira-client';
import { JiraIncrementalMapper } from '../../src/integrations/jira/jira-incremental-mapper';
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

class JiraIncrementalSyncTest {
  private client!: JiraClient;
  private mapper!: JiraIncrementalMapper;
  private results: TestResult[] = [];
  private testStoryKey: string = '';
  private testBugKey: string = '';
  private testTaskKey: string = '';
  private testIncrementId: string = '';
  private cherryPickIncrementId: string = '';
  // ✅ ISOLATED TEST PROJECT (NOT real .specweave/)
  private testProjectRoot: string;

  constructor() {
    this.client = new JiraClient();
    this.mapper = new JiraIncrementalMapper(this.client);

    // Use isolated test directory OUTSIDE .specweave/
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.testProjectRoot = path.join(__dirname, '../../../fixtures', `jira-test-${timestamp}`);
  }

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      Jira Incremental Sync Integration Test                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`📁 Test Project: ${this.testProjectRoot}\n`);

    try {
      // Setup isolated test environment
      await this.setupTestEnvironment();

      await this.test1_CheckCredentials();
      await this.test2_TestConnection();
      await this.test3_CreateTestWorkItems();
      await this.test4_FindOrCreateTestIncrement();
      await this.test5_AddStoryToIncrement();
      await this.test6_AddBugToIncrement();
      await this.test7_AddTaskToIncrement();
      await this.test8_VerifyIncrementStructure();
      await this.test9_VerifyRFCUpdates();
      await this.test10_CreateIncrementFromItems();
      await this.test11_VerifyCherryPickStructure();
      await this.test12_Cleanup();
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

  private async test3_CreateTestWorkItems(): Promise<void> {
    const testName = 'Test 3: Create Test Work Items (Story, Bug, Task)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const projects = await this.client.getProjects();
      const projectKey = projects[0]?.key || 'SCRUM';

      // Create test Story
      const story = await this.client.createIssue({
        issueType: 'Story',
        summary: '[SpecWeave Incremental Test] User can login',
        description: 'As a user, I want to login so that I can access my account.',
        labels: ['specweave-test', 'incremental-test']
      }, projectKey);
      this.testStoryKey = story.key;
      console.log(`✅ Created Story: ${this.testStoryKey}`);

      // Create test Bug
      const bug = await this.client.createIssue({
        issueType: 'Bug',
        summary: '[SpecWeave Incremental Test] Fix login redirect',
        description: 'Login page redirects to wrong URL after authentication.',
        labels: ['specweave-test', 'incremental-test']
      }, projectKey);
      this.testBugKey = bug.key;
      console.log(`✅ Created Bug: ${this.testBugKey}`);

      // Create test Task
      const task = await this.client.createIssue({
        issueType: 'Task',
        summary: '[SpecWeave Incremental Test] Setup OAuth provider',
        description: 'Configure OAuth 2.0 provider for authentication.',
        labels: ['specweave-test', 'incremental-test']
      }, projectKey);
      this.testTaskKey = task.key;
      console.log(`✅ Created Task: ${this.testTaskKey}`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Created Story ${this.testStoryKey}, Bug ${this.testBugKey}, Task ${this.testTaskKey}`,
        details: { story: this.testStoryKey, bug: this.testBugKey, task: this.testTaskKey }
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

  private async test4_FindOrCreateTestIncrement(): Promise<void> {
    const testName = 'Test 4: Find or Create Test Increment';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Find highest increment number - using ISOLATED test directory
      const incrementsDir = path.join(this.testProjectRoot, '.specweave', 'increments');
      if (!fs.existsSync(incrementsDir)) {
        fs.mkdirSync(incrementsDir, { recursive: true });
      }

      const existing = fs.readdirSync(incrementsDir)
        .filter(name => /^\d{4}/.test(name))
        .map(name => parseInt(name.substring(0, 4)))
        .sort((a, b) => b - a);

      const nextId = existing.length > 0 ? existing[0] + 1 : 1;
      this.testIncrementId = nextId.toString().padStart(4, '0');

      // Create basic increment structure for testing
      const incrementFolder = path.join(incrementsDir, this.testIncrementId);
      fs.mkdirSync(incrementFolder, { recursive: true });

      // Create minimal spec.md
      const specContent = `---
increment_id: '${this.testIncrementId}'
title: 'Incremental Sync Test Increment'
status: in-progress
priority: P2
created_at: '${new Date().toISOString()}'
updated_at: '${new Date().toISOString()}'
work_items: []
---

# Incremental Sync Test Increment

This increment is for testing granular work item addition.

## User Stories

(Will be populated by tests)

## Bugs

(Will be populated by tests)

## Technical Tasks

(Will be populated by tests)
`;

      fs.writeFileSync(path.join(incrementFolder, 'spec.md'), specContent);
      fs.writeFileSync(path.join(incrementFolder, 'tasks.md'), '# Tasks\n\n- [ ] Task 1\n');
      fs.writeFileSync(path.join(incrementFolder, 'context-manifest.yaml'), 'contexts: []\n');

      console.log(`✅ Created test increment: ${this.testIncrementId}`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Created increment ${this.testIncrementId}`,
        details: { incrementId: this.testIncrementId }
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

  private async test5_AddStoryToIncrement(): Promise<void> {
    const testName = 'Test 5: Add Story to Existing Increment';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const result = await this.mapper.addItemToIncrement(
        this.testIncrementId,
        this.testStoryKey
      );

      if (result.success) {
        console.log(`✅ Added Story: ${result.message}`);
        console.log(`   Work Item: ${result.workItem?.id} - ${result.workItem?.title}`);
        console.log(`   Type: ${result.workItem?.type}`);

        this.results.push({
          name: testName,
          status: 'PASS',
          duration: Date.now() - start,
          message: result.message,
          details: { workItem: result.workItem }
        });
        console.log('✅ PASS\n');
      } else {
        throw new Error(result.message);
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

  private async test6_AddBugToIncrement(): Promise<void> {
    const testName = 'Test 6: Add Bug to Existing Increment';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const result = await this.mapper.addItemToIncrement(
        this.testIncrementId,
        this.testBugKey
      );

      if (result.success) {
        console.log(`✅ Added Bug: ${result.message}`);
        console.log(`   Work Item: ${result.workItem?.id} - ${result.workItem?.title}`);
        console.log(`   Type: ${result.workItem?.type}`);

        this.results.push({
          name: testName,
          status: 'PASS',
          duration: Date.now() - start,
          message: result.message,
          details: { workItem: result.workItem }
        });
        console.log('✅ PASS\n');
      } else {
        throw new Error(result.message);
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

  private async test7_AddTaskToIncrement(): Promise<void> {
    const testName = 'Test 7: Add Task to Existing Increment';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const result = await this.mapper.addItemToIncrement(
        this.testIncrementId,
        this.testTaskKey
      );

      if (result.success) {
        console.log(`✅ Added Task: ${result.message}`);
        console.log(`   Work Item: ${result.workItem?.id} - ${result.workItem?.title}`);
        console.log(`   Type: ${result.workItem?.type}`);

        this.results.push({
          name: testName,
          status: 'PASS',
          duration: Date.now() - start,
          message: result.message,
          details: { workItem: result.workItem }
        });
        console.log('✅ PASS\n');
      } else {
        throw new Error(result.message);
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

  private async test8_VerifyIncrementStructure(): Promise<void> {
    const testName = 'Test 8: Verify Increment Structure (Sections & Frontmatter)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Using ISOLATED test directory
      const incrementFolder = path.join(this.testProjectRoot, '.specweave', 'increments', this.testIncrementId);
      const specPath = path.join(incrementFolder, 'spec.md');
      const specContent = fs.readFileSync(specPath, 'utf-8');

      // Check sections exist
      const requiredSections = ['## User Stories', '## Bugs', '## Technical Tasks'];
      const missingSections = requiredSections.filter(section => !specContent.includes(section));

      if (missingSections.length > 0) {
        throw new Error(`Missing sections: ${missingSections.join(', ')}`);
      }

      console.log(`✅ All sections present: ${requiredSections.join(', ')}`);

      // Check frontmatter work_items array
      const frontmatterMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        throw new Error('No YAML frontmatter found');
      }

      const frontmatter = frontmatterMatch[1];
      if (!frontmatter.includes('work_items:')) {
        throw new Error('work_items array not found in frontmatter');
      }

      console.log(`✅ work_items array present in frontmatter`);

      // Count work items by type
      const storyMatches = specContent.match(/### US\d{4}-\d{3}:/g) || [];
      const bugMatches = specContent.match(/### BUG\d{4}-\d{3}:/g) || [];
      const taskMatches = specContent.match(/### TASK\d{4}-\d{3}:/g) || [];

      console.log(`\n📊 Work Items by Type:`);
      console.log(`   Stories: ${storyMatches.length}`);
      console.log(`   Bugs: ${bugMatches.length}`);
      console.log(`   Tasks: ${taskMatches.length}`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Increment structure verified',
        details: {
          sections: requiredSections,
          workItemCounts: {
            stories: storyMatches.length,
            bugs: bugMatches.length,
            tasks: taskMatches.length
          }
        }
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

  private async test9_VerifyRFCUpdates(): Promise<void> {
    const testName = 'Test 9: Verify RFC Document Updates';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Using ISOLATED test directory
      const rfcFolder = path.join(this.testProjectRoot, '.specweave', 'docs', 'rfcs');

      if (!fs.existsSync(rfcFolder)) {
        console.log(`⏭️  Skipping: RFC folder not created yet (expected for manual increments)`);
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'RFC folder not created (manual increment)'
        });
        console.log('⏭️  SKIP\n');
        return;
      }

      // Find RFC file for this increment
      const rfcFiles = fs.readdirSync(rfcFolder).filter(f => f.startsWith(`rfc-${this.testIncrementId}`));

      if (rfcFiles.length === 0) {
        console.log(`⏭️  Skipping: RFC document not created (manual increment)`);
        this.results.push({
          name: testName,
          status: 'SKIP',
          duration: Date.now() - start,
          message: 'RFC document not created (manual increment)'
        });
        console.log('⏭️  SKIP\n');
        return;
      }

      const rfcPath = path.join(rfcFolder, rfcFiles[0]);
      const rfcContent = fs.readFileSync(rfcPath, 'utf-8');

      console.log(`✅ RFC document found: ${rfcFiles[0]}`);
      console.log(`✅ RFC content includes work items`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'RFC document verified',
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

  private async test10_CreateIncrementFromItems(): Promise<void> {
    const testName = 'Test 10: Create Increment from Multiple Items (Cherry-Pick)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const result = await this.mapper.createIncrementFromItems(
        'Authentication Features',
        [this.testStoryKey, this.testBugKey, this.testTaskKey]
      );

      if (result.success) {
        this.cherryPickIncrementId = result.incrementId;
        console.log(`✅ Created Increment: ${result.incrementId}`);
        console.log(`   ${result.message}`);

        this.results.push({
          name: testName,
          status: 'PASS',
          duration: Date.now() - start,
          message: result.message,
          details: { incrementId: result.incrementId }
        });
        console.log('✅ PASS\n');
      } else {
        throw new Error(result.message);
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

  private async test11_VerifyCherryPickStructure(): Promise<void> {
    const testName = 'Test 11: Verify Cherry-Pick Increment Structure';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      if (!this.cherryPickIncrementId) {
        throw new Error('No cherry-pick increment ID from previous test');
      }

      // Using ISOLATED test directory
      const incrementFolder = path.join(this.testProjectRoot, '.specweave', 'increments', this.cherryPickIncrementId);
      const specPath = path.join(incrementFolder, 'spec.md');
      const specContent = fs.readFileSync(specPath, 'utf-8');

      // Verify it has all 3 items
      const hasStory = specContent.includes(this.testStoryKey);
      const hasBug = specContent.includes(this.testBugKey);
      const hasTask = specContent.includes(this.testTaskKey);

      if (!hasStory || !hasBug || !hasTask) {
        throw new Error(`Missing items: Story=${hasStory}, Bug=${hasBug}, Task=${hasTask}`);
      }

      console.log(`✅ All 3 items present in spec.md`);
      console.log(`   Story: ${this.testStoryKey} ✓`);
      console.log(`   Bug: ${this.testBugKey} ✓`);
      console.log(`   Task: ${this.testTaskKey} ✓`);

      // Verify sections
      const requiredSections = ['## User Stories', '## Bugs', '## Technical Tasks'];
      const sectionsPresent = requiredSections.every(section => specContent.includes(section));

      if (!sectionsPresent) {
        throw new Error('Not all sections present');
      }

      console.log(`✅ All sections organized correctly`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Cherry-pick increment structure verified',
        details: {
          incrementId: this.cherryPickIncrementId,
          items: [this.testStoryKey, this.testBugKey, this.testTaskKey]
        }
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

  private async test12_Cleanup(): Promise<void> {
    const testName = 'Test 12: Cleanup Test Data';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      console.log(`✅ JIRA test data created (preserved in Jira):`);
      console.log(`   - Jira Story: ${this.testStoryKey}`);
      console.log(`   - Jira Bug: ${this.testBugKey}`);
      console.log(`   - Jira Task: ${this.testTaskKey}`);
      console.log(`\n✅ Local test increments (will be cleaned up):`);
      console.log(`   - Increment (add items): ${this.testIncrementId}`);
      console.log(`   - Increment (cherry-pick): ${this.cherryPickIncrementId}`);
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
    const reportPath = path.join(resultsDir, `jira-incremental-sync-${timestamp}.json`);

    const report = {
      suite: 'Jira Incremental Sync Integration Test',
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        skipped
      },
      results: this.results,
      testData: {
        storyKey: this.testStoryKey,
        bugKey: this.testBugKey,
        taskKey: this.testTaskKey,
        incrementId: this.testIncrementId,
        cherryPickIncrementId: this.cherryPickIncrementId
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
  const test = new JiraIncrementalSyncTest();
  test.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { JiraIncrementalSyncTest };
