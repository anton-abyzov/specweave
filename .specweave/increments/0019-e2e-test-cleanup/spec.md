# Increment 0019: E2E Test Cleanup and Fix

## Quick Overview

Fix failing e2e tests and reduce the number of skipped tests by removing inappropriate test cases and properly documenting necessary skips.

## Problem Statement

The e2e test suite had:
- 18 skipped tests (many inappropriately skipped)
- 4 failing smoke tests
- Unclear documentation about why tests were skipped
- Tests checking for features that don't exist

## Solution

1. Remove inappropriate tests that check for non-existent features
2. Fix failing smoke tests (timeout, parallelism, CLI bugs)
3. Document why remaining tests are skipped
4. Ensure all tests pass for CI/CD

## User Stories

### US1: Clean Up Inappropriate Tests
**As a** developer
**I want** tests to accurately reflect what SpecWeave does
**So that** the test suite is reliable and maintainable

**Acceptance Criteria**:
- [ ] Remove tests checking for features created by project scaffolding (not init)
- [ ] Remove tests checking for .claude/ directories (now uses plugin system)
- [ ] Update test expectations to match actual behavior

### US2: Fix Failing Smoke Tests
**As a** developer
**I want** all smoke tests to pass
**So that** CI/CD pipeline is reliable

**Acceptance Criteria**:
- [ ] Fix timeout issues with init command
- [ ] Fix test parallelism conflicts
- [ ] Fix CLI process.cwd() bug
- [ ] All 4 smoke tests pass

### US3: Document Skipped Tests
**As a** developer
**I want** clear documentation for skipped tests
**So that** I understand why they're skipped and how to enable them

**Acceptance Criteria**:
- [ ] ADO tests have clear skip documentation
- [ ] Each skip explains requirements
- [ ] Documentation shows how to enable tests

## Success Metrics

- Reduce skipped tests from 18 to ≤10
- 0 failing tests
- All remaining skips have clear documentation
- CI/CD pipeline passes consistently