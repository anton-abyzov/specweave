/**
 * Coverage Validator
 *
 * Validates test coverage against configured targets during /sw:done execution.
 * Supports multiple coverage formats: Istanbul, c8, Jest, lcov.
 *
 * @module qa/coverage-validator
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

/** Supported coverage report formats */
export type CoverageFormat = 'istanbul' | 'c8' | 'jest' | 'lcov' | 'cobertura';

/** Test mode from increment metadata */
export type TestMode = 'TDD' | 'test-after' | 'manual' | 'none';

/** Options for coverage validation */
export interface CoverageValidationOptions {
  /** Project root directory */
  projectRoot: string;
  /** Target coverage percentage (0-100) */
  coverageTarget: number;
  /** Test mode from increment metadata */
  testMode: TestMode;
  /** Optional specific coverage file path */
  coveragePath?: string;
}

/** Coverage metrics breakdown */
export interface CoverageMetrics {
  /** Line coverage percentage */
  lines: number;
  /** Statement coverage percentage */
  statements: number;
  /** Function coverage percentage */
  functions: number;
  /** Branch coverage percentage */
  branches: number;
  /** Overall coverage (typically lines or average) */
  overall: number;
}

/** Result of coverage validation */
export interface CoverageValidationResult {
  /** Whether coverage meets the target */
  passed: boolean;
  /** Whether validation was skipped */
  skipped: boolean;
  /** Target coverage percentage */
  target: number;
  /** Actual coverage percentage */
  actual: number;
  /** Reason for result (skip, pass, fail) */
  reason: string;
  /** Detailed coverage metrics */
  details: CoverageMetrics | null;
  /** Path to coverage file found */
  coverageFile: string | null;
  /** Format of coverage data */
  format: CoverageFormat | null;
}

/** Coverage file location info */
export interface CoverageLocation {
  /** Path to coverage file */
  path: string;
  /** Format of coverage data */
  format: CoverageFormat;
}

// ============================================================================
// Constants
// ============================================================================

/** Common coverage file locations (exported for extensibility) */
export const COVERAGE_LOCATIONS: ReadonlyArray<{ pattern: string; format: CoverageFormat }> = [
  // Istanbul (NYC) JSON format
  { pattern: 'coverage/coverage-summary.json', format: 'istanbul' },
  { pattern: 'coverage/coverage-final.json', format: 'istanbul' },

  // c8 (Node.js native coverage)
  { pattern: '.c8/coverage-summary.json', format: 'c8' },
  { pattern: 'coverage/c8/coverage-summary.json', format: 'c8' },

  // Jest
  { pattern: 'coverage/jest/coverage-summary.json', format: 'jest' },

  // lcov format
  { pattern: 'coverage/lcov.info', format: 'lcov' },
  { pattern: 'coverage/lcov-report/lcov.info', format: 'lcov' },

  // Cobertura (XML)
  { pattern: 'coverage/cobertura-coverage.xml', format: 'cobertura' },
];

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Validate test coverage against configured target.
 *
 * @param options - Validation options
 * @returns Validation result with pass/fail status and details
 */
export async function validateCoverage(
  options: CoverageValidationOptions
): Promise<CoverageValidationResult> {
  const { projectRoot, coverageTarget, testMode, coveragePath } = options;

  // Skip if coverage target is 0 (disabled)
  if (coverageTarget === 0) {
    return {
      passed: true,
      skipped: true,
      target: 0,
      actual: 0,
      reason: 'Coverage validation disabled (target: 0)',
      details: null,
      coverageFile: null,
      format: null,
    };
  }

  // Skip if testMode is 'none'
  if (testMode === 'none') {
    return {
      passed: true,
      skipped: true,
      target: coverageTarget,
      actual: 0,
      reason: 'Coverage validation skipped (testMode: none)',
      details: null,
      coverageFile: null,
      format: null,
    };
  }

  // Find coverage data
  const coverageLocation = coveragePath
    ? { path: coveragePath, format: detectFormat(coveragePath) }
    : findCoverageData(projectRoot);

  if (!coverageLocation) {
    return {
      passed: false,
      skipped: false,
      target: coverageTarget,
      actual: 0,
      reason: 'Coverage data not found. Run tests with --coverage flag.',
      details: null,
      coverageFile: null,
      format: null,
    };
  }

  // Read and parse coverage data
  try {
    const coverageContent = fs.readFileSync(coverageLocation.path, 'utf-8');
    const metrics = parseCoverageReport(coverageContent, coverageLocation.format);

    const passed = metrics.overall >= coverageTarget;

    return {
      passed,
      skipped: false,
      target: coverageTarget,
      actual: metrics.overall,
      reason: passed
        ? `Coverage ${metrics.overall.toFixed(1)}% meets target ${coverageTarget}%`
        : `Coverage ${metrics.overall.toFixed(1)}% is below target ${coverageTarget}%`,
      details: metrics,
      coverageFile: coverageLocation.path,
      format: coverageLocation.format,
    };
  } catch (error) {
    return {
      passed: false,
      skipped: false,
      target: coverageTarget,
      actual: 0,
      reason: `Failed to parse coverage data: ${error instanceof Error ? error.message : String(error)}`,
      details: null,
      coverageFile: coverageLocation.path,
      format: coverageLocation.format,
    };
  }
}

/**
 * Find coverage data file in project.
 *
 * @param projectRoot - Project root directory
 * @returns Coverage file location or null if not found
 */
export function findCoverageData(projectRoot: string): CoverageLocation | null {
  for (const location of COVERAGE_LOCATIONS) {
    const fullPath = path.join(projectRoot, location.pattern);
    if (fs.existsSync(fullPath)) {
      return {
        path: fullPath,
        format: location.format,
      };
    }
  }

  return null;
}

/**
 * Parse coverage report based on format.
 *
 * @param content - Coverage report content
 * @param format - Coverage format
 * @returns Parsed coverage metrics
 */
export function parseCoverageReport(content: string, format: CoverageFormat): CoverageMetrics {
  switch (format) {
    case 'istanbul':
    case 'c8':
    case 'jest':
      return parseJsonCoverage(content);
    case 'lcov':
      return parseLcovCoverage(content);
    case 'cobertura':
      return parseCoberturaXml(content);
    default:
      throw new Error(`Unsupported coverage format: ${format}`);
  }
}

// ============================================================================
// Format-Specific Parsers
// ============================================================================

/**
 * Parse Istanbul/c8/Jest JSON coverage format.
 */
function parseJsonCoverage(content: string): CoverageMetrics {
  const data = JSON.parse(content);

  // Handle coverage-summary.json format
  const total = data.total || data;

  const lines = total.lines?.pct ?? total.lines?.percent ?? 0;
  const statements = total.statements?.pct ?? total.statements?.percent ?? lines;
  const functions = total.functions?.pct ?? total.functions?.percent ?? 0;
  const branches = total.branches?.pct ?? total.branches?.percent ?? 0;

  // Overall is typically line coverage, or average if not available
  const overall = lines || (statements + functions + branches) / 3;

  return {
    lines,
    statements,
    functions,
    branches,
    overall,
  };
}

/**
 * Parse lcov.info format.
 */
function parseLcovCoverage(content: string): CoverageMetrics {
  let totalLines = 0;
  let coveredLines = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalBranches = 0;
  let coveredBranches = 0;

  const lines = content.split('\n');

  for (const line of lines) {
    if (line.startsWith('LF:')) {
      totalLines += parseInt(line.substring(3), 10);
    } else if (line.startsWith('LH:')) {
      coveredLines += parseInt(line.substring(3), 10);
    } else if (line.startsWith('FNF:')) {
      totalFunctions += parseInt(line.substring(4), 10);
    } else if (line.startsWith('FNH:')) {
      coveredFunctions += parseInt(line.substring(4), 10);
    } else if (line.startsWith('BRF:')) {
      totalBranches += parseInt(line.substring(4), 10);
    } else if (line.startsWith('BRH:')) {
      coveredBranches += parseInt(line.substring(4), 10);
    }
  }

  const linesPct = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
  const funcPct = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0;
  const branchPct = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;

  return {
    lines: linesPct,
    statements: linesPct, // lcov doesn't distinguish statements from lines
    functions: funcPct,
    branches: branchPct,
    overall: linesPct,
  };
}

/**
 * Parse Cobertura XML format.
 */
function parseCoberturaXml(content: string): CoverageMetrics {
  // Simple regex extraction for Cobertura XML
  const lineRateMatch = content.match(/line-rate="([0-9.]+)"/);
  const branchRateMatch = content.match(/branch-rate="([0-9.]+)"/);

  const lineRate = lineRateMatch ? parseFloat(lineRateMatch[1]) * 100 : 0;
  const branchRate = branchRateMatch ? parseFloat(branchRateMatch[1]) * 100 : 0;

  return {
    lines: lineRate,
    statements: lineRate,
    functions: 0, // Cobertura doesn't track function coverage separately
    branches: branchRate,
    overall: lineRate,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Detect coverage format from file path.
 */
function detectFormat(filePath: string): CoverageFormat {
  const filename = path.basename(filePath).toLowerCase();

  if (filename.endsWith('.info') || filename === 'lcov.info') {
    return 'lcov';
  }
  if (filename.includes('cobertura') && filename.endsWith('.xml')) {
    return 'cobertura';
  }
  if (filePath.includes('c8')) {
    return 'c8';
  }
  if (filePath.includes('jest')) {
    return 'jest';
  }

  // Default to Istanbul
  return 'istanbul';
}
