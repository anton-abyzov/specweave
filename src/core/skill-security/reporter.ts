/**
 * Report formatter for SKILL.md security scan results.
 */

import chalk from 'chalk';
import type { SkillFinding, SkillScanResult } from './scanner.js';

const SEVERITY_COLORS: Record<string, (s: string) => string> = {
  critical: chalk.bgRed.white.bold,
  high: chalk.red.bold,
  medium: chalk.yellow,
  low: chalk.blue,
  info: chalk.dim,
};

export interface BatchScanEntry {
  file: string;
  result: SkillScanResult;
}

/**
 * Print a human-readable scan report for a single file.
 */
export function printScanReport(file: string, result: SkillScanResult): void {
  console.log('');
  console.log(chalk.bold(`  Scanning: ${file}`));
  console.log(chalk.dim('  ' + '─'.repeat(50)));

  if (result.findings.length === 0) {
    console.log(chalk.green.bold('\n  PASSED — No findings\n'));
    return;
  }

  // Group by severity
  const bySeverity = groupBySeverity(result.findings);
  const order = ['critical', 'high', 'medium', 'low', 'info'];

  for (const sev of order) {
    const findings = bySeverity[sev];
    if (!findings?.length) continue;
    const colorFn = SEVERITY_COLORS[sev] || chalk.white;
    console.log(`\n  ${colorFn(` ${sev.toUpperCase()} `)} (${findings.length})`);
    for (const f of findings) {
      console.log(`    ${chalk.dim('•')} [${chalk.cyan(f.ruleId)}] ${f.message}`);
      console.log(`      ${chalk.dim(`line ${f.line}:`)} ${chalk.italic(f.matchedText.slice(0, 80))}`);
      console.log(`      ${chalk.dim('fix:')} ${f.suggestedFix}`);
    }
  }

  console.log('');
  console.log(chalk.dim('  ' + '─'.repeat(50)));

  const counts = getSeverityCounts(result.findings);
  if (result.passed) {
    const total = result.findings.length;
    console.log(chalk.yellow.bold('  CONCERNS') + chalk.dim(` — ${total} finding(s) (no critical/high)`));
  } else {
    console.log(chalk.red.bold('  FAILED') + ` — ${counts.critical} critical, ${counts.high} high finding(s)`);
  }
  console.log('');
}

/**
 * Print a batch scan summary table.
 */
export function printBatchReport(entries: BatchScanEntry[]): void {
  console.log('');
  console.log(chalk.bold('  Plugin Security Scan — Batch Report'));
  console.log(chalk.dim('  ' + '═'.repeat(70)));

  let totalFindings = 0;
  let failCount = 0;
  let warnCount = 0;
  let passCount = 0;

  for (const { file, result } of entries) {
    const counts = getSeverityCounts(result.findings);
    totalFindings += result.findings.length;

    const shortName = file.replace(/^.*plugins\//, '').replace(/\/SKILL\.md$/, '');
    const status = result.exitCode === 0
      ? chalk.green('PASS')
      : result.exitCode === 1
        ? chalk.yellow('WARN')
        : chalk.red('FAIL');

    const breakdown = result.findings.length === 0
      ? chalk.dim('no findings')
      : [
        counts.critical > 0 ? chalk.red(`${counts.critical}C`) : '',
        counts.high > 0 ? chalk.red(`${counts.high}H`) : '',
        counts.medium > 0 ? chalk.yellow(`${counts.medium}M`) : '',
        counts.low > 0 ? chalk.blue(`${counts.low}L`) : '',
      ].filter(Boolean).join(' ');

    console.log(`  ${status}  ${chalk.bold(shortName.padEnd(45))} ${breakdown}`);

    if (result.exitCode === 2) failCount++;
    else if (result.exitCode === 1) warnCount++;
    else passCount++;
  }

  console.log(chalk.dim('  ' + '─'.repeat(70)));
  console.log(
    `  ${chalk.green(`${passCount} pass`)}  ${chalk.yellow(`${warnCount} warn`)}  ${chalk.red(`${failCount} fail`)}` +
    chalk.dim(`  (${totalFindings} total findings across ${entries.length} skills)`),
  );
  console.log('');
}

/**
 * Serialize batch results to JSON for CI integration.
 */
export function toBatchJson(entries: BatchScanEntry[]): string {
  return JSON.stringify(
    entries.map(({ file, result }) => ({
      file,
      exitCode: result.exitCode,
      passed: result.passed,
      findings: result.findings,
      counts: getSeverityCounts(result.findings),
    })),
    null,
    2,
  );
}

function groupBySeverity(findings: SkillFinding[]): Record<string, SkillFinding[]> {
  const map: Record<string, SkillFinding[]> = {};
  for (const f of findings) {
    if (!map[f.severity]) map[f.severity] = [];
    map[f.severity].push(f);
  }
  return map;
}

function getSeverityCounts(findings: SkillFinding[]) {
  return {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    info: findings.filter(f => f.severity === 'info').length,
  };
}
