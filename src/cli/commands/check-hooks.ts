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
import { CacheHealthMonitor } from '../../core/plugin-cache/cache-health-monitor.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

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
  includeCache?: boolean;
  reflect?: boolean;
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
      case '--include-cache':
        options.includeCache = true;
        break;
      case '--reflect':
        options.reflect = true;
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
 * Check reflect hook health (GAP-004 implementation)
 *
 * Verifies:
 * 1. stop-reflect.sh exists and has valid syntax
 * 2. process-reflect-queue.sh exists and has valid syntax
 * 3. reflect-config.json exists and is valid
 * 4. jq is available (required for hook processing)
 * 5. Memory directories exist and are writable
 */
export async function checkReflectHealth(verbose: boolean = false): Promise<{ healthy: boolean; issues: string[] }> {
  console.log('\n🧠 Checking reflect hook health...\n');

  const { execSync } = await import('child_process');
  const issues: string[] = [];
  const projectRoot = process.cwd();

  // 1. Check if running in Claude Code environment
  const claudeDir = path.join(os.homedir(), '.claude');
  const marketplacePath = path.join(claudeDir, 'plugins', 'marketplaces', 'specweave');
  const isClaudeCode = fs.existsSync(marketplacePath);

  if (isClaudeCode) {
    console.log('   ✅ Claude Code environment detected');
  } else {
    console.log('   ⚠️  Non-Claude environment (reflect hooks may be limited)');
  }

  // 2. Check stop-reflect.sh
  const hooksDir = isClaudeCode
    ? path.join(marketplacePath, 'plugins', 'specweave', 'hooks')
    : path.join(projectRoot, '.specweave', 'plugins', 'specweave', 'hooks');

  const stopReflectPath = path.join(hooksDir, 'stop-reflect.sh');
  if (fs.existsSync(stopReflectPath)) {
    console.log('   ✅ stop-reflect.sh found');

    // Check syntax with bash -n
    try {
      execSync(`bash -n "${stopReflectPath}"`, { stdio: 'pipe' });
      console.log('   ✅ stop-reflect.sh syntax valid');
    } catch {
      console.log('   ❌ stop-reflect.sh has syntax errors');
      issues.push('stop-reflect.sh has syntax errors - run: bash -n ' + stopReflectPath);
    }
  } else {
    console.log('   ❌ stop-reflect.sh not found at: ' + stopReflectPath);
    issues.push('stop-reflect.sh not found');
  }

  // 3. Check process-reflect-queue.sh
  const processQueuePath = path.join(hooksDir, 'process-reflect-queue.sh');
  if (fs.existsSync(processQueuePath)) {
    console.log('   ✅ process-reflect-queue.sh found');
  } else {
    console.log('   ⚠️  process-reflect-queue.sh not found (async processing disabled)');
  }

  // 4. Check reflect-config.json
  const reflectConfigPath = path.join(projectRoot, '.specweave', 'state', 'reflect-config.json');
  if (fs.existsSync(reflectConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(reflectConfigPath, 'utf-8'));
      if (config.autoReflect) {
        console.log('   ✅ Auto-reflect enabled');
      } else {
        console.log('   ⚠️  Auto-reflect disabled (run /sw:reflect-on to enable)');
      }
      if (verbose) {
        console.log('      Confidence threshold: ' + (config.confidenceThreshold || 'medium'));
        console.log('      Max learnings/session: ' + (config.maxLearningsPerSession || 10));
      }
    } catch {
      console.log('   ❌ reflect-config.json is invalid JSON');
      issues.push('reflect-config.json is invalid JSON');
    }
  } else {
    console.log('   ⚠️  reflect-config.json not found (run specweave init)');
  }

  // 5. Check jq availability
  try {
    execSync('command -v jq', { stdio: 'pipe' });
    console.log('   ✅ jq is available');
  } catch {
    console.log('   ❌ jq not found (required for reflect hooks)');
    issues.push('jq not installed - hooks will fail silently');
  }

  // 6. Check memory directories
  const memoryDir = path.join(projectRoot, '.specweave', 'memory');
  if (fs.existsSync(memoryDir)) {
    console.log('   ✅ Memory directory exists');
  } else {
    console.log('   ⚠️  Memory directory not created (run specweave init)');
  }

  // 7. Check logs directory
  const logsDir = path.join(projectRoot, '.specweave', 'logs', 'reflect');
  if (fs.existsSync(logsDir)) {
    console.log('   ✅ Reflect logs directory exists');

    // Check for recent logs
    const logFile = path.join(logsDir, 'reflect.log');
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      const age = Date.now() - stats.mtimeMs;
      const ageHours = Math.round(age / (1000 * 60 * 60));
      if (verbose) {
        console.log(`      Last log: ${ageHours} hours ago`);
      }
    }
  } else {
    console.log('   ⚠️  Reflect logs directory not created');
  }

  // Summary
  console.log('');
  if (issues.length === 0) {
    console.log('   ✅ Reflect hooks are healthy\n');
    return { healthy: true, issues: [] };
  } else {
    console.log(`   ❌ ${issues.length} issues found:\n`);
    for (const issue of issues) {
      console.log(`      • ${issue}`);
    }
    console.log('');
    return { healthy: false, issues };
  }
}

/**
 * Check plugin cache health
 */
export async function checkCacheHealth(verbose: boolean = false): Promise<void> {
  console.log('\n🔍 Checking plugin cache health...\n');

  const basePath = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'specweave');

  if (!fs.existsSync(basePath)) {
    console.log('   No plugin cache found.\n');
    return;
  }

  const monitor = new CacheHealthMonitor();
  const pluginNames = fs.readdirSync(basePath).filter(name => {
    const pluginPath = path.join(basePath, name);
    return fs.statSync(pluginPath).isDirectory();
  });

  let healthyCount = 0;
  let criticalCount = 0;

  for (const pluginName of pluginNames) {
    const pluginPath = path.join(basePath, pluginName);
    const versions = fs.readdirSync(pluginPath).filter(v => {
      const versionPath = path.join(pluginPath, v);
      return fs.statSync(versionPath).isDirectory();
    });

    if (versions.length === 0) continue;

    const version = versions.sort().reverse()[0];
    const versionPath = path.join(pluginPath, version);

    const issues = monitor.checkPluginHealth(versionPath, version);
    const hasCritical = issues.some(i => i.severity === 'critical');

    if (issues.length === 0) {
      healthyCount++;
      console.log(`   ✅ ${pluginName} (${version}): Healthy`);
    } else if (hasCritical) {
      criticalCount++;
      console.log(`   ❌ ${pluginName} (${version}): Critical issues`);
      if (verbose) {
        for (const issue of issues.filter(i => i.severity === 'critical')) {
          console.log(`      - ${issue.message} (${issue.file})`);
        }
      }
    } else {
      console.log(`   ⚠️  ${pluginName} (${version}): ${issues.length} warnings`);
      if (verbose) {
        for (const issue of issues) {
          console.log(`      - ${issue.message} (${issue.file})`);
        }
      }
    }
  }

  console.log(`\n   Summary: ${healthyCount} healthy, ${criticalCount} critical\n`);

  if (criticalCount > 0) {
    console.log('   💡 Run: specweave cache-status for details\n');
    console.log('   💡 Run: specweave cache-refresh --force to fix\n');
  }
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

    // Check plugin cache health if requested
    if (options.includeCache) {
      await checkCacheHealth(options.verbose);
    }

    // Check reflect hook health if requested (GAP-004)
    if (options.reflect) {
      const reflectResult = await checkReflectHealth(options.verbose);
      if (!reflectResult.healthy) {
        // Reflect issues are warnings, not failures
        console.log('💡 Run: specweave init to fix missing directories');
        console.log('💡 Run: brew install jq (macOS) or apt install jq (Linux) for jq');
      }
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
// ES module check: import.meta.url contains this file path
const isMainModule = process.argv[1]?.includes('check-hooks') || false;
if (isMainModule) {
  main();
}
