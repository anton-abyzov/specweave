/**
 * Health Command
 *
 * Lightweight deployment verification for SpecWeave projects.
 * Checks config validity, plugin availability, and sync connectivity.
 * Designed for CI/CD pipeline integration with --json flag.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CheckResult, CategoryResult, CheckStatus } from '../../core/doctor/types.js';
import { calculateOverallStatus } from '../../core/doctor/types.js';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface HealthReport {
  timestamp: string;
  projectRoot: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  categories: CategoryResult[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failures: number;
  };
}

export interface HealthOptions {
  json?: boolean;
  verbose?: boolean;
}

/**
 * Run health checks and return report
 */
export async function runHealthCheck(
  projectRoot: string,
  options: HealthOptions = {}
): Promise<HealthReport> {
  const categories: CategoryResult[] = [];

  // 1. Config validity
  categories.push(checkConfig(projectRoot));

  // 2. Plugin availability
  categories.push(checkPlugins());

  // 3. Sync connectivity
  categories.push(await checkSyncConnectivity(projectRoot));

  const summary = calculateHealthSummary(categories);
  const status = summary.failures > 0 ? 'unhealthy' : summary.warnings > 0 ? 'degraded' : 'healthy';

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    projectRoot,
    status,
    categories,
    summary,
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatHealthReport(report, options.verbose));
  }

  return report;
}

// --- Config Checks ---

function checkConfig(projectRoot: string): CategoryResult {
  const checks: CheckResult[] = [];
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  // config.json exists and is valid JSON
  if (!fs.existsSync(configPath)) {
    checks.push({
      name: 'config.json',
      status: 'fail',
      message: 'missing — run: specweave init',
    });
  } else {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);

      checks.push({
        name: 'config.json',
        status: 'pass',
        message: 'valid JSON',
      });

      // Required fields
      if (!config.version) {
        checks.push({ name: 'config.version', status: 'warn', message: 'missing version field' });
      } else {
        checks.push({ name: 'config.version', status: 'pass', message: `v${config.version}` });
      }

      if (!config.project?.name) {
        checks.push({ name: 'config.project', status: 'warn', message: 'missing project name' });
      } else {
        checks.push({ name: 'config.project', status: 'pass', message: config.project.name });
      }
    } catch (e) {
      checks.push({
        name: 'config.json',
        status: 'fail',
        message: `invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`,
      });
    }
  }

  return {
    category: 'Configuration',
    status: calculateOverallStatus(checks),
    checks,
  };
}

// --- Plugin Checks ---

function checkPlugins(): CategoryResult {
  const checks: CheckResult[] = [];
  const homeDir = os.homedir();

  // Core plugin cache
  const cacheDir = path.join(homeDir, '.claude', 'plugins', 'cache', 'specweave', 'sw');
  if (!fs.existsSync(cacheDir)) {
    checks.push({
      name: 'Core plugin (sw)',
      status: 'warn',
      message: 'not cached — plugins load on first use',
    });
  } else {
    const versions = fs.readdirSync(cacheDir).filter(d =>
      fs.statSync(path.join(cacheDir, d)).isDirectory()
    );
    checks.push({
      name: 'Core plugin (sw)',
      status: 'pass',
      message: `cached (${versions.length} version(s))`,
      details: versions.slice(0, 3),
    });
  }

  // Marketplace availability
  const marketplaceDir = path.join(homeDir, '.claude', 'plugins', 'marketplaces', 'specweave', 'plugins');
  if (!fs.existsSync(marketplaceDir)) {
    checks.push({
      name: 'Marketplace',
      status: 'warn',
      message: 'not installed',
      fixSuggestion: 'Run: specweave update',
    });
  } else {
    try {
      const plugins = fs.readdirSync(marketplaceDir);
      checks.push({
        name: 'Marketplace',
        status: 'pass',
        message: `${plugins.length} plugin(s) available`,
      });
    } catch {
      checks.push({ name: 'Marketplace', status: 'warn', message: 'could not read' });
    }
  }

  return {
    category: 'Plugins',
    status: calculateOverallStatus(checks),
    checks,
  };
}

// --- Sync Connectivity Checks ---

async function checkSyncConnectivity(projectRoot: string): Promise<CategoryResult> {
  const checks: CheckResult[] = [];
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  let config: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch {
    checks.push({ name: 'Sync config', status: 'fail', message: 'could not parse config' });
    return { category: 'Sync Connectivity', status: 'fail', checks };
  }

  const sync = config.sync as Record<string, unknown> | undefined;
  if (!sync?.enabled) {
    checks.push({ name: 'Sync', status: 'skip', message: 'sync not enabled' });
    return { category: 'Sync Connectivity', status: calculateOverallStatus(checks), checks };
  }

  // JIRA connectivity
  const issueTracker = config.issueTracker as Record<string, unknown> | undefined;
  const profiles = sync.profiles as Record<string, Record<string, unknown>> | undefined;
  const defaultProfile = sync.defaultProfile as string | undefined;
  const profileConfig = (defaultProfile ? profiles?.[defaultProfile]?.config : undefined) as Record<string, string> | undefined;

  if (issueTracker?.provider === 'jira' || sync.provider === 'jira') {
    const domain = (issueTracker?.domain as string) || profileConfig?.domain || process.env.JIRA_DOMAIN || '';
    const email = process.env.JIRA_EMAIL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';

    if (!domain) {
      checks.push({ name: 'JIRA domain', status: 'fail', message: 'not configured' });
    } else if (!email || !apiToken) {
      checks.push({
        name: 'JIRA credentials',
        status: 'warn',
        message: 'JIRA_EMAIL or JIRA_API_TOKEN not set in environment',
        fixSuggestion: 'Export JIRA_EMAIL and JIRA_API_TOKEN or add to .env',
      });
    } else {
      // Probe JIRA API
      const probeResult = await probeJira(domain, email, apiToken);
      checks.push(probeResult);
    }
  }

  // GitHub connectivity
  if (sync.github && (sync.github as Record<string, unknown>).enabled) {
    const ghResult = await probeGitHub();
    checks.push(ghResult);
  }

  if (checks.length === 0) {
    checks.push({ name: 'Sync providers', status: 'skip', message: 'no providers configured' });
  }

  return {
    category: 'Sync Connectivity',
    status: calculateOverallStatus(checks),
    checks,
  };
}

async function probeJira(domain: string, email: string, apiToken: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const url = `https://${domain}/rest/api/3/myself`;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const resp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    const durationMs = Date.now() - start;

    if (resp.ok) {
      const data = await resp.json() as { displayName?: string };
      return {
        name: 'JIRA',
        status: 'pass',
        message: `connected as ${data.displayName || email}`,
        durationMs,
      };
    }

    return {
      name: 'JIRA',
      status: 'fail',
      message: `HTTP ${resp.status}: ${resp.statusText}`,
      durationMs,
    };
  } catch (e) {
    return {
      name: 'JIRA',
      status: 'fail',
      message: `unreachable: ${e instanceof Error ? e.message : 'unknown error'}`,
      durationMs: Date.now() - start,
    };
  }
}

async function probeGitHub(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { execSync } = await import('child_process');
    const output = execSync('gh auth status 2>&1', { encoding: 'utf8', timeout: 5000 });
    const durationMs = Date.now() - start;

    if (output.includes('Logged in')) {
      return { name: 'GitHub', status: 'pass', message: 'authenticated via gh CLI', durationMs };
    }
    return { name: 'GitHub', status: 'warn', message: 'gh CLI present but not authenticated', durationMs };
  } catch {
    return {
      name: 'GitHub',
      status: 'warn',
      message: 'gh CLI not available or not authenticated',
      durationMs: Date.now() - start,
    };
  }
}

// --- Formatting ---

function calculateHealthSummary(categories: CategoryResult[]): HealthReport['summary'] {
  let total = 0, passed = 0, warnings = 0, failures = 0;
  for (const cat of categories) {
    for (const check of cat.checks) {
      total++;
      if (check.status === 'pass') passed++;
      else if (check.status === 'warn') warnings++;
      else if (check.status === 'fail') failures++;
    }
  }
  return { total, passed, warnings, failures };
}

function getIcon(status: CheckStatus): string {
  switch (status) {
    case 'pass': return '\u2713';
    case 'warn': return '\u26A0';
    case 'fail': return '\u2717';
    case 'skip': return '\u2022';
    default: return '?';
  }
}

function formatHealthReport(report: HealthReport, verbose = false): string {
  const lines: string[] = [''];
  const statusLabel = report.status === 'healthy' ? '\u2713 Healthy'
    : report.status === 'degraded' ? '\u26A0 Degraded'
    : '\u2717 Unhealthy';

  lines.push(`SpecWeave Health: ${statusLabel}`);
  lines.push('='.repeat(40));
  lines.push('');

  for (const cat of report.categories) {
    lines.push(`${getIcon(cat.status)} ${cat.category}`);
    for (const check of cat.checks) {
      const dur = check.durationMs ? ` (${check.durationMs}ms)` : '';
      lines.push(`  ${getIcon(check.status)} ${check.name}: ${check.message}${dur}`);
      if (verbose && check.details?.length) {
        for (const d of check.details) lines.push(`      ${d}`);
      }
      if (verbose && check.fixSuggestion) {
        lines.push(`      Fix: ${check.fixSuggestion}`);
      }
    }
    lines.push('');
  }

  const { passed, warnings, failures } = report.summary;
  lines.push(`${passed} passed, ${warnings} warning(s), ${failures} failure(s)`);

  // Diagnostic details for failures
  if (failures > 0) {
    lines.push('');
    lines.push('Diagnostics:');
    for (const cat of report.categories) {
      for (const check of cat.checks) {
        if (check.status === 'fail') {
          lines.push(`  ${cat.category}/${check.name}: ${check.message}`);
          if (check.fixSuggestion) {
            lines.push(`    Fix: ${check.fixSuggestion}`);
          }
        }
      }
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Register health command on Commander program
 */
export function registerHealthCommand(program: Command): void {
  program
    .command('health')
    .description('Quick deployment health check (config, plugins, sync connectivity)')
    .option('--json', 'Output as JSON for CI/CD pipelines')
    .option('--verbose', 'Show detailed output')
    .action(async (options: Record<string, unknown>) => {
      try {
        const report = await runHealthCheck(process.cwd(), {
          json: options.json as boolean,
          verbose: options.verbose as boolean,
        });

        if (report.status === 'unhealthy') {
          process.exit(1);
        }
      } catch (error) {
        logger.error(`Health check failed: ${error}`);
        process.exit(1);
      }
    });
}
