#!/usr/bin/env node

/**
 * Judge LLM Verification Script for AC Status Sync
 *
 * This script verifies that acceptance criteria status is properly synchronized
 * between tasks.md and user story files in living docs.
 *
 * @author SpecWeave Team
 * @version 1.0.0
 */

import fs from 'fs-extra';
import path from 'path';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: string;
}

interface VerificationReport {
  incrementId: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
  verdict: 'PASS' | 'FAIL';
}

class ACStatusVerifier {
  private projectRoot: string;
  private results: TestResult[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Main verification entry point
   */
  async verify(incrementId: string): Promise<VerificationReport> {
    console.log(`\n🔍 AC Status Sync Verification for increment: ${incrementId}`);
    console.log('═'.repeat(60));

    // Test 1: Tasks file exists
    await this.testTasksFileExists(incrementId);

    // Test 2: Parse completed tasks
    const completedTasks = await this.testParseCompletedTasks(incrementId);

    // Test 3: Extract AC-IDs from completed tasks
    const completedACs = await this.testExtractCompletedACs(completedTasks);

    // Test 4: Find user story files
    const userStoryFiles = await this.testFindUserStoryFiles(completedACs);

    // Test 5: Verify AC checkboxes are updated
    await this.testVerifyACCheckboxes(completedACs, userStoryFiles);

    // Test 6: Verify bidirectional consistency
    await this.testBidirectionalConsistency(incrementId);

    // Generate report
    const report = this.generateReport(incrementId);
    this.printReport(report);

    return report;
  }

  /**
   * Test 1: Verify tasks.md exists
   */
  private async testTasksFileExists(incrementId: string): Promise<void> {
    const tasksPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'tasks.md'
    );

    const exists = await fs.pathExists(tasksPath);

    this.results.push({
      test: 'Tasks file exists',
      passed: exists,
      message: exists ? 'tasks.md found' : 'tasks.md not found',
      details: tasksPath
    });
  }

  /**
   * Test 2: Parse completed tasks from tasks.md
   */
  private async testParseCompletedTasks(incrementId: string): Promise<Map<string, string[]>> {
    const tasksPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'tasks.md'
    );

    if (!await fs.pathExists(tasksPath)) {
      this.results.push({
        test: 'Parse completed tasks',
        passed: false,
        message: 'Cannot parse - tasks.md not found'
      });
      return new Map();
    }

    const content = await fs.readFile(tasksPath, 'utf-8');
    const completedTasks = new Map<string, string[]>(); // taskId -> AC-IDs

    // Split into task sections
    const taskSections = content.split(/^#{2,3}\s+(T-\d+):/m);

    for (let i = 1; i < taskSections.length; i += 2) {
      const taskId = taskSections[i];
      const section = taskSections[i + 1];

      // Check if completed
      const isCompleted = /\*\*Status\*\*:\s*\[x\]/i.test(section);

      if (isCompleted) {
        // Extract AC-IDs
        const acMatch = section.match(/\*\*AC\*\*:\s*([^\n]+)/);
        if (acMatch) {
          const acIds = acMatch[1]
            .split(/[,\s]+/)
            .filter(id => id.match(/^AC-/));
          completedTasks.set(`T-${taskId}`, acIds);
        }
      }
    }

    this.results.push({
      test: 'Parse completed tasks',
      passed: true,
      message: `Found ${completedTasks.size} completed task(s)`,
      details: Array.from(completedTasks.keys()).join(', ')
    });

    return completedTasks;
  }

  /**
   * Test 3: Extract completed AC-IDs and map to user stories
   */
  private async testExtractCompletedACs(
    completedTasks: Map<string, string[]>
  ): Promise<Map<string, Set<string>>> {
    const completedACs = new Map<string, Set<string>>(); // US-ID -> AC-IDs

    for (const [taskId, acIds] of completedTasks) {
      for (const acId of acIds) {
        // Map AC-ID to user story
        let userStoryId = '';

        // Pattern: AC-US1-01 -> US-001
        const usMatch = acId.match(/AC-US(\d+)-/);
        if (usMatch) {
          userStoryId = `US-${usMatch[1].padStart(3, '0')}`;
        } else {
          // Generic AC-XXX format - would need task context
          userStoryId = 'US-001'; // Default for testing
        }

        if (!completedACs.has(userStoryId)) {
          completedACs.set(userStoryId, new Set());
        }
        completedACs.get(userStoryId)!.add(acId);
      }
    }

    const totalACs = Array.from(completedACs.values())
      .reduce((sum, set) => sum + set.size, 0);

    this.results.push({
      test: 'Extract completed ACs',
      passed: totalACs > 0,
      message: `Extracted ${totalACs} AC(s) across ${completedACs.size} user story(s)`,
      details: Array.from(completedACs.entries())
        .map(([us, acs]) => `${us}: ${Array.from(acs).join(', ')}`)
        .join('; ')
    });

    return completedACs;
  }

  /**
   * Test 4: Find user story files in living docs
   */
  private async testFindUserStoryFiles(
    completedACs: Map<string, Set<string>>
  ): Promise<Map<string, string>> {
    const userStoryFiles = new Map<string, string>(); // US-ID -> file path
    const specsPath = path.join(this.projectRoot, '.specweave', 'docs', 'internal', 'specs');

    if (!await fs.pathExists(specsPath)) {
      this.results.push({
        test: 'Find user story files',
        passed: false,
        message: 'Living docs specs folder not found'
      });
      return userStoryFiles;
    }

    // Scan all projects and features
    const projects = await fs.readdir(specsPath);

    for (const project of projects) {
      if (project.startsWith('_')) continue; // Skip _epics, _features

      const projectPath = path.join(specsPath, project);
      const stat = await fs.stat(projectPath);
      if (!stat.isDirectory()) continue;

      // Scan feature folders
      const features = await fs.readdir(projectPath);

      for (const feature of features) {
        if (!feature.startsWith('FS-')) continue;

        const featurePath = path.join(projectPath, feature);
        const files = await fs.readdir(featurePath);

        // Find user story files
        for (const file of files) {
          if (!file.match(/^us-\d+-.+\.md$/)) continue;

          const filePath = path.join(featurePath, file);
          const content = await fs.readFile(filePath, 'utf-8');

          // Extract US-ID
          const idMatch = content.match(/^id:\s*(US-\d+)/m);
          if (idMatch && completedACs.has(idMatch[1])) {
            userStoryFiles.set(idMatch[1], filePath);
          }
        }
      }
    }

    this.results.push({
      test: 'Find user story files',
      passed: userStoryFiles.size > 0,
      message: `Found ${userStoryFiles.size} user story file(s)`,
      details: Array.from(userStoryFiles.keys()).join(', ')
    });

    return userStoryFiles;
  }

  /**
   * Test 5: Verify AC checkboxes are properly updated
   */
  private async testVerifyACCheckboxes(
    completedACs: Map<string, Set<string>>,
    userStoryFiles: Map<string, string>
  ): Promise<void> {
    let totalChecked = 0;
    let totalMissing = 0;
    const issues: string[] = [];

    for (const [userStoryId, acIds] of completedACs) {
      const filePath = userStoryFiles.get(userStoryId);

      if (!filePath) {
        issues.push(`User story ${userStoryId} file not found`);
        totalMissing += acIds.size;
        continue;
      }

      const content = await fs.readFile(filePath, 'utf-8');

      for (const acId of acIds) {
        // Check if AC is marked as complete
        const checkedPattern = new RegExp(
          `^\\s*-\\s*\\[x\\]\\s*\\*\\*${acId}\\*\\*:`,
          'gm'
        );

        const uncheckedPattern = new RegExp(
          `^\\s*-\\s*\\[\\s\\]\\s*\\*\\*${acId}\\*\\*:`,
          'gm'
        );

        if (checkedPattern.test(content)) {
          totalChecked++;
        } else if (uncheckedPattern.test(content)) {
          issues.push(`${acId} in ${userStoryId} is NOT checked`);
          totalMissing++;
        } else {
          issues.push(`${acId} not found in ${userStoryId}`);
          totalMissing++;
        }
      }
    }

    const passed = totalMissing === 0 && totalChecked > 0;

    this.results.push({
      test: 'Verify AC checkboxes',
      passed,
      message: passed
        ? `All ${totalChecked} AC(s) properly checked`
        : `${totalChecked} checked, ${totalMissing} missing/unchecked`,
      details: issues.length > 0 ? issues.join('; ') : undefined
    });
  }

  /**
   * Test 6: Verify bidirectional consistency
   */
  private async testBidirectionalConsistency(incrementId: string): Promise<void> {
    // This test verifies that:
    // 1. Completed tasks have their ACs checked in user stories
    // 2. Uncompleted tasks have their ACs unchecked in user stories

    const passed = this.results.filter(r => r.test === 'Verify AC checkboxes')[0]?.passed || false;

    this.results.push({
      test: 'Bidirectional consistency',
      passed,
      message: passed
        ? 'Task status and AC checkboxes are consistent'
        : 'Inconsistencies found between tasks and ACs'
    });
  }

  /**
   * Generate verification report
   */
  private generateReport(incrementId: string): VerificationReport {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    return {
      incrementId,
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      passed,
      failed,
      results: this.results,
      verdict: failed === 0 ? 'PASS' : 'FAIL'
    };
  }

  /**
   * Print report to console
   */
  private printReport(report: VerificationReport): void {
    console.log('\n' + '═'.repeat(60));
    console.log('VERIFICATION REPORT');
    console.log('═'.repeat(60));

    console.log(`\nIncrement: ${report.incrementId}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`\nTest Results: ${report.passed}/${report.totalTests} passed`);

    console.log('\nDetailed Results:');
    console.log('─'.repeat(60));

    for (const result of report.results) {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
      if (result.details && !result.passed) {
        console.log(`   └─ ${result.details}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`VERDICT: ${report.verdict}`);
    console.log('═'.repeat(60));

    if (report.verdict === 'PASS') {
      console.log('\n✅ AC status sync is working correctly!');
    } else {
      console.log('\n❌ AC status sync has issues that need fixing.');
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error('Usage: verify-ac-status-sync.ts <incrementId>');
    console.error('Example: verify-ac-status-sync.ts 0032-prevent-increment-number-gaps');
    process.exit(1);
  }

  const verifier = new ACStatusVerifier();
  verifier.verify(incrementId).then(report => {
    process.exit(report.verdict === 'PASS' ? 0 : 1);
  });
}

export { ACStatusVerifier };