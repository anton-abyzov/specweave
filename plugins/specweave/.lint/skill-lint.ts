/**
 * skill-lint: SKILL.md linter for Opus 4.7 framework alignment (0669 / AC-US10-03).
 *
 * Enforces:
 *   1. SKILL.md files declaring `allowed-tools` must include a rationale block
 *      (`## Tool-Use Rationale` section or `tool-use-rationale:` frontmatter key).
 *   2. Retired 4.x thinking/agent phrases are flagged — see opus-47-migration.md.
 */

const RETIRED_PHRASES = [
  'extended thinking',
  'ULTRATHINK BY DEFAULT',
  'spawn agents anyway',
  'thinking.budget_tokens',
  'budget_tokens:',
];

export interface LintResult {
  file: string;
  errors: string[];
  warnings: string[];
}

export async function lintSkillFile(
  filePath: string,
  content: string,
): Promise<LintResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const phrase of RETIRED_PHRASES) {
    if (content.includes(phrase)) {
      errors.push(
        `Retired phrase "${phrase}" found — see .specweave/docs/internal/specs/opus-47-migration.md`,
      );
    }
  }

  const hasAllowedTools = /^allowed-tools\s*:/m.test(content);
  const hasRationaleHeading = /^##\s*Tool-Use Rationale/m.test(content);
  const hasRationaleFrontmatter = /^tool-use-rationale\s*:/m.test(content);
  const hasRationale = hasRationaleHeading || hasRationaleFrontmatter;

  if (hasAllowedTools && !hasRationale) {
    errors.push(
      `SKILL.md declares allowed-tools but has no ## Tool-Use Rationale section (or tool-use-rationale frontmatter key). See skill-authoring-guide.md "Documenting Tool Use".`,
    );
  }

  return { file: filePath, errors, warnings };
}
