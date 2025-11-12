#!/usr/bin/env node

/**
 * CLI command to validate parent repo setup
 *
 * Usage: specweave validate-parent-repo
 */

import { validateParentRepoSetup, printValidationResult } from '../../core/cicd/parent-repo-validator';

function main() {
  const projectRoot = process.cwd();

  const result = validateParentRepoSetup(projectRoot);
  printValidationResult(result);

  process.exit(result.valid ? 0 : 1);
}

main();
