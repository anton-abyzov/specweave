# GitHub Issue Bug Analysis - 2025-11-22

**Date**: 2025-11-22
**Reporter**: User (ultrathink)
**Severity**: High - Architecture Violation

---

## Problem Statement

Two GitHub issues were incorrectly created for Feature FS-050 instead of User Stories:

1. ❌ **#701**: `[FS-050] Enhanced External Tool Import - Phase 1b-7`
   - Format: Feature-only (missing US-ID)
   - Created: 2025-11-22T06:48:26Z

2. ❌ **#702**: `[SP-FS-050-specweave] Enhanced External Tool Import - Phase 1b-7`
   - Format: Old deprecated SP- prefix + project name
   - Created: 2025-11-22T06:48:28Z

**Both violate the Universal Hierarchy Mapping architecture.**

---

## Root Cause Analysis

### 1. Wrong Feature Created (FS-050)

**Problem**: FS-050 was created as a duplicate of FS-048

```bash
# Increment 0050 correctly references:
feature_id: FS-048  # ✅ CORRECT

# But someone created:
.specweave/docs/internal/specs/_features/FS-050/FEATURE.md  # ❌ DUPLICATE!
```

**Timeline**:
- FS-048 created: 2025-11-21
- FS-050 created: 2025-11-22 01:51:31 (commit 62a192f)
- GitHub issues created: 2025-11-22 06:48:26-28 (~5 hours later)

**Likely cause**: Manual or automated living docs sync created FS-050 incorrectly.

### 2. README.md ID Format Bug

**Code**: `src/core/living-docs/living-docs-sync.ts:515`

```typescript
lines.push(`id: ${featureId}-specweave`);  // Generates: "FS-050-specweave"
```

**Result**: README.md contained:
```yaml
id: FS-050-specweave  # ← Used as issue title by deprecated code!
```

**Status**: This format is actually CORRECT for README.md (project-specific ID). The bug is in code that creates GitHub issues from this ID.

### 3. Deprecated Code Path Used

**Architecture Violation**: GitHub issues created at Feature-level instead of User Story-level.

**Per ADR-0032 Universal Hierarchy Mapping**:
```
| Level | SpecWeave      | GitHub          |
|-------|----------------|-----------------|
| 1     | Feature (FS-XXX) | **Milestone**   |
| 2     | User Story (US-XXX) | **Issue** [FS-XXX][US-YYY] |
| 3     | Task (T-XXX)   | Checkbox in body |
```

**Prohibited Formats**:
- ❌ `[FS-050]` - Feature-only (should be Milestone, not Issue)
- ❌ `[SP-FS-050-specweave]` - Old SP- prefix (deprecated in v0.24.0)

---

## Impact

**Issues Created (Closed)**:
- #701 - Feature-level issue (wrong!)
- #702 - SP-prefixed issue (deprecated!)

**Documentation Pollution**:
- FS-050 FEATURE.md referenced #701 as "GitHub Project"
- FS-050/README.md referenced #702 as "GitHub Project"

**Consequences**:
1. **Architecture Violation**: Features tracked as both Milestones AND Issues
2. **Confusing Hierarchy**: Same entity (Feature) mapped to different GitHub types
3. **Broken Traceability**: No User Story → Task linkage

---

## Immediate Fixes Applied

### 1. Closed Wrong Issues

```bash
gh issue close 701 --comment "WRONG FORMAT: Feature-only [FS-050]..."
gh issue close 702 --comment "WRONG FORMAT: Deprecated [SP-FS-050-specweave]..."
```

### 2. Deleted Duplicate Feature

```bash
rm -rf .specweave/docs/internal/specs/_features/FS-050
rm -rf .specweave/docs/internal/specs/specweave/FS-050
```

**Reason**: FS-050 is a duplicate. Increment 0050 correctly uses FS-048.

---

## Prevention (Long-Term Fixes)

### 1. Validation in Feature Creation

**Add check in LivingDocsSync.syncIncrement()**:

```typescript
// Before creating FEATURE.md, check if feature already exists
const existingFeatureId = await this.findExistingFeature(parsed.title);
if (existingFeatureId) {
  this.logger.warn(`Feature already exists: ${existingFeatureId}. Reusing instead of creating duplicate.`);
  featureId = existingFeatureId;
}
```

### 2. Enforce User Story-Only GitHub Sync

**NEVER allow Feature-level issue creation**:

```typescript
// In GitHubFeatureSync (CORRECT way):
async syncFeatureToGitHub(featureId: string) {
  // 1. Create/update Milestone for Feature
  const milestone = await this.createMilestone(featureId);

  // 2. Create/update Issues for User Stories ONLY
  const userStories = await this.findUserStories(featureId);
  for (const us of userStories) {
    const title = `[${featureId}][${us.id}] ${us.title}`;  // ✅ CORRECT
    await this.createIssue(title, us, milestone);
  }
}
```

**BLOCK deprecated paths**:

```typescript
// In deprecated code paths - throw error immediately
export class GitHubEpicSync {
  constructor() {
    throw new Error(
      'GitHubEpicSync is DEPRECATED. Creates Feature-level issues (violates ADR-0032). ' +
      'Use GitHubFeatureSync instead.'
    );
  }
}
```

### 3. Pre-Commit Hook Validation

```bash
# Block commits that create Feature-level issues
if git diff --cached | grep -E '\[FS-[0-9]+\][^[]|\[SP-FS-'; then
  echo "❌ ERROR: Feature-level GitHub issue format detected!"
  echo "   Use User Story format: [FS-XXX][US-YYY]"
  exit 1
fi
```

---

## CLAUDE.md Updates Required

**Add to Section 10 (GitHub Issue Format Policy)**:

```markdown
### 10. GitHub Issue Format Policy (v0.24.0+)

**CRITICAL**: GitHub issues are ONLY created for User Stories, NEVER for Features.

**ONLY Correct Format**:
\`\`\`
[FS-XXX][US-YYY] User Story Title
\`\`\`

**Examples**:
- ✅ `[FS-048][US-001] Smart Pagination During Init`
- ✅ `[FS-048][US-002] CLI-First Defaults`

**PROHIBITED Formats**:
- ❌ `[FS-048]` - Feature-only (Features use Milestones, not Issues!)
- ❌ `[SP-FS-048-specweave]` - SP- prefix (deprecated v0.24.0)
- ❌ `[FS-048-specweave]` - Project suffix (internal README.md only, NOT GitHub!)

**Architecture**:
\`\`\`
Feature FS-048 → GitHub Milestone "FS-048: Feature Title"
├─ User Story US-001 → Issue #XXX: [FS-048][US-001] US Title
├─ User Story US-002 → Issue #YYY: [FS-048][US-002] US Title
└─ User Story US-003 → Issue #ZZZ: [FS-048][US-003] US Title
\`\`\`

**Enforcement**:
- Pre-commit hook blocks Feature-level issue references
- GitHubEpicSync throws error (deprecated class)
- Only GitHubFeatureSync.syncFeatureToGitHub() is allowed

**If you see Feature-level issues**:
1. Close them immediately
2. Use `/specweave-github:sync FS-XXX` to create correct User Story issues
3. Report bug (should never happen!)
\`\`\`

---

## References

- **ADR-0032**: Universal Hierarchy Mapping
- **CLAUDE.md Section 10**: GitHub Issue Format Policy
- **Increment 0047**: US-Task Linkage Architecture (fixes documented here)
- **File**: `src/core/living-docs/living-docs-sync.ts:515` (README.md ID generation)
- **Report**: `.specweave/increments/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-REMOVAL-PLAN.md`

---

## Lessons Learned

1. **Feature uniqueness**: Add validation to prevent duplicate Features
2. **GitHub sync discipline**: ONLY User Story → Issue mapping
3. **Deprecated code removal**: Delete GitHubEpicSync entirely in v0.25.0
4. **Pre-commit validation**: Catch format violations before commit

---

**Status**: ✅ Immediate fixes applied (issues closed, duplicates deleted)
**Next**: Implement long-term prevention (validation, pre-commit hooks)
