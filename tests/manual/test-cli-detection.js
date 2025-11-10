#!/usr/bin/env node
/**
 * Test script to demonstrate Claude CLI detection improvements
 *
 * Run with: node test-cli-detection.js
 * Debug mode: DEBUG=true node test-cli-detection.js
 */

import { detectClaudeCli, getClaudeCliDiagnostic, getClaudeCliSuggestions } from './dist/utils/claude-cli-detector.js';
import chalk from 'chalk';

console.log(chalk.cyan.bold('\n🔍 Claude CLI Detection Test\n'));

const status = detectClaudeCli();

console.log(chalk.white('Detection Results:'));
console.log(chalk.gray(`  Available: ${status.available}`));
console.log(chalk.gray(`  Command exists: ${status.commandExists}`));
console.log(chalk.gray(`  Plugin commands work: ${status.pluginCommandsWork}`));
if (status.version) {
  console.log(chalk.gray(`  Version: ${status.version}`));
}
if (status.commandPath) {
  console.log(chalk.gray(`  Path: ${status.commandPath}`));
}
if (status.error) {
  console.log(chalk.gray(`  Error: ${status.error}`));
}
if (status.exitCode !== undefined) {
  console.log(chalk.gray(`  Exit code: ${status.exitCode}`));
}
console.log();

if (!status.available) {
  const diagnostic = getClaudeCliDiagnostic(status);
  const suggestions = getClaudeCliSuggestions(status);

  console.log(chalk.yellow.bold('⚠️  Issue Detected\n'));
  console.log(chalk.white('Diagnostic:'));
  console.log(chalk.gray(`  ${diagnostic}`));
  console.log();

  console.log(chalk.cyan('💡 Suggestions:\n'));
  suggestions.forEach(suggestion => {
    console.log(chalk.gray(`   ${suggestion}`));
  });
  console.log();
} else {
  console.log(chalk.green.bold('✅ Claude CLI is ready to use!\n'));
}
