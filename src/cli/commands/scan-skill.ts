/**
 * CLI command: specweave scan-skill <file>
 * Scans a skill file for security issues using the Fabric security scanner.
 */

import * as fs from 'fs';
import chalk from 'chalk';
import { scanSkillContent } from '../../core/fabric/security-scanner.js';

interface ScanSkillOptions {
  json?: boolean;
}

const SEVERITY_COLORS: Record<string, (s: string) => string> = {
  critical: chalk.bgRed.white.bold,
  high: chalk.red.bold,
  medium: chalk.yellow,
  low: chalk.blue,
  info: chalk.dim,
};

export async function scanSkillCommand(filePath: string, options: ScanSkillOptions = {}): Promise<void> {
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`Error: File not found: ${filePath}`));
    process.exit(1);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const result = scanSkillContent(content);

  // JSON output mode
  if (options.json) {
    console.log(JSON.stringify({ ...result, file: filePath }, null, 2));
    if (!result.passed) process.exit(1);
    return;
  }

  // Human-readable output
  console.log('');
  console.log(chalk.bold(`  Scanning: ${filePath}`));
  console.log(chalk.dim('  ─'.repeat(30)));

  if (result.findings.length === 0) {
    console.log(chalk.green.bold('\n  PASSED — No findings\n'));
    return;
  }

  // Group findings by severity
  const bySeverity: Record<string, typeof result.findings> = {};
  for (const f of result.findings) {
    if (!bySeverity[f.severity]) bySeverity[f.severity] = [];
    bySeverity[f.severity].push(f);
  }

  const order = ['critical', 'high', 'medium', 'low', 'info'];
  for (const sev of order) {
    const findings = bySeverity[sev];
    if (!findings) continue;

    const colorFn = SEVERITY_COLORS[sev] || chalk.white;
    console.log(`\n  ${colorFn(` ${sev.toUpperCase()} `)} (${findings.length})`);

    for (const f of findings) {
      const lineInfo = f.line ? chalk.dim(`:${f.line}`) : '';
      console.log(`    ${chalk.dim('•')} ${f.message} ${chalk.dim(`[${f.category}]`)}${lineInfo}`);
    }
  }

  console.log('');
  console.log(chalk.dim('  ─'.repeat(30)));

  if (result.passed) {
    console.log(chalk.green.bold('  PASSED') + chalk.dim(` — ${result.findings.length} finding(s), none critical/high`));
  } else {
    const critical = bySeverity['critical']?.length || 0;
    const high = bySeverity['high']?.length || 0;
    console.log(chalk.red.bold('  FAILED') + ` — ${critical} critical, ${high} high finding(s)`);
  }
  console.log('');

  if (!result.passed) process.exit(1);
}
