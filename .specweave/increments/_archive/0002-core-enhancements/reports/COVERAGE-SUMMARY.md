# Test Coverage Gap Analysis - Executive Summary

**Document**: TEST-COVERAGE-GAP-ANALYSIS.md
**Analysis Scope**: SpecWeave v0.16.4 (126 source files, 114 test files)
**Key Metric**: 72.59% statement coverage (need 75%+), 57.63% branch coverage (need 70%+)

---

## Quick Stats

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Statements | 72.59% | 75% | -2.41% |
| Branches | 57.63% | 70% | -12.37% |
| Functions | 68.56% | 80% | -11.44% |
| Lines | 72.47% | 75% | -2.53% |

**Files Without Tests**: 25+ critical files (1,671-3,707 lines)

---

## Top 5 Critical Gaps

### 1. Profile Migration Command (443 lines) 🔴 CRITICAL
- **File**: `src/cli/commands/migrate-to-profiles.ts`
- **Risk**: Users upgrading sync configs could lose all GitHub/JIRA/ADO links
- **Impact**: Data loss for multi-tool users
- **Testing**: 0%

### 2. Brownfield Documentation Import (174 lines) 🔴 CRITICAL
- **File**: `src/cli/commands/import-docs.ts`
- **Risk**: Documents could be misclassified, lost, or corrupted
- **Impact**: Failed migration projects
- **Testing**: 0%

### 3. Repository Structure Manager (681 lines) 🔴 CRITICAL
- **File**: `src/core/repo-structure/repo-structure-manager.ts`
- **Risk**: Multi-repo/monorepo setup could fail silently
- **Impact**: Invalid project structure, sync failures
- **Testing**: 0%

### 4. QA System Orchestration (498 lines) 🔴 CRITICAL
- **File**: `src/core/qa/qa-runner.ts`
- **Risk**: Quality gates might not block low-quality increments
- **Impact**: Poor code quality shipped
- **Testing**: 0% (components are 100% tested, orchestration is 0%)

### 5. Spec Parsing (393 lines) 🔴 CRITICAL
- **File**: `src/core/specs/spec-parser.ts`
- **Risk**: Parser bugs cascade to all downstream operations
- **Impact**: Corrupted specifications
- **Testing**: 0%

---

## Categorical Breakdown

### 8 Untested CLI Commands (Entry Points)
1. ✗ `import-docs.ts` (174 lines)
2. ✗ `check-discipline.ts` (92 lines)
3. ✗ `validate-plugins.ts` (246 lines)
4. ✗ `validate-jira.ts` (130 lines)
5. ✗ `init-multiproject.ts` (226 lines)
6. ✗ `migrate-to-multiproject.ts` (268 lines)
7. ✗ `migrate-to-profiles.ts` (443 lines) ← **Largest**
8. ✗ `check-discipline.ts` (92 lines)

**Total**: 1,671 lines of untested user-facing code

### 7 Large Untested Core Components
1. ✗ `repo-structure-manager.ts` (681 lines)
2. ✗ `qa-runner.ts` (498 lines)
3. ✗ `rfc-generator-v2.ts` (542 lines)
4. ✗ `github-multi-repo.ts` (505 lines)
5. ✗ `spec-parser.ts` (393 lines)
6. ✗ `project-structure-detector.ts` (392 lines)
7. ✗ `spec-metadata-manager.ts` (untested)

**Total**: ~3,707 lines of untested core logic

### 43 Integration Tests Disabled (Could Fix with Jest Config)
- **Reason**: `import.meta` requires ES2020+ modules in Jest
- **Current Status**: Tests exist but excluded from Jest
- **Fix Effort**: 4-6 hours
- **Benefit**: Would enable agent/skill testing

---

## Well-Tested Components

✓ **QA System (100% tested)**
- ✓ quality-gate-decider.ts - 100%
- ✓ risk-calculator.ts - 100%
- ⚠️ qa-runner.ts - 0% (orchestration untested)

✓ **Status Line (95%+ tested)**
- ✓ status-line-manager.ts - 95.31%

✓ **Increment Management (88%+ tested)**
- ✓ active-increment-manager.ts - 97.82%
- ✓ limits.ts - 96.2%

✓ **Brownfield Analysis (89%+ tested)**
- ✓ analyzer.ts - 93.14%
- ✓ importer.ts - 82.5%

---

## Critical Workflows Not E2E Tested

❌ 1. Brownfield project import (Notion/Confluence/Wiki)
❌ 2. Profile migration (old config → new format)
❌ 3. Multi-project initialization
❌ 4. JIRA validation flow
❌ 5. GitHub repository creation via API
❌ 6. Cost tracking end-to-end
❌ 7. Discipline enforcement edge cases

---

## Recommended Fix Priorities

### Phase 1: CRITICAL (Must Fix) - 80 hours
1. Fix Jest ES2020 config → run 43 excluded tests (4-6 hrs)
2. Test CLI commands (20-30 hrs)
3. Test QA orchestration (6-8 hrs)
4. Test repo structure (8-10 hrs)

### Phase 2: HIGH (Should Fix) - 40 hours
1. Spec parsing tests (8 hrs)
2. I18N system tests (12 hrs)
3. Cost tracking tests (6 hrs)
4. E2E workflow tests (14 hrs)

### Phase 3: MEDIUM (Nice to Have) - 30 hours
1. Multi-repo GitHub sync (8 hrs)
2. Project structure detection (6 hrs)
3. RFC generation (6 hrs)
4. Remaining integration tests (10 hrs)

**Total Effort**: ~80-120 hours

---

## Key Risks by Severity

### 🔴 HIGH RISK (Could Lose User Data)
- Profile migration command (443 lines untested)
- Multi-project migration (268 lines untested)
- Brownfield import (174 lines untested)

### 🟠 MEDIUM RISK (Could Break Features)
- QA validation (498 lines untested)
- Repository structure setup (681 lines untested)
- GitHub multi-repo sync (505 lines untested)

### 🟡 LOW RISK (Could Have Bugs)
- Cost tracking (untested)
- Language detection (77% untested)
- Plugin validation (untested)

---

## Improvement Path

**Current**: 72.59% statements, 57.63% branches
**Target**: 75% statements, 70% branches

**With Priority 1 fixes**: ~78% statements, 68% branches ✓
**With Priority 1+2 fixes**: ~85% statements, 75% branches ✓✓

---

## See Full Analysis
For complete details, see: `TEST-COVERAGE-GAP-ANALYSIS.md`

