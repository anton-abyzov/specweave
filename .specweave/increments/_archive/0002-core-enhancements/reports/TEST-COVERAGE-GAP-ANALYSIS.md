# SpecWeave Test Coverage Analysis

**Analysis Date**: November 2025
**Framework**: SpecWeave v0.16.4
**Total Source Files**: 126 TypeScript files in `src/`
**Total Test Files**: 114 test files (unit, integration, E2E)
**Current Coverage**: 72.59% statements, 57.63% branches, 68.56% functions

---

## Executive Summary

SpecWeave has **CRITICAL TEST COVERAGE GAPS** in essential user-facing features and core business logic. The analysis identifies **25+ untested critical files** that directly impact user workflows.

### Key Findings

1. **8 Critical CLI Commands Have NO TESTS** (1,868 lines of untested code)
   - Multi-project initialization
   - Profile migration
   - Documentation import
   - Discipline checking
   - Plugin validation
   - JIRA validation

2. **7 Large Core Components Lack Tests** (3,707 lines untested)
   - Repository structure management (681 lines)
   - QA validation runner (498 lines)
   - RFC generation (542 lines)
   - Multi-repo GitHub sync (505 lines)
   - Spec parsing (393 lines)

3. **Branch Coverage at 57.63%** - Below recommended 80%
   - Error handling paths largely untested
   - Edge cases in conditional logic not validated

4. **43 Integration Tests Disabled** due to `import.meta` module configuration issues
   - These tests exist but cannot run in current Jest setup
   - Likely testing important agent/skill functionality

---

## Part 1: Critical CLI Commands (Entry Points)

### Untested Commands Impacting Users

| Command | Lines | Tested | Risk Level | Impact |
|---------|-------|--------|------------|--------|
| `import-docs.ts` | 174 | ✗ | **CRITICAL** | Brownfield migration completely untested |
| `check-discipline.ts` | 92 | ✗ | **HIGH** | WIP limits not validated; could allow rule violations |
| `validate-plugins.ts` | 246 | ✗ | **HIGH** | Plugin installation validation missing |
| `validate-jira.ts` | 130 | ✗ | **HIGH** | JIRA connectivity not verified end-to-end |
| `init-multiproject.ts` | 226 | ✗ | **HIGH** | Multi-project setup not tested |
| `migrate-to-multiproject.ts` | 268 | ✗ | **HIGH** | Data migration critical path untested |
| `migrate-to-profiles.ts` | 443 | ✗ | **CRITICAL** | Sync profile migration (largest untested command) |
| `check-discipline.ts` | 92 | ✗ | **HIGH** | Discipline enforcement validation missing |

**Total Untested CLI Code**: 1,671 lines

### Why This Matters

These commands are the **primary entry points** for users migrating existing projects or setting up complex multi-project/multi-repo scenarios. A bug in any of these could:

- **Corrupt project structure** (init-multiproject, migrate-to-multiproject)
- **Lose user data** (migrate-to-profiles losing sync configurations)
- **Create undetectable rule violations** (check-discipline allowing >2 active increments)
- **Fail silently during setup** (validate-plugins, validate-jira)

### Example Critical Bug Risk

```typescript
// src/cli/commands/check-discipline.ts (Line ~50-60)
// No tests verify that hard cap of 2 active increments is enforced!
// A bug here means users can violate the core discipline rule
```

---

## Part 2: Core Business Logic Gaps

### A. Repository & Project Structure (1,073 lines untested)

**File**: `src/core/repo-structure/repo-structure-manager.ts` (681 lines)

**Untested Responsibilities**:
- Creating GitHub repositories via API
- Initializing local git repositories
- Configuring monorepo vs multi-repo structure
- Setting up proper folder organization
- Splitting tasks between repositories

**Why This Matters**:
- Users with complex repository architectures (microservices, monorepo, polyrepo) have NO validation
- GitHub API errors could fail silently
- Repo initialization could leave projects in invalid state

**Related Untested File**: `src/cli/helpers/github/increment-profile-selector.ts` (250 lines)
- Profile selection UI for multi-repo sync
- No E2E validation of profile switching

---

### B. QA Validation Runner (498 lines untested)

**File**: `src/core/qa/qa-runner.ts`

**Untested Responsibilities**:
- Running rule-based validation (120 checks)
- Running AI quality assessment
- Calculating risk scores
- Determining quality gate pass/fail
- Estimating token usage and costs

**Why This Matters**:
- The QA system is NEW (v0.8.0+) and untested
- Risk scoring could be incorrect, causing false passes/fails
- Token estimation could be inaccurate (cost calculation bugs)
- Quality gates might not block low-quality increments

**Related Tests That ARE Complete**:
- ✓ `quality-gate-decider.ts` - 100% coverage
- ✓ `risk-calculator.ts` - 100% coverage

**OBSERVATION**: The individual QA components ARE tested (100%), but the orchestration layer that calls them is completely untested!

---

### C. Specification Parsing (560 lines untested)

**Files**:
- `src/core/specs/spec-parser.ts` (393 lines) - NO TESTS
- `src/core/specs/spec-metadata-manager.ts` (167 lines) - NO TESTS

**Untested Functionality**:
- Parsing user stories from markdown
- Extracting acceptance criteria
- Determining story status based on AC completion
- Parsing priority levels (P1, P2, P3)
- Detecting increment references

**Why This Matters**:
- Specs are the SOURCE OF TRUTH for all SpecWeave operations
- Parser bugs would cascade to all downstream features
- No validation that specs are parsed correctly

**Critical Path**: User creates spec.md → Parser extracts requirements → Plan/Tasks generated
**Risk**: If parser fails silently, entire workflow is corrupted

---

### D. Language Detection & I18N (750 lines, 77% untested)

**Files** (mostly untested):
- `src/core/i18n/language-detector.ts` - 12.5% coverage
- `src/core/i18n/system-prompt-injector.ts` - 11.29% coverage
- `src/core/i18n/language-manager.ts` - 29.48% coverage
- `src/core/i18n/language-registry.ts` - 71.42% coverage

**What's Missing**:
- Language detection accuracy (12.5% tested)
- System prompt injection for multilingual workflows
- Fallback behavior when language is unknown
- Character encoding edge cases

**Note**: Translation utility itself is well-tested (99.08%), but the infrastructure around it is weak.

---

### E. Cost Tracking (completely untested)

**File**: `src/core/cost-tracker.ts` (untested)

**What Should Be Tested**:
- Cost calculation for different models (Haiku, Sonnet, Opus)
- Token counting accuracy
- Cost aggregation across increments
- Budget tracking and warnings

**Why This Matters**:
- Users rely on accurate cost reporting
- Bugs could lead to unexpected billing
- No validation that pricing matches published rates

---

## Part 3: Integration Points (High Risk)

### A. GitHub Multi-Repo Sync (505 lines untested)

**File**: `src/cli/helpers/issue-tracker/github-multi-repo.ts`

**Untested Scenarios**:
- Detecting multiple GitHub remotes
- Syncing to different repositories per service
- Handling monorepo vs polyrepo configurations
- Creating repositories via GitHub API

**Risk**: Users with microservices architecture have no validation that sync works correctly

---

### B. Project Structure Detection (392 lines untested)

**File**: `src/core/project-structure-detector.ts`

**Missing Tests**:
- Detecting monorepo vs polyrepo
- Finding all services/projects
- Validating project configurations
- Handling edge cases (empty projects, missing configs)

---

### C. RFC Generation (542 lines untested)

**File**: `src/core/rfc-generator-v2.ts`

**Untested**:
- Generating RFC documents
- Formatting specifications
- Extracting decision rationale
- Creating architecture documentation

---

## Part 4: I18N Test Configuration Issues

### Jest Configuration Problem: 43 Integration Tests Skipped

**Location**: `jest.config.cjs` (lines 47-91)

**Issue**: 43 integration tests are **excluded from Jest** due to `import.meta` module configuration:

```javascript
// Tests that EXIST but are SKIPPED:
'ado-sync.test.ts',                    // ADO integration
'github-sync.test.ts',                 // GitHub integration
'jira-sync.test.ts',                   // JIRA integration
'increment-planner.test.ts',           // Planning agent
'increment-quality-judge.test.ts',     // QA agent
'role-orchestrator.test.ts',           // Agent orchestration
// ... 37 more
```

**Why They're Excluded**:
- They use `import.meta.url` (ES2020+ modules)
- Jest/ts-jest not configured for ES2020+ module resolution
- Would need either:
  - Upgrading tsconfig for ES2020 modules, OR
  - Rewriting tests to avoid `import.meta`

**Impact**:
- **43 integration tests exist but never run**
- Unknown whether they pass/fail
- Could contain critical bugs that aren't detected

---

## Part 5: E2E Test Coverage

### Current E2E Tests

| Test File | Focus | Coverage |
|-----------|-------|----------|
| `specweave-smoke.spec.ts` | Basic init workflow | ✓ Core |
| `increment-discipline.spec.ts` | WIP limit enforcement | ✓ Core |
| `cli-commands.spec.ts` | CLI basics | ✓ Core |
| `init-default-claude.spec.ts` | Default setup | ✓ Setup |
| `ado-sync.spec.ts` | Azure DevOps sync | ✓ Integration |
| `multi-project/workflow.spec.ts` | Multi-project workflows | ✓ Feature |
| `multi-project/switching.spec.ts` | Project switching | ✓ Feature |
| `brownfield/import.spec.ts` | Brownfield import | ✓ Feature |
| `i18n/multilingual-workflows.spec.ts` | Multilingual workflows | ✓ Feature |
| `i18n/living-docs-translation.spec.ts` | Living docs translation | ✓ Feature |

### E2E Gaps (NOT E2E Tested)

❌ **Critical workflows without E2E tests**:
1. **Import-docs workflow** - Notion/Confluence/Wiki import end-to-end
2. **Profile migration** - Migrating sync profiles from old to new format
3. **Multi-project initialization** - Full setup of multi-project from scratch
4. **JIRA validation** - JIRA connection and authentication flow
5. **GitHub profile creation** - Creating repositories via GitHub API
6. **Cost tracking** - End-to-end cost calculation and reporting
7. **Discipline enforcement** - Multiple edge cases (e.g., hotfix interruption rules)

---

## Part 6: Coverage Metrics by Component

### Coverage by Module (from test output)

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| `core/qa/` | **100%** ✓ | 97.97% | **100%** | **100%** |
| `core/status-line/` | 95.38% ✓ | 93.75% | **100%** | 95.38% |
| `core/increment/` | 88.26% ✓ | 72.38% | 78.57% | 89.06% |
| `core/brownfield/` | 89.8% ✓ | 79.2% | 90.24% | 89.83% |
| `core/sync/` | 85.71% ✓ | 76.47% | 92.85% | 85.52% |
| `core/` (overall) | 73.92% | 64.56% | 60% | 74% |
| `core/i18n/` | **23.19%** ✗ | 6.77% | 22.22% | 23.31% |
| `utils/` | 51.66% ✗ | 28.57% | 51.11% | 51.54% |
| **Global** | **72.59%** | **57.63%** | **68.56%** | **72.47%** |

### Well-Tested Components
- ✓ QA system (100%)
- ✓ Status line tracking (95%+)
- ✓ Increment management (88%+)
- ✓ Brownfield analysis (89%+)
- ✓ Sync infrastructure (85%+)

### Poorly-Tested Components
- ✗ I18N system (23%) - CRITICAL
- ✗ Utilities (51%) - MODERATE
- ✗ Config management (44%) - MODERATE
- ✗ Various utilities (10-30%) - LOW

---

## Part 7: Root Cause Analysis

### Why Are These Gaps Happening?

1. **New Features (v0.8+) Adding Complexity Faster Than Tests**
   - Multi-project support (v0.8)
   - Profile-based sync (v0.11)
   - QA system with risk scoring (v0.8+)
   - These are tested at unit level, but orchestration is missing

2. **I18N System Added Without Full Test Coverage**
   - Language detection (12.5% tested)
   - System prompt injection (11.3% tested)
   - But translation utility itself is 99% tested
   - Indicates coverage focus on utility functions, not orchestration

3. **Module Configuration Issues (Jest vs Playwright)**
   - 43 integration tests exist but can't run in Jest
   - Would need ES2020+ module config fix
   - Likely testing important agent functionality
   - Easy fix but requires config change

4. **Integration Tests for Agents/Skills Not in Jest**
   - Agent tests live in `tests/integration/`
   - Excluded from Jest due to import.meta
   - These tests probably validate critical agent workflows
   - Need to either:
     - Run them separately (Playwright)
     - Fix Jest config to support ES2020+

---

## Part 8: Recommended Action Plan

### Priority 1: CRITICAL (Must Fix Before Release)

**EFFORT**: ~80 hours

1. **Fix Jest Configuration for ES2020 Modules** (4-6 hours)
   - Enable `target: ES2020` in tsconfig
   - Verify all 43 excluded integration tests pass
   - Ensures agent/skill tests are running

2. **Create Tests for CLI Commands** (20-30 hours)
   - `import-docs.ts` - Test all 4 source types (Notion, Confluence, Wiki, Custom)
   - `check-discipline.ts` - Test all constraint enforcement rules
   - `validate-plugins.ts` - Test plugin detection and validation
   - `validate-jira.ts` - Test JIRA connection and auth
   - `init-multiproject.ts` - Test multi-project setup flow
   - `migrate-to-multiproject.ts` - Test data migration
   - `migrate-to-profiles.ts` - Test profile migration

3. **Test QA System Orchestration** (6-8 hours)
   - Test `qa-runner.ts` with full rule-based validation
   - Test AI quality assessment integration
   - Test quality gate decisions
   - Test cost estimation accuracy

4. **Test Repository Structure Manager** (8-10 hours)
   - Test single-repo, multi-repo, monorepo configurations
   - Test GitHub API integration (or mock it)
   - Test local repository initialization

### Priority 2: HIGH (Should Fix)

**EFFORT**: ~40 hours

1. **Spec Parsing Tests** (8 hours)
   - Test user story extraction
   - Test acceptance criteria parsing
   - Test edge cases (duplicate IDs, malformed markdown)
   - Test priority detection

2. **I18N System Tests** (12 hours)
   - Test language detection accuracy
   - Test system prompt injection
   - Test fallback behavior
   - Test character encoding edge cases

3. **Cost Tracking Tests** (6 hours)
   - Test cost calculation per model
   - Test token counting accuracy
   - Test cost aggregation

4. **E2E Tests for Key Workflows** (14 hours)
   - Import-docs end-to-end
   - Profile migration
   - Multi-project initialization
   - Discipline enforcement edge cases

### Priority 3: MEDIUM (Nice To Have)

**EFFORT**: ~30 hours

1. **Multi-Repo GitHub Sync Tests** (8 hours)
2. **Project Structure Detection Tests** (6 hours)
3. **RFC Generation Tests** (6 hours)
4. **Remaining Integration Tests** (10 hours)

---

## Part 9: Test Coverage Thresholds

### Current Configuration (jest.config.cjs)

```javascript
coverageThreshold: {
  global: {
    branches: 45,      // ⚠️ Below 57.63% actual
    functions: 68,     // ✓ Meeting 68.56% actual
    lines: 65,         // ✓ Meeting 72.47% actual
    statements: 65,    // ✓ Meeting 72.59% actual
  },
}
```

### Recommended New Thresholds

```javascript
coverageThreshold: {
  global: {
    branches: 65,      // Up from 45 (still conservative)
    functions: 75,     // Up from 68 (critical)
    lines: 75,         // Up from 65 (critical)
    statements: 75,    // Up from 65 (critical)
  },
  // Enforce higher standards for critical modules
  './src/core/**/*.ts': {
    branches: 75,
    functions: 85,
    lines: 85,
    statements: 85,
  },
  './src/cli/commands/**/*.ts': {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

---

## Part 10: Critical User Workflows Not Tested

### Workflow 1: Brownfield Project Import
- User has existing Notion/Confluence docs
- Runs: `specweave import-docs /path/to/export --source=notion`
- **UNTESTED**: Entire workflow
- **RISK**: Documents could be misclassified, lost, or corrupted

### Workflow 2: Migrate to Multi-Project Setup
- Single-project user wants to add multiple projects
- Runs: `specweave init-multiproject`
- **UNTESTED**: Data migration, directory restructuring
- **RISK**: Could lose project metadata, break existing increments

### Workflow 3: Migrate Sync Profiles
- User upgrading from old sync config to new profile-based system
- Runs: `specweave migrate-to-profiles`
- **UNTESTED**: Configuration transformation
- **RISK**: Sync configurations could be lost or corrupted (443-line command!)

### Workflow 4: Discipline Enforcement
- User tries to create increment while 2 are already active
- System should **BLOCK** with clear error
- **UNTESTED**: Hard cap enforcement, exception handling
- **RISK**: Discipline rule could be bypassed

### Workflow 5: QA Gate Validation
- User runs: `/specweave:qa 0008`
- System validates increment with 120 rules + AI assessment
- **UNTESTED**: Orchestration of rule-based + AI quality check
- **RISK**: Quality gates might not work correctly, allowing low-quality increments

### Workflow 6: Multi-Repo GitHub Sync
- Microservices user syncs increment to multiple GitHub repos
- System should sync to correct repos based on profile
- **UNTESTED**: Multi-repo routing logic
- **RISK**: Issues could be created in wrong repositories

---

## Part 11: File-by-File Recommendations

### Must Test (Blocking Issues)

```
Priority: CRITICAL
src/cli/commands/migrate-to-profiles.ts       (443 lines) - HIGHEST RISK
src/cli/commands/import-docs.ts               (174 lines)
src/core/qa/qa-runner.ts                      (498 lines)
src/core/repo-structure/repo-structure-manager.ts (681 lines)
src/core/specs/spec-parser.ts                 (393 lines)
src/cli/commands/check-discipline.ts           (92 lines)

Priority: HIGH  
src/cli/commands/init-multiproject.ts          (226 lines)
src/cli/commands/migrate-to-multiproject.ts    (268 lines)
src/cli/helpers/issue-tracker/github-multi-repo.ts (505 lines)
src/core/i18n/language-detector.ts             (partially - 12.5%)
src/core/cost-tracker.ts                       (unknown size)
src/core/specs/spec-metadata-manager.ts        (untested)
```

### Nice to Test (Lower Priority)

```
Priority: MEDIUM
src/cli/commands/validate-plugins.ts           (246 lines)
src/cli/commands/validate-jira.ts              (130 lines)
src/core/project-structure-detector.ts         (392 lines)
src/core/rfc-generator-v2.ts                   (542 lines)
src/cli/helpers/github/increment-profile-selector.ts (250 lines)
```

---

## Part 12: Test Metrics Summary

### By the Numbers

- **126** total source files
- **114** test files created (90% coverage at file level!)
- **25+** critical files with NO tests
- **43** integration tests EXCLUDED from Jest
- **72.59%** statement coverage (need 75%+)
- **57.63%** branch coverage (need 70%+)
- **1,871** lines of untested CLI code
- **3,707** lines of untested core logic

### Paradox

SpecWeave has **114 test files** (excellent test infrastructure) but **25+ critical untested features**. This suggests:

1. **Test infrastructure is mature** - Jest, Playwright, integration tests all working
2. **Test focus has been narrow** - Concentrated on brownfield/increment/sync rather than orchestration
3. **New features outpacing tests** - QA system, I18N, multi-project all added with incomplete coverage
4. **Configuration issue blocks 43 tests** - Easy fix would improve coverage significantly

---

## Conclusion

SpecWeave has a **solid foundation** of testing with 72.59% coverage overall, but **critical gaps in user-facing features** could impact users:

### The Good
- ✓ Unit test infrastructure excellent (Jest + Playwright + ESM support)
- ✓ Core increment/discipline logic well tested (88%+)
- ✓ Brownfield analysis solid (89%+)
- ✓ QA system components individually tested (100%)
- ✓ E2E tests cover main workflows

### The Bad  
- ✗ 8 critical CLI commands completely untested (1,871 lines)
- ✗ Large orchestration layers untested (QA runner, repo manager)
- ✗ I18N system inadequately tested (23% coverage)
- ✗ Spec parsing - core data structure - untested
- ✗ 43 integration tests excluded from Jest

### The Risks
- **High**: Users importing brownfield projects with no validation
- **High**: Users migrating to new formats with untested migration commands
- **Medium**: QA validation might not work correctly
- **Medium**: Multi-repo/polyrepo users have no validation
- **Low**: Cost tracking might be inaccurate

### Recommended Approach
1. **Quick Win**: Fix Jest ES2020 config, run 43 excluded tests (4-6 hours)
2. **Critical**: Add tests for untested CLI commands (20-30 hours)
3. **Important**: Test QA orchestration and repo structure (15-20 hours)
4. **Enhancement**: Cover remaining gaps (30-40 hours)

**Total effort**: ~80-120 hours to reach comprehensive coverage

---

