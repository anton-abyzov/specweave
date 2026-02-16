/**
 * CLI command: specweave judge-skill <file>
 *
 * Combined Tier 1 (pattern scan) + Tier 2 (LLM judge) security analysis.
 * If Tier 1 finds critical/high findings, verdict is BLOCKED (LLM skipped).
 * If Tier 1 passes, Tier 2 LLM judge analyzes for semantic threats.
 */

import * as fs from 'fs';
import chalk from 'chalk';
import { scanSkillContent } from '../../core/fabric/security-scanner.js';
import { SecurityJudge } from '../../core/fabric/security-judge.js';

interface JudgeSkillOptions {
  json?: boolean;
  model?: string;
  scanOnly?: boolean;
}

export async function judgeSkillCommand(filePath: string, options: JudgeSkillOptions = {}): Promise<void> {
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`Error: File not found: ${filePath}`));
    process.exit(1);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Tier 1: Pattern scan
  const tier1 = scanSkillContent(content);

  // If Tier 1 has critical/high findings → BLOCKED, skip LLM
  if (!tier1.passed) {
    if (options.json) {
      console.log(JSON.stringify({
        file: filePath,
        verdict: 'BLOCKED',
        tier1,
        tier2: null,
      }, null, 2));
    } else {
      console.log('');
      console.log(chalk.bold(`  Judging: ${filePath}`));
      console.log(chalk.dim('  ─'.repeat(30)));
      printTier1(tier1);
      console.log('');
      console.log(chalk.red.bold('  BLOCKED') + ' — Tier 1 critical/high findings, LLM analysis skipped');
      console.log('');
    }
    process.exit(1);
    return;
  }

  // --scan-only: skip LLM
  if (options.scanOnly) {
    if (options.json) {
      console.log(JSON.stringify({
        file: filePath,
        verdict: tier1.findings.length > 0 ? 'CONCERNS' : 'PASS',
        tier1,
        tier2: null,
      }, null, 2));
    } else {
      console.log('');
      console.log(chalk.bold(`  Scanning: ${filePath}`));
      console.log(chalk.dim('  ─'.repeat(30)));
      if (tier1.findings.length === 0) {
        console.log(chalk.green.bold('\n  PASSED — No Tier 1 findings\n'));
      } else {
        printTier1(tier1);
        console.log(chalk.yellow.bold('\n  CONCERNS') + chalk.dim(` — ${tier1.findings.length} minor finding(s)\n`));
      }
    }
    return;
  }

  // Tier 2: LLM Judge
  const judge = new SecurityJudge({
    projectRoot: process.cwd(),
    ...(options.model ? { model: options.model } : {}),
  });

  const tier2 = await judge.judge(content);

  // JSON output
  if (options.json) {
    console.log(JSON.stringify({
      file: filePath,
      verdict: tier2.verdict,
      tier1,
      tier2,
    }, null, 2));
    if (tier2.verdict === 'FAIL') process.exit(1);
    return;
  }

  // Human-readable
  console.log('');
  console.log(chalk.bold(`  Judging: ${filePath}`));
  console.log(chalk.dim('  ─'.repeat(30)));

  // Tier 1 summary
  if (tier1.findings.length > 0) {
    console.log(chalk.dim(`\n  Tier 1 (patterns): ${tier1.findings.length} finding(s)`));
  } else {
    console.log(chalk.dim('\n  Tier 1 (patterns): clean'));
  }

  // Tier 2 details
  console.log(chalk.dim(`  Tier 2 (LLM): ${tier2.summary}`));

  if (tier2.threats.length > 0) {
    console.log('');
    for (const t of tier2.threats) {
      const sevColor = t.severity === 'critical' ? chalk.bgRed.white.bold
        : t.severity === 'high' ? chalk.red.bold
        : chalk.yellow;
      console.log(`    ${sevColor(` ${t.severity.toUpperCase()} `)} ${t.description} ${chalk.dim(`[${t.category}]`)}`);
      if (t.evidence) {
        console.log(chalk.dim(`      "${t.evidence}"`));
      }
    }
  }

  if (tier2.mitigations.length > 0) {
    console.log(chalk.dim('\n  Suggested mitigations:'));
    for (const m of tier2.mitigations) {
      console.log(chalk.dim(`    • ${m}`));
    }
  }

  console.log('');
  console.log(chalk.dim('  ─'.repeat(30)));

  const verdictColor = tier2.verdict === 'PASS' ? chalk.green.bold
    : tier2.verdict === 'FAIL' ? chalk.red.bold
    : chalk.yellow.bold;
  console.log(`  ${verdictColor(tier2.verdict)} — Score: ${tier2.score}/100 ${chalk.dim(`(${tier2.duration_ms}ms)`)}`);
  console.log('');

  if (tier2.verdict === 'FAIL') process.exit(1);
}

function printTier1(tier1: ReturnType<typeof scanSkillContent>): void {
  const SEVERITY_COLORS: Record<string, (s: string) => string> = {
    critical: chalk.bgRed.white.bold,
    high: chalk.red.bold,
    medium: chalk.yellow,
    low: chalk.blue,
    info: chalk.dim,
  };

  const bySeverity: Record<string, typeof tier1.findings> = {};
  for (const f of tier1.findings) {
    if (!bySeverity[f.severity]) bySeverity[f.severity] = [];
    bySeverity[f.severity].push(f);
  }

  for (const sev of ['critical', 'high', 'medium', 'low', 'info']) {
    const findings = bySeverity[sev];
    if (!findings) continue;
    const colorFn = SEVERITY_COLORS[sev] || chalk.white;
    console.log(`\n  ${colorFn(` ${sev.toUpperCase()} `)} (${findings.length})`);
    for (const f of findings) {
      const lineInfo = f.line ? chalk.dim(`:${f.line}`) : '';
      console.log(`    ${chalk.dim('•')} ${f.message} ${chalk.dim(`[${f.category}]`)}${lineInfo}`);
    }
  }
}
