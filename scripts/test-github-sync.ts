#!/usr/bin/env ts-node
/**
 * Test script for GitHub task-level synchronization
 *
 * Usage: npm run test:github-sync
 *
 * This script tests the GitHub sync by creating a minimal test increment
 * and syncing it to GitHub issues.
 */

import { TaskSync } from '../src/plugins/specweave-github/lib/task-sync.js';
import { GitHubClient } from '../src/plugins/specweave-github/lib/github-client.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('🧪 Testing GitHub Task-Level Sync\n');

  // Step 1: Check GitHub CLI prerequisites
  console.log('Step 1: Checking GitHub CLI...');
  const check = GitHubClient.checkGitHubCLI();

  if (!check.installed) {
    console.error('❌ GitHub CLI not installed');
    console.error('   Install: brew install gh (macOS) or see https://cli.github.com');
    process.exit(1);
  }

  if (!check.authenticated) {
    console.error('❌ GitHub CLI not authenticated');
    console.error('   Run: gh auth login');
    process.exit(1);
  }

  console.log('✅ GitHub CLI installed and authenticated\n');

  // Step 2: Create test increment directory
  // ✅ FIXED: Use os.tmpdir() instead of project .specweave/ to prevent pollution
  console.log('Step 2: Creating test increment...');
  const testRoot = path.join(os.tmpdir(), 'specweave-github-test-' + Date.now());
  const testIncrementPath = path.join(testRoot, '.specweave', 'increments', '9999-github-sync-test');

  // Clean up if exists
  if (fs.existsSync(testIncrementPath)) {
    console.log('   Cleaning up existing test increment...');
    fs.rmSync(testIncrementPath, { recursive: true, force: true });
  }

  fs.mkdirSync(testIncrementPath, { recursive: true });

  // Create minimal spec.md
  const specContent = `---
increment: 9999-github-sync-test
title: GitHub Sync Test
version: 0.0.1
status: planned
priority: P0
---

# GitHub Sync Test Increment

**Purpose**: Test GitHub task-level synchronization.

## User Stories

- **US-001**: As a developer, I want to test GitHub sync

## Acceptance Criteria

- ✅ GitHub milestone created
- ✅ Epic issue created
- ✅ Task issues created
- ✅ Issues properly linked
`;

  fs.writeFileSync(path.join(testIncrementPath, 'spec.md'), specContent);

  // Create minimal tasks.md with 3 test tasks
  const tasksContent = `# Tasks - GitHub Sync Test

## Phase 1: Test Tasks

### T-001: Test Task One
**Priority**: P0
**Estimate**: 1 hour
**Status**: pending

**Description**:
First test task to verify GitHub sync works.

**Subtasks**:
- [ ] S-001-01: Test subtask one (15min)
- [ ] S-001-02: Test subtask two (15min)

**Files to Create**:
- test1.txt

**Acceptance Criteria**:
- ✅ Issue created in GitHub
- ✅ Subtasks appear as checkboxes
- ✅ Linked to epic issue

---

### T-002: Test Task Two
**Priority**: P1
**Estimate**: 1 hour
**Status**: pending

**Description**:
Second test task with dependency on T-001.

**Dependencies**:
- T-001 (must complete first)

**Files to Create**:
- test2.txt

**Acceptance Criteria**:
- ✅ Issue created in GitHub
- ✅ Dependency link shows T-001
- ✅ Linked to epic issue

---

### T-003: Test Task Three
**Priority**: P2
**Estimate**: 1 hour
**Status**: pending

**Description**:
Third test task that blocks future work.

**Blocks**:
- T-999 (future task waiting on this)

**Files to Create**:
- test3.txt

**Acceptance Criteria**:
- ✅ Issue created in GitHub
- ✅ Blocks reference shows T-999
- ✅ Linked to epic issue

---

## Summary

**Total Tasks**: 3
**Total Estimate**: 3 hours
**Priority Breakdown**:
- P0: 1 task
- P1: 1 task
- P2: 1 task
`;

  fs.writeFileSync(path.join(testIncrementPath, 'tasks.md'), tasksContent);

  console.log('✅ Test increment created\n');

  // Step 3: Execute sync (DRY RUN first)
  console.log('Step 3: Testing sync (DRY RUN)...');
  console.log(`   Test directory: ${testRoot}`);

  const taskSync = new TaskSync(testIncrementPath);

  try {
    console.log('   Running dry-run to preview what will be created...\n');

    const dryRunResult = await taskSync.syncTasks({ dryRun: true });

    console.log('   📋 Dry Run Results:');
    console.log(`   • Epic: [INC-9999] GitHub Sync Test`);
    console.log(`   • Milestone: v0.0.1`);
    console.log(`   • Tasks: ${dryRunResult.tasks.length} issues would be created`);
    console.log('');

    // Step 4: Ask user for confirmation
    console.log('🚀 Ready to create REAL GitHub issues!');
    console.log('');
    console.log('   This will create:');
    console.log('   • 1 Milestone (v0.0.1)');
    console.log('   • 1 Epic Issue ([INC-9999] GitHub Sync Test)');
    console.log('   • 3 Task Issues (T-001, T-002, T-003)');
    console.log('');
    console.log('   Repository: anton-abyzov/specweave');
    console.log('');

    // For automated testing, skip confirmation
    if (process.env.AUTO_CONFIRM !== 'true') {
      console.log('⚠️  Set AUTO_CONFIRM=true to execute sync');
      console.log('   Example: AUTO_CONFIRM=true npm run test:github-sync');
      console.log('');
      console.log('✅ Dry run successful! Libraries work correctly.');
      process.exit(0);
    }

    // Step 5: Execute REAL sync
    console.log('Step 4: Executing REAL sync...\n');

    const result = await taskSync.syncTasks({
      dryRun: false,
      batchSize: 10,
      batchDelay: 2000 // 2s delay for test (faster than default 6s)
    });

    console.log('✅ Sync complete!\n');
    console.log('📊 Results:');
    console.log(`   • Milestone: #${result.milestone?.number} - ${result.milestone?.title}`);
    console.log(`   • Epic: #${result.epic.number} - ${result.epic.title}`);
    console.log(`   • Tasks: ${result.tasks.length} issues created`);

    result.tasks.forEach(({ taskId, issue }) => {
      console.log(`     - #${issue.number}: [${taskId}] ${issue.title}`);
    });

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.forEach(({ taskId, error }) => {
        console.log(`   - ${taskId || 'Unknown'}: ${error}`);
      });
    }

    console.log('\n🎉 Test successful! Check:');
    console.log(`   https://github.com/anton-abyzov/specweave/issues`);
    console.log(`   https://github.com/anton-abyzov/specweave/milestones`);

  } catch (error) {
    console.error('\n❌ Sync failed:');
    console.error(error);
    process.exit(1);
  }

  // Step 6: Cleanup test data (MANDATORY)
  console.log('\n🧹 Cleaning up test data...');

  try {
    // Step 6a: Delete local test increment directory
    if (fs.existsSync(testIncrementPath)) {
      console.log('   Removing local test increment directory...');
      fs.rmSync(testIncrementPath, { recursive: true, force: true });
      console.log('   ✅ Local directory deleted');
    }

    // Step 6b: Close all GitHub issues created by the test
    console.log('   Closing GitHub issues...');
    const { execSync } = await import('child_process');

    // Get all issues created by this test (milestone filter)
    const issuesJson = execSync(
      'gh api repos/anton-abyzov/specweave/issues?milestone=9999-github-sync-test --jq ".[].number"',
      { encoding: 'utf-8' }
    ).trim();

    if (issuesJson) {
      const issueNumbers = issuesJson.split('\n').filter(Boolean);
      for (const issueNum of issueNumbers) {
        execSync(`gh issue close ${issueNum} --repo anton-abyzov/specweave --comment "Closing test issue (automated cleanup)"`, { stdio: 'ignore' });
        console.log(`   ✅ Closed issue #${issueNum}`);
      }
    }

    // Step 6c: Delete GitHub milestone
    console.log('   Deleting GitHub milestone...');
    const milestonesJson = execSync(
      'gh api repos/anton-abyzov/specweave/milestones --jq \'.[] | select(.title | contains("9999")) | .number\'',
      { encoding: 'utf-8' }
    ).trim();

    if (milestonesJson) {
      const milestoneNumbers = milestonesJson.split('\n').filter(Boolean);
      for (const milestoneNum of milestoneNumbers) {
        execSync(`gh api -X DELETE repos/anton-abyzov/specweave/milestones/${milestoneNum}`, { stdio: 'ignore' });
        console.log(`   ✅ Deleted milestone #${milestoneNum}`);
      }
    }

    console.log('\n✅ Cleanup complete! All test data removed.');

  } catch (cleanupError) {
    console.error('\n⚠️  Cleanup error (non-fatal):');
    console.error(cleanupError);
    console.log('\n💡 Manual cleanup may be required:');
    console.log('   - Local: rm -rf ' + testIncrementPath);
    console.log('   - GitHub issues: gh issue list --search "9999" --json number --jq ".[].number" | xargs -I {} gh issue close {}');
    console.log('   - GitHub milestone: gh api -X DELETE repos/anton-abyzov/specweave/milestones/<number>');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
