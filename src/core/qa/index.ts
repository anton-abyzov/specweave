/**
 * Quality Assurance Module
 *
 * Tools for validating code quality, test coverage, and TDD compliance.
 *
 * @module qa
 */

export {
  validateCoverage,
  findCoverageData,
  parseCoverageReport,
  COVERAGE_LOCATIONS,
  type CoverageFormat,
  type TestMode,
  type CoverageValidationOptions,
  type CoverageMetrics,
  type CoverageValidationResult,
  type CoverageLocation,
} from './coverage-validator.js';
