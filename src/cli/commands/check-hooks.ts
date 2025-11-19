#!/usr/bin/env node

/**
 * Check Hooks CLI Command
 *
 * Runs hook health check from command line.
 * Supports various output formats and auto-fix mode.
 *
 * Part of increment 0037: Hook Health Check System
 */

import { HookHealthChecker } from '../../core/hooks/HookHealthChecker.js';
import { HealthReporter } from '../../core/hooks/HealthReporter.js';
import { HookAutoFixer } from '../../core/hooks/HookAutoFixer.js';
import { ReportFormat } from '../../core/hooks/types.js';
import { Logger, consoleLogger } from '../../utils/logger.js';

// NOTE: This CLI check-hooks command is primarily user-facing output (console.log/console.error).
// All console.* calls in this file are legitimate user-facing exceptions
// as defined in CONTRIBUTING.md (health check results, auto-fix status, warnings).
// Logger infrastructure available for future internal debug logs if needed.

interface CommandOptions {
  fix: boolean;
  critical: boolean;
  verbose: boolean;
  format: ReportFormat;
  output?: string;
  timeout: number;
  failOnWarnings: boolean;
  hookName?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CommandOptions {
  const options: CommandOptions = {
    fix: false,
    critical: false,
    verbose: false,
    format: 'console',
    timeout: 5000,
    failOnWarnings: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--fix':
        options.fix = true;
        break;
      case '--critical':
        options.critical = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--format':
        options.format = args[++i] as ReportFormat;
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i], 10);
        break;
      case '--fail-on-warnings':
        options.failOnWarnings = true;
        break;
      default:
        // Assume it's a hook name
        if (!arg.startsWith('--')) {
          options.hookName = arg;
        }
    }
  }

  return options;
}

/**
 * Main command execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  const projectRoot = process.cwd();

  try {
    // Create health checker
    const config = HookHealthChecker.createDefaultConfig(projectRoot);
    config.autoFix = options.fix;
    config.verbose = options.verbose;
    config.criticalOnly = options.critical;
    config.timeout = options.timeout;
    config.failOnWarnings = options.failOnWarnings;

    if (options.hookName) {
      config.hooksToCheck = [options.hookName];
    }

    const checker = new HookHealthChecker(config);

    // Run health check
    console.log('🏥 Running hook health check...\n');
    const result = await checker.checkAllHooks();

    // Auto-fix if requested
    if (options.fix && result.failedHooks > 0) {
      console.log('\n🔧 Attempting auto-fix...\n');

      const fixer = new HookAutoFixer(projectRoot);
      const fixResult = await fixer.fixBatch(result.results.filter(r => !r.success));

      console.log(`✅ Fixed ${fixResult.successfulFixes}/${fixResult.totalFixes} issues`);

      if (fixResult.manualFixRequired.length > 0) {
        console.log(`⚠️  Manual fix required for: ${fixResult.manualFixRequired.join(', ')}`);
      }

      // Re-run health check to verify fixes
      if (fixResult.successfulFixes > 0) {
        console.log('\n🔄 Re-running health check...\n');
        const recheck = await checker.checkAllHooks();

        // Generate report for re-check
        const reportOptions = HealthReporter.createDefaultOptions(options.format);
        reportOptions.detailed = options.verbose;
        reportOptions.outputPath = options.output;

        const report = await HealthReporter.generateReport(recheck, reportOptions);

        if (!options.output) {
          console.log(report);
        }

        // Exit with appropriate code
        process.exit(getExitCode(recheck, options.failOnWarnings));
      }
    }

    // Generate report
    const reportOptions = HealthReporter.createDefaultOptions(options.format);
    reportOptions.detailed = options.verbose;
    reportOptions.outputPath = options.output;

    const report = await HealthReporter.generateReport(result, reportOptions);

    if (!options.output) {
      console.log(report);
    } else {
      console.log(`\n✅ Report written to: ${options.output}`);
    }

    // Exit with appropriate code
    process.exit(getExitCode(result, options.failOnWarnings));
  } catch (error) {
    console.error('❌ Error running hook health check:', error);
    process.exit(1);
  }
}

/**
 * Get exit code based on results
 */
function getExitCode(result: any, failOnWarnings: boolean): number {
  if (result.criticalFailures > 0) {
    return 2; // Critical failures
  }

  if (result.failedHooks > 0) {
    return 1; // Non-critical failures
  }

  if (failOnWarnings && result.summary.slowHooks.length > 0) {
    return 1; // Warnings treated as failures
  }

  return 0; // Success
}

// Run if called directly (check if module is main)
const isMainModule = require.main === module || process.argv[1]?.includes('check-hooks');
if (isMainModule) {
  main();
}
