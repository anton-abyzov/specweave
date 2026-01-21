/**
 * UI State Coverage
 *
 * Analyzes test output for UI state coverage (loading, error, empty states).
 *
 * @module core/auto/e2e-coverage/ui-state-coverage
 * @since v1.0.115
 */

import type { UIStateCoverage } from './types.js';

/**
 * Parse test output for UI state coverage
 *
 * Detects if tests cover:
 * - Loading states (spinners, skeletons)
 * - Error states (error boundaries, 404, 500)
 * - Empty states (no data, no results)
 *
 * @param output - Test output
 * @returns UI state coverage analysis
 */
export function parseUIStateCoverage(output: string): UIStateCoverage {
  // Loading state patterns
  const loadingPatterns = [
    /loading|spinner|skeleton|shimmer/i,
    /isLoading|isLoaded|setLoading/i,
    /getByRole\(['"]?status['"]?\)/i,
    /aria-busy/i,
    /Suspense|lazy/i,
  ];

  // Error state patterns
  const errorPatterns = [
    /error.?boundary|error.?state|error.?message/i,
    /404|not.?found/i,
    /500|server.?error|internal.?server/i,
    /something.?went.?wrong/i,
    /try.?again/i,
    /onError|handleError|catchError/i,
  ];

  // Empty state patterns
  const emptyPatterns = [
    /empty.?state|no.?data|no.?results/i,
    /nothing.?here|nothing.?found/i,
    /no.?items|no.?entries/i,
    /list.?is.?empty/i,
    /get.?started|add.?first/i,
  ];

  const findExamples = (patterns: RegExp[]): string[] => {
    const examples: string[] = [];
    for (const pattern of patterns) {
      const match = output.match(new RegExp(`(.{0,30}${pattern.source}.{0,30})`, 'gi'));
      if (match) {
        examples.push(...match.slice(0, 2).map((m) => m.trim()));
      }
    }
    return [...new Set(examples)].slice(0, 3);
  };

  const hasPattern = (patterns: RegExp[]): boolean => {
    return patterns.some((p) => p.test(output));
  };

  // Check if patterns appear in test assertions (vs just code)
  const isInTest = (patterns: RegExp[]): boolean => {
    const testContext = /expect|assert|should|toBe|toEqual|toContain|toHave/i;
    const lines = output.split('\n');
    return lines.some((line) => {
      const hasTestAssertion = testContext.test(line);
      const hasMatchedPattern = patterns.some((p) => p.test(line));
      return hasTestAssertion && hasMatchedPattern;
    });
  };

  return {
    loadingStates: {
      detected: hasPattern(loadingPatterns),
      tested: isInTest(loadingPatterns),
      examples: findExamples(loadingPatterns),
    },
    errorStates: {
      detected: hasPattern(errorPatterns),
      tested: isInTest(errorPatterns),
      examples: findExamples(errorPatterns),
    },
    emptyStates: {
      detected: hasPattern(emptyPatterns),
      tested: isInTest(emptyPatterns),
      examples: findExamples(emptyPatterns),
    },
  };
}

/**
 * Generate UI state coverage report
 *
 * @param coverage - UI state coverage data
 * @returns Formatted report (warnings only, doesn't block)
 */
export function generateUIStateReport(coverage: UIStateCoverage): string {
  const lines: string[] = [];
  const warnings: string[] = [];

  lines.push('🎨 UI State Coverage');
  lines.push('─'.repeat(40));

  // Helper to format state status
  function formatStateStatus(
    state: { tested: boolean; detected: boolean },
    name: string,
    hint: string
  ): void {
    let status: string;
    let label: string;
    if (state.tested) {
      status = '✅';
      label = 'Tested';
    } else if (state.detected) {
      status = '⚠️';
      label = 'Detected but not tested';
      warnings.push(hint);
    } else {
      status = '❓';
      label = 'Not detected';
    }
    lines.push(`${status} ${name}: ${label}`);
  }

  formatStateStatus(coverage.loadingStates, 'Loading States', 'Consider adding tests for loading states (spinners, skeletons)');
  formatStateStatus(coverage.errorStates, 'Error States  ', 'Consider adding tests for error states (404, 500, error boundaries)');
  formatStateStatus(coverage.emptyStates, 'Empty States  ', 'Consider adding tests for empty states (no data, no results)');

  lines.push('');

  if (warnings.length > 0) {
    lines.push('💡 Recommendations:');
    for (const warning of warnings) {
      lines.push(`   • ${warning}`);
    }
  } else {
    lines.push('✅ UI state coverage looks good!');
  }

  return lines.join('\n');
}
