/**
 * Learning Validator - Agent SDK integration for reflect
 *
 * Uses Haiku model to validate and improve learnings before storing
 * them in skill memory files.
 *
 * @since v1.0.130
 */

import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';

/**
 * Confidence levels for learnings
 */
export type LearningConfidence = 'high' | 'medium' | 'low';

/**
 * Signal types that can be detected
 */
export type SignalType = 'correction' | 'rule' | 'approval' | 'prohibition';

/**
 * Input for validation
 */
export interface ValidationInput {
  extractedRule: string;
  context: string;
  signalType: SignalType;
  targetSkill?: string;
}

/**
 * Validation result from Haiku
 */
export interface ValidationResult {
  isValid: boolean;
  confidence: LearningConfidence;
  reasons: string[];
  improvedVersion?: string;
  suggestion?: string;
  triggers?: string[];  // Suggested trigger keywords
}

/**
 * Learning that has been validated
 */
export interface ValidatedLearning {
  original: string;
  validated: string;
  confidence: LearningConfidence;
  triggers: string[];
  skill: string;
  validatedAt: string;
}

/**
 * System prompt for the validation agent
 */
const VALIDATION_SYSTEM_PROMPT = `You are a learning quality validator for SpecWeave's self-improving AI system.

Your role: Validate that extracted learnings are high-quality, actionable rules.

## Quality Criteria (ALL must pass)

1. **Completeness**: Full sentence, not truncated
2. **Actionability**: Contains action verbs (use, prefer, always, never, avoid, run, test)
3. **Specificity**: Names specific tools, patterns, frameworks, or concepts
4. **Clarity**: Understandable without context in 6 months
5. **Not a question**: Statements only, no questions
6. **Transformed**: Complaints transformed to solutions (not raw symptoms)

## Reject These Patterns

- Questions: "Where should I deploy?"
- Fragments: "eplicilty how to g"
- Raw symptoms: "command not recognized" (no solution)
- Typos/gibberish: "pojrect", "promp"
- Temporary context: "just this time", "for now"
- Generic praise without info: "Perfect!", "Great!"
- Too vague: "use better code", "make it faster"

## Improve These Patterns

- Add specificity: "use the button" → "use <Button variant='primary'> from @/components/ui"
- Complete sentences: "Always" → "Always run tests before committing"
- Transform complaints: "tests fail" → "Run npm test --watchAll=false for CI compatibility"

## Response Format

Respond ONLY with valid JSON:
{
  "isValid": boolean,
  "confidence": "high" | "medium" | "low",
  "reasons": ["reason1", "reason2"],
  "improvedVersion": "improved text or null",
  "suggestion": "optional tip for user",
  "triggers": ["keyword1", "keyword2"]
}

CRITICAL: Only return isValid=true if ALL quality checks pass.
Better to reject a bad learning than store corrupted data.`;

/**
 * User prompt template
 */
const VALIDATION_USER_TEMPLATE = `Validate this learning:

**Extracted Rule**: {{extractedRule}}

**Context** (what triggered it): {{context}}

**Signal Type**: {{signalType}}

**Target Skill**: {{targetSkill}}

Check against quality criteria and respond with JSON.`;

/**
 * Learning Validator using Haiku model
 */
export class LearningValidator {
  private client: Anthropic | null = null;
  private enabled: boolean;
  private model: string;
  private verbose: boolean;

  constructor(options?: {
    enabled?: boolean;
    model?: string;
    verbose?: boolean;
  }) {
    this.enabled = options?.enabled ?? true;
    this.model = options?.model ?? 'claude-haiku-4-5-20251001';
    this.verbose = options?.verbose ?? false;

    // Only initialize client if API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && this.enabled) {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Validate a single learning
   */
  async validate(input: ValidationInput): Promise<ValidationResult> {
    // If validation disabled or no client, return basic validation
    if (!this.enabled || !this.client) {
      return this.basicValidation(input);
    }

    try {
      const userPrompt = VALIDATION_USER_TEMPLATE
        .replace('{{extractedRule}}', input.extractedRule)
        .replace('{{context}}', input.context)
        .replace('{{signalType}}', input.signalType)
        .replace('{{targetSkill}}', input.targetSkill || 'unknown');

      if (this.verbose) {
        console.log(chalk.gray('Validating learning with Haiku...'));
      }

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 500,
        system: VALIDATION_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      });

      // Extract text from response
      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        return this.basicValidation(input);
      }

      // Parse JSON response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.basicValidation(input);
      }

      const result = JSON.parse(jsonMatch[0]) as ValidationResult;

      if (this.verbose) {
        console.log(chalk.gray(`  Valid: ${result.isValid}, Confidence: ${result.confidence}`));
      }

      return result;
    } catch (error) {
      if (this.verbose) {
        console.log(chalk.yellow(`  Validation error, using basic validation`));
      }
      return this.basicValidation(input);
    }
  }

  /**
   * Basic validation without LLM (fallback)
   */
  private basicValidation(input: ValidationInput): ValidationResult {
    const rule = input.extractedRule;
    const reasons: string[] = [];
    let isValid = true;

    // Check minimum length
    if (rule.length < 15) {
      isValid = false;
      reasons.push('Too short (< 15 characters)');
    }

    // Check for action verbs
    const actionVerbs = /\b(use|prefer|always|never|avoid|run|test|deploy|verify|check|ensure|add|remove|create|delete|update|configure|set|enable|disable)\b/i;
    if (!actionVerbs.test(rule)) {
      isValid = false;
      reasons.push('No action verb found');
    }

    // Check for questions
    if (rule.includes('?')) {
      isValid = false;
      reasons.push('Contains question mark');
    }

    // Check for incomplete sentences
    if (rule.endsWith('...') || rule.endsWith(',') || rule.endsWith('the') || rule.endsWith('a')) {
      isValid = false;
      reasons.push('Appears truncated');
    }

    // Check for common gibberish patterns
    const gibberishPatterns = /\b(asdf|qwer|xxx|pojrect|promp|teh)\b/i;
    if (gibberishPatterns.test(rule)) {
      isValid = false;
      reasons.push('Contains potential typos/gibberish');
    }

    // Extract triggers from the rule
    const triggers = this.extractTriggers(rule);

    const confidence: LearningConfidence = reasons.length === 0 ? 'high' :
      reasons.length === 1 ? 'medium' : 'low';

    return {
      isValid,
      confidence,
      reasons: reasons.length > 0 ? reasons : ['Passed basic validation'],
      triggers,
    };
  }

  /**
   * Extract trigger keywords from a learning
   */
  private extractTriggers(rule: string): string[] {
    const triggers: string[] = [];

    // Common tool/framework names
    const tools = /\b(react|vue|angular|nextjs|express|fastapi|django|prisma|vitest|jest|playwright|cypress|typescript|python|rust|go|docker|kubernetes|terraform|aws|vercel|github|jira)\b/gi;
    const toolMatches = rule.match(tools);
    if (toolMatches) {
      triggers.push(...toolMatches.map(t => t.toLowerCase()));
    }

    // Action patterns - use stem matching to handle variants (test/testing/tests, commit/committing, deploy/deploying)
    const actionStems = ['test', 'deploy', 'build', 'lint', 'format', 'commit', 'push', 'merge', 'review', 'validate'];
    const ruleLower = rule.toLowerCase();

    for (const stem of actionStems) {
      // Match stem at word boundaries (allows "testing", "tests", "committing", etc.)
      const stemRegex = new RegExp(`\\b${stem}\\w*\\b`, 'i');
      if (stemRegex.test(ruleLower)) {
        triggers.push(stem);
      }
    }

    // Remove duplicates
    return [...new Set(triggers)];
  }

  /**
   * Validate multiple learnings in batch
   */
  async validateBatch(inputs: ValidationInput[]): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    for (const input of inputs) {
      const result = await this.validate(input);
      results.set(input.extractedRule, result);
    }

    return results;
  }

  /**
   * Improve a learning using the LLM
   */
  async improve(learning: string, context: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 200,
        system: `You improve learning rules for SpecWeave's self-improving AI.
Given a learning and context, output ONLY the improved version (no explanation).
Make it: complete, actionable, specific, and clear.`,
        messages: [
          {
            role: 'user',
            content: `Learning: "${learning}"\nContext: "${context}"\n\nImproved version:`,
          },
        ],
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (textContent && textContent.type === 'text') {
        return textContent.text.trim().replace(/^["']|["']$/g, '');
      }
    } catch {
      // Ignore errors, return null
    }

    return null;
  }

  /**
   * Check if two learnings are semantically similar
   */
  async areSimilar(learning1: string, learning2: string): Promise<boolean> {
    if (!this.client) {
      // Fall back to basic string similarity
      return this.basicSimilarity(learning1, learning2);
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        system: 'You compare two learning rules. Respond with ONLY "yes" or "no".',
        messages: [
          {
            role: 'user',
            content: `Are these two learnings saying essentially the same thing?\n\n1: "${learning1}"\n2: "${learning2}"`,
          },
        ],
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (textContent && textContent.type === 'text') {
        return textContent.text.toLowerCase().includes('yes');
      }
    } catch {
      // Ignore errors
    }

    return this.basicSimilarity(learning1, learning2);
  }

  /**
   * Basic string similarity check
   */
  private basicSimilarity(s1: string, s2: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n1 = normalize(s1);
    const n2 = normalize(s2);

    // Exact match
    if (n1 === n2) return true;

    // One contains the other
    if (n1.includes(n2) || n2.includes(n1)) return true;

    // Word overlap > 45% (lowered to capture semantic similarity with paraphrasing)
    const words1 = new Set(s1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(s2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);
    const overlap = intersection.length / union.size;

    return overlap > 0.45;
  }

  /**
   * Format validation result for logging
   */
  formatResult(input: ValidationInput, result: ValidationResult): string {
    const lines: string[] = [];

    const icon = result.isValid ? '✅' : '❌';
    const conf = result.confidence === 'high' ? '●●●' :
      result.confidence === 'medium' ? '●●○' : '●○○';

    lines.push(`${icon} ${conf} "${input.extractedRule.slice(0, 50)}..."`);

    if (result.reasons.length > 0) {
      lines.push(chalk.gray(`   Reasons: ${result.reasons.join(', ')}`));
    }

    if (result.improvedVersion) {
      lines.push(chalk.green(`   Improved: "${result.improvedVersion.slice(0, 50)}..."`));
    }

    if (result.triggers && result.triggers.length > 0) {
      lines.push(chalk.blue(`   Triggers: ${result.triggers.join(', ')}`));
    }

    return lines.join('\n');
  }
}

/**
 * Create a validator with configuration from config.json
 */
export function createValidator(configPath?: string): LearningValidator {
  let config: {
    enabled?: boolean;
    agentModel?: string;
    verbose?: boolean;
  } = {};

  // Try to load from config.json
  if (configPath) {
    try {
      const fs = require('fs');
      const fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config = fullConfig.reflect?.validation || {};
    } catch {
      // Ignore errors
    }
  }

  return new LearningValidator({
    enabled: config.enabled ?? true,
    model: config.agentModel,
    verbose: config.verbose,
  });
}

/**
 * Validate a learning with default settings
 */
export async function validateLearning(
  extractedRule: string,
  context: string,
  signalType: SignalType = 'correction',
  targetSkill?: string
): Promise<ValidationResult> {
  const validator = new LearningValidator();
  return validator.validate({
    extractedRule,
    context,
    signalType,
    targetSkill,
  });
}
