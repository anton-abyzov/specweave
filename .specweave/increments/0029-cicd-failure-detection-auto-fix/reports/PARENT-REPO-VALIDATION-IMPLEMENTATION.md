# Parent Repo Validation - Implementation Summary

**Created**: 2025-11-12
**Increment**: 0029-cicd-failure-detection-auto-fix
**Context**: Preventing duplicate parent repos when using GitHub multi-project setup

---

## Problem Statement

When setting up GitHub integration with multi-project mode + parent repo, users can easily create duplicate parent repositories if naming is inconsistent:

**Example**:
```bash
# User runs init with -shared flag
specweave init . -shared

# Config correctly stores: sw-gh-inventory-shared ✅
# But user creates git remote: sw-gh-inventory ❌ (missing -shared!)

# Result: TWO parent repos exist:
# 1. sw-gh-inventory-shared (from config)
# 2. sw-gh-inventory (from git remote)
```

**Root Cause**: Multiple sources of truth (config.json, git remote, .env) without validation.

---

## Solution Overview

**Three-Phase Implementation**:

### Phase 1: Immediate (Quick Wins) ✅ IMPLEMENTED
1. Enhanced .env.example with clear warnings
2. Bash validation script
3. Updated multi-project setup guide

### Phase 2: Short-Term (Next Release) ✅ IMPLEMENTED
4. TypeScript pre-flight validation utility
5. CLI command for manual validation

### Phase 3: Long-Term (Future)
6. Auto-detect mismatches on every SpecWeave command
7. Interactive repair wizard for mismatched setups

---

## Files Created/Modified

### 1. Enhanced .env.example ✅

**File**: `.env.example`

**Changes**:
- Added dedicated section for parent repo setup
- Clear warnings about -shared suffix
- Examples of correct vs incorrect naming
- Validation command reference

**Key Addition**:
```bash
# ⚠️  IMPORTANT: If you used `-shared` flag during `specweave init`, the parent
# repo name MUST include the `-shared` suffix!
#
# How to check: Run this command to see the expected name:
#   cat .specweave/config.json | grep parentRepoName
#
# ❌ WRONG:   PARENT_REPO_NAME=shared:my-project
# ✅ CORRECT: PARENT_REPO_NAME=shared:my-project-shared
```

### 2. Bash Validation Script ✅

**File**: `scripts/validate-parent-repo-setup.sh`

**Features**:
- Extracts names from config.json, git remote, .env
- Validates consistency across all three
- Checks -shared suffix consistency
- Colored output (errors in red, warnings in yellow)
- Exit code 0 (success) or 1 (failure)

**Usage**:
```bash
bash scripts/validate-parent-repo-setup.sh

# Output:
# 🔍 Validating Parent Repo Setup...
#
# 📋 Current Setup:
#    Config (parentRepoName):  my-repo-shared
#    Git Remote (origin):      my-repo-shared
#    .env (PARENT_REPO_NAME):  my-repo-shared
#
# ✅ All checks passed!
```

### 3. TypeScript Validation Utility ✅

**File**: `src/core/cicd/parent-repo-validator.ts`

**Exports**:
- `checkParentRepoSetup()` - Extract names from all sources
- `validateParentRepoSetup()` - Perform validation checks
- `printValidationResult()` - Display results to console
- `validateOrExit()` - Validate and exit on error (for CLI commands)

**Example Usage**:
```typescript
import { validateOrExit } from '../../core/cicd/parent-repo-validator';

// In GitHub sync command
validateOrExit(process.cwd());
// Exits with error if validation fails
```

### 4. CLI Validation Command ✅

**File**: `src/cli/commands/validate-parent-repo.ts`

**Usage**:
```bash
specweave validate-parent-repo

# Output:
# 🔍 Validating Parent Repo Setup...
# ...
# ✅ All checks passed!
```

**Registers as**: `specweave validate-parent-repo` (after build)

### 5. Updated Multi-Project Setup Guide ✅

**File**: `.specweave/docs/public/guides/multi-project-setup.md`

**Changes**:
- Added "⚠️ CRITICAL: Parent Repo Naming Convention" section
- Explains the problem with examples
- Shows validation commands
- Provides fix instructions
- Links to validation script and .env.example

**Location**: After "Integration with External Sync" → "Workflow with Sync"

### 6. Comprehensive Prevention Guide ✅

**File**: `.specweave/increments/0029-cicd-failure-detection-auto-fix/reports/GITHUB-MULTI-PROJECT-PARENT-REPO-NAMING-GUIDE.md`

**Contents**:
- Root cause analysis
- Prevention strategies (all 3 phases)
- Implementation order
- User guidance
- Quick reference
- Real-world examples

---

## Validation Rules

### Rule 1: Config is Source of Truth

`config.json` stores the expected parent repo name:
```json
{
  "multiProject": {
    "parentRepoName": "my-repo-shared"
  }
}
```

### Rule 2: Git Remote Must Match Config

```bash
git remote get-url origin
# Must end with: /my-repo-shared.git
```

### Rule 3: .env Must Match Config (if exists)

```bash
PARENT_REPO_NAME=shared:my-repo-shared
# Second part must match config.json
```

### Rule 4: -shared Suffix Consistency

If config has `-shared` suffix, git remote and .env MUST also have it.

---

## User Workflows

### Workflow 1: Before Syncing (Recommended)

```bash
# Always validate before syncing
bash scripts/validate-parent-repo-setup.sh

# If validation fails, fix issues
# Then retry
/specweave-github:sync 0029
```

### Workflow 2: Manual Check

```bash
# Check config
cat .specweave/config.json | grep parentRepoName

# Check git remote
git remote get-url origin

# Check .env
grep PARENT_REPO_NAME .env

# All three should match!
```

### Workflow 3: Fix Mismatches

```bash
# 1. Check config for correct name
cat .specweave/config.json | grep parentRepoName
# Output: "parentRepoName": "my-repo-shared"

# 2. Fix git remote
git remote set-url origin https://github.com/owner/my-repo-shared.git

# 3. Fix .env
# Edit .env → PARENT_REPO_NAME=shared:my-repo-shared

# 4. Delete incorrect repo on GitHub (if created)
# Go to: https://github.com/owner/incorrect-name/settings
# Delete repository

# 5. Validate
bash scripts/validate-parent-repo-setup.sh
```

---

## Integration Points

### GitHub Sync Commands (Future)

The TypeScript utility can be integrated into GitHub sync commands:

```typescript
// plugins/specweave-github/commands/github-sync.ts

import { validateOrExit } from '../../../src/core/cicd/parent-repo-validator';

// At the start of sync command
validateOrExit(process.cwd());

// If validation fails, command exits before syncing
```

### Pre-Commit Hook (Future)

```bash
# .git/hooks/pre-commit

#!/bin/bash
bash scripts/validate-parent-repo-setup.sh || exit 1
```

### CI/CD Pipeline (Future)

```yaml
# .github/workflows/validate.yml

- name: Validate Parent Repo Setup
  run: bash scripts/validate-parent-repo-setup.sh
```

---

## Benefits

### Immediate
- ✅ Clear warnings in .env.example
- ✅ Validation script users can run manually
- ✅ Documentation with examples

### Short-Term (This Implementation)
- ✅ Reusable TypeScript utility
- ✅ CLI command for validation
- ✅ Can be integrated into sync commands

### Long-Term (Future)
- 🔮 Auto-validation on every sync
- 🔮 Interactive repair wizard
- 🔮 Pre-commit hook validation
- 🔮 CI/CD integration

---

## Testing

### Manual Testing

```bash
# Test 1: Matching setup (should pass)
# - Config: my-repo-shared
# - Git:    my-repo-shared
# - .env:   my-repo-shared
bash scripts/validate-parent-repo-setup.sh
# Expected: ✅ All checks passed!

# Test 2: Mismatched git remote (should fail)
# - Config: my-repo-shared
# - Git:    my-repo (missing -shared)
bash scripts/validate-parent-repo-setup.sh
# Expected: ❌ Git remote mismatch!

# Test 3: Mismatched .env (should warn)
# - Config: my-repo-shared
# - .env:   my-repo (missing -shared)
bash scripts/validate-parent-repo-setup.sh
# Expected: ⚠️  .env mismatch
```

### Automated Testing (Future)

```typescript
// tests/unit/cicd/parent-repo-validator.test.ts

describe('validateParentRepoSetup', () => {
  it('should pass when all names match', () => {
    const result = validateParentRepoSetup(testProjectRoot);
    expect(result.valid).toBe(true);
  });

  it('should fail when git remote mismatches', () => {
    const result = validateParentRepoSetup(testProjectRoot);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('❌ Git remote mismatch!');
  });

  // ... more tests
});
```

---

## Documentation References

| Document | Purpose |
|----------|---------|
| `.env.example` | Clear warnings and examples |
| `scripts/validate-parent-repo-setup.sh` | Bash validation script |
| `src/core/cicd/parent-repo-validator.ts` | TypeScript utility |
| `.specweave/docs/public/guides/multi-project-setup.md` | User guide with warnings |
| This document | Implementation summary |
| `GITHUB-MULTI-PROJECT-PARENT-REPO-NAMING-GUIDE.md` | Comprehensive prevention guide |

---

## Next Steps

### Immediate (User Action)
1. ✅ Read updated .env.example
2. ✅ Run validation script before syncing
3. ✅ Fix any mismatches found

### Short-Term (Next PR)
1. 🔄 Integrate `validateOrExit()` into GitHub sync commands
2. 🔄 Add unit tests for validation utility
3. 🔄 Update GitHub sync command docs

### Long-Term (Future Releases)
1. 🔮 Auto-validation on all SpecWeave commands
2. 🔮 Interactive repair wizard (`specweave fix-parent-repo`)
3. 🔮 Pre-commit hook template
4. 🔮 CI/CD validation workflow

---

## Summary

**Problem**: Duplicate parent repos when using GitHub multi-project setup.

**Solution**: Three-phase validation approach with immediate quick wins.

**Phase 1 (Implemented)**: Documentation + Bash script
**Phase 2 (Implemented)**: TypeScript utility + CLI command
**Phase 3 (Future)**: Auto-validation + Repair wizard

**Result**: Users can now validate their setup before syncing, preventing duplicate repos.

**Key Files**:
- `.env.example` (warnings)
- `scripts/validate-parent-repo-setup.sh` (bash validation)
- `src/core/cicd/parent-repo-validator.ts` (TypeScript utility)
- `.specweave/docs/public/guides/multi-project-setup.md` (user guide)

**Usage**: `bash scripts/validate-parent-repo-setup.sh` or `specweave validate-parent-repo`
