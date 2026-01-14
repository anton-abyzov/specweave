/**
 * Accessibility Audit
 *
 * Parses accessibility audit results from E2E test output.
 *
 * @module core/auto/e2e-coverage/accessibility-audit
 * @since v1.0.115
 */

import * as fs from 'fs';
import * as path from 'path';
import type { A11yAuditResult, A11yViolation, A11yViolationSeverity } from './types.js';

/**
 * Detect if @axe-core/playwright is installed in the project
 *
 * @param projectPath - Project root path
 * @returns True if axe-core is installed
 */
export function hasAxeInstalled(projectPath: string): boolean {
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for common axe packages
    return !!(
      deps['@axe-core/playwright'] ||
      deps['@axe-core/react'] ||
      deps['axe-core'] ||
      deps['jest-axe'] ||
      deps['vitest-axe'] ||
      deps['cypress-axe']
    );
  } catch {
    return false;
  }
}

/**
 * Parse accessibility audit results from test output
 *
 * Looks for patterns from axe-core output:
 * - "X accessibility violations found"
 * - violation objects with impact levels
 * - WCAG references
 *
 * @param output - Test output (stdout/stderr combined)
 * @returns Parsed accessibility audit results
 *
 * @example
 * ```typescript
 * const result = parseAccessibilityResults(testOutput);
 * if (result.summary.critical > 0) {
 *   console.log('Critical accessibility issues found!');
 * }
 * ```
 */
export function parseAccessibilityResults(output: string): A11yAuditResult {
  const violations: A11yViolation[] = [];
  let auditRan = false;
  let passes = 0;

  // Check if accessibility test ran
  const axePatterns = [
    /axe[.-]core/i,
    /accessibility violations/i,
    /a11y\s+(violations?|issues?|errors?)/i,
    /checkA11y/i,
    /injectAxe/i,
    /expect.*toHaveNoViolations/i,
  ];

  for (const pattern of axePatterns) {
    if (pattern.test(output)) {
      auditRan = true;
      break;
    }
  }

  // Pattern 2: Parse individual violations from axe output
  // Format: "impact: critical, description: Images must have alternate text"
  const impactPattern = /impact[:\s]+["']?(critical|serious|moderate|minor)["']?[,\s]*(?:description|help)[:\s]+["']?([^"'\n]+)["']?/gi;

  let match;
  while ((match = impactPattern.exec(output)) !== null) {
    const impact = match[1].toLowerCase() as A11yViolationSeverity;
    const description = match[2].trim();

    // Avoid duplicates
    if (!violations.find((v) => v.description === description)) {
      violations.push({
        id: `a11y-${violations.length + 1}`,
        impact,
        description,
      });
    }
  }

  // Pattern 3: Look for axe rule IDs like "image-alt", "color-contrast", etc.
  const ruleIdPattern = /rule[:\s]+["']?([\w-]+)["']?.*?impact[:\s]+["']?(critical|serious|moderate|minor)["']?/gi;
  while ((match = ruleIdPattern.exec(output)) !== null) {
    const id = match[1];
    const impact = match[2].toLowerCase() as A11yViolationSeverity;

    if (!violations.find((v) => v.id === id)) {
      violations.push({
        id,
        impact,
        description: `Accessibility rule violation: ${id}`,
      });
    }
  }

  // Pattern 4: Common axe violation messages
  const commonViolations: { pattern: RegExp; id: string; impact: A11yViolationSeverity }[] = [
    { pattern: /image[s]?\s+must\s+have\s+alt(ernate)?\s+text/i, id: 'image-alt', impact: 'critical' },
    { pattern: /color\s+contrast\s+ratio/i, id: 'color-contrast', impact: 'serious' },
    { pattern: /form\s+elements?\s+must\s+have\s+label/i, id: 'label', impact: 'critical' },
    { pattern: /document\s+must\s+have.+lang/i, id: 'html-has-lang', impact: 'serious' },
    { pattern: /link[s]?\s+must\s+have\s+discernible\s+text/i, id: 'link-name', impact: 'serious' },
    { pattern: /button[s]?\s+must\s+have\s+discernible\s+text/i, id: 'button-name', impact: 'critical' },
    { pattern: /heading[s]?\s+must\s+not\s+be\s+empty/i, id: 'empty-heading', impact: 'minor' },
    { pattern: /skip.*link|bypass.*block/i, id: 'bypass', impact: 'serious' },
    { pattern: /aria-?\s*(label|describedby|hidden)/i, id: 'aria-valid', impact: 'serious' },
    { pattern: /landmark|region/i, id: 'region', impact: 'moderate' },
    { pattern: /focus.*order|tab.*index/i, id: 'focus-order', impact: 'serious' },
    { pattern: /keyboard.*accessible/i, id: 'keyboard', impact: 'critical' },
  ];

  for (const { pattern, id, impact } of commonViolations) {
    if (pattern.test(output) && !violations.find((v) => v.id === id)) {
      const descMatch = output.match(new RegExp(`(${pattern.source}[^.\\n]{0,100})`, 'i'));
      violations.push({
        id,
        impact,
        description: descMatch?.[1]?.trim() || `${id} violation`,
      });
    }
  }

  // Pattern 5: Playwright-specific accessibility output
  // Example: "expected page to have no accessibility violations"
  if (/expected.*page.*to.*have.*no.*(?:accessibility|a11y).*violations/i.test(output)) {
    auditRan = true;
  }

  // Pattern 6: Count passes if available
  const passesMatch = output.match(/(\d+)\s+(?:accessibility\s+)?(?:checks?\s+)?pass(?:ed|es)?/i);
  if (passesMatch) {
    passes = parseInt(passesMatch[1], 10);
  }

  // Build summary
  const summary = {
    critical: violations.filter((v) => v.impact === 'critical').length,
    serious: violations.filter((v) => v.impact === 'serious').length,
    moderate: violations.filter((v) => v.impact === 'moderate').length,
    minor: violations.filter((v) => v.impact === 'minor').length,
    total: violations.length,
  };

  // Infer audit ran if we found violations
  if (violations.length > 0) {
    auditRan = true;
  }

  return {
    hasAxe: auditRan,
    auditRan,
    violations,
    passes,
    summary,
  };
}

/**
 * Check if accessibility audit should block completion
 *
 * @param result - Accessibility audit result
 * @param config - Configuration for blocking thresholds
 * @returns Whether to block and reason
 */
export function shouldBlockOnAccessibility(
  result: A11yAuditResult,
  config: {
    blockOnCritical?: boolean;
    blockOnSerious?: boolean;
    maxViolations?: number;
  } = {}
): { block: boolean; reason: string } {
  const { blockOnCritical = true, blockOnSerious = true, maxViolations = 0 } = config;

  if (!result.auditRan) {
    return { block: false, reason: 'No accessibility audit ran' };
  }

  if (blockOnCritical && result.summary.critical > 0) {
    return {
      block: true,
      reason: `${result.summary.critical} critical accessibility violation(s) found`,
    };
  }

  if (blockOnSerious && result.summary.serious > 0) {
    return {
      block: true,
      reason: `${result.summary.serious} serious accessibility violation(s) found`,
    };
  }

  if (maxViolations > 0 && result.summary.total > maxViolations) {
    return {
      block: true,
      reason: `${result.summary.total} accessibility violations exceed limit of ${maxViolations}`,
    };
  }

  return { block: false, reason: 'Accessibility audit passed' };
}

/**
 * Generate accessibility report
 *
 * @param result - Accessibility audit result
 * @returns Formatted report string
 */
export function generateAccessibilityReport(result: A11yAuditResult): string {
  const lines: string[] = [];

  lines.push('♿ Accessibility Audit Report');
  lines.push('═'.repeat(50));
  lines.push('');

  if (!result.auditRan) {
    lines.push('⚠️ No accessibility audit detected in test output.');
    lines.push('');
    lines.push('To enable accessibility testing, install @axe-core/playwright:');
    lines.push('  npm install -D @axe-core/playwright');
    lines.push('');
    lines.push('Then add to your tests:');
    lines.push("  import { injectAxe, checkA11y } from '@axe-core/playwright';");
    lines.push('  await injectAxe(page);');
    lines.push('  await checkA11y(page);');
    return lines.join('\n');
  }

  // Summary
  lines.push('Summary:');
  lines.push(`  🔴 Critical: ${result.summary.critical}`);
  lines.push(`  🟠 Serious:  ${result.summary.serious}`);
  lines.push(`  🟡 Moderate: ${result.summary.moderate}`);
  lines.push(`  🟢 Minor:    ${result.summary.minor}`);
  lines.push(`  ─────────────`);
  lines.push(`  📊 Total:    ${result.summary.total}`);
  if (result.passes > 0) {
    lines.push(`  ✅ Passed:   ${result.passes}`);
  }
  lines.push('');

  // Critical violations (always show)
  const critical = result.violations.filter((v) => v.impact === 'critical');
  if (critical.length > 0) {
    lines.push('🔴 Critical Violations (MUST FIX):');
    for (const violation of critical) {
      lines.push(`  • [${violation.id}] ${violation.description}`);
      if (violation.helpUrl) {
        lines.push(`    Learn more: ${violation.helpUrl}`);
      }
    }
    lines.push('');
  }

  // Serious violations
  const serious = result.violations.filter((v) => v.impact === 'serious');
  if (serious.length > 0) {
    lines.push('🟠 Serious Violations (Should Fix):');
    for (const violation of serious) {
      lines.push(`  • [${violation.id}] ${violation.description}`);
    }
    lines.push('');
  }

  // Moderate/minor as summary
  const other = result.violations.filter((v) => v.impact === 'moderate' || v.impact === 'minor');
  if (other.length > 0) {
    lines.push(`⚠️ ${other.length} moderate/minor violations (see full report for details)`);
    lines.push('');
  }

  // Status
  if (result.summary.critical === 0 && result.summary.serious === 0) {
    lines.push('✅ Accessibility audit PASSED (no critical or serious issues)');
  } else {
    lines.push('❌ Accessibility audit FAILED - fix critical/serious issues before release');
  }

  return lines.join('\n');
}
