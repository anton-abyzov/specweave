/**
 * CLI commands for hook observability: log, health, ls.
 *
 * @module cli/commands/hooks-cmd
 */

import * as path from 'path';
import { HookLogger } from '../../core/hooks/hook-logger.js';
import { HookHealthTracker } from '../../core/hooks/hook-health-tracker.js';
import { HealthReporter } from '../../core/hooks/HealthReporter.js';
import { HookScanner } from '../../core/hooks/HookScanner.js';

function resolveLogsDir(cwd: string): string {
  return path.join(cwd, '.specweave', 'logs', 'hooks');
}

export interface HooksLogOptions {
  last?: number;
  blocksOnly?: boolean;
  errorsOnly?: boolean;
  hook?: string;
}

/**
 * `specweave hooks log` — show recent hook events.
 */
export async function hooksLogCommand(options: HooksLogOptions = {}): Promise<void> {
  const logsDir = resolveLogsDir(process.cwd());
  const logger = new HookLogger(logsDir);
  const limit = options.last ?? 20;

  const hookNames = options.hook ? [options.hook] : await logger.listHooks();

  if (hookNames.length === 0) {
    console.log('No hook logs found. Hooks will be logged after they execute.');
    return;
  }

  let allEntries: Array<Record<string, unknown>> = [];

  for (const hookName of hookNames) {
    const entries = await logger.readLogs(hookName, 200);
    for (const entry of entries) {
      allEntries.push({ ...entry, hookName: entry.hookName || hookName });
    }
  }

  // Sort by timestamp descending
  allEntries.sort((a, b) => {
    const ta = String(a.timestamp ?? '');
    const tb = String(b.timestamp ?? '');
    return tb.localeCompare(ta);
  });

  // Apply filters
  if (options.blocksOnly) {
    allEntries = allEntries.filter(
      (e) => e.status === 'warning' || (typeof e.error === 'string' && e.error.includes('[GUARD]')),
    );
  }
  if (options.errorsOnly) {
    allEntries = allEntries.filter(
      (e) => e.status === 'error' || (typeof e.error === 'string' && e.error.includes('[ERROR]')),
    );
  }

  // Limit
  allEntries = allEntries.slice(0, limit);

  if (allEntries.length === 0) {
    console.log('No matching hook events found.');
    return;
  }

  // Format as table
  console.log(`Hook Log (last ${allEntries.length} entries):`);
  console.log('─'.repeat(80));
  for (const entry of allEntries) {
    const ts = String(entry.timestamp ?? '').slice(11, 19) || '??:??:??';
    const hook = String(entry.hookName ?? 'unknown').padEnd(20);
    const status = String(entry.status ?? 'unknown');
    const icon =
      status === 'success' ? '✅' : status === 'warning' ? '🛡️' : status === 'error' ? '❌' : '❓';
    const dur = entry.duration != null ? `${entry.duration}ms` : '';
    const reason = entry.error ? ` ${String(entry.error).slice(0, 60)}` : '';
    console.log(`  ${ts}  ${icon} ${hook} ${status.padEnd(8)} ${dur.padStart(6)}${reason}`);
  }
}

export interface HooksHealthOptions {
  format?: 'console' | 'json';
}

/**
 * `specweave hooks health` — show hook health summary.
 */
export async function hooksHealthCommand(options: HooksHealthOptions = {}): Promise<void> {
  const logsDir = resolveLogsDir(process.cwd());
  const logger = new HookLogger(logsDir);
  const tracker = new HookHealthTracker(logger);

  const hookNames = await logger.listHooks();

  if (hookNames.length === 0) {
    console.log('No hook data available. Run some hooks first, then check health.');
    return;
  }

  // Build Map<hookName, entries[]> for the tracker
  const hooksMap = new Map<string, Awaited<ReturnType<typeof logger.readLogs>>>();
  for (const hookName of hookNames) {
    const entries = await logger.readLogs(hookName, 200);
    hooksMap.set(hookName, entries);
  }

  const healthResults = tracker.analyzeAll(hooksMap);

  if (options.format === 'json') {
    console.log(JSON.stringify(healthResults, null, 2));
    return;
  }

  // Console format using HealthReporter pattern
  console.log('Hook Health Report:');
  console.log('═'.repeat(60));
  for (const health of healthResults) {
    const icon =
      health.status === 'OK' ? '✅' : health.status === 'DEGRADED' ? '⚠️' : health.status === 'FAILED' ? '❌' : '❓';
    console.log(`  ${icon} ${String(health.hookName).padEnd(25)} ${health.status}`);
    if (health.successRate != null) {
      console.log(`     Success rate: ${(health.successRate * 100).toFixed(0)}%`);
    }
    if (health.recommendations && health.recommendations.length > 0) {
      for (const rec of health.recommendations) {
        console.log(`     → ${rec}`);
      }
    }
  }
}

/**
 * `specweave hooks ls` — list registered hooks.
 */
export async function hooksLsCommand(): Promise<void> {
  const cwd = process.cwd();
  const scanner = new HookScanner(cwd);

  const hooks = await scanner.scanHooks();

  if (!hooks || hooks.length === 0) {
    console.log('No hooks registered. Install a plugin with hooks to get started.');
    return;
  }

  // Group by trigger type
  const grouped: Record<string, typeof hooks> = {};
  for (const hook of hooks) {
    const trigger = hook.trigger || hook.event || 'unknown';
    if (!grouped[trigger]) grouped[trigger] = [];
    grouped[trigger].push(hook);
  }

  console.log('Registered Hooks:');
  console.log('═'.repeat(70));
  for (const [trigger, hookList] of Object.entries(grouped)) {
    console.log(`\n┌─ ${trigger} ${'─'.repeat(Math.max(0, 65 - trigger.length))}┐`);
    for (const hook of hookList) {
      const name = String(hook.name || hook.hookName || 'unnamed').padEnd(30);
      const plugin = String(hook.plugin || 'core').padEnd(15);
      const critical = hook.critical ? '⚡' : '  ';
      console.log(`│ ${critical} ${name} ${plugin} │`);
    }
    console.log(`└${'─'.repeat(68)}┘`);
  }
}
