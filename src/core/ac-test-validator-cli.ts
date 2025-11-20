#!/usr/bin/env node

/**
 * AC Test Validator CLI
 *
 * Command-line interface for validating Acceptance Criteria tests before task completion.
 *
 * Usage:
 *   node ac-test-validator-cli.js <increment-id>
 *
 * Exit codes:
 *   0 - All AC tests passed
 *   1 - Validation failed (tests failed or missing)
 *   2 - Configuration error (missing files, invalid setup)
 */

import path from 'path';
import fs from 'fs-extra';
import { createACTestValidator, ACTestValidationResult } from './ac-test-validator.js';
import { parseTasksWithUSLinks, getAllTasks } from '../generators/spec/task-parser.js';
import chalk from 'chalk';

async function main() {
  // Parse arguments
  const incrementId = process.argv[2];

  if (!incrementId) {
    console.error(chalk.red('Error: Missing increment ID'));
    console.error(chalk.gray('Usage: node ac-test-validator-cli.js <increment-id>'));
    process.exit(2);
  }

  // Find project root
  const projectRoot = process.cwd();

  // Validate increment exists
  const incrementPath = path.join(projectRoot, '.specweave/increments', incrementId);
  if (!await fs.pathExists(incrementPath)) {
    console.error(chalk.red(`Error: Increment not found: ${incrementId}`));
    process.exit(2);
  }

  const tasksPath = path.join(incrementPath, 'tasks.md');
  if (!await fs.pathExists(tasksPath)) {
    console.error(chalk.red(`Error: tasks.md not found in ${incrementId}`));
    process.exit(2);
  }

  try {
    // Parse tasks
    console.log(chalk.blue('\n[AC Test Validator]') + ' Parsing tasks...');
    const tasksByUS = parseTasksWithUSLinks(tasksPath);
    const tasks = getAllTasks(tasksByUS);

    // Filter tasks being marked complete (looking for recently modified tasks)
    // For now, validate ALL tasks with ACs
    const tasksToValidate = tasks.filter(t => {
      return t.satisfiesACs && t.satisfiesACs.length > 0 && t.status === 'completed';
    });

    if (tasksToValidate.length === 0) {
      console.log(chalk.yellow('No completed tasks with Acceptance Criteria to validate.'));
      process.exit(0);
    }

    console.log(chalk.blue(`Found ${tasksToValidate.length} completed task(s) with ACs to validate\n`));

    // Create validator
    const validator = await createACTestValidator(projectRoot);

    // Validate each task
    const results: ACTestValidationResult[] = [];
    let allPassed = true;

    for (const task of tasksToValidate) {
      console.log(chalk.bold(`\nValidating ${task.id}: ${task.title}`));

      const result = await validator.validateTask(task, projectRoot);
      results.push(result);

      // Display formatted result
      console.log(validator.formatResult(result));

      if (!result.passed) {
        allPassed = false;
      }
    }

    // Overall summary
    console.log(chalk.bold('\n' + '='.repeat(60)));
    console.log(chalk.bold('OVERALL VALIDATION SUMMARY'));
    console.log('='.repeat(60));

    const totalTasks = results.length;
    const passedTasks = results.filter(r => r.passed).length;
    const failedTasks = totalTasks - passedTasks;

    console.log(`Tasks Validated: ${totalTasks}`);
    console.log(`Passed: ${chalk.green(passedTasks)}`);
    console.log(`Failed: ${chalk.red(failedTasks)}`);

    const totalACs = results.reduce((sum, r) => sum + r.summary.totalACs, 0);
    const acsPassed = results.reduce((sum, r) => sum + r.summary.acsTested, 0);
    const acsFailed = totalACs - acsPassed;

    console.log(`\nTotal ACs: ${totalACs}`);
    console.log(`ACs with Passing Tests: ${chalk.green(acsPassed)}`);
    console.log(`ACs with Failing Tests: ${chalk.red(acsFailed)}`);

    console.log('='.repeat(60));

    if (allPassed) {
      console.log(chalk.green.bold('\n✓ ALL VALIDATIONS PASSED\n'));
      console.log(chalk.green('All Acceptance Criteria have passing tests.'));
      console.log(chalk.green('Task completion allowed.\n'));
      process.exit(0);
    } else {
      console.log(chalk.red.bold('\n✗ VALIDATION FAILED\n'));
      console.log(chalk.red('Some Acceptance Criteria have failing or missing tests.'));
      console.log(chalk.red('Task completion blocked until all tests pass.\n'));
      console.log(chalk.yellow('Fix the failing tests and try again.'));
      console.log(chalk.gray('Run tests manually: npm test\n'));
      process.exit(1);
    }

  } catch (error: any) {
    console.error(chalk.red('\nValidation Error:'));
    console.error(chalk.red(error.message));

    if (error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }

    process.exit(2);
  }
}

// Run CLI
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(2);
});
