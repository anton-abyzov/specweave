# FS-042: Test Infrastructure Cleanup

**Status**: In Progress
**Priority**: P1
**Created**: 2025-11-18
**Team**: Core Contributors

## Overview

Eliminate 48% test duplication, improve test health from 7% to 17%, and establish robust test infrastructure.

## Business Value

- **Annual CI savings**: 607 hours (47% reduction in test time)
- **Maintenance savings**: 100 hours/year (75% less duplicate code)
- **Safety improvement**: ELIMINATE catastrophic .specweave/ deletion risk
- **ROI**: 31x return (23 hours investment → 707 hours/year saved)

## User Stories

- US-042-001: Eliminate Duplicate Test Directories ✅
- US-042-002: Standardize E2E Test Naming ✅
- US-042-003: Fix Dangerous Test Isolation ✅
- US-042-004: Create Shared Fixtures 🔄

## Technical Approach

1. **Phase 1**: Delete 62 duplicate directories (68% file reduction)
2. **Phase 2**: Rename .spec.ts → .test.ts (standardization)
3. **Phase 3**: Fix process.cwd() usages (safety)
4. **Phase 4**: Create shared fixtures (DRY principle)

## Acceptance Criteria

- [x] Test files reduced from 245 to 78
- [x] Test health improved from 7% to 17%
- [x] Catastrophic deletion risk eliminated
- [ ] Shared fixtures created and documented

## Metrics

- **Files Before**: 245
- **Files After**: 78
- **Test Health Before**: 7%
- **Test Health After**: 17%
- **CI Time Savings**: 607 hours/year
