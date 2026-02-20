/**
 * SKILL.md self-scan scanner.
 * Applies detection rules against SKILL.md content and bash code blocks.
 */

import { SKILL_SECURITY_RULES, SkillSecurityRule } from './rules.js';
import { extractBashBlocks } from './parser.js';

export interface SkillFinding {
  /** Rule identifier (e.g., "CREDENTIALS_UNSAFE") */
  ruleId: string;
  /** Finding category */
  category: string;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Human-readable finding description */
  message: string;
  /** Suggested fix */
  suggestedFix: string;
  /** 1-based line number in the original file */
  line: number;
  /** The matched text snippet */
  matchedText: string;
}

export interface SkillScanResult {
  /**
   * Exit code:
   *   0 = pass (no findings)
   *   1 = concerns (medium or low only)
   *   2 = fail (critical or high)
   */
  exitCode: 0 | 1 | 2;
  /** Whether the scan passed (no critical/high findings) */
  passed: boolean;
  /** All findings */
  findings: SkillFinding[];
}

/**
 * Scan SKILL.md content using structured detection rules.
 * Rules marked `codeBlockOnly: true` only apply inside bash code blocks.
 * Other rules apply to the full markdown content.
 */
export function scanSkillMd(content: string, rules: SkillSecurityRule[] = SKILL_SECURITY_RULES): SkillScanResult {
  const findings: SkillFinding[] = [];
  const allLines = content.split('\n');

  // Build a set of line ranges for bash code blocks (1-based)
  const bashBlocks = extractBashBlocks(content);
  const bashBlockLines = new Set<number>();
  for (const block of bashBlocks) {
    const blockLineCount = block.content.split('\n').length;
    for (let offset = 0; offset < blockLineCount; offset++) {
      bashBlockLines.add(block.startLine + 1 + offset); // +1 because startLine is the fence
    }
  }

  // Separate rules by scope
  const codeOnlyRules = rules.filter(r => r.codeBlockOnly);
  const fullContentRules = rules.filter(r => !r.codeBlockOnly);

  // Apply full-content rules to every line
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const lineNum = i + 1;
    for (const rule of fullContentRules) {
      if (rule.pattern.test(line)) {
        const match = line.match(rule.pattern);
        findings.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          suggestedFix: rule.suggestedFix,
          line: lineNum,
          matchedText: match?.[0] ?? line.trim().slice(0, 60),
        });
      }
    }
  }

  // Apply code-block-only rules to lines inside bash blocks
  for (let i = 0; i < allLines.length; i++) {
    const lineNum = i + 1;
    if (!bashBlockLines.has(lineNum)) continue;
    const line = allLines[i];
    for (const rule of codeOnlyRules) {
      if (rule.pattern.test(line)) {
        const match = line.match(rule.pattern);
        findings.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          suggestedFix: rule.suggestedFix,
          line: lineNum,
          matchedText: match?.[0] ?? line.trim().slice(0, 60),
        });
      }
    }
  }

  // Sort findings by line number
  findings.sort((a, b) => a.line - b.line);

  const hasCriticalOrHigh = findings.some(f => f.severity === 'critical' || f.severity === 'high');
  const hasAny = findings.length > 0;

  const exitCode: 0 | 1 | 2 = hasCriticalOrHigh ? 2 : hasAny ? 1 : 0;

  return {
    exitCode,
    passed: !hasCriticalOrHigh,
    findings,
  };
}
