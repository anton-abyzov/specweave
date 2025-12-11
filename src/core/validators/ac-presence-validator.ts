import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Logger, consoleLogger } from '../../utils/logger.js';

/**
 * AC Presence Validator
 *
 * Validates that spec.md contains inline Acceptance Criteria.
 *
 * **Critical Rule**: spec.md MUST contain ACs even when using `structure: user-stories`
 * with external living docs. This is required for AC sync hooks to function.
 *
 * **Validation Gates**:
 * 1. `/sw:increment` (after spec generation) - BLOCKS if ACs missing
 * 2. `/sw:do` (before starting work) - BLOCKS if ACs missing
 * 3. `/sw:validate` (rule-based validation) - WARNS if ACs missing
 * 4. Pre-commit hook (git) - WARNS if ACs missing in new specs
 *
 * **See**: ADR-0062 (AC Embedding Architecture)
 */

export interface ACPresenceValidationResult {
  valid: boolean;
  acCount: number;
  expectedCount: number;
  errors: string[];
  warnings: string[];
  /**
   * Suggested fix (e.g., "Run /sw:embed-acs 0050")
   */
  suggestedFix?: string;
}

/**
 * Validate AC presence in increment spec.md
 *
 * **Checks**:
 * 1. spec.md exists
 * 2. spec.md contains "## Acceptance Criteria" section
 * 3. AC count matches metadata.json (if metadata exists)
 * 4. All ACs follow proper format: `- [ ] **AC-US1-01**: Title`
 *
 * @param incrementPath - Path to increment directory
 * @param options - Validation options
 * @returns Validation result
 */
export function validateACPresence(
  incrementPath: string,
  options: { logger?: Logger; strict?: boolean } = {}
): ACPresenceValidationResult {
  const logger = options.logger ?? consoleLogger;
  const strict = options.strict ?? true;

  const result: ACPresenceValidationResult = {
    valid: true,
    acCount: 0,
    expectedCount: 0,
    errors: [],
    warnings: [],
  };

  // 1. Check spec.md exists
  const specPath = join(incrementPath, 'spec.md');
  if (!existsSync(specPath)) {
    result.valid = false;
    result.errors.push(`spec.md not found: ${specPath}`);
    return result;
  }

  const specContent = readFileSync(specPath, 'utf-8');

  // 2. Check for "## Acceptance Criteria" section
  if (!specContent.includes('## Acceptance Criteria')) {
    result.valid = false;
    result.errors.push('spec.md missing "## Acceptance Criteria" section');
    result.suggestedFix = `Add ACs to spec.md or run: /sw:embed-acs ${incrementPath.split('/').pop()}`;
  }

  // 3. Count ACs in spec.md
  const acMatches = specContent.match(/^- \[[x ]\] \*\*AC-US\d+-\d+\*\*:/gm);
  result.acCount = acMatches ? acMatches.length : 0;

  if (result.acCount === 0) {
    result.valid = false;
    result.errors.push('spec.md contains 0 Acceptance Criteria');
    result.suggestedFix = `Add ACs to spec.md or run: /sw:embed-acs ${incrementPath.split('/').pop()}`;
  }

  // 4. Check metadata.json for expected AC count
  const metadataPath = join(incrementPath, 'metadata.json');
  if (existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      result.expectedCount = metadata.total_acs ?? 0;

      if (result.expectedCount > 0 && result.acCount !== result.expectedCount) {
        const message = `AC count mismatch: spec.md has ${result.acCount} ACs, metadata.json expects ${result.expectedCount}`;

        if (strict) {
          result.valid = false;
          result.errors.push(message);
        } else {
          result.warnings.push(message);
        }
      }

      if (result.expectedCount === 0 && result.acCount > 0) {
        result.warnings.push(`metadata.json has total_acs=0 but spec.md contains ${result.acCount} ACs - metadata may need update`);
      }
    } catch (err) {
      result.warnings.push(`Could not parse metadata.json: ${(err as Error).message}`);
    }
  }

  // 5. Validate AC format
  const invalidACs = [];
  const lines = specContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('**AC-US') && !line.match(/^- \[[x ]\] \*\*AC-US\d+-\d+\*\*:/)) {
      invalidACs.push(`Line ${i + 1}: "${line.substring(0, 60)}..."`);
    }
  }

  if (invalidACs.length > 0) {
    result.warnings.push(`Found ${invalidACs.length} ACs with invalid format`);
    if (invalidACs.length <= 3) {
      result.warnings.push(...invalidACs);
    }
  }

  // 6. Check for "structure: user-stories" pattern
  const frontmatterMatch = specContent.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    if (frontmatter.includes('structure: user-stories') && result.acCount === 0) {
      result.errors.push(
        '⚠️  CRITICAL: spec.md uses `structure: user-stories` but contains NO inline ACs'
      );
      result.errors.push(
        '   AC sync hooks require ACs in spec.md even when using external living docs'
      );
      result.suggestedFix = `Run: /sw:embed-acs ${incrementPath.split('/').pop()} to auto-embed ACs from living docs`;
      result.valid = false;
    }
  }

  return result;
}

/**
 * Format validation result as human-readable message
 */
export function formatValidationResult(result: ACPresenceValidationResult): string {
  let output = '';

  if (result.valid) {
    output += `✅ AC Presence Validation: PASSED\n`;
    output += `   ✓ ${result.acCount} Acceptance Criteria found in spec.md\n`;
    if (result.expectedCount > 0) {
      output += `   ✓ Matches metadata.json (${result.expectedCount} expected)\n`;
    }
  } else {
    output += `❌ AC Presence Validation: FAILED\n\n`;

    if (result.errors.length > 0) {
      output += `ERRORS (${result.errors.length}):\n`;
      for (const error of result.errors) {
        output += `  🔴 ${error}\n`;
      }
      output += '\n';
    }

    if (result.suggestedFix) {
      output += `💡 SUGGESTED FIX:\n`;
      output += `   ${result.suggestedFix}\n\n`;
    }
  }

  if (result.warnings.length > 0) {
    output += `WARNINGS (${result.warnings.length}):\n`;
    for (const warning of result.warnings) {
      output += `  🟡 ${warning}\n`;
    }
  }

  return output;
}

/**
 * Validate AC presence and throw if validation fails
 *
 * Use this in critical paths (e.g., before starting increment)
 */
export function validateACPresenceStrict(
  incrementPath: string,
  logger: Logger = consoleLogger
): void {
  const result = validateACPresence(incrementPath, { logger, strict: true });

  if (!result.valid) {
    const formattedResult = formatValidationResult(result);
    logger.error(formattedResult);
    throw new Error(`AC presence validation failed for ${incrementPath}`);
  }

  logger.log(formatValidationResult(result));
}
