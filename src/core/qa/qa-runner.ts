/**
 * QA Runner - Main orchestration logic for quality assessment
 *
 * @module qa/qa-runner
 * @since v0.8.0
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import * as path from 'path';
import {
  QAReport,
  QAMode,
  QAOptions,
  QualityAssessment,
  RuleBasedResult,
  QualityGateResult,
} from './types.js';
import { QualityGateDecider, DEFAULT_THRESHOLDS } from './quality-gate-decider.js';
import { RiskCalculator } from './risk-calculator.js';

/**
 * Run QA assessment on an increment
 *
 * @param incrementId - Increment ID to assess (e.g., "0008")
 * @param options - QA options (mode, flags)
 * @returns QA report with assessment results
 */
export async function runQA(
  incrementId: string,
  options: QAOptions = {}
): Promise<QAReport> {
  const startTime = Date.now();

  // Determine mode
  const mode = determineMode(options);

  console.log(chalk.blue.bold(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
  console.log(chalk.blue.bold(`QA ASSESSMENT: Increment ${incrementId}`));
  console.log(chalk.blue.bold(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));

  console.log(chalk.gray(`Mode: ${mode.toUpperCase()}`));
  console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

  // Resolve increment path (find directory starting with 4-digit ID)
  const incrementsDir = path.join(process.cwd(), '.specweave', 'increments');
  const incrementPath = resolveIncrementPath(incrementsDir, incrementId);

  if (!incrementPath) {
    throw new Error(`Increment ${incrementId} not found in ${incrementsDir}`);
  }

  // Step 1: Rule-based validation (always first, always free)
  const spinner = ora('Running rule-based validation (120 checks)...').start();
  const ruleBasedResult = await runRuleBasedValidation(incrementId, incrementPath);

  if (ruleBasedResult.passed) {
    spinner.succeed(chalk.green(`Rule-based validation passed (${ruleBasedResult.passedCount}/${ruleBasedResult.totalCount})`));
  } else {
    spinner.fail(chalk.red(`Rule-based validation failed (${ruleBasedResult.passedCount}/${ruleBasedResult.totalCount})`));

    // Show errors
    console.log(chalk.red('\n❌ Validation Errors:\n'));
    ruleBasedResult.errors.forEach((err, idx) => {
      console.log(chalk.red(`  ${idx + 1}. [${err.severity.toUpperCase()}] ${err.rule}`));
      console.log(chalk.gray(`     ${err.message}`));
      if (err.file) {
        console.log(chalk.gray(`     File: ${err.file}${err.line ? `:${err.line}` : ''}\n`));
      }
    });

    // If rule-based fails, stop here (don't waste AI tokens)
    if (!options.force) {
      console.log(chalk.yellow('\n💡 Fix validation errors before running AI assessment'));
      console.log(chalk.gray('   Use --force to run AI assessment anyway\n'));
      process.exit(1);
    }
  }

  // Step 2: AI Quality Assessment (skip if --no-ai)
  let specQuality: QualityAssessment | undefined;
  let tokenUsage = 0;
  let costUsd = 0;

  if (!options.noAi) {
    console.log(); // Blank line
    const aiSpinner = ora('Running AI quality assessment...').start();

    try {
      specQuality = await runAIQualityAssessment(incrementId, incrementPath, mode);
      tokenUsage = estimateTokenUsage(incrementPath);
      costUsd = calculateCost(tokenUsage);

      aiSpinner.succeed(chalk.green(`AI quality assessment complete (~${tokenUsage} tokens, ~$${costUsd.toFixed(3)})`));
    } catch (error) {
      aiSpinner.fail(chalk.red('AI quality assessment failed'));
      console.log(chalk.red(`   Error: ${error instanceof Error ? error.message : String(error)}`));

      // If AI fails, continue with rule-based only
      console.log(chalk.yellow('\n⚠️  Continuing with rule-based validation only\n'));
    }
  } else {
    console.log(chalk.gray('\n⏭️  Skipping AI assessment (--no-ai flag)\n'));
  }

  // Step 3: Quality Gate Decision
  const decider = new QualityGateDecider(DEFAULT_THRESHOLDS);

  let qualityGate: QualityGateResult;
  if (specQuality) {
    qualityGate = decider.decide(specQuality);
  } else {
    // No AI assessment, use rule-based only
    qualityGate = {
      decision: ruleBasedResult.passed ? 'PASS' : 'FAIL',
      blockers: ruleBasedResult.passed ? [] : ruleBasedResult.errors.filter(e => e.severity === 'error').map(e => ({
        type: 'rule_based',
        severity: 'critical',
        title: e.rule,
        description: e.message,
        location: e.file,
      })),
      concerns: ruleBasedResult.errors.filter(e => e.severity === 'warning').map(e => ({
        type: 'rule_based',
        severity: 'high',
        title: e.rule,
        description: e.message,
        location: e.file,
      })),
      recommendations: [],
      reasoning: ruleBasedResult.passed
        ? 'Rule-based validation passed. AI assessment skipped.'
        : 'Rule-based validation failed. Fix errors before proceeding.',
    };
  }

  // Build final report
  const report: QAReport = {
    increment_id: incrementId,
    mode,
    timestamp: new Date().toISOString(),
    rule_based: ruleBasedResult,
    spec_quality: specQuality,
    quality_gate: qualityGate,
    duration_ms: Date.now() - startTime,
    token_usage: tokenUsage,
    cost_usd: costUsd,
  };

  // Display results
  if (!options.silent) {
    displayReport(report, options);
  }

  // Handle export
  if (options.export && specQuality) {
    await exportToTasks(incrementId, qualityGate);
  }

  // Exit code for CI mode
  if (options.ci) {
    if (qualityGate.decision === 'FAIL') {
      process.exit(1);
    }
  }

  return report;
}

/**
 * Determine QA mode from options
 */
function determineMode(options: QAOptions): QAMode {
  if (options.gate) return 'gate';
  if (options.pre) return 'pre';
  if (options.full) return 'full';
  return 'quick'; // Default
}

/**
 * Run rule-based validation (Phase 1: Stub implementation)
 *
 * @param incrementId - Increment ID
 * @param incrementPath - Path to increment folder
 * @returns Rule-based validation result
 */
async function runRuleBasedValidation(
  incrementId: string,
  incrementPath: string
): Promise<RuleBasedResult> {
  // STUB: Phase 1 implementation returns passing result
  // TODO (Phase 2): Implement 120 validation rules
  //   - spec.md structure validation
  //   - plan.md completeness checks
  //   - tasks.md format validation
  //   - AC-ID traceability checks
  //   - YAML frontmatter validation
  //   - Link integrity checks

  const errors = [];

  // Basic file existence checks
  const requiredFiles = ['spec.md', 'plan.md', 'tasks.md'];
  let totalChecks = requiredFiles.length;
  let passedChecks = 0;

  for (const file of requiredFiles) {
    const filePath = path.join(incrementPath, file);
    if (fs.existsSync(filePath)) {
      passedChecks++;
    } else {
      errors.push({
        rule: `Required file: ${file}`,
        severity: 'error' as const,
        message: `Missing required file: ${file}`,
        file: file,
      });
    }
  }

  return {
    passed: errors.length === 0,
    totalCount: totalChecks,
    passedCount: passedChecks,
    failedCount: totalChecks - passedChecks,
    errors,
    breakdown: {
      consistency: { passed: passedChecks, total: totalChecks },
      completeness: { passed: passedChecks, total: totalChecks },
      quality: { passed: passedChecks, total: totalChecks },
      traceability: { passed: passedChecks, total: totalChecks },
    },
  };
}

/**
 * Run AI quality assessment using increment-quality-judge-v2 skill
 *
 * @param incrementId - Increment ID
 * @param incrementPath - Path to increment folder
 * @param mode - QA mode
 * @returns Quality assessment result
 */
async function runAIQualityAssessment(
  incrementId: string,
  incrementPath: string,
  mode: QAMode
): Promise<QualityAssessment> {
  // STUB: Phase 1 implementation returns mock assessment
  // TODO (Phase 2): Invoke increment-quality-judge-v2 AGENT via Task tool
  //   - Use Task tool with subagent_type: "specweave:increment-quality-judge-v2:increment-quality-judge-v2"
  //   - IMPORTANT: Must use full agent name format: {plugin}:{directory}:{yaml-name}
  //   - Pass increment path and mode
  //   - Parse JSON response
  //   - Return structured QualityAssessment
  //
  // Example invocation:
  //   Task({
  //     subagent_type: "specweave:increment-quality-judge-v2:increment-quality-judge-v2",
  //     prompt: `Assess quality of increment ${incrementId}. Mode: ${mode}`
  //   });

  // Read spec.md to get some context
  const specPath = path.join(incrementPath, 'spec.md');
  const specContent = fs.existsSync(specPath) ? await fs.readFile(specPath, 'utf-8') : '';

  // Mock assessment for Phase 1
  const mockRisks = RiskCalculator.calculateAssessment([
    RiskCalculator.createRisk({
      id: 'RISK-001',
      category: 'security',
      title: 'Example security risk',
      description: 'This is a mock risk for Phase 1 testing',
      probability: 0.3,
      impact: 5,
      mitigation: 'Implement proper validation',
      location: 'spec.md',
    }),
  ]);

  return {
    overall_score: 75,
    dimension_scores: {
      clarity: 80,
      testability: 75,
      completeness: 70,
      feasibility: 80,
      maintainability: 75,
      edge_cases: 70,
      risk: 65,
    },
    issues: [],
    suggestions: [],
    confidence: 0.8,
    risk_assessment: mockRisks,
  };
}

/**
 * Resolve increment path from 4-digit ID
 * Finds the full directory name (e.g., "0018-strict-increment-discipline-enforcement")
 * given just the 4-digit prefix (e.g., "0018")
 */
function resolveIncrementPath(incrementsDir: string, incrementId: string): string | null {
  if (!fs.existsSync(incrementsDir)) {
    return null;
  }

  const entries = fs.readdirSync(incrementsDir);
  const matchingDir = entries.find((entry: string) => {
    const fullPath = path.join(incrementsDir, entry);
    // Match directories starting with the 4-digit ID
    return fs.statSync(fullPath).isDirectory() && entry.startsWith(incrementId);
  });

  return matchingDir ? path.join(incrementsDir, matchingDir) : null;
}

/**
 * Estimate token usage for AI assessment
 */
function estimateTokenUsage(incrementPath: string): number {
  // Rough estimate: ~2500 tokens for small increments
  // TODO: Implement actual token counting based on file sizes
  return 2500;
}

/**
 * Calculate cost based on token usage
 * Assumes Haiku pricing: $0.25 per million input tokens, $1.25 per million output tokens
 */
function calculateCost(tokens: number): number {
  const inputTokens = tokens * 0.8; // 80% input
  const outputTokens = tokens * 0.2; // 20% output

  const inputCost = (inputTokens / 1_000_000) * 0.25;
  const outputCost = (outputTokens / 1_000_000) * 1.25;

  return inputCost + outputCost;
}

/**
 * Display QA report in terminal
 */
function displayReport(report: QAReport, options: QAOptions): void {
  console.log(chalk.blue.bold(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
  console.log(chalk.blue.bold(`QUALITY GATE DECISION`));
  console.log(chalk.blue.bold(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));

  const { decision } = report.quality_gate;
  const icon = QualityGateDecider.getDecisionIcon(decision);
  const color = QualityGateDecider.getDecisionColor(decision);

  console.log(chalk[color](`${icon} ${decision}\n`));
  console.log(chalk.gray(report.quality_gate.reasoning + '\n'));

  // Show blockers
  if (report.quality_gate.blockers.length > 0) {
    console.log(chalk.red.bold('🔴 Blockers (MUST FIX):\n'));
    report.quality_gate.blockers.forEach((blocker, idx) => {
      console.log(chalk.red(`  ${idx + 1}. ${blocker.title}`));
      console.log(chalk.gray(`     ${blocker.description}`));
      if (blocker.mitigation) {
        console.log(chalk.yellow(`     → ${blocker.mitigation}`));
      }
      if (blocker.location) {
        console.log(chalk.gray(`     📍 ${blocker.location}\n`));
      }
    });
  }

  // Show concerns
  if (report.quality_gate.concerns.length > 0) {
    console.log(chalk.yellow.bold('🟡 Concerns (SHOULD FIX):\n'));
    report.quality_gate.concerns.forEach((concern, idx) => {
      console.log(chalk.yellow(`  ${idx + 1}. ${concern.title}`));
      console.log(chalk.gray(`     ${concern.description}`));
      if (concern.mitigation) {
        console.log(chalk.cyan(`     → ${concern.mitigation}`));
      }
      if (concern.location) {
        console.log(chalk.gray(`     📍 ${concern.location}\n`));
      }
    });
  }

  // Show recommendations
  if (report.quality_gate.recommendations.length > 0 && options.verbose) {
    console.log(chalk.cyan.bold('💡 Recommendations (NICE TO FIX):\n'));
    report.quality_gate.recommendations.forEach((rec, idx) => {
      console.log(chalk.cyan(`  ${idx + 1}. ${rec.title}`));
      console.log(chalk.gray(`     ${rec.description}\n`));
    });
  }

  // Show spec quality scores if available
  if (report.spec_quality) {
    console.log(chalk.blue.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.blue.bold('SPECIFICATION QUALITY'));
    console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(chalk.bold(`Overall Score: ${report.spec_quality.overall_score}/100`));
    console.log();

    const { dimension_scores } = report.spec_quality;
    console.log('Dimension Scores:');
    Object.entries(dimension_scores).forEach(([dim, score]) => {
      const percentage = Math.round(score * 100);
      const indicator = percentage >= 80 ? '✓✓' : percentage >= 70 ? '✓' : '⚠️';
      console.log(`  ${dim.padEnd(20)}: ${percentage}/100 ${indicator}`);
    });
  }

  // Show summary
  console.log(chalk.blue.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.blue.bold('SUMMARY'));
  console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  console.log(chalk.gray(`Duration: ${report.duration_ms}ms`));
  if (report.token_usage) {
    console.log(chalk.gray(`Tokens: ~${report.token_usage}`));
  }
  if (report.cost_usd) {
    console.log(chalk.gray(`Cost: ~$${report.cost_usd.toFixed(3)}`));
  }
  console.log();

  // Next steps
  if (report.quality_gate.blockers.length > 0) {
    console.log(chalk.yellow('Next Steps:'));
    console.log(chalk.yellow('  • Fix blockers before proceeding'));
    if (options.export) {
      console.log(chalk.yellow('  • Blockers exported to tasks.md'));
    } else {
      console.log(chalk.yellow('  • Run with --export to add blockers to tasks.md'));
    }
  } else if (report.quality_gate.concerns.length > 0) {
    console.log(chalk.cyan('Next Steps:'));
    console.log(chalk.cyan('  • Address concerns before release'));
    if (options.export) {
      console.log(chalk.cyan('  • Concerns exported to tasks.md'));
    }
  } else {
    console.log(chalk.green('✅ Ready to proceed!'));
  }
  console.log();
}

/**
 * Export blockers/concerns to tasks.md
 */
async function exportToTasks(
  incrementId: string,
  qualityGate: QualityGateResult
): Promise<void> {
  const tasksPath = path.join(
    process.cwd(),
    '.specweave',
    'increments',
    incrementId,
    'tasks.md'
  );

  if (!fs.existsSync(tasksPath)) {
    console.log(chalk.yellow('⚠️  tasks.md not found, skipping export'));
    return;
  }

  let tasksContent = await fs.readFile(tasksPath, 'utf-8');

  // Find next task number
  const taskMatches = tasksContent.match(/## T-(\d+):/g);
  const nextTaskNum = taskMatches
    ? Math.max(...taskMatches.map((m) => parseInt(m.match(/\d+/)![0]))) + 1
    : 1;

  // Build new tasks
  const newTasks: string[] = [];

  [...qualityGate.blockers, ...qualityGate.concerns].forEach((issue, idx) => {
    const taskNum = nextTaskNum + idx;
    const priority = issue.severity === 'critical' ? 'P0 - BLOCKER' : 'P1 - HIGH';

    newTasks.push(`
## T-${String(taskNum).padStart(3, '0')}: ${issue.title}

**Priority**: ${priority}
**Type**: Quality Gate Fix
**Added**: ${new Date().toISOString().split('T')[0]}

**Description**: ${issue.description}

${issue.mitigation ? `**Mitigation**: ${issue.mitigation}\n` : ''}
${issue.location ? `**Location**: ${issue.location}\n` : ''}
**Status**: [ ] Pending
`);
  });

  // Append to tasks.md
  tasksContent += '\n' + newTasks.join('\n');
  await fs.writeFile(tasksPath, tasksContent);

  console.log(chalk.green(`\n✅ Exported ${newTasks.length} items to tasks.md`));
}
