# Test Coverage Analysis - Documentation Index

## Overview

This directory contains comprehensive analysis of SpecWeave's test coverage gaps, identifying critical untested features that could impact users.

**Analysis Date**: November 2025
**Framework**: SpecWeave v0.16.4
**Coverage**: 72.59% statements, 57.63% branches

---

## Documents in This Analysis

### 1. **TEST-COVERAGE-GAP-ANALYSIS.md** (596 lines, 20 KB)
**Most Comprehensive**

Complete technical analysis including:
- Executive summary with key findings
- 12 detailed analysis sections:
  - Part 1: Critical CLI commands
  - Part 2: Core business logic gaps
  - Part 3: Integration points
  - Part 4: Jest configuration issues
  - Part 5: E2E test coverage
  - Part 6: Coverage metrics by component
  - Part 7: Root cause analysis
  - Part 8: Recommended action plan
  - Part 9: Test coverage thresholds
  - Part 10: Critical user workflows
  - Part 11: File-by-file recommendations
  - Part 12: Summary metrics

**Best For**: Understanding the full scope of coverage gaps and detailed recommendations

---

### 2. **COVERAGE-SUMMARY.md** (176 lines, 5 KB)
**Executive Summary**

High-level overview including:
- Quick stats table
- Top 5 critical gaps
- Categorical breakdown
- Well-tested components
- Critical workflows not E2E tested
- Recommended fix priorities
- Key risks by severity

**Best For**: Quick understanding, stakeholder presentations, prioritization discussions

---

## Key Findings Summary

### Critical Issues

1. **8 Untested CLI Commands** (1,671 lines)
   - Profile migration (443 lines) - HIGHEST RISK
   - Import documentation (174 lines)
   - Multi-project initialization (226 lines)
   - Multiple others

2. **7 Large Untested Core Components** (3,707 lines)
   - Repository structure manager (681 lines)
   - QA system orchestration (498 lines)
   - RFC generation (542 lines)
   - Spec parsing (393 lines)
   - Others

3. **43 Integration Tests Disabled**
   - Due to Jest ES2020 module configuration
   - 4-6 hour fix would enable all agent tests

4. **Branch Coverage Gap** (12.4% below target)
   - Error handling paths untested
   - Edge cases in conditionals not validated

### Quick Win Opportunities

- **Fix Jest Config** (4-6 hours) → Enable 43 excluded tests
- **Test CLI Commands** (20-30 hours) → Cover user-facing features
- **QA Orchestration** (6-8 hours) → Complete quality system

### Total Effort to 85% Coverage

**80-120 hours** across 3 priority phases

---

## How to Use This Analysis

### For Developers
1. Read COVERAGE-SUMMARY.md for quick overview
2. Reference specific files in Part 11 of full analysis
3. Use as test writing guide when creating new tests

### For Project Managers
1. Focus on COVERAGE-SUMMARY.md "Key Risks by Severity"
2. Use "Recommended Fix Priorities" for sprint planning
3. Reference "Total Effort to 85% Coverage" for estimation

### For QA Teams
1. Review "Critical Workflows Not E2E Tested" section
2. Identify manual testing needs for untested features
3. Prioritize regression testing for critical paths

### For Architects
1. Read "Root Cause Analysis" in Part 7
2. Understand orchestration vs component testing gap
3. Consider test infrastructure improvements

---

## Files Referenced in Analysis

### Most Critical (Must Test First)
```
src/cli/commands/migrate-to-profiles.ts       (443 lines) ← HIGHEST RISK
src/core/repo-structure/repo-structure-manager.ts (681 lines)
src/cli/commands/import-docs.ts               (174 lines)
src/core/qa/qa-runner.ts                      (498 lines)
src/core/specs/spec-parser.ts                 (393 lines)
src/cli/commands/check-discipline.ts          (92 lines)
```

### High Priority
```
src/cli/commands/init-multiproject.ts         (226 lines)
src/cli/commands/migrate-to-multiproject.ts   (268 lines)
src/cli/helpers/issue-tracker/github-multi-repo.ts (505 lines)
src/core/i18n/language-detector.ts            (77% untested)
src/core/cost-tracker.ts                      (unknown size)
```

---

## Coverage Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Statements | 72.59% | 75% | ⚠️ 2.4% gap |
| Branches | 57.63% | 70% | 🔴 12.4% gap |
| Functions | 68.56% | 80% | 🔴 11.4% gap |
| Lines | 72.47% | 75% | ⚠️ 2.5% gap |

---

## Well-Tested Areas (Don't Need Work)

✅ **QA System** (100%)
✅ **Status Line Tracking** (95%+)
✅ **Increment Management** (88%+)
✅ **Brownfield Analysis** (89%+)
✅ **Sync Infrastructure** (85%+)

---

## Configuration Issues

### Jest ES2020 Module Support
- **Status**: 43 integration tests excluded from Jest
- **Cause**: Tests use `import.meta.url`
- **Fix**: Update tsconfig.json for ES2020 target
- **Benefit**: Would run all agent/skill tests
- **Effort**: 4-6 hours

---

## Next Steps

1. **Immediate** (4-6 hours)
   - Fix Jest ES2020 configuration
   - Verify 43 excluded tests now pass

2. **Priority 1** (20-30 hours)
   - Test critical CLI commands
   - Test QA system orchestration

3. **Priority 2** (15-20 hours)
   - Test repository structure manager
   - Test spec parsing

4. **Priority 3** (Optional, 30+ hours)
   - E2E workflow tests
   - Additional component coverage

---

## Related Documents

- **COMPLETION-SUMMARY.md** - Increment completion report
- **E2E-TESTING-INFRASTRUCTURE-SETUP.md** - E2E test infrastructure details
- **SOUND-NOTIFICATION-ANALYSIS.md** - Hook notification system analysis

---

## Questions?

See the full TEST-COVERAGE-GAP-ANALYSIS.md for:
- Complete risk analysis by file
- Detailed workflow breakdowns
- Root cause analysis
- Specific test recommendations

