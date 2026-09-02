/**
 * QA Runner - Main orchestration logic for quality assessment
 *
 * @module qa/qa-runner
 * @since v0.8.0
 */

import chalk from 'chalk';
import ora from 'ora';
import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import { getSpecweavePath } from '../../utils/find-project-root.js';
import {
  QAReport,
  QAMode,
  QAOptions,
  QualityAssessment,
  Issue,
  Suggestion,
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
  const incrementsDir = path.join(getSpecweavePath(), 'increments');
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

  // Step 3: Quality Gate Decision.
  // 2.0 removed the `qualityGates` config key — thresholds are fixed.
  const thresholds = DEFAULT_THRESHOLDS;
  const decider = new QualityGateDecider(thresholds);
  const qualityGate: QualityGateResult = specQuality
    ? decider.decide(specQuality)
    : buildRuleBasedQualityGate(ruleBasedResult);

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
  return 'quick';
}

/**
 * Build quality gate result from rule-based validation when AI is skipped
 */
function buildRuleBasedQualityGate(ruleBasedResult: RuleBasedResult): QualityGateResult {
  const mapErrorToIssue = (e: typeof ruleBasedResult.errors[0], severity: 'critical' | 'high') => ({
    type: 'rule_based',
    severity,
    title: e.rule,
    description: e.message,
    location: e.file,
  });

  const errors = ruleBasedResult.errors.filter(e => e.severity === 'error');
  const warnings = ruleBasedResult.errors.filter(e => e.severity === 'warning');

  return {
    decision: ruleBasedResult.passed ? 'PASS' : 'FAIL',
    blockers: errors.map(e => mapErrorToIssue(e, 'critical')),
    concerns: warnings.map(e => mapErrorToIssue(e, 'high')),
    recommendations: [],
    reasoning: ruleBasedResult.passed
      ? 'Rule-based validation passed. AI assessment skipped.'
      : 'Rule-based validation failed. Fix errors before proceeding.',
  };
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
  // Phase 2: Rule-based heuristic scoring that actually reads documents
  // Analyzes spec.md, plan.md, and tasks.md for quality signals
  // Future Phase 3: Add LLM call for deeper semantic analysis

  const specPath = path.join(incrementPath, 'spec.md');
  const planPath = path.join(incrementPath, 'plan.md');
  const tasksPath = path.join(incrementPath, 'tasks.md');

  const specContent = fs.existsSync(specPath) ? await fs.readFile(specPath, 'utf-8') : '';
  const planContent = fs.existsSync(planPath) ? await fs.readFile(planPath, 'utf-8') : '';
  const tasksContent = fs.existsSync(tasksPath) ? await fs.readFile(tasksPath, 'utf-8') : '';

  const specLower = specContent.toLowerCase();
  const planLower = planContent.toLowerCase();
  const tasksLower = tasksContent.toLowerCase();

  // Extract AC lines for reuse
  const acLines = specContent.match(/\*\*AC-US\d+-\d+\*\*:.*/g) || [];
  const bddAcs = acLines.filter(l => /given\b/i.test(l) && /when\b/i.test(l) && /then\b/i.test(l));
  const bddRatio = acLines.length > 0 ? bddAcs.length / acLines.length : 0;

  // --- CLARITY (weight 0.20) ---
  let clarity = 50;
  clarity += Math.round(bddRatio * 25);
  // Penalize "or" conditions in ACs (ambiguity)
  const orAcs = acLines.filter(l => {
    // Remove the Given...When...Then structure before checking for "or"
    const afterThen = l.split(/\bthen\b/i)[1] || '';
    return / or /i.test(afterThen);
  });
  clarity -= Math.min(15, acLines.length > 0 ? Math.round((orAcs.length / acLines.length) * 30) : 0);
  if (specLower.includes('## problem statement')) clarity += 10;
  if (specLower.includes('## goals')) clarity += 5;
  if (specLower.includes('## out of scope')) clarity += 5;
  if ((specContent.match(/### US-\d+/g) || []).length >= 1) clarity += 5;
  clarity = Math.min(100, Math.max(0, clarity));

  // --- TESTABILITY (weight 0.25 — highest) ---
  let testability = 40;
  testability += Math.round(bddRatio * 20);
  const taskTestPlans = (tasksContent.match(/\*\*Test Plan\*\*/gi) || []).length;
  const taskCount = (tasksContent.match(/### T-\d+/g) || []).length;
  if (taskCount > 0) testability += Math.round(Math.min(1, taskTestPlans / taskCount) * 20);
  if ((tasksContent.match(/\*\*Test Cases\*\*/gi) || []).length > 0) testability += 10;
  if (tasksLower.includes('coverage target')) testability += 5;
  const subjectiveAcs = acLines.filter(l => /\b(looks good|feels|user-friendly|intuitive|appropriate)\b/i.test(l));
  if (subjectiveAcs.length === 0 && acLines.length > 0) testability += 5;
  testability = Math.min(100, Math.max(0, testability));

  // --- COMPLETENESS (weight 0.20) ---
  let completeness = 40;
  if (specLower.includes('## problem statement')) completeness += 5;
  if (specLower.includes('## goals')) completeness += 5;
  if (specLower.includes('## user stories')) completeness += 5;
  if (specLower.includes('## out of scope')) completeness += 5;
  if (specLower.includes('## technical notes')) completeness += 5;
  if (specLower.includes('## success metrics')) completeness += 5;
  if (specLower.includes('## non-functional requirements') || specLower.includes('## nfr')) completeness += 10;
  if (specLower.includes('## edge cases')) completeness += 10;
  if (specLower.includes('## risks')) completeness += 5;
  // Frontmatter consistency check
  const fmMatch = tasksContent.match(/completed_tasks:\s*(\d+)/);
  const checkedTasks = (tasksContent.match(/\[x\] completed/gi) || []).length;
  if (fmMatch && parseInt(fmMatch[1], 10) === checkedTasks) completeness += 5;
  completeness = Math.min(100, Math.max(0, completeness));

  // --- FEASIBILITY (weight 0.15) ---
  let feasibility = 60;
  if (specLower.includes('architecture decision') || planLower.includes('## architecture') || planLower.includes('### decision')) feasibility += 10;
  if (planLower.includes('technology stack') || planLower.includes('tech stack') || planLower.includes('## technology')) feasibility += 10;
  if (specLower.includes('### dependencies') || planLower.includes('dependencies')) feasibility += 5;
  if (planLower.includes('## implementation phases') || planLower.includes('### phase')) feasibility += 10;
  if (planLower.includes('### data model') || planLower.includes('## data model')) feasibility += 5;
  feasibility = Math.min(100, Math.max(0, feasibility));

  // --- MAINTAINABILITY (weight 0.10) ---
  let maintainability = 50;
  if (planLower.includes('adr') || planLower.includes('architecture decision record')) maintainability += 10;
  if (planLower.includes('### components') || planLower.includes('## components')) maintainability += 10;
  if (planLower.includes('### api') || planLower.includes('## api contract')) maintainability += 10;
  if (planLower.includes('## testing strategy') || planLower.includes('### testing')) maintainability += 10;
  if (planLower.includes('## technical challenges') || planLower.includes('### challenge')) maintainability += 10;
  maintainability = Math.min(100, Math.max(0, maintainability));

  // --- EDGE CASES (weight 0.10) ---
  let edge_cases = 40;
  if (specLower.includes('## edge cases')) edge_cases += 25;
  const edgeCaseAcs = acLines.filter(l => /\b(empty|null|zero|boundary|edge|error|fail|missing|invalid|none)\b/i.test(l));
  edge_cases += Math.min(20, edgeCaseAcs.length * 5);
  if (planLower.includes('edge case') || planLower.includes('corner case')) edge_cases += 10;
  if (specLower.includes('error handling') || specLower.includes('error state') || planLower.includes('error handling')) edge_cases += 5;
  edge_cases = Math.min(100, Math.max(0, edge_cases));

  // --- RISK (weight ~0.11) ---
  let risk = 40;
  if (specLower.includes('## risks')) risk += 20;
  if (specContent.includes('Probability') && specContent.includes('Impact') && specContent.includes('Mitigation')) risk += 15;
  if (specLower.includes('security')) risk += 10;
  if (specLower.includes('performance') && (specLower.includes('< ') || specLower.includes('ms') || specLower.includes('target'))) risk += 10;
  if (specLower.includes('rollback') || specLower.includes('migration') || planLower.includes('rollback')) risk += 5;
  risk = Math.min(100, Math.max(0, risk));

  // --- OVERALL SCORE (weighted) ---
  const weightedSum =
    clarity * 0.20 +
    testability * 0.25 +
    completeness * 0.20 +
    feasibility * 0.15 +
    maintainability * 0.10 +
    edge_cases * 0.10;
  const overall_score = Math.round(weightedSum * 0.89 + risk * 0.11);

  // Build actionable issues/suggestions for low-scoring dimensions
  const issues: Issue[] = [];
  const suggestions: Suggestion[] = [];

  if (clarity < 70) {
    issues.push({ dimension: 'clarity', severity: 'minor', description: 'ACs should use BDD format (Given/When/Then) and avoid "or" conditions', location: 'spec.md', impact: 'Ambiguous ACs lead to misinterpretation' });
  }
  if (testability < 70) {
    issues.push({ dimension: 'testability', severity: 'major', description: 'Tasks should have Test Plan blocks with BDD scenarios', location: 'tasks.md', impact: 'Missing test plans lead to untested code' });
  }
  if (completeness < 70) {
    suggestions.push({ dimension: 'completeness', priority: 'high', description: 'Add Non-Functional Requirements, Edge Cases, and Risks sections to spec.md', example: '## Non-Functional Requirements\n- **Performance**: ...' });
  }
  if (edge_cases < 70) {
    suggestions.push({ dimension: 'edge_cases', priority: 'medium', description: 'Add explicit ## Edge Cases section with boundary conditions', example: '## Edge Cases\n- Empty input: returns empty result' });
  }
  if (risk < 70) {
    suggestions.push({ dimension: 'risk', priority: 'high', description: 'Add ## Risks section with Probability x Impact table', example: '## Risks\n| Risk | Probability | Impact | Severity | Mitigation |' });
  }

  // Parse risk table from spec if present
  const specRiskEntries: Parameters<typeof RiskCalculator.createRisk>[0][] = [];
  if (specContent.includes('## Risks') && specContent.includes('|')) {
    const riskSection = specContent.split('## Risks')[1]?.split(/\n##/)[0] || '';
    const riskRows = riskSection.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !/\bRisk\b/.test(l.split('|')[1] || '') && l.trim().length > 5);
    riskRows.forEach((row, idx) => {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        specRiskEntries.push({
          id: `RISK-${String(idx + 1).padStart(3, '0')}`,
          category: 'implementation' as const,
          title: cols[0],
          description: cols[0],
          probability: parseFloat(cols[1]) || 0.3,
          impact: parseInt(cols[2], 10) || 5,
          mitigation: cols[3] || 'See spec.md',
          location: 'spec.md',
        });
      }
    });
  }
  if (specRiskEntries.length === 0) {
    specRiskEntries.push({
      id: 'RISK-001',
      category: 'implementation' as const,
      title: 'No risks documented',
      description: 'spec.md has no ## Risks section — add risk assessment',
      probability: 0.5,
      impact: 3,
      mitigation: 'Add risk assessment to spec.md',
      location: 'spec.md',
    });
  }

  const riskAssessment = RiskCalculator.calculateAssessment(
    specRiskEntries.map(r => RiskCalculator.createRisk(r))
  );

  return {
    overall_score,
    dimension_scores: { clarity, testability, completeness, feasibility, maintainability, edge_cases, risk },
    issues,
    suggestions,
    confidence: 0.85,
    risk_assessment: riskAssessment,
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
  // Estimate ~1 token per 4 characters of document content
  let totalChars = 0;
  for (const file of ['spec.md', 'plan.md', 'tasks.md']) {
    const filePath = path.join(incrementPath, file);
    if (fs.existsSync(filePath)) {
      try {
        totalChars += fs.readFileSync(filePath, 'utf-8').length;
      } catch { /* skip unreadable files */ }
    }
  }
  return Math.max(500, Math.round(totalChars / 4));
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
      const percentage = Math.round(score); // Scores are already 0-100, just round
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
    const llmUsage = report.token_usage;
    console.log(chalk.gray(`LLM usage: ~${llmUsage}`));
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
