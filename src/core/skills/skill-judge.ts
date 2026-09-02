/**
 * Skill Judge - LLM-as-Judge for validating skill/agent output quality
 *
 * Uses Opus model for deep semantic analysis of code quality, spec alignment,
 * and best practices. Includes timeout handling to prevent stuck states.
 *
 * Features:
 * - Opus model for thorough analysis
 * - Configurable timeout (default 60s)
 * - Progress logging to .specweave/logs/judge-llm.log
 * - Structured verdict: PASS / CONCERNS / FAIL
 * - Domain-specific evaluation criteria
 *
 * @since v1.0.130
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from '../../utils/fs-native.js';
import { appendFileSync } from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { loadStaticContext, type CacheBlock } from '../cache/static-context-loader.js';
import { emitRefinementIfAttributable } from '../skill-signal-emit.js';
import type { SignalSeverity } from '../../types/skill-signals.js';

/**
 * Judge verdict levels
 */
export type JudgeVerdict = 'PASS' | 'CONCERNS' | 'FAIL';

/**
 * Domain-specific criteria
 */
export interface DomainCriteria {
  domain: string;
  criteria: string[];
  weight: number;  // 1-10 importance
}

/**
 * Input for judge evaluation
 */
export interface JudgeInput {
  domain: string;
  taskDescription: string;
  codeChanges: string;  // Diff or file contents
  specRequirements?: string;  // From spec.md
  acceptanceCriteria?: string[];  // ACs to check
  /**
   * Active increment ID used to expand the `<active>` placeholder in
   * `cache.staticContextFiles` (0669 Wave 2 prompt caching).
   */
  incrementId?: string;
}

/**
 * Judge evaluation result
 */
export interface JudgeResult {
  verdict: JudgeVerdict;
  score: number;  // 0-100
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  domainChecks: DomainCheck[];
  duration_ms: number;
  timedOut: boolean;
}

/**
 * Individual domain check result
 */
export interface DomainCheck {
  criterion: string;
  passed: boolean;
  notes: string;
}

/**
 * Judge options
 */
export interface JudgeOptions {
  timeout_ms?: number;  // Default 60000 (60s)
  verbose?: boolean;
  logFile?: string;
  model?: string;  // Default opus
  projectRoot?: string;  // Project root for config lookup (defaults to cwd)
  thinkingBudget?: ThinkingBudget;  // "adaptive" (default) — 4.7 uses prompt hint; "legacy" — pre-4.7 behavior
}

/**
 * Thinking-budget mode.
 * - "adaptive": no API `thinking` parameter; rely on prompt-hint adaptive thinking (4.7+ default)
 * - "legacy": pre-4.7 behavior, passes `thinking: { type: "enabled", budget_tokens }` on non-4.7 models
 */
export type ThinkingBudget = 'adaptive' | 'legacy';

/**
 * Check if a model ID belongs to the Opus 4.7 family or newer.
 * 4.7+ models drop the `thinking` API parameter in favor of adaptive thinking
 * triggered by prompt hints.
 */
export function isOpus47Family(modelId: string): boolean {
  if (!modelId) return false;
  const m = /^claude-opus-(\d+)-(\d+)/.exec(modelId);
  if (!m) return false;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (Number.isNaN(major) || Number.isNaN(minor)) return false;
  if (major > 4) return true;
  if (major === 4 && minor >= 7) return true;
  return false;
}

/**
 * Parameters for constructing a judge API request.
 */
export interface BuildApiRequestInput {
  model: string;
  system: string;
  userPrompt: string;
  maxTokens: number;
  thinkingBudget?: ThinkingBudget;
  /**
   * Optional ephemeral cache_control blocks to prepend to the user message
   * content. Populated from {@link loadStaticContext} so CLAUDE.md, config
   * and per-increment spec/rubric can be cached across calls (ADR-0250).
   */
  cacheBlocks?: CacheBlock[];
}

/**
 * Construct the Anthropic API request body for a judge call.
 *
 * Model-version guard:
 * - Opus 4.7 family → never includes `thinking` (adaptive-thinking prompt hint carries the load)
 * - Legacy models  → includes `thinking` only when `thinkingBudget === "legacy"`
 *
 * Prompt caching (0669 Wave 2):
 * - When `cacheBlocks` is non-empty, its entries are prepended to the user
 *   message content as the first elements, BEFORE the dynamic prompt text.
 *   This lets the Anthropic API reuse the cached prefix on subsequent calls.
 */
export function buildJudgeApiRequest(input: BuildApiRequestInput): Record<string, unknown> {
  const {
    model,
    system,
    userPrompt,
    maxTokens,
    thinkingBudget = 'adaptive',
    cacheBlocks = [],
  } = input;

  const userContent: Array<Record<string, unknown>> =
    cacheBlocks.length > 0
      ? [
          ...cacheBlocks.map((b) => ({ ...b })),
          { type: 'text', text: userPrompt },
        ]
      : [];

  const messages =
    userContent.length > 0
      ? [{ role: 'user', content: userContent }]
      : [{ role: 'user', content: userPrompt }];

  const request: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    system,
    messages,
  };

  if (!isOpus47Family(model) && thinkingBudget === 'legacy') {
    request.thinking = { type: 'enabled', budget_tokens: Math.max(1024, Math.floor(maxTokens / 2)) };
  }

  return request;
}

/**
 * Resolve the list of static files to cache from the SpecWeave config,
 * expanding the `<active>` placeholder to the provided increment ID.
 *
 * Returns an empty array when prompt caching is disabled or the config
 * doesn't include any static files.
 */
/**
 * Files wrapped in cache_control blocks for every judge call.
 * 2.0 removed the `cache.staticContextFiles` config key — this is the list.
 */
const STATIC_CONTEXT_FILES = [
  'CLAUDE.md',
  '.specweave/config.json',
  '.specweave/increments/<active>/spec.md',
];

export async function resolveCacheFilePaths(
  projectRoot: string,
  incrementId?: string,
): Promise<string[]> {
  try {
    const files = STATIC_CONTEXT_FILES;
    if (!incrementId) {
      return files.filter((f) => !f.includes('<active>'));
    }
    return files.map((f) => f.replace(/<active>/g, incrementId));
  } catch {
    return [];
  }
}

/**
 * Domain-specific evaluation criteria
 */
const DOMAIN_CRITERIA: Record<string, DomainCriteria> = {
  frontend: {
    domain: 'frontend',
    criteria: [
      'Components follow React/Vue/Angular best practices',
      'State management is correct and doesn\'t cause unnecessary re-renders',
      'Accessibility (a11y) is considered - ARIA labels, keyboard navigation',
      'Error boundaries and loading states are handled',
      'No hardcoded values that should be props or config',
      'Styles are maintainable (no inline styles, proper CSS organization)',
    ],
    weight: 8,
  },
  backend: {
    domain: 'backend',
    criteria: [
      'API follows REST/GraphQL conventions correctly',
      'Error handling is comprehensive - not just happy path',
      'Input validation and sanitization present',
      'Authentication/authorization checks where needed',
      'Database queries are efficient (no N+1, proper indexes used)',
      'Proper logging for debugging and monitoring',
    ],
    weight: 9,
  },
  mobile: {
    domain: 'mobile',
    criteria: [
      'Platform-specific considerations handled (iOS/Android differences)',
      'Performance optimized (no unnecessary re-renders, lazy loading)',
      'Offline capability considered if applicable',
      'Deep linking and navigation correct',
      'Permissions requested appropriately',
      'Memory management considered (no leaks)',
    ],
    weight: 8,
  },
  infrastructure: {
    domain: 'infrastructure',
    criteria: [
      'Security groups and IAM policies follow least-privilege',
      'Resources properly tagged for cost tracking',
      'High availability considered (multi-AZ, replicas)',
      'Secrets management correct (not hardcoded)',
      'Monitoring and alerting configured',
      'Backup and disaster recovery planned',
    ],
    weight: 10,
  },
  testing: {
    domain: 'testing',
    criteria: [
      'Tests cover edge cases, not just happy path',
      'Assertions are meaningful (not just `expect(true).toBe(true)`)',
      'Test names clearly describe what is being tested',
      'Mocks/stubs are appropriate and not over-used',
      'Test data is realistic and covers boundary conditions',
      'No flaky tests (deterministic, no race conditions)',
    ],
    weight: 9,
  },
  ml: {
    domain: 'ml',
    criteria: [
      'Data preprocessing is correct and reproducible',
      'Model architecture appropriate for the problem',
      'Training/validation/test split proper',
      'Evaluation metrics appropriate for the task',
      'Model versioning and experiment tracking in place',
      'Inference optimization considered (quantization, batching)',
    ],
    weight: 8,
  },
};

/**
 * System prompt for the judge
 */
const JUDGE_SYSTEM_PROMPT = `You are an expert code reviewer acting as a JUDGE for SpecWeave's self-validating skills system.

Your role: Evaluate code quality, spec alignment, and best practices with BRUTAL HONESTY.

## Evaluation Framework

Score the work on a 0-100 scale:
- 90-100: PASS - Excellent, production-ready
- 70-89: CONCERNS - Good but has issues that should be addressed
- 0-69: FAIL - Significant problems, needs rework

## You MUST Check

1. **Spec Alignment**: Does the implementation match requirements?
2. **Code Quality**: Clean, readable, maintainable?
3. **Best Practices**: Domain-specific patterns followed?
4. **Edge Cases**: Error handling, null checks, validation?
5. **Security**: No obvious vulnerabilities?
6. **Performance**: No obvious bottlenecks?

## Response Format

Return ONLY valid JSON:
{
  "verdict": "PASS" | "CONCERNS" | "FAIL",
  "score": 0-100,
  "summary": "One sentence overall assessment",
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "domainChecks": [
    {"criterion": "Name of check", "passed": true/false, "notes": "Brief note"}
  ]
}

BE STRICT. Production code quality matters. Don't be afraid to FAIL subpar work.`;

/**
 * Progress logger for visibility
 */
class ProgressLogger {
  private logPath: string;
  private startTime: number;
  private verbose: boolean;

  constructor(logPath: string, verbose: boolean) {
    this.logPath = logPath;
    this.startTime = Date.now();
    this.verbose = verbose;

    // Ensure log directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message: string, level: 'INFO' | 'WARN' | 'ERROR' | 'PROGRESS' = 'INFO'): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${elapsed}s] [${level}] ${message}`;

    // Always write to file
    appendFileSync(this.logPath, entry + '\n');

    // Console output if verbose
    if (this.verbose) {
      const color = level === 'ERROR' ? chalk.red :
                    level === 'WARN' ? chalk.yellow :
                    level === 'PROGRESS' ? chalk.blue :
                    chalk.gray;
      console.log(color(entry));
    }
  }

  summary(result: JudgeResult): void {
    const lines = [
      '',
      '═'.repeat(60),
      'LLM JUDGE SUMMARY',
      '═'.repeat(60),
      `Verdict: ${result.verdict} (Score: ${result.score}/100)`,
      `Duration: ${(result.duration_ms / 1000).toFixed(1)}s`,
      result.timedOut ? '⚠️  TIMED OUT - partial evaluation' : '',
      '',
      `Summary: ${result.summary}`,
      '',
      'Strengths:',
      ...result.strengths.map(s => `  ✅ ${s}`),
      '',
      'Concerns:',
      ...result.concerns.map(c => `  ⚠️  ${c}`),
      '',
      'Recommendations:',
      ...result.recommendations.map(r => `  💡 ${r}`),
      '═'.repeat(60),
    ].filter(Boolean);

    for (const line of lines) {
      this.log(line, 'INFO');
    }
  }
}

/**
 * Skill Judge using Opus model
 */
export class SkillJudge {
  private client: Anthropic | null = null;
  private timeout_ms: number;
  private verbose: boolean;
  private logPath: string;
  private model: string;
  private projectRoot: string;

  constructor(options?: JudgeOptions) {
    this.timeout_ms = options?.timeout_ms ?? 60000;  // 60s default
    this.verbose = options?.verbose ?? false;
    this.model = options?.model ?? 'opus';  // Use generic model name
    this.projectRoot = options?.projectRoot ?? resolveEffectiveRoot();

    // Default log path
    this.logPath = options?.logFile ??
      path.join(this.projectRoot, '.specweave', 'logs', 'judge-llm.log');

    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Judge skill/agent output
   */
  async judge(input: JudgeInput): Promise<JudgeResult> {
    const logger = new ProgressLogger(this.logPath, this.verbose);
    const startTime = Date.now();

    logger.log(`Starting LLM Judge evaluation for domain: ${input.domain}`);
    logger.log(`Task: ${input.taskDescription.slice(0, 100)}...`);
    logger.log(`Using model: ${this.model}`);
    logger.log(`Timeout: ${this.timeout_ms}ms`);

    // Check for API client
    if (!this.client) {
      logger.log('No ANTHROPIC_API_KEY - falling back to basic evaluation', 'WARN');
      return this.basicEvaluation(input, startTime, logger);
    }

    // Check external API consent before making paid API call
    try {
      const { checkConsent } = await import('../llm/consent.js');
      const consent = checkConsent('anthropic', this.projectRoot);
      if (consent !== 'granted') {
        logger.log(`External API consent not granted (status: ${consent}) - falling back to basic evaluation`, 'WARN');
        return this.basicEvaluation(input, startTime, logger);
      }
    } catch (error) {
      logger.log(`Consent check failed: ${error instanceof Error ? error.message : String(error)} - falling back to basic evaluation`, 'WARN');
      return this.basicEvaluation(input, startTime, logger);
    }

    // Build evaluation prompt
    const criteria = DOMAIN_CRITERIA[input.domain] || DOMAIN_CRITERIA.backend;
    const userPrompt = this.buildPrompt(input, criteria);

    // Load static-context cache blocks (CLAUDE.md, config.json, active spec/rubric).
    // Empty array when config disables caching or files are missing — judge() stays
    // fully functional in both cases.
    const cacheFilePaths = await resolveCacheFilePaths(this.projectRoot, input.incrementId);
    const cacheBlocks = cacheFilePaths.length > 0
      ? await loadStaticContext(cacheFilePaths, this.projectRoot)
      : [];
    if (cacheBlocks.length > 0) {
      logger.log(`Prompt cache: ${cacheFilePaths.length} file(s), 1 ephemeral breakpoint`, 'INFO');
    }

    const requestBody = buildJudgeApiRequest({
      model: this.model,
      system: JUDGE_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 2000,
      cacheBlocks,
    });

    logger.log('Sending request to Opus...', 'PROGRESS');

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logger.log('Timeout reached, aborting request', 'WARN');
        controller.abort();
      }, this.timeout_ms);

      // Make API call with timeout
      const response = await this.client.messages.create(
        requestBody as unknown as Anthropic.MessageCreateParamsNonStreaming,
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      logger.log('Response received, parsing...', 'PROGRESS');

      // Extract text content
      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from model');
      }

      // Parse JSON response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Omit<JudgeResult, 'duration_ms' | 'timedOut'>;

      const result: JudgeResult = {
        ...parsed,
        duration_ms: Date.now() - startTime,
        timedOut: false,
      };

      logger.summary(result);
      return result;

    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };

      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        logger.log('Request timed out', 'ERROR');
        return this.timeoutResult(input, startTime, logger);
      }

      logger.log(`API error: ${err.message}`, 'ERROR');
      return this.basicEvaluation(input, startTime, logger);
    }
  }

  /**
   * Build the evaluation prompt
   */
  private buildPrompt(input: JudgeInput, criteria: DomainCriteria): string {
    const parts: string[] = [
      `## Domain: ${input.domain.toUpperCase()}`,
      '',
      `## Task Description`,
      input.taskDescription,
      '',
      `## Code Changes`,
      '```',
      input.codeChanges.slice(0, 10000),  // Limit to 10k chars
      '```',
    ];

    if (input.specRequirements) {
      parts.push('', '## Spec Requirements', input.specRequirements);
    }

    if (input.acceptanceCriteria && input.acceptanceCriteria.length > 0) {
      parts.push('', '## Acceptance Criteria');
      for (const ac of input.acceptanceCriteria) {
        parts.push(`- ${ac}`);
      }
    }

    parts.push('', '## Domain-Specific Criteria to Evaluate');
    for (const c of criteria.criteria) {
      parts.push(`- ${c}`);
    }

    parts.push('', 'Evaluate the code against ALL criteria. Be thorough and strict.');

    return parts.join('\n');
  }

  /**
   * Basic evaluation when no API available
   */
  private basicEvaluation(
    input: JudgeInput,
    startTime: number,
    logger: ProgressLogger
  ): JudgeResult {
    logger.log('Running basic pattern-based evaluation', 'INFO');

    const concerns: string[] = [];
    const strengths: string[] = [];
    let score = 70;  // Start at baseline

    const code = input.codeChanges.toLowerCase();

    // Basic pattern checks
    if (code.includes('todo') || code.includes('fixme')) {
      concerns.push('Contains TODO/FIXME comments');
      score -= 5;
    }

    if (code.includes('console.log') && input.domain !== 'testing') {
      concerns.push('Contains console.log statements');
      score -= 3;
    }

    if (code.includes('any') && input.domain === 'frontend') {
      concerns.push('Uses TypeScript "any" type');
      score -= 5;
    }

    if (code.includes('eslint-disable') || code.includes('@ts-ignore')) {
      concerns.push('Contains lint/type suppressions');
      score -= 5;
    }

    if (code.includes('try') && code.includes('catch')) {
      strengths.push('Has error handling');
      score += 5;
    }

    if (code.includes('test') || code.includes('expect')) {
      strengths.push('Includes tests');
      score += 5;
    }

    const verdict: JudgeVerdict = score >= 90 ? 'PASS' :
                                   score >= 70 ? 'CONCERNS' : 'FAIL';

    const result: JudgeResult = {
      verdict,
      score: Math.max(0, Math.min(100, score)),
      summary: 'Basic pattern-based evaluation (no API key)',
      strengths: strengths.length > 0 ? strengths : ['No obvious issues detected'],
      concerns: concerns.length > 0 ? concerns : ['Full LLM review recommended'],
      recommendations: ['Run with ANTHROPIC_API_KEY for full Opus evaluation'],
      domainChecks: [],
      duration_ms: Date.now() - startTime,
      timedOut: false,
    };

    logger.summary(result);
    return result;
  }

  /**
   * Result when timeout occurs
   */
  private timeoutResult(
    input: JudgeInput,
    startTime: number,
    logger: ProgressLogger
  ): JudgeResult {
    const result: JudgeResult = {
      verdict: 'CONCERNS',
      score: 50,
      summary: `Evaluation timed out after ${this.timeout_ms}ms - manual review recommended`,
      strengths: [],
      concerns: ['Evaluation could not complete within timeout'],
      recommendations: [
        'Increase timeout with --timeout option',
        'Check API connectivity',
        'Consider breaking into smaller chunks',
      ],
      domainChecks: [],
      duration_ms: Date.now() - startTime,
      timedOut: true,
    };

    logger.summary(result);
    return result;
  }

  /**
   * Write judge result to persistent report file for CLI verification.
   * The completion-validator checks for this file before allowing closure.
   */
  writeReport(
    incrementId: string,
    result: JudgeResult,
    consentStatus: 'granted' | 'denied' | 'no-api-key'
  ): string {
    const reportsDir = path.join(
      this.projectRoot, '.specweave', 'increments', incrementId, 'reports'
    );
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, 'judge-llm-report.json');
    const verdictMap: Record<JudgeVerdict, string> = {
      'PASS': 'APPROVED',
      'CONCERNS': 'CONCERNS',
      'FAIL': 'REJECTED',
    };

    const report = {
      version: '1.0',
      incrementId,
      timestamp: new Date().toISOString(),
      verdict: verdictMap[result.verdict] ?? result.verdict,
      score: result.score,
      mode: this.client ? 'ultrathink' : 'pattern-match',
      timedOut: result.timedOut,
      duration_ms: result.duration_ms,
      consentStatus,
      summary: result.summary,
      strengths: result.strengths,
      concerns: result.concerns,
      recommendations: result.recommendations,
      domainChecks: result.domainChecks,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 0671: emit refinement signals when a gate failure is attributable to a
    // specific skill. Best-effort — never throws.
    void this.emitRefinementSignals(incrementId, result);

    return reportPath;
  }

  /**
   * Post-processing step for `writeReport`: scan concerns/recommendations/
   * summary for skill-attributable findings and emit one refinement signal
   * per attributed skill. Silent on PASS verdicts. Never throws.
   *
   * @internal exported for testability via a direct method call.
   */
  async emitRefinementSignals(
    incrementId: string,
    result: JudgeResult,
  ): Promise<void> {
    // Only emit on CONCERNS or FAIL — PASS verdicts are not "gate failures".
    if (result.verdict === 'PASS') return;

    const severity: SignalSeverity = result.verdict === 'FAIL' ? 'high' : 'medium';
    const skillsRoot = path.join(this.projectRoot, 'plugins', 'specweave', 'skills');

    // Attribute each evidence string, then emit at most one signal per
    // distinct skill within this report — otherwise a verbose judge response
    // that mentions the same slug in summary+concerns+recommendations would
    // produce 3 duplicate signals.
    const { attributeSkill } = await import('../skill-attribution.js');
    const perSkillEvidence = new Map<string, string>();

    const evidenceSources: string[] = [
      ...result.concerns,
      ...result.recommendations,
      result.summary,
    ];

    for (const evidence of evidenceSources) {
      if (!evidence) continue;
      const attrib = attributeSkill({ evidenceText: evidence, skillsRoot });
      if (attrib.skill && !perSkillEvidence.has(attrib.skill)) {
        perSkillEvidence.set(attrib.skill, evidence);
      }
    }

    for (const [skill, evidence] of perSkillEvidence) {
      try {
        await emitRefinementIfAttributable({
          projectRoot: this.projectRoot,
          source: 'judge-llm',
          severity,
          incrementId,
          evidence,
          attribution: {
            // Force direct attribution since we already resolved the skill.
            toolCallOrigin: skill,
          },
        });
      } catch {
        // Best-effort: never block the gate on signal-emission errors.
      }
    }
  }

  /**
   * Write a WAIVED report when consent is denied or no API key available.
   */
  writeWaivedReport(
    incrementId: string,
    reason: string
  ): string {
    const reportsDir = path.join(
      this.projectRoot, '.specweave', 'increments', incrementId, 'reports'
    );
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, 'judge-llm-report.json');
    const report = {
      version: '1.0',
      incrementId,
      timestamp: new Date().toISOString(),
      verdict: 'WAIVED',
      consentStatus: 'denied',
      reason,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }

  /**
   * Format result for display
   */
  formatResult(result: JudgeResult): string {
    const icon = result.verdict === 'PASS' ? '✅' :
                 result.verdict === 'CONCERNS' ? '⚠️' : '❌';

    const lines: string[] = [
      '',
      chalk.bold('LLM Judge Evaluation'),
      '─'.repeat(50),
      `${icon} Verdict: ${chalk.bold(result.verdict)} (Score: ${result.score}/100)`,
      `Duration: ${(result.duration_ms / 1000).toFixed(1)}s`,
      result.timedOut ? chalk.yellow('⚠️  Timed out - partial evaluation') : '',
      '',
      chalk.bold('Summary:'),
      `  ${result.summary}`,
    ];

    if (result.strengths.length > 0) {
      lines.push('', chalk.green('Strengths:'));
      for (const s of result.strengths) {
        lines.push(`  ✅ ${s}`);
      }
    }

    if (result.concerns.length > 0) {
      lines.push('', chalk.yellow('Concerns:'));
      for (const c of result.concerns) {
        lines.push(`  ⚠️  ${c}`);
      }
    }

    if (result.recommendations.length > 0) {
      lines.push('', chalk.blue('Recommendations:'));
      for (const r of result.recommendations) {
        lines.push(`  💡 ${r}`);
      }
    }

    if (result.domainChecks.length > 0) {
      lines.push('', chalk.bold('Domain Checks:'));
      for (const check of result.domainChecks) {
        const checkIcon = check.passed ? '✅' : '❌';
        lines.push(`  ${checkIcon} ${check.criterion}: ${check.notes}`);
      }
    }

    lines.push('─'.repeat(50));

    return lines.filter(Boolean).join('\n');
  }
}

/**
 * Quick judge function for CLI usage
 */
export async function judgeSkillOutput(
  domain: string,
  taskDescription: string,
  codeChanges: string,
  options?: JudgeOptions
): Promise<JudgeResult> {
  const judge = new SkillJudge(options);
  return judge.judge({
    domain,
    taskDescription,
    codeChanges,
  });
}

/**
 * Judge with spec context
 */
export async function judgeWithSpec(
  domain: string,
  taskDescription: string,
  codeChanges: string,
  specRequirements: string,
  acceptanceCriteria: string[],
  options?: JudgeOptions
): Promise<JudgeResult> {
  const judge = new SkillJudge(options);
  return judge.judge({
    domain,
    taskDescription,
    codeChanges,
    specRequirements,
    acceptanceCriteria,
  });
}
