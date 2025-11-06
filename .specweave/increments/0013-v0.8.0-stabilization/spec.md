# Increment 0013: v0.8.0 Stabilization & Test Coverage

**Status**: Planning
**Type**: Stabilization
**Created**: 2025-11-06
**Priority**: P0

## Overview

Comprehensive testing increment to stabilize v0.8.0 release. Focuses on adding test coverage for functionality deferred from increment 0012 (Multi-Project Internal Structure): ProjectManager, BrownfieldAnalyzer, and BrownfieldImporter components.

## Problem Statement

Increment 0012 delivered critical multi-project functionality but deferred comprehensive testing to maintain velocity. This creates technical debt:

- ❌ No unit tests for ProjectManager (path resolution, caching, switching)
- ❌ No tests for BrownfieldAnalyzer (keyword scoring, classification)
- ❌ No tests for BrownfieldImporter (file copying, structure preservation)
- ❌ No E2E tests for CLI commands (init-multiproject, import-docs, switch-project)
- ❌ Test coverage gap risks regressions in future releases

## Goals

1. **Test Coverage**: Achieve 85%+ overall coverage (90% unit, 85% integration, 80% E2E)
2. **TDD Methodology**: Implement test-first development for all components
3. **Regression Protection**: Prevent future breakage of multi-project features
4. **Quality Gates**: Enable automated CI/CD validation
5. **Documentation**: Test fixtures serve as usage examples

## User Stories

### US1: ProjectManager Test Coverage
**As a** developer
**I want** comprehensive tests for ProjectManager
**So that** path resolution and project switching work reliably

**Acceptance Criteria**:
- ✅ Unit tests for path resolution (getSpecsPath, getModulesPath, etc.) - 90% coverage
- ✅ Unit tests for project switching logic - 90% coverage
- ✅ Unit tests for caching mechanism - 90% coverage
- ✅ Integration tests for multi-project structure creation - 85% coverage
- ✅ E2E tests for CLI init-multiproject command - 80% coverage

### US2: BrownfieldAnalyzer Test Coverage
**As a** developer
**I want** tests for brownfield classification algorithm
**So that** file categorization is accurate and reliable

**Acceptance Criteria**:
- ✅ Unit tests for keyword scoring algorithm - 90% coverage
- ✅ Unit tests for classification logic (spec/module/team/legacy) - 90% coverage
- ✅ Unit tests for confidence scoring - 90% coverage
- ✅ Unit tests for edge cases (empty files, no keywords) - 90% coverage
- ✅ Integration tests for multi-file analysis - 85% coverage
- ✅ Test fixtures with 20+ realistic brownfield files - 85%+ classification accuracy

### US3: BrownfieldImporter Test Coverage
**As a** developer
**I want** tests for brownfield import orchestration
**So that** file imports preserve structure and handle conflicts

**Acceptance Criteria**:
- ✅ Unit tests for file copying logic - 90% coverage
- ✅ Unit tests for structure preservation - 90% coverage
- ✅ Unit tests for duplicate handling - 90% coverage
- ✅ Unit tests for report generation - 90% coverage
- ✅ Integration tests for complete import workflows - 85% coverage
- ✅ E2E tests for CLI import-docs command - 80% coverage

### US4: Test Infrastructure Setup
**As a** developer
**I want** proper test infrastructure with Jest + Playwright
**So that** tests run reliably in CI/CD

**Acceptance Criteria**:
- ✅ Jest configuration with ts-jest for TypeScript support
- ✅ Coverage thresholds enforced (90% unit, 85% integration, 85% overall)
- ✅ Playwright setup for E2E CLI testing
- ✅ Test fixtures for brownfield imports (Notion/Confluence/Wiki)
- ✅ Test utilities (fixture loader, benchmark, temp directory cleanup)
- ✅ CI/CD integration with GitHub Actions

### US5: CLI Command Test Coverage
**As a** developer
**I want** E2E tests for all multi-project CLI commands
**So that** user workflows are validated end-to-end

**Acceptance Criteria**:
- ✅ E2E tests for init-multiproject command - 85% coverage
- ✅ E2E tests for switch-project command - 85% coverage
- ✅ E2E tests for import-docs command - 85% coverage
- ✅ E2E tests for project status commands - 85% coverage
- ✅ Error handling and edge case validation

## Architecture

### Three-Layer Test Pyramid

```
         /\
        /E2\        E2E Tests (10% of tests, 80% coverage target)
       /____\       - CLI command execution
      /      \      - End-to-end workflows
     /  Intg  \     Integration Tests (30% of tests, 85% coverage target)
    /          \    - Real file operations
   /____________\   - Multi-component interactions
  /              \
 /      Unit      \ Unit Tests (60% of tests, 90% coverage target)
/__________________\ - Component isolation
                     - Pure functions
                     - Mocked dependencies
```

### Test Coverage by Component

| Component | Unit Tests | Integration Tests | E2E Tests | Target Coverage |
|-----------|-----------|------------------|-----------|----------------|
| **ProjectManager** | Path resolution, caching | Project switching, structure | CLI init-multiproject | 90% |
| **BrownfieldAnalyzer** | Keyword scoring, classification | Multi-file analysis | CLI import-docs | 85% |
| **BrownfieldImporter** | File copying logic | Import orchestration | CLI import-docs | 85% |
| **CLI Commands** | Argument parsing | Inquirer prompts | Full execution | 80% |

### Test Organization

```
tests/
├── unit/                              # Unit tests (isolated components)
│   ├── project-manager/               # ProjectManager tests
│   ├── brownfield/                    # Brownfield analyzer/importer tests
│   └── cli/                           # CLI command tests
├── integration/                       # Integration tests
│   ├── project-manager/               # Multi-project workflows
│   ├── brownfield/                    # Import workflows
│   └── cli/                           # CLI integration tests
├── e2e/                               # End-to-end tests (Playwright)
│   └── cli/                           # CLI command execution
├── fixtures/                          # Test data
│   └── brownfield/                    # Realistic brownfield exports
└── utils/                             # Test utilities
    ├── fixture-loader.ts              # Load test fixtures
    ├── benchmark.ts                   # Performance measurement
    └── temp-dir.ts                    # Temp directory management
```

## Success Metrics

**Test Coverage**:
- ✅ 90%+ unit test coverage
- ✅ 85%+ integration test coverage
- ✅ 85%+ overall coverage
- ✅ Zero critical bugs in multi-project features

**Quality Gates**:
- ✅ All tests pass in CI/CD
- ✅ Coverage thresholds enforced
- ✅ No regressions in existing functionality
- ✅ Performance benchmarks met (<1ms path resolution, <2min import 500 files)

**Classification Accuracy**:
- ✅ 85%+ accuracy on test fixtures
- ✅ High confidence: 95%+ accuracy
- ✅ Medium confidence: 85%+ accuracy
- ✅ Low confidence: 70%+ accuracy

## Technology Stack

**Testing Infrastructure**:
- **Unit/Integration**: Jest 29+ with ts-jest
- **E2E**: Playwright 1.48+
- **Coverage**: Istanbul/nyc (built into Jest)
- **Mocking**: Jest mocks + manual mocks for file operations

**Test Fixtures**:
- Notion exports (20+ markdown files)
- Confluence exports (HTML/markdown hybrid)
- GitHub Wiki structure
- Custom markdown collections

**Performance Tools**:
- Custom benchmarking utilities
- Memory profiling
- Execution time tracking

## Out of Scope

- ❌ New features (stabilization only)
- ❌ Refactoring existing code (unless required for testability)
- ❌ UI/UX changes (test infrastructure focus)
- ❌ Documentation rewrites (test docs only)

## Implementation Notes

**TDD Workflow**:
1. 📝 Write failing test first (red phase)
2. ✅ Implement minimal code to pass (green phase)
3. ♻️ Refactor with confidence (refactor phase)
4. 🔁 Repeat for each component

**Test Strategy**:
- Start with unit tests (fastest feedback)
- Add integration tests (component interactions)
- Finish with E2E tests (full workflows)
- Maintain 60/30/10 test distribution

**CI/CD Integration**:
- GitHub Actions workflow for test execution
- Coverage reports published as artifacts
- Failed tests block merges
- Performance benchmarks tracked over time

## References

**Architecture**:
- [ADR-0017: Multi-Project Internal Structure](../../docs/internal/architecture/adr/0017-multi-project-internal-structure.md)
- [ADR-0018: Brownfield Classification Algorithm](../../docs/internal/architecture/adr/0018-brownfield-classification-algorithm.md)
- [ADR-0019: Test Infrastructure Architecture](../../docs/internal/architecture/adr/0019-test-infrastructure-architecture.md)

**Related Increments**:
- Increment 0012: Multi-Project Internal Structure (functionality being tested)

**GitHub Issue**: #26 - https://github.com/anton-abyzov/specweave/issues/26
