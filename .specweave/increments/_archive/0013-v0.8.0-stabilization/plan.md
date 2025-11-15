---
increment: 0013-v0.8.0-stabilization
architecture_docs:
  - ../../docs/internal/architecture/system-design.md
  - ../../docs/internal/architecture/adr/0017-multi-project-internal-structure.md
  - ../../docs/internal/architecture/adr/0018-brownfield-classification-algorithm.md
  - ../../docs/internal/architecture/adr/0019-test-infrastructure-architecture.md
test_mode: TDD
coverage_target: 90%
status: planning
---

# Implementation Plan: v0.8.0 Stabilization & Test Coverage

## Architecture Overview

**Complete architecture**: See [System Design](../../docs/internal/architecture/system-design.md)

**Key decisions**:
- [ADR-0017: Multi-Project Internal Structure](../../docs/internal/architecture/adr/0017-multi-project-internal-structure.md) - Projects folder architecture
- [ADR-0018: Brownfield Classification Algorithm](../../docs/internal/architecture/adr/0018-brownfield-classification-algorithm.md) - Keyword-based file classification
- [ADR-0019: Test Infrastructure Architecture](../../docs/internal/architecture/adr/0019-test-infrastructure-architecture.md) - Testing strategy and tools

## Technology Stack

### Core Testing Infrastructure
- **Unit Testing**: Jest 29+ with ts-jest for TypeScript support
- **Integration Testing**: Jest with real file system operations (temp directories)
- **E2E Testing**: Playwright 1.48+ for CLI command execution
- **Coverage**: Istanbul/nyc built into Jest (90% target)
- **Mocking**: Jest built-in mocks + manual mocks for file system operations

### Test Data & Fixtures
- **Location**: `tests/fixtures/brownfield/`
- **Types**:
  - Notion exports (20+ sample markdown files)
  - Confluence exports (HTML/markdown hybrid)
  - GitHub Wiki structure
  - Custom markdown collections
- **Categories**: Specs, modules, team docs, legacy (uncategorized)

### Performance Measurement
- **Benchmarking**: Custom performance utilities in `tests/utils/benchmark.ts`
- **Metrics**: Execution time, memory usage, classification accuracy
- **Targets**:
  - Path resolution: <1ms per call
  - Import 500 files: <2 minutes
  - Memory usage: <100MB during import
  - Classification accuracy: 85%+

## Test Architecture Strategy

### Three-Layer Test Pyramid

```
         /\
        /E2\        E2E Tests (10% coverage)
       /____\       - CLI command execution
      /      \      - End-to-end workflows
     /  Intg  \     Integration Tests (30% coverage)
    /          \    - Real file operations
   /____________\   - Multi-component interactions
  /              \
 /      Unit      \ Unit Tests (60% coverage)
/__________________\ - Component isolation
                     - Pure functions
                     - Mocked dependencies
```

### Test Coverage by Component

| Component | Unit Tests | Integration Tests | E2E Tests | Target Coverage |
|-----------|-----------|------------------|-----------|----------------|
| **ProjectManager** | ✅ Path resolution, caching | ✅ Project switching, structure creation | ✅ CLI init-multiproject | 90% |
| **BrownfieldAnalyzer** | ✅ Keyword scoring, classification | ✅ Multi-file analysis | ✅ CLI import-docs | 85% |
| **BrownfieldImporter** | ✅ File copying logic | ✅ Import orchestration | ✅ CLI import-docs | 85% |
| **CLI Commands** | ✅ Argument parsing | ✅ Inquirer prompts | ✅ Full command execution | 80% |

### Test Organization

```
tests/
├── unit/                              # Unit tests (isolated components)
│   ├── project-manager/
│   │   ├── path-resolution.test.ts    # Path getters (getSpecsPath, etc.)
│   │   ├── project-switching.test.ts  # Switch logic
│   │   ├── caching.test.ts            # Cache mechanism
│   │   └── validation.test.ts         # Input validation
│   ├── brownfield/
│   │   ├── analyzer/
│   │   │   ├── keyword-scoring.test.ts      # Score calculation
│   │   │   ├── classification.test.ts       # Type determination
│   │   │   ├── confidence-scoring.test.ts   # Confidence algorithm
│   │   │   └── edge-cases.test.ts          # Empty files, no keywords
│   │   └── importer/
│   │       ├── file-copying.test.ts         # Copy logic
│   │       ├── structure-preservation.test.ts # Folder hierarchy
│   │       ├── duplicate-handling.test.ts   # Filename conflicts
│   │       └── report-generation.test.ts    # README creation
│   └── cli/
│       ├── init-multiproject.test.ts        # Argument parsing
│       ├── import-docs.test.ts              # Option parsing
│       └── switch-project.test.ts           # Validation
│
├── integration/                        # Integration tests (multi-component)
│   ├── project-manager/
│   │   ├── full-lifecycle.test.ts      # Create → Switch → Remove
│   │   ├── structure-creation.test.ts  # README generation
│   │   └── config-updates.test.ts      # Config persistence
│   ├── brownfield/
│   │   ├── import-workflow.test.ts     # Analyze → Import → Report
│   │   ├── multi-source.test.ts        # Notion, Confluence, Wiki
│   │   └── classification-accuracy.test.ts # Real fixture validation
│   └── cli/
│       ├── init-multiproject-flow.test.ts  # Full command execution
│       ├── import-docs-flow.test.ts        # With real fixtures
│       └── switch-project-flow.test.ts     # State changes
│
├── e2e/                                # End-to-end tests (CLI)
│   ├── multiproject-setup.spec.ts      # Full setup workflow
│   ├── brownfield-import.spec.ts       # Import → Verify → Clean up
│   └── project-switching.spec.ts       # Switch → Verify paths
│
└── fixtures/                           # Test data
    ├── brownfield/
    │   ├── notion-export/              # 20+ files (specs, modules, team, legacy)
    │   │   ├── user-stories/
    │   │   │   ├── auth-feature.md     # High confidence spec
    │   │   │   └── payment-flow.md     # Medium confidence spec
    │   │   ├── components/
    │   │   │   ├── auth-module.md      # High confidence module
    │   │   │   └── api-design.md       # Medium confidence module
    │   │   ├── team/
    │   │   │   ├── onboarding.md       # High confidence team
    │   │   │   └── conventions.md      # High confidence team
    │   │   └── misc/
    │   │       ├── meeting-notes.md    # Low confidence legacy
    │   │       └── random-ideas.md     # Low confidence legacy
    │   ├── confluence-export/          # HTML + markdown hybrid
    │   ├── wiki-export/                # Git repo structure
    │   └── custom/                     # Mixed markdown files
    └── configs/
        ├── single-project.json         # Single project config
        └── multi-project.json          # Multi-project config
```

## Implementation Phases

### Phase 1: Test Infrastructure Setup (Priority: P0)

**Objective**: Establish test infrastructure and fixtures

**Tasks**:
1. Create test fixtures:
   - Generate 20+ realistic markdown files for Notion export
   - Create files with varying keyword densities (high/medium/low confidence)
   - Include edge cases (empty files, no keywords, mixed signals)
   - Document expected classifications in `fixtures/README.md`

2. Set up Jest configuration:
   - Configure ts-jest for TypeScript support
   - Set up coverage thresholds (90% unit, 80% integration)
   - Add test utilities (temp directory helpers, fixture loaders)
   - Create custom matchers for confidence scores

3. Create test utilities:
   - `tests/utils/temp-dir.ts` - Temp directory creation/cleanup
   - `tests/utils/fixture-loader.ts` - Load and parse test fixtures
   - `tests/utils/benchmark.ts` - Performance measurement
   - `tests/utils/matchers.ts` - Custom Jest matchers

**Acceptance Criteria**:
- ✅ 20+ fixture files with documented expected classifications
- ✅ Jest config with 90% coverage threshold
- ✅ Test utilities with TypeScript types
- ✅ Benchmark utilities for performance measurement

### Phase 2: ProjectManager Unit Tests (Priority: P1)

**Objective**: Test ProjectManager in isolation with mocked dependencies

**Test Cases**:

**T2.1: Path Resolution Tests** (`tests/unit/project-manager/path-resolution.test.ts`)
- ✅ `getProjectBasePath()` returns correct path for active project
- ✅ `getProjectBasePath(projectId)` returns correct path for specific project
- ✅ `getSpecsPath()` appends `/specs` to base path
- ✅ `getModulesPath()` appends `/modules` to base path
- ✅ `getTeamPath()` appends `/team` to base path
- ✅ `getArchitecturePath()` appends `/architecture` to base path
- ✅ `getLegacyPath()` returns base legacy path when no source
- ✅ `getLegacyPath('notion')` appends source type to legacy path
- ✅ Path resolution throws error for non-existent project ID
- ✅ **Performance**: Path resolution <1ms per call (benchmark 1000 calls)

**T2.2: Project Switching Tests** (`tests/unit/project-manager/project-switching.test.ts`)
- ✅ `switchProject()` updates config.multiProject.activeProject
- ✅ `switchProject()` clears cached project
- ✅ `switchProject()` throws error if multi-project not enabled
- ✅ `switchProject()` throws error for non-existent project
- ✅ `switchProject()` validates project exists before switching
- ✅ Switching to same project is idempotent (no errors)

**T2.3: Caching Tests** (`tests/unit/project-manager/caching.test.ts`)
- ✅ `getActiveProject()` caches result on first call
- ✅ `getActiveProject()` returns cached project on subsequent calls
- ✅ `getActiveProject()` doesn't reload config when cached
- ✅ `clearCache()` forces reload on next `getActiveProject()` call
- ✅ `switchProject()` clears cache automatically
- ✅ Cache invalidated when config file changes (watch mechanism)

**T2.4: Validation Tests** (`tests/unit/project-manager/validation.test.ts`)
- ✅ `addProject()` validates project ID is kebab-case
- ✅ `addProject()` rejects duplicate project IDs
- ✅ `addProject()` rejects empty project name
- ✅ `removeProject()` prevents removing 'default' project
- ✅ `removeProject()` prevents removing active project
- ✅ Multi-project mode validation (activeProject must exist)

**Coverage Target**: 90%+

**Dependencies**: Mock `ConfigManager`, mock `fs-extra`

### Phase 3: BrownfieldAnalyzer Unit Tests (Priority: P1)

**Objective**: Test classification algorithm in isolation

**Test Cases**:

**T3.1: Keyword Scoring Tests** (`tests/unit/brownfield/analyzer/keyword-scoring.test.ts`)
- ✅ `scoreKeywords()` returns 0 for text with no keyword matches
- ✅ `scoreKeywords()` returns >0 for text with keyword matches
- ✅ `scoreKeywords()` weights multi-word keywords higher (e.g., "user story" > "story")
- ✅ `scoreKeywords()` normalizes score to 0-1 range
- ✅ `scoreKeywords()` combines base score (match ratio) + weighted score (keyword specificity)
- ✅ **Edge case**: Empty text returns 0
- ✅ **Edge case**: Empty keyword list returns 0
- ✅ **Performance**: Score 100 keywords in <10ms

**T3.2: Classification Tests** (`tests/unit/brownfield/analyzer/classification.test.ts`)
- ✅ File with spec keywords (user story, acceptance criteria) classified as 'spec'
- ✅ File with module keywords (architecture, component) classified as 'module'
- ✅ File with team keywords (onboarding, conventions) classified as 'team'
- ✅ File with no strong keywords classified as 'legacy'
- ✅ File with mixed keywords classified by highest score
- ✅ Classification threshold 0.3 applied (scores <0.3 → legacy)
- ✅ Frontmatter keywords included in analysis (YAML metadata)
- ✅ Code blocks excluded from keyword matching

**T3.3: Confidence Scoring Tests** (`tests/unit/brownfield/analyzer/confidence-scoring.test.ts`)
- ✅ High keyword density (10+ matches) → confidence >0.7
- ✅ Medium keyword density (5-10 matches) → confidence 0.5-0.7
- ✅ Low keyword density (1-4 matches) → confidence 0.3-0.5
- ✅ Confidence score proportional to keyword count
- ✅ Multi-word keywords increase confidence more than single words
- ✅ Confidence scores normalized to 0-1 range

**T3.4: Edge Cases Tests** (`tests/unit/brownfield/analyzer/edge-cases.test.ts`)
- ✅ Empty file returns type='legacy', confidence=0
- ✅ File with only frontmatter (no content) analyzed correctly
- ✅ File with code blocks (triple backticks) doesn't match keywords in code
- ✅ File with inline code (single backticks) doesn't match keywords in code
- ✅ Very large file (10,000+ lines) analyzed without performance degradation
- ✅ Binary file (non-UTF8) handled gracefully (skip or error)
- ✅ File with special characters in name handled correctly

**Coverage Target**: 85%+

**Dependencies**: Mock `fs-extra` for file reading

### Phase 4: BrownfieldImporter Unit Tests (Priority: P1)

**Objective**: Test import orchestration logic in isolation

**Test Cases**:

**T4.1: File Copying Tests** (`tests/unit/brownfield/importer/file-copying.test.ts`)
- ✅ `importFiles()` copies files to destination directory
- ✅ `importFiles()` creates destination directory if not exists
- ✅ `importFiles()` with `preserveStructure=false` flattens files
- ✅ `importFiles()` with `preserveStructure=true` preserves folder hierarchy
- ✅ `importFiles()` handles empty file list (no error)

**T4.2: Structure Preservation Tests** (`tests/unit/brownfield/importer/structure-preservation.test.ts`)
- ✅ Flat import (preserveStructure=false) copies all files to single folder
- ✅ Hierarchical import (preserveStructure=true) maintains subfolder structure
- ✅ Nested folders preserved up to 5 levels deep
- ✅ Empty folders created in destination (if preserveStructure=true)

**T4.3: Duplicate Handling Tests** (`tests/unit/brownfield/importer/duplicate-handling.test.ts`)
- ✅ Duplicate filename gets timestamp suffix (e.g., `file-1234567890.md`)
- ✅ Multiple duplicates get unique timestamps
- ✅ Duplicate handling works with preserveStructure=false
- ✅ Duplicate handling works with preserveStructure=true
- ✅ Timestamp format: Unix milliseconds

**T4.4: Report Generation Tests** (`tests/unit/brownfield/importer/report-generation.test.ts`)
- ✅ `createMigrationReport()` creates README.md in legacy folder
- ✅ Report includes source type, path, timestamp
- ✅ Report includes classification summary (specs, modules, team, legacy counts)
- ✅ Report includes next steps section
- ✅ Report includes confidence scores section
- ✅ Report markdown format valid (no syntax errors)

**Coverage Target**: 85%+

**Dependencies**: Mock `fs-extra`, mock `BrownfieldAnalyzer`, mock `ProjectManager`

### Phase 5: Integration Tests (Priority: P2)

**Objective**: Test multi-component interactions with real file system

**Test Cases**:

**T5.1: ProjectManager Full Lifecycle** (`tests/integration/project-manager/full-lifecycle.test.ts`)
- ✅ Create project → verify structure created
- ✅ Switch to project → verify config updated
- ✅ Remove project → verify config updated
- ✅ Create → Switch → Remove → verify no errors
- ✅ Multiple projects created → verify all structures exist

**T5.2: Brownfield Import Workflow** (`tests/integration/brownfield/import-workflow.test.ts`)
- ✅ Analyze fixtures → verify counts (specs, modules, team, legacy)
- ✅ Import fixtures → verify files copied to correct destinations
- ✅ Import → verify migration report created
- ✅ Import → verify config updated with import history
- ✅ Dry run → verify no files copied (preview only)

**T5.3: Classification Accuracy** (`tests/integration/brownfield/classification-accuracy.test.ts`)
- ✅ Import Notion export → verify 85%+ accuracy
- ✅ Import Confluence export → verify 85%+ accuracy
- ✅ Import Wiki export → verify 85%+ accuracy
- ✅ **Accuracy metric**: (correct classifications / total files) ≥ 0.85
- ✅ Document misclassifications in test output (for tuning)

**T5.4: Multi-Source Import** (`tests/integration/brownfield/multi-source.test.ts`)
- ✅ Import Notion → verify legacy/notion/ folder
- ✅ Import Confluence → verify legacy/confluence/ folder
- ✅ Import Wiki → verify legacy/wiki/ folder
- ✅ Multiple imports to same project → verify no conflicts

**Coverage Target**: 80%+

**Dependencies**: Real file system (temp directories), real configs

### Phase 6: CLI E2E Tests (Priority: P3)

**Objective**: Test complete CLI workflows with Playwright

**Test Cases**:

**T6.1: Multi-Project Setup** (`tests/e2e/multiproject-setup.spec.ts`)
- ✅ Run `/specweave:init-multiproject` → verify interactive prompts
- ✅ Enable multi-project mode → verify config.multiProject.enabled = true
- ✅ Create additional project → verify structure created
- ✅ List projects → verify output shows all projects
- ✅ **Performance**: Setup <30 seconds

**T6.2: Brownfield Import** (`tests/e2e/brownfield-import.spec.ts`)
- ✅ Run `/specweave:import-docs ./fixtures/notion-export` → verify prompts
- ✅ Select source type → verify import executes
- ✅ Verify files imported to correct folders
- ✅ Verify migration report created
- ✅ Verify config updated
- ✅ **Performance**: Import 50 files <10 seconds

**T6.3: Project Switching** (`tests/e2e/project-switching.spec.ts`)
- ✅ Run `/specweave:switch-project <project-id>` → verify success message
- ✅ Verify config.multiProject.activeProject updated
- ✅ Run commands → verify they use new active project
- ✅ Switch to non-existent project → verify error message

**Coverage Target**: 75%+ (critical paths only)

**Dependencies**: Playwright, spawned CLI processes, real file system

### Phase 7: Performance Benchmarking (Priority: P2)

**Objective**: Measure and optimize performance

**Benchmarks**:

**B7.1: Path Resolution Performance** (`tests/performance/project-manager.bench.ts`)
- ✅ Measure `getProjectBasePath()` execution time (1000 calls)
- ✅ Measure `getSpecsPath()` execution time (1000 calls)
- ✅ Target: <1ms per call (average)
- ✅ Verify caching improves performance (cached vs uncached)

**B7.2: Import Performance** (`tests/performance/brownfield-import.bench.ts`)
- ✅ Measure import time for 50 files
- ✅ Measure import time for 500 files
- ✅ Target: <2 minutes for 500 files
- ✅ Measure memory usage during import
- ✅ Target: <100MB peak memory

**B7.3: Classification Performance** (`tests/performance/analyzer.bench.ts`)
- ✅ Measure classification time for 100 files
- ✅ Target: <5 seconds for 100 files
- ✅ Measure accuracy vs speed trade-off
- ✅ Document optimal keyword count for performance

**Output**: Performance report in `tests/performance/RESULTS.md`

### Phase 8: Documentation & CI/CD Integration (Priority: P2)

**Objective**: Document testing approach and integrate with CI

**Tasks**:

**D8.1: Test Documentation**
- ✅ Create `tests/README.md` - Test suite overview
- ✅ Document test fixtures in `tests/fixtures/README.md`
- ✅ Document performance benchmarks in `tests/performance/RESULTS.md`
- ✅ Update CLAUDE.md with test infrastructure section

**D8.2: CI/CD Integration**
- ✅ Add test scripts to `package.json`:
  - `npm run test:unit` - Unit tests only
  - `npm run test:integration` - Integration tests only
  - `npm run test:e2e` - E2E tests only
  - `npm run test:all` - All tests
  - `npm run test:coverage` - Generate coverage report
- ✅ Update GitHub Actions workflow (`.github/workflows/test.yml`)
- ✅ Add coverage reporting to CI (e.g., Codecov)
- ✅ Add performance regression checks

**D8.3: Test Utilities Documentation**
- ✅ Document temp directory helpers (`tests/utils/temp-dir.ts`)
- ✅ Document fixture loaders (`tests/utils/fixture-loader.ts`)
- ✅ Document benchmark utilities (`tests/utils/benchmark.ts`)

## Testing Approach Summary

### Test-Driven Development (TDD) Workflow

**For Each Component**:
1. **Red**: Write failing test first
2. **Green**: Implement minimal code to pass test
3. **Refactor**: Improve code while keeping tests green
4. **Repeat**: Add next test case

**Example (ProjectManager path resolution)**:
```typescript
// Step 1: RED - Write failing test
describe('ProjectManager.getSpecsPath', () => {
  it('should return specs path for active project', () => {
    const pm = new ProjectManager('/project-root');
    expect(pm.getSpecsPath()).toBe('/project-root/.specweave/docs/internal/projects/default/specs');
  });
});
// Test fails (method not implemented)

// Step 2: GREEN - Implement method
getSpecsPath(projectId?: string): string {
  return path.join(this.getProjectBasePath(projectId), 'specs');
}
// Test passes

// Step 3: REFACTOR - Add caching, error handling, etc.
// Tests still pass
```

### Mock vs Real File System

**Unit Tests**: Use mocks
```typescript
jest.mock('fs-extra');
const mockFs = fs as jest.Mocked<typeof fs>;
mockFs.readFile.mockResolvedValue('file content');
```

**Integration Tests**: Use real file system (temp directories)
```typescript
const tempDir = await createTempDir();
await fs.writeFile(path.join(tempDir, 'test.md'), 'content');
// ... test logic ...
await cleanupTempDir(tempDir);
```

**E2E Tests**: Use real file system (Playwright test isolation)
```typescript
test('import docs', async ({ page }) => {
  await page.goto('http://localhost:3000/import-docs');
  // ... interact with CLI ...
});
```

### Coverage Measurement

**Unit Tests**: 90% threshold
```bash
npm run test:unit -- --coverage
# Enforces 90% coverage for unit tests
```

**Integration Tests**: 80% threshold
```bash
npm run test:integration -- --coverage
# Enforces 80% coverage for integration tests
```

**Overall**: 85% threshold
```bash
npm run test:all -- --coverage
# Enforces 85% overall coverage
```

**Coverage Report**: Generated in `coverage/lcov-report/index.html`

## Quality Gates

### Test Quality Requirements

1. **Zero Flakiness**: Tests must be deterministic (no random data, no timing issues)
2. **Fast Execution**: Total test suite <5 minutes
3. **Clear Error Messages**: Failures must be self-explanatory
4. **Edge Case Coverage**: Test boundary conditions, empty inputs, invalid data
5. **Performance Validation**: Benchmark critical paths

### Acceptance Criteria for Increment Completion

- ✅ All unit tests passing (90%+ coverage)
- ✅ All integration tests passing (80%+ coverage)
- ✅ All E2E tests passing (75%+ coverage)
- ✅ Overall coverage ≥85%
- ✅ Performance benchmarks meet targets
- ✅ Zero test flakiness (100 consecutive CI runs with no random failures)
- ✅ Test documentation complete

## Dependencies

### External Dependencies
- Jest 29+ (unit/integration testing)
- Playwright 1.48+ (E2E testing)
- ts-jest (TypeScript support)
- @types/jest (TypeScript types)
- Istanbul/nyc (coverage reporting, built into Jest)

### Internal Dependencies
- All components from increment 0012 (ProjectManager, BrownfieldAnalyzer, BrownfieldImporter, CLI commands)
- ConfigManager (tested in previous increments)
- ProjectDetection utilities (tested in previous increments)

### Test Fixtures
- 20+ markdown files representing realistic brownfield exports
- Sample configs (single-project, multi-project)
- Expected classification results (documented in fixtures/README.md)

## Risk Mitigation

### Technical Risks

1. **Test Flakiness Risk**:
   - **Mitigation**: Use deterministic test data, no random values
   - **Mitigation**: Use proper async/await handling
   - **Mitigation**: Clean up temp directories in `afterEach` hooks

2. **Performance Regression Risk**:
   - **Mitigation**: Benchmark tests run in CI
   - **Mitigation**: Fail CI if performance degrades >10%
   - **Mitigation**: Monitor memory usage in long-running tests

3. **Coverage Gaps Risk**:
   - **Mitigation**: Use `--coverage` flag to identify untested code
   - **Mitigation**: Write tests for all public APIs
   - **Mitigation**: Edge case tests for boundary conditions

4. **Classification Accuracy Risk**:
   - **Mitigation**: Validate against 85% accuracy target
   - **Mitigation**: Document misclassifications for keyword tuning
   - **Mitigation**: Allow manual reclassification in real usage

## Success Metrics

### Quantitative Metrics
- **Coverage**: ≥85% overall, ≥90% unit, ≥80% integration
- **Performance**: All benchmarks within targets
- **Test Count**: 150+ test cases total
- **CI Duration**: <10 minutes for full test suite

### Qualitative Metrics
- **Confidence**: Developers trust test suite (no false positives/negatives)
- **Maintainability**: Tests easy to update when code changes
- **Documentation**: Clear test documentation and examples

## Next Steps After Completion

1. **v0.9.0 Feature Development**: With stable test coverage, proceed with new features
2. **Performance Optimization**: Use benchmark results to identify bottlenecks
3. **Test Automation**: Set up automated test runs on every PR
4. **Test Expansion**: Add tests for future components as they're developed

---

**References**:
- [ADR-0019: Test Infrastructure Architecture](../../docs/internal/architecture/adr/0019-test-infrastructure-architecture.md)
- [Increment 0012: Multi-Project Internal Structure](../0012-multi-project-internal-structure/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)

**Last Updated**: 2025-11-05
**Status**: Planning Complete
