---
increment: 0013-v0.8.0-stabilization
total_tasks: 24
completed_tasks: 0
test_mode: TDD
coverage_target: 85%
---

# Implementation Tasks: v0.8.0 Stabilization & Test Coverage

## Overview

This increment adds comprehensive test coverage deferred from increment 0012 (Multi-Project Internal Structure). The focus is on testing ProjectManager, BrownfieldAnalyzer, and BrownfieldImporter components with TDD methodology.

**Test Strategy**: Three-layer pyramid (60% unit, 30% integration, 10% E2E)
**Coverage Targets**: 90% unit, 85% integration, 85% overall
**Test Framework**: Jest + ts-jest + Playwright

---

## Phase 1: Test Infrastructure Setup

### T-001: Create Test Fixtures for Brownfield Import

**Priority**: P0
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** a realistic brownfield documentation set (Notion/Confluence/Wiki exports)
- **When** test suites analyze these fixtures
- **Then** they should classify files with 85%+ accuracy
- **And** fixtures should cover high/medium/low confidence scenarios

**Test Cases**:
1. **Unit**: `tests/unit/fixtures/fixture-loader.test.ts`
   - testLoadNotionExport(): Loads 20+ Notion markdown files
   - testLoadConfluenceExport(): Loads HTML/markdown hybrid
   - testLoadWikiExport(): Loads Git wiki structure
   - testFixtureMetadata(): Validates documented expected classifications
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/fixtures/fixture-validation.test.ts`
   - testNotionExportClassification(): Verifies expected types (spec/module/team/legacy)
   - testConfluenceExportClassification(): Verifies HTML parsing works
   - testWikiExportClassification(): Verifies Git repo structure preserved
   - **Coverage Target**: 85%

**Overall Coverage Target**: 87%

**Implementation**:
1. Create fixture directory structure:
   ```
   tests/fixtures/brownfield/
   ├── notion-export/
   │   ├── user-stories/
   │   │   ├── auth-feature.md (spec, high confidence)
   │   │   └── payment-flow.md (spec, medium confidence)
   │   ├── components/
   │   │   ├── auth-module.md (module, high confidence)
   │   │   └── api-design.md (module, medium confidence)
   │   ├── team/
   │   │   ├── onboarding.md (team, high confidence)
   │   │   └── conventions.md (team, high confidence)
   │   └── misc/
   │       ├── meeting-notes.md (legacy, low confidence)
   │       └── random-ideas.md (legacy, low confidence)
   ├── confluence-export/
   ├── wiki-export/
   └── custom/
   ```
2. Create 20+ realistic markdown files with varying keyword densities
3. Add frontmatter metadata with expected classifications
4. Create `tests/fixtures/README.md` documenting fixture structure and expectations
5. Create fixture loader utility: `tests/utils/fixture-loader.ts`
6. Write fixture loader tests (should pass: 4/4)
7. Write fixture validation tests (should pass: 3/3)
8. Verify all fixtures load correctly

**TDD Workflow**:
1. 📝 Write all 7 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/fixtures` (0/7 passing)
3. ✅ Create fixture files and loader utility
4. 🟢 Run tests: `npm test -- tests/unit/fixtures` (7/7 passing)
5. ♻️ Refactor fixture loader if needed
6. ✅ Final check: Coverage ≥87%

---

### T-002: Set Up Jest Configuration with TypeScript

**Priority**: P0
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** a TypeScript codebase requiring test coverage
- **When** Jest is configured with ts-jest and coverage thresholds
- **Then** tests should run with TypeScript support
- **And** coverage reports should be generated with 90% threshold for unit tests

**Test Cases**:
1. **Unit**: `tests/unit/jest-config/jest-setup.test.ts`
   - testJestConfigLoads(): Verifies jest.config.js is valid
   - testTsJestTransform(): Verifies TypeScript files transform correctly
   - testCoverageThresholds(): Verifies 90% unit, 80% integration thresholds set
   - testTestEnvironment(): Verifies node environment configured
   - **Coverage Target**: N/A (configuration test)

**Overall Coverage Target**: N/A (infrastructure setup)

**Implementation**:
1. Create `jest.config.js`:
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     roots: ['<rootDir>/tests'],
     testMatch: ['**/*.test.ts'],
     collectCoverageFrom: [
       'src/**/*.ts',
       '!src/**/*.d.ts',
       '!src/**/index.ts'
     ],
     coverageThreshold: {
       global: {
         branches: 85,
         functions: 85,
         lines: 85,
         statements: 85
       },
       './tests/unit/**/*.ts': {
         branches: 90,
         functions: 90,
         lines: 90,
         statements: 90
       },
       './tests/integration/**/*.ts': {
         branches: 80,
         functions: 80,
         lines: 80,
         statements: 80
       }
     },
     setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/src/$1'
     }
   };
   ```
2. Create `tests/setup.ts` for global test setup
3. Install dependencies: `npm install -D jest ts-jest @types/jest`
4. Add test scripts to `package.json`:
   - `test:unit`: Jest unit tests only
   - `test:integration`: Jest integration tests only
   - `test:e2e`: Playwright E2E tests
   - `test:all`: All tests
   - `test:coverage`: Generate coverage report
5. Create `.gitignore` entries for `coverage/`
6. Write Jest config validation test (should pass: 4/4)
7. Run test to verify Jest works: `npm run test:unit`

**TDD Workflow**:
1. 📝 Write Jest config validation test (should fail)
2. ❌ Run test: `npm test` (0/4 passing)
3. ✅ Create jest.config.js and install dependencies
4. 🟢 Run test: `npm test` (4/4 passing)
5. ♻️ Refactor config if needed
6. ✅ Final check: Jest runs without errors

---

### T-003: Create Test Utilities (Temp Dir, Matchers, Benchmark)

**Priority**: P0
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** test suites requiring temp directories, custom assertions, and performance measurement
- **When** test utilities are created for common operations
- **Then** tests should be able to use temp dirs, custom matchers, and benchmarks
- **And** utilities should clean up resources properly

**Test Cases**:
1. **Unit**: `tests/unit/utils/temp-dir.test.ts`
   - testCreateTempDir(): Creates unique temp directory
   - testCleanupTempDir(): Removes temp directory and contents
   - testNestedTempDirs(): Handles nested folder structures
   - testCleanupOnError(): Cleans up even if test fails
   - **Coverage Target**: 95%

2. **Unit**: `tests/unit/utils/matchers.test.ts`
   - testToBeWithinRange(): Custom matcher for confidence scores (0-1)
   - testToHaveClassification(): Matcher for file classification results
   - testToHaveKeywordScore(): Matcher for keyword scoring
   - **Coverage Target**: 90%

3. **Unit**: `tests/unit/utils/benchmark.test.ts`
   - testMeasureExecutionTime(): Measures function execution time
   - testMeasureMemoryUsage(): Measures memory consumption
   - testBenchmarkIterations(): Runs N iterations and averages
   - **Coverage Target**: 90%

**Overall Coverage Target**: 92%

**Implementation**:
1. Create `tests/utils/temp-dir.ts`:
   ```typescript
   export async function createTempDir(prefix = 'specweave-test-'): Promise<string>
   export async function cleanupTempDir(dirPath: string): Promise<void>
   export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T>
   ```
2. Create `tests/utils/matchers.ts`:
   ```typescript
   expect.extend({
     toBeWithinRange(received: number, min: number, max: number),
     toHaveClassification(received: object, expected: {type: string, confidence: number}),
     toHaveKeywordScore(received: number, min: number)
   });
   ```
3. Create `tests/utils/benchmark.ts`:
   ```typescript
   export async function measureExecutionTime<T>(fn: () => T): Promise<{result: T, time: number}>
   export function measureMemoryUsage(): {heapUsed: number, heapTotal: number}
   export async function benchmark(fn: () => void, iterations: number): Promise<{avg: number, min: number, max: number}>
   ```
4. Write unit tests for temp-dir utility (should pass: 4/4)
5. Write unit tests for matchers utility (should pass: 3/3)
6. Write unit tests for benchmark utility (should pass: 3/3)
7. Register matchers in `tests/setup.ts`
8. Verify coverage: `npm run test:coverage -- tests/unit/utils` (≥92%)

**TDD Workflow**:
1. 📝 Write all 10 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/utils` (0/10 passing)
3. ✅ Implement temp-dir utility
4. ✅ Implement matchers utility
5. ✅ Implement benchmark utility
6. 🟢 Run tests: `npm test -- tests/unit/utils` (10/10 passing)
7. ♻️ Refactor utilities if needed
8. ✅ Final check: Coverage ≥92%

---

## Phase 2: ProjectManager Unit Tests

### T-004: Test ProjectManager Path Resolution

**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** a ProjectManager instance with a project root path
- **When** path getter methods are called (getSpecsPath, getModulesPath, etc.)
- **Then** they should return correct absolute paths
- **And** paths should resolve in <1ms per call (performance requirement)

**Test Cases**:
1. **Unit**: `tests/unit/project-manager/path-resolution.test.ts`
   - testGetProjectBasePath(): Returns correct path for active project
   - testGetProjectBasePathWithId(): Returns correct path for specific project
   - testGetSpecsPath(): Appends /specs to base path
   - testGetModulesPath(): Appends /modules to base path
   - testGetTeamPath(): Appends /team to base path
   - testGetArchitecturePath(): Appends /architecture to base path
   - testGetLegacyPath(): Returns base legacy path
   - testGetLegacyPathWithSource(): Appends source type to legacy path
   - testPathResolutionThrowsForNonExistentProject(): Error for invalid project ID
   - testPathResolutionPerformance(): <1ms per call (benchmark 1000 calls)
   - **Coverage Target**: 95%

**Overall Coverage Target**: 95%

**Implementation**:
1. Create `tests/unit/project-manager/path-resolution.test.ts`
2. Mock ConfigManager to return test project structure
3. Mock fs-extra to avoid real file system operations
4. Write test: testGetProjectBasePath() (should fail)
5. Implement ProjectManager.getProjectBasePath() method
6. Run test (should pass)
7. Repeat for all 10 test cases (TDD: Red → Green → Refactor)
8. Add performance benchmark test using benchmark utility
9. Verify coverage: `npm run test:coverage -- tests/unit/project-manager/path-resolution` (≥95%)

**TDD Workflow**:
1. 📝 Write all 10 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/project-manager/path-resolution` (0/10 passing)
3. ✅ Implement path resolution methods in ProjectManager
4. 🟢 Run tests: `npm test -- tests/unit/project-manager/path-resolution` (10/10 passing)
5. ♻️ Refactor for performance optimization
6. ✅ Final check: Coverage ≥95%, performance <1ms

---

### T-005: Test ProjectManager Project Switching

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** a ProjectManager instance with multi-project mode enabled
- **When** switchProject(projectId) is called
- **Then** config.multiProject.activeProject should update
- **And** cached project should be cleared for reload

**Test Cases**:
1. **Unit**: `tests/unit/project-manager/project-switching.test.ts`
   - testSwitchProjectUpdatesConfig(): config.multiProject.activeProject updated
   - testSwitchProjectClearsCache(): Cache invalidated after switch
   - testSwitchProjectThrowsIfDisabled(): Error when multi-project disabled
   - testSwitchProjectThrowsForNonExistent(): Error for invalid project ID
   - testSwitchProjectValidatesExistence(): Validates project exists before switching
   - testSwitchToSameProjectIdempotent(): No error when switching to current project
   - **Coverage Target**: 92%

**Overall Coverage Target**: 92%

**Implementation**:
1. Create `tests/unit/project-manager/project-switching.test.ts`
2. Mock ConfigManager to provide multi-project config
3. Mock fs-extra for file existence checks
4. Write test: testSwitchProjectUpdatesConfig() (should fail)
5. Implement ProjectManager.switchProject() method
6. Run test (should pass)
7. Repeat for all 6 test cases (TDD: Red → Green → Refactor)
8. Verify coverage: `npm run test:coverage -- tests/unit/project-manager/project-switching` (≥92%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/project-manager/project-switching` (0/6 passing)
3. ✅ Implement switchProject() method
4. 🟢 Run tests: `npm test -- tests/unit/project-manager/project-switching` (6/6 passing)
5. ♻️ Refactor error handling
6. ✅ Final check: Coverage ≥92%

---

### T-006: Test ProjectManager Caching Mechanism

**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** a ProjectManager instance
- **When** getActiveProject() is called multiple times
- **Then** config should be loaded only once (cached)
- **And** clearCache() should force reload

**Test Cases**:
1. **Unit**: `tests/unit/project-manager/caching.test.ts`
   - testGetActiveProjectCachesResult(): First call caches project
   - testGetActiveProjectReturnsCached(): Subsequent calls use cache
   - testGetActiveProjectDoesntReloadConfig(): ConfigManager.load() called once
   - testClearCacheForcesReload(): clearCache() invalidates cache
   - testSwitchProjectClearsCache(): Switching projects clears cache
   - testCacheInvalidatedOnConfigChange(): File watcher detects config changes
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create `tests/unit/project-manager/caching.test.ts`
2. Mock ConfigManager to track load() call count
3. Write test: testGetActiveProjectCachesResult() (should fail)
4. Implement caching logic in ProjectManager
5. Run test (should pass)
6. Repeat for all 6 test cases (TDD: Red → Green → Refactor)
7. Verify coverage: `npm run test:coverage -- tests/unit/project-manager/caching` (≥90%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/project-manager/caching` (0/6 passing)
3. ✅ Implement caching logic with cachedActiveProject variable
4. 🟢 Run tests: `npm test -- tests/unit/project-manager/caching` (6/6 passing)
5. ♻️ Refactor cache invalidation
6. ✅ Final check: Coverage ≥90%

---

### T-007: Test ProjectManager Validation Logic

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** ProjectManager methods receiving user input
- **When** validation rules are applied (kebab-case, duplicates, reserved names)
- **Then** invalid inputs should throw descriptive errors
- **And** valid inputs should pass validation

**Test Cases**:
1. **Unit**: `tests/unit/project-manager/validation.test.ts`
   - testAddProjectValidatesKebabCase(): Rejects non-kebab-case project IDs
   - testAddProjectRejectsDuplicates(): Rejects duplicate project IDs
   - testAddProjectRejectsEmptyName(): Rejects empty project names
   - testRemoveProjectPreventsDefault(): Cannot remove 'default' project
   - testRemoveProjectPreventsActive(): Cannot remove active project
   - testMultiProjectModeValidation(): activeProject must exist in projects list
   - **Coverage Target**: 93%

**Overall Coverage Target**: 93%

**Implementation**:
1. Create `tests/unit/project-manager/validation.test.ts`
2. Mock ConfigManager to provide test configs
3. Write test: testAddProjectValidatesKebabCase() (should fail)
4. Implement validation in ProjectManager.addProject()
5. Run test (should pass)
6. Repeat for all 6 test cases (TDD: Red → Green → Refactor)
7. Verify coverage: `npm run test:coverage -- tests/unit/project-manager/validation` (≥93%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/project-manager/validation` (0/6 passing)
3. ✅ Implement validation logic (kebab-case regex, duplicate check, etc.)
4. 🟢 Run tests: `npm test -- tests/unit/project-manager/validation` (6/6 passing)
5. ♻️ Refactor validation error messages
6. ✅ Final check: Coverage ≥93%

---

## Phase 3: BrownfieldAnalyzer Unit Tests

### T-008: Test Keyword Scoring Algorithm

**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** a text string and list of keywords
- **When** scoreKeywords() is called
- **Then** it should return normalized score (0-1) based on keyword matches
- **And** multi-word keywords should be weighted higher than single words

**Test Cases**:
1. **Unit**: `tests/unit/brownfield/analyzer/keyword-scoring.test.ts`
   - testScoreKeywordsNoMatches(): Returns 0 for text with no keywords
   - testScoreKeywordsWithMatches(): Returns >0 for text with keywords
   - testScoreKeywordsWeightsMultiWord(): "user story" scores higher than "story"
   - testScoreKeywordsNormalized(): Score normalized to 0-1 range
   - testScoreKeywordsCombinesBaseAndWeighted(): Combines match ratio + specificity
   - testScoreKeywordsEmptyText(): Returns 0 for empty text
   - testScoreKeywordsEmptyKeywordList(): Returns 0 for empty keyword list
   - testScoreKeywordsPerformance(): Score 100 keywords in <10ms
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create `tests/unit/brownfield/analyzer/keyword-scoring.test.ts`
2. Write test: testScoreKeywordsNoMatches() (should fail)
3. Implement BrownfieldAnalyzer.scoreKeywords() method
4. Run test (should pass)
5. Repeat for all 8 test cases (TDD: Red → Green → Refactor)
6. Add performance benchmark test
7. Verify coverage: `npm run test:coverage -- tests/unit/brownfield/analyzer/keyword-scoring` (≥90%)

**TDD Workflow**:
1. 📝 Write all 8 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/brownfield/analyzer/keyword-scoring` (0/8 passing)
3. ✅ Implement scoreKeywords() with base + weighted scoring
4. 🟢 Run tests: `npm test -- tests/unit/brownfield/analyzer/keyword-scoring` (8/8 passing)
5. ♻️ Refactor for performance optimization
6. ✅ Final check: Coverage ≥90%, performance <10ms

---

### T-009: Test File Classification Logic

**Priority**: P1
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** markdown file content with varying keyword densities
- **When** classifyFile() is called
- **Then** it should return correct type (spec/module/team/legacy)
- **And** classification should respect 0.3 threshold (scores <0.3 → legacy)

**Test Cases**:
1. **Unit**: `tests/unit/brownfield/analyzer/classification.test.ts`
   - testClassifyFileAsSpec(): File with spec keywords → type='spec'
   - testClassifyFileAsModule(): File with module keywords → type='module'
   - testClassifyFileAsTeam(): File with team keywords → type='team'
   - testClassifyFileAsLegacy(): File with no strong keywords → type='legacy'
   - testClassifyFileMixedKeywords(): Mixed keywords → highest score wins
   - testClassifyFileThreshold(): Scores <0.3 → type='legacy'
   - testClassifyFileFrontmatter(): YAML frontmatter keywords included
   - testClassifyFileExcludesCodeBlocks(): Code blocks not matched
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create `tests/unit/brownfield/analyzer/classification.test.ts`
2. Load test fixtures with varying keyword densities
3. Write test: testClassifyFileAsSpec() (should fail)
4. Implement BrownfieldAnalyzer.classifyFile() method
5. Run test (should pass)
6. Repeat for all 8 test cases (TDD: Red → Green → Refactor)
7. Verify coverage: `npm run test:coverage -- tests/unit/brownfield/analyzer/classification` (≥88%)

**TDD Workflow**:
1. 📝 Write all 8 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/brownfield/analyzer/classification` (0/8 passing)
3. ✅ Implement classifyFile() with keyword scoring and threshold
4. 🟢 Run tests: `npm test -- tests/unit/brownfield/analyzer/classification` (8/8 passing)
5. ♻️ Refactor classification logic
6. ✅ Final check: Coverage ≥88%

---

### T-010: Test Confidence Scoring Algorithm

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** file content with varying keyword match counts
- **When** calculateConfidence() is called
- **Then** it should return confidence score (0-1) proportional to keyword density
- **And** high density (10+ matches) should yield confidence >0.7

**Test Cases**:
1. **Unit**: `tests/unit/brownfield/analyzer/confidence-scoring.test.ts`
   - testConfidenceHighDensity(): 10+ matches → confidence >0.7
   - testConfidenceMediumDensity(): 5-10 matches → confidence 0.5-0.7
   - testConfidenceLowDensity(): 1-4 matches → confidence 0.3-0.5
   - testConfidenceProportionalToCount(): More keywords → higher confidence
   - testConfidenceMultiWordBoost(): Multi-word keywords increase confidence more
   - testConfidenceNormalized(): Score normalized to 0-1 range
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create `tests/unit/brownfield/analyzer/confidence-scoring.test.ts`
2. Write test: testConfidenceHighDensity() (should fail)
3. Implement BrownfieldAnalyzer.calculateConfidence() method
4. Run test (should pass)
5. Repeat for all 6 test cases (TDD: Red → Green → Refactor)
6. Verify coverage: `npm run test:coverage -- tests/unit/brownfield/analyzer/confidence-scoring` (≥90%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/brownfield/analyzer/confidence-scoring` (0/6 passing)
3. ✅ Implement calculateConfidence() with density-based scoring
4. 🟢 Run tests: `npm test -- tests/unit/brownfield/analyzer/confidence-scoring` (6/6 passing)
5. ♻️ Refactor confidence calculation
6. ✅ Final check: Coverage ≥90%

---

### T-011: Test Analyzer Edge Cases

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** edge case inputs (empty files, binary files, very large files)
- **When** BrownfieldAnalyzer processes them
- **Then** it should handle gracefully without errors
- **And** edge cases should have documented behavior

**Test Cases**:
1. **Unit**: `tests/unit/brownfield/analyzer/edge-cases.test.ts`
   - testEmptyFile(): Returns type='legacy', confidence=0
   - testFrontmatterOnly(): YAML frontmatter analyzed correctly
   - testCodeBlocksExcluded(): Triple backticks don't match keywords
   - testInlineCodeExcluded(): Single backticks don't match keywords
   - testVeryLargeFile(): 10,000+ lines analyzed without performance degradation
   - testBinaryFile(): Non-UTF8 handled gracefully (skip or error)
   - testSpecialCharactersInFilename(): File with special chars handled correctly
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create `tests/unit/brownfield/analyzer/edge-cases.test.ts`
2. Create edge case test fixtures (empty.md, large-file.md, etc.)
3. Write test: testEmptyFile() (should fail)
4. Implement edge case handling in BrownfieldAnalyzer
5. Run test (should pass)
6. Repeat for all 7 test cases (TDD: Red → Green → Refactor)
7. Verify coverage: `npm run test:coverage -- tests/unit/brownfield/analyzer/edge-cases` (≥85%)

**TDD Workflow**:
1. 📝 Write all 7 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/brownfield/analyzer/edge-cases` (0/7 passing)
3. ✅ Implement edge case handling (empty checks, code block exclusion, etc.)
4. 🟢 Run tests: `npm test -- tests/unit/brownfield/analyzer/edge-cases` (7/7 passing)
5. ♻️ Refactor error handling
6. ✅ Final check: Coverage ≥85%

---

## Phase 4: BrownfieldImporter Unit Tests

### T-012: Test File Copying Logic

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** source files and destination directory
- **When** importFiles() is called
- **Then** files should be copied to destination
- **And** destination directory should be created if not exists

**Test Cases**:
1. **Unit**: `tests/unit/brownfield/importer/file-copying.test.ts`
   - testImportFilesCopiesFiles(): Files copied to destination
   - testImportFilesCreatesDirectory(): Creates destination if not exists
   - testImportFilesFlattens(): preserveStructure=false flattens files
   - testImportFilesPreservesHierarchy(): preserveStructure=true maintains folders
   - testImportFilesEmptyList(): Empty file list doesn't error
   - **Coverage Target**: 88%

**Overall Coverage Target**: 88%

**Implementation**:
1. Create `tests/unit/brownfield/importer/file-copying.test.ts`
2. Mock fs-extra for file operations
3. Mock ProjectManager for path resolution
4. Write test: testImportFilesCopiesFiles() (should fail)
5. Implement BrownfieldImporter.importFiles() method
6. Run test (should pass)
7. Repeat for all 5 test cases (TDD: Red → Green → Refactor)
8. Verify coverage: `npm run test:coverage -- tests/unit/brownfield/importer/file-copying` (≥88%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/brownfield/importer/file-copying` (0/5 passing)
3. ✅ Implement importFiles() with fs-extra copy operations
4. 🟢 Run tests: `npm test -- tests/unit/brownfield/importer/file-copying` (5/5 passing)
5. ♻️ Refactor file copying logic
6. ✅ Final check: Coverage ≥88%

---

### T-013: Test Structure Preservation

**Priority**: P1
**Estimate**: 2 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** nested folder structure in source
- **When** import is executed with preserveStructure=true
- **Then** destination should maintain folder hierarchy
- **And** empty folders should be created

**Test Cases**:
1. **Unit**: `tests/unit/brownfield/importer/structure-preservation.test.ts`
   - testFlatImport(): preserveStructure=false copies all to single folder
   - testHierarchicalImport(): preserveStructure=true maintains subfolders
   - testNestedFoldersPreserved(): Nested folders up to 5 levels deep
   - testEmptyFoldersCreated(): Empty folders created if preserveStructure=true
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create `tests/unit/brownfield/importer/structure-preservation.test.ts`
2. Mock fs-extra for directory operations
3. Create test fixture with nested folders (5 levels deep)
4. Write test: testFlatImport() (should fail)
5. Implement structure preservation logic in importFiles()
6. Run test (should pass)
7. Repeat for all 4 test cases (TDD: Red → Green → Refactor)
8. Verify coverage: `npm run test:coverage -- tests/unit/brownfield/importer/structure-preservation` (≥85%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/brownfield/importer/structure-preservation` (0/4 passing)
3. ✅ Implement folder hierarchy logic
4. 🟢 Run tests: `npm test -- tests/unit/brownfield/importer/structure-preservation` (4/4 passing)
5. ♻️ Refactor structure preservation
6. ✅ Final check: Coverage ≥85%

---

### T-014: Test Duplicate Filename Handling

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** multiple files with same filename
- **When** import is executed
- **Then** duplicate files should get timestamp suffix
- **And** no files should be overwritten

**Test Cases**:
1. **Unit**: `tests/unit/brownfield/importer/duplicate-handling.test.ts`
   - testDuplicateGetsTimestamp(): Duplicate filename gets Unix timestamp suffix
   - testMultipleDuplicatesUniqueTimestamps(): Multiple duplicates get unique timestamps
   - testDuplicateHandlingFlat(): Works with preserveStructure=false
   - testDuplicateHandlingHierarchical(): Works with preserveStructure=true
   - testTimestampFormat(): Timestamp format is Unix milliseconds
   - **Coverage Target**: 87%

**Overall Coverage Target**: 87%

**Implementation**:
1. Create `tests/unit/brownfield/importer/duplicate-handling.test.ts`
2. Mock fs-extra to simulate duplicate files
3. Write test: testDuplicateGetsTimestamp() (should fail)
4. Implement duplicate detection and timestamp suffix logic
5. Run test (should pass)
6. Repeat for all 5 test cases (TDD: Red → Green → Refactor)
7. Verify coverage: `npm run test:coverage -- tests/unit/brownfield/importer/duplicate-handling` (≥87%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/brownfield/importer/duplicate-handling` (0/5 passing)
3. ✅ Implement duplicate detection with Date.now() suffix
4. 🟢 Run tests: `npm test -- tests/unit/brownfield/importer/duplicate-handling` (5/5 passing)
5. ♻️ Refactor duplicate handling
6. ✅ Final check: Coverage ≥87%

---

### T-015: Test Migration Report Generation

**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** imported files with classification results
- **When** createMigrationReport() is called
- **Then** README.md should be created in legacy folder
- **And** report should include source, timestamp, classification summary, next steps

**Test Cases**:
1. **Unit**: `tests/unit/brownfield/importer/report-generation.test.ts`
   - testCreateMigrationReportFile(): Creates README.md in legacy folder
   - testReportIncludesMetadata(): Includes source type, path, timestamp
   - testReportIncludesClassificationSummary(): Shows specs, modules, team, legacy counts
   - testReportIncludesNextSteps(): Has next steps section
   - testReportIncludesConfidenceScores(): Shows confidence distribution
   - testReportMarkdownValid(): Markdown format valid (no syntax errors)
   - **Coverage Target**: 90%

**Overall Coverage Target**: 90%

**Implementation**:
1. Create `tests/unit/brownfield/importer/report-generation.test.ts`
2. Mock fs-extra for file writing
3. Write test: testCreateMigrationReportFile() (should fail)
4. Implement BrownfieldImporter.createMigrationReport() method
5. Run test (should pass)
6. Repeat for all 6 test cases (TDD: Red → Green → Refactor)
7. Verify coverage: `npm run test:coverage -- tests/unit/brownfield/importer/report-generation` (≥90%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test -- tests/unit/brownfield/importer/report-generation` (0/6 passing)
3. ✅ Implement createMigrationReport() with markdown template
4. 🟢 Run tests: `npm test -- tests/unit/brownfield/importer/report-generation` (6/6 passing)
5. ♻️ Refactor report template
6. ✅ Final check: Coverage ≥90%

---

## Phase 5: Integration Tests

### T-016: Test ProjectManager Full Lifecycle

**Priority**: P2
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** a temp directory with SpecWeave project
- **When** full project lifecycle is executed (create → switch → remove)
- **Then** all operations should succeed
- **And** project structures should be created/updated/removed correctly

**Test Cases**:
1. **Integration**: `tests/integration/project-manager/full-lifecycle.test.ts`
   - testCreateProject(): Creates project structure with all folders
   - testSwitchProject(): Updates config.multiProject.activeProject
   - testRemoveProject(): Removes project from config
   - testCreateSwitchRemove(): Full workflow without errors
   - testMultipleProjects(): Multiple projects coexist
   - **Coverage Target**: 82%

**Overall Coverage Target**: 82%

**Implementation**:
1. Create `tests/integration/project-manager/full-lifecycle.test.ts`
2. Use real file system (temp directories via withTempDir utility)
3. Write test: testCreateProject() (should fail)
4. Ensure ProjectManager.createProject() works with real fs
5. Run test (should pass)
6. Repeat for all 5 test cases (TDD: Red → Green → Refactor)
7. Verify coverage: `npm run test:coverage -- tests/integration/project-manager/full-lifecycle` (≥82%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm run test:integration -- full-lifecycle` (0/5 passing)
3. ✅ Implement createProject(), switchProject(), removeProject() with real fs
4. 🟢 Run tests: `npm run test:integration -- full-lifecycle` (5/5 passing)
5. ♻️ Refactor lifecycle methods
6. ✅ Final check: Coverage ≥82%

---

### T-017: Test Brownfield Import Workflow

**Priority**: P2
**Estimate**: 5 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** test fixtures with brownfield documentation
- **When** full import workflow is executed (analyze → import → report)
- **Then** files should be copied to correct destinations
- **And** migration report should be created
- **And** config should be updated with import history

**Test Cases**:
1. **Integration**: `tests/integration/brownfield/import-workflow.test.ts`
   - testAnalyzeFixtures(): Analyze returns correct counts (specs, modules, team, legacy)
   - testImportFixtures(): Files copied to correct destinations
   - testMigrationReportCreated(): README.md created in legacy folder
   - testConfigUpdated(): Config includes import history
   - testDryRun(): Dry run preview doesn't copy files
   - **Coverage Target**: 85%

**Overall Coverage Target**: 85%

**Implementation**:
1. Create `tests/integration/brownfield/import-workflow.test.ts`
2. Use real file system with test fixtures
3. Write test: testAnalyzeFixtures() (should fail)
4. Ensure BrownfieldAnalyzer works with real fixtures
5. Run test (should pass)
6. Repeat for all 5 test cases (TDD: Red → Green → Refactor)
7. Verify coverage: `npm run test:coverage -- tests/integration/brownfield/import-workflow` (≥85%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm run test:integration -- import-workflow` (0/5 passing)
3. ✅ Implement full import workflow
4. 🟢 Run tests: `npm run test:integration -- import-workflow` (5/5 passing)
5. ♻️ Refactor import orchestration
6. ✅ Final check: Coverage ≥85%

---

### T-018: Test Classification Accuracy

**Priority**: P2
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** realistic brownfield exports (Notion, Confluence, Wiki)
- **When** classification algorithm is applied
- **Then** accuracy should be ≥85%
- **And** misclassifications should be documented for tuning

**Test Cases**:
1. **Integration**: `tests/integration/brownfield/classification-accuracy.test.ts`
   - testNotionExportAccuracy(): ≥85% accuracy for Notion export
   - testConfluenceExportAccuracy(): ≥85% accuracy for Confluence export
   - testWikiExportAccuracy(): ≥85% accuracy for Wiki export
   - testAccuracyMetric(): (correct / total) ≥ 0.85
   - testDocumentMisclassifications(): Output misclassifications for tuning
   - **Coverage Target**: 80%

**Overall Coverage Target**: 80%

**Implementation**:
1. Create `tests/integration/brownfield/classification-accuracy.test.ts`
2. Load test fixtures with documented expected classifications
3. Calculate accuracy: (correct classifications / total files)
4. Write test: testNotionExportAccuracy() (should fail if <85%)
5. Tune keyword lists if needed to reach 85% accuracy
6. Run test (should pass)
7. Repeat for all 5 test cases
8. Document misclassifications in test output
9. Verify coverage: `npm run test:coverage -- tests/integration/brownfield/classification-accuracy` (≥80%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (may fail if accuracy <85%)
2. ❌ Run tests: `npm run test:integration -- classification-accuracy` (accuracy: X%)
3. ✅ Tune keyword lists based on misclassifications
4. 🟢 Run tests: `npm run test:integration -- classification-accuracy` (≥85% accuracy)
5. ♻️ Refactor keyword scoring if needed
6. ✅ Final check: Coverage ≥80%, accuracy ≥85%

---

### T-019: Test Multi-Source Import

**Priority**: P2
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** multiple brownfield sources (Notion, Confluence, Wiki)
- **When** imports are executed to same project
- **Then** each source should go to separate legacy subfolder
- **And** no filename conflicts should occur

**Test Cases**:
1. **Integration**: `tests/integration/brownfield/multi-source.test.ts`
   - testImportNotion(): Verify legacy/notion/ folder created
   - testImportConfluence(): Verify legacy/confluence/ folder created
   - testImportWiki(): Verify legacy/wiki/ folder created
   - testMultipleImportsNoConflicts(): Multiple imports don't conflict
   - **Coverage Target**: 83%

**Overall Coverage Target**: 83%

**Implementation**:
1. Create `tests/integration/brownfield/multi-source.test.ts`
2. Use real file system with multiple test fixtures
3. Write test: testImportNotion() (should fail)
4. Ensure source type is used in path resolution
5. Run test (should pass)
6. Repeat for all 4 test cases (TDD: Red → Green → Refactor)
7. Verify coverage: `npm run test:coverage -- tests/integration/brownfield/multi-source` (≥83%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm run test:integration -- multi-source` (0/4 passing)
3. ✅ Implement source-specific path resolution
4. 🟢 Run tests: `npm run test:integration -- multi-source` (4/4 passing)
5. ♻️ Refactor path resolution
6. ✅ Final check: Coverage ≥83%

---

## Phase 6: E2E Tests (CLI Commands)

### T-020: Test Multi-Project Setup E2E

**Priority**: P3
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** a SpecWeave project
- **When** /specweave:init-multiproject command is executed
- **Then** interactive prompts should appear
- **And** multi-project mode should be enabled in config
- **And** project structures should be created

**Test Cases**:
1. **E2E**: `tests/e2e/multiproject-setup.spec.ts`
   - testInitMultiprojectPrompts(): Verify interactive prompts appear
   - testEnableMultiProject(): config.multiProject.enabled = true
   - testCreateAdditionalProject(): Verify structure created
   - testListProjects(): Output shows all projects
   - testPerformance(): Setup completes in <30 seconds
   - **Coverage Target**: 75%

**Overall Coverage Target**: 75%

**Implementation**:
1. Create `tests/e2e/multiproject-setup.spec.ts`
2. Use Playwright to execute CLI commands
3. Write test: testInitMultiprojectPrompts() (should fail)
4. Ensure CLI command works in E2E context
5. Run test (should pass)
6. Repeat for all 5 test cases
7. Verify coverage: `npm run test:e2e -- multiproject-setup` (≥75%)

**TDD Workflow**:
1. 📝 Write all 5 tests above (should fail)
2. ❌ Run tests: `npm run test:e2e -- multiproject-setup` (0/5 passing)
3. ✅ Implement CLI command with inquirer prompts
4. 🟢 Run tests: `npm run test:e2e -- multiproject-setup` (5/5 passing)
5. ♻️ Refactor CLI prompts
6. ✅ Final check: Coverage ≥75%, performance <30s

---

### T-021: Test Brownfield Import E2E

**Priority**: P3
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** test fixtures directory
- **When** /specweave:import-docs command is executed
- **Then** interactive prompts should appear
- **And** files should be imported to correct folders
- **And** migration report should be created

**Test Cases**:
1. **E2E**: `tests/e2e/brownfield-import.spec.ts`
   - testImportDocsPrompts(): Verify prompts for source type
   - testImportExecutes(): Import completes successfully
   - testFilesImported(): Files copied to correct folders
   - testMigrationReportCreated(): README.md exists
   - testConfigUpdated(): Config includes import history
   - testPerformance(): Import 50 files in <10 seconds
   - **Coverage Target**: 78%

**Overall Coverage Target**: 78%

**Implementation**:
1. Create `tests/e2e/brownfield-import.spec.ts`
2. Use Playwright to execute CLI commands
3. Write test: testImportDocsPrompts() (should fail)
4. Ensure CLI command works in E2E context
5. Run test (should pass)
6. Repeat for all 6 test cases
7. Verify coverage: `npm run test:e2e -- brownfield-import` (≥78%)

**TDD Workflow**:
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm run test:e2e -- brownfield-import` (0/6 passing)
3. ✅ Implement CLI command with import workflow
4. 🟢 Run tests: `npm run test:e2e -- brownfield-import` (6/6 passing)
5. ♻️ Refactor CLI command
6. ✅ Final check: Coverage ≥78%, performance <10s for 50 files

---

### T-022: Test Project Switching E2E

**Priority**: P3
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** multi-project mode enabled with multiple projects
- **When** /specweave:switch-project command is executed
- **Then** config.multiProject.activeProject should update
- **And** subsequent commands should use new active project

**Test Cases**:
1. **E2E**: `tests/e2e/project-switching.spec.ts`
   - testSwitchProjectSuccess(): Success message displayed
   - testConfigUpdated(): config.multiProject.activeProject updated
   - testCommandsUseNewProject(): Commands use new active project
   - testSwitchNonExistentProject(): Error message for invalid project
   - **Coverage Target**: 76%

**Overall Coverage Target**: 76%

**Implementation**:
1. Create `tests/e2e/project-switching.spec.ts`
2. Use Playwright to execute CLI commands
3. Write test: testSwitchProjectSuccess() (should fail)
4. Ensure CLI command works in E2E context
5. Run test (should pass)
6. Repeat for all 4 test cases
7. Verify coverage: `npm run test:e2e -- project-switching` (≥76%)

**TDD Workflow**:
1. 📝 Write all 4 tests above (should fail)
2. ❌ Run tests: `npm run test:e2e -- project-switching` (0/4 passing)
3. ✅ Implement CLI command with project switching
4. 🟢 Run tests: `npm run test:e2e -- project-switching` (4/4 passing)
5. ♻️ Refactor CLI command
6. ✅ Final check: Coverage ≥76%

---

## Phase 7: Performance Benchmarking

### T-023: Run Performance Benchmarks

**Priority**: P2
**Estimate**: 5 hours
**Status**: [ ] pending

**Test Plan**: N/A (performance measurement task)

**Validation**:
- Performance benchmarks executed for path resolution, import, classification
- Results documented in `tests/performance/RESULTS.md`
- All performance targets met (<1ms path resolution, <2 min for 500 files, <5s for 100 files)
- Memory usage within limits (<100MB peak)

**Implementation**:
1. Create `tests/performance/project-manager.bench.ts`:
   - Measure getProjectBasePath() (1000 calls)
   - Measure getSpecsPath() (1000 calls)
   - Verify <1ms per call average
   - Verify caching improves performance
2. Create `tests/performance/brownfield-import.bench.ts`:
   - Measure import time for 50 files
   - Measure import time for 500 files
   - Verify <2 minutes for 500 files
   - Measure memory usage (heap snapshots)
   - Verify <100MB peak memory
3. Create `tests/performance/analyzer.bench.ts`:
   - Measure classification time for 100 files
   - Verify <5 seconds for 100 files
   - Measure accuracy vs speed trade-off
4. Run all benchmarks: `npm run benchmark`
5. Document results in `tests/performance/RESULTS.md`:
   - Performance metrics table
   - Memory usage charts
   - Recommendations for optimization
6. Verify all targets met

**No TDD workflow** (performance measurement, not test development)

---

## Phase 8: Documentation & CI/CD

### T-024: Create Test Documentation and Update CI/CD

**Priority**: P2
**Estimate**: 4 hours
**Status**: [ ] pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Test suite overview documented in `tests/README.md`
- Fixture documentation in `tests/fixtures/README.md`
- Performance results in `tests/performance/RESULTS.md`
- CLAUDE.md updated with test infrastructure section
- GitHub Actions workflow updated with test stages
- Coverage reporting integrated (Codecov or similar)

**Implementation**:
1. Create `tests/README.md`:
   - Test suite overview (unit/integration/E2E)
   - Running tests (npm scripts)
   - Coverage requirements
   - Test utilities documentation
2. Create `tests/fixtures/README.md`:
   - Fixture structure explanation
   - Expected classifications
   - Adding new fixtures
3. Update `CLAUDE.md`:
   - Add test infrastructure section
   - Document TDD workflow
   - Link to test documentation
4. Add test scripts to `package.json`:
   ```json
   "scripts": {
     "test:unit": "jest tests/unit",
     "test:integration": "jest tests/integration",
     "test:e2e": "playwright test",
     "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
     "test:coverage": "jest --coverage",
     "benchmark": "ts-node tests/performance/run-all-benchmarks.ts"
   }
   ```
5. Update `.github/workflows/test.yml`:
   - Add unit test stage
   - Add integration test stage
   - Add E2E test stage
   - Add coverage reporting (upload to Codecov)
   - Add performance regression checks
6. Verify CI pipeline runs without errors

**No TDD workflow** (documentation and configuration task)

---

## Summary

**Total Tasks**: 24
**Estimated Time**: 81 hours
**Test Mode**: TDD (Red → Green → Refactor)
**Coverage Target**: 85% overall (90% unit, 85% integration, 75% E2E)

**Test Breakdown**:
- **Phase 1**: Test Infrastructure (3 tasks, 8 hours)
- **Phase 2**: ProjectManager Unit Tests (4 tasks, 12 hours)
- **Phase 3**: BrownfieldAnalyzer Unit Tests (4 tasks, 14 hours)
- **Phase 4**: BrownfieldImporter Unit Tests (4 tasks, 14 hours)
- **Phase 5**: Integration Tests (4 tasks, 16 hours)
- **Phase 6**: E2E Tests (3 tasks, 11 hours)
- **Phase 7**: Performance Benchmarking (1 task, 5 hours)
- **Phase 8**: Documentation & CI/CD (1 task, 4 hours)

**Key Success Metrics**:
- ✅ 150+ test cases total
- ✅ 85%+ overall coverage
- ✅ 85%+ classification accuracy
- ✅ All performance targets met
- ✅ Zero test flakiness (deterministic tests)
- ✅ CI pipeline <10 minutes

**Dependencies**:
- Jest 29+ (installed)
- Playwright 1.48+ (to install)
- ts-jest (installed)
- @types/jest (installed)
- All components from increment 0012

**Next Steps After Completion**:
1. v0.9.0 feature development with confidence
2. Performance optimization based on benchmark results
3. Test automation in PR workflow
4. Continuous test coverage monitoring
